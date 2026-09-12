/* Validate with the Khronos glTF validator installed only in ignored .tooling. */
const fs = require('node:fs');
const path = require('node:path');
const validator = require('../../.tooling/gltf-validator/node_modules/gltf-validator');
const base = path.resolve(__dirname, '../../public/assets/ducks');
(async () => {
  const results = [];
  for (const file of fs.readdirSync(base).filter((p) => p.endsWith('.glb'))) {
    const bytes = fs.readFileSync(path.join(base, file));
    const doc = JSON.parse(bytes.subarray(20, 20 + bytes.readUInt32LE(12)));
    const report = await validator.validateBytes(new Uint8Array(bytes), { uri: file });
    const animations = (doc.animations || []).map((a) => a.name);
    for (const name of ['idle', 'swim', 'celebrate']) {
      if (!animations.includes(name)) throw new Error(`${file}: missing ${name}`);
    }
    const cosmetics = doc.nodes.filter((n) => n.extras?.cosmetic).map((n) => n.extras.cosmetic);
    if (!file.includes('-lod') && cosmetics.length !== 6) throw new Error(`${file}: cosmetics ${cosmetics.length}`);
    if (!doc.skins?.length) throw new Error(`${file}: no skin`);
    for (const material of doc.materials || []) {
      const normal = material.normalTexture;
      const color = material.pbrMetallicRoughness?.baseColorTexture;
      if (normal && color && doc.textures[normal.index].source === doc.textures[color.index].source) {
        throw new Error(`${file}: ${material.name} incorrectly uses albedo as a tangent normal map`);
      }
    }
    results.push({ file, bytes: bytes.length, animations, cosmetics, errors: report.issues.numErrors, warnings: report.issues.numWarnings, messages: report.issues.messages });
  }
  fs.writeFileSync(path.join(base, 'validation.json'), JSON.stringify({ validator: 'Khronos glTF Validator', results }, null, 2));
  console.log(JSON.stringify(results.map(({ messages, ...r }) => r), null, 2));
  if (results.some((r) => r.errors)) process.exitCode = 1;
})();
