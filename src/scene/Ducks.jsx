/* eslint-disable react/no-unknown-property */
import { useEffect, useLayoutEffect, useMemo, useRef } from 'react';
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
    if (!reducedMotion) {
      mixer.update(Math.min(delta, .05));
      group.current.position.y = position[1] + Math.sin(clock.elapsedTime * 1.8 + position[0]) * .023;
      group.current.rotation.z = Math.sin(clock.elapsedTime * 1.35 + position[0]) * .018;
    }
  });
  return <group ref={group} position={position} rotation={rotation} scale={scale}><primitive object={object} dispose={null} /></group>;
}

function DuckInstances({ model, cosmeticModel, rows, appearances, progress, reducedMotion, isRacing, highDetail }) {
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
  // A zero-scale instance still executes the full vertex shader. Compact cosmetic
  // batches so only the racers wearing an accessory submit its geometry.
  const batches = useMemo(() => meshes.map(mesh => ({
    ...mesh,
    entries: mesh.cosmetic ? rows.filter(row => mesh.cosmetic === accessoryId(appearances[row.index]?.accessory)) : rows,
  })).filter(batch => batch.entries.length), [meshes, rows, appearances]);
  useEffect(() => () => {
    animated.meshes.forEach(mesh => mesh.material.dispose());
    animated.rigs.forEach(rig => { rig.mixer.stopAllAction(); rig.mixer.uncacheRoot(rig.scene); rig.skeletons.forEach(skeleton => skeleton.dispose()); });
  }, [animated]);
  const refs = useRef([]);
  const state = useRef(progress);
  useLayoutEffect(() => { state.current = progress; }, [progress]);
  const scratch = useMemo(() => ({ matrix: new THREE.Matrix4(), out: new THREE.Matrix4(), quaternion: new THREE.Quaternion(), euler: new THREE.Euler(), position: new THREE.Vector3(), scale: new THREE.Vector3(), viewProjection: new THREE.Matrix4(), frustum: new THREE.Frustum(), bounds: new THREE.Sphere(new THREE.Vector3(), 1.4) }), []);
  useFrame(({ clock, camera }, delta) => {
    const values = state.current;
    const time = reducedMotion ? 0 : clock.elapsedTime;
    scratch.viewProjection.multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse);
    scratch.frustum.setFromProjectionMatrix(scratch.viewProjection);
    animated.rigs.forEach(rig => {
      if (isRacing && !reducedMotion) rig.mixer.update(Math.min(delta, .05));
      rig.scene.updateMatrixWorld(true);
      rig.skeletons.forEach(skeleton => skeleton.update());
    });
    batches.forEach((mesh, meshIndex) => {
      let visibleCount = 0;
      mesh.entries.forEach(row => {
        const y = reducedMotion ? 0 : Math.sin(time * 2.1 + row.index * 1.77) * .018;
        scratch.position.set(laneX(row.index, row.total), y, raceZ(values[row.index]));
        scratch.bounds.center.copy(scratch.position); scratch.bounds.center.y += .4;
        // Bounds include the full wing span and tallest cosmetic. Off-screen
        // racers retain their simulation positions and re-enter without LOD swaps.
        if (!scratch.frustum.intersectsSphere(scratch.bounds)) return;
        scratch.euler.set(0, Math.sin(time * 1.2 + row.index) * (isRacing ? .025 : .07), reducedMotion ? 0 : Math.sin(time * 1.7 + row.index) * .015);
        scratch.quaternion.setFromEuler(scratch.euler);
        scratch.scale.setScalar(.53);
        scratch.matrix.compose(scratch.position, scratch.quaternion, scratch.scale);
        scratch.out.multiplyMatrices(scratch.matrix, mesh.transform);
        refs.current[meshIndex]?.setMatrixAt(visibleCount++, scratch.out);
      });
      if (refs.current[meshIndex]) refs.current[meshIndex].count = visibleCount;
    });
    refs.current.forEach(mesh => { if (mesh) mesh.instanceMatrix.needsUpdate = true; });
  });
  return batches.map((mesh, i) => <instancedMesh key={mesh.name + i} ref={node => { refs.current[i] = node; }} args={[mesh.geometry, mesh.material, mesh.entries.length]} frustumCulled={false} castShadow={highDetail} receiveShadow dispose={null} />);
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
        const t = j / 18, width = .2 + t * .75;
        positions.push(sign * width, 0, -t * 3.5, sign * (width + .08 + t * .3), 0, -t * 3.5);
        uvs.push(t, 0, t, 1);
        if (j < 18) { const a = start + j * 2; indices.push(a, a + 2, a + 1, a + 1, a + 2, a + 3); }
      }
    }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2)); g.setIndex(indices); return g;
  }, []);
  const uniforms = useMemo(() => ({ time: { value: 0 }, moving: { value: 0 } }), []);
  const matrix = useMemo(() => new THREE.Matrix4(), []);
  useFrame(({ clock }) => {
    if (shader.current) {
      shader.current.uniforms.time.value = reducedMotion ? 0 : clock.elapsedTime;
      shader.current.uniforms.moving.value = isRacing && !reducedMotion ? 1 : .18;
    }
    for (let i = 0; i < count; i++) {
      matrix.makeTranslation(laneX(i, count), .035, raceZ(state.current[i]) - .25);
      ref.current.setMatrixAt(i, matrix);
    }
    ref.current.instanceMatrix.needsUpdate = true;
  });
  return <instancedMesh ref={ref} args={[geometry, undefined, count]} frustumCulled={false}>
    <shaderMaterial ref={shader} transparent depthWrite={false} side={THREE.DoubleSide} uniforms={uniforms}
      vertexShader={`varying vec2 vUv; void main(){ vUv=uv; gl_Position=projectionMatrix*modelViewMatrix*instanceMatrix*vec4(position,1.); }`}
      fragmentShader={`uniform float time,moving; varying vec2 vUv; void main(){ float foam=sin(vUv.x*85.-time*5.)*.35+.55; float edge=sin(vUv.y*3.14159); float fade=pow(1.-vUv.x,1.5); gl_FragColor=vec4(.82,.9,.87,foam*edge*fade*moving*.7); }`} />
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
      return <DuckInstances key={item.breed} model={model} cosmeticModel={cosmeticModel} rows={groups[BREEDS.indexOf(item.breed)]} progress={progress} appearances={appearances} reducedMotion={reducedMotion} isRacing={isRacing} highDetail={!item.lod} />;
    })}
    <Wakes count={participants.length} progress={progress} reducedMotion={reducedMotion} isRacing={isRacing} />
  </>;
}

function HeroDuck({ screen, appearances, finished, reducedMotion }) {
  const [model] = useGLTF(duckAssetUrls(duckAssetPlan(screen, [], appearances)));
  return <AnimatedDuck model={model} position={[-4, 1.2, -15.8]} rotation={[0, 2.12, 0]} scale={1.7} accessory={appearances[0]?.accessory || (screen === 'results' ? 'medal' : undefined)} moving={false} finished={finished} reducedMotion={reducedMotion} />;
}

export default function Ducks(props) {
  if (props.screen === 'stages' || (props.screen === 'race' && !props.participants.length)) return null;
  return props.screen === 'race' ? <RaceDucks {...props} /> : <HeroDuck {...props} />;
}
