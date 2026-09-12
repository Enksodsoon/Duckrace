# Original 3D environment assets

The environment combines original procedural 3D geometry created for Duck Race on 2026-09-12 with the following free CC0 assets downloaded directly from Poly Haven. Editable geometry and shader source: `src/scene/terrain.js`, `Environment.jsx`, and `Water.jsx`. Original code follows this repository's license; the listed external files remain CC0.

| Local file | Original source | Author | License |
| --- | --- | --- | --- |
| `public/assets/environment/kloppenheim_06_puresky_2k.hdr` | [Kloppenheim 06 Pure Sky](https://polyhaven.com/a/kloppenheim_06_puresky), [direct 2K HDR](https://dl.polyhaven.org/file/ph-assets/HDRIs/hdr/2k/kloppenheim_06_puresky_2k.hdr) | Greg Zaal, sky edit by Jarod Guest | CC0, verified source page 2026-09-12 |
| `public/assets/environment/rock-color.jpg` | [Rock Boulder Dry](https://polyhaven.com/a/rock_boulder_dry), [direct 1K diffuse JPG](https://dl.polyhaven.org/file/ph-assets/Textures/jpg/1k/rock_boulder_dry/rock_boulder_dry_diff_1k.jpg) | Dimitrios Savva (photography), Rico Cilliers (processing) | CC0, verified source page 2026-09-12 |
| `public/assets/environment/rock-normal.jpg` | [Rock Boulder Dry](https://polyhaven.com/a/rock_boulder_dry), [direct 1K OpenGL normal JPG](https://dl.polyhaven.org/file/ph-assets/Textures/jpg/1k/rock_boulder_dry/rock_boulder_dry_nor_gl_1k.jpg) | Dimitrios Savva (photography), Rico Cilliers (processing) | CC0, verified source page 2026-09-12 |
| `public/assets/environment/ground-color.jpg` | [Forest Floor](https://polyhaven.com/a/forest_floor), [direct 1K diffuse JPG](https://dl.polyhaven.org/file/ph-assets/Textures/jpg/1k/forest_floor/forest_floor_diff_1k.jpg) | eye-candy.xyz | CC0, verified source page 2026-09-12 |
| `public/assets/environment/ground-normal.jpg` | [Forest Floor](https://polyhaven.com/a/forest_floor), [direct 1K OpenGL normal JPG](https://dl.polyhaven.org/file/ph-assets/Textures/jpg/1k/forest_floor/forest_floor_nor_gl_1k.jpg) | eye-candy.xyz | CC0, verified source page 2026-09-12 |

| Asset | Source and technique | Use |
| --- | --- | --- |
| Shoreline terrain | Original indexed heightfield with deterministic vertex colors and normal calculation | Both banks, all five stages |
| Alpine mountain ranges | Original multilayer ridge heightfields, vertex-colored exposed rock and snow | Real geometry skyline with depth and fog |
| Pine trees | Original radial branch cards with original procedural needle alpha texture and tapered trunks, instanced | Forest Lake and Mountain River |
| Broadleaf trees | Original clustered low-poly crown meshes and trunks, instanced | Lotus Pond, Sunset Marsh and Village Canal |
| Bark | Original 128px procedural canvas color texture | Tree trunks |
| Rocks, reeds, lilies and lotus flowers | Original geometry and deterministic instancing | Shoreline detail |
| Docks, cabins and canal bridge | Original timber and masonry mesh assemblies | Stage architecture |
| Finish banner | Original canvas typography and checkerboard texture | 3D finish gate |
| Water and wakes | Original GPU shaders using animated normals, Fresnel response, approximate sky/terrain reflection, sun highlights and translucent wake geometry | Water surface and every racing duck |
| Sky and image-based lighting | CC0 pure-sky HDRI, rendered at infinity and sampled for scene lighting and water reflection | Atmosphere and reflective duck materials |

No illustration or photograph substitutes for the three-dimensional terrain, water, architecture or ducks. The HDRI contains distant sky only. The visual reference informs composition, lighting and palette. Water samples the real HDR sky, while reflected terrain silhouettes remain an analytic approximation, not scene-correct planar or screen-space reflections. Shadows use a bounded directional shadow map; no ray tracing or global illumination is claimed. Tree branches, mountains and water are stylized procedural assets and should not be described as photographic scans.

Quality `auto` begins with a lower pixel ratio on narrow screens or CPUs exposing four or fewer logical cores, and reduces quality after two measured intervals below 28 FPS. `low` disables shadow maps and reduces shoreline instances and mesh subdivisions. Above 24 racers, ducks use the artist's separate LOD assets and GPU instancing per breed/mesh; no primitive body fallback is used. Hero ducks use the original rigged asset and available idle/swim/celebrate animation. Racing crowds use the real swim clip and bone-texture skinning shared per breed, plus per-instance body bob and yaw. This avoids 100 independent animation mixers while preserving animated anatomy. Accessories are skinned from the original full asset when its LOD omits cosmetics.

The scene reports measured two-second frame averages, draw calls, triangles and duck count through `onMetrics`. These runtime values are not a claim of a tested 60 FPS desktop / 30 FPS mobile hardware target. Real-device performance requires separate evidence.

## Local review evidence

On 2026-09-12, the scene was viewed in the user's Edge browser at 1912 x 948 on ANGLE / NVIDIA Quadro P2000 / Direct3D11. The final 100-racer forest scene, including real shared-breed skeletal animation, reported a two-second sample of 82 FPS, 82 draw calls and 928,030 submitted triangles at low quality. A foreground home sample reported 82 FPS at high quality. These are short local observations, not a sustained hardware benchmark or mobile qualification. Earlier occluded-window samples reported 1 FPS; activating the browser tab restored normal frame scheduling. Slow frames remain represented in the metrics, and hidden-document frames are excluded.

Visual review corrected an initially reversed finish banner, bottom-cropped chase framing and an incorrect effect-bearing Canvas fallback. Non-race screens now show a single large standing hero on a foreground timber dock; finish gate and lane buoys appear only during races. The final instanced skin shader rendered without browser console errors. Scene-only ESLint and the integrated Vite production build passed locally. The scene retains a visible fidelity gap from the supplied photoreal concept, particularly foliage, simplified architecture and analytically reflected terrain. No production or mobile performance qualification is implied by this review.
