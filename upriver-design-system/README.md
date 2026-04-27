# Upriver Consulting — Design System

Brand and UI kit for **Upriver Consulting** (aka Joshua Brown Consulting) — a Hudson Valley, NY consulting practice that pairs hands-on AI systems with in-house video and photo production for small businesses.

Public site: `upriverhv.com`
Tagline in use: *"The Photographer Who Builds Your AI Systems"*

---

## Context

Joshua Brown is a 25-year Hudson Valley small business owner, working photographer/filmmaker, and former Apple Creative. The consulting practice sits at the intersection of:

- **AI systems & automation** — custom, locally-runnable or Claude-powered tooling for inquiry response, review response, AI search visibility, and admin work. Built, trained, and shipped by Joshua personally.
- **Content production** — business intro videos, half-day content sessions, brand documentaries, and monthly content partnerships.
- **Small-business consulting** — audits, discovery calls, pricing menus, process work.

There is **one product** — the marketing website (`upriverhv.com`) — with **two audience surfaces**:

| Surface | Routes | Purpose |
|---|---|---|
| **General** | `/`, `/services`, `/how-it-works`, `/learn`, `/faq`, `/audit`, `/contact`, `/team` | Any small business (solopreneurs, trades, hospitality, real-estate, nonprofits, education, creative) |
| **Venues** | `/venues`, `/venues/services`, `/venues/demos` | Wedding-venue-specific landing, pricing, and AI demos |

There's also a PIN-protected admin dashboard at `/admin` for reading contact form submissions. Not in scope for the public-facing design system, but the same tokens apply.

### Source materials

- **Codebase** — `lifeupriver/upriver-consulting` on GitHub (Next.js 16 + Tailwind v4, TypeScript, framer-motion). Read on demand; not imported in bulk.
- **Design-system call-outs** — `replit.md` in that repo documents heading hierarchy, card patterns, pill badges, arrow affordances, and the accent hue.
- **Fonts uploaded by the user** — `uploads/DegularDisplay-Medium.woff` / `.woff2` (heading font, 500 weight only).
- **No Figma** was supplied. Tokens below are pulled directly from `src/app/globals.css` and `src/lib/fonts.ts` in the repo.

---

## Content fundamentals

Voice is **direct, personal, slightly skeptical, no marketing speak.** The site reads like one person wrote it — because one person did.

**Person & tense.** First person, present tense. "I read every message myself." "I'm a solopreneur myself." Use *you* for the reader, never *we* except when explicitly covering Joshua + a small bench of collaborators.

**Casing.** Sentence case in body. Uppercase is reserved for:
- Section markers (the H2 eyebrow)
- Button labels
- Pill badges
- Nav links
- Table headers
Never ALL CAPS in prose for emphasis.

**Punctuation & quirks.**
- **No em dashes anywhere.** (Site-wide rule. Use a period or a comma.)
- Apostrophes in JSX use `&apos;`, not curly quotes.
- `$500`, `$2,000`, `$2,000/mo` — plain USD, no "starting at".
- Always "from $X" when a price has a floor.

**Banned / avoided words.** Marketing clichés: *stunning, magical, special day, transform, elevate, unlock, seamlessly, robust, synergy*. Joshua calls this out explicitly for wedding copy (never *stunning, magical, special day*).

**Specificity wins.** Name real tools, never generic ones: HoneyBook, OpenTable, MLS, Zillow, QuickBooks, NAEYC, Cloudinary, Mux, Claude — not "your CRM." Name the Hudson Valley specifically when it helps.

**Trade-offs are acknowledged.** "Slower than Claude, but for a lot of tasks more than enough." The tone is a skilled operator being honest, not a salesperson hedging.

**Emoji.** None. Not in UI, not in prose.

**Example voice samples (from `HomePageClient.tsx`):**

> "AI has real problems. The output is often slop that makes businesses look unprofessional. The energy usage is real. And it's going to reshape the job market in ways we're not ready for."

> "Worried about AI slop? Same. That's the whole reason I build custom systems instead of handing you a generic ChatGPT login."

> "Every other AI consultant wants six-figure retainers from enterprise clients. I'm a solopreneur myself."

The headline style is a **noun phrase, title-case, plainspoken**: "The Photographer Who Builds Your AI Systems." "A Combination That's Hard to Find." "An Honest Take on AI." "Three Ways to Start."

Body paragraphs are **2-4 sentences, left-aligned, generous leading (1.7).** No bullet-point soup.

---

## Visual foundations

### Palette

The site is **warm dark** — not cool dark. Every neutral has a brown/ochre undertone. The single accent is a warm orange (`#F1551A`) that reads as ember, brick, Hudson Valley fall.

