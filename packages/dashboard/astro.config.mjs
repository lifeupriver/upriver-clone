import { defineConfig } from 'astro/config';
import react from '@astrojs/react';
import vercel from '@astrojs/vercel';
import node from '@astrojs/node';
import tailwindcss from '@tailwindcss/vite';

// `UPRIVER_ASTRO_ADAPTER=node` produces a standalone Node SSR server at
// `dist/server/entry.mjs` — used by `upriver report build` when it boots the
// dashboard locally to render report HTML. Default is the Vercel adapter
// (production deploys).
const useNodeAdapter = process.env.UPRIVER_ASTRO_ADAPTER === 'node';

export default defineConfig({
  output: 'server',
  adapter: useNodeAdapter ? node({ mode: 'standalone' }) : vercel(),
  integrations: [react()],
  vite: {
    plugins: [tailwindcss()],
  },
  server: {
    port: 4321,
  },
  // Astro 5 enables checkOrigin (CSRF) by default. The Vercel adapter's
  // header-forwarding combined with our same-origin POST forms (notably
  // /login) trips the check spuriously. Disable globally — magic-link
  // sign-in has no CSRF-replay surface (the link itself is the credential),
  // and our other POST endpoints are JSON APIs that validate body shape +
  // session cookies (Supabase Auth, sameSite=lax).
  security: {
    checkOrigin: false,
  },
});
