---
name: Nordlys i natt?
description: A one-glance GO / MAYBE / NO verdict on whether you can see the aurora tonight, where you are.
colors:
  aurora-go: "#38d39f"
  aurora-maybe: "#f5c451"
  aurora-no: "#ef5f6b"
  sky-accent: "#6ea8fe"
  aurora-mint: "#84f7c8"
  night-base: "#0b1020"
  night-elevated: "#141a2e"
  night-deep: "#08101f"
  ink: "#e7ecf5"
  ink-muted: "#9aa6c0"
  border-hairline: "#ffffff1f"
  verdict-ink: "#06131a"
typography:
  display:
    fontFamily: "system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif"
    fontSize: "clamp(2.6rem, 8vw, 4.8rem)"
    fontWeight: 800
    lineHeight: 0.9
    letterSpacing: "-0.04em"
  verdict:
    fontFamily: "system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif"
    fontSize: "clamp(3rem, 18vw, 5.7rem)"
    fontWeight: 950
    lineHeight: 1
    letterSpacing: "-0.08em"
  headline:
    fontFamily: "system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif"
    fontSize: "clamp(1.7rem, 8vw, 3rem)"
    fontWeight: 800
    lineHeight: 1
    letterSpacing: "-0.04em"
  title:
    fontFamily: "system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif"
    fontSize: "1.3rem"
    fontWeight: 700
    lineHeight: 1.15
    letterSpacing: "-0.04em"
  body:
    fontFamily: "system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif"
    fontSize: "1rem"
    fontWeight: 400
    lineHeight: 1.45
    letterSpacing: "normal"
  label:
    fontFamily: "system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif"
    fontSize: "0.76rem"
    fontWeight: 800
    lineHeight: 1
    letterSpacing: "0.14em"
rounded:
  pill: "999px"
  lg: "1.5rem"
  md: "1rem"
  sm: "0.9rem"
spacing:
  xs: "0.35rem"
  sm: "0.75rem"
  md: "1rem"
  lg: "1.35rem"
components:
  button-primary:
    backgroundColor: "{colors.aurora-go}"
    textColor: "{colors.verdict-ink}"
    rounded: "{rounded.pill}"
    padding: "0 1rem"
    height: "2.75rem"
  button-primary-hover:
    backgroundColor: "{colors.sky-accent}"
    textColor: "{colors.verdict-ink}"
  button-secondary:
    backgroundColor: "{colors.night-elevated}"
    textColor: "{colors.ink}"
    rounded: "{rounded.pill}"
    padding: "0 1rem"
    height: "2.75rem"
  chip:
    backgroundColor: "{colors.night-elevated}"
    textColor: "{colors.ink}"
    rounded: "{rounded.pill}"
    padding: "0 0.85rem"
    height: "2.75rem"
  panel:
    backgroundColor: "{colors.night-elevated}"
    textColor: "{colors.ink}"
    rounded: "{rounded.lg}"
    padding: "1rem"
  input-search:
    backgroundColor: "{colors.night-deep}"
    textColor: "{colors.ink}"
    rounded: "{rounded.md}"
    padding: "0 1rem"
    height: "2.75rem"
  gauge-badge:
    backgroundColor: "{colors.night-elevated}"
    textColor: "{colors.aurora-go}"
    typography: "{typography.verdict}"
    rounded: "{rounded.pill}"
    size: "min(100%, 13rem)"
  notify-cta:
    backgroundColor: "{colors.night-elevated}"
    textColor: "{colors.ink}"
    rounded: "{rounded.md}"
    padding: "0.6rem 0.7rem"
---

# Design System: Nordlys i natt?

## 1. Overview

**Creative North Star: "The Night-Sky Oracle"**

The interface behaves like a calm, knowing oracle of the night sky: it does the
hard reading — solar wind, Kp, cloud, darkness — and hands back a single, confident
verdict. The whole surface is the deep blue-black of a clear Arctic night, and from
that darkness one luminous answer rises: **GO / MAYBE / NO** (JA / KANSKJE / NEI),
glowing in its own aurora color. Everything else is supporting evidence, dimmer and
quieter, arranged so the eye lands on the verdict first and only then drifts to the
"why."

