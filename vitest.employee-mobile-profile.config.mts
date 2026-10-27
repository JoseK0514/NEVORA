import {defineConfig} from 'vitest/config';
import {employeeMobileProjects} from './vitest.employee-mobile-communications.config.mts';
export default defineConfig({test:{fileParallelism:false,passWithNoTests:false,projects:employeeMobileProjects([
 'src/test/integration/employee-mobile-profile-sql.integration.ts',
 'src/test/integration/employee-mobile-profile.integration.ts',
])}});
