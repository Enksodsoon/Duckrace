/* eslint-disable react/no-unknown-property */
import { useEffect, useLayoutEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { laneX, raceZ } from './Ducks';

function RacerLabel({ participant, index, count, progress, selected, leader }) {
  const ref = useRef(), value = useRef(progress);
  useLayoutEffect(() => { value.current = progress; }, [progress]);
  const texture = useMemo(() => {
    const canvas = document.createElement('canvas'); canvas.width = 512; canvas.height = 96;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = selected ? 'rgba(12,56,51,.92)' : 'rgba(19,30,29,.82)';
    ctx.beginPath(); ctx.roundRect(4, 4, 504, 88, 24); ctx.fill();
    ctx.strokeStyle = selected ? '#96e5cf' : leader ? '#f2d57f' : '#c6d5ce'; ctx.lineWidth = selected ? 4 : 2; ctx.stroke();
    ctx.fillStyle = selected ? '#b8f4e1' : leader ? '#f2d57f' : '#edf4f0';
    ctx.font = '600 38px system-ui, sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    const name = participant.name.length > 23 ? `${participant.name.slice(0, 22)}…` : participant.name;
    ctx.fillText(name, 256, 49, 466);
    const result = new THREE.CanvasTexture(canvas); result.colorSpace = THREE.SRGBColorSpace; return result;
  }, [participant.name, selected, leader]);
  useEffect(() => () => texture.dispose(), [texture]);
  useFrame(({ camera }) => {
    ref.current.position.set(laneX(index, count), selected ? 1.48 : 1.10 + (index % 2) * .30, raceZ(value.current));
    const distance = camera.position.distanceTo(ref.current.position);
    const width = Math.max(1.1, Math.min(selected ? 3.2 : 2.3, distance * (selected ? .15 : .115)));
    ref.current.scale.set(width, width * 96 / 512, 1);
    ref.current.visible = distance < (selected ? 130 : 65);
  });
  return <sprite ref={ref} renderOrder={5}><spriteMaterial map={texture} transparent depthWrite={false} depthTest={false} toneMapped={false} /></sprite>;
}

export default function RacerLabels({ participants, progress, followId, cameraMode }) {
  let leader = 0;
  progress.forEach((value, index) => { if (value > (progress[leader] || 0)) leader = index; });
  const selected = participants.findIndex(participant => participant.id === followId);
  const focus = cameraMode === 'follow' && selected >= 0 ? selected : leader;
  const visible = new Set([leader, ...(selected >= 0 ? [selected] : [])]);
  if (cameraMode !== 'overview') {
    const neighbors = participants.map((_participant, index) => index).sort((a, b) => Math.abs(a - focus) - Math.abs(b - focus));
    for (const index of neighbors) { if (visible.size >= 8) break; visible.add(index); }
  }
  return <group name="race-labels">{[...visible].filter(index => participants[index]).map(index => <RacerLabel key={participants[index].id} participant={participants[index]} index={index} count={participants.length} progress={progress[index]} selected={index === selected} leader={index === leader} />)}</group>;
}
