import { Component, Suspense, memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import RaceEnvironment from './Environment';
import Ducks, { laneX, raceZ } from './Ducks';
import { STAGES } from './terrain';
import { duckAssetPlan, duckAssetUrls } from './duckAssets';
import RacerLabels from './RacerLabels';

class SceneBoundary extends Component {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  componentDidCatch(error) { this.props.onError?.(error); }
  render() { return this.state.failed ? null : this.props.children; }
}

const CameraRig = memo(function CameraRig({ screen, participants, progress, cameraMode, followId, reducedMotion }) {
  const { camera, size } = useThree();
  const look = useRef(new THREE.Vector3(0, 1, 25));
  const previousScreen = useRef(null);
  const desired = useMemo(() => new THREE.Vector3(), []);
  const target = useMemo(() => new THREE.Vector3(), []);
  const currentLane = useRef(0);
  useFrame((_state, delta) => {
    const mobile = size.width < 680;
    if (screen === 'race') {
      const p = progress?.current || progress;
      const requested = followId == null ? -1 : participants.findIndex(item => item.id === followId);
      let leader = 0;
      for (let i = 1; i < p.length; i++) {
        if (p[i] > (p[leader] || 0)) leader = i;
      }
      const index = cameraMode === 'follow' && requested >= 0 ? requested : leader;
      const z = raceZ(p[index]);
      const lane = laneX(index, participants.length);
      if (previousScreen.current !== screen) {
        currentLane.current = lane;
      } else {
        currentLane.current += (lane - currentLane.current) * (1 - Math.exp(-delta * 3.5));
      }
      const smoothLane = currentLane.current;
      if (cameraMode === 'overview') {
        const spread = Math.max(12, participants.length * .6);
        desired.set(spread * .5, Math.max(16, spread * (mobile ? 1.4 : .85)), z - Math.max(20, spread * .6));
        target.set(0, 0, z + 8);
      } else if (cameraMode === 'follow') {
        desired.set(smoothLane + (mobile ? 2.2 : 3.4), 2.3, z - 7.8);
        target.set(smoothLane, .38, z + 2);
      } else {
        const half = participants.length < 12 ? .12 : .9;
        const closePack = participants.length <= 6;
        desired.set(smoothLane * half, mobile ? 5.5 : closePack ? 2.8 : 3.8, z - (mobile ? 16 : closePack ? 13.5 : 14));
        target.set(smoothLane * half, .35, z + 3);
      }
    } else if (screen === 'garage') {
      desired.set(mobile ? -4 : .5, 3.0, mobile ? -25.5 : -24);
      target.set(mobile ? -4 : -1.7, 1.2, -15.5);
    } else if (screen === 'results') {
      desired.set(mobile ? -4 : .5, 3.2, mobile ? -25.5 : -24);
      target.set(mobile ? -4 : -1.7, 1.2, -15.5);
    } else if (screen === 'stages') {
      desired.set(-3, mobile ? 9 : 6.5, -27);
      target.set(0, 1.4, 30);
    } else {
      desired.set(mobile ? -4 : .5, mobile ? 3.5 : 3.2, mobile ? -26 : -24.5);
      target.set(mobile ? -4 : -1.7, 1.1, -15);
    }
    const snap = reducedMotion || previousScreen.current !== screen;
    const blend = snap ? 1 : 1 - Math.exp(-delta * 2.8);
    camera.position.lerp(desired, blend); look.current.lerp(target, blend); camera.lookAt(look.current);
    camera.updateMatrixWorld();
    previousScreen.current = screen;
  });
  return null;
});

function Health({ onError, onMetrics, onSlow, quality, count }) {
  const { gl } = useThree();
  const gpu = useMemo(() => {
    const context = gl.getContext();
    const debug = context.getExtension('WEBGL_debug_renderer_info');
    return context.getParameter(debug ? debug.UNMASKED_RENDERER_WEBGL : context.RENDERER);
  }, [gl]);
  const samples = useRef({ time: 0, frames: 0, slowIntervals: 0 });
  useEffect(() => {
    const lost = event => { event.preventDefault(); onError?.(new Error('The 3D graphics context was lost. The randomizer remains available.')); };
    gl.domElement.addEventListener('webglcontextlost', lost);
    return () => gl.domElement.removeEventListener('webglcontextlost', lost);
  }, [gl, onError]);
  useFrame((_state, delta) => {
    if (document.visibilityState === 'hidden') { samples.current.time = 0; samples.current.frames = 0; return; }
    samples.current.time += delta; samples.current.frames++;
    if (samples.current.time >= 2) {
      const fps = samples.current.frames / samples.current.time;
      onMetrics?.({ fps: Math.round(fps), sampleSeconds: samples.current.time, sampleFrames: samples.current.frames, focused: document.hasFocus(), drawCalls: gl.info.render.calls, triangles: gl.info.render.triangles, duckCount: count, quality, renderer: 'three-webgl', gpu });
      // Chromium can throttle an occluded window while visibilityState stays visible.
      // Report those frames truthfully, but never reduce quality because it lost focus.
      const target = gl.domElement.clientWidth < 720 ? 27 : 48;
      if (fps < target && document.hasFocus()) samples.current.slowIntervals++; else samples.current.slowIntervals = 0;
      if (samples.current.slowIntervals >= 2) { onSlow(); samples.current.slowIntervals = 0; }
      samples.current.time = 0; samples.current.frames = 0;
    }
  });
  return null;
}

function LoadingSignal({ onLoading }) {
  useEffect(() => { onLoading?.(); }, [onLoading]);
  return null;
}

function RenderResolution({ quality, onChange }) {
  const { size } = useThree();
  useEffect(() => {
    // Budget 3D pixels independently of CSS/UI resolution. Browser zoom and
    // high-density monitors otherwise multiply fragment work quadratically.
    const pixels = quality === 'high' ? 2_400_000 : quality === 'medium' ? 1_800_000 : 1_200_000;
    const cap = quality === 'high' ? 1.7 : quality === 'medium' ? 1.4 : 1.2;
    onChange(Math.min(window.devicePixelRatio || 1, cap, Math.sqrt(pixels / Math.max(1, size.width * size.height))));
  }, [quality, size.width, size.height, onChange]);
  return null;
}

// Shore, docks and architecture are static. Re-rendering their shadow map at
// display refresh costs a full extra scene pass; swimming ducks cast no useful
// shadow on the custom water shader. Hero animation gets a bounded 12 Hz update.
function ShadowBudget({ screen, requestKey, quality, reducedMotion }) {
  const get = useThree(state => state.get);
  const elapsed = useRef(0);
  useEffect(() => {
    const { gl } = get();
    gl.shadowMap.autoUpdate = false;
    gl.shadowMap.needsUpdate = true;
    elapsed.current = 0;
    return () => { gl.shadowMap.autoUpdate = true; };
  }, [get, requestKey, quality]);
  useFrame(({ gl }, delta) => {
    if (screen === 'race' || screen === 'stages' || reducedMotion) return;
    elapsed.current += delta;
    if (elapsed.current >= 1 / 12) { gl.shadowMap.needsUpdate = true; elapsed.current = 0; }
  }, -2);
  return null;
}

function ReadySignal({ onReady, requestKey }) {
  useEffect(() => {
    const [screen, stage] = JSON.parse(requestKey);
    onReady({ screen, stage, requestKey });
  }, [onReady, requestKey]);
  return null;
}

/** A single 3D renderer. All race positions are inputs; no outcome generation occurs here. */
function DuckScene({ screen = 'home', stage = 'forest-lake', participants = [], progress = [], appearances = [], isRacing = false, preparing = false, finished = false, cameraMode = 'chase', followId = null, quality = 'auto', reducedMotion = false, onReady, onLoading, onError, onMetrics }) {
  const [renderDpr, setRenderDpr] = useState(1);
  const [adaptiveQuality, setAdaptiveQuality] = useState(() => {
    if (typeof window === 'undefined') return 'high';
    const isMobile = window.innerWidth < 768 || (typeof navigator !== 'undefined' && navigator.maxTouchPoints > 1);
    const lowCores = typeof navigator !== 'undefined' && navigator.hardwareConcurrency && navigator.hardwareConcurrency <= 4;
    return isMobile || lowCores ? 'medium' : 'high';
  });
  const effectiveQuality = quality === 'auto' ? adaptiveQuality : quality;
  const low = effectiveQuality === 'low';
  const medium = effectiveQuality === 'medium';
  const config = STAGES[stage] || STAGES['forest-lake'];
  const width = screen === 'race' ? Math.max(14, Math.abs(laneX(0, participants.length)) + 4.5) : 26;
  const handleSlow = useCallback(() => {
    if (quality !== 'auto') return;
    // Preserve materials, reflections and foliage first. Respond to visible
    // desktop stutter before the old 28 FPS threshold was reached.
    if (renderDpr > .86) setRenderDpr(Math.max(.85, renderDpr * .9));
    else setAdaptiveQuality(current => current === 'high' ? 'medium' : 'low');
  }, [quality, renderDpr]);
  const readyRef = useRef(onReady);
  useEffect(() => { readyRef.current = onReady; }, [onReady]);
  const handleReady = useCallback(info => readyRef.current?.(info), []);
  const requestKey = useMemo(
    () => JSON.stringify([screen, stage, preparing, ...duckAssetUrls(duckAssetPlan(screen, participants, appearances))]),
    [screen, stage, preparing, participants, appearances],
  );
  const createRenderer = useCallback(canvas => {
    try {
      return new THREE.WebGLRenderer({ canvas, antialias: !low, powerPreference: low ? 'low-power' : 'high-performance', alpha: false });
    } catch (cause) {
      const error = new Error('WebGL is unavailable. You can still use the randomizer.', { cause });
      onError?.(error);
      throw error;
    }
  }, [low, onError]);
  return <div className="duck-scene" aria-hidden="true" style={{ position: 'absolute', inset: 0, overflow: 'hidden', background: config.sky }}>
    <SceneBoundary onError={onError}>
      <Canvas shadows={!low} dpr={renderDpr} camera={{ position: [0, 3, -24], fov: 49, near: .1, far: 500 }} gl={createRenderer} fallback={<span>3D graphics unavailable</span>}>
        <RenderResolution quality={effectiveQuality} onChange={setRenderDpr} />
        <CameraRig screen={screen} participants={participants} progress={progress} cameraMode={cameraMode} followId={followId} reducedMotion={reducedMotion} />
        <Health onError={onError} onMetrics={onMetrics} onSlow={handleSlow} quality={low ? 'low' : medium ? 'medium' : 'high'} count={screen === 'race' ? participants.length : screen === 'stages' ? 0 : 1} />
        <Suspense fallback={<LoadingSignal onLoading={onLoading} />}>
          <ShadowBudget screen={screen} requestKey={requestKey} quality={effectiveQuality} reducedMotion={reducedMotion} />
          <RaceEnvironment config={config} stage={stage} screen={screen} width={width} low={low} medium={medium} reducedMotion={reducedMotion} />
          <Ducks screen={screen} participants={participants} progress={progress} appearances={appearances} reducedMotion={reducedMotion} isRacing={isRacing} finished={finished} />
          {screen === 'race' && <RacerLabels participants={participants} progress={progress} followId={followId} cameraMode={cameraMode} />}
          <ReadySignal onReady={handleReady} requestKey={requestKey} />
        </Suspense>
      </Canvas>
    </SceneBoundary>
  </div>;
}

export default memo(DuckScene);
