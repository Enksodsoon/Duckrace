# Duck art provenance and rights

The five duck meshes, their UV layouts, procedurally painted feather color and normal maps, deformation rig, animation curves and cosmetic meshes are original assets authored for this repository by the Blender Python program `scripts/art/build_ducks.py`. No downloaded mesh, photograph, paid asset, model-service output or third-party texture was used in their geometry or maps. The user-supplied visual reference and approved generated concept guided anatomy, breed selection and art direction; neither image is baked into these meshes.

Editable sources are in `art-source/*.blend`; each contains the full mesh, seven-bone skeleton, vertex weights, UVs, packed images, materials and idle/swim/celebrate NLA actions. Original PNG maps are retained alongside them. Runtime exports are in `public/assets/ducks/`. The script is the reproducible authoring source. These original files may be used, modified, distributed and commercially deployed with this project without an additional asset fee. They introduce no third-party attribution requirement.

Blender is a build tool, not a shipped runtime dependency. Portable Blender 4.5.3 was downloaded from the [Blender Foundation official distribution](https://download.blender.org/release/Blender4.5/blender-4.5.3-windows-x64.zip). Blender itself is [GNU GPL licensed](https://www.blender.org/about/license/); the GPL on the tool does not impose a GPL license on rendered images or original exported artwork. The portable tool/archive are ignored and are not committed.

## Fidelity boundary

These are original anatomical game models with a continuous swept body/neck/head surface, separate layered feather vanes, a flattened bill with nostrils/nail/seam, small corneas, tarsi, toe geometry and web membranes. Mandarin has cheek ruffs and elevated sail feathers; Runner has a narrower elevated torso and longer neck. They are not scanned animals. Procedural feather repetition, head/neck shaping, cosmetic detailing and some overlapping vane intersections remain visible in close views. The supplied photographic concept is an art-direction target, **not evidence that these real-time meshes achieve photographic realism**. The Blender previews are actual renders of the exported source geometry, not the concept image.

Only performance measured in the running application on named hardware can substantiate a frame-rate claim. The assets provide a lower-detail export to support such testing, but the asset pipeline alone does not establish 60 FPS desktop or 30 FPS mobile.
