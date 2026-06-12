// The prospect questionnaire (Spec 19 §7): a SHORT interview guide written
// to `clients/<slug>/interview-guide.md` by `pitch run` and served by the
// existing dashboard interview route. Section titles are load-bearing —
// `parseInterviewGuide` derives item ids from them (`about-you-q3`), and
// `answer-mapping.ts` keys the profile bridge on those ids. Change a title
// or question order and the mapping breaks; the tests pin both.

export const PROSPECT_QUESTION_COUNT = 8;

export function buildProspectInterviewGuide(businessName: string): string {
  return `# A few questions from Upriver — ${businessName}

We built the preview you just saw from ${businessName}'s public website alone.
These eight questions take about three minutes and tell us what we got right.

## About you

1. Your name, and your role at ${businessName}? *(why: so we know who we're talking with)*
2. The business name, exactly as you'd like it shown to customers? *(why: we pulled it from your site and want it right)*
3. The best email address to reach you? *(why: so we can follow up where you'll see it)*
4. The best phone number to reach you? *(why: some things are faster on a call)*

## Your reaction

1. What's your first impression of the preview rebuild? *(why: your gut read tells us more than any checklist)*
2. Did we get anything wrong — facts, wording, photos, anything? *(why: everything came from automated research; corrections make it yours)*

## Your goals

1. What's the biggest thing you want your website to do for the business this year? *(why: the rebuild should aim at that, not at trends)*
2. If you decided to move forward, what timeline would feel right? *(why: so we plan around your season, not ours)*
`;
}
