export function Hero() {
  return (
    <section className="relative overflow-hidden border-b border-border">
      <div
        className="pointer-events-none absolute inset-0 opacity-40"
        aria-hidden
        style={{
          backgroundImage: `radial-gradient(ellipse 80% 50% at 50% -20%, rgba(13, 92, 69, 0.15), transparent)`
        }}
      />
      <div className="relative mx-auto max-w-6xl px-4 pb-20 pt-16 sm:px-6 sm:pb-28 sm:pt-24 lg:px-8">
        <p className="inline-flex items-center rounded-full border border-border bg-card px-3 py-1 text-xs font-medium text-muted shadow-sm">
          Gmail extension · Desktop app · Local API
        </p>
        <h1 className="mt-6 max-w-3xl text-4xl font-semibold tracking-tight text-foreground sm:text-5xl lg:text-6xl lg:leading-[1.1]">
          Reply in minutes—
          <span className="text-brand"> in your voice</span>, without leaving Gmail.
        </h1>
        <p className="mt-6 max-w-2xl text-lg leading-relaxed text-muted sm:text-xl">
          MailMind drafts responses that sound like you: persona, tone, and standing instructions stay in{" "}
          <strong className="font-medium text-foreground">your extension</strong>, not someone else’s database. A
          small FastAPI service on your laptop talks to the model you choose.
        </p>
        <div className="mt-10 flex flex-col gap-3 sm:flex-row sm:items-center">
          <a
            href="#download"
            className="inline-flex h-12 items-center justify-center rounded-xl bg-brand px-8 text-base font-semibold text-white shadow-md transition-colors hover:bg-brand-hover"
          >
            Install MailMind
          </a>
          <a
            href="#how-it-works"
            className="inline-flex h-12 items-center justify-center rounded-xl border border-border bg-card px-8 text-base font-semibold text-foreground shadow-sm transition-colors hover:bg-stone-50"
          >
            See how it works
          </a>
        </div>
        <dl className="mt-14 grid gap-6 sm:grid-cols-3">
          {[
            { k: "Persona on-device", v: "Saved in Chrome storage—your profile never leaves the browser." },
            { k: "One calm control", v: "AI Draft chip in compose/reply—no clutter at the top of the thread." },
            { k: "You own the stack", v: "Run the API locally; bring your own OpenRouter key and model." }
          ].map((item) => (
            <div key={item.k} className="rounded-2xl border border-border bg-card p-5 shadow-sm">
              <dt className="text-sm font-semibold text-foreground">{item.k}</dt>
              <dd className="mt-2 text-sm leading-relaxed text-muted">{item.v}</dd>
            </div>
          ))}
        </dl>
      </div>
    </section>
  );
}
