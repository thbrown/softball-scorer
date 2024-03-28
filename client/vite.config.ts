import { defineConfig } from 'vite';
import tsconfigPaths from 'vite-tsconfig-paths';
import react from '@vitejs/plugin-react';
import { nodePolyfills } from 'vite-plugin-node-polyfills';
import copy from 'rollup-plugin-copy';
import { VitePWA } from 'vite-plugin-pwa';

function CustomHmr() {
  return {
    name: 'custom-hmr',
    enforce: 'post',
    // HMR
    handleHotUpdate({ file, server }) {
      if (file.endsWith('.json')) {
        console.log('reloading json file...');

        server.ws.send({
          type: 'full-reload',
          path: '*',
        });
      }
    },
  };
}

const srvUrl = 'http://localhost:8888';

// @ts-ignore
export default defineConfig((...args) => {
  // for this config, the "root" is where the index.html file is, so 'client/src/index.html'
  const config = {
    plugins: [
      react(),
      tsconfigPaths({
        // specified from the root
        projects: ['../tsconfig.vite.json'],
      }),
      CustomHmr(),
      nodePolyfills({
        include: ['buffer', 'crypto', 'stream', 'util'],
        globals: {
          Buffer: true,
        },
        protocolImports: true,
      }),
    ],
    root: '.', // specified from the root.
    base: '/',
    publicDir: '../public',
    build: {
      outDir: '../../build', // specified from the root.  This must be a relative path for some reason *shrug*
      assetsDir: './',
      cssCodeSplit: false,
      copyPublicDir: true, // This was done by the copy plugin instead, why?
      sourcemap: 'true',
      rollupOptions: {
        plugins: [
          copy({
            // the root of the copy plugin is not the 'index.html'
            // it's where this vite.config.ts file is (I assume because this is
            // rollup specifically and not vite)
            targets: [{ src: './assets/*', dest: '../build/assets' }],
            hook: 'writeBundle',
          }),
          VitePWA({
            filename: 'service-worker.js',
            workbox: {
              globPatterns: [
                '**/*.{js,css,html,txt,png,ico,svg,gif,woff,woff2}',
              ],
              // Idk why but these get duplicated in the cache unless we ignore them here
              globIgnores: [
                'assets/icons/logo192.png',
                'assets/icons/logo512.png',
              ],
              runtimeCaching: [
                {
                  urlPattern: /\/index.html$/,
                  handler: 'NetworkFirst',
                  options: {
                    cacheName: 'my-cache-index',
                  },
                },
              ],
              // dontCacheBustURLsMatching applies to all files selected by globPatterns by default, we need index.html to have a revision
              // if it doesn't, when the app is updated the cached index.html will point to a js file that no longer exists
              dontCacheBustURLsMatching: undefined,
              sourcemap: false,
              navigateFallback: '/index.html',
              skipWaiting: true,
              //mode: 'develop', // For debuging
            },
            injectRegister: null, // Injected manually in main-container.jsx
            manifest: {
              name: 'Softball App',
              short_name: 'Softball App',
              description:
                'Optimize your softball, baseball or kickball lineups using historical hitting data',
              theme_color: '#087f23',
              start_url: '/?source=applaunch',
              scope: '/',
              display: 'standalone',
              icons: [
                {
                  src: '/assets/icons/logo192.png',
                  sizes: '192x192',
                  type: 'image/png',
                },
                {
                  src: '/assets/icons/logo512.png',
                  sizes: '512x512',
                  type: 'image/png',
                },
                {
                  src: '/assets/icons/logo512.png',
                  sizes: '512x512',
                  type: 'image/png',
                  purpose: 'any',
                },
                {
                  src: '/assets/icons/logo512.png',
                  sizes: '512x512',
                  type: 'image/png',
                  purpose: 'maskable',
                },
              ],
            },
          }),
        ],
      },
    },
    server: {
      port: '8889',
      host: '0.0.0.0',
      // open: '/',
      proxy: {
        '^/server/.*': srvUrl,
        '^/web-workers/.*': srvUrl,
      },
    },
  };
  return config;
});
