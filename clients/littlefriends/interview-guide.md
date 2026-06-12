# Becca Raisley — Little Friends Learning Loft: In-Person Interview Guide

**Engagement:** Upriver intake — the recorded knowledge-extraction session that fills the Client Profile and unblocks the 18-document AI Operating System set.
**Interviewer:** Joshua
**Format:** In person, recorded (get verbal consent on tape). Plan 90–120 minutes; mornings, before pickup gets crazy.
**Post-session:** transcript → `upriver profile extract-transcript littlefriends <file>` → gap-fill → HV verification.

---

## ⚠️ Read this first — why this interview is different

Everything currently in `clients/littlefriends/` (the profile, the seven generated docs, the corpus) is **synthetic test-fixture data** invented to exercise the pipeline. None of it is verified fact. That means:

1. **Do not trust anything you think you already know about the school.** The "facts" (52 enrolled, $1,180 tuition, 13 staff, Miss Dana/Carla/Tova, even the spelling "Rebecca") were invented for the test corpus. Re-ask everything, even the basics that feel settled.
2. **This is the real fill.** Every answer becomes profile data with `source: transcript` provenance. Where Becca doesn't know something, **let her say "I don't know"** — the system records the gap rather than inventing an answer. Never lead her to a number.
3. **HV fields need explicit verbal confirmation.** Anything touching money, compliance, capacity, credentials, or safety is Human-Verify-gated — no document generates from it until she's confirmed it. Get her to state these clearly on tape, and flag anything she's unsure of for homework.

**The one-sentence goal:** by the end, you can fill `voice`, `identity`, `offerings`, `capacity`, `customers`, `competitors`, `positioning`, `pricing`, `salesProcess`, `people`, `operationsAutomation`, `toolsAndAccess`, `content`, `governance`, `goals`, and the entire `modules.preschool` block — or know exactly which fields are open and who closes them.

---

## Pre-interview checklist (T-24 hours)

- [ ] Recon + audit run against the real site; skim the findings and flag the top 3–4 P0s in plain English (never by finding ID).
- [ ] Confirm transcript capture: dedicated transcription tool > cloud recording > manual notes (last resort).
- [ ] Bring this guide printed; check off sections as covered.
- [ ] Send the one-paragraph pre-read: "We'll spend ~90 minutes on who you serve, what's working, and what you want the system to do. No tech talk. You're allowed to say 'I don't know' — that's a real answer."
- [ ] Bring the artifact ask-list (bottom of this doc) so she can pull paper files while you're on site.

---

## Part 1 — Open loose (10 min)

Start with a no-wrong-answer question and **do not interrupt for 7–10 minutes**. This raw ramble is the seed for the voice guide and `people.foundingStory`.

- "Walk me through how you ended up running this school — I want the long version."
- "What does the JCC relationship actually look like day to day? Who do you answer to?"

Capture verbatim: her phrasing, her metaphors, what she lingers on. If you're talking in these ten minutes, you've missed the point.

**Fills:** `people.foundingStory`, `identity.history`, voice raw material.

---

## Part 2 — Voice (the must-ask spine, ~15 min)

This is interview-only data — no recon source can ever fill it. Every email and post the system writes must sound like her.

1. **Live sample reply (the single most valuable artifact):** "A parent emails worried their shy two-year-old won't adjust. Answer them out loud, exactly as you would." Record verbatim → `voice.sampleCommunications`, doc-01 sample copy.
2. **Three words** for how she wants to come across, and what each one means *to her* with an example → `voice.attributes`.
3. **Tone spectrum** — place her on each: formal↔casual, serious↔playful, traditional↔modern, understated↔bold → `voice.toneSpectrum`.
4. **Two modes:** does she sound different marketing to prospective families vs. talking to enrolled families? How? → `voice.operatingModes`.
5. **Banned vocabulary:** "Words or phrases you'd never use — things that make you cringe in other schools' marketing." Probe for categories (brochure-speak, corporate, salesy, emoji/exclamation habits) → `voice.bannedVocabulary`.
6. **Words she *does* use:** what does she call the rooms, the kids, the space, the daily rituals? Is there an informal name families use for the school? → `voice.vocabularyToUse`.
7. **Anti-AI rules:** "What would instantly tell a parent a robot wrote this?" → `voice.antiAiRules`.
8. **Admired voices:** any newsletter, writer, or brand whose tone she likes → `voice.admiredVoices`.
9. **Ask for artifacts:** 3–5 emails she's sent to parents that felt right, a couple of newsletters, her favorite Instagram captions → `voice.sampleCommunications` (get her to forward these before you leave).

