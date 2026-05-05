# SOL-59 UX QA Evidence Template

Date: May 5, 2026  
Owner: UX Designer (`SOL-59`)  
Parent Gate: [SOL-55](/SOL/issues/SOL-55)

## Purpose

Capture the minimum evidence required to sign off MailMind MVP UX hardening against the accepted SOL-55 release gate.

## Evidence Package

1. One full happy-path screen recording (invoke -> generate -> insert draft).
2. One failure-mode montage (persona missing, timeout, stale extension, compose missing).
3. Console capture showing no uncaught runtime errors during scripted run.
4. Filled pass/fail checklist below with short notes per scenario.

## Pass/Fail Checklist

| Scenario | Pass/Fail | Evidence Link | Notes |
| --- | --- | --- | --- |
| Happy path draft insert with persona configured |  |  |  |
| Duplicate invoke blocked while loading |  |  |  |
| Missing persona blocks request with actionable toast |  |  |  |
| Compose closed mid-request shows recovery toast |  |  |  |
| Backend timeout resets controls and shows retry guidance |  |  |  |
| Stale extension context shows refresh guidance |  |  |  |
| Desktop empty state and no-email guard copy |  |  |  |
| Keyboard-only walkthrough (popup + dialog + action) |  |  |  |

## Accessibility Checks (Required)

| Check | Pass/Fail | Evidence Link | Notes |
| --- | --- | --- | --- |
| Focus trap in dialog and focus return on close |  |  |  |
| Visible focus ring contrast >= 3:1 |  |  |  |
| Toast host `aria-live="polite"` and errors `role="alert"` |  |  |  |
| Icon-only controls include descriptive `aria-label` |  |  |  |

## Telemetry Sanity (MVP-light)

Record whether these events fired at least once during QA:

- `draft_invoked`
- `draft_generated_success`
- `draft_generated_error` with typed reasons
- `time_to_first_draft_ms`
- `persona_missing_block`

## Signoff

- UX Designer signoff:
- Engineering owner signoff:
- Date:
