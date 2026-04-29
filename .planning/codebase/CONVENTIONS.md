# Coding Conventions

**Analysis Date:** 2026-04-28

## Naming Patterns

**Files:**
- Kebab-case for source files: `client-config.ts`, `firecrawl-client.ts`, `platform-detector.ts`
- Index barrels: `index.ts` exports public API from a directory
- Test/type files: No test files present; type definition files use `.d.ts` extension

**Functions:**
- camelCase for all function declarations: `fetchGscData()`, `readClientConfig()`, `verifyClonePage()`
- Private class methods prefixed with underscore: `private request<T>()`, `private logCredit()`
- Async functions named to reflect async nature: `async function run()`, `async function fetch...()`

**Variables:**
- camelCase for locals and parameters: `clientSlug`, `creditLogPath`, `apiKey`
- UPPER_SNAKE_CASE for constants: `FIRECRAWL_BASE_URL`, `CLAUDE_COSTS`, `ANALYTICS_PATTERNS`
- Avoid shadowing: parameters and locals clearly named to distinguish scope

**Types:**
- PascalCase for interfaces and types: `FirecrawlClient`, `ClientConfig`, `AuditFinding`
- PascalCase for classes: `FirecrawlClient`, `BaseCommand`
- Union types use clear naming: `type PipelineStage = 'init' | 'discover' | 'scrape' | ...`
- Record types with semantic keys: `Record<string, unknown>`, `Record<string, number>`

## Code Style

**Formatting:**
- **Tool**: Prettier (per `/Users/joshua/CLAUDE.md`)
- Semicolons required
- Single quotes for strings
- 100 character line width
- 2 space indentation

**Example from `packages/core/src/config/client-config.ts`:**
```typescript
export function updateClientConfig(
  slug: string,
  updates: Partial<ClientConfig>,
  base = './clients',
): ClientConfig {
  const current = readClientConfig(slug, base);
  const updated = { ...current, ...updates } as ClientConfig;
  writeClientConfig(updated, base);
  return updated;
}
```

**Linting:**
- ESLint enforced (per `/Users/joshua/CLAUDE.md`)
- Must run `npm run lint` before committing
- Run `npm run check` for TypeScript validation

**TypeScript Strictness:**
- `strict: true` enabled in `tsconfig.base.json`
- `noUncheckedIndexedAccess: true`
- `noImplicitOverride: true`
- `exactOptionalPropertyTypes: true`
- Avoid explicit `any` — use `Record<string, unknown>` or specific types

## Import Organization

**Order:**
1. Node.js builtins (`import { readFileSync } from 'node:fs'`)
2. External packages (`import { google } from 'googleapis'`)
3. Internal absolute imports (`import type { ClientConfig } from '@upriver/core'`)
4. Relative imports (`import { BaseCommand } from '../base-command.js'`)

**Path Aliases:**
- `@upriver/core` → exports from `packages/core/src/index.ts`
- `@upriver/cli` → exports from `packages/cli/src/index.ts`
- `@upriver/audit-passes` → exports from `packages/audit-passes/src/index.ts`
- Use `.js` extension in relative imports for ES modules: `from '../config/client-config.js'`

**Barrel Files:**
- Each package exports public API via `index.ts`
- Example: `packages/core/src/index.ts` exports types and functions from subdirectories
- Internal implementation details stay private within subdirectories

## Error Handling

**Patterns:**
- Throw plain `Error` with descriptive messages: `throw new Error('Firecrawl ${method} ${path} → ${res.status}: ${text}')`
- Command errors use CLI framework: `this.error('Required environment variable ${name} is not set.')`
- Non-fatal errors logged/caught silently: `catch { /* non-fatal */ }`
- Null-safe checks: `if (!val) { ... }` for optional values
- Optional chaining: `r?.keys ?? []` to handle undefined/null safely
- Null coalescing for defaults: `value ?? defaultValue`