---

## Part 3 — Identity & the facts of the school (~10 min)

Confirm or replace every recon guess. The generated voice guide flagged most of these `[NEEDS CONFIRMATION]` — close them all:

- **Legal name vs. public name.** Is "Little Friends Learning Loft" the legal entity, or does it operate under the JCC's entity? Any DBAs? → `identity.legalName/publicName/dbas`
- **Her name as it should appear publicly** (Becca vs. Rebecca — confirm spelling and preference; the fixture used "Rebecca").
- **Year established** and the short history → `identity.yearEstablished`, `identity.history`
- **Full street address**; mailing address if different → `identity.primaryAddress/mailingAddress`
- **Service area / draw:** where do families actually come from? (Newburgh proper? Orange County? mid-Hudson?) How does she frame the geography publicly? → `identity.serviceArea`
- **Phone, public email, website URL** → `identity.phone/email/website`
- **Hours:** opening/closing, early drop-off, aftercare end → `identity.hours`
- **Annual calendar:** does it follow the JCC calendar? Jewish holidays? School-year vs. summer schedule, closure dates → `modules.preschool.annualCalendar` (ask for the printed calendar)
- **Google Business Profile:** has she actually claimed it? Who has the login? → `identity.gbp`
- **Social handles:** Instagram, Facebook, anything else, active or dormant → `identity.socialHandles`

---

## Part 4 — Offerings, rooms & capacity (~10 min) — HV

- **Each room for the record:** name, age range, ratio, lead teacher, assistant count, days/hours offered (full-time vs. part-time options) → `offerings.core`
- **Aftercare:** hours, who runs it, separate fee? → `offerings.core`
- **Summer camp:** dates, ages, how it differs, separate enrollment? → `offerings.seasonal`
- **Anything discontinued** that old materials might still mention → `offerings.discontinued`
- **The don't-do / don't-promise list (HV):** "What do people ask for that you don't offer?" (e.g., infant care, transportation, meals, weekend care, drop-in care). These become hard rules the system never implies → `offerings.dontDo`
- **Capacity (HV):** licensed capacity total *and per room*, current enrollment per room, waitlist per room → `capacity.metrics`, `modules.preschool.enrollmentCapacity`
- **Booking lead time:** how far ahead do families need to enroll? When does fall fill? → `capacity.bookingLeadTime`
- **Mid-year starts:** does she take them? Any blackout periods? → `capacity.blackoutDates`, `capacity.engagementTypes`

---

## Part 5 — Customers & why they choose (or don't) (~15 min)

Extract a *specific named-shape* customer, not a demographic.

1. "Tell me about your best family from the last year — not the easiest, the one where everything just *worked*. Who were they? How did they find you?"
2. "What did they say or do that told you they got it?"
3. "Now the opposite — a family that was wrong for the school. What made them wrong?" → `salesProcess.disqualificationCriteria`
4. "What do enrolled parents say to their friends about you? What's the referral sentence?" → `customers.praise`, `customers.reasonsChooseUs`
5. "When you lose a family who toured, where do they go and why?" → `customers.reasonsWeLose`
6. "What do parents Google to find a school like yours? Guess if you don't know." → `seo` question keywords
7. **Decision mechanics:** who decides (one parent? both? grandparents paying?), what do they compare, how long from first contact to decision, how price-sensitive → `customers.decisionCriteria/decisionTimeline/optionsConsidered/priceSensitivity`
8. **Lifetime value shape:** typical years enrolled, siblings following → `customers.lifetimeValue`
9. **Discovery channels ranked:** word of mouth, JCC, Google, Instagram, drive-by, Care.com etc. → `customers.discoveryChannels`

---

## Part 6 — Competitors & positioning (~10 min)

Recon gives the data; she gives the street-level truth.

- "When a family is deciding, who else are they touring?" Get 3–5 named: the polished chain option, church preschools, Montessori, in-home daycares → `competitors.direct`
- For each: where do *they* win, where does Little Friends win, what do parents say after touring both → `whereTheyWin/whereWeWin`
- **Indirect alternatives:** staying home with a grandparent, nanny shares, waiting a year → `competitors.indirect`
- **Market context:** is Newburgh under- or over-supplied with preschool seats? Is everyone full with waitlists? → `competitors.marketContext`
- **The one-sentence differentiator:** "Finish this: families should pick us over the others because ___." → `positioning.keyDifferentiator`
- **Proof for every claim:** years operating, families served, staff tenure, anything countable → `positioning.trackRecordNumbers`, `positioning.verifiableDifferentiators`
- Awards, accreditations, press, anything frame-able → `positioning.awards`
- "What's one thing a competitor does well that you'd steal if you could?"

