/**
 * The building blocks of the five reading pages: a page inside the shell's wide page body, a row of
 * top-level groups, and inside each group a vertical rail of topics. A topic carries, in order, its
 * prose, its governing equations in KaTeX (every one captioned), the symbols those equations use, a
 * figure, the numbers read from the committed artifacts, an assumptions-and-limits callout and its own
 * references. A topic is data, so the five pages share one layout and a fix lands once.
 */
import { Callout, DocPage as ShellDocPage, DocSection, Equation, Figure, SubTabs, Tabs, InlineMath } from '@fasl-work/caos-app-shell';
import type { ReactNode } from 'react';

export type Lang = 'en' | 'es';
export type Bi = { en: string; es: string };

export interface Topic {
  id: string;
  title: Bi;
  /** Substantial paragraphs, in order. */
  paragraphs: Bi[];
  /** Display equations; a formula with words in it carries its TeX in both languages. */
  equations?: Array<{ tex: string | Bi; caption: Bi }>;
  /** The topic at a glance: short labelled facts shown beside the prose. */
  facts?: Array<{ k: Bi; v: Bi }>;
  /** Every symbol the equations use, defined where the reader meets it. */
  symbols?: Array<{ tex: string; text: Bi }>;
  /** An ordered procedure (an algorithm's steps, a pipeline's stages). */
  steps?: { title: Bi; items: Bi[] };
  /** A wide figure leads at full width; a narrow one sits beside the text. */
  figure?: { caption: Bi; render: (lang: Lang) => ReactNode; wide?: boolean };
  /** Content read from the committed artifacts at run time, drawn at full width after the prose. */
  data?: (lang: Lang) => ReactNode;
  /** A static table of authored values (constants, literature numbers with their source). */
  table?: { head: Bi[]; rows: Array<Array<string | Bi>> };
  /** A note that is neither a limit nor prose: a measured fact worth setting apart. */
  note?: { title: Bi; body: Bi };
  /** Assumptions and limits: what this topic does NOT establish. */
  limits?: Bi[];
  refs: string[];
}

export interface TopicGroup {
  id: string;
  label: Bi;
  topics: Topic[];
}

export type DocKind = 'introduction' | 'methodology' | 'implementation' | 'experiments' | 'benchmark';

function areaFor(page: DocKind, group: TopicGroup, topic: Topic): string {
  if (page === 'introduction') {
    return ({ chain: 'problem', pressures: 'principles', 'which-when': 'math', practice: 'pipeline', what: 'principles', scope: 'honesty' } as Record<string, string>)[topic.id] ?? 'honesty';
  }
  if (page === 'methodology') return 'method';
  if (page === 'implementation') {
    if (group.id === 'instances') return 'contract';
    if (topic.id === 'architecture') return 'architecture';
    if (topic.id === 'live' || topic.id === 'admission') return 'lanes';
    if (topic.id === 'deployment') return 'deployment';
    if (group.id === 'learned' && topic.id === 'training') return 'reproducibility';
    return 'engine';
  }
  if (page === 'experiments') {
    if (topic.id === 'datasets' || topic.id === 'cases') return 'datasets';
    if (topic.id === 'metrics') return 'metrics';
    if (topic.id === 'protocol' || topic.id === 'heldout') return 'protocol';
    return 'question';
  }
  if (page === 'benchmark') {
    if (group.id === 'robustness') return 'robustness';
    if (group.id === 'real') return 'provenance';
    if (group.id === 'lanes' && topic.id === 'parity') return 'live';
    if (group.id === 'lanes') return 'comparison';
    return topic.id === 'gap-split' ? 'caveat' : 'results';
  }
  return 'question';
}

const T = {
  limits: { en: 'Assumptions and limits', es: 'Supuestos y límites' },
  refs: { en: 'References', es: 'Referencias' },
  symbols: { en: 'Symbols', es: 'Símbolos' },
  facts: { en: 'At a glance', es: 'En breve' },
};

const text = (value: string | Bi, lang: Lang) => localizeProse(typeof value === 'string' ? value : value[lang], lang);

/** Decimal commas inside TeX for Spanish: `0.08` becomes `0{,}08`, which KaTeX sets without a space. */
export function localizeTex(tex: string, lang: Lang): string {
  return lang === 'es' ? tex.replace(/(\d)\.(\d)/g, '$1{,}$2') : tex;
}

/** Localize authored numeric prose as well as equations. Keep scientific notation and identifiers intact. */
function localizeProse(value: string, lang: Lang): string {
  if (lang !== 'es') return value;
  return value.replace(/(?<![\w.])(-?\d+)\.(\d+)(?=(?:[eE][+-]?\d+|\s*%|\s|[,)\]}]|$))/g, '$1,$2');
}

function Equations({ topic, lang }: { topic: Topic; lang: Lang }) {
  if (!topic.equations?.length) return null;
  return (
    <div className="pfd-equations">
      {topic.equations.map((eq, i) => (
        <Equation key={i} tex={localizeTex(text(eq.tex, lang), lang)} caption={text(eq.caption, lang)} />
      ))}
    </div>
  );
}

