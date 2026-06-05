import { strict as assert } from 'node:assert';
import { afterEach, describe, it } from 'node:test';

import type { SupabaseClient } from '@supabase/supabase-js';

import {
  InMemoryRateLimiter,
  SupabaseRateLimiter,
  createRateLimiterFromEnv,
  type RateLimiter,
} from '../src/lib/rate-limit.js';

const CFG = { windowMs: 1000, max: 3 };

/**
 * A mock Supabase client exposing only `.rpc()`. It emulates the
 * `rate_limit_hit` fixed-window counter: one running count per `p_bucket`,
 * returning the post-increment value. `failWith` forces every call to error.
 */
function mockRpcClient(opts: { failWith?: string } = {}): {
  client: SupabaseClient;
  calls: Array<{ name: string; params: Record<string, unknown> }>;
} {
  const counts = new Map<string, number>();
  const calls: Array<{ name: string; params: Record<string, unknown> }> = [];
  const client = {
    rpc(name: string, params: Record<string, unknown>) {
      calls.push({ name, params });
      if (opts.failWith) {
        return Promise.resolve({ data: null, error: { message: opts.failWith } });
      }
      const bucket = String(params['p_bucket']);
      const next = (counts.get(bucket) ?? 0) + 1;
      counts.set(bucket, next);
      return Promise.resolve({ data: next, error: null });
    },
  } as unknown as SupabaseClient;
  return { client, calls };
}

describe('InMemoryRateLimiter (local/dev fallback)', () => {
  it('allows max hits then limits the next, inside the window', async () => {
    const rl = new InMemoryRateLimiter(CFG);
    const now = 1_000_000;
    assert.equal(await rl.hit('tok', now), false); // 1
    assert.equal(await rl.hit('tok', now), false); // 2
    assert.equal(await rl.hit('tok', now), false); // 3
    assert.equal(await rl.hit('tok', now), true); // 4 — over
    assert.equal(await rl.hit('tok', now), true); // 5 — still over
  });

  it('isolates keys', async () => {
    const rl = new InMemoryRateLimiter(CFG);
    const now = 1_000_000;
    for (let i = 0; i < 3; i++) await rl.hit('a', now);
    assert.equal(await rl.hit('a', now), true);
    assert.equal(await rl.hit('b', now), false); // b has its own budget
  });

  it('forgets hits older than the window (sliding)', async () => {
    const rl = new InMemoryRateLimiter(CFG);
    for (let i = 0; i < 3; i++) await rl.hit('tok', 1_000_000);
    assert.equal(await rl.hit('tok', 1_000_000), true);
    // Advance past the window — the old hits age out.
    assert.equal(await rl.hit('tok', 1_000_000 + CFG.windowMs + 1), false);
  });

  it('reset() clears all counters', async () => {
    const rl = new InMemoryRateLimiter(CFG);
    for (let i = 0; i < 3; i++) await rl.hit('tok', 1_000_000);
    assert.equal(await rl.hit('tok', 1_000_000), true);
    await rl.reset();
    assert.equal(await rl.hit('tok', 1_000_000), false);
  });
});