---

## Part 7 — Pricing, privately (~10 min) — entire section HV

Preface on tape: *"This stays internal. Nothing here gets published without your sign-off."*

- **Full tuition table:** each room × full-time/part-time, current rates → `pricing.nonShareable` (or `shareable` if she ever wants any published)
- **Discounts:** JCC member, sibling, staff, scholarship/subsidy (does she take CCAP/county subsidy? — also a compliance flag) → `pricing.discounts`
- **Registration fee, deposit, refund terms** → `pricing.deposit`, `pricing.refundPolicy`
- **Payment schedule and accepted methods** (Brightwheel autopay? checks? cash?) → `pricing.paymentSchedule/acceptedMethods`
- **Late payment reality:** how often, who chases it, what's the script → also feeds `operationsAutomation.recurringTasks`
- **Visibility policy (HV):** confirm the rule — is tuition published anywhere, ever? → `pricing.visibilityPolicy`
- **The deflection script (HV):** "When a stranger emails asking only the price, what exactly do you say?" Capture word-for-word — this becomes the approved automated answer → `pricing.nonShareable[].deflectionAnswer`
- **When were prices last raised, and when's the next change?** → `pricing.lastUpdated` (so generated docs don't fossilize stale numbers)

---

## Part 8 — The sales process / enrollment funnel (~15 min)

Walk one real family from first touch to enrolled. Then quantify what she can.

