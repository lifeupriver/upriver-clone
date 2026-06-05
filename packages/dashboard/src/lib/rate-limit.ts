/**
 * Per-token rate limiting for the coverage chatbot's profile write endpoint
 * (`api/profile/[slug].ts`).
 *
 * The endpoint runs on Vercel, where requests fan out across many short-lived
 * instances. A counter in process memory only protects the one instance that
 * happens to serve a request, so a client (or a leaked token) can multiply its
 * effective budget by the instance count. This module makes the window coherent
 * by backing it with a SHARED store:
 *
 *   - `SupabaseRateLimiter` — a fixed-window counter in Postgres, incremented
 *     atomically via the `rate_limit_hit` RPC (see the `rate_limit_counters`
 *     migration). One row per `(token, window)` bucket, shared by every
 *     instance. This is the production path.
 *
 *   - `InMemoryRateLimiter` — the original sliding-window map. Used as the
 *     local/dev fallback (no Supabase configured) and as the fail-safe backstop
 *     when the shared store is briefly unreachable, so a store outage degrades
 *     to per-instance limiting rather than failing open or 500-ing the request.
 *
 * `resolveRateLimiter()` mirrors `resolveClientDataSource()`: Supabase when the
 * data source is `supabase` and the env is configured, in-memory otherwise.
 *
 * (A KV store — Vercel KV / Upstash Redis `INCR` + `EXPIRE` — would satisfy the
 * same `RateLimiter` contract; Supabase is chosen here because the project
 * already provisions it and every other shared write goes through it.)
 */
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

import { getDataSource } from './data-source.js';

export interface RateLimitConfig {
  /** Window length in milliseconds. */
  windowMs: number;
  /** Maximum hits allowed per key per window. The (max+1)th hit is limited. */
  max: number;
}

/** Matches the endpoint's historical window: 20 writes / 60s / token. */
export const DEFAULT_RATE_LIMIT: RateLimitConfig = { windowMs: 60_000, max: 20 };

export interface RateLimiter {
  /**
   * Record one hit for `key` at `now` (epoch ms). Resolves to `true` when this
   * hit puts `key` over the limit for the current window — the caller should
   * reject with 429. Resolves to `false` when the hit is within budget.
   */
  hit(key: string, now: number): Promise<boolean>;
  /** Drop all counters. Test/dev hook; a no-op for stores that can't clear cheaply. */
  reset(): Promise<void>;
}

/**
 * Sliding-window limiter in process memory. Keeps the original endpoint
 * behavior exactly: a key is limited once it already has `max` hits inside the
 * trailing `windowMs`. Single-instance only — the local/dev fallback.
 */
export class InMemoryRateLimiter implements RateLimiter {
  private readonly cfg: RateLimitConfig;
  private readonly hits = new Map<string, number[]>();

  constructor(cfg: RateLimitConfig = DEFAULT_RATE_LIMIT) {
    this.cfg = cfg;
  }

  async hit(key: string, now: number): Promise<boolean> {
    const recent = (this.hits.get(key) ?? []).filter((t) => now - t < this.cfg.windowMs);
    if (recent.length >= this.cfg.max) {
      this.hits.set(key, recent);
      return true;
    }
    recent.push(now);
    this.hits.set(key, recent);
    return false;
  }

  async reset(): Promise<void> {
    this.hits.clear();
  }
}

export interface SupabaseRateLimiterOptions extends Partial<RateLimitConfig> {
  /** Pre-configured Supabase client. Tests inject a mock here. */
  client: SupabaseClient;
  /** RPC name for the atomic fixed-window increment. Defaults to `rate_limit_hit`. */
  rpc?: string;
  /**
   * Per-instance limiter used when the shared store errors (the fail-safe
   * backstop). Defaults to a fresh `InMemoryRateLimiter` with the same config.
   */
  fallback?: RateLimiter;
}

