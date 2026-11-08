import test from 'node:test';
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {existsSync,mkdtempSync,readFileSync,writeFileSync,rmSync,symlinkSync} from 'node:fs';
import {resolve,join,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
import {tmpdir} from 'node:os';
import {randomUUID} from 'node:crypto';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..'),builder=join(root,'scripts/build-neon-onboarding.mjs');
test('refuses a source-tree child whose name begins with two dots before writing bundles',()=>{
 const destination=join(root,'..nv-neon-owned-'+randomUUID());
 try{const r=spawnSync(process.execPath,[builder,destination,'--allow-dirty'],{cwd:root,encoding:'utf8',timeout:30000});assert.notEqual(r.status,0);assert.match(r.stderr,/outside the source tree/);assert.equal(existsSync(destination),false);}
 finally{if(existsSync(destination))rmSync(destination,{recursive:true,force:true});}
});
test('refuses an existing output directory without changing its files',()=>{
 const destination=mkdtempSync(join(tmpdir(),'nv-neon-owned-output-'));writeFileSync(join(destination,'sentinel'),'owned fixture');
 try{const r=spawnSync(process.execPath,[builder,destination,'--allow-dirty'],{cwd:root,encoding:'utf8',timeout:30000});assert.notEqual(r.status,0);assert.equal(readFileSync(join(destination,'sentinel'),'utf8'),'owned fixture');assert.equal(existsSync(join(destination,'receipt.json')),false);}
 finally{rmSync(destination,{recursive:true,force:true});}
});
test('refuses an external parent symlink that redirects output into the checkout before writes',()=>{
 const parent=mkdtempSync(join(tmpdir(),'nv-neon-owned-link-')),link=join(parent,'source'),name='..nv-neon-owned-'+randomUUID();symlinkSync(root,link);
 try{const r=spawnSync(process.execPath,[builder,join(link,name),'--allow-dirty'],{cwd:root,encoding:'utf8',timeout:30000});assert.notEqual(r.status,0);assert.equal(existsSync(join(root,name)),false,'must reject before creating source files');}
 finally{rmSync(parent,{recursive:true,force:true});if(existsSync(join(root,name)))rmSync(join(root,name),{recursive:true,force:true});}
});
