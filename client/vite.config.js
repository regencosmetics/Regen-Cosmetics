import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'node:path';

export default defineConfig({
  plugins: [react()],
  resolve: { alias: { '@': path.resolve(import.meta.dirname, 'src') } },
  server: { port: 5173, proxy: { '/api': { target: process.env.VITE_PROXY_TARGET || 'http://localhost:5000', changeOrigin: true }, '/sitemap.xml': 'http://localhost:5000', '/health': 'http://localhost:5000' } },
  build: {
    target: 'es2020', sourcemap: false,
    rollupOptions: { output: { manualChunks: { react: ['react', 'react-dom', 'react-router-dom'], motion: ['framer-motion'], state: ['@reduxjs/toolkit', 'react-redux'] } } },
  },
  test: { environment: 'jsdom', globals: true, setupFiles: ['./src/test/setup.js'], css: false, exclude: ['e2e/**', 'node_modules/**'] },
});
