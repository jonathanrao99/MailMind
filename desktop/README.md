# MailMind Desktop

Run from repo root:

```bash
make desktop
```

This installs desktop dependencies (first run), builds the mail UI (`apps/mail` → `dist/`), starts the backend if `http://127.0.0.1:8000/health` is not already up, and opens Electron. The window always loads `apps/mail/dist/index.html` from disk (no dev URL).

To rebuild the mail bundle only:

```bash
cd desktop && npm run build:mail
```
