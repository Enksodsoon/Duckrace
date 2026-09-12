import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { assetVersion } from "./scripts/asset-version.mjs";

export default defineConfig({
  plugins: [react()],
  define: { __ASSET_VERSION__: JSON.stringify(assetVersion()) },
  test: { environment: "jsdom", globals: true, include: ["src/**/*.test.js"] },
  build: {
    chunkSizeWarningLimit: 800,
    rolldownOptions: {
      output: {
        codeSplitting: {
          groups: [
            {
              name: "react-vendor",
              test: /node_modules[\\/](react|react-dom)[\\/]/,
              priority: 3,
            },
            {
              name: "three-vendor",
              test: /node_modules[\\/](@react-three|three|troika-three-text|maath|camera-controls)[\\/]/,
              priority: 2,
              maxSize: 420 * 1024,
            },
            {
              name: "vendor",
              test: /node_modules[\\/]/,
              priority: 1,
              maxSize: 260 * 1024,
            },
          ],
        },
      },
    },
  },
});
