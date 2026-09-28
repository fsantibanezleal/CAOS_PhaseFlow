import { useShellLang } from '@fasl-work/caos-app-shell';

/**
 * Text the ENGINE wrote into the artifact: method notes, contract flags, skip reasons, lane reasons.
 * oreblocks and the pipeline write it in English, and the same string is the provenance record, so it
 * is not re-worded in the browser. A Spanish page marks it as engine output in English instead of
 * passing it off as part of the translation.
 */
export function EngineText({ text }: { text: string | null | undefined }) {
  const es = useShellLang() === 'es';
  if (!text) return null;
  if (!es) return <>{text}</>;
  return (
    <>
      <span className="pf-engine-tag" title="Texto escrito por el motor, en inglés">motor · EN</span>{' '}
      <span lang="en">{text}</span>
    </>
  );
}
