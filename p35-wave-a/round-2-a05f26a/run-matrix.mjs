import {spawn} from 'node:child_process';
import {readFile,readdir,writeFile,copyFile} from 'node:fs/promises';
import {join} from 'node:path';
const dest=import.meta.dirname,out=process.env.PREVIEW_OUT;
const run=(await readdir(out)).filter(n=>n.startsWith('evidence-')).sort().at(-1);
const {url,checkpoint}=JSON.parse(await readFile(join(out,run,'access.json'),'utf8'));
const {coverage}=JSON.parse(await readFile(join(dest,'coverage-route.json'),'utf8'));
const management=['/app/schedule/new','/app/schedule/edit?shiftId=audit-shift-0-1',coverage,
 '/app/schedule/copy-receipt?operation=11111111-1111-4111-8111-111111111111',
 '/app/requests?tab=pending','/app/exchange?tab=pending','/app/availability',
 '/app/employees/AUDIT-LONG','/app/employees/new','/app/employees/AUDIT-E/clocker-pin'];
const jobs=[];
for(const account of ['AUDIT-M','QAOWNER'])for(let i=0;i<management.length;i+=2)jobs.push({account,routes:management.slice(i,i+2)});
jobs.push({account:'AUDIT-E',routes:['/app/exchange/swap?sourceShiftId=audit-next-0-1','/app/exchange/callout?shiftId=audit-shift-1-1']});
jobs.push({account:'AUDIT-LEAD',routes:['/app/exchange/swap?sourceShiftId=x-audit-next-AUDIT-LEAD-2','/app/exchange/callout?shiftId=x-audit-next-AUDIT-LEAD-3']});
const summary={checkpoint,startedAt:new Date().toISOString(),checker:'/workspace/NEVORA/scripts/ui-checks/checks.mjs (unchanged)',jobs:[]};
for(let n=0;n<jobs.length;n++){
 const job=jobs[n],record={...job,startedAt:new Date().toISOString()};summary.jobs.push(record);
 const before=await readdir(join(out,'checks')).catch(()=>[]);
 const args=['--require','/workspace/NEVORA/scripts/ui-checks/cloud-network-guard.cjs','--require',join(dest,'readonly-checker.cjs'),'/workspace/NEVORA/scripts/ui-checks/checks.mjs',
  '--routes',job.routes.join(','),'--accounts',job.account,'--widths','320,360,390,430,844x390,768,1024,1440','--text','100,125,150,200','--browsers','chromium,webkit','--axe'];
 const log=await new Promise(resolve=>{
  const child=spawn(process.execPath,args,{cwd:'/workspace/NEVORA',env:{...process.env,NEVORA_CHECK_ORIGIN:url},stdio:['ignore','pipe','pipe']});
  let output='';child.stdout.on('data',s=>output+=s);child.stderr.on('data',s=>output+=s);child.on('exit',code=>resolve({code,output}));
 });
 record.exitCode=log.code;record.completedAt=new Date().toISOString();
 await writeFile(join(dest,`checks-${String(n+1).padStart(2,'0')}.log`),log.output);
 const files=(await readdir(join(out,'checks')).catch(()=>[])).filter(f=>!before.includes(f)&&f.endsWith('.json'));
 for(const file of files){record.result=`checks-${String(n+1).padStart(2,'0')}.json`;await copyFile(join(out,'checks',file),join(dest,record.result));const rows=JSON.parse(await readFile(join(dest,record.result),'utf8'));record.cells=rows.length;record.rawPass=rows.filter(r=>r.ok).length;}
 await writeFile(join(dest,'matrix-summary.json'),JSON.stringify(summary,null,2));
 console.log(JSON.stringify({job:n+1,total:jobs.length,account:job.account,cells:record.cells,exit:record.exitCode,completedAt:record.completedAt}));
}
summary.completedAt=new Date().toISOString();await writeFile(join(dest,'matrix-summary.json'),JSON.stringify(summary,null,2));
const all=[];for(const r of summary.jobs)if(r.result)all.push(...JSON.parse(await readFile(join(dest,r.result),'utf8')));
await writeFile(join(dest,'checks-matrix.json'),JSON.stringify(all,null,1));
console.log(JSON.stringify({completed:true,checkpoint,cells:all.length,rawPass:all.filter(r=>r.ok).length}));