Density is low and the rhythm is unhurried. Panels are soft-cornered, glassy slabs
that float over the night gradient on big diffuse shadows; the one bright moment is
the verdict gauge, ringed and back-lit in green, amber, or coral. Personality lives
in small, earned places — the playful loading lines ("Spør Kp-orakelet …"), the
gentle aurora wash behind the header — never in ornament for its own sake. The voice
is **clear, honest, northern**: a knowledgeable friend, not a weather bureau and not
a hype machine.

This system explicitly rejects the cluttered, ad-heavy weather dashboard (the verdict
must never compete with widgets), "AI-slop" decoration (gratuitous gradients, glowing
gradient text, fake metric tiles, identical icon-cards), and the expert tool that
leads with raw data tables. Evidence supports the verdict; it never replaces it.
"MAYBE" must read as honestly uncertain, never as false confidence.

**Key Characteristics:**
- Dark-only, single-theme: a deep navy night sky (`#0b1020`) is the canvas, always.
- One luminous focal point per screen — the verdict gauge — in a semantic aurora color.
- Glassy, soft-cornered floating panels (1.5rem radius, big diffuse shadow, backdrop blur).
- Plain-language, warm, lightly playful voice; delight only in small moments.
- Built for the field: high contrast, ≥44px targets, glare-resilient, reduced-motion aware.

## 2. Colors

A deep Arctic-night palette where neutrals are blue-black and the only saturated color
is the verdict itself — green for go, amber for maybe, coral for no — with a single cool
blue accent for wayfinding.

### Primary
- **Aurora Go Green** (`#38d39f`): The GO verdict. Used for the gauge ring/letter when
  conditions are good, the primary-action gradient's leading stop, and "good" markers on
  the timeline and map. This is the color the whole product is built to earn.

### Secondary
- **Aurora Maybe Amber** (`#f5c451`): The MAYBE verdict — honest uncertainty. Gauge and
  timeline accents when conditions are borderline. Never used decoratively.
- **Aurora No Coral** (`#ef5f6b`): The NO verdict and error/destructive text. Reserved for
  "not tonight" and genuine failure states; carries meaning, never mood.

### Tertiary
- **Sky Accent Blue** (`#6ea8fe`): Wayfinding, not verdict. Links, focus rings, input
  focus glow, current selection, the header's aurora wash, and the eyebrow label. The
  one neutral-ish brand hue that isn't a verdict.
- **Aurora Mint** (`#84f7c8`): A single highlight stop in the share-card and share-button
  gradients only. Not a UI color.

### Neutral
- **Night Base** (`#0b1020`): The body background and `theme-color`. The deepest, most
  common surface — the night itself.
- **Night Deep** (`#08101f`): The darkest layer — map canvas, input wells, the bottom of
  the body gradient, the share card's base.
- **Night Elevated** (`#141a2e`): Every floating panel, card, search dropdown, and
  language toggle. The "lifted out of the dark" surface.
- **Ink** (`#e7ecf5`): Primary text and the verdict word's high-contrast default.
- **Ink Muted** (`#9aa6c0`): Secondary/helper text, captions, attribution. Must still
  clear AA (4.5:1) on the night surfaces — verify, don't assume.
- **Hairline** (`rgba(255,255,255,0.12)` / `#ffffff1f`): The only border. A 1px white
  translucency that defines panel and control edges against the dark.
- **Verdict Ink** (`#06131a`): Near-black text used *on* the bright go/accent gradients
  (primary button, share button) where dark-on-light is required for contrast.

### Named Rules
**The One Bright Thing Rule.** On any given screen, exactly one element is allowed to glow
at full aurora saturation: the verdict gauge. Everything else stays in the blue-black
neutral range or uses the muted accent. If two things are competing to be the brightest,
one is wrong.

**The Color-Means-State Rule.** Green, amber, and coral are *semantic*, never decorative.
A green chip means "go," not "this is a nice green chip." Never paint an inactive or
neutral element in a verdict color.

## 3. Typography

**Display Font:** system-ui (with -apple-system, 'Segoe UI', Roboto, sans-serif fallbacks)
**Body Font:** system-ui (same stack)
**Label Font:** system-ui (same stack)

