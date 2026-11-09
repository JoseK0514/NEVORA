import {build} from 'esbuild';
import {mkdir,writeFile,readFile,readdir,copyFile,realpath} from 'node:fs/promises';
import {resolve,relative,join,isAbsolute,dirname,basename,sep} from 'node:path';
import {fileURLToPath} from 'node:url';
import {spawnSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {BASE_MIGRATIONS,FINAL_MIGRATIONS} from '../db/migrations/order.ts';

const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const args=process.argv.slice(2),allowDirty=args.includes('--allow-dirty');
const destination=args.filter(x=>x!=='--allow-dirty');
if(destination.length!==1||!isAbsolute(destination[0]))throw Error('Supply one absolute, unused output directory outside the repository.');
const output=resolve(destination[0]);
const relation=relative(root,output);
if(!(relation==='..'||relation.startsWith('..'+sep))||output===dirname(root))throw Error('Output must be outside the source tree.');
const actualRoot=await realpath(root),actualOutput=join(await realpath(dirname(output)),basename(output)),actualRelation=relative(actualRoot,actualOutput);
if(!(actualRelation==='..'||actualRelation.startsWith('..'+sep))||actualOutput===dirname(actualRoot))throw Error('Output must be outside the source tree after resolving symlinks.');
const git=(...a)=>{const r=spawnSync('git',a,{cwd:root,encoding:'utf8'});if(r.status!==0)throw Error('Source custody unavailable');return r.stdout.trim();};
const before={commit:git('rev-parse','HEAD'),tree:git('rev-parse','HEAD^{tree}'),status:git('status','--porcelain')};
if(before.status&&!allowDirty)throw Error('Refuse deployable bundles from a dirty checkout; --allow-dirty is local-only.');
await mkdir(output,{recursive:false});
const artifacts=[];
for(const slug of ['stripewebhook','commercequeue','commercereconcile','provisioner','commerceauthority','commerceapi']){
 const dir=join(output,slug);await mkdir(dir,{recursive:false});
 const bundled=await build({entryPoints:[join(root,'services/hosted/neon/'+slug+'.entry.ts')],outfile:join(dir,'src/lib/company-bootstrap/bundle.mjs'),bundle:true,define:{__NEVORA_NEON_BUILD_SOURCE_SHA__:JSON.stringify(before.status?'':before.commit)},format:'esm',platform:'node',target:'node24',metafile:true,alias:{'server-only':join(root,'node_modules/next/dist/compiled/server-only/empty.js')},banner:{js:"import{createRequire as __cr}from'node:module';import{fileURLToPath as __fu}from'node:url';import{dirname as __dn}from'node:path';const require=__cr(import.meta.url);const __filename=__fu(import.meta.url);const __dirname=__dn(__filename);"},logLevel:'silent'});
 await writeFile(join(dir,'index.mjs'),"export {default} from './src/lib/company-bootstrap/bundle.mjs';\nexport * from './src/lib/company-bootstrap/bundle.mjs';\n");
 if(slug==='provisioner'){
  for(const file of [...BASE_MIGRATIONS,...FINAL_MIGRATIONS]){
   const target=join(dir,'db/migrations',file);await mkdir(dirname(target),{recursive:true});
   await copyFile(join(root,'db/migrations',file),target);
  }
 }
 const files=[];
 async function inventory(path){for(const item of await readdir(path,{withFileTypes:true})){const file=join(path,item.name);if(item.isDirectory())await inventory(file);else files.push({path:relative(dir,file),sha256:createHash('sha256').update(await readFile(file)).digest('hex')});}}
 await inventory(dir);
 const zip=join(output,slug+'.zip');const zipEnv={...process.env};delete zipEnv.ZIPOPT;
 const packed=spawnSync('zip',['-q','-X',zip,...files.map(f=>f.path)],{cwd:dir,env:zipEnv,encoding:'utf8',timeout:30000});if(packed.status!==0)throw Error('Bundle ZIP failed');
 const sourceInputs=Object.keys(bundled.metafile.inputs).map(x=>resolve(x));
 if(sourceInputs.some(x=>/(^|\/)\.env(?:\.|$)/.test(x)))throw Error('Environment file in build input');
 artifacts.push({slug,zip,zipSha256:createHash('sha256').update(await readFile(zip)).digest('hex'),files,inputs:sourceInputs.map(x=>relative(root,x))});
}
const after={commit:git('rev-parse','HEAD'),tree:git('rev-parse','HEAD^{tree}'),status:git('status','--porcelain')};
if(JSON.stringify(before)!==JSON.stringify(after))throw Error('Source changed during bundle build');
const receipt={source:{commit:before.commit,tree:before.tree,dirty:!!before.status},sourceUnchanged:true,deployable:!before.status,artifacts};
await writeFile(join(output,'receipt.json'),JSON.stringify(receipt,null,2)+'\n');
console.log(JSON.stringify({output,source:receipt.source,deployable:receipt.deployable,artifacts:artifacts.map(x=>({slug:x.slug,zipSha256:x.zipSha256,files:x.files.length}))}));
