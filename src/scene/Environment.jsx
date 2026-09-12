/* eslint-disable react/no-unknown-property */
import { memo, useEffect, useLayoutEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Environment as LightingEnvironment, RoundedBox, Sky, useTexture } from '@react-three/drei';
import * as THREE from 'three';
import { bankX, bankHeight, makeBank, makeBarkTexture, makeMountain, makeGrassTuftGeometry, makeNeedleGeometry, makePineTrunkGeometry, makeBroadleafTrunkGeometry, makeLeafGeometry, noise } from './terrain';
import Water from './Water';
import { assetUrl, skyAssetUrl } from './assetUrl';

function InstanceCell({ geometry, material, entries, shadow = false, receiveShadow = true }) {
  const ref = useRef();
  useLayoutEffect(() => {
    const matrix = new THREE.Matrix4(), quaternion = new THREE.Quaternion(), vector = new THREE.Vector3();
    entries.forEach((item, index) => {
      quaternion.setFromEuler(new THREE.Euler(...(item.rotation || [0, 0, 0])));
      matrix.compose(vector.set(...item.position), quaternion, new THREE.Vector3(...(item.scale || [1, 1, 1])));
      ref.current.setMatrixAt(index, matrix);
      if (item.color) ref.current.setColorAt(index, new THREE.Color(item.color));
    });
    ref.current.instanceMatrix.needsUpdate = true;
    if (ref.current.instanceColor) ref.current.instanceColor.needsUpdate = true;
    ref.current.computeBoundingSphere();
  }, [entries]);
  return <instancedMesh ref={ref} args={[geometry, material, entries.length]} castShadow={shadow} receiveShadow={receiveShadow} />;
}

function Instances(props) {
  // Separate spatial cells let Three cull invisible shoreline regions in both
  // the main and reflection cameras without uploading matrices every frame.
  const cells = useMemo(() => {
    const groups = new Map();
    for (const item of props.entries) {
      const key = `${Math.floor(item.position[0] / 36)},${Math.floor(item.position[2] / 36)}`;
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key).push(item);
    }
    return [...groups.entries()];
  }, [props.entries]);
  return cells.map(([key, entries]) => <InstanceCell key={key} {...props} entries={entries} />);
}

function configureRockTextures(textures) {
  textures[0].colorSpace = THREE.SRGBColorSpace;
  textures[2].colorSpace = THREE.SRGBColorSpace;
  textures[4].colorSpace = THREE.SRGBColorSpace;

  textures.forEach(texture => { texture.anisotropy = 4; texture.wrapS = texture.wrapT = THREE.RepeatWrapping; });
}

