import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';

// This deterministic field is exclusively scenery. It never touches the race engine.
export function noise(i, seed = 0) {
  const n = Math.sin(i * 127.1 + seed * 311.7) * 43758.5453;
  return n - Math.floor(n);
}

export const STAGES = {
  'forest-lake': { sky: '#9cc9e5', fog: '#bacfd8', water: '#18494e', shallows: '#438e82', land: '#638447', foliage: '#416946', sun: '#ffe0a6', sunPosition: [46, 34, 65], mountain: '#526c81', snow: true, pine: true, density: 1 },
  'mountain-river': { sky: '#bbd6e8', fog: '#bfd0d5', water: '#245d69', shallows: '#679b98', land: '#6d7360', foliage: '#354c3c', sun: '#fff7e7', sunPosition: [-35, 60, 30], mountain: '#667d91', snow: true, pine: true, density: .8 },
  'lotus-pond': { sky: '#c9d9ca', fog: '#bdcabb', water: '#294a3b', shallows: '#799067', land: '#697449', foliage: '#45663d', sun: '#ffefd1', sunPosition: [40, 35, 40], mountain: '#7e9283', snow: false, pine: false, density: .7 },
  'sunset-marsh': { sky: '#e6bd9c', fog: '#bca798', water: '#514d49', shallows: '#97836c', land: '#7d714c', foliage: '#68613b', sun: '#ffd198', sunPosition: [-25, 10, 90], mountain: '#897e84', snow: false, pine: false, density: .45 },
  'village-canal': { sky: '#c4d4db', fog: '#b8c7ca', water: '#3b5956', shallows: '#788b79', land: '#727257', foliage: '#435a3c', sun: '#fff0cd', sunPosition: [-45, 42, 45], mountain: '#869493', snow: false, pine: false, density: .55 },
};

export function bankX(z, side, width = 14) {
  return side * (width + Math.sin(z * .039 + side * .7) * (width > 20 ? 6 : 2.6) + Math.sin(z * .13 + side) * 1.2);
}

export function bankHeight(away, z) {
  return .35 + Math.min(away * .11, 3.5) + Math.sin(z * .045 + away * .095) * 1.15 * (1 - Math.exp(-away * .22));
}

