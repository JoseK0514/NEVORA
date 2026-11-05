import { configDefaults, defineConfig } from 'vitest/config';
import { fileURLToPath } from 'node:url';
// Match application/TypeScript module resolution for the default required suite.
export default defineConfig({
  // Capacitor's node:test suites run in native-spike CI, with its own dependencies.
  test: { exclude: [...configDefaults.exclude, 'native/**'] },
  resolve: { alias: { '@': fileURLToPath(new URL('./src', import.meta.url)), 'server-only': fileURLToPath(new URL('./node_modules/next/dist/compiled/server-only/empty.js', import.meta.url)) } }
});
