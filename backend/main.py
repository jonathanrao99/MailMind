import os
import re
import json
import base64
import secrets
from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import Any
from urllib.parse import urlencode

import httpx
from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, RedirectResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel

# MailOS/.env then backend/.env (if present)
_root = Path(__file__).resolve().parent.parent
load_dotenv(_root / ".env")
load_dotenv(Path(__file__).resolve().parent / ".env")

OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions"
MODEL = "arcee-ai/trinity-large-preview:free"
HTTP_TIMEOUT = 10.0
GOOGLE_OAUTH_BASE = "https://accounts.google.com/o/oauth2/v2/auth"
GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token"
GMAIL_API_BASE = "https://gmail.googleapis.com/gmail/v1/users/me"
GMAIL_SCOPES = ["openid", "email", "profile", "https://www.googleapis.com/auth/gmail.readonly"]
MICROSOFT_OAUTH_BASE = "https://login.microsoftonline.com/common/oauth2/v2.0/authorize"
MICROSOFT_TOKEN_URL = "https://login.microsoftonline.com/common/oauth2/v2.0/token"
GRAPH_API_BASE = "https://graph.microsoft.com/v1.0/me"
OUTLOOK_SCOPES = ["openid", "email", "profile", "offline_access", "User.Read", "Mail.Read"]
DATA_DIR = Path(__file__).resolve().parent / "data"
TOKEN_PATH = DATA_DIR / "gmail_oauth_tokens.json"
INGEST_PATH = DATA_DIR / "gmail_ingest_latest.json"
OUTLOOK_TOKEN_PATH = DATA_DIR / "outlook_oauth_tokens.json"
OUTLOOK_INGEST_PATH = DATA_DIR / "outlook_ingest_latest.json"
TELEMETRY_PATH = DATA_DIR / "telemetry_events.jsonl"
FRONTEND_DIR = _root / "apps" / "landing"
FRONTEND_DIST_DIR = FRONTEND_DIR / "out"
_oauth_states: dict[str, datetime] = {}

app = FastAPI(title="MailMind MVP")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["https://mail.google.com"],
    allow_methods=["*"],
    allow_headers=["*"],
)
_next_dir = FRONTEND_DIST_DIR / "_next"
if _next_dir.is_dir():
    app.mount("/_next", StaticFiles(directory=str(_next_dir)), name="next_static")


def _frontend_index_path() -> Path:
    out_index = FRONTEND_DIST_DIR / "index.html"
    if out_index.exists():
        return out_index
    raise HTTPException(status_code=404, detail="Frontend not found. Run: cd apps/landing && npm run build")


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


class SummaryRequest(BaseModel):
    email: str
    subject: str | None = None
    fromAddress: str | None = None


class SummaryResponse(BaseModel):
    summary: str
    nextAction: str
    priority: str


class GmailOAuthStartResponse(BaseModel):
    authUrl: str
    state: str


class GmailOAuthStatusResponse(BaseModel):
    connected: bool
    email: str | None = None
    scope: str | None = None
    expiresAt: str | None = None
    hasRefreshToken: bool = False


class GmailOAuthCallbackResponse(BaseModel):
    connected: bool
    email: str | None = None


class GmailIngestRequest(BaseModel):
    maxResults: int = 20
    query: str | None = None


class IngestedMessage(BaseModel):
    id: str
    threadId: str
    internalDate: str | None = None
    fromAddress: str | None = None
    subject: str | None = None
    snippet: str | None = None
    body: str | None = None
    priority: str | None = None
    nextAction: str | None = None
    summary: str | None = None


class GmailIngestResponse(BaseModel):
    count: int
    messages: list[IngestedMessage]


class OutlookOAuthStartResponse(BaseModel):
    authUrl: str
    state: str


class OutlookOAuthStatusResponse(BaseModel):
    connected: bool
    email: str | None = None
    scope: str | None = None
    expiresAt: str | None = None
    hasRefreshToken: bool = False


class OutlookOAuthCallbackResponse(BaseModel):
    connected: bool
    email: str | None = None


class OutlookIngestRequest(BaseModel):
    maxResults: int = 20
    query: str | None = None


class OutlookIngestResponse(BaseModel):
    count: int
    messages: list[IngestedMessage]


class TelemetryEventRequest(BaseModel):
    event: str
    properties: dict[str, Any] | None = None
    occurredAt: str | None = None


