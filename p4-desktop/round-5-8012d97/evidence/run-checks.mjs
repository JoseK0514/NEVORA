import {spawn} from 'node:child_process';
import {readFile,readdir,writeFile,copyFile} from 'node:fs/promises';
import {join} from 'node:path';
const out='/workspace/paused-previews/desktop';
const evidence='/workspace/nevora-inspections/p4-desktop/round-5-8012d97/evidence';
const root='/workspace/inspect-desktop';
const runs=(await readdir(out)).filter(n=>n.startsWith('evidence-')).sort();
const {url}=JSON.parse(await readFile(join(out,runs.at(-1),'access.json'),'utf8'));
const manager=['/app','/app?view=attendance','/app?view=team','/app?view=activity','/app/inbox','/app/inbox?filter=now','/app/inbox?filter=requests','/app/inbox?filter=planning','/app/schedule','/app/employees','/app/employees?q=zzz','/app/employees?status=inactive','/app/timecards','/app/payroll-export','/app/requests','/app/exchange','/app/availability','/app/updates','/app/reports'];
const employee=['/app','/app/schedule','/app/schedule?view=open','/app/schedule?intent=swap','/app/requests/hub','/app/requests','/app/exchange','/app/availability','/app/my-time','/app/timecards','/app/my-pay','/app/profile','/app/updates','/app/notifications'];
const accounts={QAOWNER:[...manager,'/app/payroll','/app/settings'], 'AUDIT-M':manager,'AUDIT-E':employee,'AUDIT-LEAD':employee};
const widths=process.env.DESKTOP_WIDTHS?.split(',')??['1440','768','1024','390','320','761','1023','1179','1180','360','430','844x390'];
const engines=process.env.DESKTOP_BROWSERS?.split(',')??['chromium','webkit'];
const texts=process.env.DESKTOP_TEXTS??'100';
const selected=process.env.DESKTOP_ACCOUNTS?.split(',')??Object.keys(accounts);
const records=[];
await writeFile(join(evidence,'checker-plan.json'),JSON.stringify({source:'8012d9790e72987140f939c7d70e1df9612ea009',accounts,widths,engines,texts,startedAt:new Date().toISOString()},null,2));
for(const width of widths) for(const engine of engines) for(const account of selected){
 const label=`${account}-${engine}-${width}-${texts.replaceAll(',','_')}`;
 console.log('BATCH_START '+label);
 const before=new Set(await readdir(join(out,'checks')).catch(()=>[]));
 const args=['--require','/workspace/NEVORA/scripts/ui-checks/cloud-network-guard.cjs',join(root,'scripts/ui-checks/checks.mjs'),'--routes',accounts[account].join(','),'--accounts',account,'--widths',width,'--text',texts,'--browsers',engine,...(process.env.DESKTOP_AXE==='1'?['--axe']:[])];
 const code=await new Promise((resolve,reject)=>{const c=spawn(process.execPath,args,{cwd:root,env:{...process.env,PREVIEW_OUT:out,PLAYWRIGHT_RUNTIME_ROOT:'/workspace/nevora-browser-runtime/node_modules',NEVORA_CHECK_ORIGIN:url,NEVORA_CHECK_VERIFY_ROUTE:'1',NEVORA_CHECK_ACCOUNT:account,NEVORA_CHECK_DIAGNOSTICS:join(evidence,'checker-network.jsonl')},stdio:['ignore','pipe','pipe']});let log='';for(const s of [c.stdout,c.stderr])s.on('data',d=>{const t=d.toString();log+=t;process.stdout.write(t);});c.on('error',reject);c.on('close',async n=>{await writeFile(join(evidence,'checker-'+label+'.log'),log);resolve(n);});});
 const added=(await readdir(join(out,'checks'))).filter(n=>!before.has(n));
 for(const file of added){await copyFile(join(out,'checks',file),join(evidence,'checks-'+label+'.json'));const data=JSON.parse(await readFile(join(out,'checks',file),'utf8'));records.push({label,code,file:'checks-'+label+'.json',cells:data.length,rawPassed:data.filter(x=>x.ok).length});}
 await writeFile(join(evidence,'checker-progress.json'),JSON.stringify({updatedAt:new Date().toISOString(),records},null,2));
 console.log('BATCH_END '+label+' '+code);
}
