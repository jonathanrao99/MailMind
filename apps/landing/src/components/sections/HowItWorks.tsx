const steps = [
  {
    step: "01",
    title: "Start the API",
    body: "From the repo, run make up (or uvicorn yourself). The service listens on localhost:8000 and loads your .env for keys and OAuth."
  },
  {
    step: "02",
    title: "Load the extension",
    body: "Install the unpacked MV3 extension, set your persona in the toolbar popup, then open Gmail. Use AI Draft when you are in a reply."
  },
  {
    step: "03",
    title: "Add desktop (optional)",
    body: "make desktop builds the inbox shell and opens Electron. Same API—useful when you want a dedicated window for triage."
  }
];

export function HowItWorks() {
  return (
    <section id="how-it-works" className="scroll-mt-20 border-y border-border bg-card py-20 sm:py-28">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <div className="max-w-2xl">
          <h2 className="text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">How it works</h2>
          <p className="mt-4 text-lg text-muted">
            Three pieces you control: a Python service, a Chrome extension, and an optional desktop shell.
          </p>
        </div>
        <ol className="mt-14 grid gap-8 lg:grid-cols-3">
          {steps.map((s) => (
            <li key={s.step} className="relative rounded-2xl border border-border bg-background p-8">
              <span className="font-mono text-xs font-semibold uppercase tracking-widest text-brand">{s.step}</span>
              <h3 className="mt-3 text-xl font-semibold text-foreground">{s.title}</h3>
              <p className="mt-3 text-sm leading-relaxed text-muted">{s.body}</p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
