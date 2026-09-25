/* eslint-disable react/no-unknown-property */
import { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { useEnvironment } from '@react-three/drei';
import * as THREE from 'three';
import { Reflector } from 'three/examples/jsm/objects/Reflector.js';
import { skyAssetUrl } from './assetUrl';

const vertex = `
  varying vec3 vWorld;
  varying vec2 vUv;
  varying vec4 vReflection;
  uniform mat4 uReflectionMatrix;
  uniform float uTime;
  void main() {
    vUv = uv;
    vec3 p = position;
    p.z += sin(p.x * .57 + uTime * .7) * .022 + sin(p.y * .73 + uTime * .56) * .025;
    vec4 world = modelMatrix * vec4(p, 1.);
    vWorld = world.xyz;
    vReflection = uReflectionMatrix * vec4(p, 1.);
    gl_Position = projectionMatrix * viewMatrix * world;
  }
`;
const fragment = `
  uniform float uTime, uGolden;
  uniform vec3 uDeep, uShallow, uSky, uSun, uSunDirection;
  uniform sampler2D uEnvironment;
  uniform sampler2D uReflection;
  uniform float uHasReflection;
  varying vec4 vReflection;
  varying vec3 vWorld;
  varying vec2 vUv;
  void main() {
    vec2 p = vWorld.xz;
      // Analytic derivatives keep the same three wave scales with three cosine
      // evaluations instead of four finite-difference noise/wave samples.
      vec3 waveCos = cos(vec3(p.x*1.7+p.y*1.1+uTime*1.2, p.y*3.5-p.x*.8+uTime*.78, p.x*9.1+p.y*6.2-uTime*1.6));
      vec3 normal = normalize(vec3(-dot(waveCos,vec3(.357,-.080,.2275))*.065, 1., -dot(waveCos,vec3(.231,.350,.155))*.065));
    vec3 view = normalize(cameraPosition-vWorld);
    vec3 reflectDirection = reflect(-view, normal);
    float fresnel = .035 + .965 * pow(1. - max(dot(view,normal), 0.), 5.);
    vec2 skyUv = vec2(atan(reflectDirection.z, reflectDirection.x) / 6.2831853 + .5 + 1.2 / 6.2831853, asin(clamp(reflectDirection.y, -1., 1.)) / 3.14159265 + .5);
    vec3 reflectedSky = texture2D(uEnvironment, skyUv).rgb * .8;
    reflectedSky *= mix(vec3(1.), vec3(1.08, 1., .82), uGolden);
    reflectedSky = mix(reflectedSky, uSun * .72, uGolden * .22 * pow(1. - clamp(reflectDirection.y, 0., 1.), 3.));
    // Analytic distant treeline and mountain silhouettes in the distorted reflection.
    float horizon = sin(reflectDirection.x * 17.) * .035 + sin(reflectDirection.x * 43.) * .018;
    float mountain = sin(reflectDirection.x * 9.) * .07 + .10;
    reflectedSky = mix(uDeep * .62, reflectedSky, smoothstep(horizon-.018, horizon+.045, reflectDirection.y));
    reflectedSky = mix(reflectedSky * .79, reflectedSky, smoothstep(mountain, mountain+.035, reflectDirection.y));
    vec2 reflectionUv = vReflection.xy / max(vReflection.w, .001);
    reflectionUv += normal.xz * .10;
    float edgeFade = smoothstep(0., .04, reflectionUv.x) * (1. - smoothstep(.96, 1., reflectionUv.x))
      * smoothstep(0., .04, reflectionUv.y) * (1. - smoothstep(.96, 1., reflectionUv.y));
    vec2 sampleUv = clamp(reflectionUv, .003, .997);
    vec3 sceneReflection = (texture2D(uReflection, sampleUv + vec2(.0015,0)).rgb
      + texture2D(uReflection, sampleUv - vec2(.0015,0)).rgb
      + texture2D(uReflection, sampleUv + vec2(0,.0015)).rgb
      + texture2D(uReflection, sampleUv - vec2(0,.0015)).rgb) * .25;
    reflectedSky = mix(reflectedSky, sceneReflection, uHasReflection * edgeFade);
    float sunAmount = max(dot(reflectDirection, normalize(uSunDirection)), 0.);
    vec3 specular = uSun * (pow(sunAmount, 260.) * 2.2 + pow(sunAmount, 32.) * .10);
    float shore = smoothstep(9., 17., abs(p.x + sin(p.y*.059)*2.6));
    vec3 submerged = mix(uDeep, uShallow, shore * .7);
    submerged += uShallow * pow(max(0., sin(p.x*7.1+p.y*4.4+uTime)+sin(p.y*8.3-uTime*.7))*.5, 6.)*.09;
    vec3 water = mix(submerged, reflectedSky, .13 + fresnel*.74) + specular;
    float fog = 1. - exp(-length(cameraPosition - vWorld) * .0023);
    gl_FragColor = vec4(mix(water, uSky, fog * .8), 1.);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
  }
`;

export default function Water({ config, stage, screen, reducedMotion, low, medium }) {
  const material = useRef();
  const surface = useRef();
  const frame = useRef(0);
  const reflector = useMemo(() => low ? null : new Reflector(new THREE.PlaneGeometry(210, 390), { textureWidth: medium ? 256 : 512, textureHeight: medium ? 256 : 512, clipBias: .003, multisample: 0 }), [low, medium]);
  useEffect(() => () => { reflector?.geometry.dispose(); reflector?.dispose(); }, [reflector]);
  const environment = useEnvironment({ files: skyAssetUrl(stage) });
  const defines = useMemo(() => low ? { LOW_QUALITY: '' } : {}, [low]);
  const uniforms = useMemo(() => ({
    uTime: { value: 0 }, uGolden: { value: stage === 'forest-lake' ? 1 : 0 }, uDeep: { value: new THREE.Color(config.water) },
    uShallow: { value: new THREE.Color(config.shallows) }, uSky: { value: new THREE.Color(config.sky) },
    uSun: { value: new THREE.Color(config.sun) }, uSunDirection: { value: new THREE.Vector3(...config.sunPosition).normalize() },
    uEnvironment: { value: environment },
    uReflection: { value: reflector ? reflector.getRenderTarget().texture : environment },
    uReflectionMatrix: { value: reflector ? reflector.material.uniforms.textureMatrix.value : new THREE.Matrix4() },
    uHasReflection: { value: reflector ? 1 : 0 },
  }), [config, stage, environment, reflector]);
  useFrame(({ clock, gl, scene, camera }) => {
    if (material.current && !reducedMotion) material.current.uniforms.uTime.value = clock.elapsedTime;
    const interval = screen !== 'race' ? 1 / 15 : (medium ? 1 / 20 : 1 / 30);
    if (reflector && surface.current && (clock.elapsedTime - frame.current >= interval || frame.current === 0)) {
      frame.current = clock.elapsedTime;
      surface.current.updateMatrixWorld();
      reflector.matrixWorld.copy(surface.current.matrixWorld);
      // Screen-facing names and high-density grass/reeds are omitted from blurry water reflection
      const labels = scene.getObjectByName('race-labels');
      const details = scene.getObjectByName('environment-detail');
      const labelsVisible = labels?.visible;
      const detailsVisible = details?.visible;
      if (labels) labels.visible = false;
      if (details) details.visible = false;
      surface.current.visible = false;
      try { reflector.onBeforeRender(gl, scene, camera); }
      finally {
        surface.current.visible = true;
        if (labels) labels.visible = labelsVisible;
        if (details) details.visible = detailsVisible;
      }
    }
  }, -1);
  return <mesh ref={surface} rotation={[-Math.PI / 2, 0, 0]} position={[0, -.025, 40]} receiveShadow>
    <planeGeometry args={[210, 390, low ? 50 : medium ? 80 : 110, low ? 100 : medium ? 140 : 180]} />
    <shaderMaterial ref={material} vertexShader={vertex} fragmentShader={fragment} defines={defines} uniforms={uniforms} />
  </mesh>;
}
