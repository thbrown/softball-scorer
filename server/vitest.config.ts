import { defineConfig } from 'vitest/config';
import tsconfigPaths from 'vite-tsconfig-paths';
import path from 'path';
import GithubActionsReporter from 'vitest-github-actions-reporter';

const absolutePathAliases: Record<string, string> = {};

export default defineConfig((...args) => {
  const rootPath = './';

  const config = {
    plugins: [
      tsconfigPaths({
        projects: [rootPath + 'tsconfig.vitest.json'],
      }),
    ],
    resolve: {
      alias: {
        src: path.resolve('src/'),
        ...absolutePathAliases,
      },
    },
    test: {
      setupFiles: ['test/setup.ts'],
      reporters: process.env.GITHUB_ACTIONS
        ? new GithubActionsReporter()
        : 'default',
      coverage: {
        provider: 'c8',
        reporter: ['text-summary', 'lcov'],
        exclude: ['test/*', 'res/*', 'integration-tests/*'],
      },
      exclude: ['**/node_modules/**', '**/integration-tests/**'],
    },
    directory: 'test',
    root: '.',
  };
  return config as any;
});
