// Serial, resumable orchestrator. The coordinator checker stays byte-identical.
import {readFile,writeFile,mkdir,readdir,open,rename,unlink,copyFile} from 'node:fs/promises';
import {join,resolve} from 'node:path';
import {spawn,execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {jobs,summary,checkpoint,sourceCheckpoint,checkerSha256,manualStateJobs,earlierIds} from './plan.mjs';
const arg=(name,fallback)=>{const i=process.argv.indexOf('--'+name);return i<0?fallback:process.argv[i+1];};
if(process.argv.includes('--plan')){console.log(JSON.stringify({summary:summary(),manualStateJobs,earlierIds},null,2));process.exit(0);}
if(process.env.NEVORA_WC_EXIT_RELEASE!=='root-released')throw Error('Preview/browser execution remains held until the root agent releases the candidate gates. This runner does not start previews.');
const expected=process.env.EXPECTED_SOURCE_SHA??checkpoint,source=resolve(process.env.PREVIEW_SOURCE??'/workspace/ready-wave-c');
const actual=execFileSync('git',['-C',source,'rev-parse','HEAD'],{encoding:'utf8'}).trim();
if(actual!==expected)throw Error('Source SHA differs from EXPECTED_SOURCE_SHA');
if(execFileSync('git',['-C',source,'status','--porcelain','--untracked-files=no'],{encoding:'utf8'}).trim())throw Error('Source has tracked changes');
const preview=resolve(process.env.PREVIEW_OUT??'/workspace/paused-previews/wave-c-complete');
const out=resolve(process.env.WC_EXIT_OUT??join(import.meta.dirname,expected));
await mkdir(out,{recursive:true});
const lock=join(preview,'wave-c-exit-worker.lock');
try{const l=await open(lock,'wx');await l.writeFile(JSON.stringify({pid:process.pid,source,expected,started:new Date().toISOString()}));await l.close();}
catch(e){if(e.code!=='EEXIST')throw e;const owner=JSON.parse(await readFile(lock,'utf8'));try{process.kill(owner.pid,0);throw Error('An owned exit worker is already live');}catch(err){if(err.code!=='ESRCH')throw err;}await rename(lock,lock+'.stale-'+Date.now());const l=await open(lock,'wx');await l.writeFile(JSON.stringify({pid:process.pid,source,expected}));await l.close();}
let child=null,stopping=false,probes;
for(const signal of ['SIGINT','SIGTERM'])process.once(signal,()=>{stopping=true;child?.kill('SIGTERM');});
const stage=arg('stage','matrix'),limit=Number(arg('limit','Infinity')),only=arg('job',null),selected=jobs.filter(j=>(stage==='all'||j.stage===stage)&&(!only||j.id===only));
const indexPath=join(out,'index.json');let index;try{index=JSON.parse(await readFile(indexPath,'utf8'));if(index.checkpoint!==expected)throw Error('Evidence SHA mismatch');}catch(e){if(e.code!=='ENOENT')throw e;index={checkpoint:expected,source,checkerSha256,created:new Date().toISOString(),jobs:{}};}
const save=async()=>{const temp=indexPath+'.tmp';await writeFile(temp,JSON.stringify(index,null,2));await rename(temp,indexPath);};
const runChild=(args,log,extraEnv={})=>new Promise(async(resolveChild,reject)=>{const fd=await open(log,'w');child=spawn(process.execPath,args,{env:{...process.env,PREVIEW_OUT:preview,EXPECTED_SOURCE_SHA:expected,...extraEnv},stdio:['ignore',fd.fd,fd.fd]});child.once('error',async e=>{await fd.close();child=null;reject(e);});child.once('exit',async(code,signal)=>{await fd.close();child=null;resolveChild({code,signal});});});
try{
 const runs=(await readdir(preview)).filter(n=>n.startsWith('evidence-')).sort();if(!runs.length)throw Error('No owned preview; startup is deliberately separate');
 const access=JSON.parse(await readFile(join(preview,runs.at(-1),'access.json'),'utf8'));if(access.checkpoint!==expected)throw Error('Preview SHA differs from source');
 const runtime=JSON.parse(await readFile(join(preview,runs.at(-1),'runtime.json'),'utf8')),ownership=JSON.parse(await readFile(join(runtime.root,'ownership.json'),'utf8'));if(ownership.closed||resolve(ownership.source)!==source)throw Error('The owned preview is closed or belongs to another source worktree');
 const checker='/workspace/wc-runtime/scripts/ui-checks/checks.mjs';if(createHash('sha256').update(await readFile(checker)).digest('hex')!==checkerSha256)throw Error('The coordinator checker changed; pin and review its new hash before proceeding');
 await writeFile(join(out,'plan.json'),JSON.stringify({checkpoint:expected,preparedFrom:sourceCheckpoint,summary:summary(),jobs,manualStateJobs,earlierIds},null,2));
 let count=0;
 for(const job of selected){
  if(stopping||count>=limit)break;
  if(['captured','completed','issue'].includes(index.jobs[job.id]?.status)&&!process.argv.includes('--retry'))continue;
  if(index.jobs[job.id]?.status==='gap'&&!process.argv.includes('--retry'))continue;
  const dir=join(out,job.id,'attempt-'+new Date().toISOString().replace(/[:.]/g,'-'));await mkdir(dir,{recursive:true});const started=Date.now(),previous=index.jobs[job.id],history=[...(previous?.history??[]),...(previous?[{status:previous.status,directory:previous.directory,started:previous.started,finished:previous.finished,error:previous.error,durationMs:previous.durationMs}]:[])];
  index.jobs[job.id]={status:'running',job,directory:dir,history,started:new Date().toISOString()};await save();
  try{
   if(job.stage==='matrix'){
    const before=new Set(await readdir(join(preview,'checks')).catch(()=>[]));
    const collector=new URL('./after-check-collector.mjs',import.meta.url),cells=job.routes.map(route=>({engine:job.engine,account:job.account,size:job.size,text:job.text,route,axe:true})),collectorEnv={WC_COLLECTOR_CONTEXT:JSON.stringify({sha:expected,lineage:job.id+':'+runs.at(-1)+':'+Date.now(),report:join(dir,'passive-original'),engine:job.engine,cells})};
    const args=['--import',collector.href,checker,'--routes',job.routes.join(','),'--accounts',job.account,'--widths',job.size,'--text',String(job.text),'--browsers',job.engine,...(job.axe?['--axe']:[])];
    const exit=await runChild(args,join(dir,'checker.log'),collectorEnv);if(stopping)throw Error('Interrupted by coordinator');
    const fresh=(await readdir(join(preview,'checks'))).filter(n=>!before.has(n)).sort();if(fresh.length!==1)throw Error('Expected exactly one unchanged checker output');
    await copyFile(join(preview,'checks',fresh[0]),join(dir,'checks-original.json'));const rows=JSON.parse(await readFile(join(dir,'checks-original.json'),'utf8'));if(rows.length!==job.cells)throw Error('Checker output is incomplete');
    const loadOnly=rows.filter(r=>(r.status>=500||r.errors?.some(e=>e.startsWith('load:'))));
    let retryRows=[];
    if(loadOnly.length){
     const retryBefore=new Set(await readdir(join(preview,'checks'))),retryArgs=[...args];retryArgs[retryArgs.indexOf('--routes')+1]=loadOnly.map(r=>r.route).join(',');await runChild(retryArgs,join(dir,'load-retry.log'),{WC_COLLECTOR_CONTEXT:JSON.stringify({sha:expected,lineage:job.id+':'+runs.at(-1)+':retry:'+Date.now(),report:join(dir,'passive-load-retry'),engine:job.engine,cells:cells.filter(c=>loadOnly.some(r=>r.route===c.route))})});
     const retryFresh=(await readdir(join(preview,'checks'))).filter(n=>!retryBefore.has(n)).sort();if(retryFresh.length===1){await copyFile(join(preview,'checks',retryFresh[0]),join(dir,'checks-load-retry-original.json'));retryRows=JSON.parse(await readFile(join(dir,'checks-load-retry-original.json'),'utf8'));}
    }
    const passiveFiles=await readdir(join(dir,'passive-original','cells')).catch(()=>[]),passiveErrors=[];for(const file of passiveFiles){const r=JSON.parse(await readFile(join(dir,'passive-original','cells',file),'utf8'));if(r.collectionError)passiveErrors.push(r.collectionError);}
    const effective=rows.map(row=>loadOnly.includes(row)?retryRows.find(r=>r.route===row.route)??row:row),unresolvedLoad=effective.filter(r=>r.status>=500||r.errors?.some(e=>e.startsWith('load:')));
    index.jobs[job.id]={...index.jobs[job.id],status:effective.every(r=>r.ok)?'completed':unresolvedLoad.length?'gap':'issue',exit,rows:rows.length,originalFailed:rows.filter(r=>!r.ok).length,effectiveFailed:effective.filter(r=>!r.ok).length,passiveFacts:passiveFiles.length,passiveErrors,passiveComplete:passiveFiles.length===job.cells&&!passiveErrors.length,loadRetries:loadOnly.length,unresolvedLoad:unresolvedLoad.length,review:'Unchanged original and isolated load-retry files preserved; UI failures require triage'};
   }else{
    probes??=await import('./probes.mjs');const result=await probes.runJob({job,preview,source,checkpoint:expected,dir,url:access.url});await writeFile(join(dir,'observations.json'),JSON.stringify(result,null,2));index.jobs[job.id]={...index.jobs[job.id],status:result.gap?'gap':'captured',review:'Human judgment pending; capture never closes a finding',gap:result.gap??null};
   }
  }catch(e){index.jobs[job.id]={...index.jobs[job.id],status:stopping?'interrupted':'gap',error:e.message};}
  index.jobs[job.id].durationMs=Date.now()-started;index.jobs[job.id].finished=new Date().toISOString();await save();count++;console.log(job.id,index.jobs[job.id].status);
 }
 console.log(JSON.stringify({checkpoint:expected,stage,ran:count,remaining:selected.filter(j=>!['completed','issue','captured'].includes(index.jobs[j.id]?.status)).length,output:out}));
}finally{await probes?.close();await save();await unlink(lock);}
