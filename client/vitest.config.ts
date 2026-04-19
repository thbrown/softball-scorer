import { defineConfig } from 'vitest/config';
import path from 'path';
import { readdirSync } from 'fs';
import react from '@vitejs/plugin-react';

import GithubActionsReporter from 'vitest-github-actions-reporter';

const absolutePathAliases: Record<string, string> = {};

export default defineConfig((...args) => {
  const rootPath = './';

  const srcPath = path.resolve('./src/');
  const srcRootContent = readdirSync(srcPath, { withFileTypes: true }).map(
    (dirent) => dirent.name.replace(/(\.ts){1}(x?)/, '')
  );

  srcRootContent.forEach((directory) => {
    absolutePathAliases[directory] = path.join(srcPath, directory);
  });

  const config = {
    plugins: [
      react(),
    ],
    resolve: {
      alias: {
        src: path.resolve('src/'),
        ...absolutePathAliases,
      },
    },
    test: {
      environment: 'happy-dom',
      setupFiles: ['test/setup.ts'],
      reporters: process.env.GITHUB_ACTIONS
        ? new GithubActionsReporter()
        : 'default',
      coverage: {
        provider: 'v8',
        reporter: ['text-summary', 'lcov'],
        exclude: ['test/*', 'res/*'],
      },
    },
    directory: 'test',
    root: '.',
  };
  return config as any;
});
