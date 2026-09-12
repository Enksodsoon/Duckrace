import { assetUrl } from './assetUrl';

export const BREEDS = ['mallard', 'pekin', 'khaki', 'mandarin', 'runner'];
const aliases = { white: 'pekin', 'white-pekin': 'pekin', 'khaki-campbell': 'khaki', 'indian-runner': 'runner' };
export function breedId(value) { return BREEDS.includes(value) ? value : aliases[value] || 'mallard'; }
export const COSMETICS = ['hat', 'glasses', 'bow', 'medal', 'charm', 'badge'];
export function accessoryId(value) { return value === 'bow-tie' || value === 'bowtie' ? 'bow' : value === 'cap' ? 'hat' : value; }

export function duckAssetPlan(screen, participants, appearances) {
  if (screen === 'stages') return [];
  if (screen !== 'race') return [{ breed: breedId(appearances[0]?.breed), lod: false, cosmetics: false }];
  const lod = participants.length > 24;
  return BREEDS.flatMap(breed => {
    const indexes = participants.flatMap((_participant, index) => breedId(appearances[index]?.breed) === breed ? [index] : []);
    if (!indexes.length) return [];
    return [{ breed, lod, cosmetics: lod && indexes.some(index => COSMETICS.includes(accessoryId(appearances[index]?.accessory))) }];
  });
}

export function duckAssetUrls(plan) {
  return plan.flatMap(({ breed, lod, cosmetics }) => [assetUrl(`/assets/ducks/${breed}${lod ? '-lod' : ''}.glb`), ...(cosmetics ? [assetUrl(`/assets/ducks/${breed}.glb`)] : [])]);
}
