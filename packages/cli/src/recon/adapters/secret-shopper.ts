import type { ClientDataSource } from '@upriver/core/data';

import type { PathedCandidate } from '../types.js';

/**
 * Secret-shopper scaffold (build spec 04 §1, §1.6). The inquiry is sent MANUALLY
 * by the operator — this module never contacts the client's business. `start`
 * logs the sent-inquiry timestamp + channel; `record` logs the reply and turns
 * the measured response time into a `salesProcess.firstTouch.responseTime` recon
 * candidate. The two `recon secret-shopper start|record` commands wrap these.
 */
export const SECRET_SHOPPER_LOG = 'recon/secret-shopper/log.json';

export interface SecretShopperEntry {
  id: string;
  channel: string;
  sentAt: string;
  status: 'pending' | 'responded';
  respondedAt?: string;
  response?: string;
  responseTime?: string;
}

function slugifyChannel(channel: string): string {
  return channel.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'inquiry';
}

/** Human-readable elapsed time between two ISO timestamps. Pure. */
export function computeResponseTime(sentAt: string, respondedAt: string): string {
  const ms = Date.parse(respondedAt) - Date.parse(sentAt);
  if (Number.isNaN(ms)) return 'unknown';
  if (ms < 60_000) return 'under a minute';
  const totalMin = Math.floor(ms / 60_000);
  const days = Math.floor(totalMin / 1440);
  const hours = Math.floor((totalMin % 1440) / 60);
  const mins = totalMin % 60;
  const parts: string[] = [];
  if (days) parts.push(`${days}d`);
  if (hours) parts.push(`${hours}h`);
  if (mins) parts.push(`${mins}m`);
  return parts.join(' ') || '0m';
}

export async function readSecretShopperLog(
  ds: ClientDataSource,
  slug: string,
): Promise<SecretShopperEntry[]> {
  const text = await ds.readClientFileText(slug, SECRET_SHOPPER_LOG);
  if (text === null) return [];
  try {
    const parsed = JSON.parse(text);
    return Array.isArray(parsed) ? (parsed as SecretShopperEntry[]) : [];
  } catch {
    return [];
  }
}

async function writeLog(ds: ClientDataSource, slug: string, log: SecretShopperEntry[]): Promise<void> {
  await ds.writeClientFile(slug, SECRET_SHOPPER_LOG, `${JSON.stringify(log, null, 2)}\n`);
}

export async function startSecretShopper(
  ds: ClientDataSource,
  slug: string,
  opts: { channel: string; sentAt: string; id?: string },
): Promise<SecretShopperEntry> {
  const log = await readSecretShopperLog(ds, slug);
  const entry: SecretShopperEntry = {
    id: opts.id ?? `${slugifyChannel(opts.channel)}-${opts.sentAt}`,
    channel: opts.channel,
    sentAt: opts.sentAt,
    status: 'pending',
  };
  log.push(entry);
  await writeLog(ds, slug, log);
  return entry;
}

export async function recordSecretShopper(
  ds: ClientDataSource,
  slug: string,
  opts: { response: string; respondedAt: string; id?: string },
): Promise<{ entry: SecretShopperEntry; candidate: PathedCandidate }> {
  const log = await readSecretShopperLog(ds, slug);
  const entry = opts.id
    ? log.find((e) => e.id === opts.id)
    : [...log].reverse().find((e) => e.status === 'pending');
  if (!entry) {
    throw new Error(
      opts.id
        ? `No secret-shopper inquiry with id "${opts.id}". Run "recon secret-shopper start ${slug}" first.`
        : `No pending secret-shopper inquiry for "${slug}". Run "recon secret-shopper start ${slug}" first.`,
    );
  }

  entry.respondedAt = opts.respondedAt;
  entry.response = opts.response;
  entry.responseTime = computeResponseTime(entry.sentAt, opts.respondedAt);
  entry.status = 'responded';
  await writeLog(ds, slug, log);

  const candidate: PathedCandidate = {
    path: 'salesProcess.firstTouch.responseTime',
    value: [{ channel: entry.channel, time: entry.responseTime }],
    source: 'recon',
    confidence: 'medium',
    evidence: `Secret shopper: sent ${entry.sentAt} via ${entry.channel}, replied ${opts.respondedAt} (${entry.responseTime}). "${opts.response.slice(0, 160)}"`,
  };
  return { entry, candidate };
}
