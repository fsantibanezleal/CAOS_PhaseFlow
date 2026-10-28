import { ExecutiveView, Tabs, useShellLang } from '@fasl-work/caos-app-shell';
import { DocPage, TopicGroups, type Lang } from '../content/doc.tsx';
import { INTRODUCTION } from '../content/introduction.tsx';
import executive from '../../../content/executive.json';
import product from '../../../product.json';

const T = {
  title: { en: 'Introduction', es: 'Introducción' },
  lede: {
    en: 'The executive view frames the decision problem. The technical view explains the model, data, methods, and limits of the evidence.',
    es: 'La vista ejecutiva enmarca el problema de decisión. La vista técnica explica el modelo, los datos, los métodos y los límites de la evidencia.',
  },
  sections: { en: 'Introduction sections', es: 'Secciones de la introducción' },
};

export default function Introduction() {
  const lang = useShellLang() as Lang;
  return (
    <DocPage title={T.title[lang]} lede={`${product.tagline[lang]} ${T.lede[lang]}`}>
      <Tabs
        initial="executive"
        ariaLabel={lang === 'es' ? 'Vistas de la introducción' : 'Introduction views'}
        tabs={[
          { id: 'executive', label: lang === 'es' ? 'Ejecutiva' : 'Executive', content: <ExecutiveView data={executive} base={import.meta.env.BASE_URL} /> },
          { id: 'technical', label: lang === 'es' ? 'Técnica' : 'Technical', content: <TopicGroups lang={lang} label={T.sections} page="introduction" groups={INTRODUCTION} /> },
        ]}
      />
    </DocPage>
  );
}
