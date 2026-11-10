import test from 'node:test';
import assert from 'node:assert/strict';
import {fixtureProcEnvironment} from '../src/test/fixtures/phase-e-proc-environment.mjs';
const owner='e'.repeat(32),ok=stdout=>({status:0,stdout,stderr:''});
test('a positive missing fixture PID models ENOENT rather than an ambiguous environment error',()=>{
 assert.throws(()=>fixtureProcEnvironment(owner,{status:1,stdout:'',stderr:''}),e=>e.code==='ENOENT');
});
test('a positively observed zombie has no retained environment marker',()=>{
 assert.equal(fixtureProcEnvironment(owner,ok('Z+\n')),'');
});
test('a still-live independently observed fixture PID retains its Linux marker',()=>{
 for(const state of ['R','S','Ss','U','I','S+'])assert.equal(fixtureProcEnvironment(owner,ok(state+'\n')),'NEVORA_OWNED_PROCESS_OWNER='+owner+'\0');
});
test('ambiguous, timed out or permission-failed observations cannot claim a missing PID or its marker',()=>{
 for(const observation of [{status:1,stdout:'',stderr:'permission failure'},{status:1,stdout:'unexpected',stderr:''},{status:0,stdout:'',stderr:''},{status:0,stdout:'?',stderr:''},{status:null,stdout:'',stderr:'',error:Error('timeout')}])assert.throws(()=>fixtureProcEnvironment(owner,observation),e=>e.code!=='ENOENT');
});
