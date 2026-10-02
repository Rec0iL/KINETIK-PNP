import { defineConfig } from 'vitest/config';
import { svelte } from '@sveltejs/vite-plugin-svelte';
import { fileURLToPath } from 'node:url';

const dataDir = fileURLToPath(new URL('../../data', import.meta.url));

// base './' macht die App unter jedem Unterpfad lauffähig (github.io/<repo>/).
export default defineConfig({
  base: './',
  plugins: [svelte()],
  resolve: { alias: { '@data': dataDir } },
  server: { fs: { allow: ['../..'] } },
  build: { target: 'es2022', chunkSizeWarningLimit: 900 },
  test: { include: ['tests/**/*.test.ts'], environment: 'node' },
});
