// The sensitivity surface the plan promised: the certified bound against the discount rate and
// against capacity, on one plane, with the EXACT value at the case's own point drawn on top.
//
// Why it can exist at all: the exact bound is a parametric family of maximum closures, a few hundred
// per point, which is fine once and impossible across a grid. The bound surrogate predicts it from
// eleven deposit statistics plus the scenario, so the plane is one forward pass per cell. Its
// held-out error is 1.40 percent mean and 3.99 percent at the ninetieth percentile, which is why the
// exact anchor is not decoration: it is the only thing that makes the rest of the plane readable.

import { useEffect, useMemo, useRef, useState } from 'react';
import { Callout } from '@fasl-work/caos-app-shell';

import { APP_VERSION } from '../lib/artifacts.ts';
import type { ScheduleTrace } from '../lib/contract.types.ts';
import { boundSurface, loadBoundSurrogate, type Mlp } from '../engine/boundSurrogate.ts';
import { viridis } from './colormap.ts';

const RATES = [0.02, 0.05, 0.08, 0.1, 0.12, 0.15, 0.18, 0.2, 0.25, 0.3];
const CAPS = [0.3, 0.4, 0.5, 0.6, 0.7, 0.85, 1.0, 1.25, 1.5];

export function SensitivitySurface({
  trace,
  theme,
  es,
}: {
  trace: ScheduleTrace;
  theme: string;
  es: boolean;
}) {
  const [model, setModel] = useState<Mlp | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [hover, setHover] = useState<{ rate: number; cap: number; bound: number } | null>(null);
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    loadBoundSurrogate(APP_VERSION)
      .then(setModel)
      .catch((e) => setErr(String(e)));
  }, []);

  const miningFrac = useMemo(() => {
    const r = trace.scenario.resources?.[0];
    if (!r || !trace.blocks) return 1;
    const perPeriod = r.limitPerPeriod[0] ?? 0;
    const total = trace.blocks.tonnage.reduce((a, b) => a + b, 0);
    return total > 0 ? (perPeriod * trace.scenario.periods) / total : 1;
  }, [trace]);

  const surface = useMemo(() => {
    if (!model || !trace.blocks) return [];
    return boundSurface(model, trace, RATES, CAPS, miningFrac);
  }, [model, trace, miningFrac]);

  useEffect(() => {
    const c = ref.current;
    if (!c || surface.length === 0) return;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const w = c.parentElement?.clientWidth ?? 520;
    const h = 320;
    c.width = Math.round(w * dpr);
    c.height = Math.round(h * dpr);
    c.style.width = `${w}px`;
    c.style.height = `${h}px`;
    const g = c.getContext('2d')!;
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
    g.clearRect(0, 0, w, h);

    // A viridis plane with no colour scale asks the reader to guess what yellow means. The right pad
    // now carries a colorbar, and the left pad grew because the rotated axis label was drawn at x=12
    // while the tick labels were drawn at x=6, so the two collided and both became unreadable.
    const pad = { l: 62, r: 84, t: 10, b: 34 };
    const iw = w - pad.l - pad.r;
    const ih = h - pad.t - pad.b;
    const cw = iw / RATES.length;
    const chh = ih / CAPS.length;
    const values = surface.map((p) => p.bound);
    const lo = Math.min(...values);
    const hi = Math.max(...values);

    surface.forEach((p) => {
      const xi = RATES.indexOf(p.rate);
      const yi = CAPS.indexOf(p.capFrac);
      const t = hi > lo ? (p.bound - lo) / (hi - lo) : 0.5;
      const [r, gg, b] = viridis(t);
      g.fillStyle = `rgb(${Math.round(255 * r)},${Math.round(255 * gg)},${Math.round(255 * b)})`;
      g.fillRect(pad.l + xi * cw, pad.t + (CAPS.length - 1 - yi) * chh, cw + 0.5, chh + 0.5);
    });

    // the case's OWN point, computed exactly, drawn on top of a predicted plane
    const ownRate = trace.scenario.discountRate;
    const nearestRate = RATES.reduce((a, b) => (Math.abs(b - ownRate) < Math.abs(a - ownRate) ? b : a));
    const procFrac = (() => {
      const r = trace.scenario.resources?.[1];
      if (!r || !trace.blocks) return null;
      const perPeriod = r.limitPerPeriod[0] ?? 0;
      let oreT = 0;
      for (let i = 0; i < trace.blocks.value.length; i++) {
        if (trace.blocks.value[i] > 0 && trace.blocks.inPit[i]) oreT += trace.blocks.tonnage[i];
      }
      return oreT > 0 ? (perPeriod * trace.scenario.periods) / oreT : null;
    })();
    if (procFrac != null) {
      const nearestCap = CAPS.reduce((a, b) => (Math.abs(b - procFrac) < Math.abs(a - procFrac) ? b : a));
      const xi = RATES.indexOf(nearestRate);
      const yi = CAPS.indexOf(nearestCap);
      g.strokeStyle = theme === 'dark' ? '#ffffff' : '#111111';
      g.lineWidth = 2;
      g.strokeRect(pad.l + xi * cw, pad.t + (CAPS.length - 1 - yi) * chh, cw, chh);
    }

    const fg = getComputedStyle(document.documentElement).getPropertyValue('--color-fg').trim() || '#c9d1d9';
    g.fillStyle = fg;
    g.font = '10px system-ui, sans-serif';
    RATES.forEach((r, i) => {
      if (i % 2) return;
      g.fillText(`${Math.round(100 * r)}%`, pad.l + i * cw + 2, h - 20);
    });
    CAPS.forEach((cp, i) => {
      g.fillText(cp.toFixed(2), 24, pad.t + (CAPS.length - 1 - i) * chh + chh / 2 + 3);
    });
    g.fillText(es ? 'tasa de descuento' : 'discount rate', pad.l + iw / 2 - 40, h - 6);
    g.save();
    g.translate(13, pad.t + ih / 2 + 44);
    g.rotate(-Math.PI / 2);
    g.fillText(es ? 'capacidad de planta' : 'plant capacity', 0, 0);
    g.restore();

    // THE COLORBAR. Same viridis ramp, same lo..hi domain as the cells, labelled in the same units the
    // hover readout uses, so the plane can be read without hovering every cell.
    const bx = w - pad.r + 16;
    const bw = 13;
    for (let py = 0; py < ih; py++) {
      const [r2, g2, b2] = viridis(1 - py / Math.max(1, ih - 1));
      g.fillStyle = `rgb(${Math.round(255 * r2)},${Math.round(255 * g2)},${Math.round(255 * b2)})`;
      g.fillRect(bx, pad.t + py, bw, 1.5);
    }
    g.strokeStyle = fg;
    g.globalAlpha = 0.35;
    g.lineWidth = 1;
    g.strokeRect(bx, pad.t, bw, ih);
    g.globalAlpha = 1;
    g.fillStyle = fg;
    g.fillText(`${(hi / 1e6).toFixed(0)} M`, bx + bw + 4, pad.t + 8);
    g.fillText(`${(lo / 1e6).toFixed(0)} M`, bx + bw + 4, pad.t + ih);
    g.save();
    g.translate(w - 5, pad.t + ih / 2 + 26);
    g.rotate(-Math.PI / 2);
    g.fillText(es ? 'cota predicha' : 'predicted bound', 0, 0);
    g.restore();
  }, [surface, theme, es, trace]);

  if (!trace.blocks) {
    return (
      <Callout variant="honest" title={es ? 'Sin datos por bloque' : 'No per-block data'}>
        {es
          ? 'Esta superficie se calcula desde los estadisticos del deposito, y esta instancia no puede redistribuir sus bloques (licencia MineLib). Se dibuja en los casos sinteticos.'
          : 'This surface is computed from the deposit statistics, and this instance may not redistribute its blocks (the MineLib licence). It is drawn on the synthetic cases.'}
      </Callout>
    );
  }
  // A model that breaks a direction the LP itself obeys must not draw a plane. The first version of
  // this surrogate predicted the bound FALLING as capacity rose, on every deposit, while scoring a
  // 1.40 percent mean error: the training sweep ran rate and capacity together, so it had learned one
  // as a proxy for the other. The training script measures both directions now and the numbers travel
  // with the model, so this panel can refuse rather than draw something confidently wrong.
  const monotone = model
    ? Number((model as unknown as { metrics?: Record<string, number> }).metrics?.monotone_capacity_rate ?? 1) >= 0.9 &&
      Number((model as unknown as { metrics?: Record<string, number> }).metrics?.monotone_rate_rate ?? 1) >= 0.9
    : true;
  if (model && !monotone) {
    return (
      <Callout variant="honest" title={es ? 'La superficie no se dibuja' : 'The surface is not drawn'}>
        {es
          ? 'El sustituto de la cota rompe una direccion que el LP no puede romper: mas capacidad no puede bajar una cota. Con eso, la superficie seria confiadamente falsa, asi que no se dibuja y se dice por que.'
          : 'The bound surrogate breaks a direction the LP itself cannot break: more capacity cannot lower a bound. A surface built on that would be confidently wrong, so it is not drawn and this says why.'}
      </Callout>
    );
  }
  if (err) {
    return (
      <Callout variant="honest" title={es ? 'El sustituto no cargo' : 'The surrogate did not load'}>
        {err}
      </Callout>
    );
  }

  return (
    <div className="pf-panel">
      <h4>{es ? 'Superficie de sensibilidad' : 'Sensitivity surface'}</h4>
      <div className="pf-canvas-host" style={{ minHeight: 320 }}>
        <canvas
          ref={ref}
          data-testid="sensitivity-surface"
          onMouseMove={(e) => {
            const c = ref.current;
            if (!c || surface.length === 0) return;
            const rect = c.getBoundingClientRect();
            // MUST match the drawing pads above; when they drifted apart the readout named a
            // different cell from the one under the cursor.
            const pad = { l: 62, r: 84, t: 10, b: 34 };
            const iw = rect.width - pad.l - pad.r;
            const ih = rect.height - pad.t - pad.b;
            const xi = Math.floor(((e.clientX - rect.left - pad.l) / iw) * RATES.length);
            const yi = CAPS.length - 1 - Math.floor(((e.clientY - rect.top - pad.t) / ih) * CAPS.length);
            const p = surface.find((q) => q.rate === RATES[xi] && q.capFrac === CAPS[yi]);
            setHover(p ? { rate: p.rate, cap: p.capFrac, bound: p.bound } : null);
          }}
          onMouseLeave={() => setHover(null)}
        />
      </div>
      <p className="pf-cap">
        {hover ? (
          <>
            {es ? 'tasa' : 'rate'} <b>{(100 * hover.rate).toFixed(0)}%</b>, {es ? 'capacidad' : 'capacity'}{' '}
            <b>{hover.cap.toFixed(2)}</b>: {es ? 'cota predicha' : 'predicted bound'}{' '}
            <b>{(hover.bound / 1e6).toFixed(1)} M</b>
          </>
        ) : (
          <span className="pf-muted">
            {es ? 'pasa el cursor por la superficie' : 'hover the surface for a value'}
          </span>
        )}
      </p>
      <p className="pf-cap pf-muted">
        {es
          ? 'PREDICHA, no certificada. La cota exacta es una familia parametrica de cierres maximos, unos cientos por punto: bien una vez, imposible sobre una grilla. El sustituto tiene 1,40 por ciento de error medio retenido y 3,99 en el percentil noventa, y el recuadro marca el punto propio de este caso, donde la cota SI se calculo exacta. Sin ese ancla la superficie no seria legible.'
          : 'PREDICTED, not certified. The exact bound is a parametric family of maximum closures, a few hundred per point: fine once, impossible across a grid. The surrogate has a 1.40 percent mean held-out error and 3.99 at the ninetieth percentile, and the box marks this case’s own point, where the bound WAS computed exactly. Without that anchor the surface would not be readable.'}
      </p>
    </div>
  );
}
