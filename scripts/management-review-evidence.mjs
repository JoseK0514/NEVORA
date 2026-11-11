import assert from 'node:assert/strict';
import {readFileSync,readdirSync,writeFileSync} from 'node:fs';
import {resolve,join,isAbsolute} from 'node:path';
import {createHash} from 'node:crypto';
import {pathToFileURL} from 'node:url';

export function verifyManagementPacket({results,manifest,ownership,expectedSha,source,hashFile}){
 assert.match(expectedSha,/^[a-f0-9]{40}$/);
 assert.equal(results.complete,true);assert.deepEqual(results.errors,[]);
 assert(Array.isArray(results.checks)&&results.checks.length>0);
 assert(Array.isArray(results.captures)&&results.captures.length>=2);
 assert.equal(manifest.checkpoint,expectedSha);
 assert.equal(ownership.source,source);assert.equal(ownership.closed,true);
 assert.equal(ownership.sourceVerified,true);assert.equal(ownership.mirrorVerified,true);
 assert(manifest.hashes&&Object.keys(manifest.hashes).length>0);
 for(const [name,hash] of Object.entries(manifest.hashes)){
  assert(!isAbsolute(name)&&!name.split('/').includes('..'));
  assert.match(hash,/^[a-f0-9]{64}$/);assert.equal(hashFile(name),hash,name+' changed');
 }
 return {checkpoint:expectedSha,sourceFiles:Object.keys(manifest.hashes).length,checks:results.checks.length,captures:results.captures.length,closed:true};
}
if(process.argv[1]&&import.meta.url===pathToFileURL(resolve(process.argv[1])).href){
 const directories=process.argv.slice(2);assert.equal(directories.length,2);
 const expectedSha=process.env.MANAGEMENT_REVIEW_EXPECTED_SHA,source=process.cwd(),receipts=[];
 for(const directory of directories){
  const owners=readdirSync(directory,{withFileTypes:true}).filter(d=>d.isDirectory()&&/^owned-next-/.test(d.name));assert.equal(owners.length,1);
  const json=name=>JSON.parse(readFileSync(name,'utf8')),root=join(directory,owners[0].name);
  const receipt=verifyManagementPacket({results:json(join(directory,'results.json')),manifest:json(join(root,'source-manifest.json')),ownership:json(join(root,'ownership.json')),expectedSha,source,hashFile:name=>createHash('sha256').update(readFileSync(join(source,name))).digest('hex')});
  writeFileSync(join(directory,'verified-source.json'),JSON.stringify(receipt,null,2)+'\n');receipts.push(receipt);
 }
 process.stdout.write(JSON.stringify(receipts)+'\n');
}
