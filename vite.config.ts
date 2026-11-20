import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// SITE_BASE sets the folder the site is served from: "/Dawnspire/" on GitHub Pages, "/" on dawnspire.cc.
export default defineConfig({ base: process.env.SITE_BASE ?? '/', plugins: [react()] });
