import { useShellLang } from '@fasl-work/caos-app-shell';
import { DocPage, TopicGroups, type Lang } from '../content/doc.tsx';
import { BOUND, FORMULATION } from '../content/methodology-a.tsx';
import { BEYOND, LEARNED, SCHEDULES } from '../content/methodology-b.tsx';

const T = {
  title: { en: 'Methodology', es: 'Metodología' },
  lede: {
    en: 'The scheduling problem as the sources state it, the relaxation that certifies every number on these pages, the methods that turn that relaxation into a plan, the two learned models, and what lies beyond the fixed-destination problem. Each method is given with its equations, what it guarantees and what it does not.',
    es: 'El problema de programación tal como lo enuncian las fuentes, la relajación que certifica cada número de estas páginas, los métodos que convierten esa relajación en un plan, los dos modelos aprendidos, y lo que está más allá del problema con destino fijo. Cada método se presenta con sus ecuaciones, lo que garantiza y lo que no.',
  },
  sections: { en: 'Method families', es: 'Familias de métodos' },
};

export default function Methodology() {
  const lang = useShellLang() as Lang;
  return (
    <DocPage title={T.title[lang]} lede={T.lede[lang]}>
      <TopicGroups lang={lang} label={T.sections} groups={[FORMULATION, BOUND, SCHEDULES, LEARNED, BEYOND]} />
    </DocPage>
  );
}
