# Fluffy Angels — website

Visual-first, kid-and-parent site for Fluffy Angels Snow Cones. Static HTML/CSS/JS, no build step.

```
python3 -m http.server 8123   # then open http://localhost:8123
```

## What's in it
- **Gate** — loading cone → "Fluffy Angel or Parent?" pick. The pick sets `data-mode` on `<body>` (reskins the page and reorders sections: parents see *Clean & kind* first, kids see the games first). The nav chip switches any time.
- **Last bite** — ordinary cone fades vs. Fluffy cone that stays loud (the core problem/solution).
- **Cloud-soft snow** — shaved-ice crystals vs. fluffy cloud.
- **Squeeze it yourself** — hold a packet to fill the cone layer by layer.
- **Cloud Cards** — open a foil pack, rarity tiers (Common / Rare / Super / Ultra), 12-card collection book (saved in `localStorage`).
- **Wild flavors** — tap a flavor for its icon-only "what the fruit is known for" row.
- **Clean & kind** — slide the nasties away.
- **Care box** — pick 5 flavors + 1 mystery card, then reserve.
- **Join the Cloud Club** — waitlist form. Set `window.FA_CONFIG = { waitlistEndpoint: 'https://…' }` before `js/app.js` to POST sign-ups (JSON). Until then they're only stored in the visitor's browser.

All sounds are synthesised with Web Audio (no audio files); they start after the first tap and have a mute toggle. `prefers-reduced-motion` is respected.

## Before launch (not code)
- Wellness icons are about each fruit's reputation, not claims. Have counsel review any health wording and add the standard FDA disclaimer wherever structure/function claims appear.
- "Organic" needs USDA Organic certification (or equivalent) before it's used as a claim on the label or site.
- The form collects a **parent** email only; if kids can submit it, check COPPA rules.
- Art comes from the concept board in `assets/`. Swap in final cut-outs/mascot when available.
