import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";
export default defineConfig({
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
      "server-only": fileURLToPath(
        new URL(
          "./node_modules/next/dist/compiled/server-only/empty.js",
          import.meta.url,
        ),
      ),
    },
  },
  test: {
    include: ["src/test/integration/owner-advisor-browser.integration.ts", "src/test/integration/owner-advisor-notebook-browser.integration.ts", "src/test/integration/owner-advisor-coverage-plan-browser.integration.ts", "src/test/integration/owner-advisor-coverage-actions-browser.integration.ts"],
    fileParallelism: false,
    maxWorkers: 2,
    testTimeout: 240000,
    hookTimeout: 30000,
  },
});
