/* eslint-disable react/no-unknown-property */
import { memo, useEffect, useLayoutEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { useGLTF } from '@react-three/drei';
import { clone } from 'three/examples/jsm/utils/SkeletonUtils.js';
import * as THREE from 'three';
import { BREEDS, COSMETICS, accessoryId, breedId, duckAssetPlan, duckAssetUrls } from './duckAssets';

export { BREEDS, breedId } from './duckAssets';
function cosmeticId(object) {
  let current = object;
  while (current) {
    if (current.userData.cosmetic) return current.userData.cosmetic;
    const lower = current.name.toLowerCase();
    const found = COSMETICS.find(id => lower.startsWith(`accessory_${id}`));
    if (found) return found;
    current = current.parent;
  }
  return null;
}

export function laneX(index, count) {
  return (index - (count - 1) * .5) * (count > 32 ? .84 : 1.28);
}
export function raceZ(value) { return -22 + Math.max(0, Math.min(100, Number(value) || 0)) * 1.0; }

function AnimatedDuck({ model, position, rotation, scale, accessory, moving, finished, reducedMotion }) {
  const group = useRef();
  const object = useMemo(() => clone(model.scene), [model]);
  const mixer = useMemo(() => new THREE.AnimationMixer(object), [object]);
  const standingRoot = useMemo(() => {
    const bone = object.getObjectByName('Body');
    return bone ? { bone, position: bone.position.clone() } : null;
  }, [object]);
  useLayoutEffect(() => {
    object.traverse(node => {
      const cosmetic = cosmeticId(node);
      if (cosmetic) node.visible = cosmetic === accessoryId(accessory);
      if (node.isMesh) { node.castShadow = true; node.receiveShadow = true; }
    });
  }, [object, accessory]);
  useEffect(() => {
    const name = finished ? 'celebrate' : moving ? 'swim' : 'idle';
    const clip = model.animations.find(item => item.name.toLowerCase().includes(name));
    if (clip && !reducedMotion) mixer.clipAction(clip).reset().fadeIn(.3).play();
    return () => { mixer.stopAllAction(); };
  }, [mixer, model, moving, finished, reducedMotion]);
  useEffect(() => () => mixer.uncacheRoot(object), [mixer, object]);
  useFrame(({ clock }, delta) => {
    if (!group.current) return;
    if (!reducedMotion) {
      mixer.update(Math.min(delta, .05));
      // The exported celebration translation follows the tilted body bone's
      // local axes, which can lower the feet. Keep standing root translation
      // at its bind position; head, neck and wing tracks still animate.
      if (!moving && standingRoot) standingRoot.bone.position.copy(standingRoot.position);
      // Only swimming ducks float. Standing heroes keep their webbed feet
      // above the planks while the rig animates their head and wings.
      group.current.position.y = position[1] + (moving ? Math.sin(clock.elapsedTime * 1.8 + position[0]) * .023 : 0);
      group.current.rotation.z = moving ? Math.sin(clock.elapsedTime * 1.35 + position[0]) * .018 : 0;
    }
  });
  return <group ref={group} position={position} rotation={rotation} scale={scale}><primitive object={object} dispose={null} /></group>;
}

function DuckInstances({ model, cosmeticModel, rows, appearances, progress, reducedMotion, isRacing }) {
  const animated = useMemo(() => {
    const results = [];
    const rigs = [];
    function prepare(asset, onlyCosmetics) {
      const scene = clone(asset.scene), mixer = new THREE.AnimationMixer(scene);
      const clip = asset.animations.find(item => item.name.toLowerCase().includes('swim'));
      if (clip) mixer.clipAction(clip).play();
      const skeletons = new Set();
      scene.updateMatrixWorld(true);
      scene.traverse(object => {
        const cosmetic = cosmeticId(object);
        if (!object.isMesh || (onlyCosmetics && !cosmetic)) return;
        const material = object.material.clone();
        if (object.isSkinnedMesh && object.geometry.attributes.skinIndex) {
          const skeleton = object.skeleton;
          skeleton.computeBoneTexture(); skeletons.add(skeleton);
          material.defines = { ...material.defines, USE_SKINNING: '' };
          material.onBeforeCompile = shader => {
            shader.uniforms.bindMatrix = { value: object.bindMatrix };
            shader.uniforms.bindMatrixInverse = { value: object.bindMatrixInverse };
            shader.uniforms.boneTexture = { value: skeleton.boneTexture };
          };
          material.customProgramCacheKey = () => 'duck-instanced-skin-v2';
        }
        results.push({ geometry: object.geometry, material, transform: object.matrixWorld.clone(), cosmetic, name: object.name });
      });
      rigs.push({ scene, mixer, skeletons });
    }
    prepare(model, false);
    if (cosmeticModel && cosmeticModel !== model) prepare(cosmeticModel, true);
    return { meshes: results, rigs };
  }, [model, cosmeticModel]);
  const meshes = animated.meshes;
  const rowList = useMemo(() => rows.map((row, localIndex) => ({ ...row, localIndex })), [rows]);
  const rowMatrices = useRef([]);
  const rowVisible = useRef([]);
  // A zero-scale instance still executes the full vertex shader. Compact cosmetic
  // batches so only the racers wearing an accessory submit its geometry.
  const batches = useMemo(() => meshes.map(mesh => ({
    ...mesh,
    isIdentity: mesh.transform.elements.every((v, i) => v === (i % 5 === 0 ? 1 : 0)),
    entries: mesh.cosmetic ? rowList.filter(row => mesh.cosmetic === accessoryId(appearances[row.index]?.accessory)) : rowList,
  })).filter(batch => batch.entries.length), [meshes, rowList, appearances]);
  useEffect(() => () => {
    animated.meshes.forEach(mesh => mesh.material.dispose());
    animated.rigs.forEach(rig => { rig.mixer.stopAllAction(); rig.mixer.uncacheRoot(rig.scene); rig.skeletons.forEach(skeleton => skeleton.dispose()); });
  }, [animated]);
  const refs = useRef([]);
  const state = useRef(progress);
  useLayoutEffect(() => { state.current = progress; }, [progress]);
  const scratch = useRef(null);
  if (scratch.current == null) {
    scratch.current = {
      matrix: new THREE.Matrix4(),
      out: new THREE.Matrix4(),
      quaternion: new THREE.Quaternion(),
      euler: new THREE.Euler(),
      position: new THREE.Vector3(),
      scale: new THREE.Vector3(),
      viewProjection: new THREE.Matrix4(),
      frustum: new THREE.Frustum(),
      bounds: new THREE.Sphere(new THREE.Vector3(), 1.4),
    };
  }
  useFrame(({ clock, camera }, delta) => {
    const s = scratch.current;
    const values = state.current?.current || state.current;
    const time = reducedMotion ? 0 : clock.elapsedTime;
    s.viewProjection.multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse);
    s.frustum.setFromProjectionMatrix(s.viewProjection);
    animated.rigs.forEach(rig => {
      if (isRacing && !reducedMotion) rig.mixer.update(Math.min(delta, .05));
      rig.scene.updateMatrixWorld(true);
      rig.skeletons.forEach(skeleton => skeleton.update());
    });

    while (rowMatrices.current.length < rowList.length) {
      rowMatrices.current.push(new THREE.Matrix4());
    }

    // Compute duck root transform and frustum culling once per racer
    for (let r = 0; r < rowList.length; r++) {
      const row = rowList[r];
      const y = reducedMotion ? 0 : Math.sin(time * 2.1 + row.index * 1.77) * .018;
      s.position.set(laneX(row.index, row.total), y - .035, raceZ(values[row.index]));
      s.bounds.center.copy(s.position);
      s.bounds.center.y += .4;
      if (!s.frustum.intersectsSphere(s.bounds)) {
        rowVisible.current[r] = false;
        continue;
      }
      rowVisible.current[r] = true;
      s.euler.set(0, Math.sin(time * 1.2 + row.index) * (isRacing ? .025 : .07), reducedMotion ? 0 : Math.sin(time * 1.7 + row.index) * .015);
      s.quaternion.setFromEuler(s.euler);
      s.scale.setScalar(.53);
      rowMatrices.current[r].compose(s.position, s.quaternion, s.scale);
    }

    batches.forEach((mesh, meshIndex) => {
      const targetMesh = refs.current[meshIndex];
      if (!targetMesh) return;
      let visibleCount = 0;
      const entries = mesh.entries;
      const isId = mesh.isIdentity;
      for (let e = 0; e < entries.length; e++) {
        const row = entries[e];
        const r = row.localIndex;
        if (!rowVisible.current[r]) continue;
        if (isId) {
          targetMesh.setMatrixAt(visibleCount++, rowMatrices.current[r]);
        } else {
          s.out.multiplyMatrices(rowMatrices.current[r], mesh.transform);
          targetMesh.setMatrixAt(visibleCount++, s.out);
        }
      }
      targetMesh.count = visibleCount;
      targetMesh.instanceMatrix.needsUpdate = true;
    });
  });
  return batches.map((mesh, i) => <instancedMesh key={mesh.name + i} ref={node => { refs.current[i] = node; }} args={[mesh.geometry, mesh.material, mesh.entries.length]} frustumCulled={false} receiveShadow dispose={null} />);
}

