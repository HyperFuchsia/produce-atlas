import { defineConfig } from "vite";

// Static single-page build. `base: "./"` keeps asset URLs relative so the
// bundle works when served from a subpath (e.g. GitHub Pages project sites).
export default defineConfig({
  base: "./",
  build: {
    target: "es2022",
    outDir: "dist",
    assetsInlineLimit: 0,
  },
});
