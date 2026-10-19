import {readFile,readdir,mkdir,writeFile,copyFile} from 'node:fs/promises';
import {join,resolve} from 'node:path';
import {spawn,execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';

const here=import.meta.dirname;
const option=(name,fallback)=>{const n=process.argv.indexOf('--'+name);return n<0?fallback:process.argv[n+1];};
const planPath=resolve(option('plan',join(here,'plan.json'))),plan=JSON.parse(await readFile(planPath,'utf8'));
const mode=option('mode','matrix'),executing=process.argv.includes('--execute');
const targetSha=plan.expectedSourceSha;if(process.env.WA_SOURCE_SHA&&process.env.WA_SOURCE_SHA!==targetSha)throw Error('This plan is frozen to its declared source SHA; use a separate plan for another target.');
const key=o=>JSON.stringify([targetSha,o.case,o.account,o.engine,o.size,o.text]);
const credits=(targetSha===plan.expectedSourceSha?plan.matrix.priorEligibleCells:[]);
const creditKeys=new Set(credits.map(key));
const canonicalIds=new Set(plan.matrix.scenarios.filter(s=>s.canonical).map(s=>s.id));
const judgmentByKey=new Map(plan.manualJudgment.map(item=>[key(item),item]));
const passiveEligible=plan.manualJudgment.filter(item=>canonicalIds.has(item.case)).length;
const counts={source:targetSha,mode,canonicalCells:plan.matrix.canonicalCells,allNamedVariantCells:plan.matrix.allNamedVariantCells,eligiblePriorCells:credits.length,remainingCells:plan.matrix.canonicalCells-credits.length,judgmentSamples:plan.manualJudgment.length,passiveEligibleJudgmentSamples:passiveEligible,distinctVariantJudgmentVisits:plan.manualJudgment.length-passiveEligible,formStateScenarios:plan.formStates.length,resizeScenarios:plan.resizeStates?.length??0,sentScenarios:plan.sentStates?.length??0,receiptScenarios:plan.receiptStates?.length??0,roleGuardVisits:plan.roleGuards.length};
if(!executing){console.log(JSON.stringify({...counts,execution:'DRY RUN; no preview or browser launched'},null,2));process.exit(0);}
if(process.env.WA_BROWSER_RELEASED!=='yes'||process.env.WA_BROWSER_RELEASE_SHA!==targetSha)throw Error('Root release for this exact source is required before browser execution.');
if(!process.env.PREVIEW_OUT||!process.env.PLAYWRIGHT_RUNTIME_ROOT)throw Error('Set owned PREVIEW_OUT and PLAYWRIGHT_RUNTIME_ROOT.');
const source=resolve(process.env.WA_SOURCE_WORKTREE||plan.sourceWorktree);
if(execFileSync('git',['rev-parse','HEAD'],{cwd:source,encoding:'utf8'}).trim()!==targetSha)throw Error('Source SHA mismatch.');
if(execFileSync('git',['status','--porcelain','--untracked-files=no'],{cwd:source,encoding:'utf8'}).trim())throw Error('Tracked source is dirty.');
const out=resolve(process.env.PREVIEW_OUT),runs=(await readdir(out)).filter(n=>n.startsWith('evidence-')).sort();
const access=JSON.parse(await readFile(join(out,runs.at(-1),'access.json'),'utf8'));
if(access.checkpoint!==targetSha)throw Error('Preview SHA mismatch.');
const url=new URL(access.url);if(url.protocol!=='http:'||url.hostname!=='127.0.0.1')throw Error('Owned loopback preview required.');
const dest=resolve(option('out',join(here,'runs',targetSha))),pauseFile=join(dest,'PAUSE');await mkdir(dest,{recursive:true});
const bindingsPath=resolve(option('bindings',join(here,'bindings.json')));
const bindings=JSON.parse(await readFile(bindingsPath,'utf8'));
if(!bindings.fixturesReady||!bindings.fixtureProfile||!bindings.fixtureFingerprint)throw Error('Read-only fixture profile/fingerprint/discovery bindings must be ready before execution.');
if(bindings.needsInboxDiscovery)throw Error('Discover actual first Inbox Coverage hrefs for both actors before the required matrix; do not substitute the separate positive candidate fixture.');
const harnessFiles=[planPath,import.meta.filename,join(here,'run-one-state.mjs'),join(here,'state-preload.cjs'),join(here,'after-check-collector.mjs'),join(here,'geometry-measure.mjs'),join(here,'initial-fixture.mts'),join(here,'initial-positive-fixture.mts'),join(here,'source-fixture-provenance.json'),join(here,'scoped-wave-a.mjs'),join(source,'scripts/ui-checks/checks.mjs'),join(source,'scripts/ui-checks/cloud-network-guard.cjs')];
const harnessHashes={};for(const file of harnessFiles)harnessHashes[file]=createHash('sha256').update(await readFile(file)).digest('hex');
const signature=createHash('sha256').update(JSON.stringify({targetSha,fixtureProfile:bindings.fixtureProfile,fixtureFingerprint:bindings.fixtureFingerprint,plan:plan.matrix,harnessHashes})).digest('hex');
const ledgerFile=join(dest,'ledger.json');
let ledger=JSON.parse(await readFile(ledgerFile,'utf8').catch(()=>'null'));
if(ledger&&ledger.signature!==signature)throw Error('Plan/source/fixture changed; use a new result directory.');
ledger??={signature,sourceSha:targetSha,fixtureProfile:bindings.fixtureProfile,fixtureFingerprint:bindings.fixtureFingerprint,harnessHashes,startedAt:new Date().toISOString(),completed:{},attempts:[],blocked:[],cellAttempts:{}};
const save=()=>writeFile(ledgerFile,JSON.stringify(ledger,null,2));
let paused=false;process.once('SIGTERM',()=>{paused=true;});process.once('SIGINT',()=>{paused=true;});
const exists=path=>readFile(path).then(()=>true,()=>false);
const cleanRoute=r=>{if(!r)return r;const u=new URL(r,url);for(const k of [...u.searchParams.keys()])if(/review|repair|token|proof|secret|signature/i.test(k))u.searchParams.set(k,'REDACTED');return u.pathname+u.search+u.hash;};
const routeFor=(scenario,account)=>{
 let value=scenario.route.startsWith('$')?bindings[scenario.route.slice(1)]:scenario.route;
 if(value&&typeof value==='object')value=value[account]??(mode==='roles'?(value.QAOWNER??value['AUDIT-M']):null);
 if(!value||value.startsWith('REPLACE_'))return null;
 const parsed=new URL(value,url);if(parsed.origin!==url.origin)throw Error('External case route refused.');
 return parsed.pathname+parsed.search+parsed.hash;
};
const jobs=[];
if(mode==='matrix'){
 for(const scenario of plan.matrix.scenarios.filter(s=>s.canonical))for(const account of scenario.roles)for(const engine of plan.matrix.engines){
  const groups=new Map();
  for(const size of plan.matrix.widths){
   const remaining=plan.matrix.texts.filter(text=>!ledger.completed[key({case:scenario.id,account,engine,size,text})]&&!creditKeys.has(key({case:scenario.id,account,engine,size,text})));
   if(!remaining.length)continue;
   const group=remaining.join(',');if(!groups.has(group))groups.set(group,[]);groups.get(group).push(size);
  }
  for(const [texts,widths]of groups)for(let n=0;n<widths.length;n+=2)jobs.push({case:scenario.id,account,engine,sizes:widths.slice(n,n+2),texts:texts.split(',').map(Number),scenario});
 }
}else{
 const list=mode==='judgment'?plan.manualJudgment:mode==='forms'?plan.formStates:mode==='roles'?plan.roleGuards:mode==='sent'?plan.sentStates:mode==='receipts'?plan.receiptStates:mode==='resize'?plan.resizeStates:null;
 if(!list)throw Error('Mode must be matrix, judgment, forms, resize, sent, receipts or roles.');
 for(const item of list){const id=JSON.stringify([mode,item]);if(!ledger.completed[id]&&!(mode==='judgment'&&ledger.judgmentMeasurements?.[key(item)]))jobs.push({...item,id,scenario:[...plan.matrix.scenarios,...(plan.extraReceiptScenarios??[])].find(c=>c.id===item.case)});}
}
let completedThisRun=0;
for(let n=0;n<jobs.length;n++){
 if(paused||await exists(pauseFile)){ledger.pausedAt=new Date().toISOString();break;}
 const job=jobs[n],route=job.scenario?routeFor(job.scenario,job.account):null;
 if(mode==='roles'&&job.case==='coverage')job.roleRouteBinding='First actual QAOWNER/Manager Inbox Coverage href used only as an unauthorized Employee/Lead guard probe; not an authorized per-actor read.';
 if(job.scenario&&!route){ledger.blocked.push({case:job.case,account:job.account,reason:'unresolved fixture/discovery URL',at:new Date().toISOString()});await save();continue;}
 const attemptId=String(ledger.attempts.length+1).padStart(5,'0'),attemptDir=join(dest,'attempts',attemptId);await mkdir(attemptDir,{recursive:true});
 const before=new Set(await readdir(join(out,'checks')).catch(()=>[]));
 const privateDir=join(out,'private-state-jobs');await mkdir(privateDir,{recursive:true,mode:0o700});
 const jobFile=join(privateDir,attemptId+'.json');await writeFile(jobFile,JSON.stringify({...job,route,sourceSha:targetSha,bindingsPath,previewOut:out,url:url.origin},null,2),{mode:0o600});
 const artifactRoute=job.scenario?.route.startsWith('$')?new URL(route,url).pathname+'#wa-exit-'+job.case:route;
 await writeFile(join(attemptDir,'job.json'),JSON.stringify({...job,route:artifactRoute,sourceSha:targetSha,bindingsPath,previewOut:out,url:url.origin},null,2));
 const collectorCells=mode==='matrix'?job.sizes.flatMap(size=>job.texts.map(text=>({case:job.case,account:job.account,engine:job.engine,size,text,judgment:judgmentByKey.has(key({case:job.case,account:job.account,engine:job.engine,size,text}))}))):[];
 const args=mode==='matrix'?['--require',join(source,'scripts/ui-checks/cloud-network-guard.cjs'),'--require',join(here,'state-preload.cjs'),'--import',join(here,'after-check-collector.mjs'),join(source,'scripts/ui-checks/checks.mjs'),'--routes',artifactRoute,'--accounts',job.account,'--widths',job.sizes.join(','),'--text',job.texts.join(','),'--browsers',job.engine,'--axe']:[join(here,'run-one-state.mjs'),jobFile,attemptDir];
 const startedAt=new Date().toISOString();
 const result=await new Promise(resolve=>{
  const child=spawn(process.execPath,args,{cwd:source,env:{...process.env,NEVORA_CHECK_ORIGIN:url.origin,WA_CASE_STATE:JSON.stringify(job.scenario?.state??null),WA_REAL_ROUTE:route||'',WA_COLLECTOR_CONTEXT:JSON.stringify({sha:targetSha,engine:job.engine,report:attemptDir,fixtureFingerprint:bindings.fixtureFingerprint,cells:collectorCells})},stdio:['ignore','pipe','pipe']});
  let log='';child.stdout.on('data',s=>log+=s);child.stderr.on('data',s=>log+=s);child.on('exit',code=>resolve({code,log}));
 });
 await writeFile(join(attemptDir,'run.log'),route&&artifactRoute!==route?result.log.replaceAll(route,artifactRoute):result.log);
 const record={id:attemptId,mode,case:job.case||job.action,account:job.account,engine:job.engine,startedAt,completedAt:new Date().toISOString(),exitCode:result.code,artifact:attemptDir};
 if(mode==='matrix'){
  const created=(await readdir(join(out,'checks')).catch(()=>[])).filter(f=>f.endsWith('.json')&&!before.has(f));
  if(created.length===1){
   const file=join(attemptDir,'checks.json');
   const rows=JSON.parse(await readFile(join(out,'checks',created[0]),'utf8'));
   const cap=new URL(route,url);let serialized=JSON.stringify(rows,null,1);for(const [name,value]of cap.searchParams)if(/review|repair|token|proof|secret|signature/i.test(name)&&value)serialized=serialized.replaceAll(value,'REDACTED').replaceAll(encodeURIComponent(value),'REDACTED');await writeFile(file,serialized);record.cells=rows.length;record.rawPass=rows.filter(r=>r.ok).length;
   for(const row of rows){const k=key({case:job.case,account:job.account,engine:job.engine,size:row.size,text:row.text});ledger.cellAttempts??={};ledger.cellAttempts[k]=(ledger.cellAttempts[k]??0)+1;const loadProblem=row.status===0||row.status>=500||(row.errors??[]).some(e=>/load:|net::|timeout|status.*50[0-9]/i.test(e));ledger.completed[k]={artifact:file,rawOk:row.ok,status:row.status,sourceSha:targetSha,loadGap:loadProblem,attempts:ledger.cellAttempts[k]};if(loadProblem&&ledger.cellAttempts[k]===1)jobs.push({...job,sizes:[row.size],texts:[row.text],loadRetry:true});}
   const passiveDir=join(attemptDir,'passive-geometry','cells');
   for(const name of await readdir(passiveDir).catch(()=>[])){
    const artifact=join(passiveDir,name),measurement=JSON.parse(await readFile(artifact,'utf8')),k=key(measurement),baseline=ledger.completed[k];
    if(!measurement.collectionError&&measurement.rootFound&&measurement.sha===targetSha&&measurement.fixtureFingerprint===bindings.fixtureFingerprint&&baseline&&!baseline.loadGap){
     ledger.judgmentMeasurements??={};ledger.judgmentMeasurements[k]={artifact,sourceSha:targetSha,baseline:baseline.artifact,phase:measurement.phase,humanJudgment:'pending'};
    }
   }
  }else record.gap='checker did not save exactly one results file';
 }else{
  const state=JSON.parse(await readFile(join(attemptDir,'result.json'),'utf8').catch(()=>'null'));
  if(state?.complete)ledger.completed[job.id]={artifact:join(attemptDir,'result.json'),sourceSha:targetSha,verdict:state.verdict};else record.gap=state?.gap||'state executor incomplete';
 }
 ledger.attempts.push(record);await save();completedThisRun++;
 console.log(JSON.stringify({mode,attempt:attemptId,job:n+1,total:jobs.length,cells:record.cells,rawPass:record.rawPass,gap:record.gap}));
}
ledger.lastRunEndedAt=new Date().toISOString();ledger.coverageOnly=true;ledger.zeroExitCertified=false;await save();
console.log(JSON.stringify({...counts,completedThisRun,paused:paused||await exists(pauseFile),ledger:ledgerFile,zeroExitCertified:false},null,2));
