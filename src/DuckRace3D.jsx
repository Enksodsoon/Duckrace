import React, { Suspense, useMemo, useRef } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { Html, PerspectiveCamera, Sparkles } from "@react-three/drei";
import * as THREE from "three";

const TRACK_START_X = -4.8;
const TRACK_FINISH_X = 4.8;
const TRACK_WIDTH = TRACK_FINISH_X - TRACK_START_X;

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function laneZ(index, count) {
  if (count <= 1) return 0;
  const spacing = Math.min(1.42, Math.max(0.62, 8.8 / Math.max(1, count - 1)));
  return (index - (count - 1) / 2) * spacing;
}

function makeMaterial(color) {
  return new THREE.MeshLambertMaterial({ color });
}

function DuckAccessory3D({ variant }) {
  if (variant.accessory === "cap") {
    return (
      <group position={[0.08, 0.92, 0]} rotation={[0, 0, -0.1]}>
        <mesh castShadow position={[0, 0.08, 0]}>
          <cylinderGeometry args={[0.26, 0.31, 0.16, 16]} />
          <meshStandardMaterial color={variant.palette.accent} roughness={0.55} />
        </mesh>
        <mesh castShadow position={[0.25, 0.01, 0]} scale={[0.42, 0.04, 0.2]}>
          <boxGeometry args={[1, 1, 1]} />
          <meshStandardMaterial color={variant.palette.accentSoft} roughness={0.6} />
        </mesh>
      </group>
    );
  }

  if (variant.accessory === "scarf") {
    return (
      <group position={[-0.02, 0.42, 0]}>
        <mesh castShadow rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[0.34, 0.04, 8, 32]} />
          <meshStandardMaterial color={variant.palette.accent} roughness={0.7} />
        </mesh>
        <mesh castShadow position={[0.12, -0.23, -0.18]} rotation={[0.45, 0.2, -0.2]} scale={[0.12, 0.42, 0.06]}>
          <boxGeometry args={[1, 1, 1]} />
          <meshStandardMaterial color={variant.palette.accentSoft} roughness={0.72} />
        </mesh>
      </group>
    );
  }

  if (variant.accessory === "glasses") {
    return (
      <group position={[0.48, 0.62, 0]}>
        <mesh rotation={[0, Math.PI / 2, 0]}>
          <torusGeometry args={[0.095, 0.012, 6, 20]} />
          <meshStandardMaterial color="#243244" roughness={0.45} metalness={0.2} />
        </mesh>
        <mesh position={[0, 0, -0.18]} rotation={[0, Math.PI / 2, 0]}>
          <torusGeometry args={[0.095, 0.012, 6, 20]} />
          <meshStandardMaterial color="#243244" roughness={0.45} metalness={0.2} />
        </mesh>
        <mesh position={[0.02, 0, -0.09]} scale={[0.03, 0.02, 0.16]}>
          <boxGeometry args={[1, 1, 1]} />
          <meshStandardMaterial color="#243244" roughness={0.45} />
        </mesh>
      </group>
    );
  }

  if (variant.accessory === "bow") {
    return (
      <group position={[0.18, 0.88, 0]} rotation={[0.15, 0.15, 0]}>
        <mesh castShadow position={[0, 0, 0.1]} rotation={[0, 0, Math.PI / 2]} scale={[0.18, 0.1, 0.12]}>
          <coneGeometry args={[1, 1.2, 3]} />
          <meshStandardMaterial color="#f472b6" roughness={0.68} />
        </mesh>
        <mesh castShadow position={[0, 0, -0.1]} rotation={[0, 0, -Math.PI / 2]} scale={[0.18, 0.1, 0.12]}>
          <coneGeometry args={[1, 1.2, 3]} />
          <meshStandardMaterial color="#f472b6" roughness={0.68} />
        </mesh>
        <mesh castShadow scale={[0.07, 0.07, 0.07]}>
          <sphereGeometry args={[1, 16, 12]} />
          <meshStandardMaterial color="#ec4899" roughness={0.62} />
        </mesh>
      </group>
    );
  }

  return null;
}

