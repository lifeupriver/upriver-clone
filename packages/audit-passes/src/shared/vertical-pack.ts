// Vertical-aware copy + heuristics. Audit passes pull strings, page
// expectations, and directory lists from a `VerticalPack` keyed by the
// `vertical` field on `client-config.yaml`. When that field is missing or
// `generic`, passes fall back to small-business defaults that don't bake
// in any single industry's vocabulary.

import type { Vertical } from '@upriver/core';

// `Vertical` is declared once in @upriver/core (types/client-config.ts) and
// re-exported here so existing `import { Vertical } from './vertical-pack.js'`
// call sites — and the package barrel — keep working.
export type { Vertical } from '@upriver/core';

export interface ExpectedPage {
  pattern: RegExp;
  label: string;
  priority: 'p0' | 'p1' | 'p2';
}

export interface DirectoryCitation {
  pattern: RegExp;
  label: string;
}

export interface ExpectedTopic {
  /** Pattern matched against full-site markdown to detect coverage. */
  pattern: RegExp;
  /** Human-readable label used in audit findings. */
  label: string;
}

/**
 * Shared options accepted by every audit pass `run()`. Individual passes
 * can ignore fields they don't use; the orchestrator passes the same opts
 * object to all of them.
 */
export interface PassOptions {
  /** Business vertical for copy and heuristic specialization. */
  vertical?: Vertical | string;
  /** Override for `<clientDir>/repo` when looking up scaffolded files. */
  cloneRepoDir?: string;
  /** Primary city the business operates from (e.g. "Austin"). */
  city?: string;
  /** Region / county / metro / state served (e.g. "Hudson Valley", "TX"). */
  region?: string;
  /** Additional towns or areas served, matched as place tokens. */
  serviceArea?: string[];
  /**
   * Whether the business serves a physical locality. `false` makes the
   * `local` pass skip its checks entirely (online-only businesses);
   * undefined/true keeps the default behavior.
   */
  localBusiness?: boolean;
}

export interface VerticalPack {
  /** Human-readable descriptor — e.g. "wedding venue", "preschool". */
  noun: string;
  /** Buyer / audience noun — e.g. "couples", "parents", "diners". */
  buyer: string;
  /** Pages a serious site in this vertical typically has. */
  expectedPages: ExpectedPage[];
  /** Industry-specific directory profiles to look for in external links. */
  directories: DirectoryCitation[];
  /** Topics an AI assistant typically gets asked about this vertical. */
  expectedTopics: ExpectedTopic[];
  /** Example natural-language question buyers commonly ask. */
  exampleBuyerQuestion: string;
  /** Sample search query a typical buyer would type. */
  searchQueryExample: string;
  /** Phrasing template for the "ranking phrase" suggestion. */
  rankingPhraseTemplate: string;
  /** Why social proof matters for this vertical (one sentence). */
  socialProofWhy: string;
  /** Why FAQs matter for this vertical (one sentence). */
  faqWhy: string;
  /** Why mobile UX matters for this vertical (one sentence). */
  mobileWhy: string;
  /**
   * Concrete vertical-specific recommendation snippet for the
   * "replace banned marketing language" finding. Authored copy that lets
   * wedding-venue audits keep their wedding-flavored examples while
   * non-venue audits get generic prose.
   */
  bannedWordExample: string;
  /**
   * Concrete vertical-specific entity-disambiguation example for the geo
   * pass (e.g. `Audrey's — wedding venue in Sebastopol, CA`).
   */
  entityDisambiguationExample: string;
}

