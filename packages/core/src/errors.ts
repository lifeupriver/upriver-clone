/**
 * Standard error class for upriver. Use `UpriverError` (or a subclass) at
 * boundaries that produce errors meaningful to humans/automation: API
 * clients, config loaders, command-level validations.
 *
 * Carries:
 *   - code: a stable, parseable string a CI script can match on
 *   - context: a free-form bag of debug data (HTTP status, file path, etc.)
 *   - cause: the underlying error if any
 *
 * Internal-only failures (assertion / programmer error) can stay as plain
 * Error.
 */
export interface UpriverErrorOptions {
  code?: string;
  context?: Record<string, unknown>;
  cause?: unknown;
}

export class UpriverError extends Error {
  readonly code: string;
  readonly context: Record<string, unknown>;
  override readonly cause?: unknown;

  constructor(message: string, opts: UpriverErrorOptions = {}) {
    super(message);
    this.name = 'UpriverError';
    this.code = opts.code ?? 'UPRIVER_ERROR';
    this.context = opts.context ?? {};
    if (opts.cause !== undefined) this.cause = opts.cause;
  }
}

export class ConfigError extends UpriverError {
  constructor(message: string, opts: UpriverErrorOptions = {}) {
    super(message, { ...opts, code: opts.code ?? 'CONFIG_ERROR' });
    this.name = 'ConfigError';
  }
}

export class FirecrawlError extends UpriverError {
  constructor(message: string, opts: UpriverErrorOptions = {}) {
    super(message, { ...opts, code: opts.code ?? 'FIRECRAWL_ERROR' });
    this.name = 'FirecrawlError';
  }
}
