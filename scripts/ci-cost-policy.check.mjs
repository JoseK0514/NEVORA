import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,readFileSync,writeFileSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {spawnSync} from 'node:child_process';
import {ciMode} from './ci-cost-policy.mjs';

test('draft lifecycle events select preflight; ready candidates select full verification',()=>{
 for(const action of ['opened','synchronize','reopened','converted_to_draft'])
  assert.equal(ciMode('pull_request',{action,pull_request:{draft:true}}),'preflight');
 for(const action of ['opened','synchronize','reopened','ready_for_review'])
  assert.equal(ciMode('pull_request',{action,pull_request:{draft:false}}),'full');
});
test('development/main pushes and explicit manual dispatch retain full checks',()=>{
 for(const event of ['push','workflow_dispatch'])assert.equal(ciMode(event,{}),'full');
});
test('missing or malformed PR metadata never produces a release decision',()=>{
 for(const payload of [null,{},[],{pull_request:{}},{pull_request:{draft:'false'}},{pull_request:{draft:0}}])
  assert.throws(()=>ciMode('pull_request',payload));
 for(const event of ['',undefined,'pull_request_target','schedule'])assert.throws(()=>ciMode(event,{}));
});
test('actual CLI publishes the selected GitHub output and rejects bad metadata before writing',()=>{
 const directory=mkdtempSync(join(tmpdir(),'nevora-ci-policy-'));
 try{
  const eventPath=join(directory,'event.json'),output=join(directory,'output');
  for(const [event,payload,expected] of [
   ['pull_request',{pull_request:{draft:true}},'false'],
   ['pull_request',{pull_request:{draft:false}},'true'],
   ['push',{},'true'],['workflow_dispatch',{},'true'],
  ]){
   writeFileSync(eventPath,JSON.stringify(payload));writeFileSync(output,'');
   const result=spawnSync(process.execPath,['scripts/ci-cost-policy.mjs'],{encoding:'utf8',env:{PATH:process.env.PATH,GITHUB_EVENT_NAME:event,GITHUB_EVENT_PATH:eventPath,GITHUB_OUTPUT:output}});
   assert.equal(result.status,0,result.stderr);assert.equal(readFileSync(output,'utf8'),`full=${expected}\n`);
  }
  writeFileSync(eventPath,'{}');writeFileSync(output,'');
  const invalid=spawnSync(process.execPath,['scripts/ci-cost-policy.mjs'],{encoding:'utf8',env:{GITHUB_EVENT_NAME:'pull_request',GITHUB_EVENT_PATH:eventPath,GITHUB_OUTPUT:output}});
  assert.notEqual(invalid.status,0);assert.equal(readFileSync(output,'utf8'),'');
 }finally{rmSync(directory,{recursive:true,force:true});}
});
