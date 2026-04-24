import type { Config } from 'tailwindcss';

// Tailwind v4 does most configuration in CSS (via `@theme` in global.css).
// This file is retained for tooling that still expects a JS/TS config and
// for listing content paths explicitly.
const config: Config = {
  content: ['./src/**/*.{astro,html,js,jsx,ts,tsx,md,mdx}'],
  theme: {
    extend: {},
  },
  plugins: [],
};

export default config;
