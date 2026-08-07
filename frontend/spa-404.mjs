// GitHub Pages serves 404.html for unknown paths. A single-page app with real routes (/methodology,
// /focus/<case>) needs that file to BE the app, or every deep link and every refresh 404s.
import { copyFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
const dist = join(process.cwd(), 'dist');
if (existsSync(join(dist, 'index.html'))) {
  copyFileSync(join(dist, 'index.html'), join(dist, '404.html'));
  console.log('[spa-404] dist/index.html -> dist/404.html');
}
