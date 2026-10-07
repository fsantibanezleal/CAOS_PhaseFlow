import { StrictMode, useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, Route, Routes } from 'react-router-dom';
import { CalendarClock } from 'lucide-react';
import { AppShell, applyTheme, CitationsProvider, readTheme, useShellLang, type ShellConfig } from '@fasl-work/caos-app-shell';
import '@fasl-work/caos-app-shell/styles.css';
import './phaseflow.css';
import './content/content.css';
import { CITATIONS } from './data/citations.ts';
import { architecture } from './architecture.ts';
import { APP_VERSION } from './lib/artifacts.ts';
import Tool from './pages/Tool.tsx';
import Focus from './pages/Focus.tsx';
import Introduction from './pages/Introduction.tsx';
import Methodology from './pages/Methodology.tsx';
import Implementation from './pages/Implementation.tsx';
import Experiments from './pages/Experiments.tsx';
import Benchmark from './pages/Benchmark.tsx';

applyTheme(readTheme());

const config: ShellConfig = {
  product: { name: 'PhaseFlow', mark: <CalendarClock size={18} aria-hidden="true" /> },
  routes: [
    { path: '/', en: 'App', es: 'App' },
    { path: '/introduction', en: 'Introduction', es: 'Introducción' },
    { path: '/methodology', en: 'Methodology', es: 'Metodología' },
    { path: '/implementation', en: 'Implementation', es: 'Implementación' },
    { path: '/experiments', en: 'Experiments', es: 'Experimentos' },
    { path: '/benchmark', en: 'Benchmark', es: 'Comparación' },
  ],
  links: { github: 'https://github.com/fsantibanezleal/CAOS_PhaseFlow' },
  version: APP_VERSION,
  architecture,
  footer: {
    // One short line: what the numbers run on and the one limit a reader needs. The long form (bounds,
    // licences, scope) lives on the content pages and in the architecture modal.
    attribution: { en: 'Developed by Felipe Santibáñez-Leal', es: 'Desarrollado por Felipe Santibáñez-Leal' },
    license: { en: 'MIT', es: 'MIT' },
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
          <Route path="/focus/:caseId" element={<Focus />} />
          <Route
            path="*"
            element={
              <AppShell config={config}>
                <Routes>
                  <Route path="/" element={<Tool />} />
                  <Route path="/introduction" element={<Introduction />} />
                  <Route path="/methodology" element={<Methodology />} />
                  <Route path="/implementation" element={<Implementation />} />
                  <Route path="/experiments" element={<Experiments />} />
                  <Route path="/benchmark" element={<Benchmark />} />
                  <Route path="*" element={<Tool />} />
                </Routes>
              </AppShell>
            }
          />
        </Routes>
      </CitationsProvider>
    </BrowserRouter>
  </StrictMode>,
);
