# KaTeX · 02 · How equations reach the page

A topic on a reading page carries `equations: [{ tex, caption }]` and optional `symbols: [{ tex, text }]`
(`frontend/src/content/doc.tsx`). `TopicGroups` renders each equation with the shell's `Equation`
(display style, captioned) and each symbol with `InlineMath` in a definition list. Prose paragraphs may
contain `$...$`; `doc.tsx` splits them and renders the math parts inline.

```tsx
{ tex: String.raw`\alpha=\frac{b^{u}-U}{b^{u}-b^{l}},\qquad x=\alpha\,x^{l}+(1-\alpha)\,x^{u}`,
  caption: { en: 'The optimal convex combination of two consecutive nested pits (Theorem 3.1)', es: '...' } }
```

Every equation is captioned in both languages: an uncaptioned formula is a decoration.
