import { defineConfig } from 'vitest/config';
import tsconfigPaths from 'vite-tsconfig-paths';
import path from 'path';
import { readdirSync } from 'fs';
import react from '@vitejs/plugin-react';

import GithubActionsReporter from 'vitest-github-actions-reporter';

const absolutePathAliases: Record<string, string> = {};

// The client src directory does not use relative paths (../../ syntax), so to include any files
// from there, the absolute path must be aliased to the relative path.
export default defineConfig((...args) => {
  const rootPath = '../../client/';

  const srcPath = path.resolve('../../client/src/');
  const srcRootContent = readdirSync(srcPath, { withFileTypes: true }).map(
    (dirent) =>
      dirent.name.replace(/(\.ts){1}(x?)/, '').replace(/\.[^/.]+$/, '')
  );

  srcRootContent.forEach((directory) => {
    absolutePathAliases[directory] = path.join(srcPath, directory);
  });

  delete absolutePathAliases.index;

  console.log('absolutePathAliases', absolutePathAliases);

  const config = {
    plugins: [
      tsconfigPaths({
        projects: [rootPath + 'tsconfig.vitest.json'],
      }),
      react(),
    ],
    resolve: {
      alias: {
        src: path.resolve('../client/src/'),
        ...absolutePathAliases,
      },
    },
    test: {
      environment: 'happy-dom',
      setupFiles: ['setup.ts'],
      reporters: process.env.GITHUB_ACTIONS
        ? new GithubActionsReporter()
        : 'default',
    },
    directory: 'test',
    root: '.',
  };
  return config as any;
});
