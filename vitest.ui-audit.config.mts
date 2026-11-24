import {defineConfig, projectConfig} from './vitest.shared.mts';

// The UI audit (tools/ui-audit/README.md). Started by `npm run ui:audit`, never by the unit suite.
export default projectConfig('ui-audit', defineConfig({test: {include: ['tools/ui-audit/driver.integration.mts'], fileParallelism: false, testTimeout: 24 * 3600 * 1000, hookTimeout: 120000, passWithNoTests: false}}));
