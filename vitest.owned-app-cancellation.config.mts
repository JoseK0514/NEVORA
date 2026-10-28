import {defineConfig} from 'vitest/config';
import {employeeMobileProjects} from './vitest.employee-mobile-communications.config.mts';
// Adversarial owned-fixture cancellation (forced abort after start; refused teardown after an ownership change).
export default defineConfig({test:{fileParallelism:false,passWithNoTests:false,projects:employeeMobileProjects([
 'src/test/integration/owned-next-app-cancellation.integration.ts',
]).filter(project=>project.test.name==='employee').map(project=>({...project,test:{...project.test,include:project.test.include.filter(file=>file.includes('owned-next-app-cancellation'))}}))}});
