export function releaseAssetUrl(path, version, production) {
  if (!path.startsWith('/assets/')) throw new Error('Scene assets must use an absolute /assets/ path.');
  return production ? `/assets/releases/${encodeURIComponent(version)}/${path.slice('/assets/'.length)}` : path;
}

export function assetUrl(path) {
  const version = typeof __ASSET_VERSION__ === 'undefined' ? 'development' : __ASSET_VERSION__;
  return releaseAssetUrl(path, version, import.meta.env.PROD);
}
