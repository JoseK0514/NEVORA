import {spawnSync} from 'node:child_process';
import {existsSync,readFileSync,writeFileSync,mkdtempSync,renameSync,readdirSync,rmSync} from 'node:fs';
import {join,resolve} from 'node:path';
import assert from 'node:assert/strict';

// Run only in this task's isolated checkout. Never replace an active dev build.
const root=process.cwd(),output=join(root,'.next');
assert(!existsSync(join(output,'dev','lock')),'Stop only your own dev server before this build check.');
const backup=mkdtempSync(join(root,'.nevora-production-absence-'));
const preserved=new Map(['tsconfig.json','next-env.d.ts','AGENTS.md','CLAUDE.md'].map(name=>[name,existsSync(name)?readFileSync(name):null]));
let moved=false,verified=false;
try {
  if(existsSync(output)){renameSync(output,join(backup,'previous-next'));moved=true;}
  const result=spawnSync(process.execPath,[resolve('node_modules/next/dist/bin/next'),'build'],{stdio:'inherit',env:{...process.env,NODE_ENV:'production',NEVORA_DEV_FORCE_ERRORS:'1',NEVORA_DEV_CAPTURE_DELIVERY:'1'}});
  assert.equal(result.error,undefined);assert.equal(result.status,0,'Production build failed; absence was not verified.');
  const markers=['nv-force-error','NEVORA_DEV_FORCE_ERRORS','NEVORA_DEV_CAPTURE_DELIVERY','NEVORA_DEV_CAPTURE_OUT','Local inspection failure:'];
  let checked=0;
  function visit(path){for(const entry of readdirSync(path,{withFileTypes:true})){const file=join(path,entry.name);if(entry.isDirectory())visit(file);else if(entry.isFile()){checked++;const content=readFileSync(file);for(const marker of markers)assert(!content.includes(Buffer.from(marker)),`Development marker survived in ${file}`);}}}
  visit(output);assert(checked>0,'No build artifacts were scanned.');
  verified=true;
  console.log(JSON.stringify({productionBuild:'passed',artifactsScanned:checked,developmentMarkers:'absent'}));
} finally {
  for(const [name,contents] of preserved){if(contents===null)rmSync(name,{force:true});else writeFileSync(name,contents);}
  if(moved&&!verified){rmSync(output,{recursive:true,force:true});renameSync(join(backup,'previous-next'),output);}
  rmSync(backup,{recursive:true,force:true});
}
