import { defineConfig } from "vite";
import { viteSingleFile } from "vite-plugin-singlefile";

// Produces a single, fully self-contained index.html (all JS, CSS, and map
// data inlined) with no external requests — suitable for embedding as an
// Artifact or opening directly from the filesystem.
export default defineConfig({
  base: "./",
  plugins: [viteSingleFile()],
  build: {
    target: "es2022",
    outDir: "dist-artifact",
    assetsInlineLimit: 100_000_000,
    cssCodeSplit: false,
  },
});