const wedding: VerticalPack = {
  noun: 'wedding venue',
  buyer: 'couples',
  expectedPages: [
    { pattern: /venue|space|barn|loft|outdoor|garden|pavilion/i, label: 'Dedicated venue space pages', priority: 'p1' },
    { pattern: /pricing|packages|rates|investment/i, label: 'Pricing or packages page', priority: 'p0' },
    { pattern: /gallery|portfolio|photos|real.wedding/i, label: 'Photo gallery or real weddings', priority: 'p1' },
    { pattern: /faq|questions|what.to.expect/i, label: 'FAQ page', priority: 'p1' },
    { pattern: /contact|inquir|reach.us/i, label: 'Contact or inquiry page', priority: 'p0' },
    { pattern: /about|our.story|team/i, label: 'About page', priority: 'p1' },
    { pattern: /catering|food|beverage|bar/i, label: 'Catering or food & beverage page', priority: 'p1' },
    { pattern: /vendor|preferred.partner/i, label: 'Preferred vendors list', priority: 'p2' },
    { pattern: /accommodation|lodging|stay|hotel|cabin/i, label: 'Accommodations page', priority: 'p2' },
    { pattern: /local|area|direction|travel/i, label: 'Local area or directions page', priority: 'p2' },
  ],
  directories: [
    { pattern: /weddingwire\.com/i, label: 'WeddingWire' },
    { pattern: /theknot\.com/i, label: 'The Knot' },
    { pattern: /zola\.com/i, label: 'Zola' },
    { pattern: /yelp\.com/i, label: 'Yelp' },
    { pattern: /facebook\.com/i, label: 'Facebook' },
    { pattern: /instagram\.com/i, label: 'Instagram' },
  ],
  expectedTopics: [
    { pattern: /capacity|how many|guest.*count|maximum/i, label: 'Guest capacity / maximum attendees' },
    { pattern: /pricing|cost|how much|rate|package|investment/i, label: 'Pricing and packages' },
    { pattern: /catering|food|beverage|bar|alcohol|corkage/i, label: 'Catering policy (in-house vs. external)' },
    { pattern: /outdoor|indoor|weather|rain|backup/i, label: 'Indoor/outdoor options and weather backup plan' },
    { pattern: /parking|accomodation|hotel|stay|overnight/i, label: 'Parking and accommodation options' },
    { pattern: /vendor|caterer|planner|photographer|dj|preferred/i, label: 'Vendor policies (preferred list vs. open)' },
    { pattern: /deposit|payment|cancel|refund|policy/i, label: 'Deposit, payment, and cancellation policy' },
    { pattern: /available|booking|date|calendar|hold/i, label: 'Availability and date hold process' },
    { pattern: /ceremony|reception|rehearsal|cocktail/i, label: 'Ceremony, reception, and cocktail hour options' },
    { pattern: /decor|decoration|candle|flower|setup|breakdown/i, label: 'Decoration policies and setup/breakdown time' },
    { pattern: /accessible|wheelchair|ada|mobility/i, label: 'Accessibility accommodations' },
    { pattern: /rehearsal.*dinner|day.before/i, label: 'Rehearsal dinner availability' },
  ],
  exampleBuyerQuestion: 'does this venue allow outside catering?',
  searchQueryExample: 'wedding venues near me',
  rankingPhraseTemplate: 'wedding venue in {city}, {state}',
  socialProofWhy:
    'Wedding venue decisions are high-stakes and emotional — buyers need significant social proof before converting.',
  faqWhy:
    'Couples have dozens of questions before they tour — unanswered questions become objections.',
  mobileWhy:
    'Over 60% of wedding-venue traffic comes from mobile. A broken mobile experience directly costs inquiries.',
  bannedWordExample:
    'Replace banned words with specific, evidence-based language. Instead of "stunning views," write "floor-to-ceiling windows overlooking the Catskill Mountains."',
  entityDisambiguationExample:
    'Pair the business name with a city/region in the homepage hero, footer address block, and `<title>` tag (e.g. "Audrey\'s — wedding venue in Sebastopol, CA").',
};

const preschool: VerticalPack = {
  noun: 'preschool',
  buyer: 'parents',
  expectedPages: [
    { pattern: /admission|enroll|apply|enrollment/i, label: 'Admissions or enrollment page', priority: 'p0' },
    { pattern: /tuition|pricing|rates|fees|cost/i, label: 'Tuition or pricing page', priority: 'p0' },
    { pattern: /contact|inquir|tour|visit/i, label: 'Contact or tour-booking page', priority: 'p0' },
    { pattern: /about|our.story|philosophy|mission/i, label: 'About / Our Philosophy page', priority: 'p1' },
    { pattern: /faq|questions|parent.resource/i, label: 'FAQ or Parent Resources page', priority: 'p1' },
    { pattern: /curriculum|program|montessori|learning|day/i, label: 'Curriculum / A Day in the Classroom page', priority: 'p1' },
    { pattern: /gallery|photos|classroom|tour/i, label: 'Photo gallery / classroom tour', priority: 'p1' },
    { pattern: /staff|teacher|guide|team|faculty/i, label: 'Teachers / Staff page', priority: 'p1' },
    { pattern: /summer|camp|extended.day|after.care/i, label: 'Summer camp or extended-day page', priority: 'p2' },
    { pattern: /calendar|schedule|hours/i, label: 'School calendar / hours page', priority: 'p2' },
  ],
  directories: [
    { pattern: /care\.com/i, label: 'Care.com' },
    { pattern: /winnie\.com/i, label: 'Winnie' },
    { pattern: /greatschools\.org/i, label: 'GreatSchools' },
    { pattern: /yelp\.com/i, label: 'Yelp' },
    { pattern: /facebook\.com/i, label: 'Facebook' },
    { pattern: /instagram\.com/i, label: 'Instagram' },
  ],
  expectedTopics: [
    { pattern: /age|year.old|toddler|infant|preschool|2\.5|3.year/i, label: 'Age range / classroom groupings' },
    { pattern: /tuition|cost|fee|rate|pricing|price/i, label: 'Tuition and fees' },
    { pattern: /schedule|hour|day|drop.off|pickup|full.day|half.day/i, label: 'Daily schedule, drop-off, pickup' },
    { pattern: /curriculum|montessori|reggio|waldorf|philosophy|approach/i, label: 'Curriculum / educational philosophy' },
    { pattern: /enroll|admission|application|apply|tour/i, label: 'Enrollment / application process' },
    { pattern: /lunch|snack|meal|food|nut.free|allergy/i, label: 'Meals, snacks, and allergy policy' },
    { pattern: /nap|rest|sleep/i, label: 'Nap / rest time policy' },
    { pattern: /bathroom|potty|toilet|diaper/i, label: 'Toileting / diapering policy' },
    { pattern: /summer|camp|extended|after.care|before.care/i, label: 'Summer programming and extended-day options' },
    { pattern: /teacher|guide|staff|certif|train|background.check/i, label: 'Teacher credentials and training' },
    { pattern: /accredit|licens|state.licen/i, label: 'Licensing / accreditation' },
    { pattern: /sick|illness|medication|emergency/i, label: 'Sick policy and emergency procedures' },
  ],
  exampleBuyerQuestion: 'do you take 3-year-olds and what is the daily schedule?',
  searchQueryExample: 'Montessori preschool near me',
  rankingPhraseTemplate: 'preschool in {city}, {state}',
  socialProofWhy:
    'Preschool enrollment is a high-trust decision; parents weigh peer testimonials and verified reviews heavily before booking a tour.',
  faqWhy:
    'Parents have dozens of questions before enrolling — schedule, tuition, what to bring, drop-off — and each unanswered question is an objection.',
  mobileWhy:
    'Most parents researching schools do so on mobile during commutes or after bedtime. A broken mobile experience directly costs tour bookings.',
  bannedWordExample:
    'Replace banned words with specific, evidence-based language. Instead of "nurturing environment," describe the actual classroom: "mixed-age classrooms of 12 children with two trained Montessori guides."',
  entityDisambiguationExample:
    'Pair the school name with a city/region in the homepage hero, footer address block, and `<title>` tag (e.g. "Little Friends Learning Loft — Montessori preschool in Newburgh, NY").',
};

