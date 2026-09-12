# SDD ledger — plan: docs/superpowers/plans/2026-09-12-realistic-duck-race.md

Isolated new clone Duckrace-production, branch feat/realistic-duck-race. No existing user working tree changed.

| Tasks | Shared interface | Preflight |
|---|---|---|
| Engine / UI | RaceRecord and sampling | Freeze record once per draw; only UI completion mutates elimination/history |
| Engine / renderer | sampleRace(record, elapsedMs) | Cosmetic state cannot alter ranking |
| Assets / renderer | GLB meshes and texture URLs | Original/free licensed only, loadable local assets |
| UI / tests | semantic controls | Existing workflows retained with updated navigation |
| Release / caching | hashed assets and shell | No mixed release caches |
| Engine | permutation / tests | Need rejection sampling, seed reproducibility, duplicate IDs |
| Assets | visuals / scope | All five breeds/stages required; inspect quality before claiming completion |
| UI | screens / scope | No economy, cosmetic-only garage |
| QA | evidence / scope | Responsive viewport does not establish physical mobile FPS |
| Release | preview / production | Deploy and verify separately |

Ruling: fresh clone on feature branch satisfies requested isolation; no redundant nested worktree.
Ruling: user explicitly authorized merge and production deployment, so skill generic permission prompts do not require reapproval.
Ruling: generated concept is a design target, not evidence of implemented 3D quality.

Task 1: engine implemented, independently reviewed, 15 engine tests passed. Result records deeply validated and final-frame progress clamped.
Task 2: Blender asset pipeline and five-stage scene implemented; final cosmetic exports and sustained benchmark in progress. Original sources and external CC0 attribution retained.
Task 3: seven-screen UI implemented, migration and browser workflows exercised. Review fixed duplicate resurrection, surviving appearance changes, multiline CSV splitting, wrong Results hero, and asset-readiness timing.
Task 4: 59 unit tests and lint passed; dependency audit zero. Final browser/visual suite pending final art build. See docs/release-verification.md for exact evidence boundaries.
Task 5: existing Vercel project and rollback deployment verified. Preview, checked merge, production and cached-browser upgrade remain pending.
