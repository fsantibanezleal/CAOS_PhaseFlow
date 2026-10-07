/**
 * The building blocks of the five reading pages: a page inside the shell's wide page body, a row of
 * top-level groups, and inside each group a vertical rail of topics. A topic carries, in order, its
 * prose, its governing equations in KaTeX (every one captioned), the symbols those equations use, a
 * figure, the numbers read from the committed artifacts, an assumptions-and-limits callout and its own
 * references. A topic is data, so the five pages share one layout and a fix lands once.
 */
import { Callout, Equation, Figure, Refs, SubTabs, Tabs, InlineMath } from '@fasl-work/caos-app-shell';
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

const T = {
  limits: { en: 'Assumptions and limits', es: 'Supuestos y límites' },
  refs: { en: 'References', es: 'Referencias' },
  symbols: { en: 'Symbols', es: 'Símbolos' },
  facts: { en: 'At a glance', es: 'En breve' },
};

const text = (value: string | Bi, lang: Lang) => (typeof value === 'string' ? value : value[lang]);

/** Decimal commas inside TeX for Spanish: `0.08` becomes `0{,}08`, which KaTeX sets without a space. */
export function localizeTex(tex: string, lang: Lang): string {
  return lang === 'es' ? tex.replace(/(\d)\.(\d)/g, '$1{,}$2') : tex;
}

function Equations({ topic, lang }: { topic: Topic; lang: Lang }) {
  if (!topic.equations?.length) return null;
  return (
    <div className="pfd-equations">
      {topic.equations.map((eq, i) => (
        <Equation key={i} tex={localizeTex(text(eq.tex, lang), lang)} caption={eq.caption[lang]} />
      ))}
    </div>
  );
}

function Symbols({ topic, lang }: { topic: Topic; lang: Lang }) {
  if (!topic.symbols?.length) return null;
  return (
    <div className="pfd-symbols">
      <div className="pfd-symbols-title">{T.symbols[lang]}</div>
      <dl>
        {topic.symbols.map((s, i) => (
          <div key={i} className="pfd-symbol">
            <dt><InlineMath tex={s.tex} /></dt>
            <dd>{s.text[lang]}</dd>
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
            <dt>{f.k[lang]}</dt>
            <dd>{f.v[lang]}</dd>
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
      <ol>{topic.steps.items.map((s, i) => <li key={i}>{s[lang]}</li>)}</ol>
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
        : <span key={i}>{part}</span>))}
    </>
  );
}

export function TopicView({ topic, lang }: { topic: Topic; lang: Lang }) {
  const limits = topic.limits && topic.limits.length > 0 && (
    <Callout variant="honest" title={T.limits[lang]}>
      <ul>{topic.limits.map((l, i) => <li key={i}>{l[lang]}</li>)}</ul>
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
    <article className="prose pfd-topic" data-topic={topic.id}>
      <h2>{topic.title[lang]}</h2>
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
      {topic.refs.length > 0 && <Refs ids={topic.refs} label={T.refs[lang]} />}
    </article>
  );
}

/** Top-level groups, each a vertical rail of topics (ADR-0071 rule 5: a few peers, then group). */
export function TopicGroups({ groups, lang, label }: { groups: TopicGroup[]; lang: Lang; label: Bi }) {
  return (
    <Tabs
      ariaLabel={label[lang]}
      tabs={groups.map((group) => ({
        id: group.id,
        label: group.label[lang],
        content: group.topics.length === 1
          ? <TopicView topic={group.topics[0]} lang={lang} />
          : (
            <SubTabs
              orientation="vertical"
              ariaLabel={group.label[lang]}
              tabs={group.topics.map((topic) => ({
                id: topic.id,
                label: topic.title[lang],
                content: <TopicView topic={topic} lang={lang} />,
              }))}
            />
          ),
      }))}
    />
  );
}

export function DocPage({ title, lede, children }: { title: string; lede: ReactNode; children: ReactNode }) {
  return (
    <div className="page-body wide pfd-page">
      <header className="pfd-head">
        <h1>{title}</h1>
        <p className="pfd-lede">{lede}</p>
      </header>
      {children}
    </div>
  );
}
