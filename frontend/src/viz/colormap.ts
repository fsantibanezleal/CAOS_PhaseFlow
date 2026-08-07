// Period and grade ramps.
//
// Viridis is perceptually uniform and survives BOTH themes, which matters here more than usual: the
// period ramp is the data. A hue ramp would put the eye's attention wherever the hue happens to be
// most saturated rather than wherever the schedule is.

const VIRIDIS: [number, number, number][] = [
  [0.267, 0.005, 0.329], [0.283, 0.141, 0.458], [0.254, 0.265, 0.53], [0.207, 0.372, 0.553],
  [0.164, 0.471, 0.558], [0.128, 0.567, 0.551], [0.135, 0.659, 0.518], [0.267, 0.749, 0.441],
  [0.478, 0.821, 0.318], [0.741, 0.873, 0.15], [0.993, 0.906, 0.144],
];

export function viridis(t: number): [number, number, number] {
  const u = Math.min(1, Math.max(0, t)) * (VIRIDIS.length - 1);
  const i = Math.min(VIRIDIS.length - 2, Math.floor(u));
  const f = u - i;
  const a = VIRIDIS[i], b = VIRIDIS[i + 1];
  return [a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f, a[2] + (b[2] - a[2]) * f];
}

export function viridisCss(t: number): string {
  const [r, g, b] = viridis(t);
  return `rgb(${Math.round(r * 255)},${Math.round(g * 255)},${Math.round(b * 255)})`;
}

/** The period colour used everywhere: the 3D wall, the section, the plan view, the legend. */
export function periodColor(period: number, nPeriods: number): [number, number, number] {
  return viridis(nPeriods > 1 ? period / (nPeriods - 1) : 0);
}

export function periodCss(period: number, nPeriods: number): string {
  return viridisCss(nPeriods > 1 ? period / (nPeriods - 1) : 0);
}
