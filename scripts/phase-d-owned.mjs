import {spawnSync} from 'node:child_process';
import {existsSync,mkdtempSync,rmSync,writeFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {createServer} from 'node:net';
import {randomBytes} from 'node:crypto';
if(process.env.DATABASE_URL)throw new Error('Unset DATABASE_URL before owned Phase D verification.');
const mode=process.argv[2]??'timecards';
const modes={migrations:['node_modules/vitest/vitest.mjs','run','--config','vitest.clocker-integration.config.mts','src/test/integration/clocker-phase-d-migrations.integration.ts'],timecards:['node_modules/vitest/vitest.mjs','run','--config','vitest.timecards-integration.config.mts'],
  schedule:['node_modules/vitest/vitest.mjs','run','--config','vitest.employee-schedule-integration.config.mts'],
  recovery:['node_modules/vitest/vitest.mjs','run','--config','vitest.clocker-recovery-integration.config.mts'],
  account:['node_modules/vitest/vitest.mjs','run','--config','vitest.account-recovery-integration.config.mts'],
  actions:['node_modules/vitest/vitest.mjs','run','--config','vitest.action-center-integration.config.mts'],
  corrections:['node_modules/vitest/vitest.mjs','run','--config','vitest.corrections-integration.config.mts'],
  payroll:['node_modules/vitest/vitest.mjs','run','--config','vitest.payroll-export-integration.config.mts'],
  reports:['node_modules/vitest/vitest.mjs','run','--config','vitest.reports-integration.config.mts'],
  remediation:['--import','tsx','scripts/phase-d-remediation-qa.mjs'],
  browser:['--import','tsx','scripts/phase-d-browser-qa.mjs']};
if(!Object.hasOwn(modes,mode))throw new Error('Unknown owned Phase D test mode');
const bin=process.env.NEVORA_TEST_PG_BIN;
if(!bin||!existsSync(join(bin,'initdb'))||!existsSync(join(bin,'pg_ctl')))throw new Error('Select an existing local PostgreSQL runtime with NEVORA_TEST_PG_BIN.');
const port=await new Promise((resolve,reject)=>{const server=createServer();server.once('error',reject);server.listen(0,'127.0.0.1',()=>{const address=server.address();server.close(()=>resolve(address.port));});});
const owned=mkdtempSync(join(tmpdir(),'nevora-phase-d-owned-')),data=join(owned,'data'),marker=randomBytes(16).toString('hex');
writeFileSync(join(owned,'owner'),marker,{mode:0o600});
const run=(name,args)=>{const result=spawnSync(join(bin,name),args,{encoding:'utf8',timeout:45000});if(result.error||result.status!==0)throw new Error(`${name} failed: ${result.error?.message??result.stderr}`);};
let started=false;
try{
  run('initdb',['-D',data,'-U','nevora_d','--auth-local=trust','--auth-host=trust','--encoding=UTF8','--no-locale']);
  run('pg_ctl',['-D',data,'-l',join(owned,'postgres.log'),'-w','start','-o',`-h 127.0.0.1 -p ${port} -k ${owned}`]);started=true;
  console.log('[Phase D] Owned loopback PostgreSQL; fictional data only.');
  const env={...process.env,FUEL_TEST_DATABASE_URL:`postgresql://nevora_d@127.0.0.1:${port}/${['browser','remediation'].includes(mode)?'nevora_exchange_test_':'nevora_foundation_test_'}d_${marker.slice(0,12)}`,FUEL_TEST_ALLOW_DESTRUCTIVE_TEARDOWN:'yes'};
  delete env.DATABASE_URL;
  const result=spawnSync(process.execPath,modes[mode],{env,stdio:'inherit'});process.exitCode=result.status??1;
}finally{
  if(started||existsSync(join(data,'postmaster.pid')))run('pg_ctl',['-D',data,'-w','stop','-m','fast']);
  rmSync(owned,{recursive:true,force:true});console.log('[Phase D] Owned cluster stopped and removed.');
}
