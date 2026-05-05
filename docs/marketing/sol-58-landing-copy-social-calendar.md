# SOL-58 / SOL-54C: Landing Copy and Social Launch Calendar Execution

## Objective
Convert positioning into shippable demand assets that increase qualified waitlist signups and setup bookings from founder/operator traffic.

## KPI Baseline, Target Delta, Timeline
Baseline date: May 5, 2026.

| KPI | Baseline | Target Delta | Target Date |
|---|---:|---:|---|
| Landing page sessions/week | 0-100 | +400/week | May 31, 2026 |
| Waitlist conversion rate | Unknown (measure week 1) | +3 to +5 percentage points | June 15, 2026 |
| Setup bookings/week | 0 | 10/week | June 1, 2026 |
| Activation rate (`draft_generated` <24h) | Unknown (instrument first) | 35%+ | June 15, 2026 |

## Tracking Plan (Required for Attribution)
UTMs on every social/community link:
- `utm_source` (`x`, `linkedin`, `indiehackers`, `reddit`)
- `utm_medium` (`social`, `community`)
- `utm_campaign` (`launch_week1`, `launch_week2`)
- `utm_content` (`hook_a`, `hook_b`, `demo_clip_1`, etc.)

Primary events:
- `lp_view`
- `lp_cta_click`
- `waitlist_submitted`
- `install_started`
- `extension_installed`
- `draft_generated`

Decision rule:
- Keep channel/copy variant only if it improves waitlist CVR by >=15% relative vs control after >=200 landing sessions.

## Landing Page Copy (Production Draft)

### Hero
- Eyebrow: `Local-first AI for Gmail replies`
- Headline A: `Clear your inbox in your own voice.`
- Headline B: `AI Gmail replies that sound like you.`
- Subheadline: `MailMind drafts context-aware replies directly in Gmail using your persona settings, so you respond faster without leaving your workflow.`
- Primary CTA: `Get early access`
- Secondary CTA: `Book 15-minute setup`
- Trust microcopy: `Persona settings are stored locally in your extension profile.`

### Problem/Value Section
- Section title: `Email backlog is a workflow problem, not a writing problem.`
- Body: `Most AI email tools force a copy-paste loop: leave Gmail, re-explain context, rewrite generic output. MailMind drafts where you already work, so you can close loops faster with less context switching.`

### Benefit Bullets
- `Write in your voice, not bot voice.`
- `Generate drafts inside Gmail, where replies already happen.`
- `Keep control with local-first persona storage.`
- `Recover hours each week from reply backlog.`

### How It Works
1. `Set your persona once` (role, tone, response instructions).
2. `Open a Gmail thread and hit generate`.
3. `Review, tweak, and send a draft that sounds like you`.

### CTA Block
- Heading: `Get faster replies without changing tools.`
- Body: `Join the early access cohort and get the quickstart install guide.`
- Primary CTA: `Get early access`
- Secondary CTA: `Book setup`

### FAQ Snippets
- Q: `Where is my persona data stored?`
- A: `In your extension’s local storage profile on your machine.`
- Q: `Does this work in Gmail directly?`
- A: `Yes. Draft generation is triggered from the Gmail reply workflow.`

## Social Launch Calendar (2 Weeks)

### Cadence and Channel Mix
- X: 4 posts/week (2 demos, 1 educational, 1 founder narrative).
- LinkedIn: 3 posts/week (1 demo, 1 insight, 1 build-in-public recap).
- Communities: 2 posts/week (Indie Hackers + relevant Reddit thread).

### Week 1 (May 6-10, 2026)
1. May 6 (X + LinkedIn): Launch hook + 30s demo clip.
- Hook A: `If you answer 20+ emails/day, context switching is your biggest tax.`
- CTA: `Try MailMind early access`.
- UTM: `utm_campaign=launch_week1&utm_content=demo_clip_1`.
2. May 7 (X): Problem/solution post.
- Copy: `Most AI email tools are extra tabs. We built one that works in Gmail.`
- CTA: waitlist.
3. May 8 (LinkedIn): Founder narrative.
- Copy angle: local-first trust and voice consistency.
4. May 9 (Indie Hackers): Product intro + 10 white-glove setup slots.
5. May 10 (Reddit, founder/operator community): Workflow breakdown post with soft CTA.

### Week 2 (May 13-17, 2026)
1. May 13 (X + LinkedIn): Before/after response-time demo.
- CTA: book setup.
- UTM: `utm_campaign=launch_week2&utm_content=demo_clip_2`.
2. May 14 (X): Educational post.
- Topic: persona-based drafting vs templates.
3. May 15 (LinkedIn): Mini case-style post from first testers.
4. May 16 (Indie Hackers): Week-1 metrics snapshot + learnings.
5. May 17 (X): Experiment result teaser + CTA.

## Channel-Specific Post Templates

### X template
`Email replies eating your day?`
`MailMind drafts replies in your voice inside Gmail.`
`No tab switching. Local-first persona settings.`
`Early access: {link_with_utm}`

### LinkedIn template
`Reply backlog is usually a workflow bottleneck, not a writing bottleneck.`
`We built MailMind to generate drafts directly in Gmail using your voice settings.`
`If you process 20-100 emails/day, we’re opening early access here: {link_with_utm}`

### Community template
`I built a local-first Gmail reply copilot for people drowning in inbox debt.`
`Would love blunt feedback from founders/operators. I have 10 setup slots this week.`
`If useful, join early access: {link_with_utm}`

## Acceptance Criteria
- Landing copy blocks are complete and ready to implement on site.
- Two-week social calendar has dates, channels, hooks, CTA, and UTM structure.
- KPI baseline, target delta, timeline, and tracking plan are explicit.
- Decision rule for messaging/channel experiments is defined.

## Blockers
- Owner: CTO.
- Unblock action: implement/verify event capture (`lp_view`, `lp_cta_click`, `waitlist_submitted`, `extension_installed`, `draft_generated`) and UTM persistence for reporting.

## Next Action
1. Hand this copy/calendar to implementation owners.
2. Launch Week 1 posts on May 6, 2026 with UTM links.
3. Review first 200-session CVR data and choose headline winner by May 13, 2026.
