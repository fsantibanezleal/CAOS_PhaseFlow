// Shared state for the App and the focus route: the selected case, its trace, the period cursor and
// the selected method. Both surfaces read the same hook, so switching between them cannot show two
// different answers, and the ADR-0070 round trip (App -> focus -> App) preserves the scenario.

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useShellLang, useThemeStore } from '@fasl-work/caos-app-shell';
import { loadIndex, loadManifest, loadTrace } from './artifacts.ts';
import type { CaseIndex, CaseManifest, ScheduleTrace, TraceMethod } from './contract.types.ts';

export interface CaseState {
  index: CaseIndex | null;
  manifest: CaseManifest | null;
  trace: ScheduleTrace | null;
  caseId: string;
  setCaseId: (id: string) => void;
  method: TraceMethod | null;
  methodId: string;
  setMethodId: (id: string) => void;
  cursor: number;
  setCursor: (t: number) => void;
  playing: boolean;
  setPlaying: (p: boolean) => void;
  error: string | null;
  loading: boolean;
  lang: 'en' | 'es';
  theme: string;
}

/** The animation is a period cursor over a precomputed schedule, never a re-solve per frame, it
 *  starts PAUSED, and it halts on a hidden tab. That is the no-autoplay rule, and on a scheduling
 *  product it is also the difference between an animation and a compute bomb. */
export function useCase(initialCaseId?: string): CaseState {
  const [index, setIndex] = useState<CaseIndex | null>(null);
  const [caseId, setCaseIdRaw] = useState(initialCaseId ?? '');
  const [manifest, setManifest] = useState<CaseManifest | null>(null);
  const [trace, setTrace] = useState<ScheduleTrace | null>(null);
  const [methodId, setMethodId] = useState('');
  const [cursor, setCursor] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const lang = useShellLang();
  const theme = useThemeStore((s) => s.theme);
  const timer = useRef<number | null>(null);

  useEffect(() => {
    loadIndex()
      .then((idx) => {
        setIndex(idx);
        if (!caseId) {
          const def = idx.cases.find((c) => c.default) ?? idx.cases[0];
          setCaseIdRaw(def.case_id);
        }
      })
      .catch((e) => setError(String(e)));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!caseId) return;
    let live = true;
    setLoading(true);
    Promise.all([loadManifest(caseId), loadTrace(caseId)])
      .then(([m, t]) => {
        if (!live) return;
        setManifest(m);
        setTrace(t);
        // The default selection may only be a COMPARABLE rung. `min-width` does not re-impose capacity
    // and `destination-toposort` solves a different problem, and ranking them here opened the 3D pit
    // on a plan that overshot a period capacity by 18.65 percent on three cases.
    const comparable = t.methods.filter((m) => m.rung !== 'beyond');
    const best = (comparable.length ? comparable : t.methods).reduce((a, b) =>
      a.npv > b.npv || (a.npv === b.npv && a.method >= b.method) ? a : b,
    );
        setMethodId(best.method);
        setCursor(t.scenario.periods - 1);
        setPlaying(false);
        setError(null);
      })
      .catch((e) => live && setError(String(e)))
      .finally(() => live && setLoading(false));
    return () => { live = false; };
  }, [caseId]);

  useEffect(() => {
    if (!playing || !trace) return;
    // Pressing play at the END must REPLAY. Without this the cursor is left on the last period when the
    // run finishes, so the next press starts the interval, the first tick immediately re-hits the
    // end condition, playback stops again and the button reads as dead. Rewind on start instead.
    setCursor((c) => (c + 1 >= trace.scenario.periods ? 0 : c));
    const step = () => {
      setCursor((c) => {
        if (c + 1 >= trace.scenario.periods) { setPlaying(false); return c; }
        return c + 1;
      });
    };
    timer.current = window.setInterval(step, 900);
    const onVis = () => { if (document.hidden) setPlaying(false); };
    document.addEventListener('visibilitychange', onVis);
    return () => {
      if (timer.current) window.clearInterval(timer.current);
      document.removeEventListener('visibilitychange', onVis);
    };
  }, [playing, trace]);

  const setCaseId = useCallback((id: string) => { setCaseIdRaw(id); }, []);

  const method = useMemo(
    () => trace?.methods.find((m) => m.method === methodId) ?? trace?.methods[0] ?? null,
    [trace, methodId],
  );

  return {
    index, manifest, trace, caseId, setCaseId, method, methodId, setMethodId,
    cursor, setCursor, playing, setPlaying, error, loading, lang, theme,
  };
}

/** The state NAMED on the stage, in words, per ADR-0070 clause 4. */
/**
 * The sentence under the stage, describing the schedule that is ON SCREEN.
 *
 * `periods` is passed in because the focus route re-solves live and can change the horizon: the HUD
 * read `Period 12 of 8` while the clock beside it read `12 / 14`, and the tonnage sentence stayed
 * frozen on the baked plan while the NPV above it followed the live one. A caption that describes a
 * different schedule from the picture is worse than no caption.
 */
export function stageLabel(
  trace: ScheduleTrace,
  method: TraceMethod,
  cursor: number,
  lang: 'en' | 'es',
  periods?: number,
): { title: string; sub: string } {
  const p = method.periods[cursor];
  const T = periods ?? trace.scenario.periods;
  const binding = p
    ? p.resourceUse
        .map((u, r) => ({ r, pct: p.resourceLimit[r] > 0 ? (100 * u) / p.resourceLimit[r] : 0 }))
        .sort((a, b) => b.pct - a.pct)[0]
    : null;
  const resName = binding ? trace.scenario.resources[binding.r]?.name ?? `r${binding.r}` : '';
  const dead = p && p.blocks === 0;

  if (lang === 'es') {
    return {
      title: `Periodo ${cursor + 1} de ${T}`,
      sub: dead
        ? 'Sin extraccion: el rajo termino antes que el horizonte, y el grafico lo dice en vez de ocultarlo.'
        : `${(p?.minedTonnes ?? 0) / 1e6 > 0 ? ((p!.minedTonnes) / 1e6).toFixed(2) : '0.00'} Mt movidas, ` +
          `${binding ? `${resName} al ${binding.pct.toFixed(0)}% de su limite` : 'sin limite activo'}. ` +
          `Cada pared expuesta lleva el color del ano que la descubrio.`,
    };
  }
  return {
    title: `Period ${cursor + 1} of ${T}`,
    sub: dead
      ? 'Nothing mined: the pit finished before the horizon did, and the chart says so rather than hiding it.'
      : `${((p?.minedTonnes ?? 0) / 1e6).toFixed(2)} Mt moved, ` +
        `${binding ? `${resName} at ${binding.pct.toFixed(0)}% of its limit` : 'no binding limit'}. ` +
        `Every exposed wall carries the colour of the year that uncovered it.`,
  };
}
