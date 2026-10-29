import assert from 'node:assert/strict';
import {execFileSync, spawnSync} from 'node:child_process';
import {closeSync, mkdirSync, openSync, realpathSync, writeFileSync} from 'node:fs';
import {isAbsolute, join, relative, resolve, sep} from 'node:path';
import {employeeMobileEvidence} from './employee-mobile-evidence.mjs';

const source=realpathSync(process.cwd()),destination=resolve(process.argv[2]??'');
assert(process.argv[2]&&isAbsolute(process.argv[2]),'Choose an explicit external evidence directory');
const distance=relative(source,destination);
assert(distance==='..'||distance.startsWith('..'+sep)||isAbsolute(distance),'Evidence must be outside the source checkout');
assert(process.env.NEVORA_TEST_PG_BIN&&process.env.NEVORA_PLAYWRIGHT_RUNTIME_PACKAGE,'Select existing approved local PostgreSQL and browser runtimes');
assert(!process.env.DATABASE_URL,'Unset DATABASE_URL; only invocation-owned fictional databases are allowed');
const head=()=>execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim();
const checkpoint=head();
assert.equal(execFileSync('git',['status','--porcelain'],{encoding:'utf8'}).trim(),'','Commit the frozen candidate before verification');
mkdirSync(destination);
const suites=[
 'phase1','requests','responses','creation','planning','hours','communications','profile','calendar','passkeys','device-alerts','deletion','pay',
];
const results=[];
for(const suite of suites){
 assert.equal(head(),checkpoint,'Candidate changed during verification');
 const directory=join(destination,suite),log=join(destination,suite+'.log'),fd=openSync(log,'wx');
 const evidence=employeeMobileEvidence(destination,suite);
 for(const path of Object.values(evidence))mkdirSync(path,{recursive:true});
 const startedAt=new Date().toISOString();
 let result;
 try{result=spawnSync(process.execPath,['scripts/payroll-postgres.mjs','vitest.employee-mobile-'+suite+'.config.mts'],{
  env:{...process.env,...evidence},stdio:['ignore',fd,fd],
 });}finally{closeSync(fd);}
 results.push({suite,checkpoint,startedAt,finishedAt:new Date().toISOString(),exitCode:result.status,signal:result.signal,error:result.error?.message??null,log,directory});
 writeFileSync(join(destination,'summary.json'),JSON.stringify({checkpoint,scope:'Employee-only release; existing compatibility-role regressions retained',results},null,2));
 process.stdout.write(suite+': exit '+result.status+'\n');
}
assert.equal(head(),checkpoint,'Candidate changed during verification');
process.exitCode=results.every(result=>result.exitCode===0)?0:1;