function DuckPattern3D({ variant }) {
  if (variant.pattern === "spot") {
    return (
      <group>
        {[
          [-0.18, 0.14, 0.44, 0.09, variant.palette.accent],
          [-0.44, 0.04, 0.32, 0.07, variant.palette.accentSoft],
          [0.16, 0.12, 0.4, 0.065, variant.palette.accent],
        ].map(([x, y, z, size, color], index) => (
          <mesh key={`spot-${index}`} castShadow position={[x, y, z]} scale={[size, size, size]}>
            <sphereGeometry args={[1, 12, 8]} />
            <meshStandardMaterial color={color} roughness={0.6} />
          </mesh>
        ))}
      </group>
    );
  }

  if (variant.pattern === "stripe") {
    return (
      <group>
        {[-0.28, 0.02, 0.3].map((x, index) => (
          <mesh key={`stripe-${index}`} castShadow position={[x, 0.04, 0.48]} rotation={[0.2, 0.1, 0.42]} scale={[0.035, 0.32, 0.035]}>
            <cylinderGeometry args={[1, 1, 1, 8]} />
            <meshStandardMaterial color={index === 1 ? variant.palette.accentSoft : variant.palette.accent} roughness={0.6} />
          </mesh>
        ))}
      </group>
    );
  }

  return null;
}

function DuckModel({ variant, active, winner, place, motionPhase = 0 }) {
  const bodyMat = useMemo(() => makeMaterial(variant.palette.bodyB, winner ? 0.42 : 0.58, 0.02), [variant.palette.bodyB, winner]);
  const bodyHighlightMat = useMemo(() => makeMaterial(variant.palette.bodyA, 0.5, 0.01), [variant.palette.bodyA]);
  const wingMat = useMemo(() => makeMaterial(variant.palette.wing, 0.62, 0.02), [variant.palette.wing]);
  const billMat = useMemo(() => makeMaterial(variant.palette.bill, 0.54, 0.01), [variant.palette.bill]);
  const podiumMat = useMemo(() => {
    if (place === 0) return makeMaterial("#facc15", 0.35, 0.2);
    if (place === 1) return makeMaterial("#d1d5db", 0.4, 0.22);
    if (place === 2) return makeMaterial("#fb923c", 0.42, 0.16);
    return null;
  }, [place]);

  const wingAngle = active ? Math.sin(motionPhase * 7) * 0.26 : 0.06;
  const legAngle = active ? Math.sin(motionPhase * 8) * 0.22 : 0.02;

  return (
    <group scale={winner ? 1.12 : 1}>
      <mesh castShadow receiveShadow scale={[0.78, 0.48, 0.48]} position={[-0.18, 0.26, 0]}>
        <sphereGeometry args={[1, 28, 18]} />
        <primitive object={bodyMat} attach="material" />
      </mesh>
      <mesh castShadow receiveShadow scale={[0.42, 0.18, 0.28]} position={[-0.36, 0.52, 0]}>
        <sphereGeometry args={[1, 20, 12]} />
        <primitive object={bodyHighlightMat} attach="material" />
      </mesh>
      <mesh castShadow receiveShadow scale={[0.34, 0.34, 0.34]} position={[0.5, 0.64, 0]}>
        <sphereGeometry args={[1, 24, 16]} />
        <primitive object={bodyMat} attach="material" />
      </mesh>
      <mesh castShadow receiveShadow position={[0.86, 0.58, 0]} rotation={[0, 0, -Math.PI / 2]} scale={[0.28, 0.16, 0.16]}>
        <coneGeometry args={[1, 1.25, 20]} />
        <primitive object={billMat} attach="material" />
      </mesh>
      <mesh castShadow receiveShadow position={[0.92, 0.51, 0]} rotation={[0, 0, -Math.PI / 2]} scale={[0.22, 0.1, 0.12]}>
        <coneGeometry args={[1, 1.1, 20]} />
        <primitive object={billMat} attach="material" />
      </mesh>
      <mesh castShadow receiveShadow position={[0.48, 0.72, 0.2]} scale={[0.035 * variant.eyeSize, 0.035 * variant.eyeSize, 0.035 * variant.eyeSize]}>
        <sphereGeometry args={[1, 16, 10]} />
        <meshStandardMaterial color="#0f172a" roughness={0.4} />
      </mesh>
      <mesh castShadow receiveShadow position={[0.48, 0.72, -0.2]} scale={[0.035 * variant.eyeSize, 0.035 * variant.eyeSize, 0.035 * variant.eyeSize]}>
        <sphereGeometry args={[1, 16, 10]} />
        <meshStandardMaterial color="#0f172a" roughness={0.4} />
      </mesh>
      <mesh castShadow receiveShadow position={[-0.26, 0.22, 0.46]} rotation={[0.16 + wingAngle, 0.12, -0.16]} scale={[0.36, 0.11, 0.24]}>
        <sphereGeometry args={[1, 20, 10]} />
        <primitive object={wingMat} attach="material" />
      </mesh>
      <mesh castShadow receiveShadow position={[-0.26, 0.22, -0.46]} rotation={[-0.16 - wingAngle, -0.12, 0.16]} scale={[0.36, 0.11, 0.24]}>
        <sphereGeometry args={[1, 20, 10]} />
        <primitive object={wingMat} attach="material" />
      </mesh>
      <DuckPattern3D variant={variant} />
      <DuckAccessory3D variant={variant} />
      {[-0.24, 0.18].map((x, legIndex) => (
        <group key={`leg-${legIndex}`} position={[x, -0.23, legIndex ? -0.18 : 0.18]} rotation={[legAngle * (legIndex ? -1 : 1), 0, 0]}>
          <mesh castShadow receiveShadow position={[0, -0.1, 0]} scale={[0.04, 0.2, 0.04]}>
            <cylinderGeometry args={[1, 1, 1, 8]} />
            <primitive object={billMat} attach="material" />
          </mesh>
          <mesh castShadow receiveShadow position={[0.12, -0.24, 0]} scale={[0.16, 0.04, 0.09]}>
            <sphereGeometry args={[1, 12, 8]} />
            <primitive object={billMat} attach="material" />
          </mesh>
        </group>
      ))}
      {podiumMat ? (
        <mesh castShadow position={[-0.54, 0.86, 0]} rotation={[0, 0, -0.15]} scale={[0.16, 0.16, 0.16]}>
          <torusKnotGeometry args={[1, 0.2, 32, 6]} />
          <primitive object={podiumMat} attach="material" />
        </mesh>
      ) : null}
    </group>
  );
}

