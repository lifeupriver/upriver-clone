# Website Workflow Playbook: existing-site clients

Date: 2026-06-05. The operational workflow for stages 8–9's website leg, for clients who already have a site. Companion to `specs/10-website-bridge-spec.md` (the code that supports this) and the doc-10 §9 scope fork. This is the "new-site build playbook" follow-up that spec named.

## The principle: content is the invariant, design is the variable

Both paths share one trunk, and the fork happens late — after the client has seen the audit, never before. The trunk extracts everything that survives any redesign: the content inventory (every page's copy, structure, assets — `clients/<slug>/pages/` from the scrape), the audit findings, and the profile's verified facts. Where the profile has HV-verified facts (capacity, hours, pricing visibility, offerings), they OVERRIDE scraped page copy in any rebuild — old sites are routinely wrong; the spine is the truth.

## Shared trunk (every existing-site client)

1. `scrape` — full crawl: pages, raw HTML, desktop+mobile screenshots.
2. `audit` + `synthesize` — the deep dive; audit-package.json.
3. Profile filled per the intake pipeline (recon → transcript → gap-fill → verify).
4. The fork conversation: present the audit; client + Joshua choose `goals.engagementScope.websiteScope` (A iterative fixes / B keep-the-feel rebuild / C full redesign... mapped below). **HV field — Joshua verifies; no website deliverable generates before it.**

## Path 1 — platform conversion ("love it, don't change anything")

The pitch: nothing visible changes; ownership and editability change. Their site stops being trapped in Square/Wix/Showit and becomes a repo Claude can edit in natural language.

1. `scaffold` → `clone` — pixel-faithful Astro rebuild, page by page. Pixelmatch fidelity scores per page are the proof artifact.
2. Profile-fact pass (spec 10): verified facts replace any stale scraped copy; each replacement listed for client review (it is a visible change — flag it, don't sneak it).
3. **Client review gate:** side-by-side old vs clone. The demo is "spot the difference."
4. Repo created in the CLIENT'S GitHub org (their property — I07 governance); Vercel preview on their account.
5. **The closing demo:** one natural-language edit ("change Saturday hours to 9–2") via Claude → preview updates. This demo IS the product.
6. DNS cutover when the client says go (client-clicked or client-watched — human gate).

Everything here exists today; spec 10 adds the profile-fact pass.

## Path 2 — keep the feel, improve everything

Five stages, two hard client gates. Claude Design (claude.ai/design, Anthropic Labs) is an ORGANIZATION-LEVEL design system: assets in → extracted UI kit (palette, typography, components, layout patterns) → Remix to refine → test projects to validate → Published, after which every project in that org uses it. The CLI prepares its inputs and consumes its outputs; the operator drives the sessions. Reference: support.claude.com article 14604397.

1. **Clone first, even on this path.** Run `scaffold` + `clone` to get the existing site as an Astro repo BEFORE any design work. Claude Design accepts codebases as a source and extracts far more faithfully from components and styles than from screenshots — the clone repo is the highest-fidelity input we can hand it. (It also de-risks the engagement: if path 2 stalls at the approval gate, path 1 is already done.)
2. **Set up the design system in the CLIENT'S Claude Design org.** The client is on Team per I07; the design system lives in THEIR org — their property, like everything else we provision. Operator flow: switch to the client org in Claude Design → upload the clone repo + screenshots + brand assets + the CLI's current-state design-system doc (spec 10 §C — it doubles as the upload manifest and the before-state record) → review the extracted system.
3. **Remix to evolve, not replace.** Use Remix with the audit's design findings + doc-01 voice attributes as the brief: same personality, better execution — type scale corrected, contrast fixed, spacing systematized, mobile rebuilt, conversion elements per the audit. Then validate with TEST PROJECTS: "create the Little Friends homepage", "create the programs page" — these generated pages ARE the client-approval artifacts. Clients cannot approve abstract tokens; they approve their own homepage looking better next to the old one.
4. **Client approval gate — the design system.** Old site vs Claude Design test pages, side by side, plus the system summary. Brand decision; hard human gate. Iterate Remix until approved, THEN flip Published — publishing is the approval's technical expression. Reconcile the approved system back into `tokens.json` (operator step; spec 10's bridge consumes it).
5. **Content-faithful rebuild.** Approved tokens.json → `scaffold`; Claude Code builds each page from the content inventory + profile facts, styled ONLY by the new system — same words (profile-corrected), same page set (minus pages the audit killed, plus pages the web-PRD adds), new presentation, with the Claude Design test pages as the visual reference. Per-page Continue gates; `improve` handles polish. Then the Path-1 tail: review → their repo → Vercel → demo → DNS gate.

**The lasting-value kicker:** the Published design system outlives the website project. Every deck, landing page, or artifact the client ever makes in their Claude org comes out on-brand automatically. That makes design-system setup a provisioning artifact in its own right (candidate: extend I09 or add an I-series entry — "Client Claude Design system"), and a concrete retainer/ownership selling point.

## Path 3 — reimagine from references ("make it feel like these sites I love")

The client rejects their current look entirely and brings aspirations: screenshots or URLs of other sites they admire. Same trunk, same content invariant — what flips is the design SOURCE: Claude Design extracts from the references, not from their site. Their content, facts, and voice stay the anchor that makes the result theirs.

1. **Capture the references properly.** During intake (deep-dive session or chatbot), collect 3–5 reference sites WITH the why per site — "what specifically do you love about this one" (the type? the whitespace? how the photos breathe?). The why is the design brief; URLs alone are not. The profile already holds reference URLs (`auditDecisions.referenceSites`, migrated from the legacy intake); the per-site "why" notes are a small schema follow-up. Then scrape the references with Firecrawl for clean full-page desktop+mobile captures — client phone screenshots are poor extraction inputs.
2. **Extract the aspirational system in the client's Claude Design org.** Upload: the reference captures, the client's OWN brand anchors (logo, photography, any colors that must survive), and doc-01 voice attributes. The Remix brief is SYNTHESIZE, not copy: blend what the references share (the qualities named in the whys) into an original system anchored by the client's brand assets and voice. **Hard rule: never reproduce one reference's design — especially a competitor's.** Three-plus references blended plus their own brand anchors produces something original; one reference cloned produces a knockoff and a liability. If the client brings exactly one beloved reference, the operator's job is to extract its QUALITIES (scale, density, warmth) and name them in the brief, not to imitate it.
3. **IA is reimagined too.** Unlike Path 2, the old sitemap is explicitly not the template: the web-PRD (spec 10 §A) drives the page set from the profile (offerings, audiences, conversion path, SEO targets), with the old site only consulted for content salvage. This path leans hardest on doc-web-prd of the three.
4. **Same gates, same tail.** Test projects in Claude Design (their homepage, a core inner page, rendered in the new system with their real content) are the approval artifacts; client approves → Publish → tokens.json → scaffold → content-faithful build against the web-PRD's page set → review → their repo → Vercel → DNS gate.

Difference in one line each: Path 1 changes the platform, not the look. Path 2 evolves their look. Path 3 replaces their look with a synthesis of what they aspire to, anchored by their content and brand.

**Schema follow-ups this path surfaces:** (a) reference sites with per-site why-notes deserve a proper home (likely `content` or a `designPreferences` slot) and a chatbot/session question; (b) `goals.engagementScope.websiteScope` is currently `A|B|C` — extend or document the mapping so all four real outcomes are named (iterative fixes / platform conversion / keep-the-feel / reimagine).

## Where each piece lives

| Step | Status |
|---|---|
| scrape/audit/synthesize/scaffold/clone/improve/finalize | Built (legacy pipeline) |
| Profile-fact override in clone; websiteScope HV gate; --web scope | Spec 10 (written, build pending) |
| Current-state design-system doc + tokens.json | Spec 10 §C (doc doubles as the Claude Design upload manifest + before-state record) |
| Claude Design org setup / extract / Remix / test projects / Publish | Operator runbook steps in the client's Claude Design org (emitted as [OPERATOR ACTION] in the design-system doc); approved system reconciled back into tokens.json |
| Client Claude Design system as a provisioning artifact | Follow-up: extend I09 or add an I-series entry — published org design system is part of the handed-off operating system |
| Content-faithful rebuild playbook prompt for Claude Code | Follow-up: a reusable build prompt template, written after the first real Path-2 client |
| web-PRD (page set, conversion elements, SEO requirements) | Spec 10 §A — feeds both paths' page decisions |

## Gates summary (stays human)

Path choice (HV websiteScope) → design-system approval (Path 2, brand) → per-page review during rebuild → repo ownership in client's org → DNS cutover. The machine prepares everything around these moments; it never crosses them.
