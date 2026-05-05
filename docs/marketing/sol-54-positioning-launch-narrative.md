# SOL-54: MailMind MVP Positioning and Launch Narrative

## Objective
Ship a clear launch narrative that explains who MailMind is for, why it is different, and what actions drive first-week activation and demand.

## Product Truth (MVP)
- Surface: Chrome extension in Gmail + local FastAPI backend.
- Core value: generate reply drafts in the user's voice without tab switching.
- Trust angle: persona data saved locally (chrome.storage), not SaaS profile storage.
- Current moat for MVP: speed, low setup friction, local-first control.

## ICP and Problem
- Primary ICP: solo founders, freelancers, and operators who process 20-100 emails/day in Gmail.
- Trigger problem: reply backlog, slow context switching, inconsistent tone under time pressure.
- Existing alternatives users try: manual templates, generic AI chat tabs, Gmail canned responses.

## Positioning
MailMind helps high-email operators clear replies faster by generating context-aware drafts in their own voice directly inside Gmail, while keeping persona/profile data local.

## One-line Category
Local-first AI reply copilot for Gmail.

## Messaging Pillars
1. Write in your voice, not bot voice.
2. Draft where work already happens (inside Gmail).
3. Keep control of persona data on your own machine.
4. Recover hours every week from reply backlog.

## Proof Points (MVP-safe)
- Persona fields for role/tone/instructions are persisted in extension local storage.
- Draft generation is invoked from Gmail reply UI.
- Backend and extension can run locally for user-controlled workflow.

## Launch Narrative (External Copy)
Inbox debt is not a writing problem; it is a workflow problem. Most AI email tools force people to leave Gmail, restate context, then rewrite robotic output. MailMind flips this: it drafts directly in Gmail using your saved persona and intent controls so every reply sounds like you. The result is fewer delayed responses and more closed loops, without surrendering your profile data to another SaaS vault.

## Channel Plan (Fastest Learning Loop)
1. Local SEO + landing page intent capture
- Build a focused page targeting "AI Gmail reply assistant" and "write email replies faster".
- Add CTA for waitlist + MVP onboarding call.

2. Founder-led social proof loop (X + LinkedIn)
- Publish 3 short demos (20-40s) showing before/after response time.
- Post one narrative thread: "why local-first for email AI".

3. Community demand generation
- Launch posts in Indie Hackers, r/Entrepreneur, and relevant founder/operator communities.
- Offer 10 white-glove setup slots for feedback in exchange for usage data.

4. Content engine
- Publish 2 pain-point articles:
  - "How to cut email reply time by 50%"
  - "Prompt templates vs persona-based email drafting"

## Conversion Path
1. Social/content click -> landing page with clear value prop.
2. User sees 30-second demo and trust message (local-first persona storage).
3. CTA: "Get early access" (email capture) + secondary "Book setup".
4. Onboarding email with install + 5-minute quickstart.
5. Activation event: first successful draft in Gmail.

## KPI Baseline, Target Delta, Timeline, Tracking
Assumption date: May 5, 2026 baseline week (new MVP launch; low/near-zero top-of-funnel).

| KPI | Baseline (Week 0) | Target Delta | Target Date |
|---|---:|---:|---|
| Landing page sessions/week | 0-100 | +400 | May 31, 2026 |
| Waitlist conversion rate | Unknown (set baseline week 1) | +3 to +5 pp after message test | June 15, 2026 |
| Setup call bookings/week | 0 | 10/week | June 1, 2026 |
| Activation rate (first draft within 24h of install) | Unknown (instrument first) | Reach 35%+ | June 15, 2026 |
| D7 retained active users | Unknown (instrument first) | Reach 20%+ | June 30, 2026 |

## Tracking Plan
Events to instrument in first pass:
- `lp_view`
- `lp_cta_click`
- `waitlist_submitted`
- `install_started`
- `extension_installed`
- `persona_saved`
- `draft_generated`
- `draft_accepted`
- `user_returned_d7`

Attribution dimensions:
- `utm_source`, `utm_medium`, `utm_campaign`, `persona_type`, `channel_post_id`.

Dashboards:
- Funnel: `lp_view -> waitlist_submitted -> extension_installed -> draft_generated`.
- Activation cohort: users with `draft_generated` within 24h.
- Channel ROI proxy: cost/time by channel vs activated users.

## Experiments (Next 14 Days)
1. Headline test (value framing)
- Variant A: "Clear your inbox in your own voice."
- Variant B: "AI Gmail replies that sound like you."
- Success metric: waitlist conversion rate.

2. Trust test (local-first emphasis)
- Variant A: trust callout near CTA.
- Variant B: trust callout in FAQ only.
- Success metric: CTA click-through + conversion.

3. CTA test
- Variant A: "Get early access"
- Variant B: "Book 15-minute setup"
- Success metric: activation-adjusted conversion.

## Dependencies and Owners
- CTO: implement analytics events + UTM persistence in frontend/extension/backend.
- UXDesigner: produce launch visuals (hero, 30-second demo snippets, social cards).
- CMO (this issue): messaging, channel execution, experiment backlog, and weekly reporting.

## Acceptance Criteria
- Positioning statement, category line, and 4 messaging pillars finalized in one source doc.
- Launch narrative copy drafted and usable for landing/social.
- KPI baseline assumptions + target deltas + timeline documented.
- Tracking event spec documented with funnel and attribution requirements.
- Cross-functional dependencies listed with owners.

## Next Action
Create child issues for:
1. Technical SEO + analytics instrumentation (CTO owner).
2. Creative production package for launch assets (UXDesigner owner).
3. Landing page copy + social launch calendar execution (CMO owner).
