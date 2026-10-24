import {spawnSync} from 'node:child_process';
import {resolve} from 'node:path';
import {expect,it} from 'vitest';

const runner=resolve('scripts/phase-e-owned.mjs'),fixture=resolve('src/test/fixtures/phase-e-retirement-boundary.mjs');
const modes=['member-environment','root-environment','root-with-live-member','member-eacces','member-eio','member-missing-marker','ambiguous-exit','ambiguous-exit-stderr','ambiguous-exit-malformed','root-ambiguous-exit','darwin-environment-stderr'] as const;
it.each(modes)('owned retirement boundary: %s',mode=>{
 const execution=spawnSync(process.execPath,[fixture,runner,mode],{env:{PATH:process.env.PATH,HOME:process.env.HOME,NODE_ENV:'test'},encoding:'utf8',timeout:15000});
 expect(execution.status,execution.stderr).toBe(0);
 const receipt=JSON.parse(execution.stdout),detail=JSON.stringify(receipt),positive=mode==='member-environment'||mode==='root-environment';
 expect(receipt.proof.before.root,detail).toMatchObject({clean:true,status:0,zombie:false});
 expect(receipt.proof.before.member,detail).toMatchObject({clean:true,status:0,zombie:false});
 expect(receipt.result.status,detail).toBe(positive?0:1);
 expect(receipt.result.timedOut,detail).toBe(false);
 expect(receipt.actualExit,detail).toEqual({status:0,signal:null});
 expect(receipt.result.resources,detail).toHaveLength(1);
 expect(receipt.result.resources[0].kind,detail).toBe('owned-descendant');
 expect(receipt.result.resources[0].stopped,detail).toBe(true);
 expect(receipt.backupUsed,detail).toBe(false);
 expect(receipt.final.root.clean,detail).toBe(true);expect(receipt.final.member.clean,detail).toBe(true);
 expect(receipt.final.root.status===1||receipt.final.root.zombie,detail).toBe(true);
 expect(receipt.final.member.status===1||receipt.final.member.zombie,detail).toBe(true);
 if(positive){
  expect(receipt.signals,detail).toEqual([]);
  expect(receipt.result.error,detail).toBeUndefined();expect(receipt.result.observationFailure,detail).toBeUndefined();
  expect(receipt.proof.after.member.status===1||receipt.proof.after.member.zombie,detail).toBe(true);
 }else{
  expect(receipt.result.error,detail).toBe('Owned resource observation failed');
  expect(receipt.result.observationFailure,detail).toBeDefined();
  if(mode==='root-with-live-member')expect(receipt.proof.after.member,detail).toMatchObject({clean:true,status:0,zombie:false});
  if(mode==='member-missing-marker')expect(receipt.result.observationFailure.reason,detail).toBe('OWNERSHIP_LOST');
  if(mode==='darwin-environment-stderr')expect(receipt.result.observationFailure.reason,detail).toBe('OWNERSHIP_UNAVAILABLE');
  if(mode==='member-eacces'||mode==='member-eio'){
   expect(receipt.result.observationFailure,detail).toMatchObject({reason:'OWNERSHIP_UNAVAILABLE',pid:receipt.result.resources[0].pid,phase:'member-environment',errno:mode==='member-eacces'?'EACCES':'EIO'});
  }
 }
 expect(receipt.signals.some((row:{pid:number})=>row.pid===receipt.result.resources[0].pid),detail).toBe(false);
},20000);
