import {expect,it} from 'vitest';
import {spawnSync} from 'node:child_process';
import {tmpdir} from 'node:os';
const environment=(flag:'false'|'unset')=>({PATH:process.env.PATH??'',TMPDIR:tmpdir(),NODE_ENV:'test' as const,...(flag==='false'?{NEVORA_PAYROLL_ENABLED:'false'}:{})});
it.each(['false','unset'] as const)('the actual payroll npm launcher reaches its disabled guard with flag %s before database or payroll work',flag=>{
 const r=spawnSync('npm',['run','payroll:worker'],{cwd:process.cwd(),env:environment(flag),encoding:'utf8',timeout:8000});
 // Only bounded diagnostics reach the formatter, never environment or raw output.
 expect({exit:r.status,spawned:r.error===undefined,disabled:r.stderr.includes('Error: PAYROLL_DISABLED'),markerFailure:r.stderr.includes('server-only'),ipcFailure:r.stderr.includes('EPERM'),databaseRead:r.stderr.includes('DATABASE_URL')}).toEqual({exit:1,spawned:true,disabled:true,markerFailure:false,ipcFailure:false,databaseRead:false});
});
it('real imported payroll schedule and worker retain their disabled checks and execute zero SQL',()=>{
 const script=`
  const {schedulePayroll}=await import('./src/lib/payroll/schedule.ts');
  const {workerOnce}=await import('./src/lib/payroll/worker.ts');
  let io=0;const forbidden={query:async()=>{io++;throw Error('Owned no-SQL boundary');},transaction:async()=>{io++;throw Error('Owned no-SQL boundary');}};
  const denied=[];for(const fn of [schedulePayroll,workerOnce]){try{await fn(forbidden);denied.push(false);}catch(e){denied.push(e.message==='PAYROLL_DISABLED');}}
  process.stdout.write(JSON.stringify({denied,io}));`;
 const r=spawnSync(process.execPath,['--conditions=react-server','--import','./scripts/node-server-context.mjs','--import','tsx','--input-type=module','--eval',script],{cwd:process.cwd(),env:environment('false'),encoding:'utf8',timeout:8000});
 expect(r.status).toBe(0);expect(r.error===undefined&&r.stderr==='').toBe(true);expect(JSON.parse(r.stdout)).toEqual({denied:[true,true],io:0});
});
