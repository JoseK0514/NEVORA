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
process.env.FUEL_TEST_DATABASE_URL=fixture;
const rows=[],configurations=[];
for(const suite of suites){
 const file='vitest.employee-mobile-'+suite+'.config.mts',bytes=readFileSync(file),config=(await import(pathToFileURL(resolve(file)).href)).default;
 allowed(config,['resolve','test'],'configuration');allowed(config.test,['include','projects','fileParallelism','maxWorkers','testTimeout','hookTimeout','passWithNoTests'],'root test');
 configurations.push({suite,file,sha256:createHash('sha256').update(bytes).digest('hex')});
 for(const group of config.test.projects??[config]){
  allowed(group,['extends','resolve','test'],'project');const test=group.test;
  allowed(test,['name','include','projects','fileParallelism','maxWorkers','testTimeout','hookTimeout','env','passWithNoTests'],'project test');
  const parallel=test.fileParallelism??config.test.fileParallelism;
  for(const input of test.include??[]){
   assert(input.startsWith('src/test/integration/')&&input.endsWith('.integration.ts'),'Inspect nonliteral test selection before claiming coverage');
   const contract={file:input,environment:{FUEL_TEST_DATABASE_URL:fixture,...test.env},fileParallelism:parallel,maxWorkers:test.maxWorkers??config.test.maxWorkers??(parallel===false?1:null),timeout:test.testTimeout??config.test.testTimeout,hookTimeout:test.hookTimeout??config.test.hookTimeout,passWithNoTests:test.passWithNoTests??config.test.passWithNoTests??false,resolve:group.resolve??config.resolve};
   rows.push({suite,contract,key:JSON.stringify(stable(contract))});
  }
 }
}
const covered=new Set(rows.filter(row=>selected.includes(row.suite)).map(row=>row.key)),missing=rows.filter(row=>!covered.has(row.key)),contracts=[...new Map(rows.map(row=>[row.key,row.contract])).values()];
console.log(JSON.stringify({method:'Exact literal selection, effective namespaces, aliases, serial-file execution, worker counts, deadlines and no-test admission compared; synthetic namespace inspection only',configurations,selected,distinctFiles:new Set(rows.map(row=>row.contract.file)).size,distinctContracts:contracts.length,missing,contracts},null,2));
process.exitCode=missing.length?1:0;
