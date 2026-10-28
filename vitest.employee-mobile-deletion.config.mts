import {defineConfig} from 'vitest/config';
import {employeeMobileProjects} from './vitest.employee-mobile-communications.config.mts';
// Own account-deletion requests: actual action/SQL lifecycle, then the browser port.
export default defineConfig({test:{fileParallelism:false,passWithNoTests:false,projects:employeeMobileProjects([
 'src/test/integration/employee-mobile-deletion-sql.integration.ts',
 'src/test/integration/employee-mobile-deletion.integration.ts',
]).filter(project=>project.test.name==='employee').map(project=>({...project,test:{...project.test,include:project.test.include.filter(file=>file.includes('employee-mobile-deletion'))}}))}});
