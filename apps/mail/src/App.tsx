import { useEffect, useMemo, useState } from "react";
import { HashRouter, Route, Routes } from "react-router-dom";

const LANDING_URL = import.meta.env.VITE_LANDING_URL ?? "https://mailmind.app";

type Thread = {
  id: string;
  from: string;
  subject: string;
  snippet: string;
  body: string;
  draft: string;
  time: string;
  dateGroup: string;
  unread: boolean;
};

const GROUP_ORDER = ["Today", "Yesterday", "Earlier"] as const;

const threads: Thread[] = [
  {
    id: "1",
    from: "Norman from Lead Oracle",
    subject: "Quick question about your rollout timeline",
    snippet: " — Hi! I wanted to circle back on the integration scope we discussed…",
    body: "Hi! I wanted to circle back on the integration scope we discussed last week. Are you still targeting a June launch for the pilot cohort?",
    draft: "Hi Norman — thanks for following up. We are still aiming for a June pilot. I will send a one-pager with milestones by Thursday.",
    time: "3:22 PM",
    dateGroup: "Today",
    unread: true
  },
  {
    id: "2",
    from: "Avery Kim",
    subject: "Revised KPI narrative before 4pm",
    snippet: " — We need the final voice pass for the board packet. Please tighten…",
    body: "We need the final voice pass for the board packet. Please tighten the intro and keep it non-technical for external readers.",
    draft: "Absolutely. I will send the revised KPI narrative by 3:30pm with a tighter, non-technical intro and clear outcome framing.",
    time: "11:04 AM",
    dateGroup: "Today",
    unread: true
  },
  {
    id: "3",
    from: "Nora Patel",
    subject: "Billing ops automation",
    snippet: " — Can you confirm if the new routing rules are live for all enterprise…",
    body: "Can you confirm if the new routing rules are live for all enterprise accounts?",
    draft: "Yes, routing rules are now live for all enterprise accounts. I am monitoring exceptions and will share a checkpoint by end of day.",
    time: "9:41 AM",
    dateGroup: "Today",
    unread: false
  },
  {
    id: "4",
    from: "Ops Team",
    subject: "Weekly SLA digest",
    snippet: " — Median first response moved from 2h to 1h 18m this week…",
    body: "Median first response moved from 2h to 1h 18m this week. Two escalations are still open.",
    draft: "Thanks for sharing. We will keep the faster first-response target and close the two open escalations today.",
    time: "May 4",
    dateGroup: "Yesterday",
    unread: false
  },
  {
    id: "5",
    from: "Stripe",
    subject: "Your receipt from MailMind, Inc.",
    snippet: " — Thanks for your business. Here is your receipt for…",
    body: "Thanks for your business. Here is your receipt for invoice #1042.",
    draft: "Thanks — downloaded and filed under subscriptions.",
    time: "May 4",
    dateGroup: "Yesterday",
    unread: false
  },
  {
    id: "6",
    from: "Design Review",
    subject: "Notes from Monday sync",
    snippet: " — Attached are the open questions on navigation and empty states…",
    body: "Attached are the open questions on navigation and empty states. Let us lock decisions before Friday.",
    draft: "Got it — I will comment in Figma today and propose defaults for empty inbox and search.",
    time: "May 2",
    dateGroup: "Earlier",
    unread: false
  }
];

function IconInbox() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M22 12h-6l-2 3h-4l-2-3H2" />
      <path d="M5.45 5.11L2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z" />
    </svg>
  );
}

function IconCompose() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M12 20h9" />
      <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
    </svg>
  );
}

function IconSearch() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="11" cy="11" r="8" />
      <path d="m21 21-4.3-4.3" />
    </svg>
  );
}

function IconChevronDown() {
  return (
    <svg className="nm-chevron" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="m6 9 6 6 6-6" />
    </svg>
  );
}

function IconRefresh() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
      <path d="M3 3v5h5" />
      <path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16" />
      <path d="M16 16h5v5" />
    </svg>
  );
}

function IconShield() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
    </svg>
  );
}

function IconMore() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
      <circle cx="5" cy="12" r="1.5" />
      <circle cx="12" cy="12" r="1.5" />
      <circle cx="19" cy="12" r="1.5" />
    </svg>
  );
}

function IconPlus() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M12 5v14M5 12h14" />
    </svg>
  );
}

