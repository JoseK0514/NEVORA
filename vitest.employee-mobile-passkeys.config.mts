import {defineConfig} from 'vitest/config';
import {employeeMobileProjects} from './vitest.employee-mobile-communications.config.mts';
export default defineConfig({test:{fileParallelism:false,passWithNoTests:false,projects:employeeMobileProjects([
 'src/test/integration/employee-mobile-profile-sql.integration.ts',
 'src/test/integration/employee-mobile-profile.integration.ts',
 'src/test/integration/employee-mobile-calendar.integration.ts',
 'src/test/integration/employee-mobile-passkeys.integration.ts',
 'src/test/integration/passkey-network.integration.ts',
],[
 'src/test/integration/phase-e-calendar-tokens.integration.ts',
 'src/test/integration/phase-e-calendar-feed.integration.ts',
 'src/test/integration/company-access-recovery-calendar.integration.ts',
 'src/test/integration/passkeys-http.integration.ts',
 'src/test/integration/passkeys.integration.ts',
])}});