function Wakes({ count, progress, reducedMotion, isRacing }) {
  const ref = useRef();
  const shader = useRef();
  const state = useRef(progress);
  useLayoutEffect(() => { state.current = progress; }, [progress]);
  const geometry = useMemo(() => {
    const positions = [], uvs = [], indices = [];
    for (let side = 0; side < 2; side++) {
      const sign = side ? 1 : -1, start = positions.length / 3;
      for (let j = 0; j <= 18; j++) {
        const t = j / 18, width = .12 + t * .72;
        positions.push(sign * width, 0, -t * 3.5, sign * (width + .16 + t * .30), 0, -t * 3.5);
        uvs.push(t, 0, t, 1);
        if (j < 18) { const a = start + j * 2; indices.push(a, a + 2, a + 1, a + 1, a + 2, a + 3); }
      }
    }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2)); g.setIndex(indices); return g;
  }, []);
  const uniforms = useMemo(() => ({ time: { value: 0 }, moving: { value: 0 } }), []);
  useFrame(({ clock, camera }) => {
    if (!ref.current) return;
    if (shader.current) {
      shader.current.uniforms.time.value = reducedMotion ? 0 : clock.elapsedTime;
      shader.current.uniforms.moving.value = isRacing && !reducedMotion ? 1 : .12;
    }
    const values = state.current?.current || state.current;
    const array = ref.current.instanceMatrix.array;
    const camZ = camera.position.z;
    let visibleCount = 0;
    for (let i = 0; i < count; i++) {
      const z = raceZ(values[i]) - .20;
      if (z < camZ - 20 || z > camZ + 120) continue;
      const offset = visibleCount * 16;
      array[offset + 12] = laneX(i, count);
      array[offset + 13] = .026;
      array[offset + 14] = z;
      visibleCount++;
    }
    ref.current.count = visibleCount;
    ref.current.instanceMatrix.needsUpdate = true;
  });
  return <instancedMesh ref={ref} args={[geometry, undefined, count]} frustumCulled={false}>
    <shaderMaterial ref={shader} transparent depthWrite={false} side={THREE.DoubleSide} uniforms={uniforms}
      vertexShader={`uniform float time; varying vec2 vUv; void main(){
        vUv=uv; vec4 p=instanceMatrix*vec4(position,1.);
        p.y += sin(p.x*.57+time*.7)*.022 + sin((40.-p.z)*.73+time*.56)*.025;
        p.x += sin(vUv.x*17.-time*2.)*.025*vUv.x;
        gl_Position=projectionMatrix*modelViewMatrix*p; }`}
      fragmentShader={`uniform float time,moving; varying vec2 vUv;
        float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
        float noise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(hash(i),hash(i+vec2(1,0)),f.x),mix(hash(i+vec2(0,1)),hash(i+vec2(1,1)),f.x),f.y);}
        void main(){
          float bubbles=noise(vec2(vUv.x*48.-time*2.,vUv.y*13.));
          float ripple=pow(.5+.5*sin(vUv.y*22.+vUv.x*21.-time*3.),5.);
          float edge=pow(max(0.,sin(vUv.y*3.14159)),.7);
          float fade=pow(1.-vUv.x,1.7)*smoothstep(0.,.04,vUv.x);
          float foam=smoothstep(.28,.78,bubbles)*.74+ripple*.22;
          gl_FragColor=vec4(.77,.91,.90,foam*edge*fade*moving*.68);
          #include <tonemapping_fragment>
          #include <colorspace_fragment>
        }`} />
  </instancedMesh>;
}

