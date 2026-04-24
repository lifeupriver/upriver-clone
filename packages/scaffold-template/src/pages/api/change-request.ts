import type { APIRoute } from 'astro';
import { supabaseAdmin } from '../../lib/supabase';

export const prerender = false;

export const POST: APIRoute = async ({ request, locals }) => {
  if (!locals.user) {
    return json({ ok: false, error: 'Unauthorized' }, 401);
  }

  let payload: { title?: string; body?: string };
  try {
    payload = (await request.json()) as { title?: string; body?: string };
  } catch {
    return json({ ok: false, error: 'Invalid JSON' }, 400);
  }

  const title = String(payload.title ?? '').trim();
  const body = String(payload.body ?? '').trim();
  if (!title || !body) {
    return json({ ok: false, error: 'Title and body are required' }, 400);
  }

  const token = import.meta.env.GITHUB_TOKEN ?? process.env.GITHUB_TOKEN;
  const owner = import.meta.env.GITHUB_OWNER ?? process.env.GITHUB_OWNER;
  const repo = import.meta.env.GITHUB_REPO ?? process.env.GITHUB_REPO;

  if (!token || !owner || !repo) {
    return json(
      { ok: false, error: 'GitHub is not configured (set GITHUB_TOKEN / GITHUB_OWNER / GITHUB_REPO)' },
      500,
    );
  }

  const user = locals.user as { email?: string } | null;
  const footer = `\n\n---\nSubmitted by ${user?.email ?? 'admin'} via /admin/requests`;

  const ghRes = await fetch(`https://api.github.com/repos/${owner}/${repo}/issues`, {
    method: 'POST',
    headers: {
      accept: 'application/vnd.github+json',
      authorization: `Bearer ${token}`,
      'x-github-api-version': '2022-11-28',
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      title,
      body: body + footer,
      labels: ['client-request'],
    }),
  });

  if (!ghRes.ok) {
    const text = await ghRes.text();
    return json({ ok: false, error: `GitHub API ${ghRes.status}: ${text}` }, 502);
  }

  const issue = (await ghRes.json()) as { html_url: string; number: number };

  const { error } = await supabaseAdmin.from('change_requests').insert({
    title,
    body,
    github_issue_url: issue.html_url,
    github_issue_number: issue.number,
    status: 'open',
    requested_by: user?.email ?? null,
  });

  if (error) {
    return json({ ok: true, url: issue.html_url, warning: `Logged issue but DB insert failed: ${error.message}` });
  }

  return json({ ok: true, url: issue.html_url });
};

function json(payload: unknown, status = 200): Response {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}
