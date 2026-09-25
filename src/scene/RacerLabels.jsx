/* eslint-disable react/no-unknown-property */
import { memo, useEffect, useMemo, useRef, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { laneX, raceZ } from './Ducks';

const labelTextureCache = new Map();

function getLabelTexture(name, selected, leader) {
  const key = `${name}:${selected ? 's' : leader ? 'l' : 'd'}`;
  let texture = labelTextureCache.get(key);
  if (texture) return texture;

  const canvas = document.createElement('canvas'); canvas.width = 512; canvas.height = 96;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = selected ? 'rgba(12,56,51,.92)' : 'rgba(19,30,29,.82)';
  ctx.beginPath();
  if (typeof ctx.roundRect === 'function') ctx.roundRect(4, 4, 504, 88, 24);
  else ctx.rect(4, 4, 504, 88);
  ctx.fill();
  ctx.strokeStyle = selected ? '#96e5cf' : leader ? '#f2d57f' : '#c6d5ce'; ctx.lineWidth = selected ? 4 : 2; ctx.stroke();
  ctx.fillStyle = selected ? '#b8f4e1' : leader ? '#f2d57f' : '#edf4f0';
  ctx.font = '600 38px system-ui, sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  const displayName = name.length > 23 ? `${name.slice(0, 22)}…` : name;
  ctx.fillText(displayName, 256, 49, 466);
  texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  labelTextureCache.set(key, texture);
  return texture;
}

const RacerLabel = memo(function RacerLabel({ participant, index, count, progressSource, selected, leader }) {
  const ref = useRef();
  const texture = useMemo(() => getLabelTexture(participant.name, selected, leader), [participant.name, selected, leader]);
  useFrame(({ camera }) => {
    if (!ref.current) return;
    const p = progressSource.current || progressSource;
    ref.current.position.set(laneX(index, count), selected ? 1.48 : 1.10 + (index % 2) * .30, raceZ(p[index] || 0));
    const distance = camera.position.distanceTo(ref.current.position);
    const isPriority = selected || leader;
    const width = Math.max(1.1, Math.min(isPriority ? 3.2 : 2.3, distance * (isPriority ? .15 : .115)));
    ref.current.scale.set(width, width * 96 / 512, 1);
    ref.current.visible = distance < (isPriority ? 130 : 65);
  });
  return <sprite ref={ref} renderOrder={5}><spriteMaterial map={texture} transparent depthWrite={false} depthTest={false} toneMapped={false} /></sprite>;
});

function RacerLabels({ participants, progress, followId, cameraMode }) {
  useEffect(() => () => {
    labelTextureCache.forEach(tex => tex.dispose());
    labelTextureCache.clear();
  }, []);
  const [leader, setLeader] = useState(0);
  const leaderRef = useRef(0);
  useFrame(() => {
    const p = progress.current || progress;
    let nextLeader = 0;
    for (let i = 1; i < p.length; i++) {
      if ((p[i] || 0) > (p[nextLeader] || 0)) nextLeader = i;
    }
    if (nextLeader !== leaderRef.current) {
      leaderRef.current = nextLeader;
      setLeader(nextLeader);
    }
  });

  const selected = participants.findIndex(participant => participant.id === followId);
  const focus = cameraMode === 'follow' && selected >= 0 ? selected : leader;
  const visible = useMemo(() => {
    const set = new Set([leader, ...(selected >= 0 ? [selected] : [])]);
    if (cameraMode !== 'overview') {
      const neighbors = participants.map((_participant, index) => index).sort((a, b) => Math.abs(a - focus) - Math.abs(b - focus));
      for (const index of neighbors) { if (set.size >= 8) break; set.add(index); }
    }
    return [...set].filter(index => participants[index]);
  }, [leader, selected, focus, cameraMode, participants]);

  return <group name="race-labels">{visible.map(index => <RacerLabel key={participants[index].id} participant={participants[index]} index={index} count={participants.length} progressSource={progress} selected={index === selected} leader={index === leader} />)}</group>;
}

export default memo(RacerLabels);