describe('SupabaseRateLimiter (shared store)', () => {
  it('counts via the rpc and limits after max — coherent across calls', async () => {
    const { client, calls } = mockRpcClient();
    const rl = new SupabaseRateLimiter({ client, ...CFG });
    const now = 1_700_000_000_000;
    assert.equal(await rl.hit('tok', now), false); // count 1
    assert.equal(await rl.hit('tok', now), false); // 2
    assert.equal(await rl.hit('tok', now), false); // 3
    assert.equal(await rl.hit('tok', now), true); // 4 — over
    assert.equal(calls[0]?.name, 'rate_limit_hit');
  });

  it('buckets by (key, window): the same window shares a counter, a new window resets it', async () => {
    const { client, calls } = mockRpcClient();
    const rl = new SupabaseRateLimiter({ client, ...CFG });
    const w0 = 1_700_000_000_000; // aligned to a window boundary for clarity
    for (let i = 0; i < 3; i++) await rl.hit('tok', w0 + i); // same window
    assert.equal(await rl.hit('tok', w0 + 10), true); // over in window 0
    // Next window — different bucket_key, fresh count.
    assert.equal(await rl.hit('tok', w0 + CFG.windowMs), false);

    const buckets = new Set(calls.map((c) => String(c.params['p_bucket'])));
    assert.equal(buckets.size, 2, 'two distinct (key,window) buckets were used');
    // window_start is the floored window, passed as an ISO timestamp.
    const firstWindow = Math.floor(w0 / CFG.windowMs) * CFG.windowMs;
    assert.equal(calls[0]?.params['p_window_start'], new Date(firstWindow).toISOString());
    assert.equal(calls[0]?.params['p_bucket'], `tok:${firstWindow}`);
  });

  it('keys are isolated in the shared store', async () => {
    const { client } = mockRpcClient();
    const rl = new SupabaseRateLimiter({ client, ...CFG });
    const now = 1_700_000_000_000;
    for (let i = 0; i < 3; i++) await rl.hit('a', now);
    assert.equal(await rl.hit('a', now), true);
    assert.equal(await rl.hit('b', now), false);
  });

  it('falls back to the in-memory limiter when the store errors (fail-safe, not fail-open)', async () => {
    const { client } = mockRpcClient({ failWith: 'relation "rate_limit_counters" does not exist' });
    const fallback = new InMemoryRateLimiter(CFG);
    const rl = new SupabaseRateLimiter({ client, ...CFG, fallback });
    const now = 1_700_000_000_000;
    // The store is down, but the fallback still enforces a per-instance budget.
    assert.equal(await rl.hit('tok', now), false);
    assert.equal(await rl.hit('tok', now), false);
    assert.equal(await rl.hit('tok', now), false);
    assert.equal(await rl.hit('tok', now), true);
    // And the fallback actually holds the state.
    assert.equal(await fallback.hit('tok', now), true);
  });

  it('reset() delegates to the fallback', async () => {
    const { client } = mockRpcClient({ failWith: 'down' });
    const fallback = new InMemoryRateLimiter(CFG);
    const rl = new SupabaseRateLimiter({ client, ...CFG, fallback });
    const now = 1_700_000_000_000;
    for (let i = 0; i < 3; i++) await rl.hit('tok', now);
    assert.equal(await rl.hit('tok', now), true);
    await rl.reset();
    assert.equal(await rl.hit('tok', now), false);
  });
});

describe('createRateLimiterFromEnv (resolver)', () => {
  const saved: Record<string, string | undefined> = {};
  const KEYS = ['UPRIVER_DATA_SOURCE', 'UPRIVER_SUPABASE_URL', 'UPRIVER_SUPABASE_SERVICE_KEY', 'UPRIVER_SUPABASE_PUBLISHABLE_KEY'];
  function setEnv(env: Record<string, string | undefined>): void {
    for (const k of KEYS) {
      if (!(k in saved)) saved[k] = process.env[k];
      if (env[k] === undefined) delete process.env[k];
      else process.env[k] = env[k];
    }
  }
  afterEach(() => {
    for (const k of KEYS) {
      if (saved[k] === undefined) delete process.env[k];
      else process.env[k] = saved[k];
      delete saved[k];
    }
  });

  it('local data source → in-memory', () => {
    setEnv({ UPRIVER_DATA_SOURCE: 'local' });
    assert.ok(createRateLimiterFromEnv(CFG) instanceof InMemoryRateLimiter);
  });

  it('supabase data source + configured env → Supabase-backed', () => {
    setEnv({
      UPRIVER_DATA_SOURCE: 'supabase',
      UPRIVER_SUPABASE_URL: 'https://example.supabase.co',
      UPRIVER_SUPABASE_SERVICE_KEY: 'service-key',
    });
    assert.ok(createRateLimiterFromEnv(CFG) instanceof SupabaseRateLimiter);
  });

  it('supabase selected but unconfigured → in-memory (no throw on boot)', () => {
    setEnv({ UPRIVER_DATA_SOURCE: 'supabase', UPRIVER_SUPABASE_URL: undefined, UPRIVER_SUPABASE_SERVICE_KEY: undefined, UPRIVER_SUPABASE_PUBLISHABLE_KEY: undefined });
    assert.ok(createRateLimiterFromEnv(CFG) instanceof InMemoryRateLimiter);
  });

  it('the publishable key alone also configures the shared store', () => {
    setEnv({
      UPRIVER_DATA_SOURCE: 'supabase',
      UPRIVER_SUPABASE_URL: 'https://example.supabase.co',
      UPRIVER_SUPABASE_SERVICE_KEY: undefined,
      UPRIVER_SUPABASE_PUBLISHABLE_KEY: 'pub-key',
    });
    assert.ok(createRateLimiterFromEnv(CFG) instanceof SupabaseRateLimiter);
  });
});

// Type-only usage so `RateLimiter` is exercised by the compiler.
const _typecheck: RateLimiter = new InMemoryRateLimiter(CFG);
void _typecheck;
