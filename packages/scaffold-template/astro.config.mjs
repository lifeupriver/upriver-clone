import { defineConfig } from 'astro/config';
import react from '@astrojs/react';
import sitemap from '@astrojs/sitemap';
import vercel from '@astrojs/vercel';
import tailwindcss from '@tailwindcss/vite';

// `site` drives @astrojs/sitemap output and canonical/OG URLs in
// src/layouts/Layout.astro. Set PUBLIC_SITE_URL to the production origin
// (e.g. https://www.example.com); the placeholder keeps local and CI builds
// working before the domain is known.
const site =
  process.env.PUBLIC_SITE_URL || process.env.PRODUCTION_URL || 'https://example.com';

// Hybrid: default to static output. Admin/API routes opt into SSR via
// `export const prerender = false;` in the page frontmatter. The Vercel
// adapter provides the SSR runtime for those routes.
export default defineConfig({
  site,
  output: 'static',
  adapter: vercel(),
  integrations: [
    react(),
    // Keep the auth-gated admin surface out of the sitemap (robots.txt
    // already disallows /admin/).
    sitemap({ filter: (page) => !new URL(page).pathname.startsWith('/admin') }),
  ],
  vite: {
    plugins: [tailwindcss()],
  },
});
