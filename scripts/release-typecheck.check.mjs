import test from 'node:test';
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {mkdtempSync,readFileSync,writeFileSync,symlinkSync,rmSync,existsSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join,resolve} from 'node:path';
import {createRequire} from 'node:module';
import {safeEnvironment} from './phase-e-owned.mjs';

const require=createRequire(import.meta.url);
const workflow=require('js-yaml').load(readFileSync('.github/workflows/ci.yml','utf8'));
const step=workflow.jobs.validate.steps.find(step=>step.name==='Type check');
const typecheck=JSON.parse(readFileSync('package.json','utf8')).scripts.typecheck;

test('CI typecheck supplies a bounded heap to the actual compiler and preserves diagnostics and noEmit',()=>{
 assert.equal(step.run,'npm run typecheck');
 const root=mkdtempSync(join(tmpdir(),'nevora-typecheck-'));
 try{
  symlinkSync(resolve('node_modules'),join(root,'node_modules'),'dir');
  writeFileSync(join(root,'package.json'),JSON.stringify({private:true,scripts:{typecheck}}));
  writeFileSync(join(root,'tsconfig.json'),JSON.stringify({compilerOptions:{strict:true,noEmit:true,types:[],skipLibCheck:true},files:['fixture.ts']}));
  const probe=join(root,'heap.cjs'),receipt=join(root,'heap.json');
  writeFileSync(probe,`const fs=require('node:fs');if(process.argv[1]&&fs.realpathSync(process.argv[1])===${JSON.stringify(require.resolve('typescript/bin/tsc'))})fs.writeFileSync(${JSON.stringify(receipt)},JSON.stringify({heapLimit:require('node:v8').getHeapStatistics().heap_size_limit}));`);
  // Model the smaller hosted default even on Macs whose default heap is larger.
  // This owned preload only observes the real compiler's V8 limit.
  const env={...safeEnvironment(),NODE_OPTIONS:'--max-old-space-size=2048 --max-semi-space-size=1',...step.env};
  env.NODE_OPTIONS+=' --require='+JSON.stringify(probe);
  const run=()=>spawnSync('npm',['run','typecheck'],{cwd:root,env,encoding:'utf8',timeout:20000});
  writeFileSync(join(root,'fixture.ts'),'const answer: number = 42;\n');
  const valid=run();
  assert.equal(valid.status,0,valid.stderr+valid.stdout);
  const {heapLimit}=JSON.parse(readFileSync(receipt,'utf8'));
  assert.ok(heapLimit>=4096*1024*1024&&heapLimit<4352*1024*1024,`compiler must receive a bounded 4 GiB heap; observed ${heapLimit}`);
  assert.equal(existsSync(join(root,'fixture.js')),false,'successful typechecking must not emit JavaScript');
  writeFileSync(join(root,'fixture.ts'),'const answer: number = "invalid";\n');
  const invalid=run();
  assert.equal(invalid.status,2,invalid.stderr+invalid.stdout);
  assert.match(invalid.stdout,/TS2322/,'actual compiler diagnostic must remain visible');
  assert.equal(existsSync(join(root,'fixture.js')),false,'failed typechecking must not emit JavaScript');
 }finally{rmSync(root,{recursive:true,force:true});}
});
