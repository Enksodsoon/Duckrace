<div align="center">
  <img src="public/icon.svg" width="84" alt="Duckrace logo" />
  <h1>Duckrace</h1>
  <p><strong>A cinematic 3D duck-race randomizer built for fair draws, live presentation, and a little chaos.</strong></p>
  <p>
    <a href="https://duckrace-six.vercel.app"><strong>Play live</strong></a>
    ·
    <a href="#how-duckrace-works"><strong>See how it works</strong></a>
    ·
    <a href="#actual-gameplay"><strong>Actual gameplay</strong></a>
    ·
    <a href="#run-locally"><strong>Run locally</strong></a>
  </p>
  <p>
    <a href="https://github.com/Enksodsoon/Duckrace/actions/workflows/ci.yml"><img src="https://github.com/Enksodsoon/Duckrace/actions/workflows/ci.yml/badge.svg" alt="CI status" /></a>
  </p>
</div>

<p align="center">
  <img src="docs/showcase/home.webp" width="100%" alt="Duckrace promotional overview using the game's characters and lakeside visual identity" />
</p>

<p align="center">
  <em>Promotional showcase based on Duckrace's real characters, stages, and interface. Untouched in-game captures are shown below.</em>
</p>

Duckrace turns a random draw into an animated 3D race. Add up to **100 names**, choose a duck and a stage, then run a timed race or an instant draw. The finish order is decided **before** the animation begins, so camera motion, frame rate, graphics quality, duck models, and stage effects cannot change the result.

## How Duckrace works

<table>
  <tr>
    <td width="50%" align="center">
      <strong>1 · Set up the race</strong><br/>
      <img src="docs/showcase/setup.webp" alt="Duckrace race setup promotional screen" /><br/>
      <sub>Add up to 100 entries, choose race length and winners, or run an instant pick.</sub>
    </td>
    <td width="50%" align="center">
      <strong>2 · Customize your ducks</strong><br/>
      <img src="docs/showcase/garage.webp" alt="Duckrace duck garage promotional screen" /><br/>
      <sub>Choose a breed and cosmetic look without changing anyone's odds.</sub>
    </td>
  </tr>
  <tr>
    <td width="50%" align="center">
      <strong>3 · Choose a stage</strong><br/>
      <img src="docs/showcase/stages.webp" alt="Duckrace stage selection promotional screen" /><br/>
      <sub>Race across Forest Lake, Mountain River, Lotus Pond, Sunset Marsh, or Village Canal.</sub>
    </td>
    <td width="50%" align="center">
      <strong>4 · Watch the race live</strong><br/>
      <img src="docs/showcase/race.webp" alt="Duckrace live race promotional screen" /><br/>
      <sub>Follow the field from start to finish with standings, camera controls, and race progress.</sub>
    </td>
  </tr>
  <tr>
    <td colspan="2" align="center">
      <strong>5 · Review the results</strong><br/>
      <img src="docs/showcase/results.webp" width="75%" alt="Duckrace results promotional screen" /><br/>
      <sub>See the winner, replay the race, export results, and continue an elimination session.</sub>
    </td>
  </tr>
</table>

## Why Duckrace

| | |
|---|---|
| **Fair by design** | Fresh draws use browser cryptographic randomness and an unbiased Fisher–Yates shuffle. The complete result is stored in an immutable race record before animation. |
| **Built for presentation** | Audience mode, green-screen/chroma mode, replay, camera options, and responsive layouts make the race practical on a projector, laptop, tablet, or phone. |
| **Actually 3D** | Original rigged Blender ducks race through procedural 3D environments rendered with React Three Fiber and Three.js. |
| **Local-first** | No account is required. Race state, saved results, settings, and replays stay in the browser. |
| **Reproducible when needed** | Explicit seeds can reproduce a draw; replay reads the saved result rather than running the randomizer again. |
| **Resilient** | The app includes offline shell caching, graceful WebGL failure handling, reduced-motion support, and adaptive graphics. |

## Actual gameplay

The images below are **untouched captures from the running project**, retained alongside the promotional showcase so the repository always shows exactly what the current game looks like.

### From names to finish line

<table>
  <tr>
    <td width="50%" align="center"><strong>Home</strong><br/><img src="docs/evidence/local/home-desktop.png" alt="Actual Duckrace home screen" /></td>
    <td width="50%" align="center"><strong>Race setup</strong><br/><img src="docs/evidence/local/setup-desktop.png" alt="Actual Duckrace setup screen" /></td>
  </tr>
  <tr>
    <td width="50%" align="center"><strong>Duck garage</strong><br/><img src="docs/evidence/local/garage-desktop.png" alt="Actual Duckrace garage screen" /></td>
    <td width="50%" align="center"><strong>Stage selection</strong><br/><img src="docs/evidence/local/stages-desktop.png" alt="Actual Duckrace stages screen" /></td>
  </tr>
  <tr>
    <td width="50%" align="center"><strong>3D race</strong><br/><img src="docs/evidence/local/race-desktop.png" alt="Actual Duckrace race screen" /></td>
    <td width="50%" align="center"><strong>Results</strong><br/><img src="docs/evidence/local/results-desktop.png" alt="Actual Duckrace results screen" /></td>
  </tr>
</table>

### Five race environments

<p align="center">
  <img src="docs/evidence/local/stage-forest-lake.png" width="19%" alt="Forest Lake stage" />
  <img src="docs/evidence/local/stage-mountain-river.png" width="19%" alt="Mountain River stage" />
  <img src="docs/evidence/local/stage-lotus-pond.png" width="19%" alt="Lotus Pond stage" />
  <img src="docs/evidence/local/stage-sunset-marsh.png" width="19%" alt="Sunset Marsh stage" />
  <img src="docs/evidence/local/stage-village-canal.png" width="19%" alt="Village Canal stage" />
