import { Inngest } from 'inngest';

/**
 * Inngest client used by both the worker package (to define functions) and the
 * dashboard (to send events). Client id is the stable Inngest "app" identifier
 * — changing it would orphan in-flight runs, so don't.
 *
 * Event signing key + serve URL are configured at the runtime boundary
 * (Inngest dev server locally, INNGEST_EVENT_KEY + INNGEST_SIGNING_KEY in
 * hosted environments). The client itself stays env-agnostic.
 */
export const inngest = new Inngest({ id: 'upriver-platform' });
