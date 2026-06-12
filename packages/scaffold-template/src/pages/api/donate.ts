import type { APIRoute } from 'astro';
import { handleInquiry } from './inquiry';

export const prerender = false;

// Donation-form endpoint — the `upriver clone` pass wires source-site
// donation forms here. There is NO payment processing in the scaffold:
// the submission is recorded as an inquiry (message prefixed with
// "[donation form]") so the client can follow up from /admin/inquiries.
export const POST: APIRoute = ({ request }) => handleInquiry(request, 'donation');
