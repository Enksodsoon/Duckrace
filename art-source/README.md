# Editable duck assets

Regenerate with Blender 4.5:

```powershell
& '.tooling/blender-4.5.3-windows-x64/blender.exe' --background --python scripts/art/build_ducks.py
```

An optional breed list after `--` restricts regeneration (for example `-- mallard mandarin`). Meshes are authored by the script, which loads the retained original imagegen color textures and bakes tangent normals. Blender files are editable deliverables, not an external proprietary dependency.

`{breed}.blend` contains the high-resolution mesh, packed UV textures, skeleton, six optional cosmetics and three NLA animation tracks. NLA tracks are muted in the authoring rest pose; unmute one to preview it. The script exports each action as an independently playable glTF animation. Preview PNGs show the real source mesh, without cosmetics, in neutral studio lighting. Preview geometry is restored to rest pose after the exporter samples clips.

Runtime files: `{mallard,pekin,khaki,mandarin,runner}.glb` and matching `-lod.glb`. glTF axes are Y up and forward +Z. Waterline is Y=0; foot bottoms are about Y=-0.37. Length including bill/tail is about 2.55 units; principal body is about 1.8. All materials/textures are embedded in the GLB.

`DuckRoot` is the identity transform armature. `DuckSkin` is a skinned surface with five material primitives. Bones: `Body`, `Neck`, `Head`, `Wing.L`, `Wing.R`, `Foot.L`, `Foot.R`. Clone animated ducks with `SkeletonUtils.clone`; select `idle`, `swim` or `celebrate` with an AnimationMixer. The LOD mesh has no cosmetic nodes and may be instanced statically using geometry and its world matrix in the neutral bind pose.

Cosmetic meshes are named `Accessory_hat`, `Accessory_glasses`, `Accessory_bow`, `Accessory_medal`, `Accessory_charm`, `Accessory_badge`, and carry an `extras.cosmetic` value matching the suffix. glTF does not carry a standard hidden-object flag: the application must hide every cosmetic primitive and then show the selected one. Cosmetics deform with the associated head/neck bone. LOD crowds can instance a selected cosmetic from the high-detail file. Accessories never affect outcomes.

See `docs/asset-rights.md` for provenance and the remaining close-view realism limits. See the runtime manifest for measured byte/triangle counts; counts exclude cosmetic triangles.

Validation: install `gltf-validator` under ignored `.tooling/gltf-validator` and run `node scripts/art/validate_ducks.cjs`. `public/assets/ducks/validation.json` records Khronos schema/buffer/skin/animation validation, plus clip and cosmetic checks. A `NODE_SKINNED_MESH_NON_ROOT` warning is expected because skinned meshes sit beneath the identity armature; transform the cloned complete scene for placement, not the mesh alone. Source meshes retain editable quads; export-only n-gons are triangulated so normal-mapped primitives carry explicit tangent vectors.

The normal-map validation also rejects an albedo image incorrectly connected as a tangent normal map. ShaderNodeBump is baked with Blender Cycles to a separate tangent RGB image and exported through ShaderNodeNormalMap. Base-color delivery uses JPEG, normals use PNG; original lossless generated PNGs remain editable inputs. Hat previews are generated for every breed; the mallard has an additional actual render for each cosmetic.
