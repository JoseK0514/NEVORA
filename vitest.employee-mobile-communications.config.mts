import {defineConfig} from 'vitest/config';
import {fileURLToPath} from 'node:url';
import {communicationFixtureUrl} from './src/test/integration/employee-mobile-communications-fixtures';
const resolution={alias:{'@':fileURLToPath(new URL('./src',import.meta.url)),'server-only':fileURLToPath(new URL('./node_modules/next/dist/compiled/server-only/empty.js',import.meta.url))}};
const groups=[
 {name:'employee',prefix:'nevora_exchange_test_',include:[
  'src/test/integration/employee-mobile-communications.integration.ts',
  'src/test/integration/employee-mobile-communications-review.integration.ts',
  'src/test/integration/employee-mobile-communications-sql.integration.ts',
  'src/test/integration/employee-mobile-hours-sql.integration.ts',
  'src/test/integration/employee-mobile-hours.integration.ts',
  'src/test/integration/employee-mobile-planning.integration.ts',
  'src/test/integration/employee-mobile-planning-sql.integration.ts',
  'src/test/integration/employee-mobile-creation.integration.ts',
  'src/test/integration/employee-mobile-creation-privacy.integration.ts',
  'src/test/integration/employee-mobile-responses.integration.ts',
  'src/test/integration/employee-mobile-requests.integration.ts',
  'src/test/integration/employee-mobile-exchange-privacy.integration.ts',
  'src/test/integration/shift-change-hardening.integration.ts',
  'src/test/integration/shift-change-views.integration.ts'
 ]},
 {name:'canonical-communications',prefix:'nevora_foundation_test_',include:[
  'src/test/integration/phase-e-communications-schema.integration.ts',
  'src/test/integration/phase-e-communications.integration.ts',
  'src/test/integration/phase-e-communication-ack.integration.ts',
  'src/test/integration/communications-gap-remediation.integration.ts',
  'src/test/integration/company-access-communications.integration.ts'
 ]},
 {name:'canonical-notifications',prefix:'fuel_phase3_test_',include:[
  'src/test/integration/phase-e-communication-notifications.integration.ts'
 ]}
];
// Project-specific namespaces preserve every factory's existing admission fence.
// Timeouts, serial execution and all selected suites remain unchanged.
export function employeeMobileProjects(additionalEmployeeFiles:readonly string[]=[]){
 return groups.map(group=>({extends:false as const,resolve:resolution,test:{name:group.name,include:group.name==='employee'?[...group.include,...additionalEmployeeFiles]:group.include,fileParallelism:false,maxWorkers:1,testTimeout:600000,hookTimeout:30000,env:process.env.FUEL_TEST_DATABASE_URL?{FUEL_TEST_DATABASE_URL:communicationFixtureUrl(process.env.FUEL_TEST_DATABASE_URL,group.prefix)}:{}}}));
}
export default defineConfig({test:{fileParallelism:false,passWithNoTests:false,projects:employeeMobileProjects()}});
