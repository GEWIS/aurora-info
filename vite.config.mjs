import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react-swc';

// In dev, the aurora-info server (src/server, on :3001) serves /api; vite proxies it
// so the browser only ever talks to one origin.
export default defineConfig({
  base: '/',
  plugins: [react()],
  server: {
    host: '0.0.0.0',
    port: 8082,
    proxy: {
      '/api': { target: 'http://localhost:3001', changeOrigin: true },
    },
  },
  build: {
    outDir: 'dist/client',
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules')) {
            // Last segment: under pnpm the first one is always `.pnpm`, a dotfile static servers skip.
            return id.split('node_modules/').pop().split('/')[0];
          }
        },
      },
    },
    chunkSizeWarningLimit: 750,
  },
  publicDir: './public',
  test: {
    environment: 'node',
  },
});
