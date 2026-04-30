import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

import { Args, Flags } from '@oclif/core';
import { clientDir, readClientConfig } from '@upriver/core';

import { BaseCommand } from '../base-command.js';
import { captureTypography } from '../typography/capture.js';

export default class CaptureTypography extends BaseCommand {
  static override description =
    "Probe a live site's homepage with Playwright and record the actual computed font-family/size/weight/line-height for body, h1-h4, links, buttons, nav links — plus the rendered logo dimensions. Writes clients/<slug>/typography-capture.json. The scaffold step reads this so the cloned site emits matching CSS tokens.";

  static override args = {
    slug: Args.string({ description: 'Client slug', required: true }),
  };

  static override flags = {
    url: Flags.string({
      description: 'Override the homepage URL (defaults to client-config.yaml `url`).',
    }),
  };

  async run(): Promise<void> {
    const { args, flags } = await this.parse(CaptureTypography);
    const { slug } = args;
    const dir = clientDir(slug);
    if (!existsSync(dir)) this.error(`Client directory not found: ${dir}`);

    let url = flags.url;
    if (!url) {
      const config = readClientConfig(slug);
      url = config.url;
    }
    if (!url) this.error(`No URL — pass --url or set url in client-config.yaml.`);

    this.log(`Capturing typography from ${url}...`);
    const { chromium } = await import('playwright');
    const browser = await chromium.launch();
    try {
      const result = await captureTypography(browser, url);
      const outPath = join(dir, 'typography-capture.json');
      writeFileSync(outPath, JSON.stringify(result, null, 2), 'utf8');

      this.log(`\nObserved font families on the page (after browser fallbacks resolved):`);
      for (const f of result.observedFamilies) this.log(`  - ${f}`);

      const dump = (label: string, s: typeof result.body | null): void => {
        if (!s) {
          this.log(`  ${label.padEnd(8)} (not found)`);
          return;
        }
        const lh = s.lineHeightPx ? `lh=${s.lineHeightPx}px` : 'lh=normal';
        this.log(`  ${label.padEnd(8)} ${s.primaryFamily} ${s.fontSizePx}px / w${s.fontWeight} ${lh}`);
      };
      this.log(`\nRendered styles:`);
      dump('body', result.body);
      dump('h1', result.h1);
      dump('h2', result.h2);
      dump('h3', result.h3);
      dump('h4', result.h4);
      dump('link', result.link);
      dump('button', result.button);
      dump('navLink', result.navLink);

      if (result.logo) {
        this.log(
          `\nLogo: ${result.logo.width}×${result.logo.height} (intrinsic ${result.logo.naturalWidth}×${result.logo.naturalHeight}) ${result.logo.src.slice(0, 80)}`,
        );
      } else {
        this.log(`\nLogo: not detected.`);
      }

      this.log(`\nWrote ${outPath}`);
    } finally {
      await browser.close();
    }
  }
}
