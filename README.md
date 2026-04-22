# MailMind — your inbox, but the AI *actually* works for *you*

> **MailMind** (this repo) is a scrappy little system: a **Chrome extension** that lives in **Gmail** and a **local FastAPI** brain that talks to **OpenRouter** so you can draft replies in *your* voice—without copy-pasting into twelve different chat tabs.

If you’ve ever thought *“I’ll reply in five minutes”* and then it was next Tuesday, you’re in the right place.

---

## What you get

| ✨ | Feature |
|----|--------|
| **Persona** | Name, role, business, contact, tone, and standing instructions—saved in the extension, not in a random SaaS database you forgot you signed up for. |
| **One floating control** | While you’re in a reply, hit the **AI Draft** chip (or the keyboard shortcut) and you get a *nice* dialog: intent, length, extra notes. |
| **No thread clutter** | The top-of-message “draft” bar is **gone** on purpose. One control, bottom-left, out of the way of Send. |
| **Toasts, not `alert()`** | Errors and success actually look like 2026. |

---

## How it’s wired (the boring-but-useful part)

```text
┌─────────────┐     POST /generate     ┌──────────────┐     HTTPS      ┌─────────────┐
│   Gmail     │  ───────────────────►  │  FastAPI     │  ───────────►  │ OpenRouter  │
│  (content)  │     localhost:8000     │  main.py     │   chat API     │   (LLM)     │
└─────────────┘     JSON + persona     └──────────────┘                 └─────────────┘
       ▲
       │  your persona lives in
       ▼
┌─────────────┐
│  extension  │  `chrome.storage` — stays on the machine. Open the toolbar popup to edit.
│   popup     │
└─────────────┘
```

---

## Quick start

### 1) Backend (Python)

```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate   # Windows: .venv\Scripts\activate
pip install -r requirements.txt
```

**Env:** from the repo root (or `backend/`), copy the example and add your key:

```bash
cp backend/.env.example .env
# or: cp backend/.env.example backend/.env
```

Put your **OpenRouter** key in `OPENROUTER_API_KEY=...` (the app loads `MailOS/.env` and then `backend/.env` if present).

**Run the API:**

```bash
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

You should be able to hit the server from the machine; the extension is configured to talk to `http://127.0.0.1:8000` (see `extension/content.js` → `API_BASE` if you need to change it).

### 2) Extension (Chrome / Chromium)

1. Open `chrome://extensions` (or Edge equivalent).
2. Turn on **Developer mode**.
3. **Load unpacked** → pick the `extension` folder in this repo.
4. In Gmail, open a **reply** so the **AI Draft** control appears, click the **MailMind** icon in the toolbar to set your **persona**, then try a draft.

**Shortcut:** the manifest suggests **Ctrl+Shift+.** (Windows/Linux) or **⌘+Shift+.** (Mac). You can remap it under `chrome://extensions/shortcuts`.

---

## Project map

| Path | Job |
|------|-----|
| `backend/main.py` | FastAPI app, `/generate`, CORS for `https://mail.google.com`, OpenRouter + persona/intent prompt logic. |
| `extension/manifest.json` | MV3, service worker, content script on mail.google.com, optional command for the shortcut. |
| `extension/content.js` | Gmail DOM, FAB, toasts, intent dialog, `fetch` to the backend. |
| `extension/popup.html` + `popup.js` | Persona form + save to `chrome.storage`. |
| `extension/background.js` | Storage bootstrap, forwards keyboard command to the tab. |

---

## Gotchas (we’re honest)

- The backend must be **running** and reachable at the URL the extension uses, or you’ll get a toast, not a miracle.
- After you **reload** the extension in dev, **refresh Gmail**—Chrome invalidates the content script’s extension context, and the extension will tell you if that’s what happened.
- The **OpenRouter** model in code is a **configurable default**; swap `MODEL` in `main.py` if you want something else.
- The Chrome **popup window** is still a rectangle at the OS level. The UI is styled to look like a **rounded card** *inside* that—because browsers don’t let extensions ship a literal bubble window (yet?).

---

## Contributing

We like **small, focused** changes: one concern per pull request, clear commit messages, and a short description of *what* you changed and *why*.

1. **Fork** the repo and create a branch from `main` (e.g. `fix/gmail-fab-zindex` or `feat/length-preset`).
2. **Run the stack locally** before you open a PR: backend on `http://127.0.0.1:8000` and the extension loaded unpacked from `extension/`, then sanity-check in Gmail.
3. **Match existing style** in the files you touch (JS for the content script, Python for the API) instead of reformatting unrelated code.
4. **Don’t commit secrets** (`.env`, API keys, tokens). The repo’s `.gitignore` should help; when in doubt, use env examples only.
5. **Open a PR** with a concise summary. If you’re fixing a bug, say how to reproduce it. If the change is UI-only, a before/after note or screenshot helps.

Security-sensitive stuff (e.g. prompt injection, data handling) belongs in a private disclosure if you’re not sure—use your judgment.

You don’t need permission to open an issue: questions, ideas, and rough edges are all welcome.

---

## License

This project is released under the **MIT License** — see [`LICENSE`](LICENSE) for the full text.

---

*Now go clear that “Promotions” tab guilt-free.* ✨
