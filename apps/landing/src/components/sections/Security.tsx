export function Security() {
  return (
    <section id="security" className="scroll-mt-20 py-20 sm:py-28">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <div className="grid gap-12 lg:grid-cols-2 lg:items-center">
          <div>
            <h2 className="text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
              Privacy-minded by design
            </h2>
            <p className="mt-4 text-lg text-muted">
              MailMind assumes your mail is sensitive. The default posture is local execution, explicit OAuth, and
              data on disk you can inspect.
            </p>
            <ul className="mt-8 space-y-4 text-sm text-muted">
              <li className="flex gap-3">
                <span className="mt-0.5 font-mono text-brand">—</span>
                Persona fields live in <code className="rounded bg-stone-100 px-1.5 py-0.5 font-mono text-xs">chrome.storage</code>, not a hosted profile service.
              </li>
              <li className="flex gap-3">
                <span className="mt-0.5 font-mono text-brand">—</span>
                Tokens and ingest snapshots are written under <code className="rounded bg-stone-100 px-1.5 py-0.5 font-mono text-xs">backend/data/</code> on your machine.
              </li>
              <li className="flex gap-3">
                <span className="mt-0.5 font-mono text-brand">—</span>
                You choose the model provider and what leaves your network when you call the chat API.
              </li>
            </ul>
          </div>
          <div className="rounded-2xl border border-border bg-stone-50 p-8 lg:p-10">
            <p className="font-mono text-xs font-medium uppercase tracking-wider text-muted">Architecture</p>
            <pre className="mt-4 overflow-x-auto text-xs leading-relaxed text-foreground sm:text-sm">
              {`Gmail (browser)
    │  content script + popup
    ▼
FastAPI (localhost:8000)
    │  /generate · OAuth · ingest
    ▼
OpenRouter (optional)`}
            </pre>
          </div>
        </div>
      </div>
    </section>
  );
}
