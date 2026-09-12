# Duck Race Randomizer

Local, login-free random selection presented as a Three.js duck race. Enter up to 100 names, choose a stage and appearance, and run a timed race or an instant draw. Includes elimination/undo, reproducible seeds, saved results, exports, replay, and audience/green-screen modes.

Fresh draws use browser cryptographic randomness and unbiased Fisher–Yates shuffling. A versioned immutable record fixes the full finish order before animation. Frame timing, graphics, stages, breeds, and accessories cannot change the result. Explicit seeds reproduce a draw; replays read the saved record and never eliminate or draw again.

The interface has Home, Setup, Garage, Stages, Race, Results and Settings. Five original rigged Blender breeds and six cosmetic accessories are rendered in five procedural 3D environments. These are real animated game assets, not photographic scans. See the recorded acceptance evidence for the remaining distance from the photoreal concept.

## Deploy
The existing Vercel project is `duckrace`, linked to this repository. Pull requests receive preview deployments; checked `main` releases serve https://duckrace-six.vercel.app. Do not create a duplicate project.

`npm run build` builds Vite, puts art under content-versioned release paths, generates an offline shell cache, publishes asset credits, and writes `release.json` with the Vercel commit SHA. Retain the prior deployment for rollback. The service worker retains the preceding cache for open tabs. A missing old asset fails visibly instead of silently supplying different model bytes.

## Local checks

```sh
npm ci
npm run lint
npm test -- --run
npm run build
npx playwright install chromium
npm run test:e2e
npm audit
```

`VISUAL_EVIDENCE=1` enables the optional screenshot acceptance suite. Browser viewport emulation is not a physical mobile-device performance qualification.

Source and attribution: [duck assets](docs/asset-rights.md), [environment assets](docs/environment-assets.md). Editable Blender sources are in `art-source`; authoring scripts are in `scripts/art`. No paid assets or gameplay advantages are included.
