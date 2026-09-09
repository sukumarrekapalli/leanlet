import path from 'node:path';
import { fileURLToPath } from 'node:url';
import tailwindcss from '@tailwindcss/postcss';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

const rootDir = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  // Relative assets work on a custom domain and /repo/ GitHub Pages URLs.
  base: './',
  css: { postcss: { plugins: [tailwindcss()] } },
  resolve: {
    alias: {
      '@': rootDir,
      'leanlet-ai': path.join(rootDir, 'packages/leanlet/dist/index.js'),
    },
  },
  plugins: [react()],
  build: {
    outDir: 'dist/client',
    rolldownOptions: {
      input: {
        main: path.join(rootDir, 'index.html'),
        docs: path.join(rootDir, 'docs/index.html'),
      },
    },
  },
});
