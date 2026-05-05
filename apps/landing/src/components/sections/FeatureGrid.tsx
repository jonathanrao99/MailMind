const features = [
  {
    title: "Persona-aware drafts",
    body: "Name, role, business context, tone, and standing instructions shape every generation—so outputs match how you actually write.",
    icon: "◆"
  },
  {
    title: "Native in Gmail",
    body: "Works inside replies and compose. Keyboard shortcut support, toasts for errors, and no copy-paste into random chat tabs.",
    icon: "✉"
  },
  {
    title: "Desktop inbox",
    body: "A focused Electron experience for triage and reading when you want to step out of the browser—same backend, same habits.",
    icon: "▣"
  },
  {
    title: "Local FastAPI brain",
    body: "POST /generate with thread context and intent. Swap models in code; point at OpenRouter or your preferred provider.",
    icon: "⚡"
  },
  {
    title: "Gmail OAuth & ingest",
    body: "Connect Gmail, pull recent messages, and experiment with summaries and next-action hints—designed for a single-user local flow.",
    icon: "🔗"
  },
  {
    title: "Outlook path (beta)",
    body: "Parallel OAuth and Microsoft Graph hooks in the backend for teams who split time between Google and Microsoft 365.",
    icon: "◈"
  }
];

export function FeatureGrid() {
  return (
    <section id="features" className="scroll-mt-20 py-20 sm:py-28">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <div className="max-w-2xl">
          <h2 className="text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
            Everything you need to move mail faster
          </h2>
          <p className="mt-4 text-lg text-muted">
            Built for operators, founders, and anyone who treats the inbox as a system—not a junk drawer.
          </p>
        </div>
        <ul className="mt-14 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((f) => (
            <li
              key={f.title}
              className="group rounded-2xl border border-border bg-card p-6 shadow-sm transition-shadow hover:shadow-md"
            >
              <span
                className="flex h-10 w-10 items-center justify-center rounded-xl bg-stone-100 text-lg text-brand transition-colors group-hover:bg-brand/10"
                aria-hidden
              >
                {f.icon}
              </span>
              <h3 className="mt-4 text-lg font-semibold text-foreground">{f.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted">{f.body}</p>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
