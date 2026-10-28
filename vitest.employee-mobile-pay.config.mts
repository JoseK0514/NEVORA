import {defineConfig} from 'vitest/config';
import {employeeMobileProjects} from './vitest.employee-mobile-communications.config.mts';
// Own published Pay statements and protected PDFs on Employee/Lead phones. The statement/correction SQL contract
// lives in configurable-payroll.integration.ts and the PDF route contract in navigation.test.ts.
export default defineConfig({test:{fileParallelism:false,passWithNoTests:false,projects:employeeMobileProjects([
 'src/test/integration/employee-mobile-pay.integration.ts',
]).filter(project=>project.test.name==='employee').map(project=>({...project,test:{...project.test,include:project.test.include.filter(file=>file.includes('employee-mobile-pay'))}}))}});
