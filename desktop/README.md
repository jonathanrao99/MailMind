# MailMind Desktop

Run from repo root:

```bash
make desktop
```

This installs desktop dependencies (first run), builds the mail UI (`apps/mail`), starts the backend if it is not already up, and opens MailMind in an Electron window (loading the built mail app from disk).

## Mail UI development

To iterate on the mail app with Vite hot reload, run in one terminal:

```bash
cd apps/mail && npm install && npm run dev
```

In another terminal, from `desktop/`:

```bash
npm run dev:mail
```

`MAILMIND_MAIL_DEV=1` loads `http://127.0.0.1:5174` instead of `apps/mail/dist/index.html`. Ensure the API is running (`make up` or let Electron spawn `./scripts/dev-start.sh`).
