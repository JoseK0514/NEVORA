import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,writeFile,rm} from 'node:fs/promises';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
import {checkVitestInventory} from './check-vitest-projects.mjs';
test('rejects an orphan configuration and duplicate names; accepts a classified project',async()=>{
 const directory=await mkdtemp(join(tmpdir(),'nevora-test-inventory-'));
 try{
  await writeFile(join(directory,'vitest.config.mts'),'root');await writeFile(join(directory,'vitest.one.config.mts'),"projectConfig('one',{})");
  const entries=[{name:'one',config:'vitest.one.config.mts'}];await checkVitestInventory(directory,entries);
  await writeFile(join(directory,'vitest.orphan.config.mts'),'projectConfig');await assert.rejects(checkVitestInventory(directory,entries),/Unregistered/);
  await rm(join(directory,'vitest.orphan.config.mts'));await assert.rejects(checkVitestInventory(directory,[...entries,{name:'one',config:'vitest.other.config.mts'}]),/Duplicate/);
 }finally{await rm(directory,{recursive:true,force:true});}
});