- **Lead sources with rough volumes:** inquiries per month by channel, by season ("Winter vs. summer — ballpark, and 'I don't know' is fine") → `salesProcess.leadSources`, `salesProcess.seasonality`
- **Where inquiries land:** email? Instagram DM? Brightwheel? phone? website form? Who sees each first? → `leadSources[].landingPoint/firstResponder`
- **First touch:** what does she actually send back, and how long does it take her in busy season honestly → `salesProcess.firstTouch` (note: response time will also be secret-shopper-measured, not just self-reported)
- **Qualifying questions she asks** (age, days needed, start date, JCC member?) and what disqualifies → `salesProcess.qualifyingQuestions/qualificationCriteria`
- **The tour (the conversion event):** length, who gives it, how it's scheduled today, what the agenda is, show-up rate → `salesProcess.conversionEvent`
- **Follow-up:** what happens after the tour today, honestly; what should happen → `salesProcess.followUpCadences` (the corpus flagged follow-up as the funnel leak — verify that's true in reality)
- **Close definition (HV):** what counts as "enrolled" — application + deposit? signed contract? → `salesProcess.close.definition`
- **Funnel numbers, with permission to not know:** inquiries → tours → enrolled, and roughly what a family is worth per year → `salesProcess.funnel` (revenuePerCustomer is HV)
- **Bottlenecks in her own words:** "Where does the funnel actually leak?" → `salesProcess.bottlenecks`
- **Re-enrollment:** how does the spring re-enrollment round work? Retention rate guess?

---

## Part 9 — People, routing & governance (~10 min)

- **Org chart for the record:** every staff member by name and role (leads, assistants, aftercare, bookkeeper), full/part-time → `people.keyTeam` (ask for the staff roster — also needed for the training matrix in Part 12)
- **Who is public:** which names/photos can appear on the website? Teacher bios — names yes, personal details no? → `keyTeam[].publicContact`
- **Decision authority:** what can she decide alone vs. exec director vs. board? Money thresholds? → `people.owners`, governance context
- **Routing rules (HV):** billing dispute → who? Upset parent → who? Incident → who? Media inquiry → who? → `people.routing.rules`
- **Do-NOT-route list (HV):** who must never field what (e.g., assistants never handle billing or upset parents) → `people.routing.doNotRoute`
- **Billing contact (HV):** name, email, phone of whoever handles money ops → `people.billingContact`
- **Technical collaborator:** is there anyone — staff, JCC IT, her husband, a board member — comfortable with software? What OS/devices? → `people.technicalCollaborator`
- **The future office hire:** is the corpus's "office person to be hired" real? Timeline? They'll be the system's day-2 operator → feeds doc-14/17 planning

---

## Part 10 — The recurring work, itemized (~15 min) — the heart of the automation scope

Itemize **every recurring task** with frequency, time cost, current method, and how much she hates it. Each line is an automation candidate → `operationsAutomation.recurringTasks`.

Walk the list; let her add to it:

| Task to probe | Ask about |
|---|---|
| Inquiry replies & tour scheduling | volume, where, time per week |
| Newsletter | cadence, source material, hours each |
| Photo handling | where they pile up, what parents ask for |
| Payroll hours to bookkeeper | cadence, format, how late she runs |
| Compliance tracking | immunizations, trainings, drills (detail in Part 12) |
| Parent messages (app/email) | daily load, after-hours load |
| Supply/snack ordering | who, how, how often |
| Event setup & signups | which tools, what breaks |
| Late-payment chasing | frequency, script |
| Board/exec reporting | cadence, format, dread level |
| State paperwork | what recurs, what surprises |
| Anything on paper or barter | (corpus mentioned a music-teacher space trade — real?) |

Then the rules around automation:

- **The wand question:** "When a new inquiry comes in, what should happen *without you*?" → `operationsAutomation.automationTriggers`
- **Always-human list (HV):** topics where automation must stop and a human takes over (child wellbeing/incidents, money disputes, upset parents, hiring, the state…) → `operationsAutomation.sensitiveTopics`
- **Escalation routing (HV):** for each sensitive type, who exactly gets it → `operationsAutomation.escalationRouting`
- **Error preference:** if the system is unsure, should it ask first or act and report? → `operationsAutomation.errorHandlingPreference`
- **Response-time targets:** what should a parent expect by channel? → `operationsAutomation.responseSlas`
- **VIP indicators:** which families/contacts get white-glove handling (board members' kids, prospective donors)? → `operationsAutomation.vipIndicators`
- **Spend cap (HV):** monthly ceiling for tools/API spend before it needs approval → `operationsAutomation.spendCap`
- **Monitoring:** who checks that automations are behaving, and how often is realistic → `operationsAutomation.monitoring`
- **Her real weekly hours on admin** — get the honest number and where it happens (nights/Sundays)

---

## Part 11 — Tools, accounts & access (~10 min) — entire section HV

For **every** tool: name, what it does for them, **who holds the login**, who pays for it, and whether she'd keep or kill it → `toolsAndAccess.stack`.

Probe the full list (corpus seeds — verify each is real): website platform (Square?), Brightwheel, Mailchimp, Slack, Google Workspace (through the JCC? who admins it?), Sign-Up Genius, Google Forms, Instagram, Facebook, Google Business Profile, payroll (Gusto? in progress?), QuickBooks or whatever the bookkeeper uses, any state portals (OCFS/medical), printers/scanners for paper forms.

- **The "if you left tomorrow" question:** who else has each login? Are credentials in her head, a sticky note, a password manager? Should the JCC own the accounts? → `accessChecklist`, feeds doc-17 and i07
- **What's paid for but unused** (subscription audit invitation) → cost savings line for the proposal
- **CRM:** confirm none exists ("it's my inbox and my head") → `toolsAndAccess.crm`
- **Email platform reality:** Mailchimp status, list size, who's on it → `toolsAndAccess.emailPlatform`
- **Analytics:** GA4? Search Console? anything? → `toolsAndAccess.analytics`
- **Payment processor:** Brightwheel billing? Square? → `toolsAndAccess.paymentProcessor`
- **Devices & browsers:** what does she work on (school computer, personal laptop, phone)? Is there an always-on machine at school? What do the teachers use? → `toolsAndAccess.browserDeviceLandscape` (drives Claude-in-Chrome and routines setup)
- **Anthropic/Claude plan:** who would own the subscription and billing — her, the JCC? → `toolsAndAccess.plan`, `apiSpend.keyOwnership/caps` (HV — money)

---

## Part 12 — Compliance & the preschool module (~15 min) — HV, the highest-stakes section

Be specific; this builds the compliance tracker. Everything here is human-verify-gated.

- **License:** exact license type, license number, status, renewal date, licensed capacity on the license → `modules.preschool.ocfs.licenseStatus/licenseNumber` (ask to photograph the posted license)
- **Filings:** anything open or recent — renewals, plans of correction, variances → `ocfs.filings`
- **Inspection history:** last inspection date and result; any findings; how she preps today → `ocfs.inspectionHistory`
- **Immunization policy (HV):** what's required, how exemptions are documented, where records live, how due dates are tracked today → `modules.preschool.immunizationPolicy`
- **Training matrix (HV):** per staff member — required trainings (the 15-hour/2-year topics, MAT, CPR/first aid), current status, expiry dates. **She likely won't know currency offhand — that's fine; the homework is the actual sheet/files.** → `modules.preschool.trainingMatrix`
- **Drills:** fire/shelter-in-place schedule and logging method → `adminRunbook.emergencyProcedures`
- **CPSE/IEP coordination:** how many kids, what the district coordination involves (also a sensitive-topics flag)
- **Regulated data (HV):** what child/family data they hold — health records, allergies, custody arrangements, photos of minors — and where it lives → `governance.regulatedData`
- **Data retention:** how long are child files kept after a family leaves? Any JCC or state rule? → `governance.dataRetention`
- **Parent handbook:** does one exist? Get a copy — policies, hours, communication norms → `modules.preschool.parentHandbook`
- **Admin runbook:** opening/closing procedures, staffing/ratio coverage rules, emergency procedures — the stuff that lives only in her head → `modules.preschool.adminRunbook`
- **The fear question:** "If an inspector walked in tomorrow, what would you worry about?" (this prioritizes the build)

---

## Part 13 — Content, photos & permissions (~10 min)

- **Photo inventory:** where they live (Slack channel? phones? Instagram archive?), rough counts, who shoots them → `content.photos.storage/counts/categories`
- **Photo permission status (HV — legal):** the consent form, the tracking method, how many no-photo families, how current the tracking is. **The permission gate is the design constraint for the whole photo pipeline — get the real mechanics.** → `content.photos.rights` (homework: the current consent list, reconciled from the files)
- **Hero shots:** her 5 favorite photos that capture the school → `content.photos.heroShots`
- **Photo gaps:** what's missing (exterior, classroom wide shots, staff headshots)? → `content.photos.gaps`
- **Video:** anything usable? Confirm/deny the "welcome video instead of fifty 45-minute tours" want → `content.videos`, a doc-10/web priority
- **Written content:** any blog/news page, the newsletter archive, existing FAQ anywhere → `content.written`
- **Testimonials & reviews:** Google review count/rating, Facebook, Care.com; does she respond to reviews? What's the policy when a bad one lands (HV: `governance.reviewResponsePolicy`)? Any parent quotes she has permission to use? → `content.testimonials/reviewPlatforms`
- **Visual brand:** is there a logo file? Colors? Who made them? Any JCC brand constraints on what the school can look like? → `content.visualBrandAssets`
- **Production capacity:** who could realistically create content ongoing, and how many hours/week — push past optimism → `content.productionCapacity`, `goals.contentHoursPerWeek`
- **90-day content priorities:** if only three content things got fixed by fall, which → `content.ninetyDayPriorities`

---

## Part 14 — Website & scope decisions (~10 min)

- **Current site:** platform login, who built it, what's on it that must survive, what she's embarrassed by → `toolsAndAccess.websiteCms`
- **Translate top audit findings** into plain English and watch her reaction (not "missing canonical tags" — "when a parent searches 'preschool Newburgh,' here's who shows up instead of you"). Her reaction ranks the messaging → `auditDecisions.findingDecisions`
- **Page wants:** for each page on the new site, what does she want it to do? → `auditDecisions.pageWants`
- **Reference sites:** 2–3 school sites she likes (or hates) → `auditDecisions.referenceSites`
- **Scope tier:** polish vs. rebuild vs. rebuild-plus-content — her instinct → `auditDecisions.scopeTier`
- **Website scope fork (HV — money):** path A (iterative), B (partial), or C (full rebuild). This gates every website deliverable; it can be confirmed at proposal, but plant it now → `goals.engagementScope.websiteScope`
- **What the site must do:** tour booking? event signups? donations (nonprofit!)? aftercare/camp registration? → conversion design
- **Must-not-change list:** any tagline, name usage, URL, JCC co-branding requirement

---

## Part 15 — Goals, constraints & red lines (~10 min) — closes the session

- **Primary outcome, in her words:** the wand question — "Six months from now, what's different?" (corpus version: back in a classroom three days a week. Get *her real* version, verbatim — it's the north star of every doc.) → `goals.primaryOutcome`
- **First thing she does with the time back** (great closing question, great proposal copy)
- **Urgency/timeline:** the real deadline and why (September? re-enrollment season?) → `goals.urgencyTimeline`
- **Budget (HV):** the honest envelope, the board approval process, what number needs what sign-off, fiscal-year timing → `goals.budgetConstraints`
- **Phase-1 automation picks:** of everything discussed, which 2–3 first? (corpus instinct: compliance, then inquiry-to-tour, then newsletter — verify her real ranking) → `goals.engagementScope.phase1Automation`
- **Retainer vs. handoff** after launch; who gets trained → `goals.engagementScope.retainerContinuation`
- **Red lines (HV) — get these stated explicitly on tape:** things the school will never do regardless. Probe at minimum:
  - publish tuition?
  - children's faces without signed consent?
  - automated replies about a child's wellbeing?
  - staff personal details public?
  - anything the JCC prohibits?
  → `goals.redLines`
- **Memory/privacy posture:** is she comfortable with an AI assistant retaining context about families, or should certain topics always be incognito/not retained? → `governance.memoryIncognitoPosture`
- **Offboarding:** if the engagement ended, who inherits what — confirm the JCC should own all accounts → `governance.offboardingPlan`
- **Nervousness check:** "What are you most nervous about with this whole thing?" and "If we only nailed 80%, which 20% must be in the 80?"
- Confirm next steps, dates, and who reviews what.

---

## The "known unknowns" — expect these to stay open

The corpus deliberately modeled Becca as not knowing these. In the real interview, **don't force answers** — assign homework instead:

| Open item | Likely closure |
|---|---|
| Exact monthly inquiry volume | Count her inbox/DMs for the last 90 days together, or assign as homework |
| True tour→enroll conversion rate | Reconstruct from last year's tour and enrollment lists |
| Whether all staff training is current | She pulls the sheet + certificates; becomes the training matrix |
| Which families are no-photo, currently | She reconciles paper consent forms against the roster |
| Forgotten paid subscriptions | She (or Linda) pulls 3 months of statements |

Each gets: an owner, a deadline, and a `[pending]` profile entry — never a guess.

---

## Artifacts to collect on site (bring a folder / scan with phone)

- [ ] OCFS license (photo of the posted certificate)
- [ ] Staff roster with roles (for the training matrix)
- [ ] Training-tracking sheet, however stale
- [ ] Blank photo-consent form + the current consent list/spreadsheet
- [ ] Parent handbook (any version)
- [ ] Current tuition sheet / rate card
- [ ] Annual calendar (this year's)
- [ ] Enrollment packet / application form
- [ ] A recent newsletter (2–3 issues)
- [ ] 3–5 parent emails she's proud of (forwarded)
- [ ] Logo files / any brand assets
- [ ] The tour script, if anything written exists
- [ ] Sample board report
- [ ] List of every tool + who holds each login (start it together on paper)

---

## HV sign-off checklist — must be verbally confirmed (and later formally verified)

Money: all pricing · deposit/refund terms · budget · spend caps · revenue per family · close definition · website scope fork
Compliance/safety: license status & number · training matrix · immunization policy · enrollment capacity · regulated data · data retention · review-response policy
Operations: escalation routing · sensitive topics · do-not-route list · billing contact
Access: every tool credential & holder · account ownership/offboarding · photo & video rights · don't-do list · red lines

---

## Facilitation reminders

- **Silence is a tool.** If she stops after 10 seconds, wait 8 more.
- **Quote back every 15–20 minutes:** "So what I'm hearing is the real differentiator is ___ — is that right?"
- Never "do you agree?" — instead "does this match what you see in your inbox?"
- **Capture verbatim quotes**; don't paraphrase in real time. Her exact phrasing *is* the voice guide.
- If she's rambling productively about voice/customers, let her. If it's a tangent past 5 minutes: "That's exactly what I needed — let me hold you there."
- **"I don't know" is a valid, recorded answer.** Say so out loud at the start of the numbers section.
- Don't sell. You're extracting, not pitching.
- If you run short on time, the priority order is: **Voice → recurring tasks → compliance detail → pricing → red lines/goals.** Funnel numbers and competitor color can be a follow-up call; voice and red lines cannot.

## Post-interview (within 24 hours)

1. Get the transcript while memory is fresh; save the raw file under `clients/littlefriends/`.
2. Run `upriver profile extract-transcript littlefriends <transcript-file>`; review proposed updates and conflicts.
3. Check `upriver profile show littlefriends` — the question queue lists remaining must-ask gaps; schedule the gap-fill (chatbot or follow-up call) for anything still empty.
4. Walk the HV verification queue with her asynchronously (email recap: "confirm these exact numbers/policies").
5. Chase the homework artifacts (training sheet, consent reconciliation, statements) with a date attached.
