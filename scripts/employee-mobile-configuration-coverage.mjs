import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {pathToFileURL} from 'node:url';

// Inspection only. This marked synthetic URL evaluates the existing namespace
// mapping; importing these configuration objects makes no database connection.
const suites=['phase1','requests','responses','creation','planning','hours','communications','profile','calendar','passkeys','device-alerts','deletion','pay'];
const selected=['device-alerts','phase1','deletion','pay'];
const fixture='postgresql://nevora_qa@127.0.0.1:54321/nevora_exchange_test_c1_000000000000';
const allowed=(object,keys,label)=>assert(Object.keys(object).every(key=>keys.includes(key)),'Inspect unsupported '+label+' options before claiming coverage');
const stable=value=>value&&typeof value==='object'&&!Array.isArray(value)?Object.fromEntries(Object.keys(value).sort().map(key=>[key,stable(value[key])])):Array.isArray(value)?value.map(stable):value;
// The caller's report destination is instrumentation of the outer test run.
// These configuration objects are inspected only; they emit no report. Keep
// the strict execution-option guard independent of that inherited destination.
delete process.env.NEVORA_RSTEST_REPORT_FILE;
process.env.FUEL_TEST_DATABASE_URL=fixture;
const rows=[],configurations=[];
for(const suite of suites){
 const file='vitest.employee-mobile-'+suite+'.config.mts',bytes=readFileSync(file),config=(await import(pathToFileURL(resolve(file)).href)).default;
 const keys=['name','include','exclude','projects','pool','resolve','testTimeout','hookTimeout','env','passWithNoTests','plugins','tools'];
 allowed(config,keys,'configuration');
 assert.equal(config.name,'employee-mobile-'+suite,'Inspect changed project identity before claiming coverage');
 configurations.push({suite,file,sha256:createHash('sha256').update(bytes).digest('hex')});
 for(const test of config.projects??[config]){
  allowed(test,keys,'project');
  allowed(test.pool,['type','maxWorkers'],'worker pool');
  assert.equal(test.pool.type,'forks','Inspect unsupported worker pool before claiming coverage');
  const maxWorkers=test.pool.maxWorkers??config.pool.maxWorkers??null;
  for(const input of test.include??[]){
   assert(input.startsWith('src/test/integration/')&&input.endsWith('.integration.ts'),'Inspect nonliteral test selection before claiming coverage');
   const contract={file:input,environment:{FUEL_TEST_DATABASE_URL:fixture,...test.env},fileParallelism:maxWorkers!==1,maxWorkers,timeout:test.testTimeout??config.testTimeout,hookTimeout:test.hookTimeout??config.hookTimeout,passWithNoTests:test.passWithNoTests??config.passWithNoTests??false,resolve:test.resolve??config.resolve,exclude:test.exclude??config.exclude};
   rows.push({suite,contract,key:JSON.stringify(stable(contract))});
  }
 }
}
const covered=new Set(rows.filter(row=>selected.includes(row.suite)).map(row=>row.key)),missing=rows.filter(row=>!covered.has(row.key)),contracts=[...new Map(rows.map(row=>[row.key,row.contract])).values()];
console.log(JSON.stringify({method:'Exact literal selection, effective namespaces, aliases, serial-file execution, worker counts, deadlines and no-test admission compared; synthetic namespace inspection only',configurations,selected,distinctFiles:new Set(rows.map(row=>row.contract.file)).size,distinctContracts:contracts.length,missing,contracts},null,2));
process.exitCode=missing.length?1:0;