const restaurant: VerticalPack = {
  noun: 'restaurant',
  buyer: 'diners',
  expectedPages: [
    { pattern: /menu|food|drink/i, label: 'Menu page', priority: 'p0' },
    { pattern: /reserv|book.table|opentable|resy/i, label: 'Reservations page', priority: 'p0' },
    { pattern: /hours|location|contact|directions/i, label: 'Hours and location page', priority: 'p0' },
    { pattern: /about|story|chef|our.team/i, label: 'About / Chef page', priority: 'p1' },
    { pattern: /private.event|catering|party/i, label: 'Private events / catering page', priority: 'p1' },
    { pattern: /gallery|photos/i, label: 'Photo gallery', priority: 'p2' },
    { pattern: /press|review|media/i, label: 'Press / reviews page', priority: 'p2' },
  ],
  directories: [
    { pattern: /yelp\.com/i, label: 'Yelp' },
    { pattern: /opentable\.com/i, label: 'OpenTable' },
    { pattern: /resy\.com/i, label: 'Resy' },
    { pattern: /tripadvisor\.com/i, label: 'TripAdvisor' },
    { pattern: /facebook\.com/i, label: 'Facebook' },
    { pattern: /instagram\.com/i, label: 'Instagram' },
  ],
  expectedTopics: [
    { pattern: /menu|dish|special|chef|cuisine/i, label: 'Menu and chef-driven dishes' },
    { pattern: /reserv|book|table|opentable|resy/i, label: 'Reservation policy / how to book' },
    { pattern: /hour|open|close|monday|tuesday/i, label: 'Hours of operation' },
    { pattern: /address|location|park|valet|street/i, label: 'Address, parking, and directions' },
    { pattern: /private|event|party|catering|buyout/i, label: 'Private events and catering' },
    { pattern: /dietary|gluten|vegan|vegetarian|allerg/i, label: 'Dietary accommodations' },
    { pattern: /dress.code|attire/i, label: 'Dress code' },
    { pattern: /kid|child|family|stroller/i, label: 'Kid-friendliness' },
    { pattern: /gift.card|gratuity|service.charge/i, label: 'Gift cards / gratuity policy' },
  ],
  exampleBuyerQuestion: 'are you open for dinner tonight and do you take walk-ins?',
  searchQueryExample: 'best restaurants near me',
  rankingPhraseTemplate: 'restaurant in {city}, {state}',
  socialProofWhy:
    'Diners check reviews and photos before they pick a restaurant; missing or thin social proof loses the booking to a competitor.',
  faqWhy:
    'Diners want to know hours, dress code, parking, kid-friendliness, and dietary accommodations before they reserve.',
  mobileWhy:
    'Restaurant search is overwhelmingly mobile and last-minute. A slow or broken mobile site loses the table.',
  bannedWordExample:
    'Replace banned words with specific, evidence-based language. Instead of "world-class cuisine," name the chef and the dish: "Chef Maria\'s hand-rolled pasta, finished tableside with brown butter and sage."',
  entityDisambiguationExample:
    'Pair the restaurant name with a city/neighborhood in the hero, footer, and `<title>` tag (e.g. "Acme Trattoria — Italian restaurant in Hayes Valley, San Francisco").',
};

