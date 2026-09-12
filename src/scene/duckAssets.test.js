import { describe, expect, it } from 'vitest';
import { duckAssetPlan, duckAssetUrls } from './duckAssets';
import { releaseAssetUrl } from './assetUrl';

const entrants = count => Array.from({ length: count }, (_, index) => ({ id: `entrant-${index}` }));

describe('scene asset requests', () => {
  it('loads only the selected full hero and no duck on stage selection', () => {
    expect(duckAssetUrls(duckAssetPlan('home', entrants(100), [{ breed: 'mandarin' }]))).toEqual(['/assets/ducks/mandarin.glb']);
    expect(duckAssetPlan('stages', entrants(100), [])).toEqual([]);
  });
  it('loads only participating full breeds for small races, with their embedded cosmetics', () => {
    expect(duckAssetUrls(duckAssetPlan('race', entrants(3), [{ breed: 'mallard', accessory: 'hat' }, { breed: 'pekin' }, { breed: 'mallard' }]))).toEqual(['/assets/ducks/mallard.glb', '/assets/ducks/pekin.glb']);
  });
  it('loads only LOD bodies for a plain crowd and adds full assets only for breeds with selected cosmetics', () => {
    const appearances = Array.from({ length: 100 }, (_, i) => ({ breed: i % 2 ? 'pekin' : 'mallard', accessory: 'none' }));
    expect(duckAssetUrls(duckAssetPlan('race', entrants(100), appearances))).toEqual(['/assets/ducks/mallard-lod.glb', '/assets/ducks/pekin-lod.glb']);
    appearances[3].accessory = 'bow-tie';
    expect(duckAssetUrls(duckAssetPlan('race', entrants(100), appearances))).toEqual(['/assets/ducks/mallard-lod.glb', '/assets/ducks/pekin-lod.glb', '/assets/ducks/pekin.glb']);
  });
  it('uses physical release paths in production while development keeps ordinary asset URLs', () => {
    expect(releaseAssetUrl('/assets/ducks/mallard.glb', 'abc123', true)).toBe('/assets/releases/abc123/ducks/mallard.glb');
    expect(releaseAssetUrl('/assets/environment/rock-color.jpg', 'abc123', false)).toBe('/assets/environment/rock-color.jpg');
    expect(() => releaseAssetUrl('https://example.org/model.glb', 'abc', true)).toThrow();
  });
});