**Character:** One native system sans across the whole product — fast to load, familiar
on every device, and invisible by design. Personality comes from weight and size, not
from a typeface: near-black display weights and tight negative tracking give the headings
and the verdict their confident, compressed presence.

### Hierarchy
- **Verdict** (950, `clamp(3rem, 18vw, 5.7rem)`, line-height 1, tracking -0.08em): The
  GO/MAYBE/NO word inside the gauge badge. The single largest, heaviest element on screen —
  the product's whole reason for being.
- **Display** (800, `clamp(2.6rem, 8vw, 4.8rem)`, line-height 0.9, tracking -0.04em): The
  app title "Nordlys i natt?" in the header (desktop scale; truncates to ~2.1rem on mobile).
- **Headline** (800, `clamp(1.7rem, 8vw, 3rem)`, line-height 1, tracking -0.04em): The
  verdict's plain-language subtitle beside the gauge ("Gode sjanser i natt").
- **Title** (700, `1.3rem`, line-height 1.15, tracking -0.04em): Section headings
  (Timeline, Map, location). Fixed rem, not fluid — these live in a steady layout.
- **Body** (400, `1rem`–`1.05rem`, line-height 1.45): Reasons, helper text, descriptions.
  Cap prose at 65–75ch; the 760px shell already holds this.
- **Label** (800, `0.76rem`, tracking 0.14em, UPPERCASE): The accent-colored eyebrow and
  small section kickers. Used sparingly, not above every section.

### Named Rules
**The System-Font Rule.** No web-font download, ever. The stack is `system-ui` first. A
go/no-go tool must paint its verdict instantly on a cold phone over flaky data; a font
swap that delays or shifts the answer is forbidden.

**The Weight-Not-Face Rule.** Hierarchy is built from weight (400 → 800 → 950) and tracking,
not from adding typefaces. Never introduce a second family for "display flavor."

## 4. Elevation

The system is layered, not flat: panels read as glassy slabs lifted out of the night. Depth
is conveyed three ways at once — a large, very soft drop shadow; a 1px white hairline border;
and an 18px `backdrop-filter` blur that lets the body's aurora gradient bleed faintly through.
The effect is "floating over deep water at night," not "card on a page." Shadows here are
ambient atmosphere, not structural separation.

### Shadow Vocabulary
- **Panel Float** (`box-shadow: 0 24px 80px rgba(0,0,0,0.35)`): The default for every panel,
  card, and footer. A deep, diffuse pool that seats the slab in the dark.
- **Popover Lift** (`box-shadow: 0 18px 50px rgba(0,0,0,0.55)`): Search-results dropdown and
  other transient overlays — darker and tighter so they sit clearly above the panel below.
- **Gauge Glow** (`filter: blur(30px)` on a verdict-tinted disc): Not a box-shadow but a
  blurred color bloom behind the gauge, in the live verdict color. The product's one piece
  of intentional light.

### Named Rules
**The Glass-Slab Rule.** A panel is always the trio together: `#141a2e` elevated surface +
1px `rgba(255,255,255,0.12)` hairline + `0 24px 80px rgba(0,0,0,0.35)` shadow + 18px blur.
Don't ship a panel missing one leg of that — a borderless or shadowless panel dissolves into
the night.

## 5. Components

### Buttons
- **Shape:** Full pill (`999px`), min-height `2.75rem` (44px tap target).
- **Primary:** A confident aurora gradient — `linear-gradient(135deg, #38d39f, #6ea8fe)` —
  with near-black **Verdict Ink** (`#06131a`) text at weight 900. The one place go-green and
  accent-blue blend; reserved for the single most important action on a surface.
- **Hover / Focus:** Lifts `translateY(-1px)` and brightens its hairline over 160ms ease;
  `:focus-visible` shows a 2px accent outline at 3px offset. `:active` returns to rest.
- **Secondary / Chip:** `rgba(255,255,255,0.06)` fill on the night, 1px hairline, **Ink**
  text at weight 800. Same pill, same height. Chips scroll horizontally on mobile, wrap on
  desktop; the selected state flips to a solid fill.