class TelemetryIngestResponse(BaseModel):
    accepted: bool


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


SUMMARY_NEXT_ACTIONS = {"Respond today", "Schedule follow-up", "Draft response", "No action needed"}
SUMMARY_PRIORITIES = {"important", "follow up", "needs reply", "fyi"}
PRIORITY_TO_ACTION = {
    "important": "Respond today",
    "follow up": "Schedule follow-up",
    "needs reply": "Draft response",
    "fyi": "No action needed",
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


def _utc_now() -> datetime:
    return datetime.now(timezone.utc)


def _ensure_data_dir() -> None:
    DATA_DIR.mkdir(parents=True, exist_ok=True)


def _load_json(path: Path) -> dict[str, Any]:
    if not path.exists():
        return {}
    try:
        with path.open("r", encoding="utf-8") as f:
            return json.load(f)
    except (OSError, json.JSONDecodeError):
        return {}


def _write_json(path: Path, payload: dict[str, Any]) -> None:
    _ensure_data_dir()
    with path.open("w", encoding="utf-8") as f:
        json.dump(payload, f, indent=2)


def _append_jsonl(path: Path, payload: dict[str, Any]) -> None:
    _ensure_data_dir()
    with path.open("a", encoding="utf-8") as f:
        f.write(json.dumps(payload, separators=(",", ":")) + "\n")


def _oauth_redirect_uri() -> str:
    return os.environ.get("GOOGLE_OAUTH_REDIRECT_URI", "http://127.0.0.1:8000/gmail/oauth/callback").strip()


def _google_client_id() -> str:
    cid = os.environ.get("GOOGLE_CLIENT_ID", "").strip()
    if not cid:
        raise HTTPException(status_code=500, detail="GOOGLE_CLIENT_ID is not configured")
    return cid


def _google_client_secret() -> str:
    sec = os.environ.get("GOOGLE_CLIENT_SECRET", "").strip()
    if not sec:
        raise HTTPException(status_code=500, detail="GOOGLE_CLIENT_SECRET is not configured")
    return sec


def _microsoft_client_id() -> str:
    cid = os.environ.get("MICROSOFT_CLIENT_ID", "").strip()
    if not cid:
        raise HTTPException(status_code=500, detail="MICROSOFT_CLIENT_ID is not configured")
    return cid


def _microsoft_client_secret() -> str:
    sec = os.environ.get("MICROSOFT_CLIENT_SECRET", "").strip()
    if not sec:
        raise HTTPException(status_code=500, detail="MICROSOFT_CLIENT_SECRET is not configured")
    return sec


def _outlook_oauth_redirect_uri() -> str:
    return os.environ.get(
        "MICROSOFT_OAUTH_REDIRECT_URI",
        "http://127.0.0.1:8000/outlook/oauth/callback",
    ).strip()


def _prune_expired_states() -> None:
    now = _utc_now()
    expired = [k for k, v in _oauth_states.items() if v < now]
    for k in expired:
        del _oauth_states[k]


def _decode_b64url(value: str) -> str:
    padded = value + "=" * (-len(value) % 4)
    return base64.urlsafe_b64decode(padded.encode("utf-8")).decode("utf-8")


def _extract_email_from_id_token(id_token: str | None) -> str | None:
    if not id_token:
        return None
    parts = id_token.split(".")
    if len(parts) != 3:
        return None
    try:
        payload = json.loads(_decode_b64url(parts[1]))
        email = (payload.get("email") or "").strip()
        return email or None
    except (ValueError, json.JSONDecodeError):
        return None


async def _google_post_token(payload: dict[str, Any]) -> dict[str, Any]:
    async with httpx.AsyncClient(timeout=HTTP_TIMEOUT) as client:
        try:
            r = await client.post(
                GOOGLE_TOKEN_URL,
                data=payload,
                headers={"Content-Type": "application/x-www-form-urlencoded"},
            )
        except httpx.HTTPError as e:
            raise HTTPException(status_code=502, detail="Google token exchange request failed") from e
    if r.is_success:
        return r.json()
    detail = "Google token exchange failed"
    try:
        err = r.json().get("error") or ""
        err_desc = r.json().get("error_description") or ""
        parts = [x.strip() for x in (err, err_desc) if str(x).strip()]
        if parts:
            detail = "Google token exchange failed: " + " - ".join(parts)
    except (ValueError, AttributeError):
        pass
    raise HTTPException(status_code=502, detail=detail)


async def _microsoft_post_token(payload: dict[str, Any]) -> dict[str, Any]:
    async with httpx.AsyncClient(timeout=HTTP_TIMEOUT) as client:
        try:
            r = await client.post(
                MICROSOFT_TOKEN_URL,
                data=payload,
                headers={"Content-Type": "application/x-www-form-urlencoded"},
            )
        except httpx.HTTPError as e:
            raise HTTPException(status_code=502, detail="Microsoft token exchange request failed") from e
    if r.is_success:
        return r.json()
    detail = "Microsoft token exchange failed"
    try:
        err = r.json().get("error") or ""
        err_desc = r.json().get("error_description") or ""
        parts = [x.strip() for x in (err, err_desc) if str(x).strip()]
        if parts:
            detail = "Microsoft token exchange failed: " + " - ".join(parts)
    except (ValueError, AttributeError):
        pass
    raise HTTPException(status_code=502, detail=detail)


def _token_expiry_iso(expires_in_seconds: int | None) -> str | None:
    if not expires_in_seconds:
        return None
    expires = _utc_now() + timedelta(seconds=int(expires_in_seconds))
    return expires.isoformat()


def _token_is_expiring_soon(token_payload: dict[str, Any]) -> bool:
    expires_at = (token_payload.get("expires_at") or "").strip()
    if not expires_at:
        return True
    try:
        dt = datetime.fromisoformat(expires_at)
    except ValueError:
        return True
    return dt <= (_utc_now() + timedelta(seconds=60))


async def _refresh_access_token(tokens: dict[str, Any]) -> dict[str, Any]:
    refresh_token = (tokens.get("refresh_token") or "").strip()
    if not refresh_token:
        raise HTTPException(status_code=401, detail="No refresh token available; reconnect Gmail OAuth")
    data = await _google_post_token(
        {
            "client_id": _google_client_id(),
            "client_secret": _google_client_secret(),
            "grant_type": "refresh_token",
            "refresh_token": refresh_token,
        }
    )
    refreshed = dict(tokens)
    refreshed["access_token"] = data.get("access_token")
    refreshed["expires_in"] = data.get("expires_in")
    refreshed["scope"] = data.get("scope", refreshed.get("scope"))
    refreshed["token_type"] = data.get("token_type", refreshed.get("token_type"))
    refreshed["expires_at"] = _token_expiry_iso(data.get("expires_in"))
    _write_json(TOKEN_PATH, refreshed)
    return refreshed


async def _get_gmail_tokens() -> dict[str, Any]:
    tokens = _load_json(TOKEN_PATH)
    if not tokens or not tokens.get("access_token"):
        raise HTTPException(status_code=401, detail="Gmail is not connected")
    if _token_is_expiring_soon(tokens):
        tokens = await _refresh_access_token(tokens)
    return tokens


async def _refresh_outlook_access_token(tokens: dict[str, Any]) -> dict[str, Any]:
    refresh_token = (tokens.get("refresh_token") or "").strip()
    if not refresh_token:
        raise HTTPException(status_code=401, detail="No refresh token available; reconnect Outlook OAuth")
    data = await _microsoft_post_token(
        {
            "client_id": _microsoft_client_id(),
            "client_secret": _microsoft_client_secret(),
            "grant_type": "refresh_token",
            "refresh_token": refresh_token,
            "scope": " ".join(OUTLOOK_SCOPES),
        }
    )
    refreshed = dict(tokens)
    refreshed["access_token"] = data.get("access_token")
    refreshed["refresh_token"] = data.get("refresh_token", refreshed.get("refresh_token"))
    refreshed["expires_in"] = data.get("expires_in")
    refreshed["scope"] = data.get("scope", refreshed.get("scope"))
    refreshed["token_type"] = data.get("token_type", refreshed.get("token_type"))
    refreshed["expires_at"] = _token_expiry_iso(data.get("expires_in"))
    _write_json(OUTLOOK_TOKEN_PATH, refreshed)
    return refreshed


async def _get_outlook_tokens() -> dict[str, Any]:
    tokens = _load_json(OUTLOOK_TOKEN_PATH)
    if not tokens or not tokens.get("access_token"):
        raise HTTPException(status_code=401, detail="Outlook is not connected")
    if _token_is_expiring_soon(tokens):
        tokens = await _refresh_outlook_access_token(tokens)
    return tokens


def _find_header(headers: list[dict[str, str]], key: str) -> str | None:
    for h in headers:
        if h.get("name", "").lower() == key.lower():
            return h.get("value")
    return None


def _extract_plain_body(payload: dict[str, Any]) -> str | None:
    body = payload.get("body") or {}
    data = body.get("data")
    if payload.get("mimeType", "").lower().startswith("text/plain") and data:
        try:
            return _decode_b64url(data)
        except ValueError:
            return None
    for part in payload.get("parts") or []:
        text = _extract_plain_body(part)
        if text:
            return text
    return None


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


def heuristic_summary(subject: str | None, email_body: str, from_address: str | None = None) -> SummaryResponse:
    text = " ".join([
        (subject or "").strip(),
        (from_address or "").strip(),
        (email_body or "").strip(),
    ]).lower()

    if any(k in text for k in ("invoice", "security", "urgent", "asap", "deadline")):
        priority = "important"
        next_action = "Respond today"
    elif any(k in text for k in ("follow up", "checking in", "check in", "reminder")):
        priority = "follow up"
        next_action = "Schedule follow-up"
    elif any(k in text for k in ("thanks", "fyi", "for your information", "no reply needed")):
        priority = "fyi"
        next_action = "No action needed"
    else:
        priority = "needs reply"
        next_action = "Draft response"

    clean = re.sub(r"\s+", " ", (email_body or "").strip())
    if not clean:
        summary = "No email content available to summarize."
    else:
        summary = clean[:220] + ("..." if len(clean) > 220 else "")
    return SummaryResponse(summary=summary, nextAction=next_action, priority=priority)


def _normalize_priority(raw: str | None) -> str | None:
    v = str(raw or "").strip().lower()
    if not v:
        return None
    aliases = {
        "important": "important",
        "high": "important",
        "high priority": "important",
        "critical": "important",
        "follow up": "follow up",
        "follow-up": "follow up",
        "followup": "follow up",
        "needs reply": "needs reply",
        "needs_response": "needs reply",
        "needs response": "needs reply",
        "reply": "needs reply",
        "fyi": "fyi",
        "for your information": "fyi",
        "no action needed": "fyi",
    }
    return aliases.get(v)


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


@app.get("/health")
async def health() -> dict[str, str]:
    return {"status": "ok"}


@app.get("/")
async def frontend_index() -> FileResponse:
    return FileResponse(_frontend_index_path())


@app.get("/favicon.ico", include_in_schema=False)
async def favicon_ico() -> FileResponse:
    path = FRONTEND_DIST_DIR / "favicon.ico"
    if path.exists():
        return FileResponse(path)
    raise HTTPException(status_code=404, detail="favicon not found")


@app.get("/app")
async def frontend_app_legacy() -> RedirectResponse:
    return RedirectResponse(url="/", status_code=301)


@app.get("/robots.txt")
async def frontend_robots() -> FileResponse:
    for candidate in (FRONTEND_DIST_DIR / "robots.txt", FRONTEND_DIR / "public" / "robots.txt"):
        if candidate.exists():
            return FileResponse(candidate, media_type="text/plain")
    raise HTTPException(status_code=404, detail="robots.txt not found")


@app.get("/sitemap.xml")
async def frontend_sitemap() -> FileResponse:
    for candidate in (FRONTEND_DIST_DIR / "sitemap.xml", FRONTEND_DIR / "public" / "sitemap.xml"):
        if candidate.exists():
            return FileResponse(candidate, media_type="application/xml")
    raise HTTPException(status_code=404, detail="sitemap.xml not found")


@app.get("/gmail/oauth/start", response_model=GmailOAuthStartResponse)
async def gmail_oauth_start() -> GmailOAuthStartResponse:
    _prune_expired_states()
    state = secrets.token_urlsafe(24)
    _oauth_states[state] = _utc_now() + timedelta(minutes=10)
    params = {
        "client_id": _google_client_id(),
        "redirect_uri": _oauth_redirect_uri(),
        "response_type": "code",
        "scope": " ".join(GMAIL_SCOPES),
        "access_type": "offline",
        "include_granted_scopes": "true",
        "prompt": "consent",
        "state": state,
    }
    return GmailOAuthStartResponse(authUrl=f"{GOOGLE_OAUTH_BASE}?{urlencode(params)}", state=state)


@app.get("/gmail/oauth/callback", response_model=GmailOAuthCallbackResponse)
async def gmail_oauth_callback(code: str, state: str) -> GmailOAuthCallbackResponse:
    _prune_expired_states()
    if state not in _oauth_states:
        raise HTTPException(status_code=400, detail="Invalid or expired OAuth state")
    del _oauth_states[state]
    data = await _google_post_token(
        {
            "client_id": _google_client_id(),
            "client_secret": _google_client_secret(),
            "code": code,
            "grant_type": "authorization_code",
            "redirect_uri": _oauth_redirect_uri(),
        }
    )
    email = _extract_email_from_id_token(data.get("id_token"))
    tokens = {
        "access_token": data.get("access_token"),
        "refresh_token": data.get("refresh_token"),
        "scope": data.get("scope"),
        "token_type": data.get("token_type"),
        "expires_in": data.get("expires_in"),
        "expires_at": _token_expiry_iso(data.get("expires_in")),
        "email": email,
        "updated_at": _utc_now().isoformat(),
    }
    _write_json(TOKEN_PATH, tokens)
    return GmailOAuthCallbackResponse(connected=True, email=email)


@app.get("/gmail/oauth/status", response_model=GmailOAuthStatusResponse)
async def gmail_oauth_status() -> GmailOAuthStatusResponse:
    tokens = _load_json(TOKEN_PATH)
    if not tokens.get("access_token"):
        return GmailOAuthStatusResponse(connected=False)
    return GmailOAuthStatusResponse(
        connected=True,
        email=tokens.get("email"),
        scope=tokens.get("scope"),
        expiresAt=tokens.get("expires_at"),
        hasRefreshToken=bool((tokens.get("refresh_token") or "").strip()),
    )


@app.post("/gmail/ingest/messages", response_model=GmailIngestResponse)
async def gmail_ingest_messages(body: GmailIngestRequest) -> GmailIngestResponse:
    max_results = max(1, min(100, int(body.maxResults)))
    tokens = await _get_gmail_tokens()
    params = {"maxResults": max_results}
    if body.query and body.query.strip():
        params["q"] = body.query.strip()

    async def _list_messages(token: str) -> httpx.Response:
        headers = {"Authorization": f"Bearer {token}"}
        return await client.get(f"{GMAIL_API_BASE}/messages", headers=headers, params=params)

    async with httpx.AsyncClient(timeout=HTTP_TIMEOUT) as client:
        access_token = str(tokens.get("access_token") or "")
        list_resp = await _list_messages(access_token)
        if list_resp.status_code == 401 and str(tokens.get("refresh_token") or "").strip():
            tokens = await _refresh_access_token(tokens)
            access_token = str(tokens.get("access_token") or "")
            list_resp = await _list_messages(access_token)
        if not list_resp.is_success:
            raise HTTPException(status_code=500, detail="Failed to fetch Gmail message list")
        ids = (list_resp.json().get("messages") or [])
        messages: list[IngestedMessage] = []
        headers = {"Authorization": f"Bearer {access_token}"}
        for item in ids:
            message_id = item.get("id")
            thread_id = item.get("threadId")
            if not message_id or not thread_id:
                continue
            detail_resp = await client.get(
                f"{GMAIL_API_BASE}/messages/{message_id}",
                headers=headers,
                params={"format": "full"},
            )
            if not detail_resp.is_success:
                continue
            raw = detail_resp.json()
            payload = raw.get("payload") or {}
            headers_list = payload.get("headers") or []
            ingested = IngestedMessage(
                id=message_id,
                threadId=thread_id,
                internalDate=raw.get("internalDate"),
                fromAddress=_find_header(headers_list, "From"),
                subject=_find_header(headers_list, "Subject"),
                snippet=raw.get("snippet"),
                body=_extract_plain_body(payload),
            )
            triage = heuristic_summary(ingested.subject, ingested.body or ingested.snippet or "", ingested.fromAddress)
            ingested.priority = triage.priority
            ingested.nextAction = triage.nextAction
            ingested.summary = triage.summary
            messages.append(ingested)
    _write_json(
        INGEST_PATH,
        {
            "updated_at": _utc_now().isoformat(),
            "count": len(messages),
            "messages": [m.model_dump() for m in messages],
        },
    )
    return GmailIngestResponse(count=len(messages), messages=messages)


@app.get("/outlook/oauth/start", response_model=OutlookOAuthStartResponse)
async def outlook_oauth_start() -> OutlookOAuthStartResponse:
    _prune_expired_states()
    state = secrets.token_urlsafe(24)
    _oauth_states[state] = _utc_now() + timedelta(minutes=10)
    params = {
        "client_id": _microsoft_client_id(),
        "redirect_uri": _outlook_oauth_redirect_uri(),
        "response_type": "code",
        "scope": " ".join(OUTLOOK_SCOPES),
        "response_mode": "query",
        "state": state,
        "prompt": "select_account",
    }
    return OutlookOAuthStartResponse(authUrl=f"{MICROSOFT_OAUTH_BASE}?{urlencode(params)}", state=state)


@app.get("/outlook/oauth/callback", response_model=OutlookOAuthCallbackResponse)
async def outlook_oauth_callback(code: str, state: str) -> OutlookOAuthCallbackResponse:
    _prune_expired_states()
    if state not in _oauth_states:
        raise HTTPException(status_code=400, detail="Invalid or expired OAuth state")
    del _oauth_states[state]
    data = await _microsoft_post_token(
        {
            "client_id": _microsoft_client_id(),
            "client_secret": _microsoft_client_secret(),
            "code": code,
            "grant_type": "authorization_code",
            "redirect_uri": _outlook_oauth_redirect_uri(),
            "scope": " ".join(OUTLOOK_SCOPES),
        }
    )
    email = _extract_email_from_id_token(data.get("id_token"))
    tokens = {
        "access_token": data.get("access_token"),
        "refresh_token": data.get("refresh_token"),
        "scope": data.get("scope"),
        "token_type": data.get("token_type"),
        "expires_in": data.get("expires_in"),
        "expires_at": _token_expiry_iso(data.get("expires_in")),
        "email": email,
        "updated_at": _utc_now().isoformat(),
    }
    _write_json(OUTLOOK_TOKEN_PATH, tokens)
    return OutlookOAuthCallbackResponse(connected=True, email=email)


@app.get("/outlook/oauth/status", response_model=OutlookOAuthStatusResponse)
async def outlook_oauth_status() -> OutlookOAuthStatusResponse:
    tokens = _load_json(OUTLOOK_TOKEN_PATH)
    if not tokens.get("access_token"):
        return OutlookOAuthStatusResponse(connected=False)
    return OutlookOAuthStatusResponse(
        connected=True,
        email=tokens.get("email"),
        scope=tokens.get("scope"),
        expiresAt=tokens.get("expires_at"),
        hasRefreshToken=bool((tokens.get("refresh_token") or "").strip()),
    )


@app.post("/outlook/ingest/messages", response_model=OutlookIngestResponse)
async def outlook_ingest_messages(body: OutlookIngestRequest) -> OutlookIngestResponse:
    max_results = max(1, min(100, int(body.maxResults)))
    tokens = await _get_outlook_tokens()
    params: dict[str, Any] = {
        "$top": max_results,
        "$select": "id,conversationId,receivedDateTime,from,subject,bodyPreview",
    }
    headers = {"Authorization": f"Bearer {str(tokens.get('access_token') or '')}"}
    if body.query and body.query.strip():
        params["$search"] = f"\"{body.query.strip()}\""
        headers["ConsistencyLevel"] = "eventual"

    async def _list_messages(token: str) -> httpx.Response:
        h = dict(headers)
        h["Authorization"] = f"Bearer {token}"
        return await client.get(f"{GRAPH_API_BASE}/messages", headers=h, params=params)

    async with httpx.AsyncClient(timeout=HTTP_TIMEOUT) as client:
        access_token = str(tokens.get("access_token") or "")
        list_resp = await _list_messages(access_token)
        if list_resp.status_code == 401 and str(tokens.get("refresh_token") or "").strip():
            tokens = await _refresh_outlook_access_token(tokens)
            access_token = str(tokens.get("access_token") or "")
            list_resp = await _list_messages(access_token)
        if not list_resp.is_success:
            raise HTTPException(status_code=500, detail="Failed to fetch Outlook message list")

        values = list_resp.json().get("value") or []
        messages: list[IngestedMessage] = []
        detail_headers = {"Authorization": f"Bearer {access_token}"}
        for item in values:
            message_id = item.get("id")
            thread_id = item.get("conversationId") or message_id
            if not message_id or not thread_id:
                continue
            detail_resp = await client.get(
                f"{GRAPH_API_BASE}/messages/{message_id}",
                headers=detail_headers,
                params={"$select": "body"},
            )
            body_value = None
            if detail_resp.is_success:
                body_value = (((detail_resp.json().get("body") or {}).get("content")) or "").strip() or None

            from_obj = item.get("from") or {}
            from_email = ((from_obj.get("emailAddress") or {}).get("address")) or None
            ingested = IngestedMessage(
                id=message_id,
                threadId=thread_id,
                internalDate=item.get("receivedDateTime"),
                fromAddress=from_email,
                subject=item.get("subject"),
                snippet=item.get("bodyPreview"),
                body=body_value,
            )
            triage = heuristic_summary(ingested.subject, ingested.body or ingested.snippet or "", ingested.fromAddress)
            ingested.priority = triage.priority
            ingested.nextAction = triage.nextAction
            ingested.summary = triage.summary
            messages.append(ingested)

    _write_json(
        OUTLOOK_INGEST_PATH,
        {
            "updated_at": _utc_now().isoformat(),
            "count": len(messages),
            "messages": [m.model_dump() for m in messages],
        },
    )
    return OutlookIngestResponse(count=len(messages), messages=messages)


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


@app.post("/summarize", response_model=SummaryResponse)
async def summarize(body: SummaryRequest) -> SummaryResponse:
    if not body.email or not body.email.strip():
        raise HTTPException(status_code=400, detail="email must not be empty")

    fallback = heuristic_summary(body.subject, body.email, body.fromAddress)
    try:
        raw = await call_openrouter(
            "Summarize this email for inbox triage in 1-2 concise sentences. "
            "Also provide exactly one next action chosen from: Respond today, Schedule follow-up, Draft response, No action needed. "
            "Return STRICT JSON with keys summary and nextAction only.\n\n"
            f"Subject: {(body.subject or '').strip()}\n"
            f"From: {(body.fromAddress or '').strip()}\n"
            f"Email:\n{body.email.strip()}"
        )
        parsed = json.loads(raw)
        summary = str(parsed.get("summary") or "").strip()
        next_action = str(parsed.get("nextAction") or "").strip()
        normalized_priority = _normalize_priority(parsed.get("priority"))
        if not summary:
            return fallback
        if next_action not in SUMMARY_NEXT_ACTIONS:
            if normalized_priority:
                next_action = PRIORITY_TO_ACTION[normalized_priority]
            else:
                next_action = fallback.nextAction
        priority = {
            "Respond today": "important",
            "Schedule follow-up": "follow up",
            "Draft response": "needs reply",
            "No action needed": "fyi",
        }[next_action]
        return SummaryResponse(summary=summary[:280], nextAction=next_action, priority=priority)
    except (json.JSONDecodeError, TypeError, ValueError, KeyError):
        return fallback
    except HTTPException:
        return fallback
    except httpx.HTTPError:
        return fallback


@app.post("/telemetry/events", response_model=TelemetryIngestResponse)
async def telemetry_events(body: TelemetryEventRequest) -> TelemetryIngestResponse:
    allowed_events = {
        "draft_invoked",
        "draft_generated_success",
        "draft_generated_error",
        "time_to_first_draft_ms",
        "persona_missing_block",
        "page_view",
        "cta_click",
        "oauth_started",
        "oauth_start_failed",
        "ingest_completed",
        "ingest_failed",
        "draft_generated",
        "draft_generation_failed",
        "persona_saved",
        "theme_changed",
        "classifier_feedback_submitted",
        "classifier_priority_corrected",
    }
    event = (body.event or "").strip()
    if event not in allowed_events:
        raise HTTPException(status_code=400, detail="Unsupported telemetry event")

    payload: dict[str, Any] = {
        "event": event,
        "recordedAt": _utc_now().isoformat(),
    }
    if body.occurredAt and body.occurredAt.strip():
        payload["occurredAt"] = body.occurredAt.strip()
    if body.properties and isinstance(body.properties, dict):
        # Local-first and privacy-safe: reject large/raw payloads.
        safe_props: dict[str, Any] = {}
        for k, v in body.properties.items():
            key = str(k).strip()[:64]
            if not key:
                continue
            if isinstance(v, (str, int, float, bool)) or v is None:
                if isinstance(v, str):
                    safe_props[key] = v[:200]
                else:
                    safe_props[key] = v
        if safe_props:
            payload["properties"] = safe_props

    _append_jsonl(TELEMETRY_PATH, payload)
    return TelemetryIngestResponse(accepted=True)
