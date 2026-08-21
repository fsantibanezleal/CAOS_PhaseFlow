import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, Route, Routes } from 'react-router-dom';
import { CalendarClock } from 'lucide-react';
import { AppShell, applyTheme, CitationsProvider, readTheme, type ShellConfig } from '@fasl-work/caos-app-shell';
import '@fasl-work/caos-app-shell/styles.css';
import './phaseflow.css';
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
    { path: '/benchmark', en: 'Benchmark', es: 'Benchmark' },
  ],
  links: { github: 'https://github.com/fsantibanezleal/CAOS_PhaseFlow' },
  version: APP_VERSION,
  architecture,
  footer: {
    // ADR-0016 wants ONE LINE of provenance and ONE LINE of disclaimer. What used to be here was an
    // 86-word paragraph plus a 60-word paragraph, which rendered as a 263px wall of text. Capping the
    // height only hid it. The long-form version of all of this lives on Implementation and Benchmark
    // and in the architecture modal, where there is room to read it.
    provenance: {
      en:
        'Engine: oreblocks (PyPI, MIT). Certified bound: exact LP relaxation, critical multiplier ' +
        'algorithm (Chicoisne et al. 2012, doi:10.1287/opre.1120.1050). Real lane: MineLib ' +
        '(doi:10.1007/s10479-012-1258-3), not redistributed.',
      es:
        'Motor: oreblocks (PyPI, MIT). Cota certificada: relajacion LP exacta, algoritmo del ' +
        'multiplicador critico (Chicoisne et al. 2012, doi:10.1287/opre.1120.1050). Carril real: ' +
        'MineLib (doi:10.1007/s10479-012-1258-3), no redistribuido.',
    },
    disclaimer: {
      en:
        'Every schedule is a heuristic, shown with its gap to the certified bound. No stockpiles, no ' +
        'blending, no stochastic optimisation. Not for production mine planning.',
      es:
        'Cada plan es una heuristica y se muestra con su brecha a la cota certificada. Sin acopios, sin ' +
        'mezcla, sin optimizacion estocastica. No apto para planificacion minera de produccion.',
    },
  },
};

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <CitationsProvider items={CITATIONS}>
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