| Token | Hex | Role |
|---|---|---|
| `--bg-primary` | `#1A1412` | Page background |
| `--bg-primary-deep` | `#0a0807` | Stat strip, shadow wells |
| `--bg-surface` | `#271E18` | Cards, form fields |
| `--bg-surface-hover` | `#2E241D` | Card hover |
| `--border` | `#443828` | Hairline border, default |
| `--border-input` | `#4D4038` | Heavier input border |
| `--text-heading` | `#F1EAE4` | Warm off-white |
| `--text-body` | `#BFB5AA` | Warm grey |
| `--text-muted` | `#9A8E83` | Labels, meta |
| `--accent` | `#F1551A` | Single accent — CTA, hover title, icons |
| `--accent-hover` | `#FF6B35` | Button gradient top |
| `--accent-shadow` | `#9e2b03` | Pressed-button drop shadow base |
| `--success` | `#4A9B6E` | Confirmation only (form success) |

The accent is used **sparingly**. It's the only color change in the whole palette — everything else is a brown. Primary buttons, active nav, hover titles, icon strokes, price figures, focus rings. That's it.

### Type

- **Heading** — Degular Display, 500 only. Never `font-semibold`, never `font-bold`. The repo enforces this.
- **Body** — DM Sans, 400/500/600.
- **Mono** — JetBrains Mono, 400. Used for prices (`$500`, `$2,000/mo`) and code.

**Hierarchy.**
- H1 — 2.75rem → 4.75rem, title case, tight tracking (`-0.025em`), line-height 1.0.
- H2 — 1.125rem → 1.25rem, **UPPERCASE**, wide tracking (`0.12em`). A section marker, not a big title.
- H3 — 1.375rem → 1.5rem, normal case, slight negative tracking (`-0.01em`).
- Body — 1.125rem (18px), leading 1.7.

### Spacing & layout

- Max container width: **1200px**, 24px gutter (`px-6`).
- Vertical section rhythm: **80-128px** (`py-20 md:py-32`).
- Card padding: **32-64px** (`p-8 md:p-10`, hero quote blocks `p-10 md:p-16`).
- Grid gaps: 24-32px for cards, 32-48px for hero content.

### Corner radii

- `0.25rem` — tiny: form fields (`rounded`).
- `0.5rem` — buttons, pill badges (`rounded-lg`, `rounded-md`).
- `0.75rem` — cards, tables (`rounded-xl`).
- `1rem` — hero quote blocks, big statement cards (`rounded-2xl`).
- `9999px` — hero pill, status dot, round icon containers.

The system mixes two card profiles: `rounded-xl` on dense grids (services, demos), `rounded-2xl` on marquee blocks (the "Who I Am" block, the AI cards grid). Pick by weight, not by whim.

### Borders & surfaces

- Every card has a `1px solid var(--border)` by default.
- Hover → border goes to `var(--accent)` (full) or `var(--accent)` at 40-60% opacity on lighter cards.
- Quote blocks use a **4px left border** in accent, rounded only on the right (`rounded-r-xl`).
- Dividers between sections: `border-t border-border/50` (so dividers read softer than card borders).

### Shadows

Two shadow families:

1. **Card-hover glow** — `0 10px 30px rgba(241,85,26,0.12)`. Orange-tinted. Fires on hover only. Never resting.
2. **Chunky button drop** — primary buttons sit on a **hard-edged 4px drop** (`0 4px 0 #9e2b03`) plus a soft accent glow. Pressing collapses the hard drop and translates the button down 4px. This is the most distinctive interactive flourish in the system.

Cards at rest have **no shadow**. The whole UI is matte and dark; shadow is earned, not ambient.

### Motion

- Library: **framer-motion**.
- Section reveals: `opacity 0→1, y 24→0, duration 0.5s, easeOut, once: true, margin: -40px`. Every major section uses `SectionReveal` with small `delay` offsets (0.05, 0.1, 0.15) to cascade.
- Durations: `150ms` for buttons (`duration-150`), `200ms` for cards (`duration-200`), `300ms` for hover reveals (`duration-300`).
- Card hover: `-translate-y-1` (4px lift) + border+glow.
- Title hover (inside a `group`): `text-heading → text-accent`.
- Chevron affordance: `group-hover:translate-x-1` on the right-pointing chevron inside a card.
- Icon containers on service cards: `group-hover:scale-110 group-hover:rotate-3` — playful, not hyperactive.
- **No bounces, no springs.** Everything is `easeOut` or Tailwind's default.

### Backgrounds

- The hero uses a **Mux HLS video background** (no still-image backup surfaced in CSS — the `HeroVideo` component handles it).
- Ambient **accent glows**: a `w-96 h-96` orange blob at `opacity-0.03-0.05`, blurred `blur-3xl`, offset off-screen. Applied to hero corners and inside marquee quote blocks.
- Soft vertical gradient strips between sections: `bg-gradient-to-b from-bg-primary via-[#1d1714] to-bg-primary`.
- No repeating patterns. No textures. No hand-drawn illustrations.
- **Imagery** — for wedding/venue pages, Cloudinary-hosted editorial photos at `joshua-brown-photography`, shown full-viewport-width with a dark gradient overlay and caption. Warm, naturally-lit, film-leaning. Never neon, never cool-graded.

