// External inspection orchestration. Does not edit application source or start a preview.
// Default is a dry run. --execute additionally requires DESKTOP_RELEASED_SHA=<exact SHA>.
import {readFile,writeFile,mkdir,readdir,open,unlink,rename} from 'node:fs/promises';
import {resolve,join} from 'node:path';
import {execFileSync,spawn} from 'node:child_process';
import {createHash} from 'node:crypto';
import {collectionPolicy} from './collection-policy.mjs';

const arg=(name,fallback)=>{const i=process.argv.indexOf('--'+name);return i<0?fallback:process.argv[i+1];};
const source=resolve(arg('source','/workspace/ready-desktop'));
const requested=arg('sha');
if(!requested || !/^[0-9a-f]{40}$/.test(requested))throw Error('Supply --sha with the exact 40-character source commit');
const git=(...args)=>execFileSync('git',args,{cwd:source,encoding:'utf8'}).trim();
const sha=git('rev-parse','HEAD');
if(sha!==requested)throw Error(`Source changed: requested ${requested}, found ${sha}`);
if(git('status','--porcelain','--untracked-files=no'))throw Error('Tracked source is dirty');
const checker=join(source,'scripts/ui-checks/checks.mjs');
const hash=x=>createHash('sha256').update(x).digest('hex');
const checkerHash=hash(await readFile(checker));
const collector=new URL('./after-check-collector.mjs',import.meta.url);
const collectorHash=hash(Buffer.concat(await Promise.all(['after-check-collector.mjs','geometry-measure.mjs','collection-policy.mjs','read-guard.cjs'].map(n=>readFile(new URL('./'+n,import.meta.url))))));
const report=resolve(arg('report',`/workspace/nevora-inspections/p4-desktop/ready-desktop/evidence/full-exit-${sha.slice(0,7)}`));
const preview=arg('preview')?resolve(arg('preview')):null;
const week=arg('week','2026-10-19');
const next=new Date(week+'T12:00:00Z');next.setUTCDate(next.getUTCDate()+7);
const manager=['/app','/app?view=attendance','/app?view=team','/app?view=activity','/app/inbox','/app/inbox?filter=now','/app/inbox?filter=requests','/app/inbox?filter=planning','/app/schedule','/app/employees','/app/employees?q=zzz','/app/employees?status=inactive','/app/timecards','/app/payroll-export','/app/requests','/app/exchange','/app/availability','/app/updates','/app/reports'];
const employee=['/app','/app/schedule','/app/schedule?view=open','/app/schedule?intent=swap','/app/requests/hub','/app/requests','/app/exchange','/app/availability','/app/my-time','/app/timecards','/app/my-pay','/app/profile','/app/updates','/app/notifications'];
const roleRoutes={QAOWNER:[...manager,'/app/payroll','/app/settings'],'AUDIT-M':manager,'AUDIT-E':employee,'AUDIT-LEAD':employee,'payroll-qa-a':employee,'payroll-qa-b':employee,'AUDIT-LONG':['/app'],'AUDIT-ON':['/app'],'AUDIT-BREAK':['/app'],'AUDIT-SWAP':['/app','/app/schedule','/app/schedule?view=open','/app/schedule?intent=swap']};
const accounts=Object.keys(roleRoutes),sizes=['1440','768','1024','390','320','761','1023','1179','1180','360','430','844x390'],texts=[100,125,150,200],engines=['chromium','webkit'];
const plan=[];
for(const engine of engines)for(const account of accounts)for(const size of sizes)for(const text of texts)for(const route of roleRoutes[account])plan.push({engine,account,size,text,route,axe:true});
const key=r=>JSON.stringify([r.engine,r.account,r.size,r.text,r.route,true]);
const execute=process.argv.includes('--execute');
if(!execute){console.log(JSON.stringify({mode:'dry-run',source,sha,tree:git('rev-parse','HEAD^{tree}'),checkerHash,collectorHash,report,fixtureWeek:week,baselineCells:plan.length,passiveJudgmentCells:plan.filter(collectionPolicy).length,duplicateGeometryVisits:0,groups:engines.length*accounts.length*sizes.length*texts.length,maximumFourRouteBatches:engines.length*sizes.length*texts.length*accounts.reduce((n,a)=>n+Math.ceil(roleRoutes[a].length/4),0),minimumFixedWaitMinutes:Math.round((2500*plan.length+600*plan.filter(r=>r.text!==100).length)/60000),historicalEvidence:'Original8012 not zero;35 smoke cells and bounded Inbox/typography proofs remain separate; no cross-SHA substitution',previewStarted:false,browserStarted:false},null,2));process.exit(0);}
if(process.env.DESKTOP_RELEASED_SHA!==sha)throw Error('Root has not released this exact SHA: DESKTOP_RELEASED_SHA must match --sha');
if(!preview)throw Error('Supply --preview with the owned running preview');
const runs=(await readdir(preview)).filter(n=>n.startsWith('evidence-')).sort();
const run=runs.at(-1);if(!run)throw Error('No owned preview evidence');
const audit=JSON.parse(await readFile(join(preview,run,'audit.json'),'utf8'));
if(audit.checkpoint!==sha)throw Error('Preview checkpoint does not match exact source');
if(audit.postgresStopped||audit.completedAt)throw Error('Preview is already closed');
if(audit.fixtureWeek!==week)throw Error('Fixture week mismatch');
const access=JSON.parse(await readFile(join(preview,run,'access.json'),'utf8'));
const host=new URL(access.url).hostname;
if(!['127.0.0.1','localhost','[::1]'].includes(host))throw Error('Preview must remain loopback-only');
for(const account of accounts)await readFile(join(preview,'state',account+'.json'));
const lineage=hash(JSON.stringify({sha,tree:audit.tree,fixtureDate:audit.fixtureDate,fixtureWeek:audit.fixtureWeek,previewRun:run,checkerHash,collectorHash,axe:true}));
await mkdir(join(report,'baseline'),{recursive:true});
const lockfile=join(preview,'desktop-serial-checks.lock');
const lock=await open(lockfile,'wx').catch(()=>{throw Error('Another checker owns the preview lock; inspect the owner before removing a stale lock');});
await lock.writeFile(JSON.stringify({pid:process.pid,sha,report,createdAt:new Date().toISOString()}));
const indexPath=join(report,'baseline','checkpoint.json');
let state;
try{state=JSON.parse(await readFile(indexPath,'utf8'));if(state.lineage!==lineage)throw Error('Existing checkpoint has different source, fixture lineage, checker or collector');}catch(e){if(e.code==='ENOENT')state={sha,lineage,checkerHash,collectorHash,fixtureWeek:week,previewRun:run,records:{},batches:[],totalCells:plan.length};else{await lock.close();await unlink(lockfile);throw e;}}
const flush=async()=>{state.updatedAt=new Date().toISOString();const temp=indexPath+'.tmp';await writeFile(temp,JSON.stringify(state,null,1));await rename(temp,indexPath);};
let child,stopping=false;
const stop=()=>{stopping=true;child?.kill('SIGTERM');};
process.on('SIGINT',stop);process.on('SIGTERM',stop);
const maxBatches=Number(arg('max-batches','Infinity'));let invoked=0;
try{
  await writeFile(join(report,'baseline','plan.json'),JSON.stringify({sha,lineage,checkerHash,collectorHash,fixtureWeek:week,cells:plan,passiveJudgmentCells:plan.filter(collectionPolicy),duplicateGeometryVisits:0},null,1));
  await flush();
  for(const engine of engines)for(const account of accounts)for(const size of sizes)for(const text of texts){
    const remaining=plan.filter(r=>r.engine===engine&&r.account===account&&r.size===size&&r.text===text&&!state.records[key(r)]);
    for(let start=0;start<remaining.length;start+=4){
      if(stopping||invoked>=maxBatches)break;
      if(git('rev-parse','HEAD')!==sha||git('status','--porcelain','--untracked-files=no')||hash(await readFile(checker))!==checkerHash)throw Error('Source/checker changed during sweep');
      const cells=remaining.slice(start,start+4),id=String(state.batches.length+1).padStart(4,'0');
      const logPath=join(report,'baseline',`batch-${id}.log`),log=await open(logPath,'w');
      const before=new Set(await readdir(join(preview,'checks')).catch(()=>[]));
      const startedAt=new Date().toISOString();
      let exitCode;
      try{exitCode=await new Promise((yes,no)=>{child=spawn(process.execPath,['--require',new URL('./read-guard.cjs',import.meta.url).pathname,'--import',collector.href,checker,'--routes',cells.map(r=>r.route).join(','),'--accounts',account,'--widths',size,'--text',String(text),'--browsers',engine,'--axe'],{cwd:source,env:{...process.env,PREVIEW_OUT:preview,NEVORA_CHECK_ORIGIN:access.url,NEVORA_CHECK_VERIFY_ROUTE:'1',NEVORA_CHECK_ACCOUNT:account,NEVORA_CHECK_DIAGNOSTICS:join(report,'baseline','network.jsonl'),DESKTOP_COLLECTOR_CONTEXT:JSON.stringify({sha,lineage,report,engine,cells})},stdio:['ignore',log.fd,log.fd]});child.once('error',no);child.once('close',yes);});}
      finally{child=null;await log.close();}
      const fresh=(await readdir(join(preview,'checks')).catch(()=>[])).filter(n=>n.endsWith('.json')&&!before.has(n)).sort();
      let resultFile=null,count=0;
      if(fresh.length===1){const raw=await readFile(join(preview,'checks',fresh[0]),'utf8'),rows=JSON.parse(raw);resultFile=join(report,'baseline',`batch-${id}.json`);await writeFile(resultFile,raw);
        for(const row of rows){const k=key(row);if(cells.some(r=>key(r)===k)){state.records[k]={...row,sha,lineage,axeRequested:true,resultFile};count++;}}
      }
      state.batches.push({id,startedAt,completedAt:new Date().toISOString(),cells,exitCode,resultFile,logPath,recorded:count,interrupted:stopping});
      await flush();invoked++;
      console.log(JSON.stringify({batch:id,completed:Object.keys(state.records).length,total:plan.length,recorded:count,exitCode,stopping}));
      if(count!==cells.length&&!stopping)throw Error(`Incomplete checker batch ${id}; completed earlier batches are preserved. Inspect log, then resume.`);
    }
  }
}finally{await flush();await lock.close();await unlink(lockfile);}
const records=Object.values(state.records),failed=records.filter(r=>!r.ok).length;
console.log(JSON.stringify({sha,complete:records.length===plan.length,recorded:records.length,total:plan.length,checkerFailures:failed,stopped:stopping,checkpoint:indexPath}));
process.exitCode=stopping?130:failed?1:records.length===plan.length?0:2;
