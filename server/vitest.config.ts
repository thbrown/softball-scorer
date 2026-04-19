import { defineConfig } from 'vitest/config';
import path from 'path';
import GithubActionsReporter from 'vitest-github-actions-reporter';

const absolutePathAliases: Record<string, string> = {};

export default defineConfig((...args) => {
  const config = {
    resolve: {
      tsconfigPaths: true,
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
        provider: 'v8',
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
