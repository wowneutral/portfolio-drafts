import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import path from 'node:path';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: { alias: { '@': path.resolve(import.meta.dirname, 'src') } },
  // SKEP_NO_HMR is set by test/serve.sh: the test server never pushes reloads, so a screenshot is never interrupted by someone else saving a file.
  server: { port: 5180, open: false, hmr: process.env.SKEP_NO_HMR ? false : undefined, watch: { ignored: ['**/og/**', '**/test-shots/**'] } },
  // og/ is version 1, a separate project with its own build (see publish.sh); keep the dev server out of it.
  optimizeDeps: { entries: ['index.html'] },
  build: { target: 'es2022', chunkSizeWarningLimit: 1600 },
});