export function makeBank(side, config, width) {
  const columns = 20, rows = 100;
  const positions = [], colors = [], indices = [], uvs = [];
  const base = new THREE.Color(config.land);
  const rock = new THREE.Color('#909087');
  for (let iz = 0; iz <= rows; iz++) {
    const z = -65 + iz * 3.6;
    for (let ix = 0; ix <= columns; ix++) {
      const away = ix * 2.5;
      const x = bankX(z, side, width) + side * away;
      const y = ix === 0 ? -.28 : bankHeight(away, z) + Math.sin(z * .14 + ix * .3) * .25 + noise(ix + iz * 51, 4) * .25;
      positions.push(x, y, z);
      uvs.push(x / 5, z / 5);
      const shade = .7 + noise(ix * 17 + iz, 8) * .5;
      const color = base.clone().lerp(rock, ix < 2 ? .45 : .06).multiplyScalar(shade);
      colors.push(color.r, color.g, color.b);
    }
  }
  for (let z = 0; z < rows; z++) for (let x = 0; x < columns; x++) {
    const a = z * (columns + 1) + x, b = a + columns + 1;
    if (side > 0) indices.push(a, b, a + 1, b, b + 1, a + 1);
    else indices.push(a, a + 1, b, b, a + 1, b + 1);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  g.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  g.setIndex(indices); g.computeVertexNormals();
  return g;
}

export function makeMountain(seed, config, distant = false) {
  const width = 270, depth = 100, cols = 100, rows = 36;
  const positions = [], colors = [], indices = [], uvs = [];
  const stone = new THREE.Color(config.mountain), snow = new THREE.Color('#e0e5e0');
  const peakCenters = [-116, -91, -45, -18, 28, 76, 108];
  const peakHeights = [46, 63, 78, 51, 70, 57, 42];
  for (let z = 0; z <= rows; z++) for (let x = 0; x <= cols; x++) {
    const wx = (x / cols - .5) * width, wz = z / rows * depth;
    const ridges = Math.pow(Math.abs(Math.sin(wx * .024 + seed)), 2) * 36 + Math.pow(Math.abs(Math.sin(wx * .067 + 2)), 3) * 20;
    const envelope = Math.sin(z / rows * Math.PI);
    const edge = Math.pow(Math.sin(x / cols * Math.PI), .7);
    let alpine = 0;
    for (let peak = 0; peak < 7; peak++) {
      const centerX = peakCenters[peak] + (noise(peak, seed) - .5) * 11;
      const centerZ = 34 + noise(peak, seed + 1) * 32;
      const ridgeWarp = Math.sin(wz * .085 + seed + peak) * 4 + Math.sin(wz * .21 + peak) * 1.8;
      const slopeX = wx - centerX - ridgeWarp;
      const flank = Math.abs(slopeX / (30 + noise(peak, seed + 2) * 23));
      const depthFlank = Math.abs((wz - centerZ) / (27 + noise(peak, seed + 3) * 20));
      const crest = Math.max(0, 1 - flank * (slopeX < 0 ? .73 : 1.19) - depthFlank * .63);
      alpine = Math.max(alpine, crest * (peakHeights[peak] + noise(peak, seed + 4) * 10));
    }
    // Interlocking, asymmetric crests and diagonal gullies replace round sine-wave cones.
    const gullies = Math.abs(Math.sin(wx * .21 + wz * .09 + seed)) * Math.sin(wx * .48 - wz * .17) * 4.6 + Math.sin(wx * .73 + wz * .31) * 1.8;
    const h = config.pine
      ? 2 + (alpine + ridges * .17 + gullies * Math.min(1, alpine / 20)) * Math.pow(envelope, .4) * edge * (distant ? 1.08 : .85)
      : 4 + (ridges + 5 + noise(x + z * 139, seed) * 5) * envelope * edge * (distant ? 1.25 : .7);
    positions.push(wx, h, wz);
    uvs.push(wx / 18, wz / 18 + h / 18);
    const snowline = (distant ? 33 : 28) + Math.sin(wx * .11 + wz * .07) * 4 + noise(x + z * 39) * 3;
    const snowCover = config.snow ? THREE.MathUtils.smoothstep(h, snowline, snowline + 7) : 0;
    const color = stone.clone().lerp(snow, snowCover).multiplyScalar(.78 + noise(x + z * 32, 7) * .22);
    colors.push(color.r, color.g, color.b);
  }
  for (let z = 0; z < rows; z++) for (let x = 0; x < cols; x++) {
    const a = z * (cols + 1) + x, b = a + cols + 1;
    indices.push(a, b, a + 1, b, b + 1, a + 1);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  g.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  g.setIndex(indices); g.computeVertexNormals();
  return g;
}

export function makeGrassTuftGeometry() {
  const positions = [], colors = [], indices = [];
  for (let blade = 0; blade < 7; blade++) {
    const angle = blade * 2.4, height = .28 + noise(blade, 47) * .35;
    const x = Math.cos(angle) * .16, z = Math.sin(angle) * .16;
    const sideways = new THREE.Vector3(Math.cos(angle + .8), 0, Math.sin(angle + .8));
    const start = positions.length / 3;
    for (let step = 0; step < 3; step++) {
      const t = step / 2, halfWidth = .035 * (1 - t) + .002;
      for (const side of [-1, 1]) {
        positions.push(x + Math.cos(angle) * t * t * .19 + sideways.x * halfWidth * side, t * height, z + Math.sin(angle) * t * t * .19 + sideways.z * halfWidth * side);
        const color = new THREE.Color('#284c21').lerp(new THREE.Color('#9ca857'), t);
        colors.push(color.r, color.g, color.b);
      }
    }
    for (let segment = 0; segment < 2; segment++) { const a = start + segment * 2; indices.push(a, a + 2, a + 1, a + 1, a + 2, a + 3); }
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  geometry.setIndex(indices); geometry.computeVertexNormals(); return geometry;
}

export function makeBarkTexture() {
  const canvas = document.createElement('canvas'); canvas.width = canvas.height = 128;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#5c4a36'; ctx.fillRect(0, 0, 128, 128);
  for (let i = 0; i < 550; i++) {
    const value = Math.floor(45 + noise(i, 41) * 60);
    ctx.strokeStyle = `rgba(${value + 20},${value + 6},${value - 8},.7)`;
    ctx.lineWidth = .5 + noise(i, 5) * 2;
    const x = noise(i, 9) * 128, y = noise(i, 12) * 128;
    ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + noise(i, 10) * 3, y + 9 + noise(i, 6) * 35); ctx.stroke();
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  return texture;
}

export function makeNeedleGeometry(seed = 7, distant = false) {
  // Crossed twig cards sample only the photographed pine twig in the CC0 atlas.
  // Hundreds of short branchlets create a porous volume, rather than long foliage fans.
  const positions = [], uvs = [], indices = [];
  const layers = distant ? 6 : 10, twigs = distant ? 5 : 9;
  for (let layer = 0; layer < layers; layer++) {
    const h = layer / layers;
    for (let branch = 0; branch < 6; branch++) {
      if (noise(layer * 6 + branch, seed) < .13) continue;
      const a = branch / 6 * Math.PI * 2 + layer * 2.11 + noise(branch, seed);
      const radius = (.18 + Math.pow(1 - h, .75) * 2.2) * (.75 + noise(branch + layer * 6, seed + 1) * .4);
      const y = 1.55 + h * 5.8 + (noise(branch + layer * 6, seed + 2) - .5) * .65;
      for (let twig = 0; twig < twigs; twig++) {
        const t = .16 + twig / (twigs + 2), fork = (twig % 2 ? -1 : 1) * (.16 + .28 * (1 - t));
        const direction = a + fork * 1.7;
        const length = (.62 + noise(twig + branch * 17, seed) * .46) * (1 - h * .28) * (distant ? 1.25 : 1);
        const root = new THREE.Vector3(Math.cos(a) * radius * t, y - t * .16, Math.sin(a) * radius * t);
        const along = new THREE.Vector3(Math.cos(direction) * .85, .22 + t * .22, Math.sin(direction) * .85).normalize().multiplyScalar(length);
        const across = new THREE.Vector3(-Math.sin(direction), 0, Math.cos(direction)).multiplyScalar(length * .32);
        for (let crossed = 0; crossed < 2; crossed++) {
          const width = across.clone().applyAxisAngle(along.clone().normalize(), crossed * Math.PI / 2);
          const start = positions.length / 3;
          for (const [u, v] of [[-1, 0], [1, 0], [1, 1], [-1, 1]]) positions.push(root.x + width.x * u + along.x * v, root.y + width.y * u + along.y * v, root.z + width.z * u + along.z * v);
          uvs.push(.025, .55, .235, .55, .235, .99, .025, .99);
          indices.push(start, start + 1, start + 2, start, start + 2, start + 3);
        }
      }
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  g.setIndex(indices); g.computeVertexNormals(); return g;
}

export function makePineTrunkGeometry() {
  const parts = [new THREE.CylinderGeometry(.045, .18, 7.5, 7, 6)];
  for (let layer = 0; layer < 9; layer++) for (let branch = 0; branch < 5; branch++) {
    const h = layer / 9, a = branch / 5 * Math.PI * 2 + layer * 2.11;
    const length = (.18 + (1 - h) * 1.95) * (.8 + noise(branch + layer, 7) * .3);
    const start = new THREE.Vector3(0, -2.05 + h * 5.8, 0), end = new THREE.Vector3(Math.cos(a) * length, start.y - .15, Math.sin(a) * length);
    const direction = end.clone().sub(start), geometry = new THREE.CylinderGeometry(.012, .045 * (1 - h) + .012, direction.length(), 4);
    geometry.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), direction.normalize()));
    geometry.translate(...start.add(end).multiplyScalar(.5).toArray()); parts.push(geometry);
  }
  const merged = mergeGeometries(parts); parts.forEach(part => part.dispose()); return merged;
}

export function makeNeedleTexture() {
  const c = document.createElement('canvas'); c.width = c.height = 256;
  const ctx = c.getContext('2d');
  ctx.lineCap = 'round';
  ctx.strokeStyle = '#635d3c'; ctx.lineWidth = 3;
  ctx.beginPath(); ctx.moveTo(128, 256); ctx.lineTo(128, 4); ctx.stroke();
  for (let twig = 0; twig < 23; twig++) {
    const y = 12 + twig * 10, width = 6 + Math.sin(twig / 25 * Math.PI) * 108;
    for (const side of [-1, 1]) {
      const tx = 128 + width * side, ty = y - 20;
      ctx.strokeStyle = '#69775a'; ctx.lineWidth = 1.8;
      ctx.beginPath(); ctx.moveTo(128, y + 12); ctx.lineTo(tx, ty); ctx.stroke();
      for (let n = 0; n < 15; n++) {
        const t = n / 15, x = 128 + (tx - 128) * t, by = y + 12 + (ty - y - 12) * t;
        const shade = Math.floor(85 + noise(n + twig * 19, side) * 60);
        ctx.strokeStyle = `rgb(${Math.floor(shade * .72)},${shade},${Math.floor(shade * .62)})`; ctx.lineWidth = 1.1;
        ctx.beginPath(); ctx.moveTo(x, by); ctx.lineTo(x + side * 9, by - 12 - noise(n, twig) * 6); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(x, by); ctx.lineTo(x - side * 2, by + 12); ctx.stroke();
      }
    }
  }
  const texture = new THREE.CanvasTexture(c); texture.colorSpace = THREE.SRGBColorSpace; texture.anisotropy = 4; return texture;
}

export function makeLeafGeometry() {
  const positions = [], uvs = [], indices = [];
  const center = new THREE.Vector3(), normal = new THREE.Vector3(), tangent = new THREE.Vector3(), up = new THREE.Vector3(), yAxis = new THREE.Vector3(0, 1, 0);
  for (let i = 0; i < 65; i++) {
    const a = noise(i, 11) * Math.PI * 2, b = Math.acos(2 * noise(i, 12) - 1);
    normal.set(Math.sin(b) * Math.cos(a), Math.cos(b), Math.sin(b) * Math.sin(a));
    center.copy(normal).multiplyScalar(.4 + noise(i, 13) * .65);
    tangent.crossVectors(normal, yAxis).normalize().multiplyScalar(.34);
    up.crossVectors(tangent, normal).normalize().multiplyScalar(.4);
    const start = positions.length / 3;
    for (const [x, y] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) positions.push(center.x + tangent.x * x + up.x * y, center.y + tangent.y * x + up.y * y, center.z + tangent.z * x + up.z * y);
    uvs.push(0, 0, 1, 0, 1, 1, 0, 1); indices.push(start, start + 1, start + 2, start, start + 2, start + 3);
  }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2)); g.setIndex(indices); g.computeVertexNormals(); return g;
}

