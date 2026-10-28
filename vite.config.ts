import { defineConfig } from 'vite';

export default defineConfig({
  server: { host: true, port: 5173 },
  build: { target: 'es2022', chunkSizeWarningLimit: 6000 },
  // pre-bundle everything up front so the dev server never re-optimizes mid-session
  optimizeDeps: {
    include: ['three', '@dimforge/rapier3d-compat', 'three/examples/jsm/environments/RoomEnvironment.js', 'three/examples/jsm/utils/BufferGeometryUtils.js'],
  },
});
