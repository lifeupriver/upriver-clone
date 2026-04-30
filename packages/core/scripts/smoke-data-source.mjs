#!/usr/bin/env node
// Phase 2 smoke test: exercise SupabaseClientDataSource against the live
// `upriver` bucket. Writes a temp slug, reads it back, lists, signs, then
// (best-effort) cleans up. Safe to re-run.
//
// Run from repo root:
//   node packages/core/scripts/smoke-data-source.mjs

import { readFileSync } from 'node:fs';
import { createClient } from '@supabase/supabase-js';
import { SupabaseClientDataSource } from '../dist/data/supabase.js';

// Tiny .env parser — keeps the script free of additional deps.
const envPath = new URL('../../../.env', import.meta.url);
for (const line of readFileSync(envPath, 'utf8').split('\n')) {
  const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2];
}

const url = process.env.UPRIVER_SUPABASE_URL;
const key = process.env.UPRIVER_SUPABASE_SERVICE_KEY;
if (!url || !key) {
  console.error('UPRIVER_SUPABASE_URL or UPRIVER_SUPABASE_SERVICE_KEY missing in .env');
  process.exit(1);
}

const BUCKET = process.env.UPRIVER_SUPABASE_BUCKET ?? 'upriver';
const SLUG = '_smoke';
const client = createClient(url, key, { auth: { persistSession: false } });
const ds = new SupabaseClientDataSource({ client, bucket: BUCKET });

const stamp = new Date().toISOString();
const yaml = `name: Smoke Test\nslug: ${SLUG}\nurl: https://example.com\ncreated_at: ${stamp}\n`;
const summary = JSON.stringify({ overall: 73, completed_at: stamp }, null, 2);

console.log(`\nSmoke test against bucket "${BUCKET}", slug "${SLUG}"\n`);

console.log('1. write client-config.yaml + audit/summary.json');
await ds.writeClientFile(SLUG, 'client-config.yaml', yaml);
await ds.writeClientFile(SLUG, 'audit/summary.json', summary);
console.log('   ✓');

console.log('2. fileExists checks');
const a = await ds.fileExists(SLUG, 'client-config.yaml');
const b = await ds.fileExists(SLUG, 'audit/summary.json');
const c = await ds.fileExists(SLUG, 'missing.json');
console.log(`   client-config.yaml=${a}  audit/summary.json=${b}  missing.json=${c}`);
if (!a || !b || c) throw new Error('fileExists returned wrong shape');

console.log('3. readClientFileText round-trip');
const got = await ds.readClientFileText(SLUG, 'client-config.yaml');
if (got !== yaml) throw new Error(`text mismatch:\n  expected ${yaml.length}b\n  got ${got?.length}b`);
console.log(`   ✓ ${got.length} bytes match`);

console.log('4. listClientSlugs (probes top-level)');
const slugs = await ds.listClientSlugs();
console.log(`   ${slugs.length} slugs: ${slugs.join(', ')}`);
if (!slugs.includes(SLUG)) throw new Error(`${SLUG} not in listClientSlugs result`);

console.log('5. listClientFiles in audit/');
const files = await ds.listClientFiles(SLUG, 'audit');
console.log(`   ${files.join(', ')}`);
if (!files.includes('summary.json')) throw new Error('summary.json missing from listing');

console.log('6. signClientFileUrl (60s)');
const signed = await ds.signClientFileUrl(SLUG, 'audit/summary.json', 60);
console.log(`   ${signed?.slice(0, 80) ?? 'null'}…`);
if (!signed) throw new Error('signed URL was null');

console.log('7. cleanup — remove smoke objects');
const bucket = client.storage.from(BUCKET);
await bucket.remove([
  `clients/${SLUG}/client-config.yaml`,
  `clients/${SLUG}/audit/summary.json`,
]);
console.log('   ✓');

console.log('\n✅ Phase 2 storage abstraction works end-to-end against the live bucket.\n');
