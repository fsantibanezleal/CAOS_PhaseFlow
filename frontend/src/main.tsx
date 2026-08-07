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
    provenance: {
      en:
        'Engine: oreblocks (PyPI, MIT) CPIT lane. The certified upper bound is the exact LP relaxation ' +
        'by the critical multiplier algorithm (Chicoisne et al. 2012, doi:10.1287/opre.1120.1050, ' +
        'Theorem 3.1), computed as parametric maximum closures with no LP solver, offline in Python and ' +
        'live in TypeScript. Real lane: published MineLib instances (Espinoza, Goycoolea, Moreno and ' +
        'Newman 2013, doi:10.1007/s10479-012-1258-3) fetched under their academic-download grant, never ' +
        'redistributed; only aggregate results are committed. Synthetic lane: seeded oreblocks twins, ' +
        'license-free, whose full per-block schedule ships.',
      es:
        'Motor: carril CPIT de oreblocks (PyPI, MIT). La cota superior certificada es la relajacion LP ' +
        'exacta por el algoritmo del multiplicador critico (Chicoisne et al. 2012, ' +
        'doi:10.1287/opre.1120.1050, Teorema 3.1), calculada como cierres maximos parametricos sin ' +
        'solver LP, offline en Python y en vivo en TypeScript. Carril real: instancias publicadas de ' +
        'MineLib (Espinoza, Goycoolea, Moreno y Newman 2013, doi:10.1007/s10479-012-1258-3) descargadas ' +
        'bajo su licencia academica, nunca redistribuidas; solo se publican resultados agregados. ' +
        'Carril sintetico: gemelos sembrados de oreblocks, libres de licencia, con su plan por bloque.',
    },
    disclaimer: {
      en:
        'Every schedule here is a HEURISTIC and every one is shown with its gap to the certified bound. ' +
        'The bound is exact for the LP relaxation and is not a schedule. There is no stockpile: an ' +
        'inventory whose reclaimed grade is the blend of what is inside makes the model bilinear, and ' +
        'that is stated rather than hidden. No blending, no minimum-production constraints, no ' +
        'stochastic optimisation. Not for production mine planning.',
      es:
        'Cada plan aqui es una HEURISTICA y cada uno se muestra con su brecha a la cota certificada. La ' +
        'cota es exacta para la relajacion LP y no es un plan. No hay acopio: un inventario cuya ley ' +
        'recuperada es la mezcla de su contenido vuelve bilineal el modelo, y eso se declara en vez de ' +
        'ocultarse. Sin mezcla, sin restricciones de produccion minima, sin optimizacion estocastica. No ' +
        'apto para planificacion minera de produccion.',
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
