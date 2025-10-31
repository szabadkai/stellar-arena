import { defineConfig } from 'vite';

export default defineConfig({
  root: 'web',
  base: '/stellar-arena/',
  build: {
    outDir: '../docs',
    emptyOutDir: true,
    rollupOptions: {
      output: {
        manualChunks: undefined
      }
    }
  },
  server: {
    port: 3000,
    open: true
  }
});
