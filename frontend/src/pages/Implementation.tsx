import { useShellLang } from '@fasl-work/caos-app-shell';
import { DocPage, TopicGroups, type Lang } from '../content/doc.tsx';
import { IMPLEMENTATION } from '../content/implementation.tsx';

const T = {
  title: { en: 'Implementation', es: 'Implementación' },
  lede: {
    en: 'How each method is computed here: the instances it runs on, the algorithm steps, the constants and tolerances, the approximations made where the published method could not be reproduced as stated, and what each costs, with its result on every case read from the committed evidence.',
    es: 'Cómo se calcula aquí cada método: las instancias sobre las que corre, los pasos del algoritmo, las constantes y tolerancias, las aproximaciones hechas donde el método publicado no se pudo reproducir tal como se enuncia, y cuánto cuesta cada uno, con su resultado en cada caso leído de la evidencia versionada.',
  },
  sections: { en: 'Implementation sections', es: 'Secciones de la implementación' },
};

export default function Implementation() {
  const lang = useShellLang() as Lang;
  return (
    <DocPage title={T.title[lang]} lede={T.lede[lang]}>
      <TopicGroups lang={lang} label={T.sections} groups={IMPLEMENTATION} />
    </DocPage>
  );
}
