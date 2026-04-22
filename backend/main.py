import os
import re
from pathlib import Path
from typing import Any

import httpx
from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

# MailOS/.env then backend/.env (if present)
_root = Path(__file__).resolve().parent.parent
load_dotenv(_root / ".env")
load_dotenv(Path(__file__).resolve().parent / ".env")

OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions"
MODEL = "arcee-ai/trinity-large-preview:free"
HTTP_TIMEOUT = 10.0

app = FastAPI(title="MailMind MVP")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["https://mail.google.com"],
    allow_methods=["*"],
    allow_headers=["*"],
)


class Persona(BaseModel):
    fullName: str | None = None
    position: str | None = None
    businessName: str | None = None
    contactInfo: str | None = None
    tone: str | None = None
    # Standing preferences the user always wants on drafts
    instructions: str | None = None


class GenerateRequest(BaseModel):
    email: str
    persona: Persona | None = None
    # auto | decline_service | enquire | refund | custom
    intent: str | None = "auto"
    # short | medium | long
    responseLength: str | None = "medium"
    extraInstructions: str | None = None


class GenerateResponse(BaseModel):
    reply: str


INTENT_HINTS: dict[str, str] = {
    "auto": (
        "The sender did not request a specific angle; pick the most appropriate professional response."
    ),
    "decline_service": (
        "The sender wants to politely decline the offer, turn down the service, or say they are not interested, "
        "while staying professional."
    ),
    "enquire": (
        "The sender wants to ask follow-up questions, get more information, or explore options before deciding."
    ),
    "refund": (
        "The sender wants to request a refund or address a payment issue (only if relevant to the message)."
    ),
    "custom": (
        "Follow the extra instructions from the sender; they are the main direction for the reply."
    ),
}

LENGTH_HINTS: dict[str, str] = {
    "short": "Keep the reply short: a few brief sentences, minimal small talk, essential points only.",
    "medium": "Use moderate length: about one or two short paragraphs plus a sign-off, balanced and clear.",
    "long": "A longer reply is OK: use multiple short paragraphs with enough detail; stay readable and on topic.",
}


def _omit_contact_line(persona: Persona | None, intent: str | None) -> bool:
    """Omit contact from the sign-off when this reply is a decline and instructions say to skip phone/number."""
    if not persona or not str((persona.contactInfo or "")).strip():
        return False
    inst = (persona.instructions or "").lower()
    it = (intent or "auto").lower().strip()
    if it != "decline_service":
        return False
    if not re.search(
        r"(not include|don\x27?t include|do not include|omit|without|exclude|skip|never (include|put|add|give)|no (phone|number|contact|tel)|don\x27?t (put|add|give|include|list))",
        inst,
    ):
        return False
    if not re.search(
        r"(phone|cell|mobile|number|contact|tel|call|text|reach|business number)",
        inst,
    ):
        return False
    return True


def build_prompt(
    email_body: str,
    persona: Persona | None,
    intent: str | None,
    extra: str | None,
    response_length: str | None,
) -> str:
    out: list[str] = []
    out.append(
        "You are helping draft an email REPLY. Output ONLY the body of the email that goes in the message text area. "
        "The email client (Gmail) will set the subject line; do NOT include a Subject: line, Re: line, "
        "email headers, or a separate subject. Start directly with the first sentence of the message or the greeting."
    )
    out.append("Use plain, readable text. Avoid markdown headings unless truly necessary.")
    out.append(
        "Do not use em dashes (the long 'em dash' character). Use a comma, period, or ' - ' with spaces instead."
    )

    rk = (response_length or "medium").strip().lower()
    if rk not in LENGTH_HINTS:
        rk = "medium"
    out.append("Target length: " + LENGTH_HINTS[rk] + " ")

    key = (intent or "auto").strip().lower()
    if key not in INTENT_HINTS:
        key = "auto"
    out.append("Direction for this reply: " + INTENT_HINTS[key] + " ")
    ex = (extra or "").strip()
    if ex:
        out.append("Additional requirements from the sender: " + ex + " ")

    if persona:
        if persona.tone:
            out.append(f"Writer tone: {persona.tone}. ")
        if persona.instructions and str(persona.instructions).strip():
            out.append(
                "Standing instructions from the writer (apply in every reply unless they conflict with this task): "
                f"{str(persona.instructions).strip()} "
            )
        omit_contact = _omit_contact_line(persona, key)
        if omit_contact:
            out.append(
                "For this exact reply, do not include a phone number, email, or any other contact line in the sign-off, "
                "per the writer's rules. You may use name, title, and business name in the closing if appropriate. "
            )
        # Strong signature rules so the model does not use [Your Name] placeholders
        if (
            persona.fullName
            or persona.position
            or persona.businessName
            or (persona.contactInfo and not omit_contact)
        ):
            out.append("SIGNATURE: use these real details verbatim at the end (one short closing block, no labels like [Your Name]); ")
            if persona.fullName:
                out.append(f"Name to sign with: {persona.fullName}. ")
            if persona.position:
                out.append(f"Title/position line: {persona.position}. ")
            if persona.businessName:
                out.append(f"Business name: {persona.businessName}. ")
            if persona.contactInfo and not omit_contact:
                out.append(
                    f"Contact line: {persona.contactInfo} (on its own line or with the sign-off as appropriate). "
                )
        out.append(
            "NEVER print bracket placeholders like [Your Name], [Your Title], [Your Restaurant], or [Contact information]. "
            "If a detail is missing, omit that line; never invent bracket text."
        )

    out.append("\n\n--- Message to reply to ---\n" + email_body)
    return "".join(out).strip()


