import { Octokit } from '@octokit/rest';
import bcrypt from 'bcryptjs';

interface SubmitBody {
  pin?: string;
  what: string;
  where?: string;
}

export async function POST(req: Request): Promise<Response> {
  let body: SubmitBody;
  try {
    body = (await req.json()) as SubmitBody;
  } catch {
    return Response.json({ ok: false, message: 'Bad request.' }, { status: 400 });
  }

  // Optional PIN check.
  const pinHash = process.env['FORM_PIN_HASH'];
  if (pinHash) {
    if (!body.pin || !bcrypt.compareSync(body.pin, pinHash)) {
      return Response.json({ ok: false, message: 'PIN did not match.' }, { status: 401 });
    }
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
        body.what,
        '',
        '### Where on the site?',
        body.where ?? 'Not specified',
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