function BowSpray({ count, progress, reducedMotion, isRacing }) {
  const ref = useRef();
  const state = useRef(progress);
  useLayoutEffect(() => { state.current = progress; }, [progress]);
  useFrame(({ clock, camera }) => {
    if (!ref.current) return;
    ref.current.visible = isRacing && !reducedMotion;
    if (!ref.current.visible) return;
    const values = state.current?.current || state.current;
    const array = ref.current.instanceMatrix.array;
    const time = clock.elapsedTime;
    const camZ = camera.position.z;
    let visibleCount = 0;
    for (let i = 0; i < count; i++) {
      const duckZ = raceZ(values[i]);
      if (duckZ < camZ - 15 || duckZ > camZ + 90) continue;
      const lx = laneX(i, count);
      for (let j = 0; j < 8; j++) {
        const t = (time * 1.6 + j * .125 + i * .37) % 1;
        const side = j % 2 ? 1 : -1;
        const s = .011 * (1 - t) + .003;
        const offset = visibleCount * 16;
        array[offset] = s;
        array[offset + 5] = s;
        array[offset + 10] = s;
        array[offset + 12] = lx + side * (.19 + t * .19);
        array[offset + 13] = .025 + Math.sin(t * Math.PI) * .12;
        array[offset + 14] = duckZ + .16 - t * .58;
        visibleCount++;
      }
    }
    ref.current.count = visibleCount;
    ref.current.instanceMatrix.needsUpdate = true;
  });
  return <instancedMesh ref={ref} args={[undefined, undefined, count * 8]} frustumCulled={false}>
    <sphereGeometry args={[1, 5, 3]} /><meshBasicMaterial color="#d9efed" transparent opacity={.55} depthWrite={false} />
  </instancedMesh>;
}