export function makeLeafTexture() {
  const c = document.createElement('canvas'); c.width = c.height = 256;
  const ctx = c.getContext('2d');
  for (let i = 0; i < 21; i++) {
    const x = 40 + noise(i, 50) * 176, y = 20 + noise(i, 51) * 216, rotation = noise(i, 52) * 6.28;
    ctx.save(); ctx.translate(x, y); ctx.rotate(rotation);
    const grad = ctx.createLinearGradient(-13, 0, 13, 0); grad.addColorStop(0, '#496b35'); grad.addColorStop(.55, '#8fa45b'); grad.addColorStop(1, '#597f3f');
    ctx.fillStyle = grad; ctx.beginPath(); ctx.ellipse(0, 0, 13, 25, 0, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#a7b473'; ctx.lineWidth = .8; ctx.beginPath(); ctx.moveTo(0, -22); ctx.lineTo(0, 25); ctx.stroke();
    for (let k = -16; k < 19; k += 7) { ctx.beginPath(); ctx.moveTo(0, k); ctx.lineTo(10, k - 5); ctx.moveTo(0, k); ctx.lineTo(-10, k - 5); ctx.stroke(); }
    ctx.restore();
  }
  const texture = new THREE.CanvasTexture(c); texture.colorSpace = THREE.SRGBColorSpace; texture.anisotropy = 4; return texture;
}
