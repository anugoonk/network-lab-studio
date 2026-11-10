
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  // GitHub Pages serves the app from /network-lab-studio/ — the workflow sets VITE_BASE; locally it stays "/"
  base: process.env.VITE_BASE ?? '/',
  plugins: [react()],
  server: { port: 5173 },
  test: { include: ['tests/**/*.test.ts'], environment: 'node' },
});
