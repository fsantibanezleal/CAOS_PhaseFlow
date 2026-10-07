# three.js · 01 · Installation

```bash
cd frontend
npm ci            # installs three@^0.171.0 and @types/three from package-lock.json
```

```ts
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
```

No global install, no CDN script: the bundler (Vite) tree-shakes three.js into the app bundle, and the
lockfile fixes the exact version every build uses.