function Racer3D({ index, count, name, progress, place, variant, active, winner, showBurst }) {
  const groupRef = useRef(null);
  const targetProgressRef = useRef(progress);

  targetProgressRef.current = clamp(progress ?? 0, 0, 100);

  useFrame((state, delta) => {
    if (!groupRef.current) return;
    const targetX = TRACK_START_X + TRACK_WIDTH * (targetProgressRef.current / 100);
    if (!active && targetProgressRef.current >= 99.9) {
      groupRef.current.position.x = targetX;
    } else {
      groupRef.current.position.x = THREE.MathUtils.damp(groupRef.current.position.x, targetX, active ? 9.5 : 13, delta);
    }
    groupRef.current.position.z = laneZ(index, count);
    const wobble = active ? Math.sin(state.clock.elapsedTime * 7 + index) : 0;
    groupRef.current.position.y = 0.62 + wobble * 0.08;
    groupRef.current.rotation.y = wobble * 0.04;
    groupRef.current.rotation.z = active ? Math.sin(state.clock.elapsedTime * 4 + index) * 0.04 : 0;
  });

  return (
    <group ref={groupRef} position={[TRACK_START_X, 0.62, laneZ(index, count)]} scale={0.86}>
      <DuckModel variant={variant} active={active} winner={winner} place={place} motionPhase={index + (progress ?? 0) / 12} />
      {(!active || winner) ? (
        <Html position={[0, 1.25, 0]} center distanceFactor={7.5} style={{ pointerEvents: "none" }}>
          <div className={`duck-label ${winner ? "duck-label--winner" : ""}`}>
            {place > -1 ? <span>{place + 1}</span> : null}
            {name}
          </div>
        </Html>
      ) : null}
      {active ? (
        <mesh position={[-0.62, -0.43, 0]} rotation={[-Math.PI / 2, 0, 0]} scale={[0.45, 0.12, 1]}>
          <ringGeometry args={[0.45, 0.55, 32]} />
          <meshBasicMaterial color="#cffafe" transparent opacity={0.24} side={THREE.DoubleSide} />
        </mesh>
      ) : null}
      {winner && showBurst ? (
        <Sparkles count={20} scale={[1.8, 1.2, 1.8]} size={4} speed={0.36} color="#fde047" />
      ) : null}
    </group>
  );
}

