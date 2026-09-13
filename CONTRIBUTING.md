# Contributing to Duckrace

Thanks for helping improve Duckrace. The project is a local-first 3D randomizer, so contributions should preserve two things above all else: **draw fairness** and **presentation quality**.

## Before you start

1. Check existing issues and pull requests for overlapping work.
2. Keep changes focused. Avoid unrelated refactors in the same pull request.
3. For gameplay or race-session changes, preserve the separation between the random result and the animation that presents it.
4. For visual changes, include before/after screenshots when practical.

## Local setup

```bash
git clone https://github.com/Enksodsoon/Duckrace.git
cd Duckrace
npm ci
npm run dev
```

Use the Node version declared in `.nvmrc`.

## Project structure

- `src/components/` — application screens and reusable UI
- `src/lib/` — race/session logic, persistence, catalog, utilities
- `src/scene/` — 3D rendering, ducks, environments, effects
- `public/assets/` — runtime art assets
- `art-source/` — editable Blender and source-art files
- `scripts/` — build, release, profiling, and art tooling
- `e2e/` — Playwright browser coverage
- `docs/evidence/` — captured visual and performance evidence

## Development rules

### Keep the draw independent from rendering

The race finish order is fixed before the 3D animation begins. Rendering performance, camera behavior, graphics tier, stage choice, duck breed, cosmetics, or frame timing must never change the stored result.

### Keep assets traceable

When adding or replacing art:

- keep attribution and licensing notes current;
- preserve editable sources when the project owns them;
- use the existing asset pipeline and release-versioning conventions;
- avoid silently replacing old immutable release assets.

### Keep the app usable without perfect graphics

Duckrace should continue to expose the randomizer flow when WebGL rendering fails or a device cannot sustain the full 3D experience. Respect reduced-motion and responsive behavior.

## Verification

Run the checks relevant to your change before opening a pull request:

```bash
npm run lint
npm test -- --run
npm run build
npx playwright install chromium
npm run test:e2e
npm audit --audit-level=high
```

Visual work can also use the optional screenshot acceptance flow:

```bash
VISUAL_EVIDENCE=1 npm run test:e2e
```

## Pull requests

A useful pull request should explain:

- what changed and why;
- whether fairness/session logic is affected;
- how the change was verified;
- any asset or attribution changes;
- before/after screenshots for UI or 3D presentation changes.

Keep commits understandable and avoid committing generated local files, credentials, or unrelated editor state.

## Reporting problems

When reporting a bug, include the browser/device, steps to reproduce, expected behavior, actual behavior, and a screenshot or recording when the issue is visual.
