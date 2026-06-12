import { scryptSync, timingSafeEqual } from 'node:crypto';

import { Octokit } from '@octokit/rest';
import bcrypt from 'bcryptjs';

// Node runtime required: crypto.scryptSync + bcryptjs.
export const runtime = 'nodejs';

interface SubmitBody {
  pin?: string;
  what: string;
  where?: string;
}

/**
 * Generic failure message. Deliberately identical for "wrong PIN", "missing
 * PIN", and any other auth-shaped failure so the public endpoint never
 * confirms whether a PIN was close, or whether this form is the one a probe
 * was looking for.
 */
const GENERIC_FAIL = { ok: false, message: 'Could not verify your request. Check with us for the current PIN.' };

// ---------------------------------------------------------------------------
// Per-IP rate limiting — in-memory token bucket, 5 requests/minute.
//
// LIMITATION: this is process-local state. It works because this form deploys
// as a single small Vercel/Next.js app where one warm serverless instance
// handles the (tiny) traffic; with multiple concurrent instances each gets
// its own bucket, so the effective ceiling is 5/min per instance. Good enough
// to make 6-digit PIN guessing impractical (10^6 / 5-per-min is ~139 days of
// sustained guessing against one instance); revisit with a shared store if
// this form ever gets real traffic.
// ---------------------------------------------------------------------------
const BUCKET_CAPACITY = 5;
const REFILL_PER_MS = BUCKET_CAPACITY / 60_000; // 5 tokens per minute
const MAX_TRACKED_IPS = 10_000;

const buckets = new Map<string, { tokens: number; lastMs: number }>();

function allowRequest(ip: string, nowMs: number = Date.now()): boolean {
  let bucket = buckets.get(ip);
  if (!bucket) {
    // Cap memory under address-spoofing floods: drop the oldest entry.
    if (buckets.size >= MAX_TRACKED_IPS) {
      const oldest = buckets.keys().next().value;
      if (oldest !== undefined) buckets.delete(oldest);
    }
    bucket = { tokens: BUCKET_CAPACITY, lastMs: nowMs };
    buckets.set(ip, bucket);
  }
  bucket.tokens = Math.min(BUCKET_CAPACITY, bucket.tokens + (nowMs - bucket.lastMs) * REFILL_PER_MS);
  bucket.lastMs = nowMs;
  if (bucket.tokens < 1) return false;
  bucket.tokens -= 1;
  return true;
}

function clientIp(req: Request): string {
  // Vercel sets x-forwarded-for; first hop is the client.
  const fwd = req.headers.get('x-forwarded-for');
  if (fwd) return fwd.split(',')[0]?.trim() || 'unknown';
  return req.headers.get('x-real-ip') ?? 'unknown';
}

// ---------------------------------------------------------------------------
// PIN verification.
//
// Preferred format (minted by `upriver admin-deploy` / `admin-rotate-pin`):
//   scrypt$<N>$<r>$<p>$<saltHex>$<hashHex>
// (mirrors packages/cli/src/admin/pin.ts — keep the two in sync).
// Legacy bcrypt hashes ($2a$... etc.) still verify so forms deployed before
// the scrypt scheme keep working until the PIN is rotated.
// ---------------------------------------------------------------------------
function verifyPinHash(pin: string, stored: string): boolean {
  try {
    if (stored.startsWith('scrypt$')) {
      const parts = stored.split('$');
      if (parts.length !== 6) return false;
      const [, nStr, rStr, pStr, saltHex, hashHex] = parts;
      const N = Number(nStr);
      const r = Number(rStr);
      const p = Number(pStr);
      if (!Number.isInteger(N) || !Number.isInteger(r) || !Number.isInteger(p)) return false;
      if (N <= 1 || N > 1 << 20 || r <= 0 || r > 64 || p <= 0 || p > 16) return false;
      if (!saltHex || !hashHex) return false;
      const salt = Buffer.from(saltHex, 'hex');
      const expected = Buffer.from(hashHex, 'hex');
      if (salt.length === 0 || expected.length === 0) return false;
      const actual = scryptSync(pin, salt, expected.length, { N, r, p });
      return actual.length === expected.length && timingSafeEqual(actual, expected);
    }
    return bcrypt.compareSync(pin, stored);
  } catch {
    return false;
  }
}

export async function POST(req: Request): Promise<Response> {
  if (!allowRequest(clientIp(req))) {
    return Response.json({ ok: false, message: 'Too many requests. Wait a minute and try again.' }, { status: 429 });
  }

  let body: SubmitBody;
  try {
    body = (await req.json()) as SubmitBody;
  } catch {
    return Response.json({ ok: false, message: 'Bad request.' }, { status: 400 });
  }

  // The PIN is MANDATORY. A deployment without FORM_PIN_HASH is closed, not
  // open: anyone on the internet can reach this route, and without the PIN it
  // would let strangers file issues (and burn the bot's Claude budget) on the
  // client's repo.
  const pinHash = process.env['FORM_PIN_HASH'];
  if (!pinHash) {
    return Response.json(
      { ok: false, message: 'This form is not configured yet. Email us instead.' },
      { status: 503 },
    );
  }
  if (typeof body.pin !== 'string' || body.pin.length === 0 || !verifyPinHash(body.pin, pinHash)) {
    return Response.json(GENERIC_FAIL, { status: 401 });
  }

  if (!body.what || body.what.trim().length < 5) {
    return Response.json({ ok: false, message: 'Please describe the change in a sentence or two.' }, { status: 400 });
  }

  const repo = process.env['GITHUB_REPO_TARGET'];
  const token = process.env['GITHUB_PAT'];
  if (!repo || !token) {
    return Response.json(
      { ok: false, message: 'Server is misconfigured. Email us instead.' },
      { status: 500 },
    );
  }
  const [owner, repoName] = repo.split('/');
  if (!owner || !repoName) {
    return Response.json({ ok: false, message: 'Server is misconfigured.' }, { status: 500 });
  }

  const octokit = new Octokit({ auth: token });
  try {
    const issue = await octokit.issues.create({
      owner,
      repo: repoName,
      title: `[change] ${body.what.split('\n')[0]?.slice(0, 80) ?? 'Change request'}`,
      body: [
        '### What should change?',
        body.what.slice(0, 12_000),
        '',
        '### Where on the site?',
        (body.where ?? 'Not specified').slice(0, 2_000),
        '',
        '_Submitted via the client form._',
      ].join('\n'),
      labels: ['change-request'],
    });
    return Response.json({
      ok: true,
      message: 'Got it. I will get to this within a day.',
      issueUrl: issue.data.html_url,
    });
  } catch (err) {
    return Response.json(
      { ok: false, message: 'Could not save your request. Email us directly.' },
      { status: 500 },
    );
  }
}