function RaceWater({ count }) {
  const waterRef = useRef(null);
  const lanes = Array.from({ length: count }).map((_, index) => laneZ(index, count));

  useFrame((state) => {
    if (!waterRef.current) return;
    waterRef.current.material.opacity = 0.58 + Math.sin(state.clock.elapsedTime * 0.8) * 0.04;
  });

  return (
    <group>
      <mesh ref={waterRef} receiveShadow rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.02, 0]}>
        <planeGeometry args={[14.2, Math.max(6.6, count * 0.82), 18, 6]} />
        <meshStandardMaterial color="#20b8d5" roughness={0.28} metalness={0.02} transparent opacity={0.62} />
      </mesh>
      <mesh receiveShadow rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.01, 0]}>
        <planeGeometry args={[15.2, Math.max(7.6, count * 0.92), 1, 1]} />
        <meshStandardMaterial color="#06748c" roughness={0.75} metalness={0.01} />
      </mesh>
      {lanes.map((z, index) => (
        <mesh key={`lane-${index}`} position={[0, 0.08, z]} scale={[TRACK_WIDTH, 0.018, 0.018]}>
          <boxGeometry args={[1, 1, 1]} />
          <meshBasicMaterial color={index % 2 ? "#e0faff" : "#f8ffff"} transparent opacity={0.42} />
        </mesh>
      ))}
      {Array.from({ length: 18 }).map((_, index) => (
        <mesh key={`spark-${index}`} position={[TRACK_START_X + index * 0.82, 0.1, -Math.max(3.2, count * 0.42)]} rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[0.44, 0.025]} />
          <meshBasicMaterial color="#dff9ff" transparent opacity={0.34} />
        </mesh>
      ))}
    </group>
  );
}

function Gate({ x, label, finish }) {
  const stripeColor = finish ? "#facc15" : "#e0f2fe";
  return (
    <group position={[x, 0, 0]}>
      <mesh castShadow position={[0, 1.2, -4.1]} scale={[0.09, 2.4, 0.09]}>
        <boxGeometry args={[1, 1, 1]} />
        <meshStandardMaterial color={stripeColor} roughness={0.45} />
      </mesh>
      <mesh castShadow position={[0, 1.2, 4.1]} scale={[0.09, 2.4, 0.09]}>
        <boxGeometry args={[1, 1, 1]} />
        <meshStandardMaterial color={stripeColor} roughness={0.45} />
      </mesh>
      {finish ? (
        Array.from({ length: 7 }).map((_, index) => (
          <mesh key={`finish-${index}`} position={[0, 0.16, -3 + index]} scale={[0.14, 0.05, 0.42]}>
            <boxGeometry args={[1, 1, 1]} />
            <meshStandardMaterial color={index % 2 ? "#fff7ed" : "#facc15"} roughness={0.5} />
          </mesh>
        ))
      ) : null}
      <Html position={[0, 2.55, finish ? 3.6 : -3.6]} center distanceFactor={8} style={{ pointerEvents: "none" }}>
        <div className="gate-label">{label}</div>
      </Html>
    </group>
  );
}

function RaceScene({ racers, progress, placements, isRacing, showBurst, variants, cameraDistance }) {
  const placementByIndex = useMemo(() => new Map(placements.map((item) => [item.raceIndex, item.place])), [placements]);

  return (
    <>
      <PerspectiveCamera makeDefault position={[0, cameraDistance, 11.6]} fov={46} rotation={[-0.7, 0, 0]} />
      <ambientLight intensity={0.86} />
      <directionalLight position={[3, 8, 5]} intensity={2.15} />
      <pointLight position={[-5, 3, -4]} intensity={1.35} color="#bff7ff" />
      <RaceWater count={racers.length} />
      <Gate x={TRACK_START_X - 0.45} label="Start" />
      <Gate x={TRACK_FINISH_X + 0.34} label="Finish" finish />
      {racers.map((name, index) => {
        const place = placementByIndex.has(index) ? placementByIndex.get(index) : -1;
        return (
          <Racer3D
            key={`${name}-${index}`}
            index={index}
            count={racers.length}
            name={name}
            progress={progress[index] ?? 0}
            place={place}
            variant={variants[index]}
            active={isRacing}
            winner={place === 0}
            showBurst={showBurst}
          />
        );
      })}
    </>
  );
}

