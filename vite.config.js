import { defineConfig } from 'vite';

export default defineConfig({
  // Relative base so a build can be opened from any sub-path (or a file server).
  base: './',
  server: { host: '127.0.0.1', port: 5173 },
  build: { target: 'es2022', assetsInlineLimit: 0 },
});
