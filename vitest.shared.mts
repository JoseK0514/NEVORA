import type { RstestConfig } from '@rstest/core';
import { pluginReact } from '@rsbuild/plugin-react';
import { fileURLToPath } from 'node:url';

type ProjectSelection = Omit<RstestConfig, 'projects' | 'pool' | 'tools'> & {
  projects?: ProjectInput[];
  fileParallelism?: boolean;
  maxWorkers?: number;
};

type ProjectInput = {
  test?: ProjectSelection;
  resolve?: RstestConfig['resolve'];
  extends?: false;
};

export const configDefaults = { exclude: ['**/node_modules/**', '**/.git/**'] };

export const vitestResolution = {
  alias: {
    '@': fileURLToPath(new URL('./src', import.meta.url)),
    'server-only': fileURLToPath(new URL('./node_modules/next/dist/compiled/server-only/empty.js', import.meta.url)),
  },
};

export function defineConfig<T extends ProjectInput>(config: T): T {
  return config;
}

export function projectConfig(projectName: string, input: ProjectInput): RstestConfig {
  const { projects, fileParallelism, maxWorkers, ...options } = input.test ?? {};
  return {
    ...options,
    name: options.name ?? projectName,
    include: options.include ?? ['**/*.{test,spec}.?(c|m)[jt]s?(x)'],
    exclude: options.exclude ?? configDefaults.exclude,
    resolve: input.resolve ?? vitestResolution,
    ...(process.env.NEVORA_RSTEST_REPORT_FILE ? {
      reporters: ['default', ['json', { outputPath: process.env.NEVORA_RSTEST_REPORT_FILE }]],
    } : {}),
    pool: { type: 'forks', maxWorkers: fileParallelism === false ? 1 : maxWorkers },
    plugins: [pluginReact()],
    tools: {
      rspack(config) {
        config.resolve ??= {};
        config.resolve.extensionAlias = {
          ...config.resolve.extensionAlias,
          '.mjs': ['.mts', '.mjs'],
        };
      },
    },
    ...(projects ? { projects: projects.map(p => projectConfig(projectName, p)) } : {}),
  };
}