const professionalServices: VerticalPack = {
  noun: 'professional services firm',
  buyer: 'prospective clients',
  expectedPages: [
    { pattern: /service|practice.area|what.we.do/i, label: 'Services / practice areas page', priority: 'p0' },
    { pattern: /contact|consult|inquir|book.a/i, label: 'Contact or consultation booking', priority: 'p0' },
    { pattern: /about|our.team|attorney|partner|staff/i, label: 'About / Team page', priority: 'p0' },
    { pattern: /case.stud|client.work|portfolio|results/i, label: 'Case studies or portfolio', priority: 'p1' },
    { pattern: /pricing|fees|rates|engagement/i, label: 'Pricing or fee structure page', priority: 'p1' },
    { pattern: /faq|questions|process/i, label: 'FAQ or Process page', priority: 'p1' },
    { pattern: /testimonial|review|client.story/i, label: 'Testimonials / client stories', priority: 'p1' },
  ],
  directories: [
    { pattern: /linkedin\.com/i, label: 'LinkedIn' },
    { pattern: /yelp\.com/i, label: 'Yelp' },
    { pattern: /clutch\.co/i, label: 'Clutch' },
    { pattern: /google.*business|maps\.google/i, label: 'Google Business Profile' },
  ],
  expectedTopics: [
    { pattern: /service|practice|expertise|specialt/i, label: 'Services and areas of expertise' },
    { pattern: /pricing|fee|rate|engagement|retainer|hourly/i, label: 'Pricing and engagement model' },
    { pattern: /process|how.it.works|method|approach/i, label: 'Engagement process / methodology' },
    { pattern: /case.stud|client.work|example|portfolio|result/i, label: 'Past work or case studies' },
    { pattern: /testimonial|review|client.story/i, label: 'Client testimonials' },
    { pattern: /team|partner|principal|founder|attorney|consultant/i, label: 'Who you work with' },
    { pattern: /credentia|certif|license|bar.admit/i, label: 'Credentials and certifications' },
    { pattern: /location|office|remote|virtual/i, label: 'Office locations or remote/virtual delivery' },
  ],
  exampleBuyerQuestion: 'what does this firm specialize in and how much do they charge?',
  searchQueryExample: 'best [service] in [city]',
  rankingPhraseTemplate: '[service type] in {city}, {state}',
  socialProofWhy:
    'Services buyers compare 3–5 firms before reaching out; testimonials and case studies are the deciding factor.',
  faqWhy:
    'Prospects need process, scope, and pricing clarity before they book a discovery call. FAQ pages reduce friction at exactly that step.',
  mobileWhy:
    'Many services prospects research from a phone before they ever open a laptop. Mobile UX is a first-impression filter.',
  bannedWordExample:
    'Replace banned words with specific, evidence-based language. Instead of "world-class team," list credentials and tenure: "five attorneys with 80+ combined years of M&A experience."',
  entityDisambiguationExample:
    'Pair the firm name with a city/region in the hero, footer, and `<title>` tag (e.g. "Acme Law — corporate counsel in Austin, TX").',
};

const retail: VerticalPack = {
  noun: 'retail shop',
  buyer: 'shoppers',
  expectedPages: [
    { pattern: /shop|store|product|collection|catalog/i, label: 'Shop / product catalog pages', priority: 'p0' },
    { pattern: /shipping|return|exchange|refund|policy/i, label: 'Shipping and returns policy page', priority: 'p0' },
    { pattern: /contact|customer.service|support|reach.us/i, label: 'Contact / customer service page', priority: 'p0' },
    { pattern: /about|our.story|maker|behind/i, label: 'About / Our Story page', priority: 'p1' },
    { pattern: /faq|questions|help/i, label: 'FAQ or Help page', priority: 'p1' },
    { pattern: /hours|location|visit|directions|find.us/i, label: 'Store hours and location page', priority: 'p1' },
    { pattern: /gift.card|gift.certificate/i, label: 'Gift cards page', priority: 'p2' },
    { pattern: /sale|new.arrival|featured|best.seller/i, label: 'Sale or new arrivals page', priority: 'p2' },
    { pattern: /review|testimonial/i, label: 'Reviews page', priority: 'p2' },
  ],
  directories: [
    { pattern: /shopping\.google|google\.com\/shopping|merchants?\.google/i, label: 'Google Shopping' },
    { pattern: /yelp\.com/i, label: 'Yelp' },
    { pattern: /facebook\.com/i, label: 'Facebook' },
    { pattern: /instagram\.com/i, label: 'Instagram' },
    { pattern: /pinterest\.com/i, label: 'Pinterest' },
  ],
  expectedTopics: [
    { pattern: /shipping|deliver|arrive|transit|carrier/i, label: 'Shipping cost and delivery times' },
    { pattern: /return|exchange|refund/i, label: 'Return and exchange policy' },
    { pattern: /hours|open|close|location|address|visit/i, label: 'Store hours and location' },
    { pattern: /size|sizing|fit|measurement|dimension/i, label: 'Sizing / fit / dimensions' },
    { pattern: /in.stock|availability|back.?order|restock|sold.out/i, label: 'Stock availability and restocks' },
    { pattern: /material|fabric|made.(?:of|in|from)|sourc|ingredient/i, label: 'Materials, sourcing, and care' },
    { pattern: /payment|pay|afterpay|klarna|paypal|credit.card/i, label: 'Payment options' },
    { pattern: /pickup|curbside|local.deliver/i, label: 'Local pickup or delivery' },
    { pattern: /gift.card|gift.wrap|registry/i, label: 'Gift cards and gift options' },
    { pattern: /discount|sale|promo|coupon|loyalty|reward/i, label: 'Sales, discounts, and loyalty program' },
    { pattern: /warranty|guarantee|repair/i, label: 'Warranty or guarantee' },
  ],
  exampleBuyerQuestion: 'what is your return policy and how long does shipping take?',
  searchQueryExample: '[product] shop near me',
  rankingPhraseTemplate: '[product type] shop in {city}, {state}',
  socialProofWhy:
    'Shoppers can\'t touch the product before buying — reviews and customer photos stand in for in-person inspection, and thin proof sends the sale to Amazon.',
  faqWhy:
    'Shipping, returns, and sizing questions are the top causes of abandoned carts — every unanswered question at checkout is a lost order.',
  mobileWhy:
    'The majority of e-commerce browsing happens on phones. A product grid or checkout that fights the thumb loses the sale before the cart.',
  bannedWordExample:
    'Replace banned words with specific, evidence-based language. Instead of "premium quality," name the material and maker: "full-grain Horween leather, cut and stitched in our Portland workshop."',
  entityDisambiguationExample:
    'Pair the shop name with a city/neighborhood in the homepage hero, footer address block, and `<title>` tag (e.g. "Forge & Filament — letterpress stationery shop in Asheville, NC").',
};