### Blur & transparency

Used surgically:
- Nav on scroll: `rgba(26,20,18,0.95)` + `backdrop-filter: blur(4px)`.
- Ambient accent glows: `blur-3xl` on a transparent accent swatch.
- Nothing else. No frosted cards, no translucent menus.

### Protection gradients

The hero's bottom edge has a 1px accent gradient line: `bg-gradient-to-r from-transparent via-accent/40 to-transparent`. That's the one decorative line in the system — a hairline that "closes" the hero.

### Component states

- **Hover** on cards: border → accent, surface → `bg-surface-hover`, `translateY(-4px)`, accent glow shadow.
- **Hover** on links: body → heading, or heading → accent (depends on context).
- **Hover** on primary button: gradient brightens (`#ff7a47 → accent`), glow intensifies.
- **Active / pressed** on primary button: the 4px hard drop collapses, button `translateY(4px)`. Feels like a real key press.
- **Focus-visible** everywhere: `outline: 2px solid var(--accent); outline-offset: 2px`.
- **Active nav**: `text-accent`.
- **Disabled** (send button mid-submit): `opacity-60 pointer-events-none`.

### Fixed / sticky elements

- Navbar is fixed. Transparent until scrolled 40px, then gets the blurred dark backdrop and a border.
- Mobile nav is a **full-screen overlay**, centered, large uppercase links.

---

## Iconography

All icons in the codebase are **hand-inlined SVG strokes, 24×24 viewBox, stroke-width 2-2.5, stroke-linecap round, stroke-linejoin round.** There is no icon-font dependency and no external icon library.

The stylistic match is essentially **Lucide** / **Feather** — minimalist, two-stroke, consistent weight. Specific icons repeatedly used in the repo:

- Right-arrow CTA: `<path d="M5 12h14" /><path d="m12 5 7 7-7 7" />`
- Chevron-right affordance: `<path d="m9 18 6-6-6-6" />`
- Check (in verify/status): `<polyline points="20 6 9 17 4 12" />`
- Verified check (in feature lists): `<path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" /><polyline points="22 4 12 14.01 9 11.01" />`
- Hamburger: three `<line>` elements.
- Instagram + YouTube in the footer.

**Substitution note.** For this design system, icons are served via the **Lucide CDN** where possible (`lucide@latest`) because Lucide matches the repo's stroke/round/join conventions exactly. When a specific path is copied verbatim from the repo, it is inlined directly in the card or component. There is no difference visually.

**Brand mark.** The `icon.svg` favicon (see `assets/icon.svg`) is a stylized "A" chevron — two orange strokes (`#F1551A`) on the dark brown background (`#1A1412`), sharp linecaps and linejoins. It's the only piece of bespoke iconography.

**Emoji.** Never.
**Unicode symbols.** Only the standard `©`, `·`, and `&apos;`.

---

## Index

Root of this design system:

```
README.md                   — this file
SKILL.md                    — Agent Skills entrypoint
colors_and_type.css         — token + typography stylesheet (import in any artifact)
fonts/
  DegularDisplay-Medium.woff
  DegularDisplay-Medium.woff2
assets/
  icon.svg                  — Upriver "A" chevron favicon
preview/                    — small HTML cards that power the Design System tab
ui_kits/
  website/
    index.html              — interactive click-thru of upriverhv.com
    README.md
    Navbar.jsx
    Footer.jsx
    Hero.jsx
    ServiceCard.jsx
    StatStrip.jsx
    QuoteBlock.jsx
    Button.jsx
    Pill.jsx
    ContactForm.jsx
```

There is one product — the marketing website — so there is one UI kit (`ui_kits/website/`). No separate slide template was supplied, so `slides/` is intentionally absent.

---

## Caveats

- **No Figma access.** Everything is derived from the Next.js source. Anything labeled visual foundation here was read off of `globals.css`, `replit.md`, or individual component files — nothing was invented.
- **Fonts.** Degular Display is shipped via the user-uploaded WOFF/WOFF2 (500 weight only). DM Sans and JetBrains Mono come from Google Fonts as in the repo. **If you have Degular Display Regular / Bold, please share them** — the repo deliberately locks to 500, so this design system mirrors that, but if the locked weight ever changes we'll need the additional files.
- **Hero video** in the real site is a Mux HLS stream. The UI kit here uses a static gradient placeholder so the kit works offline.
- **Cloudinary venue imagery** is referenced in the repo but not copied into this design system — the photos are under the `joshua-brown-photography` Cloudinary account. The kit uses tasteful placeholder blocks where photos would sit.
