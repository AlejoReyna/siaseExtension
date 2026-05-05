import { crx } from '@crxjs/vite-plugin';
import react from '@vitejs/plugin-react';
import { resolve } from 'node:path';
import { defineConfig } from 'vite';
import manifest from './manifest.json';

export default defineConfig({
  plugins: [react(), crx({ manifest })],
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
    },
  },
  build: { sourcemap: false, emptyOutDir: true, rollupOptions: { input: { popup: 'src/popup/popup.html' } } },
  test: { environment: 'jsdom', globals: true, include: ['src/tests/**/*.test.ts'] },
});
