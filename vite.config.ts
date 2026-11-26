import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import fs from 'fs';
import path from 'path';
import { defineConfig } from 'vite';

const APP_BASE_PATH = '/climateGuessr/';
const SUBPATH_DIR = 'climateGuessr';

export default defineConfig(({ command }) => {
  const isBuild = command === 'build';

  return {
    // Serve at root "/" in local dev preview; build for "/climateGuessr/" subpath in production
    base: isBuild ? APP_BASE_PATH : '/',
    build: {
      outDir: `dist/${SUBPATH_DIR}`,
      emptyOutDir: true,
    },
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
      // Clean top-level dist/ before build, copy unbundled assets if any, and emit root redirect to /climateGuessr/
      {
        name: 'subpath-static-bundle',
        apply: 'build',
        buildStart(): void {
          const distRoot = path.resolve(import.meta.dirname, 'dist');
          if (fs.existsSync(distRoot)) {
            fs.rmSync(distRoot, { recursive: true, force: true });
          }
        },
        closeBundle(error?: Error): void {
          if (error) {
            return;
          }
          const distRoot = path.resolve(import.meta.dirname, 'dist');
          const subDir = path.resolve(distRoot, SUBPATH_DIR);
          const srcAssets = path.resolve(import.meta.dirname, 'src/assets');
          const distAssets = path.resolve(subDir, 'src/assets');
          if (fs.existsSync(subDir) && fs.existsSync(srcAssets)) {
            fs.cpSync(srcAssets, distAssets, { recursive: true, force: true });
          }

          // Redirect root "/" to "/climateGuessr/" so both root preview URLs and app.toribird.xyz/climateGuessr work cleanly
          const rootRedirectHtml = `<!doctype html>
<html lang="ja">
  <head>
    <meta charset="UTF-8" />
    <meta http-equiv="refresh" content="0; url=${APP_BASE_PATH}" />
    <link rel="canonical" href="${APP_BASE_PATH}" />
    <title>Köppen Guessr</title>
  </head>
  <body>
    <script>window.location.replace('${APP_BASE_PATH}');</script>
  </body>
</html>
`;
          fs.writeFileSync(path.join(distRoot, 'index.html'), rootRedirectHtml, 'utf8');
        },
      },
    ],
    resolve: {
      alias: {
        '@': path.resolve(import.meta.dirname, '.'),
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