function Shore({ config, width, low, medium, stage, reducedMotion }) {
  const wind = useRef({ value: 0 });
  useFrame(({ clock }) => { wind.current.value = reducedMotion ? 0 : clock.elapsedTime; });
  const foliageAtlas = useTexture(assetUrl('/assets/environment/foliage-atlas.png'));
  const [rockColor, rockNormal, groundColor, groundNormal, barkColor, barkNormal] = useTexture(['/assets/environment/rock-color.jpg', '/assets/environment/rock-normal.jpg', '/assets/environment/ground-color.jpg', '/assets/environment/ground-normal.jpg', '/assets/environment/pine-bark-color.jpg', '/assets/environment/pine-bark-normal.jpg'].map(assetUrl), configureRockTextures);
  const resources = useMemo(() => {
    const geometries = {
      left: makeBank(-1, config, width), right: makeBank(1, config, width),
      distant: makeMountain(3, config, true), near: makeMountain(8, config),
      needles: makeNeedleGeometry(7), needlesB: makeNeedleGeometry(19), needlesC: makeNeedleGeometry(31), trunk: config.pine ? makePineTrunkGeometry() : makeBroadleafTrunkGeometry(),
      distantNeedles: makeNeedleGeometry(7, true),
      rock: new THREE.IcosahedronGeometry(1, 2), reed: new THREE.ConeGeometry(.035, 1.4, 3),
      leaf: makeLeafGeometry(stage === 'lotus-pond' || stage === 'sunset-marsh'), lily: new THREE.CircleGeometry(.7, 16),
      petal: new THREE.SphereGeometry(1, 8, 6),
      grass: makeGrassTuftGeometry(),
    };
    const leaves = foliageAtlas.clone(), needles = foliageAtlas.clone();
    for (const texture of [leaves, needles]) {
      texture.colorSpace = THREE.SRGBColorSpace;
      texture.repeat.set(1 / 3 - .004, 1);
      texture.anisotropy = 4; texture.needsUpdate = true;
    }
    leaves.offset.x = (stage === 'lotus-pond' || stage === 'sunset-marsh' ? 2 / 3 : 1 / 3) + .002;
    needles.offset.x = .002;
    const materials = {
      land: new THREE.MeshStandardMaterial({ color: stage === 'forest-lake' ? '#8bb48b' : '#ffffff', vertexColors: true, map: groundColor, normalMap: groundNormal, normalScale: new THREE.Vector2(.6, .6), roughness: .97, side: THREE.DoubleSide }),
      mountain: new THREE.MeshStandardMaterial({ vertexColors: true, normalMap: rockNormal, normalScale: new THREE.Vector2(.8, .8), roughness: .99 }),
      // Thin matte foliage needs diffuse lighting, not a full per-pixel metal/
      // roughness + environment BRDF on every overlapping transparent leaf.
      needles: new THREE.MeshLambertMaterial({ color: '#d2ddcb', map: config.pine ? needles : leaves, emissiveMap: config.pine ? needles : leaves, emissive: '#779851', emissiveIntensity: .08, alphaTest: .3, alphaToCoverage: true, side: THREE.DoubleSide }),
      trunk: new THREE.MeshStandardMaterial({ map: barkColor, normalMap: barkNormal, normalScale: new THREE.Vector2(.55, .55), roughness: .95 }),
      rock: new THREE.MeshStandardMaterial({ color: '#bbbdb4', map: rockColor, normalMap: rockNormal, normalScale: new THREE.Vector2(.8, .8), roughness: .92 }),
      reed: new THREE.MeshStandardMaterial({ color: stage === 'sunset-marsh' ? '#b4a268' : '#7d8951', roughness: .9 }),
      lily: new THREE.MeshStandardMaterial({ color: '#5d7950', roughness: .58, side: THREE.DoubleSide }),
      petal: new THREE.MeshStandardMaterial({ color: '#edb5b6', roughness: .63 }),
      grass: new THREE.MeshStandardMaterial({ vertexColors: true, roughness: .95, side: THREE.DoubleSide }),
      shrub: new THREE.MeshStandardMaterial({ color: '#729452', map: leaves, alphaTest: .3, side: THREE.DoubleSide, roughness: .88 }),
    };
    const windUniform = new THREE.Uniform(0);
    materials.needles.userData.windUniform = windUniform;
    materials.needles.onBeforeCompile = shader => {
        shader.uniforms.uWindTime = windUniform;
        shader.vertexShader = 'uniform float uWindTime;\n' + shader.vertexShader;
        shader.vertexShader = shader.vertexShader.replace('#include <begin_vertex>', `#include <begin_vertex>
          vec3 treeRoot = instanceMatrix[3].xyz;
          float bend = pow(clamp(position.y / 8., 0., 1.), 2.);
          transformed.x += sin(uWindTime * .65 + treeRoot.x * .23 + treeRoot.z * .13) * bend * .075;
          transformed.z += sin(uWindTime * .48 + treeRoot.z * .17) * bend * .045;`);
      };
    materials.needles.customProgramCacheKey = () => `foliage-wind-transmission-${config.pine}`;
    const trunks = [], crowns = [], rocks = [], reeds = [], lilies = [], petals = [], grasses = [], shrubs = [];
    const treeCount = Math.round((low ? 170 : medium ? 230 : 310) * config.density);
    for (let i = 0; i < treeCount; i++) {
      const cluster = Math.floor(i / 7);
      const side = cluster % 2 ? 1 : -1;
      const nearCluster = cluster < 8;
      const z = (nearCluster ? -25 + Math.floor(cluster / 2) * 43 : -35 + noise(cluster, 11) * 275) + (noise(i, 21) - .5) * 21;
      const spread = nearCluster ? 3 + noise(cluster, 15) * 6 + noise(i, 16) * 7 : 1.5 + noise(cluster, 15) * 31 + noise(i, 16) * 6;
      const x = bankX(z, side, width) + side * spread;
      const scale = .60 + Math.pow(noise(i, 13), 1.4) * 1.65;
      const ground = bankHeight(spread, z), heightScale = scale * (.9 + noise(i, 17) * .5);
      const rotation = [(noise(i, 18) - .5) * .06, noise(i, 14) * 6.28, (noise(i, 19) - .5) * .07];
      trunks.push({ position: [x, ground + 3.5 * heightScale, z], rotation, scale: [scale, heightScale, scale] });
      if (config.pine) crowns.push({ position: [x, ground, z], rotation, scale: [scale, heightScale, scale], color: new THREE.Color('#ffffff').lerp(new THREE.Color('#94a978'), noise(i, 72) * .45).getStyle() });
      else {
        for (let j = 0; j < 5; j++) {
          const angle = j * 2.4 + rotation[1], radius = j === 4 ? 0 : 1.35 * scale;
          crowns.push({ position: [x + Math.sin(angle) * radius, ground + (j === 4 ? 6.4 : 5.3 + (j % 2) * .7) * heightScale, z + Math.cos(angle) * radius], rotation: [0, angle, 0], scale: [scale * 1.55, heightScale * (stage === 'lotus-pond' || stage === 'sunset-marsh' ? 1.85 : 1.45), scale * 1.55], color: new THREE.Color('#d0d6a2').lerp(new THREE.Color('#94b672'), noise(i + j, 9)).getStyle() });
        }
      }
    }
    for (let i = 0; i < (low ? 150 : medium ? 220 : 290); i++) {
      const side = i % 2 ? 1 : -1, z = -45 + noise(i, 21) * 190;
      const x = bankX(z, side, width) + side * noise(i, 22) * 2;
      const s = .3 + noise(i, 23) * 1.5;
      rocks.push({ position: [x, .05 + s * .14, z], scale: [s * 1.5, s * .65, s], rotation: [noise(i) * 2, noise(i, 2) * 6, noise(i, 3)], color: new THREE.Color('#929389').multiplyScalar(.67 + noise(i, 20) * .5).getStyle() });
    }
    for (let i = 0; i < (low ? 600 : medium ? 1000 : 1500); i++) {
      const side = i % 2 ? 1 : -1, z = -38 + noise(Math.floor(i / 7), 35) * 174 + noise(i, 31) * 2;
      const x = bankX(z, side, width) + side * (noise(i, 32) * 2 - .8);
      const s = .45 + noise(i, 33) * 1.2;
      reeds.push({ position: [x, s * .55, z], scale: [1.2, s, 1], rotation: [(noise(i, 34) - .5) * .42, noise(i, 35) * 6, (noise(i, 36) - .5) * .45] });
    }
    if (config.pine) for (let i = 0; i < (low ? 850 : medium ? 1250 : 1700); i++) {
      const side = i % 2 ? 1 : -1, cluster = Math.floor(i / 15);
      const z = -35 + noise(cluster, 82) * 195 + (noise(i, 83) - .5) * 8;
      const away = 1.1 + noise(cluster, 84) * 10 + noise(i, 85) * 4;
      const x = bankX(z, side, width) + side * away;
      const scale = .7 + noise(i, 86) * 1.25;
      grasses.push({ position: [x, bankHeight(away, z) - .08, z], rotation: [0, noise(i, 87) * 6.28, 0], scale: [scale, scale, scale] });
      if (i % 11 === 0) shrubs.push({ position: [x, bankHeight(away, z) + .4, z], rotation: [0, noise(i, 88) * 6.28, 0], scale: [scale * .8, scale * .5, scale * .8] });
    }
    const lilyCount = stage === 'lotus-pond' ? (low ? 65 : medium ? 95 : 130) : stage === 'sunset-marsh' ? 35 : 14;
    for (let i = 0; i < lilyCount; i++) {
      const side = i % 2 ? 1 : -1, z = -24 + noise(i, 42) * 145;
      const x = bankX(z, side, width) - side * (1.2 + noise(i, 43) * 3.5), scale = .55 + noise(i, 44) * .6;
      lilies.push({ position: [x, .022 + noise(i, 45) * .02, z], scale: [scale, scale * .8, 1], rotation: [-Math.PI / 2, 0, noise(i, 46) * 6.2] });
      if (stage === 'lotus-pond' && i % 3 === 0) for (let petal = 0; petal < 7; petal++) {
        const a = petal / 7 * Math.PI * 2;
        petals.push({ position: [x + Math.sin(a) * .15, .16, z + Math.cos(a) * .15], scale: [.10, .08, .25], rotation: [.35, a, 0] });
      }
    }
    const distantCrown = item => low && (item.position[2] > 130 || Math.abs(item.position[0]) > width + 23);
    return { geometries, materials, trunks, crowns, crownGroups: [0, 1, 2].map(index => crowns.filter((item, i) => i % 3 === index && !distantCrown(item))), distantCrowns: crowns.filter(distantCrown), rocks, reeds, lilies, petals, grasses, shrubs, leaves, needles };
  }, [config, width, low, medium, stage, rockColor, rockNormal, groundColor, groundNormal, barkColor, barkNormal, foliageAtlas]);
  useEffect(() => () => {
    Object.values(resources.geometries).forEach(geometry => geometry.dispose());
    Object.values(resources.materials).forEach(material => material.dispose());
    resources.leaves.dispose();
    resources.needles.dispose();
  }, [resources]);
  useLayoutEffect(() => { wind.current = resources.materials.needles.userData.windUniform; }, [resources]);
  const { geometries: g, materials: m } = resources;
  return <group>
    <mesh geometry={g.left} material={m.land} receiveShadow />
    <mesh geometry={g.right} material={m.land} receiveShadow />
    <mesh position={[10, -4, stage === 'forest-lake' ? 310 : 265]} scale={[stage === 'forest-lake' ? 1.65 : 1.4, stage === 'forest-lake' ? .52 : config.pine ? 1.5 : stage === 'sunset-marsh' ? .22 : .7, 1]} geometry={g.distant} material={m.mountain} />
    <mesh position={[-110, -4, stage === 'forest-lake' ? 195 : 168]} scale={[.65, stage === 'forest-lake' ? .45 : config.pine ? .9 : stage === 'sunset-marsh' ? .22 : .55, 1]} geometry={g.near} material={m.mountain} />
    <mesh position={[110, -4, stage === 'forest-lake' ? 225 : 196]} scale={[-.65, stage === 'forest-lake' ? .5 : config.pine ? 1.1 : stage === 'sunset-marsh' ? .22 : .55, 1]} geometry={g.near} material={m.mountain} />
    <Instances geometry={g.trunk} material={m.trunk} entries={resources.trunks} shadow={!low} />
    {config.pine ? [g.needles, g.needlesB, g.needlesC].map((geometry, index) => <Instances key={index} geometry={geometry} material={m.needles} entries={resources.crownGroups[index]} shadow={!low} receiveShadow={false} />) : <Instances geometry={g.leaf} material={m.needles} entries={resources.crowns} shadow={!low} receiveShadow={false} />}
    {config.pine && resources.distantCrowns.length > 0 && <Instances geometry={g.distantNeedles} material={m.needles} entries={resources.distantCrowns} receiveShadow={false} />}
    <Instances geometry={g.rock} material={m.rock} entries={resources.rocks} shadow={!low} />
    <Instances geometry={g.reed} material={m.reed} entries={resources.reeds} />
    {resources.grasses.length > 0 && <><Instances geometry={g.grass} material={m.grass} entries={resources.grasses} /><Instances geometry={g.leaf} material={m.shrub} entries={resources.shrubs} /></>}
    <Instances geometry={g.lily} material={m.lily} entries={resources.lilies} />
    {resources.petals.length > 0 && <Instances geometry={g.petal} material={m.petal} entries={resources.petals} />}
  </group>;
}

