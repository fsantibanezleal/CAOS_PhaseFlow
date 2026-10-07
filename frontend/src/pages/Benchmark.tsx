import { useShellLang } from '@fasl-work/caos-app-shell';
import { DocPage, TopicGroups, type Lang } from '../content/doc.tsx';
import { BENCHMARK } from '../content/benchmark.tsx';

const T = {
  title: { en: 'Benchmark', es: 'Comparación' },
  lede: {
    en: 'PhaseFlow against the published record on the same problem only: the published instance against MineLib and an external exact solve, its destination variant against the 2018 results, and the real models\' ultimate pits. Then the bounds, best plans and runtimes of every case, and the learned and in-browser lanes measured against the exact pipeline.',
    es: 'PhaseFlow contra el registro publicado solo sobre el mismo problema: la instancia publicada contra MineLib y una resolución exacta externa, su variante con destinos contra los resultados de 2018, y los pits finales de los modelos reales. Luego las cotas, los mejores planes y los tiempos de cada caso, y los carriles aprendido y en el navegador medidos contra el pipeline exacto.',
  },
  sections: { en: 'Comparisons', es: 'Comparaciones' },
};

export default function Benchmark() {
  const lang = useShellLang() as Lang;
  return (
    <DocPage title={T.title[lang]} lede={T.lede[lang]}>
      <TopicGroups lang={lang} label={T.sections} groups={BENCHMARK} />
    </DocPage>
  );
}