</p>

**Forest Lake** · **Mountain River** · **Lotus Pond** · **Sunset Marsh** · **Village Canal**

### Five duck breeds + cosmetics

<p align="center">
  <img src="docs/evidence/local/breed-mallard.png" width="19%" alt="Mallard duck" />
  <img src="docs/evidence/local/breed-white-pekin.png" width="19%" alt="White Pekin duck" />
  <img src="docs/evidence/local/breed-khaki-campbell.png" width="19%" alt="Khaki Campbell duck" />
  <img src="docs/evidence/local/breed-mandarin.png" width="19%" alt="Mandarin duck" />
  <img src="docs/evidence/local/breed-runner.png" width="19%" alt="Runner duck" />
</p>

Choose from **Mallard, White Pekin, Khaki Campbell, Mandarin,** and **Runner**, then add optional cosmetics including an explorer hat, aviator glasses, bow tie, race medal, luck charm, or duck badge.

### Responsive by default

<p align="center">
  <img src="docs/evidence/local/home-mobile.png" width="24%" alt="Duckrace home screen on mobile" />
  <img src="docs/evidence/local/setup-mobile.png" width="24%" alt="Duckrace setup screen on mobile" />
  <img src="docs/evidence/local/garage-mobile.png" width="24%" alt="Duckrace garage screen on mobile" />
  <img src="docs/evidence/local/results-mobile.png" width="24%" alt="Duckrace results screen on mobile" />
</p>

## What you can do

- Run a **timed 3D race** or an **instant draw** with up to 100 entrants.
- Eliminate selected entrants and **undo** eliminations.
- Save race results locally, **replay** completed races, and export result data.
- Use an explicit seed for a reproducible draw.
- Choose between five original duck breeds, six accessories, and five stages.
- Switch camera behavior and presentation settings without affecting the result.
- Use audience and chroma/green-screen modes for live presentation.
- Continue using the randomizer even if 3D rendering is unavailable.

## Fairness model

```text
Names entered
    │
    ▼
Cryptographic random source / explicit seed
    │
    ▼
Unbiased Fisher–Yates shuffle
    │
    ▼
Versioned immutable race record
(full finish order fixed here)
    │
    ├──────────────► Saved result / replay
    │
    ▼
3D animation reads the fixed order
    │
    ▼
Finish-line presentation
```

The animation is presentation only. Graphics quality, frame timing, stages, breeds, accessories, and camera movement cannot re-order the stored result. Replays read the saved race record and do not perform a new draw.

## Tech stack

| Area | Technology |
|---|---|
| UI | React 18, Vite |
| 3D | Three.js, React Three Fiber, Drei |
| Art pipeline | Blender source assets + generated runtime asset pipeline |
| Icons / utilities | Lucide React, QRCode React |
| Unit tests | Vitest |
| Browser tests | Playwright |
| Quality gates | ESLint, npm audit, GitHub Actions |
| Hosting | Vercel |
| Offline | Service worker + versioned release assets |

## Run locally

Requires the Node version declared in `.nvmrc`.

```bash
git clone https://github.com/Enksodsoon/Duckrace.git
cd Duckrace
npm ci
npm run dev
```

Vite will print the local development URL in your terminal.

### Production build

```bash
npm run build
npm run preview
```

The production build creates the Vite bundle, publishes art under content-versioned release paths, generates the offline shell cache, writes asset credits, and emits `release.json` with the deployment commit SHA.

## Verification

```bash
npm run lint
npm test -- --run
npm run build
npx playwright install chromium
npm run test:e2e
npm audit --audit-level=high
```

The repository CI runs linting, unit tests, a production build, sharded Chromium end-to-end tests, and a high-severity dependency audit. `VISUAL_EVIDENCE=1` enables the optional screenshot acceptance suite.

## Repository map

```text
Duckrace/
├─ src/                 React application, race flow, and 3D scene
│  ├─ components/       Screens and reusable UI
│  ├─ lib/              Race/session logic, catalog, persistence
│  └─ scene/            3D ducks, environments, effects, rendering
├─ public/assets/       Runtime duck and environment assets
├─ art-source/          Editable Blender sources and art references
├─ scripts/             Build, release, performance, and art tooling
├─ e2e/                 Playwright browser coverage
├─ docs/showcase/       Promotional repository artwork based on the game
├─ docs/evidence/       Untouched UI, visual, and performance evidence
└─ docs/                Asset rights and release verification notes
```

## Deployment

The existing Vercel project is **`duckrace`** and is linked to this repository. Pull requests receive preview deployments; checked `main` releases serve the live application at:

**https://duckrace-six.vercel.app**

Do not create a duplicate Vercel project for this repository.

## Assets & attribution

Duckrace includes original rigged duck models and project-authored runtime assets. Editable Blender sources are kept in `art-source`; authoring tools live under `scripts/art`.

Promotional repository artwork lives in `docs/showcase/` and is kept separate from the recorded in-game evidence in `docs/evidence/`.

- [Duck asset rights and attribution](docs/asset-rights.md)
- [Environment asset notes](docs/environment-assets.md)
- [Release verification](docs/release-verification.md)
- [Recorded visual/performance evidence](docs/evidence/README.md)

No paid assets or gameplay advantages are included.

## Contributing

Contributions are welcome. Please read [CONTRIBUTING.md](CONTRIBUTING.md) before opening a pull request. For visual changes, include before/after screenshots when possible and keep race fairness logic independent from presentation code.

---

<div align="center">
  <sub>Built as a fair randomizer first — presented as a duck race because random selection does not have to be boring.</sub>
</div>
