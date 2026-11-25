import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import fs from 'fs';
import path from 'path';
import { defineConfig } from 'vite';

export default defineConfig(() => {
  return {
    // Relative asset base so dist/ works on both root domains and subpath hosts (e.g. GitHub Pages)
    base: './',
    plugins: [
      react(),
      tailwindcss(),
      // Prevent Vite 8 client WebSocket connection attempts in preview iframes where HMR/WS is disabled
      {
        name: 'disable-vite-client-ws',
        apply: 'serve',
        transform(code, id) {
          if (id.includes('vite/dist/client/client.mjs')) {
            return code.replace('await wsTransport.connect(handlers);', 'return;');
          }
        },
      },
      // Copies src/assets into dist/ so root-relative URLs like
      // "/src/assets/images/..." (e.g. generate_image output) still resolve
      // in production builds. Do not remove.
      {
        name: 'copy-unbundled-src-assets',
        apply: 'build',
        closeBundle(error?: Error): void {
          if (error) {
            return;
          }
          const distDir = path.resolve(__dirname, 'dist');
          const srcAssets = path.resolve(__dirname, 'src/assets');
          const distAssets = path.resolve(distDir, 'src/assets');
          if (fs.existsSync(distDir) && fs.existsSync(srcAssets)) {
            fs.cpSync(srcAssets, distAssets, { recursive: true, force: true });
          }
        },
      },
    ],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      port: 3000,
      host: '0.0.0.0',
      hmr: false,
      ws: false,
      watch: null,
    },
    preview: {
      port: 3000,
      host: '0.0.0.0',
    },
  };
});
