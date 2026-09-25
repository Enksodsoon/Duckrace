import { readdir, readFile, writeFile, mkdir, rename, rm, cp } from "node:fs/promises";
import { createHash } from "node:crypto";
import { assetVersion } from "./asset-version.mjs";
const version = assetVersion();
await rm(`dist/assets/releases/${version}`, { recursive: true, force: true });
await mkdir(`dist/assets/releases/${version}`, { recursive: true });
for (const item of await readdir("public/assets", { withFileTypes: true })) {
  const src = `dist/assets/${item.name}`;
  const dest = `dist/assets/releases/${version}/${item.name}`;
  try {
    await rename(src, dest);
  } catch (err) {
    if (err.code === "EPERM" || err.code === "EXDEV") {
      await cp(src, dest, { recursive: true });
      await rm(src, { recursive: true, force: true });
    } else {
      throw err;
    }
  }
}
const files = (await readdir("dist/assets")).filter((x) => /\.(js|css)$/.test(x));
const hash = createHash("sha256")
  .update(await readFile("dist/index.html"))
  .digest("hex")
  .slice(0, 12);
const source = await readFile("public/sw.js", "utf8");
await writeFile(
  "dist/sw.js",
  source
    .replace("'duck-race-v1'", `'duck-race-${hash}'`)
    .replace(
      "['/', '/index.html', '/manifest.webmanifest', '/icon.svg']",
      JSON.stringify([
        "/",
        "/index.html",
        "/manifest.webmanifest",
        "/icon.svg",
        ...files.map((x) => `/assets/${x}`),
      ]),
    ),
);
await writeFile(
  "dist/release.json",
  JSON.stringify({
    assets: version,
    shell: hash,
    commit: process.env.VERCEL_GIT_COMMIT_SHA || process.env.GITHUB_SHA || "local",
  }),
);
await writeFile(
  "dist/asset-credits.txt",
  (await readFile("docs/asset-rights.md", "utf8")) +
    "\n\n" +
    (await readFile("docs/environment-assets.md", "utf8")),
);
