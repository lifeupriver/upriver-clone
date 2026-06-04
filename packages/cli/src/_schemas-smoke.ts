// Smoke import — proves @upriver/schemas resolves and type-checks from the CLI
// build. Not wired into any command; the real consumers (the `profile`,
// `generate`, and `recon` commands) land in Build Spec 02+.
import { clientProfileZ } from '@upriver/schemas';

export const __schemasSmoke: unknown = clientProfileZ;