function Symbols({ topic, lang }: { topic: Topic; lang: Lang }) {
  if (!topic.symbols?.length) return null;
  return (
    <div className="pfd-symbols" data-glossary>
      <div className="pfd-symbols-title">{T.symbols[lang]}</div>
      <dl>
        {topic.symbols.map((s, i) => (
          <div key={i} className="pfd-symbol">
            <dt><InlineMath tex={s.tex} /></dt>
            <dd>{text(s.text, lang)}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

function Facts({ topic, lang }: { topic: Topic; lang: Lang }) {
  if (!topic.facts?.length) return null;
  return (
    <div className="pfd-facts">
      <div className="pfd-symbols-title">{T.facts[lang]}</div>
      <dl>
        {topic.facts.map((f, i) => (
          <div key={i} className="pfd-fact">
            <dt>{text(f.k, lang)}</dt>
            <dd>{text(f.v, lang)}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

function Steps({ topic, lang }: { topic: Topic; lang: Lang }) {
  if (!topic.steps) return null;
  return (
    <div className="pfd-steps">
      <div className="pfd-steps-title">{topic.steps.title[lang]}</div>
      <ol>{topic.steps.items.map((s, i) => <li key={i}>{text(s, lang)}</li>)}</ol>
    </div>
  );
}

/** A paragraph with inline math between `$` delimiters, rendered with KaTeX. */
export function Rich({ text: value, lang }: { text: string; lang: Lang }) {
  const parts = value.split('$');
  return (
    <>
      {parts.map((part, i) => (i % 2 === 1
        ? <InlineMath key={i} tex={localizeTex(part, lang)} />
        : <span key={i}>{localizeProse(part, lang)}</span>))}
    </>
  );
}

export function TopicView({ topic, lang, area, kind }: { topic: Topic; lang: Lang; area: string; kind?: 'classical' | 'learned' }) {
  const limits = topic.limits && topic.limits.length > 0 && (
      <Callout variant="honest" title={T.limits[lang]}>
      <ul>{topic.limits.map((l, i) => <li key={i}><Rich text={l[lang]} lang={lang} /></li>)}</ul>
    </Callout>
  );
  const note = topic.note && (
    <Callout variant="note" title={topic.note.title[lang]}>{topic.note.body[lang]}</Callout>
  );
  const prose = topic.paragraphs.map((p, i) => <p key={i}><Rich text={p[lang]} lang={lang} /></p>);
  const figure = topic.figure && (
    <div className={topic.figure.wide ? 'pfd-figure wide' : 'pfd-figure'}>
      <Figure caption={topic.figure.caption[lang]}>{topic.figure.render(lang)}</Figure>
    </div>
  );

  return (
    <DocSection title={topic.title} id={topic.id} area={area} kind={kind} refs={topic.refs}
      noRefsReason={topic.refs.length ? undefined : { en: 'This section makes no source-bound claim.', es: 'Esta sección no formula afirmaciones que requieran fuentes.' }}>
    <article className="prose pfd-topic" data-topic={topic.id}>
      {topic.figure?.wide && figure}
      <div className={topic.figure && !topic.figure.wide ? 'pfd-body with-side' : 'pfd-body'}>
        <div className="pfd-text">
          {prose}
          <Steps topic={topic} lang={lang} />
          <Equations topic={topic} lang={lang} />
        </div>
        {topic.figure && !topic.figure.wide ? (
          <div className="pfd-side">
            {figure}
            <Facts topic={topic} lang={lang} />
            <Symbols topic={topic} lang={lang} />
            {note}
          </div>
        ) : (
          <div className="pfd-side">
            <Facts topic={topic} lang={lang} />
            <Symbols topic={topic} lang={lang} />
            {note}
          </div>
        )}
      </div>
      {topic.data && <div className="pfd-data">{topic.data(lang)}</div>}
      {topic.table && (
        <div className="pfd-scroll">
          <table className="pfd-table">
            <thead><tr>{topic.table.head.map((h, i) => <th scope="col" key={i}>{h[lang]}</th>)}</tr></thead>
            <tbody>
              {topic.table.rows.map((row, i) => (
                <tr key={i}>
                  {row.map((cell, k) => (k === 0
                    ? <th scope="row" key={k}>{text(cell, lang)}</th>
                    : <td key={k}>{text(cell, lang)}</td>))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {limits}
    </article>
    </DocSection>
  );
}

/** Top-level groups, each a vertical rail of topics (ADR-0071 rule 5: a few peers, then group). */
export function TopicGroups({ groups, lang, label, page }: { groups: TopicGroup[]; lang: Lang; label: Bi; page: DocKind }) {
  return (
    <Tabs
      ariaLabel={label[lang]}
      tabs={groups.map((group) => ({
        id: group.id,
        label: group.label[lang],
        content: group.topics.length === 1
          ? <TopicView topic={group.topics[0]} lang={lang} area={areaFor(page, group, group.topics[0])} kind={page === 'methodology' ? (group.id === 'learned' ? 'learned' : 'classical') : undefined} />
          : (
            <SubTabs
              orientation="vertical"
              ariaLabel={group.label[lang]}
              tabs={group.topics.map((topic) => ({
                id: topic.id,
                label: topic.title[lang],
                content: <TopicView topic={topic} lang={lang} area={areaFor(page, group, topic)} kind={page === 'methodology' ? (group.id === 'learned' ? 'learned' : 'classical') : undefined} />,
              }))}
            />
          ),
      }))}
    />
  );
}

export function DocPage({ title, lede, children }: { title: string; lede: ReactNode; children: ReactNode }) {
  return (
    <div className="pfd-page">
      <ShellDocPage title={title} lede={lede}>
      {children}
      </ShellDocPage>
    </div>
  );
}
