import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { parse as parseYaml, stringify as stringifyYaml } from 'yaml';
import type { ClientConfig } from '../types/client-config.js';

export function clientDir(slug: string, base = './clients'): string {
  return join(base, slug);
}

export function configPath(slug: string, base = './clients'): string {
  return join(clientDir(slug, base), 'client-config.yaml');
}

export function readClientConfig(slug: string, base = './clients'): ClientConfig {
  const path = configPath(slug, base);
  if (!existsSync(path)) {
    throw new Error(`No client config found at ${path}. Run: upriver init <url> --slug ${slug}`);
  }
  return parseYaml(readFileSync(path, 'utf8')) as ClientConfig;
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
