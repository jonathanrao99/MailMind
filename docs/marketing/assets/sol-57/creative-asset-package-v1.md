# SOL-57 Creative Asset Package v1

Date: May 5, 2026  
Owner: UXDesigner  
Narrative source: `docs/marketing/sol-54-positioning-launch-narrative.md`

## Visual Direction

Theme: calm speed + trustworthy control.  
Art direction: clean product UI over soft gradient atmosphere with local-first trust cues.

Color tokens:
- `--ink-900`: `#0F172A`
- `--ink-700`: `#334155`
- `--sky-500`: `#0EA5E9`
- `--teal-500`: `#14B8A6`
- `--mint-200`: `#A7F3D0`
- `--cloud-050`: `#F8FAFC`

Type stack:
- Headline: `Space Grotesk` Semibold
- Body/UI: `Source Sans 3` Regular/Semibold
- Data labels: `IBM Plex Mono`

Core motif:
- Left-to-right "inbox velocity" flow lines behind product frame.
- Shield/check icon next to local-first trust copy.
- Persona chips to imply "your voice" control.

## Asset 1: Landing Hero Visual

Placement:
- Primary hero section on launch landing page.

Canvas and exports:
- Desktop: `1920x1080` PNG + WebP
- Tablet: `1536x1024` PNG + WebP
- Mobile: `1080x1350` PNG + WebP

Composition spec:
1. Left column (copy block)
- Eyebrow: `LOCAL-FIRST AI REPLY COPILOT FOR GMAIL`
- H1: `Clear your inbox in your own voice.`
- Subhead: `Generate context-aware replies inside Gmail. Persona data stays on your machine.`
- CTA row (visual only): `Get early access` + secondary `See 30-sec demo`

2. Right column (product frame)
- Gmail reply pane mock with selected inbound message.
- MailMind panel open with persona fields collapsed and a visible generated draft.
- "Before/After" micro-metric badge: `~6 min -> ~90 sec per reply`.

3. Trust strip under fold line
- Icon + copy: `Persona profile stored locally (chrome.storage)`

Accessibility constraints:
- Minimum text contrast 4.5:1 for body, 3:1 for large heading.
- Do not place text over high-frequency gradient zones.

File names:
- `sol57-hero-desktop-1920x1080-v1.png`
- `sol57-hero-desktop-1920x1080-v1.webp`
- `sol57-hero-tablet-1536x1024-v1.png`
- `sol57-hero-mobile-1080x1350-v1.png`

## Assets 2-4: Social Cards (X/LinkedIn)

Common exports:
- Square: `1080x1080`
- Landscape: `1200x675`
- Format: PNG + WebP

### Card A: Voice Pillar

Message pillar: `Write in your voice, not bot voice.`

Copy:
- Headline: `Your tone. Drafted faster.`
- Body: `MailMind learns your persona settings so replies sound like you, not a template.`
- Footer tag: `Built for Gmail workflows`

Visual:
- Split panel with "robotic draft" crossed out on left and refined natural draft on right.

File names:
- `sol57-social-voice-1080-v1.png`
- `sol57-social-voice-1200x675-v1.png`

### Card B: In-Flow Pillar

Message pillar: `Draft where work already happens.`

Copy:
- Headline: `No tab switching required.`
- Body: `Generate, edit, and send from the Gmail reply box.`
- Footer tag: `Context stays in flow`

Visual:
- Gmail compose screenshot frame with highlighted MailMind action button and draft insertion.

File names:
- `sol57-social-inflow-1080-v1.png`
- `sol57-social-inflow-1200x675-v1.png`

### Card C: Local-First Pillar

Message pillar: `Keep control of persona data.`

Copy:
- Headline: `Local-first by default.`
- Body: `Persona profile is stored on-device, giving users direct control over voice settings.`
- Footer tag: `Trust without extra SaaS sprawl`

Visual:
- Device outline with shield icon and local storage callout anchored to persona panel.

File names:
- `sol57-social-localfirst-1080-v1.png`
- `sol57-social-localfirst-1200x675-v1.png`

## Asset 5: Demo Storyboard + Shot List (32s)

Target runtime: 32 seconds (acceptable range 20-40s).
Format: `1920x1080`, 30fps, H.264 MP4, captions burned-in.

### Shot timeline

1. `00:00-00:03` Hook
- Screen: overloaded Gmail inbox + unread count.
- Caption: `Inbox debt is a workflow problem.`

2. `00:03-00:07` Problem
- Screen: manual drafting lag, cursor idle, tab switching flashes.
- Caption: `Too much context switching, too little throughput.`

3. `00:07-00:12` Open MailMind
- Screen: click MailMind in Gmail reply.
- Caption: `Open copilot directly in Gmail.`

4. `00:12-00:17` Persona context
- Screen: role/tone/instructions fields briefly shown.
- Caption: `Set your voice once.`

5. `00:17-00:23` Draft generation
- Screen: generated reply appears; user tweaks one sentence.
- Caption: `Get a usable first draft in seconds.`

6. `00:23-00:27` Trust moment
- Screen: local storage badge + shield check.
- Caption: `Persona stays local-first.`

7. `00:27-00:32` Outcome + CTA
- Screen: send reply, inbox list advances.
- Caption: `Clear more replies in your own voice. Join early access.`

## Export Manifest (Delivery Bundle)

Directory:
- `docs/marketing/assets/sol-57/exports/`

Expected files:
- `sol57-hero-desktop-1920x1080-v1.png`
- `sol57-hero-desktop-1920x1080-v1.webp`
- `sol57-hero-tablet-1536x1024-v1.png`
- `sol57-hero-mobile-1080x1350-v1.png`
- `sol57-social-voice-1080-v1.png`
- `sol57-social-voice-1200x675-v1.png`
- `sol57-social-inflow-1080-v1.png`
- `sol57-social-inflow-1200x675-v1.png`
- `sol57-social-localfirst-1080-v1.png`
- `sol57-social-localfirst-1200x675-v1.png`
- `sol57-demo-storyboard-v1.pdf`
- `sol57-demo-32s-v1.mp4`

## Handoff Notes

- Product UI screenshots in assets should use the current MVP extension panel states.
- Keep copy synchronized with SOL-54 messaging pillars; do not introduce new claims.
- First review pass should include CEO + CMO sign-off on visual tone before final rendering.
