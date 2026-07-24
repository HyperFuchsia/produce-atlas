import { defineConfig } from 'vite';

export default defineConfig({
  base: './',
  build: {
    target: 'es2019',
    outDir: 'dist',
    assetsInlineLimit: 8192,
    sourcemap: false,
  },
  server: {
    host: true,
    port: 5173,
  },
});
