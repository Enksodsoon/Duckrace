# Realistic Duck Race production plan

Approved by user in the Codex task. Source baseline: 9ef85b5f8aa610cc46795875cfb845e6ea0bff14.

Deliver full 3D fair name randomization, five stages (Forest Lake, Mountain River, Lotus Pond, Sunset Marsh, Village Canal), five breeds (Mallard, White Pekin, Khaki Campbell, Mandarin, Runner), six cosmetic accessories (hat, glasses, bow tie, medal, charm, badge), 100 entries, desktop and mobile. Use free licensed assets or original Blender assets, with editable sources and GLB exports. No coin economy or gameplay advantages. Match supplied alpine photoreal references and approved six-screen concept, removing extra slogans.

1. Pure fair race engine, immutable versioned race records, replay and migration tests.
2. Original realistic breed model/rig/material and environment pipeline; generated textures and concept art; licensed sources ledger.
3. Home/setup/garage/stages/race/results/settings interface, all old workflows, single renderer, adaptive quality.
4. Functional, visual, accessibility, 100-entry performance and service-worker verification.
5. CI, preview verification, checked merge, existing Vercel production release and live browser verification; rollback if regression.

Preserve entry import/generation/deduplication, instant pick, podium, seed, elimination/undo, history/export, shortcuts and audience/overlay. Fresh results use cryptographic random draws; seeded results reproducible; frame timing and appearance never affect order. Duplicate occurrences have IDs. Replay never draws or eliminates again. Preserve validated v1/v2 data. Reject >100 entries without truncation; WebGL unavailable retains randomizer.

Completion requires actual production and visual evidence. Targets 60 FPS desktop / 30 FPS mobile require measured hardware, not claims from responsive emulation. Do not represent a flat image or primitive placeholder as completed 3D art.
