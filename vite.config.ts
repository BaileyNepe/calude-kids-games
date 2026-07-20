/// <reference types="vitest" />
import { defineConfig } from 'vitest/config';

export default defineConfig({
  server: {
    // Listen on all interfaces so the game can be opened on a tablet
    // on the same network for real touch testing.
    host: true,
    // Not Vite's default 5173: the poptag project next door already binds
    // that port on IPv6 localhost, and the two servers can coexist at the
    // OS level while `localhost` silently resolves to the wrong one.
    port: 5180,
    strictPort: true,
  },
  build: {
    // Phaser is large; this keeps the build log quiet about it.
    chunkSizeWarningLimit: 1500,
  },
  test: {
    // Shared logic (maths, pets, save) is plain TypeScript and runs
    // without a DOM. Scenes are not unit tested.
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
});
