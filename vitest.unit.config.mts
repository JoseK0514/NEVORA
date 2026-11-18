import {projectConfig} from './vitest.shared.mts';
import { configDefaults, defineConfig } from './vitest.shared.mts';
// Match application/TypeScript module resolution for the default required suite.
export default projectConfig('unit', defineConfig({
  // Capacitor's node:test suites run in native-spike CI, with its own dependencies.
  test: { exclude: [...configDefaults.exclude, 'native/**'] }
}));