function RaceDucks({ participants, progress, appearances, reducedMotion, isRacing }) {
  const plan = useMemo(() => duckAssetPlan('race', participants, appearances), [participants, appearances]);
  const models = useGLTF(duckAssetUrls(plan));
  const groups = useMemo(() => BREEDS.map(breed => participants.map((participant, index) => ({ ...participant, index, total: participants.length })).filter(row => breedId(appearances[row.index]?.breed) === breed)), [participants, appearances]);
  let offset = 0;
  return <>
    {plan.map(item => {
      const model = models[offset++];
      const cosmeticModel = item.cosmetics ? models[offset++] : undefined;
      return <DuckInstances key={item.breed} model={model} cosmeticModel={cosmeticModel} rows={groups[BREEDS.indexOf(item.breed)]} progress={progress} appearances={appearances} reducedMotion={reducedMotion} isRacing={isRacing} />;
    })}
    <Wakes count={participants.length} progress={progress} reducedMotion={reducedMotion} isRacing={isRacing} />
    <BowSpray count={participants.length} progress={progress} reducedMotion={reducedMotion} isRacing={isRacing} />
  </>;
}

function HeroDuck({ screen, appearances, finished, reducedMotion }) {
  const [model] = useGLTF(duckAssetUrls(duckAssetPlan(screen, [], appearances)));
  const chosenAccessory = appearances[0]?.accessory;
  const accessory = (chosenAccessory && chosenAccessory !== 'none')
    ? chosenAccessory
    : (screen === 'results' ? 'medal' : 'none');
  return <AnimatedDuck model={model} position={[-4, 1.26, -15.8]} rotation={[0, 2.12, 0]} scale={1.7} accessory={accessory} moving={false} finished={finished} reducedMotion={reducedMotion} />;
}

function Ducks(props) {
  if (props.screen === 'stages' || (props.screen === 'race' && !props.participants.length)) return null;
  return props.screen === 'race' ? <RaceDucks {...props} /> : <HeroDuck {...props} />;
}

export default memo(Ducks);