const homeServices: VerticalPack = {
  noun: 'home services company',
  buyer: 'homeowners',
  expectedPages: [
    { pattern: /service|repair|install|replace|what.we.do/i, label: 'Individual service pages', priority: 'p0' },
    { pattern: /contact|estimate|quote|schedule|book/i, label: 'Contact / free estimate page', priority: 'p0' },
    { pattern: /service.area|areas.we.serve|location|coverage/i, label: 'Service area page', priority: 'p1' },
    { pattern: /about|our.team|why.us|our.story/i, label: 'About / Why choose us page', priority: 'p1' },
    { pattern: /review|testimonial|happy.customer/i, label: 'Reviews or testimonials page', priority: 'p1' },
    { pattern: /gallery|project|before.after|our.work|portfolio/i, label: 'Project gallery / before-and-after page', priority: 'p1' },
    { pattern: /faq|questions/i, label: 'FAQ page', priority: 'p1' },
    { pattern: /financ|payment.plan/i, label: 'Financing options page', priority: 'p2' },
    { pattern: /emergency|24.7|same.day/i, label: 'Emergency service page', priority: 'p2' },
    { pattern: /coupon|special|offer|discount/i, label: 'Specials or coupons page', priority: 'p2' },
  ],
  directories: [
    { pattern: /angi\.com|angieslist\.com/i, label: 'Angi' },
    { pattern: /houzz\.com/i, label: 'Houzz' },
    { pattern: /thumbtack\.com/i, label: 'Thumbtack' },
    { pattern: /bbb\.org/i, label: 'Better Business Bureau' },
    { pattern: /yelp\.com/i, label: 'Yelp' },
    { pattern: /google.*business|maps\.google/i, label: 'Google Business Profile' },
  ],
  expectedTopics: [
    { pattern: /service.area|areas.we.serve|county|surrounding|within.\d+.miles/i, label: 'Service area / coverage radius' },
    { pattern: /licens|insur|bonded|certif/i, label: 'Licensing, bonding, and insurance' },
    { pattern: /estimate|quote|consultation|free/i, label: 'Free estimates / how quoting works' },
    { pattern: /emergency|same.day|24.7|after.hours|weekend/i, label: 'Emergency / same-day availability' },
    { pattern: /price|pricing|cost|rate|fee|how.much/i, label: 'Pricing or typical job costs' },
    { pattern: /financ|payment.plan|payment.option/i, label: 'Financing and payment options' },
    { pattern: /warranty|guarantee|workmanship/i, label: 'Warranty / workmanship guarantee' },
    { pattern: /how.long|timeline|process|what.to.expect|step/i, label: 'Job timeline and process' },
    { pattern: /brand|equipment|carrier|trane|lennox|kohler|parts/i, label: 'Brands and equipment used' },
    { pattern: /permit|code|inspection/i, label: 'Permits and code compliance' },
    { pattern: /maintenance|tune.up|service.plan|membership/i, label: 'Maintenance plans' },
    { pattern: /review|testimonial|reference/i, label: 'Reviews and references' },
  ],
  exampleBuyerQuestion: 'are you licensed and insured, and do you offer free estimates?',
  searchQueryExample: 'plumber near me',
  rankingPhraseTemplate: '[trade] in {city}, {state}',
  socialProofWhy:
    'Hiring a contractor means letting a stranger into the house — reviews, job photos, and license numbers are the trust gate before anyone calls.',
  faqWhy:
    'Homeowners compare 2-3 contractors on licensing, estimates, and scheduling before calling — unanswered basics send them to the next search result.',
  mobileWhy:
    'Urgent repairs get searched from a phone, often mid-emergency. A slow mobile site or buried phone number loses the job to whoever answers fastest.',
  bannedWordExample:
    'Replace banned words with specific, evidence-based language. Instead of "quality workmanship," cite the credential and guarantee: "licensed master plumber (NY #M-12345) with a 2-year labor warranty on every repair."',
  entityDisambiguationExample:
    'Pair the company name with a city/region in the homepage hero, footer address block, and `<title>` tag (e.g. "Reliable Air — HVAC contractor in Plano, TX").',
};

