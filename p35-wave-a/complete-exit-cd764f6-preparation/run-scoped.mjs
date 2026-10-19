// Prepared sixty-cell supplement. No execution without exact coordinator release.
import assert from 'node:assert/strict';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {join,resolve} from 'node:path';
import {execFileSync,spawn} from 'node:child_process';
const here=import.meta.dirname,plan=JSON.parse(await readFile(join(here,'plan.json'),'utf8'));
const sha=plan.expectedSourceSha,source=plan.sourceWorktree;
const names=['scoped-wa-new-employee-names','scoped-wa-member-names','scoped-wa-callout-names','scoped-wa-coverage-loading'];
if(!process.argv.includes('--execute')){console.log(JSON.stringify({mode:'static-dry-run',sourceSha:sha,scopedCells:60,names,previewStarted:false,browserExecuted:false}));process.exit(0);}
assert.equal(process.env.WA_BROWSER_RELEASED,'yes');assert.equal(process.env.WA_BROWSER_RELEASE_SHA,sha);
assert.equal(execFileSync('git',['rev-parse','HEAD'],{cwd:source,encoding:'utf8'}).trim(),sha);
assert.equal(execFileSync('git',['status','--porcelain','--untracked-files=no'],{cwd:source,encoding:'utf8'}).trim(),'');
assert(process.env.PREVIEW_OUT&&process.env.PLAYWRIGHT_RUNTIME_ROOT,'Owned preview and browser runtime are required');
const i=process.argv.indexOf('--out'),out=resolve(i<0?join(here,'runs',sha,'scoped60'):process.argv[i+1]);await mkdir(out,{recursive:true});
const files=['run-scoped.mjs','scoped-wave-a.mjs','scoped-runtime/verify.mjs','scoped-runtime/extra-cases.mjs','scoped-runtime/owned-read-barrier.mjs'],hashes={};
for(const file of files)hashes[file]=createHash('sha256').update(await readFile(join(here,file))).digest('hex');
await writeFile(join(out,'scoped-provenance.json'),JSON.stringify({sourceSha:sha,hashes,scope:'Supplemental real UI criteria; no full exit certification',expectedCells:60,startedAt:new Date().toISOString()},null,2));
const code=await new Promise(done=>{const child=spawn(process.execPath,[join(here,'scoped-runtime/verify.mjs')],{cwd:source,stdio:'inherit',env:{...process.env,BROWSER_HOLD_RELEASED:'yes',VERIFY_SOURCE:source,VERIFY_SHA:sha,VERIFY_REPORT_ROOT:out,VERIFY_SCOPED_MODULES:join(here,'scoped-wave-a.mjs'),VERIFY_ONLY:names.join(','),VERIFY_ENGINES:'chromium,webkit'}});child.once('exit',c=>done(c??2));child.once('error',()=>done(2));});
process.exitCode=code;
