// Long-running coordinator. One checks.mjs at a time per isolated preview.
// Run from the tools checkout after sourcing the non-secret cloud environment.
import {spawn,execFileSync} from 'node:child_process';
import {createWriteStream} from 'node:fs';
import {readFile,writeFile,readdir,mkdir,copyFile,access,rename} from 'node:fs/promises';
import {join,resolve} from 'node:path';

const repo=resolve(process.env.NEVORA_REPORT_ROOT),tools=resolve(process.env.NEVORA_TOOLS_ROOT);
const evidence=join(repo,'docs/product/specs/codex-joint/cloud-checks');
const stateRoot='/workspace/nevora-cloud-state';
await mkdir(stateRoot,{recursive:true});
const branches=['premium-phase-1','p35-profile-6cdee8','p35-wave-a-1283c8','p35-wave-b-808dfd','p35-wave-c-93e13c','p4-desktop-240fe0','premium-phase-1-large'];
const env={...process.env,NEXT_TELEMETRY_DISABLED:'1'};
const guard=join(repo,'scripts/ui-checks/cloud-network-guard.cjs');
const widths=['390','1440','320','360','430','844x390','768','1024'];
const git=(...args)=>execFileSync('git',args,{cwd:repo,encoding:'utf8',stdio:['ignore','pipe','pipe']}).trim();
const metas=new Map();
let publications=Promise.resolve();
const exists=async p=>access(p).then(()=>true,()=>false);
const save=async meta=>{const file=join(stateRoot,meta.key+'.json');await writeFile(file+'.tmp',JSON.stringify(meta,null,2));await rename(file+'.tmp',file);};
const key=r=>JSON.stringify([r.engine,r.account,r.size,r.text,r.route]);
function run(script,args,options={}) {
  return new Promise((accept,reject)=>{
    const child=spawn(process.execPath,[...(options.guard?['--require',guard]:[]),...(options.tsx?['--import',join(tools,'node_modules/tsx/dist/loader.mjs')]:[]),script,...args],{cwd:tools,env:{...env,...options.env},stdio:['ignore','pipe','pipe']});
    let output='';const stream=options.log?createWriteStream(options.log,{flags:'a'}):null;
    child.stdout.on('data',chunk=>{output+=chunk;stream?.write(chunk);options.onOutput?.(String(chunk));});
    child.stderr.on('data',chunk=>{output+=chunk;stream?.write(chunk);});
    child.once('error',reject);child.once('close',(code,signal)=>{stream?.end();accept({code,signal,output});});
    options.onChild?.(child);
  });
}
function uiOwner(route,size) {
  if(Number(String(size).split('x')[0])>=768)return 'UI — claude/p4-desktop-240fe0 (desktop); shared kit/shell: claude/premium-phase-1';
  const path=route.split('?')[0];
  if(path==='/app/profile')return 'UI — claude/p35-profile-6cdee8 (management) / claude/premium-phase-1 (Employee/Lead)';
  if(path==='/app/settings/payroll'||/^\/app\/(reports|payroll)(\/|$)/.test(path)||/^\/app\/schedule\/(templates|settings)/.test(path)||path.startsWith('/app/updates/'))return 'UI — claude/p35-wave-b-808dfd';
  if(path.startsWith('/app/settings')||/^\/app\/(account-recovery|clocker-recovery)/.test(path))return 'UI — claude/p35-wave-c-93e13c';
  if(/^\/app\/(employees|availability|requests|exchange)(\/|$)/.test(path)||/^\/app\/schedule\/(new|edit|copy-receipt)/.test(path))return 'UI — claude/p35-wave-a-1283c8';
  return 'UI — claude/premium-phase-1';
}
const escape=value=>String(value??'').replaceAll('|','\\|').replaceAll('\n',' ');
function detail(r){return `FAIL ${r.engine} ${r.account} ${r.size} ${r.text}% ${r.route}`+(r.overflow?.length?` overflow=${r.overflow.join('; ')}`:'')+(r.smallText?.length?` small=${r.smallText.slice(0,4).join('; ')}`:'')+(r.targets?.length?` targets=${r.targets.slice(0,4).join('; ')}`:'')+(r.text===100&&r.cls>0.01?` cls=${r.cls}`:'')+(r.errors?.length?` errors=${r.errors.slice(0,2).join('; ')}`:'')+(r.axe?.length?` axe=${r.axe.join(',')}`:'')+(r.status>=400?` status=${r.status}`:'');}
function checks(r){return [r.overflow?.length&&'overflow',r.smallText?.length&&'small text',r.targets?.length&&'target',r.text===100&&r.cls>0.01&&'layout shift',(r.status>=400||r.errors?.length||r.error)&&'error',r.axe?.length&&'axe'].filter(Boolean);}
function classify(r,check,network){
  const matches=network.filter(n=>n.account===r.account&&n.page===r.route.split('?')[0]);
  if(check==='error'&&matches.some(n=>n.path==='/api/manager/inbox-count'&&n.status===404))return 'backend — endpoint already fixed on codex/premium-backend, 8f341e8; absent from this immutable Claude snapshot';
  if(check==='error'&&matches.some(n=>n.path.startsWith('/api/management/profile')&&n.status===404))return 'backend — Profile endpoints already fixed on codex/premium-backend, 22c4320; absent from this snapshot';
  if(check==='error'&&(r.status>=500||r.errors.some(e=>/500|502|503|504|load:.*Timeout/.test(e))))return 'backend/load — repeated once; requires server-log triage; no fix claimed';
  return uiOwner(r.route,r.size);
}
async function publish(reason) {
  publications=publications.catch(()=>{}).then(async()=>{
    for(const branch of branches){const file=join(stateRoot,branch+'.json');if(await exists(file))metas.set(branch,JSON.parse(await readFile(file,'utf8')));}
    const lines=['# Cloud screen checks — October 19, 2026','',`Updated ${new Date().toISOString()}. ${reason}. **Partial evidence until every branch is marked complete.**`,'','Cloud owner: Codex (`codex/premium-backend`). Fictional owned loopback PostgreSQL 17.11; Node 24.19.0; isolated Playwright Chromium/WebKit. No UI edits, merges or deployment. Exact source snapshots are unchanged.','',
    '## Coordination with Setup NEVORA','',
    'Jose requested coordination with the separate Setup NEVORA chat. This session cannot open another ChatGPT conversation. Shared handoffs read: HANDOFF.md, README.md, CODEX-LOCAL-PROMPT.md, SNAPSHOTS-2026-10-19.md and LOAD-2026-10-19.md. This report is the cloud handoff; acknowledgement by the other chat is unverified. Existing Profile and inbox-count backend fixes remain separate from the Claude snapshots.','',
    '## Matrix and evidence','',
    '`checks.mjs` comes unchanged from the tools checkout at `2ab131ba004f3f26cc2b21ad95c90a6e0645259b`. Each preview has one checker at a time. Full widths: `320,360,390,430,844x390,768,1024,1440`; text: `100,125,150,200`; browsers: Chromium/WebKit. The second axe pass uses `390,1440`, text `100`. The preload blocks external HTTP/WebSocket requests and detects redirects so Home is not counted as another page.','',
    'The original tools seed runs first. Supplemental fictional fixtures add one published future shift to each payroll account (otherwise Swap/Unable to work redirect), publish an update after ON/BREAK are seeded, and produce real TEMPLATE_UNAVAILABLE copy receipts for Manager/Owner. Exact routes, role exclusions and IDs are in route-inventory.json. Copy receipts therefore cover the unavailable-template result, not a successful copy workflow.','',
    'Raw results are unchanged JSON from PREVIEW_OUT/checks; batch logs preserve the original detail lines. Main counts use one final observation per cell per pass; initial timeout/server candidates are replaced only by their one identical retry, whose raw file is also retained. Separate initial/retry tables preserve both. A timeout or 5xx alone does not prove load was the cause.','',
    'Host packages were extracted from authenticated Debian packages into a user-owned folder. WebKit’s bundle requires copies of those libraries in its own sys/lib. Its ldconfig-only host precheck cannot see user-installed GLES, so that precheck is skipped after direct dlopen and actual Chromium/WebKit rendering checks; browser execution itself is required.','',
    '## Branch status','',
    '| Branch | Source commit | Status | Final passed | Final failed | Observed / planned |','|---|---|---|---:|---:|---:|'];
    const sections=[];
    const bootstrap='/workspace/nevora-bootstrap-evidence';
    if(await exists(bootstrap)){
      const dest=join(evidence,'claude/premium-phase-1/bootstrap');await mkdir(dest,{recursive:true});
      const records=[];
      for(const file of await readdir(bootstrap)){if(file.endsWith('.json'))records.push(...JSON.parse(await readFile(join(bootstrap,file),'utf8')));await copyFile(join(bootstrap,file),join(dest,file));}
      const failed=records.filter(r=>!r.ok);
      sections.push('','## Initial Phase 1 smoke checks','',`Source 2ab131ba004f3f26cc2b21ad95c90a6e0645259b, before the supplemental fixture setup. **${records.length-failed.length}/${records.length} passed; ${failed.length} failed.** These diagnostic runs are separate from the full matrix counts above. Raw JSON and console detail logs: [bootstrap evidence](cloud-checks/claude/premium-phase-1/bootstrap/).`,'', '| Route | Account | Width | Text | Browser | Check | Owner / disposition | checks.mjs detail line |','|---|---|---|---:|---|---|---|---|');
      const network=[];try{for(const line of (await readFile(join(bootstrap,'network-errors.jsonl'),'utf8')).trim().split('\n'))if(line)network.push(JSON.parse(line));}catch{}
      for(const r of failed)for(const check of checks(r))sections.push('| '+[r.route,r.account,r.size,r.text,r.engine,check,classify(r,check,network),detail(r)].map(escape).join(' | ')+' |');
    }
    for(const branch of branches){const m=metas.get(branch);if(!m){lines.push(`| claude/${branch} | Pending refresh | Queued | — | — | — |`);continue;}
      const records=new Map(),initials=[],network=[];let seen=0;
      try{for(const line of (await readFile(join(m.out,'network-errors.jsonl'),'utf8')).trim().split('\n'))if(line)network.push(JSON.parse(line));}catch{}
      const evidencePath=m.large?'claude/premium-phase-1/large':'claude/'+branch;
      const dest=join(evidence,evidencePath);await mkdir(dest,{recursive:true});
      for(const batch of m.batches??[]){if(!batch.file)continue;const raw=await readFile(batch.file,'utf8');await writeFile(join(dest,batch.name+'.json'),raw);const values=JSON.parse(raw);if(batch.kind==='retry'){for(const r of values)records.set(batch.pass+key(r),r);}else{for(const r of values){records.set(batch.pass+key(r),r);seen++;if(serverCandidate(r))initials.push({r,pass:batch.pass});}}
        if(batch.log&&await exists(batch.log))await copyFile(batch.log,join(dest,batch.name+'.log'));
      }
      if(await exists(join(m.out,'route-inventory.json')))await copyFile(join(m.out,'route-inventory.json'),join(dest,'route-inventory.json'));
      if(network.length)await writeFile(join(dest,'network-errors.json'),JSON.stringify(network,null,1));
      if(m.timings)await writeFile(join(dest,'load-times.json'),JSON.stringify(m.timings,null,2));
      await writeFile(join(dest,'manifest.json'),JSON.stringify(m,null,2));
      const result=[...records.values()],fail=result.filter(r=>!r.ok),pass=result.length-fail.length;
      const label=m.branch+(m.large?' (large data)':'');
      lines.push(`| ${label} | \`${m.commit}\` | ${m.status} | ${pass} | ${fail.length} | ${seen} / ${m.planned??'pending inventory'} |`);
      sections.push('',`## ${label}`,'',`Source: \`${m.commit}\`. ${m.status}. ${pass} passed; ${fail.length} failed. Completed checker batches: ${(m.batches??[]).filter(b=>b.kind!=='retry').length}. Raw evidence: [cloud-checks/${evidencePath}/](cloud-checks/${evidencePath}/).`,'');
      if(m.error)sections.push('Execution blocker: '+escape(m.error),'');
      if(m.timings){sections.push('Browser load times in milliseconds; cold development compilation may be included. Each row also records TTFB and DOMContentLoaded in load-times.json.','', '| Route | Account | Width | Browser | Navigation ms | Status |','|---|---|---:|---|---:|---:|');for(const t of m.timings)sections.push('| '+[t.route,t.account,t.width,t.browser,t.navigationMs,t.status].map(escape).join(' | ')+' |');sections.push('');}
      sections.push('| Route | Account | Width | Text | Browser | Check | Owner / disposition | checks.mjs detail line |','|---|---|---|---:|---|---|---|---|');
      for(const r of fail)for(const check of checks(r))sections.push('| '+[r.route,r.account,r.size,r.text,r.engine,check,classify(r,check,network),detail(r)].map(escape).join(' | ')+' |');
      if(!fail.length)sections.push('| — | — | — | — | — | — | No failed cells recorded yet | — |');
      sections.push('', '### Timeout and server observations (separate from UI findings)','', '| Route | Account | Width | Text | Browser | Initial detail | Retry outcome |','|---|---|---|---:|---|---|---|');
      for(const {r,pass:p} of initials){const final=records.get(p+key(r));sections.push('| '+[r.route,r.account,r.size,r.text,r.engine,detail(r),final!==r?(final.ok?'Passed on identical retry':detail(final)):'Pending retry'].map(escape).join(' | ')+' |');}
      if(!initials.length)sections.push('| — | — | — | — | — | None recorded | — |');
    }
    lines.push(...sections,'','## Remaining gates','','Large-data premium-phase-1 is a separate preview and remains pending unless its own evidence is present. Load timings are browser measurements in local development mode, not hosted capacity certification. Build, full Vitest, TypeScript and lint on the merged release candidate remain pending Jose’s merge notice. No release approval is implied.','');
    await writeFile(join(repo,'docs/product/specs/codex-joint/CLOUD-CHECKS.md'),lines.join('\n'));
    git('add','docs/product/specs/codex-joint/CLOUD-CHECKS.md',...(metas.size?['docs/product/specs/codex-joint/cloud-checks']:[]));
    const changed=git('diff','--cached','--name-only');if(!changed)return;
    git('commit','-m','test: publish cloud screen-check evidence — '+reason);
    try{git('push','origin','HEAD:refs/heads/codex/premium-backend');console.log('PUBLISHED '+reason);}
    catch(error){await writeFile(join(stateRoot,'publication-error.txt'),'Push failed; local commits retained. No force push or merge attempted.\n'+error.message);console.error('PUBLICATION_BLOCKED '+error.message);}
  });
  return publications.catch(error=>{console.error('PUBLICATION_ERROR '+error.message);});
}
function serverCandidate(r){return r.status>=500||r.errors?.some(e=>/load:.*(?:Timeout|timed out)|status of 50[0-9]|HTTP.*50[0-9]/i.test(e));}
async function batch(meta,job,width,browser,pass,text='100,125,150,200',routes=job.routes,kind='matrix') {
  const n=String(meta.batches.length+1).padStart(5,'0'),name=n+'-'+pass+'-'+job.account+'-'+browser+'-'+width+(kind==='retry'?'-retry':'');
  const log=join(stateRoot,meta.key+'-'+name+'.log');
  const before=new Set(await readdir(join(meta.out,'checks')).catch(()=>[]));
  const args=['--routes',routes.join(','),'--accounts',job.account,'--widths',width,'--text',text,'--browsers',browser,...(pass==='axe'?['--axe']:[])];
  const result=await run(join(tools,'scripts/ui-checks/checks.mjs'),args,{guard:true,log,env:{PREVIEW_OUT:meta.out,NEVORA_CHECK_ORIGIN:meta.url,NEVORA_CHECK_VERIFY_ROUTE:'1',NEVORA_CHECK_ACCOUNT:job.account,NEVORA_CHECK_DIAGNOSTICS:join(meta.out,'network-errors.jsonl')}});
  const files=(await readdir(join(meta.out,'checks')).catch(()=>[])).filter(f=>f.endsWith('.json')&&!before.has(f));
  if(files.length!==1)throw Error(`Checker exited ${result.code}; expected one JSON result, got ${files.length}. See ${log}`);
  const file=join(meta.out,'checks',files[0]),values=JSON.parse(await readFile(file,'utf8'));
  const expected=routes.length*text.split(',').length;
  if(values.length!==expected)throw Error(`Incomplete checker batch: ${values.length}/${expected}; see ${log}`);
  meta.batches.push({name,pass,kind,file,log,args,code:result.code,passed:values.filter(r=>r.ok).length,failed:values.filter(r=>!r.ok).length});
  await save(meta);console.log(`BATCH ${meta.key} ${name}: ${values.filter(r=>r.ok).length}/${values.length}`);
  if(kind!=='retry')for(const r of values.filter(serverCandidate))await batch(meta,{account:r.account,routes:[r.route]},r.size,r.engine,pass,String(r.text),[r.route],'retry');
}
async function work(branch,index) {
  const large=branch==='premium-phase-1-large';
  const keyName=branch,branchName='claude/'+(large?'premium-phase-1':branch),source='/workspace/nevora-sources/'+(large?'premium-phase-1':branch),out='/workspace/nevora-previews/'+branch;
  const prior=await exists(join(stateRoot,keyName+'.json'))?JSON.parse(await readFile(join(stateRoot,keyName+'.json'),'utf8')):null;
  const meta=prior??{key:keyName,branch:branchName,source,out,large,commit:git('rev-parse','origin/'+branchName),toolsCommit:git('-C',tools,'rev-parse','HEAD'),startedAt:new Date().toISOString(),status:'Starting preview',batches:[]};
  metas.set(keyName,meta);await save(meta);
  if(index===0)await publish('branch workers starting');
  if(meta.status==='Complete')return;
  let runtime;
  try{
    if(!await exists(source)){git('worktree','add','--detach',source,meta.commit);execFileSync('cp',['-al',join(tools,'node_modules'),join(source,'node_modules')]);}
    if(!await exists(join(out,'route-inventory.json'))){
      {
        const log=join(stateRoot,keyName+'-runtime.log');let readyResolve,readyReject;
        const ready=new Promise((r,j)=>{readyResolve=r;readyReject=j;});
        const running=run(join(tools,'scripts/ui-checks/preview-runtime.mjs'),[],{tsx:true,log,env:{PREVIEW_OUT:out,PREVIEW_SOURCE:source},onChild:child=>{runtime=child;meta.runtimePid=child.pid;},onOutput:chunk=>{const match=/PREVIEW_READY (http:\/\/127\.0\.0\.1:\d+)/.exec(chunk);if(match)readyResolve(match[1]);}});
        running.then(result=>readyReject(Error('Preview stopped before readiness, exit '+result.code+'; '+log))).catch(readyReject);
        const timeout=setTimeout(()=>readyReject(Error('Preview bootstrap exceeded 5 minutes; '+log)),300000);meta.url=await ready;clearTimeout(timeout);
        const seed=await run(join(tools,'scripts/ui-checks/seed-extra.mts'),large?['--large']:[],{tsx:true,log:join(stateRoot,keyName+'-seed.log'),env:{PREVIEW_OUT:out}});if(seed.code)throw Error('seed-extra failed');
        const login=await run(join(tools,'scripts/ui-checks/login.mjs'),['AUDIT-E','AUDIT-LEAD','AUDIT-ON','AUDIT-BREAK','AUDIT-LONG','payroll-qa-a','payroll-qa-b','AUDIT-M','QAOWNER'],{guard:true,log:join(stateRoot,keyName+'-login.log'),env:{PREVIEW_OUT:out,NEVORA_CHECK_ORIGIN:meta.url}});if(login.code)throw Error('Login script failed');
      }
      const inventory=await run(join(repo,'scripts/ui-checks/cloud-inventory.mjs'),[],{tsx:true,log:join(stateRoot,keyName+'-inventory.log'),env:{PREVIEW_OUT:out,PREVIEW_SOURCE:source}});if(inventory.code)throw Error('Route inventory/fixture setup failed');
    }
    if(!meta.url){const ev=(await readdir(out)).filter(n=>n.startsWith('evidence-')).sort().at(-1);meta.url=JSON.parse(await readFile(join(out,ev,'runtime.json'),'utf8')).url;}
    const inventory=JSON.parse(await readFile(join(out,'route-inventory.json'),'utf8'));
    if(large){const wanted=['/app','/app/inbox','/app/schedule','/app/employees','/app/timecards','/app/payroll-export','/app/reports'];inventory.jobs=inventory.jobs.filter(j=>['AUDIT-M','QAOWNER'].includes(j.account)).map(j=>({...j,routes:j.routes.filter(r=>wanted.includes(r))}));}
    meta.planned=inventory.jobs.reduce((n,j)=>n+j.routes.length,0)*68;meta.status='Running matrix';await save(meta);
    if(large&&!meta.timings){const result=await run(join(repo,'scripts/ui-checks/cloud-load-times.mjs'),[],{guard:true,log:join(stateRoot,keyName+'-load-times.log'),env:{PREVIEW_OUT:out,NEVORA_CHECK_ORIGIN:meta.url}});if(result.code)throw Error('Large-data load measurements failed');meta.timings=JSON.parse(await readFile(join(out,'load-times.json'),'utf8'));await save(meta);await publish('large-data load times');}
    const done=new Set(meta.batches.filter(b=>b.kind!=='retry').map(b=>JSON.stringify(b.args)));
    const jobs=[...inventory.jobs].sort((a,b)=>{const priority=branch.includes('profile')||branch.includes('wave')||branch.includes('desktop')?['QAOWNER','AUDIT-M']:['AUDIT-E','AUDIT-LEAD'];return (priority.indexOf(a.account)<0?9:priority.indexOf(a.account))-(priority.indexOf(b.account)<0?9:priority.indexOf(b.account));});
    let lastPublish=Date.now();
    for(const pass of ['matrix','axe'])for(const browser of ['chromium','webkit'])for(const width of (pass==='axe'?['390','1440']:widths))for(const job of jobs){
      const text=pass==='axe'?'100':'100,125,150,200';const args=['--routes',job.routes.join(','),'--accounts',job.account,'--widths',width,'--text',text,'--browsers',browser,...(pass==='axe'?['--axe']:[])];
      if(done.has(JSON.stringify(args)))continue;
      await batch(meta,job,width,browser,pass,text);
      if(meta.batches.length===1||Date.now()-lastPublish>1800000){await publish(branch+' partial');lastPublish=Date.now();}
    }
    meta.status='Complete';meta.completedAt=new Date().toISOString();await save(meta);await publish(branch+' complete');
  }catch(error){meta.status='Blocked';meta.error=error.message;await save(meta);console.error('BLOCKED '+branch+' '+error.message);await publish(branch+' blocked');}
  finally{if(runtime)runtime.kill('SIGTERM');else if(meta.runtimePid){try{process.kill(meta.runtimePid,'SIGTERM');}catch(error){if(error.code!=='ESRCH')throw error;}}}
}

console.log('CLOUD_RUN_STARTED '+new Date().toISOString());
if(process.env.NEVORA_REPORT_ONLY==='1'){
  for(const branch of branches){const file=join(stateRoot,branch+'.json');if(await exists(file))metas.set(branch,JSON.parse(await readFile(file,'utf8')));}
  await publish('interim smoke and progress');
}else{
// Refresh all remote tips in one git operation, then freeze them per preview.
git('fetch','origin');
// /tmp is memory-backed in this executor. Keep app/dependency mirrors on disk
// and limit whole previews, not just individual browser processes.
const queue=['premium-phase-1','p35-profile-6cdee8','premium-phase-1-large','p35-wave-a-1283c8','p35-wave-b-808dfd','p35-wave-c-93e13c','p4-desktop-240fe0'];
async function consume(){while(queue.length){const branch=queue.shift();await work(branch,branches.indexOf(branch));}}
await Promise.allSettled(Array.from({length:6},consume));
await publish('all branch workers finished');
console.log('CLOUD_RUN_FINISHED '+new Date().toISOString());
}