const medical: VerticalPack = {
  noun: 'medical practice',
  buyer: 'patients',
  expectedPages: [
    { pattern: /service|treatment|procedure|condition|specialt/i, label: 'Services or treatments pages', priority: 'p0' },
    { pattern: /appointment|book|schedule|request.a.visit/i, label: 'Appointment booking page', priority: 'p0' },
    { pattern: /contact|location|directions|office/i, label: 'Contact and location page', priority: 'p0' },
    { pattern: /provider|doctor|dentist|physician|team|staff|meet/i, label: 'Providers / Meet the team page', priority: 'p1' },
    { pattern: /insurance|payment|billing|financ/i, label: 'Insurance and payment page', priority: 'p1' },
    { pattern: /new.patient|patient.form|patient.portal|first.visit/i, label: 'New patient / forms page', priority: 'p1' },
    { pattern: /about|our.practice|mission/i, label: 'About the practice page', priority: 'p1' },
    { pattern: /faq|questions|what.to.expect/i, label: 'FAQ / What to expect page', priority: 'p1' },
    { pattern: /review|testimonial|patient.stor/i, label: 'Patient reviews page', priority: 'p2' },
    { pattern: /blog|resource|education|article/i, label: 'Patient education / blog', priority: 'p2' },
  ],
  directories: [
    { pattern: /zocdoc\.com/i, label: 'Zocdoc' },
    { pattern: /healthgrades\.com/i, label: 'Healthgrades' },
    { pattern: /vitals\.com/i, label: 'Vitals' },
    { pattern: /yelp\.com/i, label: 'Yelp' },
    { pattern: /facebook\.com/i, label: 'Facebook' },
    { pattern: /google.*business|maps\.google/i, label: 'Google Business Profile' },
  ],
  expectedTopics: [
    { pattern: /insurance|in.network|aetna|cigna|united|blue.cross|medicare|medicaid/i, label: 'Insurance plans accepted' },
    { pattern: /new.patient|accepting|first.visit|what.to.expect/i, label: 'New patient process / what to expect' },
    { pattern: /appointment|book|schedule|same.day|walk.in/i, label: 'Booking and same-day availability' },
    { pattern: /hours|open|close|location|parking|directions/i, label: 'Hours, location, and parking' },
    { pattern: /cost|price|self.pay|out.of.pocket|payment.plan|financ/i, label: 'Costs and self-pay pricing' },
    { pattern: /board.certified|credential|residency|training|dds|md|np/i, label: 'Provider credentials' },
    { pattern: /cancel|reschedule|no.show|late/i, label: 'Cancellation and no-show policy' },
    { pattern: /telehealth|virtual.visit|video.visit/i, label: 'Telehealth availability' },
    { pattern: /emergency|after.hours|urgent|on.call/i, label: 'Emergencies and after-hours care' },
    { pattern: /form|paperwork|portal|records|bring/i, label: 'Forms and what to bring' },
    { pattern: /age|pediatric|child|family|adult|senior/i, label: 'Ages and patients treated' },
    { pattern: /referral|prescription|refill/i, label: 'Referrals and prescription refills' },
  ],
  exampleBuyerQuestion: 'do you accept my insurance and are you taking new patients?',
  searchQueryExample: 'dentist near me accepting new patients',
  rankingPhraseTemplate: '[specialty] in {city}, {state}',
  socialProofWhy:
    'Choosing a provider is a health-and-trust decision — patients read reviews about bedside manner, wait times, and billing surprises before they book.',
  faqWhy:
    'Insurance, cost, and what-to-expect questions block bookings — answering them on-page wins the appointment and cuts front-desk call volume.',
  mobileWhy:
    'Patients search for care on a phone, often while in discomfort. Click-to-call and one-tap booking are the difference between a new patient and a bounce.',
  bannedWordExample:
    'Replace banned words with specific, evidence-based language. Instead of "state-of-the-art care," name the credential or technology: "board-certified dermatologists using the Vbeam Prima pulsed-dye laser."',
  entityDisambiguationExample:
    'Pair the practice name with a city/region in the homepage hero, footer address block, and `<title>` tag (e.g. "Lakeview Dental — family dentist in Evanston, IL").',
};

