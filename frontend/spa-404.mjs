// GitHub Pages and client-side routing.
//
// TWO SEPARATE PROBLEMS, and copying 404.html only solves the first one.
//
// 1. RENDERING. Pages serves 404.html for any path that is not a real file, so a deep link to
//    /methodology needs that file to BE the app or the visitor sees GitHub's 404 page.
//
// 2. THE STATUS CODE. The 404.html trick makes the app appear, but the response is still HTTP 404.
//    MEASURED on production after the 0.06.000 deploy: every one of /app, /introduction, /methodology,
//    /implementation, /experiments and /benchmark returned 404 while rendering perfectly, so a browser
//    check that only looks at the screen calls this fine. It is not fine: a shared link is a 404 to
//    every crawler and every link-preview fetcher, and the product spec asks for 200-status deep links.
//
// The fix for the second is to stop pretending: write a REAL index.html at each route path, so Pages has
// an actual file to serve and answers 200. The SPA still takes over on the client; the difference is
// only in what the server says.
//
// Focus routes are dynamic (/focus/<caseId>), so the case ids come from the built manifest index rather
// than a hardcoded list that would drift the moment a case is added or removed.

import { copyFileSync, existsSync, mkdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const dist = join(process.cwd(), 'dist');
const indexHtml = join(dist, 'index.html');

if (!existsSync(indexHtml)) {
  console.error('[spa-404] dist/index.html missing; nothing to do');
  process.exit(0);
}

// 1. the fallback, for anything not pre-rendered below (an old link, a typo, a future route)
copyFileSync(indexHtml, join(dist, '404.html'));

// 2. a real file per route. Keep in sync with `config.routes` in src/main.tsx; `/` is dist/index.html
//    itself and needs no entry.
const routes = ['/app', '/introduction', '/methodology', '/implementation', '/experiments', '/benchmark'];

// `/app` is not in config.routes (the App lives at `/`), but the nav and older shared links use it and
// it falls through the router's `*` to the same page, so it gets a real file too.

const manifestIndex = join(dist, 'data', 'manifests', 'index.json');
if (existsSync(manifestIndex)) {
  try {
    const idx = JSON.parse(readFileSync(manifestIndex, 'utf8'));
    for (const c of idx.cases ?? []) {
      if (c.case_id) routes.push(`/focus/${c.case_id}`);
    }
  } catch (e) {
    console.warn(`[spa-404] could not read the manifest index, focus routes not pre-rendered: ${e.message}`);
  }
}

for (const route of routes) {
  const dir = join(dist, ...route.split('/').filter(Boolean));
  mkdirSync(dir, { recursive: true });
  copyFileSync(indexHtml, join(dir, 'index.html'));
}

console.log(`[spa-404] 404.html + ${routes.length} routes materialised for 200 responses`);
