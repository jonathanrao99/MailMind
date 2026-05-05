# SOL-64 Design QA Note: MVP Interaction Quality + Premium Baseline

Date: 2026-05-05  
Surface reviewed: Standalone app shell (`/` route) in `frontend/index.html`

## Scope and method
- Read current markup, styling, and interaction logic for inbox list, detail pane, assistant panel, persona settings, and draft workflow.
- Focused on MVP-safe improvements with minimal architectural churn.

## Must-fix before MVP signoff

1. Interaction state clarity for async actions
- Surface: top action row (`Connect Gmail`, `Refresh`, `Ingest Messages`) and draft actions.
- Current behavior: only status text changes; main buttons do not consistently enter loading/disabled states, so users can spam requests or doubt progress.
- UX risk: lowers trust and increases accidental duplicate actions.
- Fix: add explicit loading + disabled states for connect/refresh/ingest buttons, with restored labels and disabled pointer state until completion.
- Tradeoff: very low implementation cost; no API changes.

2. Message list accessibility and keyboard usability
- Surface: `.mail-row` entries in inbox list.
- Current behavior: rows are clickable `article` elements without keyboard semantics or focus styling.
- UX risk: fails baseline keyboard accessibility and makes selection feel less premium.
- Fix: convert rows to semantic buttons or add `role="button"`, `tabindex="0"`, Enter/Space handlers, and a visible focus ring token.
- Tradeoff: small DOM/event refactor; high usability payoff.

3. Error and empty-state actionability
- Surface: `#gmailStatus`, empty/error blocks in list panel.
- Current behavior: error text is generic and not action-oriented; empty states differ in action affordance.
- UX risk: users stall after failure or no-data states.
- Fix: standardize three states with explicit next step CTAs:
  - Not connected: primary CTA to connect.
  - Connected but no messages: CTA to ingest with suggested query.
  - Failed request: retry CTA + short reason.
- Tradeoff: text/conditional UI only; no backend impact.

4. Draft Lab preflight clarity
- Surface: `Generate Draft` flow.
- Current behavior: prerequisites are validated only after click; users discover missing persona/email late.
- UX risk: interrupts flow and feels brittle.
- Fix: preflight UI hint above actions showing checklist state (persona present, email present, email selected), and disable generate until minimum requirements pass.
- Tradeoff: minor state wiring; reduces failed attempts.

## Nice-to-have polish (if time remains)

1. Information hierarchy tuning in message rows
- Reduce visual competition between subject/snippet/tag by softening snippet contrast and tightening tag prominence.
- Helps scanning speed without structural change.

2. Consistent panel-collapse affordance
- Two controls (`Hide AI Panel` and `Collapse Panel`) can feel redundant.
- Keep one primary entry point in header; secondary control can remain but should use same copy pattern.

3. KPI credibility signals
- KPI values are partly synthetic from heuristics; add microcopy (e.g., "estimated") to avoid overpromising intelligence accuracy.

## Implementation map (Engineer handoff)

- Route/screen: `/` (standalone app shell)
- Primary file: `frontend/index.html`
- Target sections:
  - Controls/loading: `setDraftButtonsLoading`, `ingestMessages`, `startConnect`, `refreshStatus`
  - Message row rendering/selection: `renderMessages` and `.mail-row` styles
  - Empty/error states: `renderEmpty`, `setStatus`, `#gmailStatus`
  - Draft preflight: `generateDraft`, `personaFromForm`, Draft Lab status block

## Acceptance check for this QA stream
- Prioritized fixes are bounded for MVP and mapped to specific components.
- Rationale and tradeoffs included for every must-fix item.
- Engineer has a concrete implementation starting point in one file with named functions.
