import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { createHash } from "node:crypto";

// Content identity, shared by the bundler and the release-packaging step.
export function assetVersion() {
  const hash = createHash("sha256");
  function visit(path) {
    for (const item of readdirSync(path, { withFileTypes: true }).sort((a, b) =>
      a.name.localeCompare(b.name),
    )) {
      const file = join(path, item.name);
      if (item.isDirectory()) visit(file);
      else {
        hash.update(file.replaceAll("\\", "/"));
        hash.update(readFileSync(file));
      }
    }
  }
  visit("public/assets");
  return hash.digest("hex").slice(0, 16);
}
