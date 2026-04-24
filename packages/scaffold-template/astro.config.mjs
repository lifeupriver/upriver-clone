import { defineConfig } from 'astro/config';
import react from '@astrojs/react';
import vercel from '@astrojs/vercel';
import tailwindcss from '@tailwindcss/vite';

// Hybrid: default to static output. Admin routes opt into SSR via
// `export const prerender = false;` in the page frontmatter. The Vercel
// adapter provides the SSR runtime for those routes.
export default defineConfig({
  output: 'static',
  adapter: vercel(),
  integrations: [react()],
  vite: {
    plugins: [tailwindcss()],
  },
});
