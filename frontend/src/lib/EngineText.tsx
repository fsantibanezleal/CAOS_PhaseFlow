import { useShellLang } from '@fasl-work/caos-app-shell';

/** Localise numeric values in engine-authored English notes without rewriting IDs or versions. */
export function localizeEngineText(text: string, lang: string): string {
  if (lang !== 'es') return text;
  return text.replace(/(?<![\w./])(-?\d+)\.(\d+)(?=(?:[eE][+-]?\d+|\s*%|\s|[,;:!?)}\]]|$))/g, '$1,$2');
}

/**
 * Text the ENGINE wrote into the artifact: method notes, contract flags, skip reasons, lane reasons.
 * oreblocks and the pipeline write it in English, and the same string is the provenance record, so it
 * is not re-worded in the browser. A Spanish page marks it as engine output in English instead of
 * passing it off as part of the translation.
 */
export function EngineText({ text, lang }: { text: string | null | undefined; lang?: string }) {
  const shellLang = useShellLang();
  if (!text) return null;
  const es = (lang ?? shellLang) === 'es';
  if (!es) return <>{text}</>;
  const localized = localizeEngineText(text, 'es');
  return (
    <>
      <span className="pf-engine-tag" title="Texto escrito por el motor, en inglés">motor · EN</span>{' '}
      <span lang="en">{localized}</span>
    </>
  );
}
