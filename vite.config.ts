import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { sites } from '@openai/sites-vite-plugin';
import tailwindcss from '@tailwindcss/postcss';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

const rootDir = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  // Relative assets work on a custom domain, Sites, and /repo/ GitHub Pages URLs.
  base: './',
  css: { postcss: { plugins: [tailwindcss()] } },
  resolve: { alias: { '@': rootDir } },
  plugins: [react(), sites()],
  build: { outDir: 'dist/client' },
});
