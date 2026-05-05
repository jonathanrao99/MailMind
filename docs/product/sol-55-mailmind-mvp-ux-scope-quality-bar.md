# SOL-55: MailMind MVP UX Scope + Quality Bar

Date: May 5, 2026  
Owner: CTO (`SOL-55`)  
Related: `SOL-54` positioning narrative

## 1) UX Outcome for MVP

MailMind MVP should let a Gmail user move from "open reply" to "usable first draft" in under 30 seconds, with high trust that output matches their voice and needs only light editing.

## 2) In-Scope User Journey (MVP)

1. User opens Gmail reply or compose.
2. User invokes `AI Draft` (FAB or keyboard shortcut).
3. User picks intent/length and optional notes.
4. Draft is generated and inserted into compose field.
5. User can accept/edit/send without leaving Gmail.

## 3) In-Scope UX Surfaces

1. Gmail compose FAB (`extension/content.js`): discoverable, non-intrusive trigger.
2. Draft-intent modal: intent + length + optional notes.
3. Persona editor (`extension/popup.html`, `popup.js`): required profile setup clarity.
4. Toast/error states: actionable recovery copy (backend down, missing persona, missing compose box, extension stale).
5. Desktop inbox assistant panel (`frontend/index.html`): summary + next action framing for selected message.

## 4) Explicit Non-Goals for MVP

1. Multi-account/team persona management.
2. Autonomous send/reply or background auto-triage.
3. Complex workflow automation (rules, routing, SLA engines).
4. Pixel-perfect Gmail-native theming beyond baseline alignment.

## 5) UX Quality Bar (Release Gate)

### Functional

1. AI Draft trigger visible when compose exists and hidden/disabled when it does not.
2. Draft generation succeeds with persona present and healthy backend.
3. All primary failures show clear next action in <1 sentence.
4. Generated text inserts at cursor/compose body reliably on latest Gmail web UI.

### Experience

1. Time to first draft: p50 <= 12s, p90 <= 30s on normal network.
2. Invocation friction: max 1 dialog, no dead-end interactions.
3. Voice fidelity: user reports "sounds like me" >= 4/5 in first-run pilot survey.
4. Control confidence: intent/length controls materially affect output (spot-checked prompts).

### UI/Accessibility Baseline

1. Keyboard-only path works for invoke, modal submit, and close.
2. Visible focus states on all actionable controls.
3. Toasts are readable and non-blocking.
4. No control overlaps with Gmail Send/Discard actions at common breakpoints.

### Reliability

1. No uncaught promise/runtime errors in normal draft flow.
2. Extension recovers gracefully after reload invalidation (clear refresh guidance).
3. Backend timeout and model errors map to user-safe copy.

## 6) Smallest Proof Before Declaring Done

1. Manual UX test script with 8 scenarios passes (happy path + 7 failure modes).
2. 3 internal pilot users each complete at least 5 drafts; collect latency + voice-fidelity rating.
3. Screen capture of one complete happy-path flow for launch/QA reference.

## 7) Metrics to Instrument (MVP-light)

1. `draft_invoked`
2. `draft_generated_success`
3. `draft_generated_error` (typed reason)
4. `time_to_first_draft_ms`
5. `persona_missing_block`

Note: local-first posture remains; avoid collecting raw email body content in telemetry.

## 8) Risks, Tradeoffs, Rollback

1. Gmail DOM volatility risk.
Tradeoff: MVP relies on targeted selectors for speed.
Rollback: ship "degraded mode" messaging + rapid selector hotfix path.

2. Latency variance from model/provider.
Tradeoff: better response quality can increase wait time.
Rollback: switch to faster default model and tighten token budget.

3. Trust risk from off-tone drafts.
Tradeoff: higher creativity can reduce voice consistency.
Rollback: reduce temperature and strengthen persona anchoring in prompt.

## 9) Execution Streams (Parallel)

1. UX polish and interaction hardening (Designer-owned).
2. Engineering reliability + instrumentation (Engineer-owned).
3. Validation runbook and pilot readout (CTO-owned consolidation).

## 10) Decision Needed from CEO

Approve this as the MVP release UX gate for MailMind. If approved, execution proceeds on child issues with this document as acceptance baseline.
