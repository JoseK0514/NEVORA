import test from 'node:test';
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {mkdtempSync,readFileSync,writeFileSync,rmSync,existsSync} from 'node:fs';
import {join,resolve} from 'node:path';
import {tmpdir} from 'node:os';
import {createHash} from 'node:crypto';
import {extractNeonArchive} from './neon-archive.mjs';
const root=resolve(import.meta.dirname,'..');
test('builder ignores ZIPOPT exclusions and verifier checks the exact delivered SQL archive',()=>{
 const owned=mkdtempSync(join(tmpdir(),'nv-neon-owned-archive-')),output=join(owned,'bundle');
 try{
  const built=spawnSync(process.execPath,['scripts/build-neon-onboarding.mjs',output,'--allow-dirty'],{cwd:root,env:{...process.env,ZIPOPT:'-x *.sql'},encoding:'utf8',timeout:60000});assert.equal(built.status,0,built.stderr);
  const listed=spawnSync('unzip',['-Z','-1',join(output,'provisioner.zip')],{encoding:'utf8'});assert.equal(listed.stdout.split('\n').filter(x=>x.endsWith('.sql')).length,62,'ambient options must not drop canonical SQL');
  const verify=()=>spawnSync(process.execPath,['scripts/verify-neon-onboarding.mjs',output,'--allow-dirty'],{cwd:root,encoding:'utf8',timeout:60000});assert.equal(verify().status,0);
  const archive=join(output,'provisioner.zip');const removed=spawnSync('zip',['-qd',archive,'db/migrations/0001_initial.sql'],{encoding:'utf8'});assert.equal(removed.status,0);
  const receipt=JSON.parse(readFileSync(join(output,'receipt.json'),'utf8'));receipt.artifacts.find(a=>a.slug==='provisioner').zipSha256=createHash('sha256').update(readFileSync(archive)).digest('hex');writeFileSync(join(output,'receipt.json'),JSON.stringify(receipt));
  assert(existsSync(join(output,'provisioner/db/migrations/0001_initial.sql')),'loose copy remains intact');const rejected=verify();assert.notEqual(rejected.status,0,'archive missing SQL must fail despite loose file and matching archive hash');assert.match(rejected.stderr,/archive|entry|manifest/i);
 }finally{rmSync(owned,{recursive:true,force:true});}
});
test('archive extraction rejects traversal, symlinks, duplicate and extra entries',()=>{
 const owned=mkdtempSync(join(tmpdir(),'nv-neon-owned-unsafe-'));
 try{for(const [kind,entries,expected] of [
  ['traversal',['../escape'],['../escape']],['absolute',['/escape'],['/escape']],['backslash',['dir\\escape'],['dir\\escape']],['symlink',['index.mjs'],['index.mjs']],['duplicate',['index.mjs','index.mjs'],['index.mjs']],['extra',['index.mjs','extra'],['index.mjs']],
 ]){const archive=join(owned,kind+'.zip');const made=spawnSync('python3',['-c',"import sys,json,zipfile,stat; spec=json.load(sys.stdin); z=zipfile.ZipFile(sys.argv[1],'w');\nfor name in spec['entries']:\n info=zipfile.ZipInfo(name); info.external_attr=((stat.S_IFLNK|0o777) if spec['kind']=='symlink' else (stat.S_IFREG|0o600))<<16; z.writestr(info,'owned fixture')\nz.close()",archive],{input:JSON.stringify({kind,entries}),encoding:'utf8'});assert.equal(made.status,0,made.stderr);assert.throws(()=>extractNeonArchive(archive,expected,join(owned,kind)),/archive|entry/i);}
 }finally{rmSync(owned,{recursive:true,force:true});}
});