**Example from `packages/core/src/firecrawl/client.ts`:**
```typescript
private async request<T>(
  path: string,
  method: 'GET' | 'POST',
  body?: unknown,
): Promise<T> {
  const url = path.startsWith('http') ? path : `${FIRECRAWL_BASE_URL}${path}`;
  const res = await fetch(url, {
    method,
    headers: {
      Authorization: `Bearer ${this.apiKey}`,
      'Content-Type': 'application/json',
    },
    ...(body != null ? { body: JSON.stringify(body) } : {}),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Firecrawl ${method} ${path} → ${res.status}: ${text}`);
  }

  return res.json() as Promise<T>;
}
```

## Logging

**Framework:** 
- No dedicated logging library — uses `console` via CLI framework or direct logging
- Command base class provides `this.log(msg)` method

**Patterns:**
- CLI commands use `this.log()` for output: `this.log('  Skipped ${skipped} page(s)')`
- Background/non-fatal operations may not log at all
- Usage events logged to Supabase via `logUsageEvent()` but non-fatal if unavailable
- Verbose output uses indentation: `this.log('  [verify] ...')`

**Example from `packages/core/src/usage/logger.ts`:**
```typescript
export async function logUsageEvent(event: UsageEvent): Promise<void> {
  const cost = calcCost(event);
  const record = { ...event, cost_usd: cost, created_at: new Date().toISOString() };

  // Non-fatal — local log still captures it
  if (supabaseUrl && supabaseKey) {
    try {
      await fetch(`${supabaseUrl}/rest/v1/usage_events`, { ... });
    } catch {
      // non-fatal
    }
  }
}
```

## Comments

**When to Comment:**
- Explain *why*, not *what* — code is self-documenting, comments explain intent
- Comments above complex logic blocks: `// Poll until complete`
- Comments for non-obvious workarounds or quirks: `// Firecrawl sometimes puts it in metadata.sourceURL or metadata.url`
- Avoid redundant comments that repeat the code

**JSDoc/TSDoc:**
- Required for exported functions, methods, classes (per `/Users/joshua/CLAUDE.md`)
- Parameter and return descriptions mandatory
- Not strictly enforced in current codebase but expected on new code

**Example from `packages/cli/src/clone/verify.ts`:**
```typescript
/**
 * Iteratively compare the cloned page against the source screenshot, asking
 * Claude to fix discrepancies on each pass. Stops when Claude reports DONE or
 * iteration cap is reached.
 */
export async function verifyClonePage(opts: VerifyOptions): Promise<VerifyResult> {
  // ...
}
```

## Function Design

**Size:**
- No strict line limit, but favor smaller functions
- Large functions (500+ lines) exist in CLI commands where they orchestrate complex workflows: `packages/cli/src/commands/clone.ts` (655 lines)
- Extract helper functions for repeated logic: `findPages()`, `normalizePath()`, `canonicalPagePath()`

**Parameters:**
- Limit to 3-4 parameters; use options object for 5+
- Use options object for optional/flag parameters: `interface VerifyOptions { page, slug, clientDir, ... }`
- Type parameters explicitly: `function request<T>(...)`

**Return Values:**
- Explicit return types required: `(): Promise<ClientConfig>`
- Return objects when multiple values needed: `{ iterationsRun: 0, status: 'converged', attempts: [] }`
- Return null/undefined for missing values, not empty objects: `return null` if not found
- Never return untyped results — always have explicit types

## Module Design

**Exports:**
- Public API exported from `index.ts` barrel files
- Only export types, functions, and classes meant for external consumption
- Implementation details remain private within subdirectories

**Example from `packages/core/src/index.ts`:**
```typescript
// Types
export * from './types/client-config.js';
export * from './types/firecrawl.js';

// Firecrawl
export { FirecrawlClient } from './firecrawl/client.js';
export type { FirecrawlClientOptions } from './firecrawl/client.js';
```

**Class Organization:**
- Use private fields for internal state: `private apiKey: string`
- Use protected methods for subclass access: `protected getConfig(slug: string): ClientConfig`
- Use abstract base classes for shared command logic: `abstract class BaseCommand extends Command`

**Interfaces Over Type Aliases:**
- Prefer `interface` for object shapes (per `/Users/joshua/CLAUDE.md`)
- Use type aliases for unions and primitives: `type PipelineStage = 'init' | ...`
- Optional properties marked with `?`: `canonical?: string`

## Async Patterns

**Promises:**
- Use `async/await` throughout modern code
- Chain `.then()` only in legacy code (rare)
- Void fire-and-forget: `void logUsageEvent({ ... })`

**Concurrent Operations:**
- Use `Promise.all()` for independent concurrent tasks: `await Promise.all([queriesRes, pagesRes])`
- Sequential with `for...of` loop for dependent operations
- Worker pattern for CPU-bound parallelism: `while (queue.length > 0) { const item = queue.shift(); ... }`

---

*Convention analysis: 2026-04-28*