function Timber({ position, scale, rotation = [0, 0, 0], color = '#77604a' }) {
  return <mesh position={position} scale={scale} rotation={rotation} castShadow receiveShadow><boxGeometry /><meshStandardMaterial color={color} roughness={.84} /></mesh>;
}

function HeroDock() {
  const wood = useMemo(() => makeBarkTexture(), []);
  const shadow = useMemo(() => {
    const canvas = document.createElement('canvas'); canvas.width = canvas.height = 64;
    const ctx = canvas.getContext('2d'), gradient = ctx.createRadialGradient(32, 32, 2, 32, 32, 32);
    gradient.addColorStop(0, 'rgba(13,20,12,.7)'); gradient.addColorStop(1, 'rgba(13,20,12,0)');
    ctx.fillStyle = gradient; ctx.fillRect(0, 0, 64, 64);
    return new THREE.CanvasTexture(canvas);
  }, []);
  useEffect(() => () => { wood.dispose(); shadow.dispose(); }, [wood, shadow]);
  return <group position={[-4, 0, -16]}>
    <mesh position={[0, .618, .2]} rotation={[-Math.PI / 2, 0, -.6]}><planeGeometry args={[2.4, 2.2]} /><meshBasicMaterial map={shadow} transparent opacity={.6} depthWrite={false} /></mesh>
    {Array.from({ length: 28 }, (_, i) => <RoundedBox key={i} position={[0, .51 + noise(i, 19) * .005, -3.5 + i * .28]} args={[7.6, .20, .26]} radius={.018} smoothness={2} castShadow receiveShadow>
      <meshStandardMaterial map={wood} color={i % 3 ? '#ceb991' : '#b9a582'} roughness={.84} />
    </RoundedBox>)}
    {[-3.55, 3.55].flatMap(x => [-3.2, 3.9].map(z => <Timber key={`${x}-${z}`} position={[x, .25, z]} scale={[.28, 2.8, .28]} color="#6a573e" />))}
    <Timber position={[-3.55, 1.1, .3]} scale={[.11, .14, 7.4]} color="#8b7556" />
    {Array.from({ length: 40 }, (_, i) => <mesh key={`walk${i}`} position={[-4.1 - i * .45, .51, 3]} castShadow receiveShadow><boxGeometry args={[.43, .20, 2.1]} /><meshStandardMaterial map={wood} color="#b8a080" roughness={.84} /></mesh>)}
  </group>;
}

