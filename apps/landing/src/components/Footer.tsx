export function Footer() {
  return (
    <footer className="border-t border-border bg-card">
      <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="flex flex-col gap-8 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <div className="flex items-center gap-2 font-semibold text-foreground">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand text-sm font-bold text-white">
                M
              </span>
              MailMind
            </div>
            <p className="mt-3 max-w-xs text-sm text-muted">
              Local-first AI email assistance. Your keys, your machine, your voice.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-8 sm:grid-cols-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-muted">Product</p>
              <ul className="mt-3 space-y-2 text-sm">
                <li>
                  <a href="#features" className="text-muted hover:text-foreground">
                    Features
                  </a>
                </li>
                <li>
                  <a href="#download" className="text-muted hover:text-foreground">
                    Download
                  </a>
                </li>
              </ul>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-muted">Developers</p>
              <ul className="mt-3 space-y-2 text-sm">
                <li>
                  <a
                    href="https://github.com"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-muted hover:text-foreground"
                  >
                    GitHub
                  </a>
                </li>
                <li>
                  <a
                    href="https://github.com"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-muted hover:text-foreground"
                  >
                    Documentation
                  </a>
                </li>
              </ul>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-muted">Legal</p>
              <ul className="mt-3 space-y-2 text-sm">
                <li>
                  <span className="text-muted">MIT License</span>
                </li>
              </ul>
            </div>
          </div>
        </div>
        <p className="mt-10 border-t border-border pt-8 text-center text-xs text-muted">
          © {new Date().getFullYear()} MailMind. Built for people who live in email.
        </p>
      </div>
    </footer>
  );
}
