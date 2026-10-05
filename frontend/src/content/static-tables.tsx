/** Measurements committed beside the models, read at run time. */
import { dec } from '../lib/artifacts.ts';
import type { Lang } from './doc.tsx';
import { Pending, useJson } from './panels.tsx';

interface PreviewTiming {
  measured: string;
  runtime: string;
  rows: { case: string; nBlocks: number; previewMs: number; exactMs: number; share: number; previewGapPct: number; extsGapPct: number }[];
}

/** The learned plan against the exact live solve, per twin, from the committed measurement. */
export function PreviewTimingTable({ lang }: { lang: Lang }) {
  const es = lang === 'es';
  const data = useJson<PreviewTiming>('/models/learned-preview-timing.json');
  if (!data || data === 'error') return <Pending lang={lang} state={data as null | 'error'} />;
  return (
    <div className="pfd-scroll">
      <table className="pfd-table">
        <caption>
          {es
            ? `Medido el ${data.measured} con el motor TypeScript del navegador (${data.runtime}), cada gemelo en su escenario horneado.`
            : `Measured on ${data.measured} with the browser's TypeScript engine (${data.runtime}), each twin at its baked setting.`}
        </caption>
        <thead>
          <tr>
            <th>{es ? 'caso' : 'case'}</th><th className="num">{es ? 'bloques' : 'blocks'}</th>
            <th className="num">{es ? 'plan aprendido' : 'learned plan'}</th><th className="num">{es ? 'solución exacta' : 'exact solve'}</th>
            <th className="num">{es ? 'aceleración' : 'speed-up'}</th><th className="num">{es ? 'aprendido / ExTS' : 'learned / ExTS'}</th>
            <th className="num">{es ? 'brecha aprendido' : 'learned gap'}</th><th className="num">{es ? 'brecha ExTS' : 'ExTS gap'}</th>
          </tr>
        </thead>
        <tbody>
          {data.rows.map((r) => (
            <tr key={r.case}>
              <th scope="row">{r.case}</th>
              <td className="num">{r.nBlocks.toLocaleString(es ? 'es-CL' : 'en-US')}</td>
              <td className="num">{`${r.previewMs} ms`}</td>
              <td className="num">{`${dec(r.exactMs / 1000, 2)} s`}</td>
              <td className="num">{`${dec(r.exactMs / Math.max(1, r.previewMs), 0)}x`}</td>
              <td className="num">{`${dec(100 * r.share, 1)}%`}</td>
              <td className="num">{`${dec(r.previewGapPct, 2)}%`}</td>
              <td className="num">{`${dec(r.extsGapPct, 2)}%`}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
