---
name: upriver-design
description: Use this skill to generate well-branded interfaces and assets for Upriver Consulting (Joshua Brown), either for production or throwaway prototypes/mocks/etc. Contains essential design guidelines, colors, type, fonts, assets, and UI kit components for prototyping.
user-invocable: true
---

Read the README.md file within this skill, and explore the other available files.

If creating visual artifacts (slides, mocks, throwaway prototypes, etc), copy assets out and create static HTML files for the user to view. If working on production code, you can copy assets and read the rules here to become an expert in designing with this brand.

If the user invokes this skill without any other guidance, ask them what they want to build or design, ask some questions, and act as an expert designer who outputs HTML artifacts _or_ production code, depending on the need.

Quick orientation:
- `colors_and_type.css` — all tokens, import this in any artifact.
- `fonts/` — Degular Display (heading, 500 only). Pair with DM Sans (body) and JetBrains Mono (prices/code) via Google Fonts.
- `assets/icon.svg` — Upriver "A" chevron logomark.
- `ui_kits/website/index.html` — reference recreation of the site. Lift components from here.
- `preview/` — swatch/specimen cards; don't import these into artifacts.

Non-negotiable brand rules:
- No em dashes anywhere.
- No emoji.
- Headings use Degular Display 500 only (never bold, never semibold).
- Single accent color: `#F1551A`. Used for CTAs, prices, active, focus, icon strokes. Never as a body color.
- First-person, present-tense voice. Name real tools (HoneyBook, Claude, Mux, QuickBooks). No marketing clichés.
