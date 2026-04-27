# Upriver Consulting Website — UI Kit

Interactive click-thru recreation of `upriverhv.com` — the single product.

## Files

- `index.html` — the full interactive kit. React + Babel in-browser, one file. Hero, stat strip, services grid, honest-AI section, three-ways-to-start CTA, audit flow, contact form, venues page, how-it-works, footer. Active screen is persisted to `localStorage`.

Everything lives inside `index.html` for portability. If you want to split components out, each section is already named (`Navbar`, `Hero`, `StatStrip`, `ServicesGrid`, `HonestAI`, `ThreeWays`, `AuditScreen`, `ContactScreen`, `VenuesScreen`, `HowItWorksScreen`, `Footer`) and can be lifted into its own `.jsx` file.

## Screens covered

1. **Hero** — pinging "Accepting New Clients" badge, H1, dual CTA, proof chips
2. **Stat strip** — 25+ years / 2 years / 10+ hours
3. **Services grid** — 6 service cards with icon containers and chevron CTAs
4. **Honest AI** — 4 objection cards + quote block
5. **Three Ways to Start** — radio-card CTA pattern, selectable
6. **Audit** — 3-question flow with generated plan
7. **Contact** — full form with success state
8. **Venues** — headline + pricing grid with mono prices
9. **How It Works** — 01/02/03/04 process cards
10. **Footer** — 5-column sitemap + socials

## Departures from the real site

- **Hero background** is a CSS gradient. The real site uses a Mux HLS video.
- **Venue photography** shows structured cards instead of Cloudinary photos.
- **Navbar** is always in its "scrolled" state (95% bg + blur) for clarity.
- **Submit handler** on the contact form is a client-side mock.

## Tokens

All colors, type, spacing, shadows, and motion come from `../../colors_and_type.css`. No values are hardcoded per-component except in the rare inline style.
