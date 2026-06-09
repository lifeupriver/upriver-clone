import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type { DesignSystem } from '@upriver/core';
import { applyDesignTokens } from './template-writer.js';

/**
 * Build Spec 10 §C smoke test: the design-system deliverable's `tokens.json`
 * (spec 20 §8) is drop-in compatible with `design-tokens.json`, so the scaffold's
 * global.css renderer consumes it without error and the values reach the CSS.
 */
const DESIGN_SYSTEM_TOKENS = {
  colors: {
    primary: '#1d4ed8', secondary: '#0f172a', accent: '#f59e0b',
    background: '#ffffff', textPrimary: '#0f172a', textSecondary: '#475569',
    link: '#2563eb',
  },
  fonts: [
    { family: 'Fraunces', role: 'heading' },
    { family: 'Inter', role: 'body' },
  ],
  components: { buttonPrimary: { borderRadius: '0.5rem' } },
  typography: { headingFont: 'Fraunces', bodyFont: 'Inter' },
  spacing: { baseUnit: 8, borderRadius: '0.75rem' },
};

const BASE_DS: DesignSystem = {
  colors: { primary: '#000', secondary: '#111', accent: '#222', background: '#fff', textPrimary: '#000', textSecondary: '#333' },
  typography: { headingFont: 'Inter', bodyFont: 'Inter', monoFont: 'ui-monospace', scale: {} },
  spacing: { baseUnit: 8, scale: [8, 16], borderRadius: '0.75rem' },
  components: { primaryButton: {}, secondaryButton: {}, inputField: {} },
  logo: '', favicon: '', colorScheme: 'light', personality: [],
};

test('scaffold consumes a design-system tokens.json without error and its values reach global.css', () => {
  const repo = mkdtempSync(join(tmpdir(), 'upriver-ds-tokens-'));
  mkdirSync(join(repo, 'src', 'styles'), { recursive: true });

  assert.doesNotThrow(() =>
    applyDesignTokens(repo, BASE_DS, DESIGN_SYSTEM_TOKENS as Record<string, unknown>),
  );

  const css = readFileSync(join(repo, 'src', 'styles', 'global.css'), 'utf8');
  assert.match(css, /--color-brand-500:/, 'brand scale generated');
  assert.match(css, /--color-link: #2563eb/, 'a tokens.json color (link) reached global.css');
  assert.match(css, /Fraunces/, 'tokens.json heading font (role:heading) was applied');
});
