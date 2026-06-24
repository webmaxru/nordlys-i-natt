# Product

## Register

product

## Users

People in Norway (locals and visitors) who want one thing: to know whether it's
worth heading out to see the northern lights **tonight, from where they are**.
They check on a phone, often at home before deciding to go out, or already
outdoors in the cold and dark — sometimes with gloves on, on a dim screen, on
patchy mobile data. They range from first-time aurora chasers who don't know what
"Kp" means to enthusiasts who do. The job to be done is a fast go/no-go decision,
not study: glance, trust the answer, act.

## Product Purpose

Nordlys i natt? answers a single question — "can I see the aurora tonight, here?"
— with a clear **GO / MAYBE / NO** (JA / KANSKJE / NEI) verdict. It fuses three
open data sources into that one call: aurora strength (NOAA SWPC Kp + OVATION
oval), cloud cover (MET Norway), and darkness (computed sun elevation). Around the
verdict it offers just enough supporting evidence — best hour, a 3-day timeline, an
aurora-oval map, a shareable result card, and optional push when conditions turn
good. Success is a user who, in a few seconds, trusts the verdict enough to either
go outside or stay in — and feels the app respected their time and their privacy.

## Brand Personality

Calm, trustworthy, and quietly delightful. Voice is plain-language and warm — a
knowledgeable friend, not a weather bureau or a hype machine. Three words:
**clear, honest, northern**. It can be playful in the small moments (the loading
lines like "Spør Kp-orakelet …") but never at the expense of the answer. The
emotional goal is confidence and a little anticipation — the feeling of being
let in on the sky's plans for the night.

## Anti-references

The user named no hard anti-references, so judgment applies. Avoid:

- **Cluttered, ad-heavy weather dashboards** that bury the answer under widgets,
  banners, and upsells. The verdict must never compete for attention.
- **"AI-slop" decoration** — gratuitous gradients, glowing/gradient text, fake
  metric dashboards, identical icon-cards. Personality comes from the verdict
  moment and the night-sky theme, not ornament.
- **Expert/scientific tools that lead with data** (raw Kp tables, charts first).
  Evidence supports the verdict; it never replaces it.
- **Childish or gimmicky** treatments that undercut trust. This is a tool people
  make a real outdoor decision on; delight stays subtle.

## Design Principles

1. **The verdict is the product.** Answer first, evidence second. A user should
   get the GO/MAYBE/NO in one glance before reading anything else.
2. **Earn trust by showing the why.** Surface the reasoning (Kp vs. required,
   cloud cover, darkness window) and cite the sources. Never a black box, never
   false confidence — "MAYBE" must read as honestly uncertain.
3. **Plain language over jargon.** A first-time chaser and an aurora nerd should
   both understand every screen. Explain terms in context; don't assume "Kp".
4. **Respect by default.** No cookies, no tracking, no dark patterns, no
   nagging. Permissions (location, notifications) are asked for with a clear,
   user-initiated reason and are easy to undo.
5. **Built for the field.** Readable outdoors at night on a cold, dim phone:
   high contrast, large tap targets, glare-resilient, and resilient to flaky
   networks (PWA, cached, offline-tolerant).

## Accessibility & Inclusion

Target **WCAG 2.2 AA**, with extra weight on the real usage context: outdoors, at
night, in cold weather, on phones. That means body text and the verdict comfortably
exceed AA contrast on the dark theme, tap targets stay ≥44px (already the ~2.75rem
baseline), focus is always visible, and nothing critical relies on color alone (the
GO/MAYBE/NO verdict carries a word, not just a hue). Honor
`prefers-reduced-motion` for every animation, keep the experience fully keyboard-
and screen-reader-navigable (Norwegian and English), and keep language simple
enough to lower cognitive load for a quick outdoor decision.
