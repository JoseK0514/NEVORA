import {test} from 'node:test';
import assert from 'node:assert/strict';
import {verifyManagementPacket} from './management-review-evidence.mjs';
const fixture=()=>({results:{complete:true,errors:[],checks:['real browser'],captures:['a.png','b.png']},manifest:{checkpoint:'a'.repeat(40),hashes:{'src/a.ts':'b'.repeat(64)}},ownership:{source:'/owned',closed:true,sourceVerified:true,mirrorVerified:true},expectedSha:'a'.repeat(40),source:'/owned',hashFile:()=> 'b'.repeat(64)});
test('management packet requires complete error-free current-source closed browser evidence',()=>{
 assert.equal(verifyManagementPacket(fixture()).sourceFiles,1);
 for(const change of [
  f=>f.results.complete=false,f=>f.results.errors=['runtime error'],f=>f.results.checks=[],f=>f.results.captures=[],
  f=>f.manifest.checkpoint='c'.repeat(40),f=>f.manifest.hashes={},f=>f.hashFile=()=> 'c'.repeat(64),
  f=>f.ownership.source='/other',f=>f.ownership.closed=false,f=>f.ownership.sourceVerified=false,f=>f.ownership.mirrorVerified=false,
  f=>f.manifest.hashes={'../escape':'b'.repeat(64)},
 ]){const f=fixture();change(f);assert.throws(()=>verifyManagementPacket(f));}
});
