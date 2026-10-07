import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';
import { readFileSync } from 'node:fs';

// The display form from the repo's VERSION file (0.08.000), not package.json: npm requires semver there
// (0.7.6), and the footer printed that form. The same string cache-busts every artifact fetch.
const version = readFileSync(new URL('../VERSION', import.meta.url), 'utf8').trim();

export default defineConfig({
  // ROOT base, and the comment it replaces was the bug. `./` makes every asset URL relative to the
  // CURRENT path, so the SPA fallback served at /focus/<case> asked for /focus/assets/index-*.js and
  // got a 404: the app never booted and the route rendered an empty body. It only ever worked when a
  // reader clicked through from `/`, which is also the only way the browser gate reached it.
  //
  // This product is served at the root of a custom domain, so `/` is correct. A project site under a
  // path would need that path here instead; relative is right for neither once the app has routes.
  base: '/',
  plugins: [react()],
  define: { 'import.meta.env.VITE_APP_VERSION': JSON.stringify(version) },
  build: { chunkSizeWarningLimit: 1200 },
});
