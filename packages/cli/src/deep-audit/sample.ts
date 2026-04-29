import type { PageData } from '@upriver/audit-passes';

export function pickSamplePages(pages: PageData[], max = 4): PageData[] {
  if (pages.length === 0) return [];

  const isHome = (p: PageData) =>
    p.slug === 'index' || p.slug === '' || p.url.replace(/\/$/, '').split('/').filter(Boolean).length <= 2;

  const home = pages.find(isHome) ?? pages[0];
  if (!home) return [];
  const others = pages.filter((p) => p !== home);

  others.sort((a, b) => (b.extracted.ctaButtons?.length ?? 0) - (a.extracted.ctaButtons?.length ?? 0));

  return [home, ...others.slice(0, max - 1)];
}