function Dock({ position = [0, 0, 0], rotation = [0, 0, 0], long = false }) {
  const length = long ? 12 : 7;
  return <group position={position} rotation={rotation}>
    {Array.from({ length: long ? 30 : 18 }, (_, i) => <Timber key={i} position={[0, .46, i * .4]} scale={[3.8, .16, .38]} color={i % 3 ? '#8c765a' : '#796349'} />)}
    {[-1.7, 1.7].flatMap(x => [0, length * .48, length - .4].map(z => <group key={`${x}-${z}`}><Timber position={[x, .15, z]} scale={[.2, 2.7, .2]} /><mesh position={[x, 1.55, z]}><sphereGeometry args={[.15, 8, 8]} /><meshStandardMaterial color="#a7926b" roughness={.75} /></mesh></group>))}
    <Timber position={[-1.7, 1.18, length * .5]} scale={[.11, .1, length]} />
    <Timber position={[1.7, 1.18, length * .5]} scale={[.11, .1, length]} />
    <Timber position={[0, .15, length * .5]} scale={[.22, .28, length]} />
  </group>;
}

function Cabin({ position, rotation = [0, 0, 0], color = '#977454', plaster = false }) {
  return <group position={position} rotation={rotation}>
    <Timber position={[0, 1.8, 0]} scale={[5, 3.6, 4]} color={plaster ? '#d0c7ac' : color} />
    {!plaster && Array.from({ length: 12 }, (_, i) => <Timber key={i} position={[0, .2 + i * .29, -2.035]} scale={[5.1, .05, .06]} color="#5c493b" />)}
    <Timber position={[-1.45, 4.05, 0]} scale={[3.3, .22, 5.2]} rotation={[0, 0, .48]} color={plaster ? '#986548' : '#4b5046'} />
    <Timber position={[1.45, 4.05, 0]} scale={[3.3, .22, 5.2]} rotation={[0, 0, -.48]} color={plaster ? '#986548' : '#4b5046'} />
    <Timber position={[.4, 1.15, -2.06]} scale={[.9, 2.3, .06]} color="#4a493d" />
    {[-1.5, 1.6].map(x => <group key={x} position={[x, 2.1, -2.07]}>
      <mesh><planeGeometry args={[.8, .85]} /><meshStandardMaterial color="#c9dbda" metalness={.2} roughness={.16} emissive="#d2a970" emissiveIntensity={.14} /></mesh>
      <Timber position={[0, 0, -.025]} scale={[.06, .85, .035]} color="#584b3c" />
      <Timber position={[0, 0, -.026]} scale={[.8, .06, .035]} color="#584b3c" />
    </group>)}
    <Timber position={[1.65, 4.4, .9]} scale={[.6, 2, .6]} color="#9b9483" />
  </group>;
}

