# Original 3D environment assets

The environment combines original procedural 3D geometry created for Duck Race on 2026-09-12 with the following free CC0 assets downloaded directly from Poly Haven. Editable geometry and shader source: `src/scene/terrain.js`, `Environment.jsx`, and `Water.jsx`. Original code follows this repository's license; the listed external files remain CC0.

| Local file | Original source | Author | License |
| --- | --- | --- | --- |
| `public/assets/environment/kloppenheim_06_puresky_2k.hdr` | [Kloppenheim 06 Pure Sky](https://polyhaven.com/a/kloppenheim_06_puresky), [direct 2K HDR](https://dl.polyhaven.org/file/ph-assets/HDRIs/hdr/2k/kloppenheim_06_puresky_2k.hdr) | Greg Zaal, sky edit by Jarod Guest | CC0, verified source page 2026-09-12 |
| `public/assets/environment/kloppenheim_05_puresky_2k.hdr` | [Kloppenheim 05 Pure Sky](https://polyhaven.com/a/kloppenheim_05_puresky), [direct 2K HDR](https://dl.polyhaven.org/file/ph-assets/HDRIs/hdr/2k/kloppenheim_05_puresky_2k.hdr) | Greg Zaal, sky edit by Jarod Guest | CC0, verified source page 2026-09-12 |
| `public/assets/environment/rock-color.jpg` | [Rock Boulder Dry](https://polyhaven.com/a/rock_boulder_dry), [direct 1K diffuse JPG](https://dl.polyhaven.org/file/ph-assets/Textures/jpg/1k/rock_boulder_dry/rock_boulder_dry_diff_1k.jpg) | Dimitrios Savva (photography), Rico Cilliers (processing) | CC0, verified source page 2026-09-12 |
| `public/assets/environment/rock-normal.jpg` | [Rock Boulder Dry](https://polyhaven.com/a/rock_boulder_dry), [direct 1K OpenGL normal JPG](https://dl.polyhaven.org/file/ph-assets/Textures/jpg/1k/rock_boulder_dry/rock_boulder_dry_nor_gl_1k.jpg) | Dimitrios Savva (photography), Rico Cilliers (processing) | CC0, verified source page 2026-09-12 |
| `public/assets/environment/ground-color.jpg` | [Forest Floor](https://polyhaven.com/a/forest_floor), [direct 1K diffuse JPG](https://dl.polyhaven.org/file/ph-assets/Textures/jpg/1k/forest_floor/forest_floor_diff_1k.jpg) | eye-candy.xyz | CC0, verified source page 2026-09-12 |
| `public/assets/environment/ground-normal.jpg` | [Forest Floor](https://polyhaven.com/a/forest_floor), [direct 1K OpenGL normal JPG](https://dl.polyhaven.org/file/ph-assets/Textures/jpg/1k/forest_floor/forest_floor_nor_gl_1k.jpg) | eye-candy.xyz | CC0, verified source page 2026-09-12 |
| `public/assets/environment/pine-twig-color.jpg` | [Pine Tree 01](https://polyhaven.com/a/pine_tree_01), [direct 1K twig diffuse](https://dl.polyhaven.org/file/ph-assets/Models/jpg/1k/pine_tree_01/pine_tree_01_twig_diff_1k.jpg) | Rico Cilliers (modeling), Rob Tuytel (photography) | CC0, verified source page 2026-09-12 |
| `public/assets/environment/pine-twig-alpha.jpg` | [Pine Tree 01](https://polyhaven.com/a/pine_tree_01), [direct 1K twig alpha](https://dl.polyhaven.org/file/ph-assets/Models/jpg/1k/pine_tree_01/pine_tree_01_twig_alpha_1k.jpg) | Rico Cilliers, Rob Tuytel | CC0, verified source page 2026-09-12 |
| `public/assets/environment/pine-bark-color.jpg` | [Pine Tree 01](https://polyhaven.com/a/pine_tree_01), [direct 1K bark diffuse](https://dl.polyhaven.org/file/ph-assets/Models/jpg/1k/pine_tree_01/pine_tree_01_bark_diff_1k.jpg) | Rico Cilliers, Rob Tuytel | CC0, verified source page 2026-09-12 |
| `public/assets/environment/pine-bark-normal.jpg` | [Pine Tree 01](https://polyhaven.com/a/pine_tree_01), [direct 1K bark normal](https://dl.polyhaven.org/file/ph-assets/Models/jpg/1k/pine_tree_01/pine_tree_01_bark_nor_gl_1k.jpg) | Rico Cilliers, Rob Tuytel | CC0, verified source page 2026-09-12 |

| Asset | Source and technique | Use |
| --- | --- | --- |
| Shoreline terrain | Original indexed heightfield with deterministic vertex colors and normal calculation | Both banks, all five stages |
| Alpine mountain ranges | Original multilayer ridge heightfields, vertex-colored exposed rock and snow | Real geometry skyline with depth and fog |
| Pine trees | Three original irregular twig-cluster geometries and woody branch networks; CC0 photographed pine twig/alpha and bark textures, instanced | Forest Lake and Mountain River |
| Broadleaf trees | Original clustered low-poly crown meshes and trunks, instanced | Lotus Pond, Sunset Marsh and Village Canal |
| Wood grain | Original 128px procedural canvas color texture | Beveled foreground dock planks |
| Rocks, reeds, lilies and lotus flowers | Original geometry and deterministic instancing | Shoreline detail |
| Docks, cabins and canal bridge | Original timber and masonry mesh assemblies | Stage architecture |
| Finish banner | Original canvas typography and checkerboard texture | 3D finish gate |
| Water and wakes | Original GPU shaders using animated normals, Fresnel response, approximate sky/terrain reflection, sun highlights and translucent wake geometry | Water surface and every racing duck |
| Sky and image-based lighting | CC0 pure-sky HDRI, rendered at infinity and sampled for scene lighting and water reflection | Atmosphere and reflective duck materials |

No illustration or photograph substitutes for the three-dimensional terrain, water, architecture or ducks. The HDRI contains distant sky only. The visual reference informs composition, lighting and palette. Water samples the real HDR sky, while reflected terrain silhouettes remain an analytic approximation, not scene-correct planar or screen-space reflections. Shadows use a bounded directional shadow map; no ray tracing or global illumination is claimed. Tree branches, mountains and water are stylized procedural assets and should not be described as photographic scans.

Quality `auto` begins with a lower pixel ratio on narrow screens or CPUs exposing four or fewer logical cores, and reduces quality after two measured intervals below 28 FPS. `low` disables shadow maps and reduces shoreline instances and mesh subdivisions. Above 24 racers, ducks use the artist's separate LOD assets and GPU instancing per breed/mesh; no primitive body fallback is used. Hero ducks use the original rigged asset and available idle/swim/celebrate animation. Racing crowds use the real swim clip and bone-texture skinning shared per breed, plus per-instance body bob and yaw. This avoids 100 independent animation mixers while preserving animated anatomy. Accessories are skinned from the original full asset when its LOD omits cosmetics.

The scene reports measured two-second frame averages, draw calls, triangles and duck count through `onMetrics`. These runtime values are not a claim of a tested 60 FPS desktop / 30 FPS mobile hardware target. Real-device performance requires separate evidence.

## Local review evidence

On 2026-09-12, the scene was viewed in the user's Edge browser at 1912 x 948 on ANGLE / NVIDIA Quadro P2000 / Direct3D11. Before the photographed pine refinement and latest duck asset regeneration, the 100-racer forest scene reported a two-second sample of 82 FPS, 82 draw calls and 928,030 submitted triangles at low quality. After those refinements and the racer labels, a foreground 100-racer sample reported 56 FPS, 117 draw calls and 1,984,412 submitted triangles at low quality; an eight-racer sample reported 64 FPS, 151 calls and 865,966 triangles. These are short local observations, not a sustained hardware benchmark or mobile qualification. Earlier occluded-window samples reported 1 FPS; activating the browser tab restored normal frame scheduling. Slow frames remain represented in the metrics, and hidden-document frames are excluded.

Visual review corrected an initially reversed finish banner, bottom-cropped chase framing and an incorrect effect-bearing Canvas fallback. Non-race screens now show a single large standing hero on a foreground timber dock; finish gate and lane buoys appear only during races. The final instanced skin shader rendered without browser console errors. Scene-only ESLint and the integrated Vite production build passed locally. The scene retains a visible fidelity gap from the supplied photoreal concept, particularly foliage, simplified architecture and analytically reflected terrain. No production or mobile performance qualification is implied by this review.

## Final local performance follow-up

The final renderer compacts accessory instances to the racers who wear them and culls duck instances outside a conservative camera frustum. This keeps visible duck geometry and animation intact; simulation positions and all 100 participant records remain present. Low quality also uses fewer twig cards on distant/outer pines and analytic water-wave derivatives. Forest banks now use rolling terrain and a greener tint, with closer shoreline tree clusters.

Final-asset observations used Edge, NVIDIA Quadro P2000 / ANGLE Direct3D11, 100 animated racers with all five breeds and mixed accessories, low quality, and a chase camera viewing a fixed-progress pack. Samples aggregate actual frame counts and elapsed seconds across sixteen approximately two-second intervals. These are shared-machine observations, not exclusive hardware certification or a whole-course benchmark.

| Configuration | Frames / elapsed seconds | Mean FPS | Lowest two-second sample | Draw calls / submitted triangles |
| --- | --- | --- | --- | --- |
| Desktop 1912 x 948, optimized observed window | 2,324 / 32.2323 | 72.10 | 47 | 107 / 808,116 |
| Desktop under competing 3D workload | 166 / 35.1216 | 4.73 | 4 | 107 / 808,116 |
| Mobile viewport emulation: 390 x 844 CSS, device scale factor 2; low quality canvas 468 x 1012 | 2,211 / 32.203 | 68.66 | 39 | 68 / 584,362 |

The slow desktop interval must not be diagnosed solely as occlusion: a read-only GPU query showed 100% GPU utilization, 55.25 W and 82 C, and process deltas confirmed another active 3D application competing for resources. It was left untouched. All recorded document focus flags were true; native window occlusion state was unavailable. The mobile viewport used the same desktop GPU with shared resource contention and no CPU throttling. It does not qualify physical mobile hardware. Viewport overrides were cleared after observation. The 60 FPS desktop target was observed in one optimized window, but performance was not maintained under concurrent GPU load.

Reproduce from the development server at `/scripts/qa/scene-preview.html`: select race, 100 racers, chase and low quality; wait for `ready.screen` to report race, let asset compilation settle, then reset the sample and leave the window foreground for at least 34 seconds. The output preserves readiness metadata and reports rolling frame/time totals, minimum interval FPS and focus flags. Divide frames by seconds for the aggregate FPS. Keep other rendering workloads idle when measuring an isolated device baseline.
