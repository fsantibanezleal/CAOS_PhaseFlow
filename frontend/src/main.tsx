import { StrictMode, Suspense, lazy, useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, Route, Routes } from 'react-router';
import { CalendarClock } from 'lucide-react';
import { AppShell, applyTheme, CitationsProvider, Landing, readTheme, STANDARD_ROUTES, useShellLang, type ShellConfig } from '@fasl-work/caos-app-shell';
import 'katex/dist/katex.min.css';
import '@fasl-work/caos-app-shell/styles.css';
import './phaseflow.css';
import './content/content.css';
import { CITATIONS } from './data/citations.ts';
import product from '../../product.json';
import { architecture } from './architecture.ts';
import { APP_VERSION, loadIndex, loadManifest } from './lib/artifacts.ts';
const Tool = lazy(() => import('./pages/Tool.tsx'));
const Focus = lazy(() => import('./pages/Focus.tsx'));
const Introduction = lazy(() => import('./pages/Introduction.tsx'));
const Methodology = lazy(() => import('./pages/Methodology.tsx'));
const Implementation = lazy(() => import('./pages/Implementation.tsx'));
const Experiments = lazy(() => import('./pages/Experiments.tsx'));
const Benchmark = lazy(() => import('./pages/Benchmark.tsx'));

applyTheme(readTheme());

const config: ShellConfig = {
  product: { name: product.name, mark: <CalendarClock size={18} aria-hidden="true" /> },
  routes: STANDARD_ROUTES,
  links: { github: product.repo },
  version: APP_VERSION,
  license: { en: `${product.license} license`, es: `Licencia ${product.license}` },
  visibility: product.visibility === 'private' ? 'private' : 'public',
  contain: true,
  architecture,
  footer: {
    // One short line: what the numbers run on and the one limit a reader needs. The long form (bounds,
    // licences, scope) lives on the content pages and in the architecture modal.
    attribution: { en: 'Developed by Felipe Santibáñez-Leal', es: 'Desarrollado por Felipe Santibáñez-Leal' },
    provenance: {
      en: 'Engine: oreblocks (MIT); MineLib not redistributed',
      es: 'Motor: oreblocks (MIT); MineLib no redistribuido',
    },
    disclaimer: {
      en: 'Not for mine planning',
      es: 'No apto para planificación minera',
    },
  },
};

function DocumentLanguage() {
  const lang = useShellLang();
  useEffect(() => { document.documentElement.lang = lang; }, [lang]);
  useEffect(() => {
    // Warm the small, public manifest catalog once per page context. Case views and research pages
    // then share completed responses instead of racing route changes against cold JSON requests.
    void loadIndex().then((index) => Promise.all(index.cases.map((item) => loadManifest(item.case_id))).catch(() => undefined));
  }, []);
  return null;
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <CitationsProvider items={CITATIONS}>
        <DocumentLanguage />
        <Routes>
          {/* ADR-0070: the focus view renders OUTSIDE the shell. The header and footer are exactly the
              chrome a focus view exists to escape, so it cannot be a child of AppShell. */}
          <Route path="/focus/:caseId" element={<Suspense fallback={<p data-state="loading" role="status">Loading PhaseFlow…</p>}><Focus /></Suspense>} />
          <Route
            path="*"
            element={
              <AppShell config={config}>
                <Suspense fallback={<p data-state="loading" role="status">Loading PhaseFlow…</p>}>
                <Routes>
                  <Route path="/" element={<Landing />} />
                  <Route path="/app" element={<Tool />} />
                  <Route path="/introduction" element={<Introduction />} />
                  <Route path="/methodology" element={<Methodology />} />
                  <Route path="/implementation" element={<Implementation />} />
                  <Route path="/experiments" element={<Experiments />} />
                  <Route path="/benchmark" element={<Benchmark />} />
                  <Route path="*" element={<Landing />} />
                </Routes>
                </Suspense>
              </AppShell>
            }
          />
        </Routes>
      </CitationsProvider>
    </BrowserRouter>
  </StrictMode>,
);
