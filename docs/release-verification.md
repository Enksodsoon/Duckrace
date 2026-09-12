# Duck Race release evidence — 2026-09-12

## Baseline and rollback

- Isolated clone: `Duckrace-production`, branch `feat/realistic-duck-race`, from remote main `9ef85b5f8aa610cc46795875cfb845e6ea0bff14`.
- Existing Vercel project: `duckrace` / `prj_fRvFxkX2yi6D4bg9vHYe4dQKWRnS`.
- Confirmed production before release: `dpl_56FmK4SZGK27ULQvpzfiy1PodegB`, READY, commit `9ef85b5f8aa610cc46795875cfb845e6ea0bff14`.
- Previous immutable deployment: https://duckrace-el7a1uwtn-enk44139-9381s-projects.vercel.app . Retain for rollback.
- Production alias: https://duckrace-six.vercel.app . Alias assignment and deployment commit must be checked independently of CI.
- Baseline browser: Codex in-app browser, 1265×713. Ran a disposable old-release instant draw with Migration Maple / Migration Willow / Migration River. Old result: Migration Willow, Migration Maple, Migration River; first-place elimination left Maple/River. Keep this browser for live cached-release migration verification.

## Implemented behavior

Seven screens; five real 3D stages; five original rigged breed assets; six cosmetic accessories; 100-entry limit; cryptographic fresh draws and seeded draws; pure immutable race records; replay without redraw/elimination; entry import/generation/filtering; duplicate handling; elimination/undo; CSV/XLS/history export; sound presets; keyboard controls; audience and green-screen modes; graphics fallback.

Timed races freeze the record, prepare required 3D assets, then start the countdown. Loading delay does not consume the race duration. Instant draws remain immediate. Failed graphics and an explicit continue action allow the same fixed result to proceed without the 3D view. The Results hero is the exact saved winner, including after reload.

The release build hashes art content into physical `/assets/releases/<hash>/...` paths. The service worker precaches the complete JS/CSS shell, uses its current shell while offline, retains the preceding release cache for open tabs, and never silently substitutes new model bytes at an old path. `release.json` records the deployment SHA and asset/shell identity.

## Validation status

- Current unit tests: 59 passed, including 15 engine tests, 8 migration/entry tests, 4 asset-loading tests and 32 retained utility tests.
- Upgraded development-only Vitest to patched 4.1.11; npm audit reports zero vulnerabilities. [Upstream advisory](https://github.com/advisories/GHSA-82fw-gwwq-j7x9).
- Lint: zero errors. One documented React-hook warning reports the intentional storage-failure notification.
- Earlier browser run: 15 passed, one 60-second timeout; isolated rerun passed in 55 seconds. Subsequent model-loading changes remove the unnecessary all-ten-model preload. Final complete rerun is still required.
- Lifecycle browser tests cover empty/single-entry pools, repeated starts, clock suspension, delayed asset readiness, and v2 migration. Final readiness build rerun is pending.
- Desktop/mobile visual acceptance screenshots, preview verification, checked merge and production verification: pending.

## Reference comparison and remaining work

| Reference requirement | Implemented evidence | Limit or remaining acceptance work |
| --- | --- | --- |
| Timber identity, charcoal panels, gold controls | Seven implemented screens; individual desktop and mobile concepts generated before layout implementation | Compare final viewport screenshots, including long names and narrow touch layouts |
| Real moving ducks with feather detail | Editable Blender sources, original UV textures, baked tangent normals, skeletal idle/swim/celebrate clips; all six actual cosmetic meshes | Game models remain visibly less natural than the photographic reference; no claim of scanned or photographic anatomy |
| Alpine depth and distinct places | Five 3D stage configurations, textured pine branches, banks, rocks, architecture, lotus/reeds, mountain layers | Procedural mountain forms, banks and architecture retain a material fidelity gap from the concept |
| Water and wakes | Animated reflective water shader and per-duck wake geometry | Sky HDR reflection is real; terrain reflection is analytical, not scene-correct planar reflection |
| Chase race readability | Buoy lanes, finish banner, bounded nearby name labels, standings, timer, progress strip and any-participant follow control | Verify final 100-entry and mobile composition on the deployed build |
| 60 FPS desktop / 30 FPS mobile | Hardware-tagged scene telemetry; optimized crowd skinning, compact cosmetics and distant tree detail | Short samples are not sustained qualification. Physical mobile-device performance has not been measured |

These limits are explicit unfinished acceptance work. Generated concepts and successful builds do not prove visual fidelity or device performance.
