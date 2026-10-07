# App shell · 02 · How PhaseFlow configures it

`frontend/src/main.tsx` passes one `ShellConfig`:

| field | PhaseFlow |
|---|---|
| `product` | name and mark |
| `routes` | App (`/`), Introduction, Methodology, Implementation, Experiments, Benchmark, each with its EN and ES label |
| `links` | the GitHub repository |
| `version` | `APP_VERSION`, the display version from the artifacts |
| `architecture` | `frontend/src/architecture.ts`: the "how it was built" modal, five tabs of bilingual text with a hand-authored, theme-aware SVG each, laid out by measuring labels so a translation cannot run off a box |
| `footer` | one line: attribution, licence, provenance ("Engine: oreblocks (MIT); MineLib not redistributed"), disclaimer ("Not for mine planning") |

`CitationsProvider items={CITATIONS}` (`frontend/src/data/citations.ts`) makes every reference on the reading
pages a resolvable entry with a DOI or a stable URL. `useShellLang()` gives the current language to every
component; `applyTheme(readTheme())` restores the theme before the first paint.

**The footer is one line on purpose.** It once rendered as a 263-pixel paragraph; capping its height only
added a scrollbar. The long form (bounds, licences, scope) lives on the reading pages and in the
architecture modal, where there is room to read it.
