// Static unless explicitly --execute. Runtime owner schedules one browser worker.
import assert from 'node:assert/strict';
import {readFile,readdir,mkdir,writeFile} from 'node:fs/promises';
import {spawn} from 'node:child_process';
import {createHash} from 'node:crypto';
import {join,resolve} from 'node:path';
import {redactCheckerOutput} from './redact-checker-output.mjs';
const here=import.meta.dirname,manifest=JSON.parse(await readFile(join(here,'manifest.json'),'utf8'));
if(!process.argv.includes('--execute')){console.log(JSON.stringify({mode:'Prepared only',sourceSha:manifest.sourceSha,configurationCount:24,checkerUnchanged:true,browserExecuted:false}));process.exit(0);}
assert.equal(process.env.BROWSER_HOLD_RELEASED,'yes');assert.equal(process.env.READY_REVIEW_RELEASED_SHA,manifest.sourceSha,'Exact source release required');
assert.equal(process.env.VERIFY_SHA,manifest.sourceSha);assert(process.env.VERIFY_SOURCE&&process.env.PREVIEW_OUT&&process.env.PLAYWRIGHT_RUNTIME_ROOT&&process.env.VERIFY_REPORT_ROOT);
const {loadPrivateContract}=await import('./scoped-al-wa-10.mjs'),contract=await loadPrivateContract();
const source=contract.source,preview=resolve(process.env.PREVIEW_OUT),out=join(resolve(process.env.VERIFY_REPORT_ROOT),'checker24');await mkdir(out,{recursive:true});
const hash=b=>createHash('sha256').update(b).digest('hex');
assert.equal(hash(await readFile(join(source,'scripts/ui-checks/checks.mjs'))),manifest.checkerSha256,'Source checker changed');
assert.equal(hash(await readFile(join(source,'scripts/ui-checks/cloud-network-guard.cjs'))),manifest.guardSha256,'Source guard changed');
assert.equal(hash(await readFile(join(here,'checker-route-rewrite.cjs'))),manifest.files['checker-route-rewrite.cjs'],'Private rewrite changed');
const records=[];let number=0;
for(const account of ['QAOWNER','AUDIT-M'])for(const engine of ['chromium','webkit']){
 number++;const route=contract.bindings.reviewReplacement[account],before=new Set(await readdir(join(preview,'checks')).catch(()=>[]));
 const args=['--require',join(source,'scripts/ui-checks/cloud-network-guard.cjs'),'--require',join(here,'checker-route-rewrite.cjs'),join(source,'scripts/ui-checks/checks.mjs'),'--routes','/app/schedule/new#al-wa-10-review','--accounts',account,'--widths','320,390,1440','--text','100,200','--browsers',engine,'--axe'];
 const startedAt=new Date().toISOString(),result=await new Promise(done=>{const child=spawn(process.execPath,args,{cwd:source,env:{...process.env,NEVORA_CHECK_ORIGIN:contract.origin,WA_REAL_ROUTE:route,WA_CASE_STATE:'null'},stdio:['ignore','pipe','pipe']});let log='';child.stdout.on('data',s=>log+=s);child.stderr.on('data',s=>log+=s);child.once('error',e=>done({code:2,log:log+'\n'+e.message}));child.once('exit',code=>done({code,log}));});
 await writeFile(join(out,'batch-'+number+'.log'),redactCheckerOutput(result.log,route));
 const created=(await readdir(join(preview,'checks')).catch(()=>[])).filter(n=>n.endsWith('.json')&&!before.has(n));
 const row={sourceSha:manifest.sourceSha,account,engine,startedAt,completedAt:new Date().toISOString(),exitCode:result.code,expectedCells:6,sourceCheckerUnchanged:true};
 if(created.length===1){const raw=JSON.parse(await readFile(join(preview,'checks',created[0]),'utf8'));await writeFile(join(out,'batch-'+number+'-checks.json'),redactCheckerOutput(raw,route));row.cells=raw.length;row.rawPass=raw.filter(r=>r.ok).length;row.loadGaps=raw.filter(r=>r.status===0||r.status>=500||(r.errors??[]).some(e=>/load:|net::|timeout|status.*50[0-9]/i.test(e))).length;}else row.setupGap='Checker did not save exactly one results file';
 records.push(row);await writeFile(join(out,'summary.json'),JSON.stringify({sourceSha:manifest.sourceSha,tree:manifest.sourceTree,scope:'AL-WA-10 scoped24 checker only; geometry/human review still required',records,fullExitClaim:false},null,2));console.log(JSON.stringify(row));
}
const complete=records.length===4&&records.every(r=>r.cells===6),allRawPass=complete&&records.every(r=>r.rawPass===6);
await writeFile(join(out,'completion.json'),JSON.stringify({sourceSha:manifest.sourceSha,expected:24,recorded:records.reduce((n,r)=>n+(r.cells??0),0),rawPassed:records.reduce((n,r)=>n+(r.rawPass??0),0),complete,allRawPass,loadGaps:records.reduce((n,r)=>n+(r.loadGaps??0),0),geometryCredit:false,fullExitClaim:false},null,2));
process.exitCode=allRawPass?0:2;
