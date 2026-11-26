import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import fs from 'fs';
import path from 'path';
import { defineConfig } from 'vite';
import { resolveSiteTarget, SITE_URL } from './site.config.ts';

export default defineConfig(({ command }) => {
  const isBuild = command === 'build';
  const target = resolveSiteTarget(process.env.SITE_URL || SITE_URL);

  return {
    // Serve at root "/" in local dev preview; build for the configured path in production
    base: isBuild ? target.basePath : '/',
    build: {
      outDir: target.outDir,
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
      // Inject canonical and og:url metadata derived from site.config.ts during build
      {
        name: 'inject-site-url-meta',
        apply: 'build',
        transformIndexHtml() {
          return [
            {
              tag: 'link',
              attrs: { rel: 'canonical', href: target.canonicalUrl },
              injectTo: 'head',
            },
            {
              tag: 'meta',
              attrs: { property: 'og:url', content: target.canonicalUrl },
              injectTo: 'head',
            },
          ];
        },
      },
      // Clean top-level dist/ before build, copy unbundled assets if any, and emit root redirect when hosted under a subpath
      {
        name: 'subpath-static-bundle',
        apply: 'build',
        buildStart(): void {
          const distRoot = path.resolve(process.cwd(), 'dist');
          if (fs.existsSync(distRoot)) {
            fs.rmSync(distRoot, { recursive: true, force: true });
          }
        },
        closeBundle(error?: Error): void {
          if (error) {
            return;
          }
          const distRoot = path.resolve(process.cwd(), 'dist');
          const outAbs = path.resolve(process.cwd(), target.outDir);
          const srcAssets = path.resolve(process.cwd(), 'src/assets');
          const distAssets = path.resolve(outAbs, 'src/assets');
          if (fs.existsSync(outAbs) && fs.existsSync(srcAssets)) {
            fs.cpSync(srcAssets, distAssets, { recursive: true, force: true });
          }

          // When deploying under a subpath (e.g., /climateGuessr/), emit a root redirect so "/" forwards cleanly
          if (target.subpathDir) {
            fs.mkdirSync(distRoot, { recursive: true });
            const nojekyllSrc = path.resolve(process.cwd(), 'public/.nojekyll');
            const nojekyllDst = path.resolve(distRoot, '.nojekyll');
            if (fs.existsSync(nojekyllSrc) && !fs.existsSync(nojekyllDst)) {
              fs.copyFileSync(nojekyllSrc, nojekyllDst);
            }

            const rootRedirectHtml = `<!doctype html>
<html lang="ja">
  <head>
    <meta charset="UTF-8" />
    <meta http-equiv="refresh" content="0; url=${target.basePath}" />
    <link rel="canonical" href="${target.canonicalUrl}" />
    <title>Köppen Guessr</title>
  </head>
  <body>
    <script>window.location.replace('${target.basePath}');</script>
  </body>
</html>
`;
            fs.writeFileSync(path.join(distRoot, 'index.html'), rootRedirectHtml, 'utf8');
          }
        },
      },
    ],
    resolve: {
      alias: {
        '@': path.resolve(process.cwd(), '.'),
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
