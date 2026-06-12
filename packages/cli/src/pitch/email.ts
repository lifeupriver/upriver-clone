// Pitch outreach email assembly (Spec 19 §8). Pure templating, zero network.
// `pitch run` writes the draft (with compliance placeholders — the
// unsubscribe URL needs the shared secret and the postal line needs operator
// config, both of which belong to the SEND step); `pitch approve` finalizes
// and is the only path that sends.

export const UNSUBSCRIBE_PLACEHOLDER = '{{UNSUBSCRIBE_URL}}';
export const POSTAL_PLACEHOLDER = '{{POSTAL_ADDRESS}}';

export interface PitchEmailInput {
  businessName: string;
  previewUrl: string;
  questionnaireUrl: string;
  /** Sender display name for the sign-off. */
  fromName?: string;
}

export interface PitchEmailDraft {
  v: 1;
  subject: string;
  text: string;
  createdAt: string;
}

export function buildPitchEmailDraft(input: PitchEmailInput): PitchEmailDraft {
  const signoff = input.fromName ?? 'The Upriver team';
  const subject = `We rebuilt ${input.businessName}'s homepage — here's the preview`;
  const text = `Hi,

We work on websites for small businesses, and ${input.businessName}'s caught our eye. So we did something a little unusual: we rebuilt your homepage as a working preview, using only what's already public on your site. Nothing on your actual website has been changed — this is a demonstration, built unprompted, of what we'd do with it.

See the preview here (it expires in about two weeks):
${input.previewUrl}

Alongside it you'll find a short write-up: what we'd improve first, and a sample of your own copy, sharpened.

If you have three minutes, eight quick questions tell us what we got right (and wrong):
${input.questionnaireUrl}

Everything in the preview came from automated research on your public site, so corrections are welcome — that's half the point of asking.

If you'd rather we take the preview down, reply with "take it down" and it's gone the same day.

${signoff}

--
${POSTAL_PLACEHOLDER}
Don't want to hear from us again? One click and you won't: ${UNSUBSCRIBE_PLACEHOLDER}
`;
  return { v: 1, subject, text, createdAt: new Date().toISOString() };
}

export function finalizeEmailText(
  text: string,
  fill: { unsubscribeUrl: string; postalAddress: string },
): string {
  return text
    .split(UNSUBSCRIBE_PLACEHOLDER)
    .join(fill.unsubscribeUrl)
    .split(POSTAL_PLACEHOLDER)
    .join(fill.postalAddress);
}
