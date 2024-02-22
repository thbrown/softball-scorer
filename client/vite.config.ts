import { defineConfig } from 'vite';
import tsconfigPaths from 'vite-tsconfig-paths';
import react from '@vitejs/plugin-react';
import { nodePolyfills } from 'vite-plugin-node-polyfills';
import copy from 'rollup-plugin-copy';

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
    publicDir: '../../assets',
    build: {
      outDir: '../../build', // specified from the root.  This must be a relative path for some reason *shrug*
      assetsDir: './',
      cssCodeSplit: false,
      copyPublicDir: false,
      sourcemap: 'true',
      rollupOptions: {
        plugins: [
          copy({
            // the root of the copy plugin is not the 'index.html'
            // it's where this vite.config.ts file is (I assume because this is
            // rollup specifically and not vite)
            targets: [{ src: '../assets/*', dest: '../build/assets' }],
            hook: 'writeBundle',
          }),
        ],
      },
    },
    server: {
      port: '8889',
      host: '0.0.0.0',
      // open: '/',
      proxy: {
        '^/menu/.*': srvUrl,
        '^/server/sync': srvUrl,
        '^/server/.*': srvUrl,
        '^/web-workers/.*': srvUrl,
        '^/service-worker.js': srvUrl + '/service-worker',
        '^/favicon.ico': srvUrl,
        '^/robots.txt': srvUrl + '/assets/robots.txt',
        '^/manifest.json': srvUrl + '/assets/manifest.json',
        '^/assets/*': srvUrl,
      },
    },
  };
  return config;
});
