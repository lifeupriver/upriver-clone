import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { SupabaseClientDataSource } from './supabase.js';
import type { SupabaseClient } from '@supabase/supabase-js';

interface Captured {
  bucket: string;
  op: string;
  args: unknown[];
}

/**
 * Lightweight mock that records storage calls. Returns a `SupabaseClient`
 * cast — only the storage surface is exercised in tests.
 */
function mockClient(opts: {
  list?: Array<{ name: string; id: string | null }>;
  download?: Uint8Array | null;
  signed?: { signedUrl: string } | null;
  notFoundMessage?: string;
}): { client: SupabaseClient; captured: Captured[] } {
  const captured: Captured[] = [];
  const error = (msg: string) => ({ message: msg, statusCode: 404 });
  const storage = {
    from(bucket: string) {
      return {
        list(prefix: string, listOpts: unknown) {
          captured.push({ bucket, op: 'list', args: [prefix, listOpts] });
          if (opts.notFoundMessage)
            return Promise.resolve({ data: null, error: error(opts.notFoundMessage) });
          return Promise.resolve({ data: opts.list ?? [], error: null });
        },
        download(path: string) {
          captured.push({ bucket, op: 'download', args: [path] });
          if (!opts.download)
            return Promise.resolve({ data: null, error: error('Object not found') });
          return Promise.resolve({
            data: { arrayBuffer: async () => opts.download!.buffer },
            error: null,
          });
        },
        upload(path: string, body: unknown, uploadOpts: unknown) {
          captured.push({ bucket, op: 'upload', args: [path, body, uploadOpts] });
          return Promise.resolve({ data: { path }, error: null });
        },
        createSignedUrl(path: string, ttl: number) {
          captured.push({ bucket, op: 'createSignedUrl', args: [path, ttl] });
          if (opts.signed === null)
            return Promise.resolve({ data: null, error: error('Not found') });
          return Promise.resolve({
            data: opts.signed ?? { signedUrl: `https://example/${path}?ttl=${ttl}` },
            error: null,
          });
        },
      };
    },
  };
  return { client: { storage } as unknown as SupabaseClient, captured };
}

describe('SupabaseClientDataSource', () => {
  it('reads file as text via download path', async () => {
    const { client, captured } = mockClient({
      download: new TextEncoder().encode('hello'),
    });
    const ds = new SupabaseClientDataSource({ client, bucket: 'b' });
    const text = await ds.readClientFileText('foo', 'audit/summary.json');
    assert.equal(text, 'hello');
    assert.equal(captured[0]?.op, 'download');
    assert.deepEqual(captured[0]?.args, ['clients/foo/audit/summary.json']);
  });

  it('returns null when download object is missing', async () => {
    const { client } = mockClient({ download: null });
    const ds = new SupabaseClientDataSource({ client });
    assert.equal(await ds.readClientFile('foo', 'missing'), null);
  });

  it('uploads with upsert + content type derived from extension', async () => {
    const { client, captured } = mockClient({});
    const ds = new SupabaseClientDataSource({ client, bucket: 'b' });
    await ds.writeClientFile('foo', 'qa-report.md', '# Hi');
    const upload = captured.find(c => c.op === 'upload');
    assert.ok(upload);
    assert.equal(upload!.args[0], 'clients/foo/qa-report.md');
    assert.deepEqual(upload!.args[2], {
      upsert: true,
      contentType: 'text/markdown',
    });
  });

  it('listClientFiles excludes folder entries', async () => {
    const { client } = mockClient({
      list: [
        { name: 'summary.json', id: 'a' },
        { name: 'subdir', id: null },
        { name: 'pass-a.json', id: 'b' },
      ],
    });
    const ds = new SupabaseClientDataSource({ client });
    const files = await ds.listClientFiles('foo', 'audit');
    assert.deepEqual(files.sort(), ['pass-a.json', 'summary.json']);
  });

  it('signClientFileUrl returns the signed URL on success', async () => {
    const { client } = mockClient({});
    const ds = new SupabaseClientDataSource({ client });
    const url = await ds.signClientFileUrl('foo', 'audit/summary.json', 600);
    assert.match(url ?? '', /clients\/foo\/audit\/summary\.json\?ttl=600/);
  });

  it('signClientFileUrl returns null when storage rejects', async () => {
    const { client } = mockClient({ signed: null });
    const ds = new SupabaseClientDataSource({ client });
    assert.equal(await ds.signClientFileUrl('foo', 'missing', 60), null);
  });

  it('rejects slugs that are not kebab-case', async () => {
    const { client, captured } = mockClient({});
    const ds = new SupabaseClientDataSource({ client });
    for (const slug of ['../foo', '..', 'foo/bar', 'Foo', '_smoke']) {
      await assert.rejects(ds.readClientFile(slug, 'client-config.yaml'), /Invalid client slug/);
      await assert.rejects(ds.writeClientFile(slug, 'x.txt', 'x'), /Invalid client slug/);
      await assert.rejects(ds.listClientFiles(slug, 'audit'), /Invalid client slug/);
    }
    // Validation fires before any storage call.
    assert.equal(captured.length, 0);
  });

  it('rejects `..` segments in paths', async () => {
    const { client, captured } = mockClient({});
    const ds = new SupabaseClientDataSource({ client });
    for (const path of ['../escape.txt', 'audit/../../escape.txt', 'a/../../b']) {
      await assert.rejects(ds.readClientFile('foo', path), /Path traversal rejected/);
      await assert.rejects(ds.writeClientFile('foo', path, 'x'), /Path traversal rejected/);
      await assert.rejects(ds.listClientFiles('foo', path), /Path traversal rejected/);
    }
    assert.equal(captured.length, 0);
  });

  it('listClientEntries pages past the 1000-entry storage limit', async () => {
    // Paged stub: 1500 objects served 1000 at a time via limit/offset.
    const total = 1500;
    const objects = Array.from({ length: total }, (_, i) => ({
      name: `file-${String(i).padStart(4, '0')}.json`,
      id: `id-${i}`,
    }));
    const calls: Array<{ limit: number; offset: number }> = [];
    const storage = {
      from() {
        return {
          list(_prefix: string, opts: { limit: number; offset?: number }) {
            const offset = opts.offset ?? 0;
            calls.push({ limit: opts.limit, offset });
            return Promise.resolve({
              data: objects.slice(offset, offset + opts.limit),
              error: null,
            });
          },
        };
      },
    };
    const ds = new SupabaseClientDataSource({
      client: { storage } as unknown as SupabaseClient,
    });
    const entries = await ds.listClientEntries('foo', 'pages');
    assert.equal(entries.length, total);
    assert.deepEqual(calls.map(c => c.offset), [0, 1000]);
    // No entry is duplicated across pages.
    assert.equal(new Set(entries.map(e => e.name)).size, total);
  });
});
