import { useShellLang } from '@fasl-work/caos-app-shell';
import { DocPage, TopicGroups, type Lang } from '../content/doc.tsx';
import { INTRODUCTION } from '../content/introduction.tsx';

const T = {
  title: { en: 'Introduction', es: 'Introducción' },
  lede: {
    en: 'PhaseFlow schedules an open pit: it decides in which year each block of an ultimate pit is mined, under slope precedence in every period and mining and processing capacity per period, and it judges every schedule by its distance to a certified upper bound. It is a research instrument on published and synthetic instances, not a production planning tool.',
    es: 'PhaseFlow programa un rajo abierto: decide en qué año se extrae cada bloque de un pit final, bajo precedencia de talud en cada período y capacidad de mina y de planta por período, y juzga cada plan por su distancia a una cota superior certificada. Es un instrumento de investigación sobre instancias publicadas y sintéticas, no una herramienta de planificación de producción.',
  },
  sections: { en: 'Introduction sections', es: 'Secciones de la introducción' },
};

export default function Introduction() {
  const lang = useShellLang() as Lang;
  return (
    <DocPage title={T.title[lang]} lede={T.lede[lang]}>
      <TopicGroups lang={lang} label={T.sections} groups={INTRODUCTION} />
    </DocPage>
  );
}