function MailWorkspace() {
  const [query, setQuery] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(threads[0]?.id ?? null);

  const filtered = useMemo(
    () =>
      threads.filter((t) =>
        `${t.from} ${t.subject} ${t.snippet}`.toLowerCase().includes(query.toLowerCase())
      ),
    [query]
  );

  const grouped = useMemo(() => {
    const map = new Map<string, Thread[]>();
    for (const g of GROUP_ORDER) map.set(g, []);
    for (const t of filtered) {
      const list = map.get(t.dateGroup);
      if (list) list.push(t);
    }
    return GROUP_ORDER.filter((g) => (map.get(g)?.length ?? 0) > 0).map((g) => ({
      label: g,
      items: map.get(g) as Thread[]
    }));
  }, [filtered]);

  const current = filtered.find((t) => t.id === selectedId) ?? null;

  useEffect(() => {
    if (filtered.length === 0) {
      setSelectedId(null);
      return;
    }
    if (selectedId === null || !filtered.some((t) => t.id === selectedId)) {
      setSelectedId(filtered[0].id);
    }
  }, [filtered, selectedId]);

  return (
    <main className="nm-app">
      <aside className="nm-sidebar" aria-label="Mail navigation">
        <div className="nm-profile-row">
          <div className="nm-avatar" aria-hidden />
          <div className="nm-profile-text">
            <div className="nm-profile-name">You</div>
            <div className="nm-profile-email">you@mailmind.app</div>
          </div>
          <button type="button" className="nm-icon-btn" aria-label="Account menu">
            <IconChevronDown />
          </button>
          <button type="button" className="nm-icon-btn" aria-label="Compose">
            <IconCompose />
          </button>
        </div>

        <div className="nm-search-wrap">
          <span className="nm-search-icon">
            <IconSearch />
          </span>
          <input
            className="nm-search"
            type="search"
            placeholder="Search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            aria-label="Search mail"
          />
        </div>

        <div className="nm-nav-section">
          <div className="nm-nav-label">Views</div>
          <button type="button" className="nm-nav-item is-active">
            <span>Inbox</span>
            <span className="nm-badge">3</span>
          </button>
          <button type="button" className="nm-nav-item">
            <span>Labels</span>
            <span className="nm-badge">12</span>
          </button>
          <button type="button" className="nm-nav-item">
            <span>Promotions</span>
            <span className="nm-badge">40</span>
          </button>
          <button type="button" className="nm-nav-add">
            <IconPlus /> Add view
          </button>
        </div>

        <div className="nm-nav-section">
          <div className="nm-nav-label">Mail</div>
          <button type="button" className="nm-nav-item is-active">
            All Mail
          </button>
          <button type="button" className="nm-nav-item">
            Sent
          </button>
          <button type="button" className="nm-nav-item">
            <span>Drafts</span>
            <span className="nm-badge">1</span>
          </button>
          <button type="button" className="nm-nav-item">
            Spam
          </button>
          <button type="button" className="nm-nav-item">
            Trash
          </button>
        </div>

        <div className="nm-sidebar-spacer" />

        <div className="nm-nav-section nm-sidebar-footer">
          <a className="nm-nav-item" href={LANDING_URL} target="_blank" rel="noreferrer">
            MailMind website
          </a>
          <button type="button" className="nm-nav-item">
            Settings
          </button>
          <button type="button" className="nm-nav-item">
            Support & feedback
          </button>
        </div>
      </aside>

      <section className="nm-main" aria-label="Inbox list">
        <header className="nm-main-header">
          <h1 className="nm-main-title">
            <IconInbox />
            All Mail
          </h1>
          <div className="nm-main-actions">
            <button type="button" className="nm-ghost-btn">
              Auto label
            </button>
            <button type="button" className="nm-icon-btn" aria-label="Security">
              <IconShield />
            </button>
            <button type="button" className="nm-icon-btn" aria-label="Refresh">
              <IconRefresh />
            </button>
          </div>
        </header>

        <div className="nm-filters">
          <button type="button" className="nm-filter-chip">
            Categories <IconChevronDown />
          </button>
          <button type="button" className="nm-filter-chip">
            Labels <IconChevronDown />
          </button>
          <button type="button" className="nm-filter-chip nm-filter-toggle">
            Is unread
          </button>
          <button type="button" className="nm-filter-chip nm-filter-toggle">
            Show archived
          </button>
          <button type="button" className="nm-filter-chip nm-filter-toggle">
            Show sent
          </button>
          <button type="button" className="nm-filter-chip nm-filter-toggle">
            + Filter
          </button>
        </div>

        <div className="nm-list-scroll">
          {grouped.length === 0 ? (
            <div className="nm-empty">No messages match your search.</div>
          ) : (
            grouped.map((group) => (
              <div key={group.label}>
                <div className="nm-date-group">{group.label}</div>
                {group.items.map((thread) => (
                  <div
                    key={thread.id}
                    role="button"
                    tabIndex={0}
                    className={`nm-row${selectedId === thread.id ? " is-selected" : ""}`}
                    onClick={() => setSelectedId(thread.id)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        setSelectedId(thread.id);
                      }
                    }}
                  >
                    <span className={`nm-unread-dot${thread.unread ? "" : " is-read"}`} aria-hidden />
                    <div className="nm-row-body">
                      <div className={`nm-row-from${thread.unread ? "" : " is-read"}`}>{thread.from}</div>
                      <div className="nm-row-subject-line">
                        <span className={`nm-row-subject${thread.unread ? "" : " is-read"}`}>{thread.subject}</span>
                        <span className="nm-row-snippet">{thread.snippet}</span>
                      </div>
                    </div>
                    <div className="nm-row-meta">
                      <span className="nm-row-time">{thread.time}</span>
                      <button
                        type="button"
                        className="nm-row-more"
                        aria-label="More actions"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <IconMore />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ))
          )}
        </div>

        <button type="button" className="nm-float-cta">
          Get MailMind for mobile
        </button>
      </section>

      <section className="nm-detail" aria-label="Message">
        {current ? (
          <div className="nm-detail-inner">
            <h2 className="nm-detail-subject">{current.subject}</h2>
            <div className="nm-detail-meta">
              {current.from} · {current.time}
            </div>
            <article className="nm-message">{current.body}</article>
            <div className="nm-ai">
              <div className="nm-ai-h">AI reply draft</div>
              <div className="nm-draft">{current.draft}</div>
              <div className="nm-actions">
                <button type="button" className="nm-btn">
                  Regenerate
                </button>
                <button type="button" className="nm-btn">
                  Tune voice
                </button>
                <button type="button" className="nm-btn nm-btn-primary">
                  Insert draft
                </button>
                <button type="button" className="nm-btn nm-btn-danger">
                  Discard
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div className="nm-empty">Select a message to read.</div>
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
