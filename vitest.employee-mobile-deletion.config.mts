import {projectConfig} from './vitest.shared.mts';
import {defineConfig} from './vitest.shared.mts';
import {employeeMobileProjects} from './vitest.employee-mobile-communications.config.mts';
// Own account-deletion requests: actual action/SQL lifecycle, then the browser port.
export default projectConfig('employee-mobile-deletion', defineConfig({test:{fileParallelism:false,passWithNoTests:false,projects:employeeMobileProjects([
 'src/test/integration/employee-mobile-deletion-owner.integration.ts',
 'src/test/integration/employee-mobile-deletion-sql.integration.ts',
 'src/test/integration/employee-mobile-deletion.integration.ts',
]).filter(project=>project.test.name==='employee').map(project=>({...project,test:{...project.test,include:project.test.include.filter(file=>file.includes('employee-mobile-deletion'))}}))}}));
