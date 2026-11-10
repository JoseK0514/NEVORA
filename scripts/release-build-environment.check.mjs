import test from 'node:test';
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {mkdtempSync,writeFileSync,rmSync,existsSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {createRequire} from 'node:module';
import {releaseBuildEnvironment} from './release-build-environment.mjs';

const require=createRequire(import.meta.url);
test('release build gives the actual Next TypeScript worker a bounded heap without inheriting startup code or credentials',()=>{
 const root=mkdtempSync(join(tmpdir(),'nevora-build-heap-'));
 try{
  const marker=join(root,'untrusted-startup-ran');
  const preload=join(root,'untrusted.cjs');
  writeFileSync(preload,`require('node:fs').writeFileSync(${JSON.stringify(marker)},'unexpected');throw Error('untrusted startup executed');`);
  const workerFile=join(root,'worker.cjs');
  writeFileSync(workerFile,`exports.inspect=()=>({heapLimit:require('node:v8').getHeapStatistics().heap_size_limit,nodeOptions:process.env.NODE_OPTIONS??'',untrustedPresent:['OPENAI_API_KEY','DATABASE_URL','NEVORA_WORKFORCE_PROFILES'].some(k=>k in process.env)});`);
  const code=`const {Worker}=require(${JSON.stringify(require.resolve('next/dist/lib/worker.js'))});
   const worker=new Worker(${JSON.stringify(workerFile)},{exposedMethods:['inspect'],debuggerPortOffset:-1,isolatedMemory:false,numWorkers:1,enableWorkerThreads:false,maxRetries:0});
   (async()=>{try{process.stdout.write(JSON.stringify(await worker.inspect()));}finally{await worker.end();}})().catch(()=>{process.exitCode=1;});`;
  const env=releaseBuildEnvironment({...process.env,NODE_OPTIONS:'--require='+JSON.stringify(preload)+' --max-old-space-size=128',OPENAI_API_KEY:'FICTIONAL_TEST_VALUE',DATABASE_URL:'FICTIONAL_TEST_VALUE',NEVORA_WORKFORCE_PROFILES:'FICTIONAL_TEST_VALUE'});
  const probeFile=join(root,'probe.cjs');writeFileSync(probeFile,code);
  const result=spawnSync(process.execPath,[probeFile],{env,encoding:'utf8',timeout:10000});
  assert.equal(result.status,0,result.stderr);
  const actual=JSON.parse(result.stdout);
  assert.match(actual.nodeOptions,/(?:^|\s)--max-old-space-size(?:=|\s+)4096(?:\s|$)/,'worker must receive an explicit limit even when this machine already defaults to 4 GiB');
  assert.ok(actual.heapLimit>=4096*1024*1024&&actual.heapLimit<4352*1024*1024,'actual Next worker must receive the fixed 4 GiB old-space limit');
  assert.equal(actual.untrustedPresent,false);
  assert.equal(existsSync(marker),false);
 }finally{rmSync(root,{recursive:true,force:true});}
});
