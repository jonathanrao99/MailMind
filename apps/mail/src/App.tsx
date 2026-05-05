import { useMemo, useState } from "react";
import { HashRouter, Route, Routes } from "react-router-dom";

const LANDING_URL = import.meta.env.VITE_LANDING_URL ?? "https://mailmind.app";

type Thread = {
  from: string;
  meta: string;
  subject: string;
  body: string;
  draft: string;
};

const threads: Thread[] = [
  {
    from: "Avery Kim",
    meta: "Q3 partner review tomorrow · 2m",
    subject: "Can you send the revised KPI narrative before 4pm?",
    body: "We need the final voice pass for the board packet. Please tighten the intro and keep it non-technical for external readers.",
    draft: "Absolutely. I will send the revised KPI narrative by 3:30pm with a tighter, non-technical intro and clear outcome framing."
  },
  {
    from: "Nora Patel",
    meta: "Invoice workflow update · 19m",
    subject: "Following up on billing ops automation",
    body: "Can you confirm if the new routing rules are live for all enterprise accounts?",
    draft: "Yes, routing rules are now live for all enterprise accounts. I am monitoring exceptions and will share a checkpoint by end of day."
  },
  {
    from: "Ops Team",
    meta: "Weekly digest · 1h",
    subject: "Support SLA summary",
    body: "Median first response moved from 2h to 1h 18m this week. Two escalations are still open.",
    draft: "Thanks for sharing. We will keep the faster first-response target and close the two open escalations today."
  }
];

function MailWorkspace() {
  const [query, setQuery] = useState("");
  const [selectedThread, setSelectedThread] = useState<number | null>(0);
  const [viewState, setViewState] = useState<"content" | "loading" | "error" | "empty">("content");

  const filtered = useMemo(
    () =>
      threads.filter((thread) =>
        `${thread.from} ${thread.meta} ${thread.subject}`.toLowerCase().includes(query.toLowerCase())
      ),
    [query]
  );

  const current = selectedThread !== null ? filtered[selectedThread] : null;

  return (
    <main className="app">
      <aside className="sidebar pane">
        <div className="brand">MailMind</div>
        <button type="button" className="rail-btn compose">
          + Compose
        </button>
        {["Inbox", "Priority", "Waiting", "Sent", "Persona"].map((tab) => (
          <button key={tab} type="button" className={`rail-btn${tab === "Inbox" ? " active" : ""}`}>
            <span className="label">{tab}</span>
          </button>
        ))}
        <a className="rail-btn site-link" href={LANDING_URL} target="_blank" rel="noreferrer">
          Website
        </a>
      </aside>

      <section className="list pane">
        <div className="title">Inbox</div>
        <input
          className="search"
          placeholder="Search threads"
          value={query}
          onChange={(event) => {
            setQuery(event.target.value);
            setSelectedThread(0);
          }}
        />
        <div className="rows">
          {filtered.map((thread, index) => (
            <button
              key={`${thread.subject}-${index}`}
              type="button"
              className={`row${selectedThread === index ? " active" : ""}`}
              onClick={() => {
                setSelectedThread(index);
                setViewState("content");
              }}
            >
              <span className="from">{thread.from}</span>
              <span className="meta">{thread.meta}</span>
              <span className="meta">{thread.subject}</span>
            </button>
          ))}
        </div>
      </section>

      <section className="detail">
        <div className="topbar">
          <span className="pill">{viewState[0].toUpperCase() + viewState.slice(1)}</span>
          <div>
            <button type="button" className="btn" onClick={() => setViewState("loading")}>
              Loading
            </button>
            <button type="button" className="btn" onClick={() => setViewState("error")}>
              Error
            </button>
            <button type="button" className="btn" onClick={() => setViewState(current ? "content" : "empty")}>
              Content
            </button>
          </div>
        </div>

        {viewState === "content" && current && (
          <div className="content-state">
            <div className="subject">{current.subject}</div>
            <article className="message">{current.body}</article>
            <section className="ai">
              <div className="ai-h">AI Reply Draft</div>
              <div className="draft">{current.draft}</div>
              <div className="actions">
                <button type="button" className="btn">
                  Regenerate
                </button>
                <button type="button" className="btn">
                  Tune Voice
                </button>
                <button type="button" className="btn primary">
                  Insert Draft
                </button>
                <button type="button" className="btn danger">
                  Discard
                </button>
              </div>
            </section>
          </div>
        )}

        {(viewState === "loading" || (viewState === "content" && !current)) && (
          <div className="state active">
            Generating a response in your selected persona. Pulling context from recent replies and sender
            profile.
          </div>
        )}

        {viewState === "error" && (
          <div className="state active">
            Draft generation failed. Retry with a shorter instruction or switch persona. Last attempt timed
            out after 8.2s.
          </div>
        )}

        {viewState === "empty" && (
          <div className="state active">
            No thread selected yet. Pick a conversation from the inbox to preview summary and AI reply draft.
          </div>
        )}
      </section>
    </main>
  );
}

export default function App() {
  return (
    <HashRouter>
      <Routes>
        <Route path="/" element={<MailWorkspace />} />
      </Routes>
    </HashRouter>
  );
}