function Finish({ width }) {
  const texture = useMemo(() => {
    const c = document.createElement('canvas'); c.width = 1024; c.height = 128;
    const ctx = c.getContext('2d'); ctx.fillStyle = '#233c48'; ctx.fillRect(0, 0, 1024, 128);
    for (let x = 0; x < 8; x++) for (let y = 0; y < 4; y++) {
      ctx.fillStyle = (x + y) % 2 ? '#e5dfcb' : '#344650';
      ctx.fillRect(x * 32, y * 32, 32, 32); ctx.fillRect(768 + x * 32, y * 32, 32, 32);
    }
    ctx.fillStyle = '#f5ead4'; ctx.font = 'bold 86px sans-serif'; ctx.textAlign = 'center'; ctx.fillText('FINISH', 512, 96);
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
  }, []);
  useEffect(() => () => texture.dispose(), [texture]);
  return <group position={[0, 0, 78]}>
    {[-width, width].map(x => <group key={x} position={[x, 0, 0]}>
      <Timber position={[0, 3.6, 0]} scale={[.34, 8, .34]} color="#635440" />
      <Timber position={[Math.sign(x) * 1.4, 5.6, 0]} scale={[2.8, .18, .18]} color="#635440" />
      <mesh position={[Math.sign(x) * 1.5, 4.1, -.02]} rotation={[0, Math.PI, 0]}><planeGeometry args={[1.5, 2.8]} /><meshStandardMaterial color="#294c5c" side={THREE.DoubleSide} roughness={1} /></mesh>
    </group>)}
    <Timber position={[0, 5.65, .04]} scale={[width * 2, .18, .16]} color="#695841" />
    <mesh position={[0, 5.6, 0]} rotation={[0, Math.PI, 0]}><planeGeometry args={[Math.min(width * 2, 28), 2.0]} /><meshStandardMaterial map={texture} side={THREE.DoubleSide} roughness={.8} /></mesh>
  </group>;
}

