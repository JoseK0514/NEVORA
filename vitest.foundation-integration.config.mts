import {projectConfig} from './vitest.shared.mts';
import { defineConfig } from 'vitest/config';
export default projectConfig('foundation-integration', defineConfig({
  test: { include: ['src/test/integration/local-postgres-settings.integration.ts', 'src/test/integration/weekly-approved-absences.integration.ts', 'src/test/integration/legacy-safety.integration.ts', 'src/test/integration/foundation.integration.ts', 'src/test/integration/publish-changes.integration.ts', 'src/test/integration/deadline-handoff.integration.ts', 'src/test/integration/phase-b-integrity.integration.ts', 'src/test/integration/phase-b-management-session.integration.ts', 'src/test/integration/schedule-settings-session.integration.ts', 'src/test/integration/phase-b-late-write-session.integration.ts', 'src/test/integration/phase-b-analogous-expiry.integration.ts', 'src/test/integration/phase-b-final-boundaries.integration.ts'], fileParallelism: false, testTimeout: 15000, hookTimeout: 30000 },
}));