### Chips
- **Style:** Pill, translucent white fill, hairline border, Ink text. Quick-pick locations.
- **State:** Hover lifts and brightens the border; pressed/selected reads as a solid swap.
  Filter chips and action chips share one vocabulary — don't invent a second chip shape.

### Cards / Containers (Panels)
- **Corner Style:** `1.5rem` (24px) — generously soft.
- **Background:** `linear-gradient(145deg, rgba(20,26,46,0.88), rgba(14,19,35,0.86))` over
  the night, i.e. translucent **Night Elevated**.
- **Shadow Strategy:** Panel Float (see Elevation) + 18px backdrop blur.
- **Border:** 1px **Hairline**. Always present.
- **Internal Padding:** `1rem` mobile, `1.35rem` ≥680px.
- **Nesting:** Never nest a panel inside a panel. Sub-content uses a flat tonal well
  (`rgba(255,255,255,0.05)`), not a second card.

### Inputs / Fields
- **Style:** Dark well (`rgba(5,9,18,0.65)` over **Night Deep**), 1px hairline, `1rem` radius,
  `2.75rem` min-height.
- **Focus:** Border shifts to **Sky Accent** and a soft `0 0 0 3px rgba(110,168,254,0.18)` glow
  appears — a calm focus ring, no movement.
- **Error:** Helper text turns **Aurora No Coral** (`#ef5f6b`); the field keeps its shape.

### Navigation
- **Style:** Minimal. A pill **language toggle** (NB / EN) top-right is the only persistent nav;
  active language inverts to **Ink** fill with **Night Base** text. No top bar, no side nav —
  the app is one scrolling column in a 760px shell.

### Verdict Gauge (Signature Component)
The product's hero. A circular badge — `min(100%, 13rem)`, `aspect-ratio: 1`, a `0.35rem` ring
in the live verdict color — holding the GO/MAYBE/NO word at weight 950. Behind it, a blurred
verdict-tinted bloom (`Gauge Glow`). The whole panel's border and corner glow shift to the
verdict color via `--verdict-color`, so the gauge subtly tints its container. On mobile it
stacks above the reasoning; at ≥680px it sits in a `13rem 1fr` two-column row. Loading uses a
shimmer **skeleton** of the same badge shape, never a spinner.

### States
Every interactive element ships default / hover / focus-visible / active / disabled (`opacity
0.6`, `not-allowed`). Async surfaces (gauge, share, map) use skeletons or inline status text,
plus explicit empty ("Velg et sted …") and error ("Vi klarte ikke …" + retry) states.

## 6. Do's and Don'ts

### Do:
- **Do** keep the verdict the brightest, largest thing on screen — answer first, evidence second.
- **Do** use green/amber/coral only to mean go/maybe/no. Pair color with the *word* (JA/KANSKJE/
  NEI) so the verdict never relies on hue alone (color-blind + outdoor glare safe).
- **Do** build every panel as the full glass slab: `#141a2e` + 1px `rgba(255,255,255,0.12)` +
  `0 24px 80px rgba(0,0,0,0.35)` + 18px blur.
- **Do** keep body and muted text at AA on the dark surfaces — `#9aa6c0` is the floor; bump toward
  `#e7ecf5` if a context dips below 4.5:1.
- **Do** keep tap targets ≥`2.75rem` and honor `prefers-reduced-motion` on every animation.
- **Do** let personality live in copy (loading lines, plain-language reasons), not in decoration.

### Don't:
- **Don't** build a cluttered, ad-heavy weather dashboard where widgets compete with the verdict.
- **Don't** add "AI-slop" decoration: gratuitous gradients, **gradient text** (`background-clip:
  text`), fake metric tiles, or identical icon-card grids.
- **Don't** lead with raw data (Kp tables, charts) — evidence supports the verdict, never replaces it.
- **Don't** make "MAYBE" look confident; uncertainty must read as honest, not as a softer "yes."
- **Don't** introduce a second typeface or any web-font download; weight and tracking carry hierarchy.
- **Don't** nest cards, and don't add a colored `border-left` stripe as a generic accent. The single
  accent left-edge on the notify CTA is a deliberate, contained exception — don't spread it to other
  cards.
- **Don't** paint inactive or neutral elements in a verdict color.
