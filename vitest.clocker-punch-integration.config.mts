import { defineConfig } from 'vitest/config';
import clocker from './vitest.clocker-integration.config.mts';
export default defineConfig({ ...clocker, test: { ...clocker.test,
 include:['src/test/integration/clocker-punch*.integration.ts'],
} });
