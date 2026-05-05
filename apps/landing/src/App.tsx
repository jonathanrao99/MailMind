export default function App() {
  return (
    <main className="landing">
      <section className="hero-card">
        <p className="kicker">MailMind</p>
        <h1>Email for people who ship</h1>
        <p>
          The public site is for product storytelling and onboarding. The workspace lives in the
          desktop app; the Chrome extension brings AI drafts into Gmail.
        </p>
        <div className="hero-actions">
          <a className="btn primary" href="https://github.com" target="_blank" rel="noreferrer">
            Install desktop app
          </a>
          <a className="btn" href="https://github.com" target="_blank" rel="noreferrer">
            Chrome extension
          </a>
        </div>
      </section>
    </main>
  );
}