function LeaderboardOverlay({ racers, progress, placements, audience }) {
  const ranking = racers
    .map((name, index) => ({
      name,
      index,
      progress: progress[index] ?? 0,
      place: placements.find((item) => item.raceIndex === index)?.place ?? null,
    }))
    .sort((a, b) => {
      if (a.place !== null && b.place !== null) return a.place - b.place;
      if (a.place !== null) return -1;
      if (b.place !== null) return 1;
      return b.progress - a.progress;
    });

  return (
    <div className={`race3d-leaderboard ${audience ? "race3d-leaderboard--audience" : ""}`}>
      {ranking.slice(0, audience ? 6 : 4).map((item, index) => (
        <div key={`rank-${item.name}-${index}`} className={index === 0 ? "race3d-rank race3d-rank--lead" : "race3d-rank"}>
          <span>{item.place !== null ? item.place + 1 : index + 1}</span>
          <div>
            <strong>{item.name}</strong>
            <small>{Math.round(item.progress)}% track progress</small>
          </div>
        </div>
      ))}
    </div>
  );
}

export function RaceArena3D({ racers, progress, placements, isRacing, showBurst, countdownValue, audience = false, variants }) {
  const sortedPlacements = useMemo(() => placements.slice().sort((a, b) => a.place - b.place), [placements]);
  const firstPlace = sortedPlacements[0];
  const winnerName = firstPlace ? racers[firstPlace.raceIndex] : "";
  const leaderProgress = progress.length ? Math.max(...progress) : 0;
  const winnerProgress = firstPlace ? progress[firstPlace.raceIndex] ?? 0 : 0;
  const cameraDistance = audience ? 9.8 : racers.length > 12 ? 10.8 : 9.2;

  return (
    <section
      className={`race3d-shell ${audience ? "race3d-shell--audience" : ""}`}
      aria-label="Real 3D duck race track"
      data-leading-progress={Math.round(leaderProgress)}
      data-winner-progress={Math.round(winnerProgress)}
      data-racing={isRacing ? "true" : "false"}
    >
      <div className="race3d-stage">
        <Canvas dpr={[0.7, 1]} gl={{ antialias: false, alpha: true, powerPreference: "high-performance", precision: "mediump" }}>
          <color attach="background" args={["#6bd8ed"]} />
          <fog attach="fog" args={["#6bd8ed", 13, 27]} />
          <Suspense fallback={null}>
            <RaceScene
              racers={racers}
              progress={progress}
              placements={placements}
              isRacing={isRacing}
              showBurst={showBurst}
              variants={variants}
              cameraDistance={cameraDistance}
            />
          </Suspense>
        </Canvas>
        <div className="race3d-vignette" />
        {winnerName && !isRacing && countdownValue === null ? (
          <div className="race3d-winner">
            <small>Winner</small>
            <strong>{winnerName}</strong>
          </div>
        ) : null}
        {countdownValue !== null ? (
          <div className="race3d-countdown">
            <strong>{countdownValue}</strong>
            <span>Race starts now</span>
          </div>
        ) : null}
      </div>
      <div className="race3d-statusbar">
        <span>Real 3D mesh ducks</span>
        <span>Water circuit</span>
        <span>{racers.length} racers</span>
      </div>
      <LeaderboardOverlay racers={racers} progress={progress} placements={placements} audience={audience} />
    </section>
  );
}

export function DuckPreview3D({ variant, index = 0 }) {
  return (
    <div className="duck-preview3d" aria-label="3D duck model preview">
      <Canvas dpr={[0.7, 1]} gl={{ antialias: false, alpha: true, precision: "mediump" }}>
        <PerspectiveCamera makeDefault position={[0, 1.4, 3.4]} fov={34} rotation={[-0.18, 0, 0]} />
        <ambientLight intensity={0.9} />
        <directionalLight position={[3, 4, 3]} intensity={1.8} />
        <group position={[0, -0.34, 0]} rotation={[0, -0.26 + index * 0.08, 0]}>
          <DuckModel variant={variant} active={false} winner={index === 0} place={index < 3 ? index : -1} />
        </group>
      </Canvas>
    </div>
  );
}