const fitness: VerticalPack = {
  noun: 'fitness studio',
  buyer: 'prospective members',
  expectedPages: [
    { pattern: /class|schedule|timetable|calendar/i, label: 'Class schedule page', priority: 'p0' },
    { pattern: /member|pricing|plan|rate|package|drop.in/i, label: 'Membership and pricing page', priority: 'p0' },
    { pattern: /contact|join|trial|free.class|get.started|sign.up/i, label: 'Contact / trial sign-up page', priority: 'p0' },
    { pattern: /trainer|instructor|coach|team|staff/i, label: 'Trainers / instructors page', priority: 'p1' },
    { pattern: /about|our.story|philosophy|method/i, label: 'About / training philosophy page', priority: 'p1' },
    { pattern: /faq|questions|new.member|first.visit/i, label: 'FAQ / first-visit page', priority: 'p1' },
    { pattern: /hours|location|directions|parking/i, label: 'Hours and location page', priority: 'p1' },
    { pattern: /gallery|facility|tour|space|photo/i, label: 'Facility gallery or tour page', priority: 'p2' },
    { pattern: /personal.training|private|one.on.one/i, label: 'Personal training page', priority: 'p2' },
    { pattern: /event|workshop|challenge|community/i, label: 'Events or challenges page', priority: 'p2' },
  ],
  directories: [
    { pattern: /classpass\.com/i, label: 'ClassPass' },
    { pattern: /mindbodyonline\.com|mindbody\.io/i, label: 'Mindbody' },
    { pattern: /yelp\.com/i, label: 'Yelp' },
    { pattern: /facebook\.com/i, label: 'Facebook' },
    { pattern: /instagram\.com/i, label: 'Instagram' },
    { pattern: /google.*business|maps\.google/i, label: 'Google Business Profile' },
  ],
  expectedTopics: [
    { pattern: /schedule|class.time|timetable|when/i, label: 'Class schedule and times' },
    { pattern: /price|pricing|membership|cost|rate|month|unlimited/i, label: 'Membership pricing and plans' },
    { pattern: /trial|first.class|intro|free.class|new.member/i, label: 'Free trial / intro offer' },
    { pattern: /beginner|all.levels|new.to|first.time|modif/i, label: 'Beginner-friendliness and levels' },
    { pattern: /bring|wear|shoes|towel|mat|water/i, label: 'What to bring and wear' },
    { pattern: /cancel|freeze|pause|contract|commitment/i, label: 'Cancellation / freeze policy' },
    { pattern: /drop.in|punch|class.pack|single.class/i, label: 'Drop-in rates and class packs' },
    { pattern: /coach|trainer|instructor|certif/i, label: 'Coach and instructor credentials' },
    { pattern: /shower|locker|amenit|parking/i, label: 'Showers, lockers, parking, amenities' },
    { pattern: /personal.training|private.session|one.on.one/i, label: 'Personal training options' },
    { pattern: /child.?care|kids|family/i, label: 'Childcare and kids programs' },
    { pattern: /community|event|challenge|workshop/i, label: 'Community events and challenges' },
  ],
  exampleBuyerQuestion: 'do you offer a free trial class and is it okay if I am a complete beginner?',
  searchQueryExample: 'gyms with classes near me',
  rankingPhraseTemplate: '[class type] studio in {city}, {state}',
  socialProofWhy:
    'Joining a gym is an identity decision made nervously — member stories and visible results do more than any equipment list to get someone through the door.',
  faqWhy:
    'Pricing, trial offers, and "will I fit in as a beginner" questions decide whether someone books a first class — every unanswered one is a no-show.',
  mobileWhy:
    'Schedules get checked from phones between meetings and after work. A class schedule that does not load cleanly on mobile loses the drop-in.',
  bannedWordExample:
    'Replace banned words with specific, evidence-based language. Instead of "transform your body," state the program and dose: "a 12-week strength program with two coached sessions per week."',
  entityDisambiguationExample:
    'Pair the studio name with a city/neighborhood in the homepage hero, footer address block, and `<title>` tag (e.g. "Ironworks — strength gym in Boise, ID").',
};

const nonprofit: VerticalPack = {
  noun: 'nonprofit organization',
  buyer: 'donors and volunteers',
  expectedPages: [
    { pattern: /donat|give|support.us|contribute/i, label: 'Donate page', priority: 'p0' },
    { pattern: /mission|about|who.we.are|our.story/i, label: 'Mission / About page', priority: 'p0' },
    { pattern: /contact|reach.us|get.in.touch/i, label: 'Contact page', priority: 'p0' },
    { pattern: /program|what.we.do|service|initiative/i, label: 'Programs / What we do pages', priority: 'p1' },
    { pattern: /volunteer|get.involved|take.action|join/i, label: 'Volunteer / Get involved page', priority: 'p1' },
    { pattern: /impact|results|annual.report|financial|990/i, label: 'Impact / financials page', priority: 'p1' },
    { pattern: /event|fundrais|gala|drive/i, label: 'Events or fundraisers page', priority: 'p2' },
    { pattern: /board|leadership|team|staff/i, label: 'Board and leadership page', priority: 'p2' },
    { pattern: /news|blog|stories|update/i, label: 'News or stories page', priority: 'p2' },
    { pattern: /faq|questions/i, label: 'FAQ page', priority: 'p2' },
  ],
  directories: [
    { pattern: /guidestar\.org|candid\.org/i, label: 'Candid (GuideStar)' },
    { pattern: /charitynavigator\.org/i, label: 'Charity Navigator' },
    { pattern: /greatnonprofits\.org/i, label: 'GreatNonprofits' },
    { pattern: /give\.org/i, label: 'BBB Wise Giving Alliance' },
    { pattern: /facebook\.com/i, label: 'Facebook' },
    { pattern: /instagram\.com/i, label: 'Instagram' },
  ],
  expectedTopics: [
    { pattern: /mission|serve|who.we.(?:help|serve)|communit/i, label: 'Mission and who you serve' },
    { pattern: /donat.*(?:used|go|fund)|overhead|program.expense|where.*money/i, label: 'How donations are used' },
    { pattern: /tax.deduct|501\(?c\)?\(?3\)?|ein|nonprofit.status/i, label: 'Tax-deductibility and 501(c)(3) status' },
    { pattern: /volunteer|get.involved|sign.up|opportunit/i, label: 'Volunteer opportunities and sign-up' },
    { pattern: /program|service|initiative|project/i, label: 'Programs and services offered' },
    { pattern: /impact|outcome|served|provided|\d+.(?:meals|families|students|acres|animals)/i, label: 'Impact numbers and outcomes' },
    { pattern: /monthly.giv|recurring|planned.giv|legacy|in.kind|stock|donor.advised/i, label: 'Ways to give (monthly, planned, in-kind)' },
    { pattern: /event|gala|fundrais|walk|drive/i, label: 'Events and fundraisers' },
    { pattern: /board|leadership|director|founder/i, label: 'Board and leadership' },
    { pattern: /annual.report|financial|audit|990|transparen/i, label: 'Financial transparency / annual report' },
    { pattern: /newsletter|subscribe|stay.connected|updates/i, label: 'Newsletter / staying connected' },
    { pattern: /partner|sponsor|corporate/i, label: 'Corporate partnership and sponsorship' },
  ],
  exampleBuyerQuestion: 'how much of my donation goes directly to programs?',
  searchQueryExample: 'volunteer opportunities near me',
  rankingPhraseTemplate: '[cause] nonprofit in {city}, {state}',
  socialProofWhy:
    'Donors give to organizations they trust — beneficiary stories, concrete impact numbers, and third-party ratings like Charity Navigator decide gifts.',
  faqWhy:
    'Donors ask about tax-deductibility and overhead before giving, and volunteers ask about time commitment — unanswered questions stall both.',
  mobileWhy:
    'Donation links shared on social media open on phones. A clunky mobile donate flow loses the impulse gift that prompted the tap.',
  bannedWordExample:
    'Replace banned words with specific, evidence-based language. Instead of "making a difference," quantify the outcome: "1,200 meals delivered to homebound seniors every month."',
  entityDisambiguationExample:
    'Pair the organization name with a city/region in the homepage hero, footer address block, and `<title>` tag (e.g. "River Relief — watershed conservation nonprofit in Missoula, MT").',
};

