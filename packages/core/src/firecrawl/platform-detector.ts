import type { ClientConfig } from '../types/client-config.js';

type Platform = ClientConfig['platform'];

const SIGNATURES: Array<{ platform: Exclude<Platform, 'unknown' | undefined>; patterns: string[] }> = [
  {
    platform: 'squarespace',
    patterns: ['static.squarespace.com', 'squarespace.com/static'],
  },
  {
    platform: 'wordpress',
    patterns: ['/wp-content/', '/wp-includes/', 'wp-json'],
  },
  {
    platform: 'wix',
    patterns: ['static.parastorage.com', 'wix.com', 'wixsite.com'],
  },
  {
    platform: 'webflow',
    patterns: ['webflow.com', 'data-wf-site', 'uploads-ssl.webflow.com'],
  },
  {
    platform: 'showit',
    patterns: ['showit.co', 'show.it', 'showitusercontent.com'],
  },
];

export function detectPlatform(rawHtml: string): Platform {
  const lower = rawHtml.toLowerCase();

  for (const { platform, patterns } of SIGNATURES) {
    if (patterns.some((p) => lower.includes(p.toLowerCase()))) {
      return platform;
    }
  }

  return 'unknown';
}