def _strip_leading_subject_lines(text: str) -> str:
    t = text.strip()
    for _ in range(4):
        if not t:
            return t
        first_line, rest = t.split("\n", 1) if "\n" in t else (t, "")
        s = first_line.strip()
        if re.search(r"Subject:\s|^\*\*Subject", s, re.I) or re.match(
            r"^Re:\s*[^\n]+", s, re.I
        ):
            t = rest.lstrip() if rest else ""
            continue
        break
    return t.lstrip()


def _replace_placeholder_brackets(
    reply: str, persona: Persona | None, include_contact: bool = True
) -> str:
    if not persona:
        return reply
    r = reply
    if persona.fullName:
        fn = persona.fullName
        for pat in (
            r"\[Your Name\]",
            r"\[Your name\]",
            r"\[Your full name\]",
        ):
            r = re.sub(pat, fn, r, flags=re.I, count=0)
        # model may use plain-text placeholder without perfect bracket match
        r = re.sub(r"(?i)\[your name\]", fn, r)
    if persona.position:
        pos = persona.position
        for pat in (
            r"\[Your Title\]",
            r"\[Your title\]",
            r"\[Your Position\]",
            r"\[Your position\]",
            r"\[Your (Role|Job title)\]",
        ):
            r = re.sub(pat, pos, r, flags=re.I)
        r = re.sub(r"(?i)\[your (title|position|role)\]", pos, r)
    if persona.businessName:
        bn = persona.businessName
        for pat in (
            r"\[Your Restaurant Name\]",
            r"\[Your Business Name\]",
            r"\[Your Organization\]",
            r"\[Restaurant Name\]",
        ):
            r = re.sub(pat, bn, r, flags=re.I)
        r = re.sub(r"(?i)\[your (?:restaurant|business) name\]", bn, r)
    if include_contact and persona.contactInfo:
        ci = persona.contactInfo
        for pat in (r"\[Contact information\]", r"\[Contact info\]", r"\[Contact\]", r"\[Phone\]"):
            r = re.sub(pat, ci, r, flags=re.I)
        r = re.sub(r"(?i)\[contact(?: information| info)?\]", ci, r)
    return r


def _signoff_block(p: Persona, include_contact: bool = True) -> str:
    f = (p.fullName or "").strip()
    if not f:
        return ""
    parts: list[str] = ["Best regards,", f]
    if p.position and str(p.position).strip():
        parts.append(str(p.position).strip())
    if p.businessName and str(p.businessName).strip():
        parts.append(str(p.businessName).strip())
    if include_contact and p.contactInfo and str(p.contactInfo).strip():
        parts.append(str(p.contactInfo).strip())
    return "\n".join(parts)


