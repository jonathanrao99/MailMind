# SOL-59: MailMind MVP UX Polish and Interaction Hardening Spec

Date: May 5, 2026  
Owner: UX Designer (`SOL-59`)  
Depends on: `SOL-55` UX scope/quality bar

## 1) Objective

Harden the MVP interaction layer so users can reliably move from open compose to trustworthy first draft with clear system feedback, zero dead ends, and consistent behavior across success, loading, empty, and failure states.

## 2) Surfaces in this hardening pass

1. Gmail extension draft flow (`extension/content.js`)  
2. Persona popup form (`extension/popup.html`)  
3. Desktop assistant panel (`frontend/index.html`) for summary/draft status clarity

## 3) Interaction decisions (implementation-ready)

### 3.1 Draft invocation and concurrency

1. If a draft is already running, block second invocation and show info toast: `A draft is already in progress.`
2. Disable all draft entry buttons while request is in flight.
3. Keep a single loading label (`Generating…`) everywhere draft action appears.
4. Re-enable controls on all completion paths (success, timeout, thrown error).

### 3.2 Persona gating

1. If persona is missing, hard-stop generation before any API request.
2. Error toast copy: `Set up your persona first in MailMind settings.`
3. Include primary recovery action in same toast body: `Open extension popup, save persona, then retry.`
4. Persona form save button must confirm success with persistent inline status until next edit.

### 3.3 Compose anchoring and stale UI resilience

1. If compose/reply box disappears before insert, do not silently fail.
2. Show explicit recovery toast: `The reply area closed. Open Reply again, then use AI Draft.`
3. If extension context is stale/reloaded, show one-step action: `Refresh Gmail to continue.`
4. Never leave loading state active after stale-context errors.

### 3.4 Toast model and message standards

1. Toast variants allowed: `success`, `error`, `info` only.
2. Title max: 3 words. Body max: 1 sentence.
3. Every `error` toast includes a concrete next action.
4. Auto-dismiss timing:
- `success`: 2.4s
- `info`: 2.8s
- `error`: 4.0s
5. Stack newest toast on top-right with non-blocking pointer behavior outside toast cards.

### 3.5 Desktop panel state clarity

1. Replace ambiguous generic statuses with explicit state language:
- Empty state: `Select an email to generate summary context.`
- Loading state: `Analyzing selected email…`
- Summary success: `Summary ready.`
- Draft success: `Draft generated.`
2. Draft CTA must fail fast when no email selected.
3. Copy CTA must fail fast when draft textarea is empty.
4. Persona save state must not be conflated with draft state.

## 4) Accessibility requirements (must pass)

1. Keyboard-only path for invoke, modal completion, and close (Tab/Shift+Tab/Enter/Escape).
2. Dialog focus trap while open; return focus to draft trigger on close.
3. Visible focus indicator contrast ratio >= 3:1 against adjacent colors.
4. Toast host uses `aria-live="polite"`; error toasts use `role="alert"`.
5. All icon-only controls have descriptive `aria-label` values.

## 5) Acceptance criteria for SOL-59

1. No duplicate draft requests can be started while one is in progress.
2. Missing persona, stale extension, missing compose, timeout, and backend failures each render unique, actionable copy.
3. Loading labels and disabled state are consistent across extension and desktop draft actions.
4. All defined empty/loading/error/success states are present on both extension flow and desktop panel.
5. Manual keyboard walkthrough completes without focus loss or hidden interactive controls.
6. No uncaught runtime errors in browser console during the hardening test script.

## 6) Hardening QA script (minimum)

1. Happy path: generate and insert draft with configured persona.
2. Invoke twice quickly; verify second call is blocked with info toast.
3. Remove persona and attempt generation; verify gating toast and no API call.
4. Start generation then close compose; verify compose-missing recovery toast.
5. Simulate backend timeout; verify timeout copy and controls reset.
6. Simulate stale extension context; verify refresh guidance.
7. Desktop panel: empty summary state and draft-without-email guard.
8. Keyboard-only run through popup + dialog + draft action path.

## 7) Handoff notes for Engineering

1. Keep copy constants centralized to avoid drift across surfaces.
2. Prefer deterministic state machine transitions (`idle -> loading -> success|error`).
3. Emit telemetry for each major failure mode with typed reason labels matching SOL-55 metrics.

## 8) Next action

Engineer implements these criteria in extension and frontend surfaces, then posts evidence (screen recording + state checklist) back on `SOL-59` for UX signoff.
