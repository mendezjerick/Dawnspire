import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath } from 'node:url';

// Base shares the public site's static files (fonts, brand, images) and imports its
// components for live previews. API calls go to the Base server.
export default defineConfig({
  plugins: [react()],
  publicDir: fileURLToPath(new URL('../public', import.meta.url)),
  resolve: { alias: { '@site': fileURLToPath(new URL('../src', import.meta.url)) } },
  server: {
    port: 5174,
    strictPort: true,
    proxy: { '/api': 'http://127.0.0.1:5175', '/uploads': 'http://127.0.0.1:5175' },
    fs: { allow: ['..'] },
  },
});
