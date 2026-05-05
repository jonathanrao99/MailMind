export function Download() {
  return (
    <section id="download" className="scroll-mt-20 border-t border-border bg-card py-20 sm:py-28">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-3xl text-center">
          <h2 className="text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">Get MailMind</h2>
          <p className="mt-4 text-lg text-muted">
            Installers and store listings are on the roadmap. Today you run from source—perfect for developers and
            early adopters who want full control.
          </p>
        </div>
        <div className="mx-auto mt-12 grid max-w-4xl gap-6 lg:grid-cols-2">
          <div className="rounded-2xl border border-border bg-background p-8 text-left shadow-sm">
            <h3 className="text-lg font-semibold text-foreground">Desktop app</h3>
            <p className="mt-2 text-sm text-muted">
              Builds the inbox UI and opens Electron. Starts the API automatically if it is not already running.
            </p>
            <pre className="mt-4 overflow-x-auto rounded-xl bg-stone-900 p-4 text-left text-sm text-stone-100">
              <code>make desktop</code>
            </pre>
            <a
              href="https://github.com"
              target="_blank"
              rel="noopener noreferrer"
              className="mt-6 inline-flex h-11 items-center justify-center rounded-xl bg-brand px-6 text-sm font-semibold text-white hover:bg-brand-hover"
            >
              Download (coming soon)
            </a>
          </div>
          <div className="rounded-2xl border border-border bg-background p-8 text-left shadow-sm">
            <h3 className="text-lg font-semibold text-foreground">Chrome extension</h3>
            <p className="mt-2 text-sm text-muted">
              Developer mode → Load unpacked → select the <code className="font-mono text-xs">extension/</code>{" "}
              folder from the repo.
            </p>
            <p className="mt-4 text-sm text-muted">
              Shortcut: <kbd className="rounded border border-border bg-card px-1.5 py-0.5 font-mono text-xs">⌘⇧.</kbd>{" "}
              (Mac) or <kbd className="rounded border border-border bg-card px-1.5 py-0.5 font-mono text-xs">Ctrl⇧.</kbd>{" "}
              (Windows/Linux).
            </p>
            <a
              href="https://github.com"
              target="_blank"
              rel="noopener noreferrer"
              className="mt-6 inline-flex h-11 items-center justify-center rounded-xl border border-border bg-card px-6 text-sm font-semibold text-foreground hover:bg-stone-50"
            >
              Chrome Web Store (coming soon)
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}
