import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { parse as parseYaml, stringify as stringifyYaml } from 'yaml';
import type { ClientConfig } from '../types/client-config.js';
import { ClientConfigZ } from '../types/client-config-zod.js';
import { ConfigError } from '../errors.js';

export function clientDir(slug: string, base = './clients'): string {
  return join(base, slug);
}

export function configPath(slug: string, base = './clients'): string {
  return join(clientDir(slug, base), 'client-config.yaml');
}

export function readClientConfig(slug: string, base = './clients'): ClientConfig {
  const path = configPath(slug, base);
  if (!existsSync(path)) {
    throw new ConfigError(
      `No client config found at ${path}. Run: upriver init <url> --slug ${slug}`,
      { code: 'CLIENT_CONFIG_MISSING', context: { slug, path } },
    );
  }
  let raw: unknown;
  try {
    raw = parseYaml(readFileSync(path, 'utf8'));
  } catch (err) {
    throw new ConfigError(`Failed to parse YAML at ${path}: ${err instanceof Error ? err.message : String(err)}`, {
      code: 'CLIENT_CONFIG_YAML_INVALID',
      context: { path },
      cause: err,
    });
  }
  const parsed = ClientConfigZ.safeParse(raw);
  if (!parsed.success) {
    const issues = parsed.error.issues
      .slice(0, 5)
      .map((i) => `  - ${i.path.join('.') || '<root>'}: ${i.message}`)
      .join('\n');
    throw new ConfigError(
      `client-config.yaml at ${path} failed validation:\n${issues}`,
      { code: 'CLIENT_CONFIG_INVALID', context: { path } },
    );
  }
  return parsed.data as ClientConfig;
}

export function writeClientConfig(config: ClientConfig, base = './clients'): void {
  const dir = clientDir(config.slug, base);
  mkdirSync(dir, { recursive: true });
  writeFileSync(configPath(config.slug, base), stringifyYaml(config), 'utf8');
}

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