def _merge_canonical_signoff(
    t: str, p: Persona, include_contact: bool = True
) -> str:
    """Replace any leftover placeholders; if the sign-off is missing or still contains brackets, fix the tail."""
    f = (p.fullName or "").strip()
    if not f:
        return t
    t = re.sub(r"(?i)\[your name\]", f, t)
    for bad in ("**[Your Name]**", "**[your name]**", "[Your Name]", "[your name]"):
        t = t.replace(bad, f)
    if p.position and str(p.position).strip():
        pos = str(p.position).strip()
        t = re.sub(r"(?i)\[your (?:title|position|role|job title)\]", pos, t)
    if p.businessName and str(p.businessName).strip():
        bn = str(p.businessName).strip()
        t = re.sub(r"(?i)\[your (?:restaurant|business) name\]", bn, t)
    if include_contact and p.contactInfo and str(p.contactInfo).strip():
        ci = str(p.contactInfo).strip()
        t = re.sub(r"(?i)\[contact(?: information| details| info)?\]", ci, t)

    sig = _signoff_block(p, include_contact)
    if not sig:
        return t

    lines = t.splitlines()
    # If any line in the last ~15 lines is still a [Your...] placeholder, cut from the first of those lines
    n = len(lines)
    for i in range(max(0, n - 16), n):
        if re.search(
            r"(?i)(\[your (name|title|position|role|restaurant|business|contact|information)|\[(Your|your) (Name|Title)\])",
            lines[i],
        ):
            t = "\n".join(lines[:i]).rstrip()
            return t + "\n\n" + sig

    last_block = "\n".join(lines[-6:]) if n >= 6 else t
    if f in last_block and not any("[" in x for x in (lines[-8:] if n >= 8 else lines)):
        return t

    # No clean name in closing: remove from last "Best regards" (etc.) in the last ~25 lines and re-append
    lo = max(0, n - 25)
    for i in range(n - 1, lo - 1, -1):
        s = lines[i].strip().lower()
        if s.startswith("best regards") or s.startswith("sincerely") or s.startswith("kind regards"):
            t = "\n".join(lines[:i]).rstrip()
            return t + "\n\n" + sig

    return t.rstrip() + "\n\n" + sig


def _replace_em_dashes(text: str) -> str:
    t = text.replace("\u2014", " - ").replace("\u2013", " - ")
    t = t.replace("—", " - ").replace("–", " - ")
    return t


def _remove_contact_line_from_tail(text: str, persona: Persona | None) -> str:
    """If sign-off should omit contact, strip a trailing line that matches the saved phone/contact."""
    if not persona or not str((persona.contactInfo or "")).strip():
        return text
    ci = str(persona.contactInfo).strip()
    d_ci = re.sub(r"\D", "", ci)
    if len(d_ci) < 7:
        return text
    lines = text.rstrip().splitlines()
    if not lines:
        return text
    last = lines[-1].strip()
    d_last = re.sub(r"\D", "", last)
    if d_ci and d_last and (d_ci in d_last or d_last in d_ci or d_last == d_ci):
        lines = lines[:-1]
        return "\n".join(lines).rstrip()
    if last == ci or ci in last and len(last) < len(ci) + 4:
        lines = lines[:-1]
        return "\n".join(lines).rstrip()
    return text


def normalize_reply(
    text: str, persona: Persona | None, intent: str | None = None
) -> str:
    omit = _omit_contact_line(persona, intent)
    t = _strip_leading_subject_lines(text)
    t = _replace_placeholder_brackets(t, persona, include_contact=not omit)
    if persona and (persona.fullName or "").strip():
        t = _merge_canonical_signoff(t, persona, include_contact=not omit)
    if omit and persona:
        t = _remove_contact_line_from_tail(t, persona)
    t = _replace_em_dashes(t)
    return t.strip()


async def call_openrouter(user_message: str) -> str:
    key = os.environ.get("OPENROUTER_API_KEY", "").strip()
    if not key:
        raise HTTPException(status_code=500, detail="OpenRouter API key is not configured")

    payload: dict[str, Any] = {
        "model": MODEL,
        "messages": [{"role": "user", "content": user_message}],
    }
    async with httpx.AsyncClient(timeout=HTTP_TIMEOUT) as client:
        r = await client.post(
            OPENROUTER_URL,
            json=payload,
            headers={
                "Authorization": f"Bearer {key}",
                "Referer": "http://127.0.0.1:8000",
                "X-Title": "MailMind MVP",
                "Content-Type": "application/json",
            },
        )
    if r.is_success:
        data = r.json()
        choices = data.get("choices") or []
        if not choices:
            raise HTTPException(status_code=500, detail="Model returned no reply")
        msg = choices[0].get("message", {})
        content = (msg.get("content") or "").strip()
        if not content:
            raise HTTPException(status_code=500, detail="Model returned an empty reply")
        return content
    raise HTTPException(status_code=500, detail="OpenRouter request failed")


@app.post("/generate", response_model=GenerateResponse)
async def generate(body: GenerateRequest) -> GenerateResponse:
    if not body.email or not body.email.strip():
        raise HTTPException(status_code=400, detail="email must not be empty")
    try:
        raw = await call_openrouter(
            build_prompt(
                body.email.strip(),
                body.persona,
                body.intent,
                body.extraInstructions,
                body.responseLength,
            )
        )
        reply = normalize_reply(raw, body.persona, body.intent)
    except HTTPException:
        raise
    except httpx.HTTPError as e:  # pragma: no cover
        raise HTTPException(status_code=500, detail="Request to model failed") from e
    return GenerateResponse(reply=reply)
