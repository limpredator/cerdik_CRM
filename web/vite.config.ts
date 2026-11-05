import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    port: 5173,
    // Lets the app use the same relative '/api' + '/ws' paths in dev (via
    // this proxy to the server on :4100) and in production (served
    // same-origin by the server itself) — see web/src/lib/api.ts.
    proxy: {
      '/api': 'http://localhost:4100',
      '/ws': { target: 'ws://localhost:4100', ws: true },
    },
  },
});
