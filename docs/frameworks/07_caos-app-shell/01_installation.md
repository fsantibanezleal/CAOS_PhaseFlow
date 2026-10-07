# App shell · 01 · Installation

```bash
cd frontend && npm ci      # @fasl-work/caos-app-shell@^0.6.13 from the lockfile
```

```ts
import { AppShell, CitationsProvider, applyTheme, readTheme, useShellLang } from '@fasl-work/caos-app-shell';
import '@fasl-work/caos-app-shell/styles.css';   // once, in main.tsx
```

The shell's styles define the design tokens (`--color-*`) every product stylesheet and figure reads; a
token the shell does not define renders as nothing, which `frontend/test/tokens.test.ts` catches.
