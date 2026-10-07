# App shell · 03 · Adding a topic the way the product does

The five reading pages are `DocPage` + `TopicGroups` over arrays of `TopicGroup` in
`frontend/src/content/*.tsx`. A topic is data:

```tsx
{
  id: 'bz',
  title: { en: 'The joint bound: Bienstock-Zuckerberg', es: 'La cota conjunta: Bienstock-Zuckerberg' },
  paragraphs: [{ en: '...', es: '...' }],          // transcribed from the research dossiers, never recalled
  equations: [{ tex: String.raw`...`, caption: { en: '...', es: '...' } }],
  symbols: [{ tex: '...', text: { en: '...', es: '...' } }],
  figure: { caption: { en: '...', es: '...' }, render: (lang) => <BzLoop lang={lang} /> },
  data: (lang) => <BoundSummaryPanel lang={lang} />,  // numbers read from the committed manifests
  facts: [{ k: { en: '...', es: '...' }, v: { en: '...', es: '...' } }],
  limits: [{ en: '...', es: '...' }],
  refs: ['bienstock2010', 'munoz2017'],               // ids in data/citations.ts
}
```

Rules the pages keep: every number a result depends on is read from an artifact by a panel, never typed;
figures use only `currentColor` and shell tokens so they invert with the theme; prose has no em-dash and no
arrows; both languages are written, not machine-filled; and a figure's labels must stay inside its viewBox
(`npm run check:arch` for the architecture modal).
