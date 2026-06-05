/**
 * Reproducible parity evidence for docs/chatbot-vs-static-form-parity.md.
 *
 * This is the machine-checked half of the gated "can we retire the static
 * interview form?" decision. It asserts the coverage DELTA between the static
 * `interview-guide.md → FormSpec` pipeline and the coverage chatbot. If anyone
 * later rewires MUST_ASK / the HV registry / the chatbot whitelist, this test
 * fails and the parity document must be revisited before any retirement.
 *
 * Headline (see the doc for the full argument): the chatbot fills 3 of the 18
 * must-ask fields; the static form covers the whole intake surface.
 */
import { strict as assert } from 'node:assert';
import { describe, it } from 'node:test';

import { MUST_ASK, isHumanVerifyRequired } from '@upriver/schemas';
import { parseInterviewGuide } from '@upriver/core';

import { CHATBOT_FILLABLE, isChatbotFillable } from '../src/lib/profile-coverage.js';

// The documented snapshot (docs/chatbot-vs-static-form-parity.md §2, §4). These
// numbers ARE the evidence — pin them so drift is loud.
const EXPECTED = {
  mustAskTotal: 18,
  session: 8,
  operatorOnly: 3,
  chatbotBucket: 7,
  chatbotHvBlocked: 4,
  chatbotFillable: 3,
  uncoverable: 15, // session + operator + HV-in-chatbot-bucket
};

const CHATBOT_FILLABLE_EXPECTED = [
  'people.keyTeam',
  'operationsAutomation.recurringTasks',
  'content.productionCapacity',
];

describe('parity evidence — chatbot vs. interview-guide.md → FormSpec', () => {
  const byVia = (via: string) => MUST_ASK.filter((e) => e.askVia === via);
  const chatbotBucket = byVia('chatbot');
  const chatbotHvBlocked = chatbotBucket.filter((e) => isHumanVerifyRequired(e.path));
  const chatbotFillableDerived = chatbotBucket.filter((e) => !isHumanVerifyRequired(e.path));

  it('MUST_ASK routes 8 session / 7 chatbot / 3 operator (18 total)', () => {
    assert.equal(MUST_ASK.length, EXPECTED.mustAskTotal);
    assert.equal(byVia('session').length, EXPECTED.session);
    assert.equal(chatbotBucket.length, EXPECTED.chatbotBucket);
    assert.equal(byVia('operator').length, EXPECTED.operatorOnly);
  });

  it('the chatbot can fill exactly 3 fields — the chatbot bucket minus 4 HV fields', () => {
    assert.equal(chatbotHvBlocked.length, EXPECTED.chatbotHvBlocked);
    assert.equal(chatbotFillableDerived.length, EXPECTED.chatbotFillable);
    // The derived whitelist matches the exported one and the documented list.
    assert.deepEqual(
      [...CHATBOT_FILLABLE].sort(),
      [...CHATBOT_FILLABLE_EXPECTED].sort(),
    );
    assert.deepEqual(
      chatbotFillableDerived.map((e) => e.path).sort(),
      [...CHATBOT_FILLABLE_EXPECTED].sort(),
    );
    // Every fillable field is non-HV and passes the endpoint's gate.
    for (const path of CHATBOT_FILLABLE) {
      assert.equal(isHumanVerifyRequired(path), false, `${path} must not be HV`);
      assert.equal(isChatbotFillable(path), true, `${path} must be chatbot-fillable`);
    }
  });

  it('15 must-ask fields are uncoverable by the chatbot (session + operator + HV)', () => {
    const uncoverable = [
      ...byVia('session'),
      ...byVia('operator'),
      ...chatbotHvBlocked,
    ];
    assert.equal(uncoverable.length, EXPECTED.uncoverable);
    // None of them can be written through the chatbot endpoint.
    for (const e of uncoverable) {
      assert.equal(isChatbotFillable(e.path), false, `${e.path} must NOT be chatbot-fillable`);
    }
    // Spot-check the session spine the chatbot is explicitly told to avoid.
    for (const path of ['voice.attributes', 'pricing.nonShareable', 'goals.redLines', 'salesProcess.close.definition']) {
      assert.ok(!CHATBOT_FILLABLE.includes(path), `${path} is session/HV, not chatbot`);
    }
  });

  it('a representative interview-guide.md parses to far more items than the chatbot fills', () => {
    const spec = parseInterviewGuide(REPRESENTATIVE_GUIDE);
    // The static form surface dwarfs the 3-field chatbot gap.
    assert.ok(
      spec.totalItems >= 15,
      `expected a broad FormSpec, got ${spec.totalItems} items`,
    );
    assert.ok(spec.totalItems > CHATBOT_FILLABLE.length * 4);
    // It spans sections the chatbot has no field for at all.
    const titles = spec.sections.map((s) => s.title.toLowerCase()).join(' | ');
    assert.match(titles, /voice/);
    assert.match(titles, /override/);
    // And it collects free-text answers (kind 'q' / 'check' / 'override'),
    // none of which map 1:1 to a chatbot-writable profile path.
    const kinds = new Set(spec.sections.flatMap((s) => s.items.map((i) => i.kind)));
    assert.ok(kinds.has('q'));
    assert.ok(kinds.has('check'));
    assert.ok(kinds.has('override'));
  });
});

/**
 * A compact but structurally faithful `interview-guide.md`, modeled on the
 * `interview-prep.ts` output contract (FAQ questions, voice probes, asset
 * checklist, integration questions, override prompts) and Doc 14 §3's 7-section
 * questionnaire. Trimmed for the test; the real guide carries ~100 FAQ questions.
 */
const REPRESENTATIVE_GUIDE = `# Interview Guide — Little Friends

> How to use this guide: walk through it with the client over ~60 minutes.

## 1. Customized FAQ Questions

### 1.1 High-priority (AEO gaps)
1. What ages do you accept, and is there a waitlist? *(why: AEO gap — assistants can't answer this today)*
2. What does a typical day look like, hour by hour?
3. How do you handle allergies and dietary restrictions?

### 1.2 Sales / conversion gaps
4. What is your tuition, and what does it include?
5. How does enrollment work, start to finish?
6. What makes a family a good fit for you?

### 1.3 Standard coverage
7. What are your hours and closure days?
8. What is your sick-child policy?

## 2. Brand Voice Probes

### Probe 1: Origin story
**Ask**: Why did you start Little Friends?
**Listen for**: specific, textured language in the owner's own words.

### Probe 2: The hard moment
**Ask**: Tell me about a time a family was upset and you made it right.

## 3. Asset Gap Checklist

### 3.1 Photography we need
- [ ] Exterior signage shot
- [ ] Classroom in use (children blurred)

### 3.2 Logo / brand files
- [ ] Logo SVG

## 4. Technical Integration Questions

9. How do inquiries reach you today, and who answers them?
10. What scheduling tool do you use for tours, if any?
11. Where do you store photos and videos?

## 5. Aesthetic and Strategic Overrides

### Override 1: Publish pricing
**Audit said**: publish tuition on the site.
**Ask the client**: are you comfortable showing pricing publicly?

### Override 2: Homepage hero
**Audit said**: lead with outcomes, not a stock photo.
**Ask the client**: does that fit how you want to be seen?
`;
