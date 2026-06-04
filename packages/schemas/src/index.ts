// @upriver/schemas — the Client Profile contract for the Intake & Profile Engine.
// Everything else (generate, profile commands, recon, the dashboard chatbot, the
// ClientIntake migration) imports from here; nothing else defines profile shapes.

// Envelope, merge semantics, and the human-verify-required registry.
export * from './envelope.js';
export * from './merge.js';
export * from './hv.js';

// Core sections (each re-exports its item schemas; the fat ones re-export parts).
export * from './sections/identity.js';
export * from './sections/people.js';
export * from './sections/offerings.js';
export * from './sections/pricing.js';
export * from './sections/capacity.js';
export * from './sections/customers.js';
export * from './sections/positioning.js';
export * from './sections/voice.js';
export * from './sections/salesProcess.js';
export * from './sections/content.js';
export * from './sections/competitors.js';
export * from './sections/seo.js';
export * from './sections/toolsAndAccess.js';
export * from './sections/operationsAutomation.js';
export * from './sections/governance.js';
export * from './sections/goals.js';
export * from './sections/auditDecisions.js';

// Industry modules.
export * from './modules/preschool.js';
export * from './modules/venue.js';
export * from './modules/contractor.js';
export * from './modules/restaurant.js';

// Composition, coverage map, and coverage math.
export * from './client-profile.js';
export * from './coverage-map.js';
export * from './coverage.js';
