import {defineConfig} from 'vitest/config';
import {fileURLToPath} from 'node:url';
import {nativeRegressionTarget} from './src/test/integration/native-push-fixture-url';
const resolution = {alias: {'@': fileURLToPath(new URL('./src', import.meta.url)), 'server-only': fileURLToPath(new URL('./node_modules/next/dist/compiled/server-only/empty.js', import.meta.url))}};
const groups = [
  {name: 'native-foundation', prefix: 'nevora_foundation_test_' as const, include: [
    'src/test/integration/native-push.integration.ts', 'src/test/integration/foundation.integration.ts',
    'src/test/integration/phase-b-management-session.integration.ts', 'src/test/integration/phase-b-late-write-session.integration.ts',
  ]},
  {name: 'existing-web-push', prefix: 'fuel_phase3_test_' as const, include: ['src/test/integration/notifications.integration.ts']},
];
export default defineConfig({test: {fileParallelism: false, maxWorkers: 1, passWithNoTests: false, projects: groups.map(group => ({
  extends: false as const, resolve: resolution, test: {name: group.name, include: group.include, fileParallelism: false, maxWorkers: 1,
    testTimeout: 15000, hookTimeout: 30000, env: process.env.FUEL_TEST_DATABASE_URL ? {FUEL_TEST_DATABASE_URL: nativeRegressionTarget(process.env.FUEL_TEST_DATABASE_URL, group.prefix)} : {}},
}))}});
