import { useShellLang } from '@fasl-work/caos-app-shell';
import { DocPage, TopicGroups, type Lang } from '../content/doc.tsx';
import { EXPERIMENTS } from '../content/experiments.tsx';

const T = {
  title: { en: 'Experiments', es: 'Experimentos' },
  lede: {
    en: 'Seven questions, thirteen cases built to answer them, the metrics that decide each answer and the protocol that keeps the comparison fair. Every result below is computed from the committed manifests and traces of those cases, so a number on this page is the number the bake produced.',
    es: 'Siete preguntas, trece casos construidos para responderlas, las métricas que deciden cada respuesta y el protocolo que mantiene justa la comparación. Cada resultado de abajo se calcula desde los manifiestos y trazas versionados de esos casos, de modo que un número en esta página es el número que produjo el horneado.',
  },
  sections: { en: 'Design and results', es: 'Diseño y resultados' },
};

export default function Experiments() {
  const lang = useShellLang() as Lang;
  return (
    <DocPage title={T.title[lang]} lede={T.lede[lang]}>
      <TopicGroups lang={lang} label={T.sections} groups={EXPERIMENTS} />
    </DocPage>
  );
}