/**
 * Fixed-window limiter backed by Postgres. Each `(key, window)` pair is one
 * `rate_limit_counters` row; `rate_limit_hit` inserts-or-increments it
 * atomically and returns the post-increment count, so every instance sees the
 * same running total. Coherent across the whole deployment.
 *
 * If the RPC errors (migration not yet applied, transient outage), the call
 * falls back to the in-memory limiter rather than letting the request through
 * unbounded — coherence is lost for the duration, but the endpoint keeps a
 * per-instance backstop.
 */
export class SupabaseRateLimiter implements RateLimiter {
  private readonly client: SupabaseClient;
  private readonly cfg: RateLimitConfig;
  private readonly rpc: string;
  private readonly fallback: RateLimiter;

  constructor(opts: SupabaseRateLimiterOptions) {
    this.client = opts.client;
    this.cfg = {
      windowMs: opts.windowMs ?? DEFAULT_RATE_LIMIT.windowMs,
      max: opts.max ?? DEFAULT_RATE_LIMIT.max,
    };
    this.rpc = opts.rpc ?? 'rate_limit_hit';
    this.fallback = opts.fallback ?? new InMemoryRateLimiter(this.cfg);
  }

  async hit(key: string, now: number): Promise<boolean> {
    const windowStart = Math.floor(now / this.cfg.windowMs) * this.cfg.windowMs;
    const bucket = `${key}:${windowStart}`;
    // Keep a counter a little past its window so a delayed sweep can reclaim it.
    const ttlSeconds = Math.ceil(this.cfg.windowMs / 1000) * 2;
    try {
      const { data, error } = await this.client.rpc(this.rpc, {
        p_bucket: bucket,
        p_window_start: new Date(windowStart).toISOString(),
        p_ttl_seconds: ttlSeconds,
      });
      if (error) throw error;
      const count = typeof data === 'number' ? data : Number(data);
      if (!Number.isFinite(count)) throw new Error(`${this.rpc} returned a non-numeric count`);
      return count > this.cfg.max;
    } catch (err) {
      // Shared store unavailable — degrade to per-instance limiting. Log once at
      // warn level; do NOT fail the request open.
      console.warn(`[rate-limit] shared store unavailable, falling back to in-memory: ${describeError(err)}`);
      return this.fallback.hit(key, now);
    }
  }

  async reset(): Promise<void> {
    await this.fallback.reset();
  }
}

function describeError(err: unknown): string {
  if (err instanceof Error) return err.message;
  if (err && typeof err === 'object' && 'message' in err) return String((err as { message: unknown }).message);
  return String(err);
}

/**
 * Build a `RateLimiter` from process env, mirroring
 * `createSupabaseClientDataSourceFromEnv`'s env contract. Supabase when the data
 * source is `supabase` AND the URL+key are present; in-memory otherwise (local
 * dev, or `supabase` selected but not yet configured).
 */
export function createRateLimiterFromEnv(cfg: RateLimitConfig = DEFAULT_RATE_LIMIT): RateLimiter {
  if (getDataSource() === 'supabase') {
    const url = process.env['UPRIVER_SUPABASE_URL'];
    const key =
      process.env['UPRIVER_SUPABASE_SERVICE_KEY'] ?? process.env['UPRIVER_SUPABASE_PUBLISHABLE_KEY'];
    if (url && key) {
      const client = createClient(url, key, { auth: { persistSession: false } });
      return new SupabaseRateLimiter({ client, ...cfg });
    }
    // `supabase` selected but unconfigured — fall through to in-memory so the
    // endpoint still rate-limits (per instance) instead of throwing on boot.
  }
  return new InMemoryRateLimiter(cfg);
}

let cached: RateLimiter | null = null;

/**
 * Resolve and memoize the process-wide limiter for the current data source.
 * Cached for the module lifetime — the in-memory window and the Supabase client
 * are both reused across requests.
 */
export function resolveRateLimiter(): RateLimiter {
  if (cached) return cached;
  cached = createRateLimiterFromEnv();
  return cached;
}

/**
 * Test/dev helper: clear the current limiter's counters and drop the cache so
 * the next resolve re-reads env. Mirrors `resetClientDataSource()`.
 */
export function resetRateLimiter(): void {
  if (cached) void cached.reset();
  cached = null;
}
