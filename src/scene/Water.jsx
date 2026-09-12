/* eslint-disable react/no-unknown-property */
import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { useEnvironment } from '@react-three/drei';
import * as THREE from 'three';
import { skyAssetUrl } from './assetUrl';

const vertex = `
  varying vec3 vWorld;
  varying vec2 vUv;
  uniform float uTime;
  void main() {
    vUv = uv;
    vec3 p = position;
    p.z += sin(p.x * .57 + uTime * .7) * .022 + sin(p.y * .73 + uTime * .56) * .025;
    vec4 world = modelMatrix * vec4(p, 1.);
    vWorld = world.xyz;
    gl_Position = projectionMatrix * viewMatrix * world;
  }
`;
const fragment = `
  uniform float uTime, uGolden;
  uniform vec3 uDeep, uShallow, uSky, uSun, uSunDirection;
  uniform sampler2D uEnvironment;
  varying vec3 vWorld;
  varying vec2 vUv;
  float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
  float noise(vec2 p) {
    vec2 i = floor(p), f = fract(p); f = f*f*(3.-2.*f);
    return mix(mix(hash(i), hash(i+vec2(1,0)), f.x), mix(hash(i+vec2(0,1)), hash(i+vec2(1,1)), f.x), f.y);
  }
  float waves(vec2 p) {
    return sin(p.x * 1.7 + p.y * 1.1 + uTime * 1.2) * .32
      + sin(p.y * 3.5 - p.x * .8 + uTime * .78) * .17
      + sin(p.x * 9.1 + p.y * 6.2 - uTime * 1.6) * .045
      + noise(p * 2.2 + uTime * .08) * .25;
  }
  void main() {
    vec2 p = vWorld.xz;
    #ifdef LOW_QUALITY
      // Analytic derivatives keep the same three wave scales with three cosine
      // evaluations instead of four finite-difference noise/wave samples.
      vec3 waveCos = cos(vec3(p.x*1.7+p.y*1.1+uTime*1.2, p.y*3.5-p.x*.8+uTime*.78, p.x*9.1+p.y*6.2-uTime*1.6));
      vec3 normal = normalize(vec3(-dot(waveCos,vec3(.544,-.136,.4095))*.077, 1., -dot(waveCos,vec3(.352,.595,.279))*.077));
    #else
      float e = .035;
      vec3 normal = normalize(vec3((waves(p-vec2(e,0))-waves(p+vec2(e,0))) * 1.1, 1., (waves(p-vec2(0,e))-waves(p+vec2(0,e))) * 1.1));
    #endif
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
    float sunAmount = max(dot(reflectDirection, normalize(uSunDirection)), 0.);
    vec3 specular = uSun * (pow(sunAmount, 160.) * 5. + pow(sunAmount, 20.) * .19);
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

export default function Water({ config, stage, reducedMotion, low, medium }) {
  const material = useRef();
  const environment = useEnvironment({ files: skyAssetUrl(stage) });
  const defines = useMemo(() => low ? { LOW_QUALITY: '' } : {}, [low]);
  const uniforms = useMemo(() => ({
    uTime: { value: 0 }, uGolden: { value: stage === 'forest-lake' ? 1 : 0 }, uDeep: { value: new THREE.Color(config.water) },
    uShallow: { value: new THREE.Color(config.shallows) }, uSky: { value: new THREE.Color(config.sky) },
    uSun: { value: new THREE.Color(config.sun) }, uSunDirection: { value: new THREE.Vector3(...config.sunPosition).normalize() },
    uEnvironment: { value: environment },
  }), [config, stage, environment]);
  useFrame((state) => { if (material.current && !reducedMotion) material.current.uniforms.uTime.value = state.clock.elapsedTime; });
  return <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -.025, 40]} receiveShadow>
    <planeGeometry args={[210, 390, low ? 50 : medium ? 80 : 110, low ? 100 : medium ? 140 : 180]} />
    <shaderMaterial ref={material} vertexShader={vertex} fragmentShader={fragment} defines={defines} uniforms={uniforms} />
  </mesh>;
}