const generic: VerticalPack = {
  noun: 'small business',
  buyer: 'prospective customers',
  expectedPages: [
    { pattern: /pricing|packages|rates|fees|cost/i, label: 'Pricing or packages page', priority: 'p0' },
    { pattern: /contact|inquir|reach.us|book/i, label: 'Contact or inquiry page', priority: 'p0' },
    { pattern: /about|our.story|team|staff/i, label: 'About page', priority: 'p1' },
    { pattern: /faq|questions/i, label: 'FAQ page', priority: 'p1' },
    { pattern: /service|product|offer/i, label: 'Services or products page', priority: 'p1' },
    { pattern: /gallery|portfolio|photos|case.stud/i, label: 'Gallery or portfolio page', priority: 'p2' },
    { pattern: /testimonial|review/i, label: 'Testimonials or reviews page', priority: 'p2' },
  ],
  directories: [
    { pattern: /yelp\.com/i, label: 'Yelp' },
    { pattern: /facebook\.com/i, label: 'Facebook' },
    { pattern: /instagram\.com/i, label: 'Instagram' },
    { pattern: /google.*business|maps\.google/i, label: 'Google Business Profile' },
  ],
  expectedTopics: [
    { pattern: /service|product|offer|what.we.do/i, label: 'Services or products offered' },
    { pattern: /pricing|cost|rate|fee|package/i, label: 'Pricing or cost information' },
    { pattern: /contact|phone|email|location|address|hour/i, label: 'Contact info, hours, and location' },
    { pattern: /testimonial|review|client/i, label: 'Customer testimonials or reviews' },
    { pattern: /faq|question|how.do|can.i/i, label: 'Common questions / FAQ' },
    { pattern: /about|story|founded|since/i, label: 'About / company story' },
  ],
  exampleBuyerQuestion: 'do you offer [my specific need] and how much does it cost?',
  searchQueryExample: '[your service] near me',
  rankingPhraseTemplate: '[your service] in {city}, {state}',
  socialProofWhy:
    'Customers check reviews and testimonials before they buy. Missing or thin social proof shifts the decision toward a competitor.',
  faqWhy:
    'Customers have predictable questions before they reach out. Answering them on-page reduces friction and converts more inquiries.',
  mobileWhy:
    'Most local-business traffic is mobile. A broken mobile experience directly costs inquiries.',
  bannedWordExample:
    'Replace banned words with specific, evidence-based language. Name the actual feature, person, or number rather than using a generic superlative.',
  entityDisambiguationExample:
    'Pair the business name with a city/region in the homepage hero, footer address block, and `<title>` tag (e.g. "Acme — [business type] in [City], [State]").',
};

const PACKS: Record<Vertical, VerticalPack> = {
  'wedding-venue': wedding,
  preschool,
  restaurant,
  'professional-services': professionalServices,
  retail,
  'home-services': homeServices,
  medical,
  fitness,
  nonprofit,
  generic,
};

/**
 * Resolve the copy / heuristic pack for a vertical. Falls back to the
 * `generic` pack when the vertical is unset or unrecognized.
 */
export function getVerticalPack(vertical?: Vertical | string): VerticalPack {
  if (!vertical) return PACKS.generic;
  if (vertical in PACKS) return PACKS[vertical as Vertical];
  return PACKS.generic;
}
