import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// The React dev server runs on port 5173 and forwards every /api request
// to the Express backend on port 4000, so the frontend and backend stay
// as two separate projects (as taught in Week 4).
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:4000',
        changeOrigin: true,
      },
    },
  },
});