function Buoys({ width, stage }) {
  const data = useMemo(() => {
    const entries = [], ropes = [];
    const railCount = width > 20 ? 9 : 5;
    for (let lane = 0; lane < railCount; lane++) {
      const x = (lane / (railCount - 1) - .5) * (width * 2 - 3);
      for (let j = 0; j < 28; j++) entries.push({ position: [x, .08, -25 + j * 3.9], scale: [.12, .15, .12], color: j % 4 === 0 ? '#ece1bc' : stage === 'sunset-marsh' ? '#e7b471' : '#dd8150' });
      ropes.push({ position: [x, -.04, 28], scale: [.016, .016, 108] });
    }
    return { entries, ropes };
  }, [width, stage]);
  const geometry = useMemo(() => new THREE.SphereGeometry(1, 8, 6), []);
  const material = useMemo(() => new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: .46 }), []);
  const ropeGeometry = useMemo(() => new THREE.BoxGeometry(1, 1, 1), []);
  const ropeMaterial = useMemo(() => new THREE.MeshStandardMaterial({ color: '#969b85', roughness: 1 }), []);
  return <><Instances geometry={geometry} material={material} entries={data.entries} /><Instances geometry={ropeGeometry} material={ropeMaterial} entries={data.ropes} /></>;
}

function RaceEnvironment({ config, stage, screen, width, low, medium, reducedMotion }) {
  const golden = stage === 'forest-lake';
  return <>
    <color attach="background" args={[config.sky]} />
    <fog attach="fog" args={[config.fog, golden ? 125 : 70, golden ? 560 : 450]} />
    <hemisphereLight args={['#d5e9ff', '#6e8061', 1.65]} />
    <directionalLight position={[-25, 30, -35]} color="#dcecff" intensity={.85} />
    <directionalLight position={config.sunPosition} color={config.sun} intensity={golden ? 3.1 : 2.8} castShadow={!low} shadow-mapSize-width={medium ? 512 : 1024} shadow-mapSize-height={medium ? 512 : 1024} shadow-camera-left={-25} shadow-camera-right={25} shadow-camera-top={25} shadow-camera-bottom={-25} shadow-camera-far={180} shadow-bias={-.0005} shadow-normalBias={.06} />
    {screen !== 'race' && <directionalLight position={[15, 8, -28]} color={golden ? '#ffd19a' : '#ffe6b9'} intensity={golden ? 1.45 : 2.0} />}
    <LightingEnvironment files={skyAssetUrl(stage)} background={!golden} backgroundBlurriness={.03} environmentIntensity={.95} backgroundIntensity={stage === 'sunset-marsh' ? .6 : .9} environmentRotation={[0, stage === 'sunset-marsh' ? .2 : 1.2, 0]} backgroundRotation={[0, stage === 'sunset-marsh' ? .2 : 1.2, 0]} />
    {golden && <Sky distance={1000} sunPosition={config.sunPosition} turbidity={2.6} rayleigh={1.4} mieCoefficient={.003} mieDirectionalG={.8} />}
    <Water config={config} stage={stage} reducedMotion={reducedMotion} low={low} medium={medium} />
    <Shore config={config} width={width} low={low} medium={medium} stage={stage} reducedMotion={reducedMotion} />
    <Dock position={[width - .5, 0, -17]} rotation={[0, -.18, 0]} long />
    {screen !== 'race' && screen !== 'stages' && <HeroDock />}
    <Dock position={[-width + 1.2, 0, 20]} rotation={[0, .12, 0]} />
    <Cabin position={[width + 5, 1.5, 6]} rotation={[0, -.5, 0]} />
    {stage === 'village-canal' && <>
      {[12, 28, 43, 67].map((z, i) => <Cabin key={z} position={[-width - 5, 1.1, z]} rotation={[0, .45, 0]} plaster color={i % 2 ? '#a98769' : '#c5b398'} />)}
      <group position={[0, 0, 48]}>
        <Timber position={[0, 3.1, 0]} scale={[width * 2 + 5, .45, 3.2]} color="#8e8b78" />
        {[-1.4, 1.4].map(z => <Timber key={z} position={[0, 4.05, z]} scale={[width * 2 + 5, .17, .12]} color="#675b44" />)}
        {[-width + 1, width - 1].map(x => <Timber key={x} position={[x, 1.55, 0]} scale={[1.3, 3.2, 3.2]} color="#9a998a" />)}
      </group>
    </>}
    {screen === 'race' && <><Buoys width={width} stage={stage} /><Finish width={width} /></>}
  </>;
}



export default memo(RaceEnvironment);
