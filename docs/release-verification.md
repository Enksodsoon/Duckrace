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
- Full functional browser run: 24 passed in 1.1 minutes using full Chromium headless; opt-in visual suites skipped in this functional run. Covers downloads, 100/101 entries, seed/cosmetic independence, replay, cancellation, duplicate elimination/undo, CSV import, responsive overflow, failed GLB retry, context-loss recovery, empty/single pools, repeated starts, clock suspension, delayed readiness, v2 migration, keyboard controls and offline upgrades.
- The original headless shell used SwiftShader and produced severe UI stalls. Full Chromium is now explicit in Playwright configuration, consistent with [Playwright browser documentation](https://playwright.dev/docs/browsers). Intercepted-network tests block service workers; clock tests pause at a fixed future instant. These changes preserve all behavioral assertions.
- Actual desktop/mobile screen capture: passed in 31.3 seconds after the final heading-contrast fix, all five breed and stage views plus Home, Setup, Garage, Race, Results and Settings. Screenshots are under `docs/evidence/local/`.
- Hosted preview workflow passed in 19.9 seconds at deployment `dpl_2Mbp7J7soKBzHRFDcVcPQMTtX9ii` / commit `74180904a80f1293a8521dece622c8898cdd48b1`: synthetic CSV import (including comma in a name), Mandarin/bow customization, Mountain River selection, timed race, actual downloaded CSV content, replay with unchanged history and next-round pool. Zero console errors, page errors or asset failures. Evidence: `docs/evidence/live/preview-latest.json` and screenshot. Protection remained enabled; a temporary authenticated preview link was used and excluded from evidence.
- Ten 100-entry real-time 30-second races passed across all five stages at both desktop and mobile viewport sizes. Recorded 24,394 frames / 287.0305 measured seconds, weighted 84.99 FPS, minimum two-second reported interval 84 FPS. Machine: Windows x64, i5-12600, 12 logical CPUs, about 32 GiB RAM, Quadro P2000 / ANGLE D3D11, Chromium 153.0.8010.12. Desktop 1440x900 means 84.90–85.01 FPS; mobile viewport 390x844 means 84.97–85.01 FPS on the same desktop GPU. Auto selected low for Forest Lake and all narrow-screen runs; other desktop stages stayed high. JSON preserves actual frame/time counters, quality and GPU. This meets the observed desktop target; physical-mobile qualification remains unfinished.
- Checked merge, production and cached-browser verification remain pending. GitHub's separate TestSprite status says `No tests detected`, provides no test URL or report, and does not represent the repository's Vitest/Playwright suite. It is not counted as passed.

## Reference comparison and remaining work

| Reference requirement | Implemented evidence | Limit or remaining acceptance work |
| --- | --- | --- |
| Timber identity, charcoal panels, gold controls | Seven implemented screens; individual desktop and mobile concepts generated before layout implementation; actual desktop/mobile captures | Long panels scroll vertically on mobile; no horizontal overflow. Heading contrast was corrected after screenshot review |
| Real moving ducks with feather detail | Editable Blender sources, original UV textures, baked tangent normals, skeletal idle/swim/celebrate clips; all six actual cosmetic meshes | Game models remain visibly less natural than the photographic reference; no claim of scanned or photographic anatomy |
| Alpine depth and distinct places | Five 3D stage configurations, textured pine branches, banks, rocks, architecture, lotus/reeds, irregular snowy mountain layers and atmospheric Forest Lake sky | Procedural mountain forms, banks and architecture retain a substantial fidelity gap from the photographic concept |
| Water and wakes | Animated reflective water shader and per-duck wake geometry | Sky HDR reflection is real; terrain reflection is analytical, not scene-correct planar reflection |
| Chase race readability | Buoy lanes, finish banner, bounded nearby name labels, standings, timer, progress strip and any-participant follow control; actual 100-entry desktop/mobile screenshots | Chase shows nearby racers; the overview and participant selector expose the wider 100-entry field |
| 60 FPS desktop / 30 FPS mobile | Ten real-time 100-entry runs with recorded frame/time counters; measured desktop target met | Mobile viewport results use the same desktop GPU. Physical mobile-device performance has not been measured |

These limits are explicit unfinished acceptance work. Generated concepts and successful builds do not prove visual fidelity or device performance.
