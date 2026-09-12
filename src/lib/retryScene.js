import { useEnvironment, useGLTF, useTexture } from "@react-three/drei";
import { assetUrl, skyAssetUrl } from "../scene/assetUrl.js";
import { duckAssetPlan, duckAssetUrls } from "../scene/duckAssets.js";

// Suspense caches rejected promises too. A remount alone cannot retry a failed download.
export function clearFailedSceneLoads(screen, participants, appearances, stage) {
  const urls = duckAssetUrls(duckAssetPlan(screen, participants, appearances));
  if (urls.length) useGLTF.clear(urls);
  useEnvironment.clear({ files: skyAssetUrl(stage) });
  useTexture.clear(
    [
      "rock-color.jpg",
      "rock-normal.jpg",
      "ground-color.jpg",
      "ground-normal.jpg",
      "pine-twig-color.jpg",
      "pine-twig-alpha.jpg",
      "pine-bark-color.jpg",
      "pine-bark-normal.jpg",
    ].map((name) => assetUrl(`/assets/environment/${name}`)),
  );
}
