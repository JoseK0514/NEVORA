// Targeted diagnostic geometry only, after a concrete concern is identified.
// The full sweep collects passive evidence through Page.close with zero extra visits.
// The original checks.mjs sweep remains a separate prerequisite.
import {createRequire} from 'node:module';
import {readFile,readdir,mkdir,writeFile,rename,open,unlink} from 'node:fs/promises';
import {join,resolve} from 'node:path';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {measure} from './geometry-measure.mjs';
const sha=process.env.PHASE3_RELEASED_SHA,source=resolve(process.env.PHASE3_SOURCE??'/workspace/inspect-phase3-final');
if(!/^[0-9a-f]{40}$/.test(sha??''))throw Error('Root must release an exact PHASE3_RELEASED_SHA');
const git=(...a)=>execFileSync('git',a,{cwd:source,encoding:'utf8'}).trim();
if(git('rev-parse','HEAD')!==sha||git('status','--porcelain','--untracked-files=no'))throw Error('Exact source missing or dirty');
const preview=resolve(process.env.PREVIEW_OUT),out=resolve(process.env.PHASE3_REPORT);
const runs=(await readdir(preview)).filter(n=>n.startsWith('evidence-')).sort(),run=runs.at(-1);
const audit=JSON.parse(await readFile(join(preview,run,'audit.json'),'utf8'));
if(audit.checkpoint!==sha||audit.completedAt)throw Error('Preview is not the running exact source');
const {url}=JSON.parse(await readFile(join(preview,run,'access.json'),'utf8'));
if(!['127.0.0.1','localhost','[::1]'].includes(new URL(url).hostname))throw Error('Loopback only');
const next=new Date(audit.fixtureWeek+'T12:00:00Z');next.setUTCDate(next.getUTCDate()+7);
if(!process.env.GEO_ROUTES)throw Error('Targeted diagnostics only: supply GEO_ROUTES for a documented concern');
const accounts=(process.env.GEO_ACCOUNTS??'AUDIT-E').split(',');
const routes=process.env.GEO_ROUTES.split(',');
const engines=(process.env.ENGINES??'chromium').split(','),sizes=(process.env.GEO_SIZES??'390').split(','),texts=(process.env.GEO_TEXT??'100').split(',').map(Number);
const {chromium,webkit}=createRequire(join(process.env.PLAYWRIGHT_RUNTIME_ROOT,'package.json'))('playwright');
const lineage=createHash('sha256').update(JSON.stringify({sha,run,fixtureWeek:audit.fixtureWeek,script:await readFile(new URL(import.meta.url))})).digest('hex');
await mkdir(join(out,'geometry','cells'),{recursive:true});await mkdir(join(out,'geometry','crops'),{recursive:true});
const id=r=>createHash('sha256').update(JSON.stringify([r.engine,r.account,r.route,r.size,r.text])).digest('hex').slice(0,20);
const checkpoint=join(out,'geometry','checkpoint.json');let index;
try{index=JSON.parse(await readFile(checkpoint,'utf8'));if(index.lineage!==lineage)throw Error('Geometry checkpoint lineage mismatch');}catch(e){if(e.code==='ENOENT')index={sha,lineage,records:{},errors:[]};else throw e;}
const save=async()=>{const temp=checkpoint+'.tmp';await writeFile(temp,JSON.stringify(index,null,1));await rename(temp,checkpoint);};
const lockpath=join(preview,'phase3-serial-checks.lock'),lock=await open(lockpath,'wx');await lock.writeFile(JSON.stringify({pid:process.pid,stage:'geometry',sha}));
let stop=false;process.on('SIGINT',()=>stop=true);process.on('SIGTERM',()=>stop=true);
const max=Number(process.env.MAX_CELLS??Infinity);let completedNow=0;

try{
 for(const engine of engines){if(stop)break;const browser=await({chromium,webkit}[engine]).launch();try{
  for(const account of accounts){if(stop)break;const context=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true,storageState:join(preview,'state',account+'.json'),serviceWorkers:'block'});
   await context.route('**/*',r=>{const u=new URL(r.request().url());if(u.origin!==url)return r.abort();if(!['GET','HEAD'].includes(r.request().method())&&!['/api/timecards','/api/employee/communications'].includes(u.pathname))return r.abort();return r.continue();});
   try{for(const route of routes){if(stop)break;const pending=sizes.flatMap(size=>texts.map(text=>({engine,account,route,size,text}))).filter(r=>!index.records[id(r)]);if(!pending.length)continue;
    const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));let status;
    try{status=(await page.goto(url+route,{waitUntil:'networkidle',timeout:60000}))?.status();await page.evaluate(()=>document.fonts.ready);await page.waitForTimeout(200);
     for(const cell of pending){if(stop||completedNow>=max){stop=true;break;}const [w,h]=cell.size.includes('x')?cell.size.split('x').map(Number):[Number(cell.size),844];await page.setViewportSize({width:w,height:h});await page.evaluate(t=>{document.documentElement.style.fontSize=t+'%';scrollTo(0,0);},cell.text);await page.waitForTimeout(100);await page.evaluate(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))));
      const data={...cell,sha,lineage,status,errors:[...errors],observedAt:new Date().toISOString(),...await measure(page)};
      if(['320','390','844x390'].includes(cell.size)&&[100,200].includes(cell.text)){
       const stem=`${engine}-${account}-${cell.size}-t${cell.text}-${id(cell)}`;data.topCrop=join(out,'geometry','crops',stem+'-top.png');await page.screenshot({path:data.topCrop,fullPage:false,style:'nextjs-portal{display:none!important}'});
       await page.evaluate(()=>scrollTo(0,document.documentElement.scrollHeight));await page.waitForTimeout(50);data.bottom=await page.evaluate(()=>{const nav=document.querySelector('.mobile-nav')?.getBoundingClientRect(),main=document.querySelector('main')?.getBoundingClientRect();return{scrollY,nav:nav?.toJSON(),main:main?.toJSON(),documentHeight:document.documentElement.scrollHeight,visualViewport:visualViewport?{height:visualViewport.height,offsetTop:visualViewport.offsetTop}:null};});data.bottomCrop=join(out,'geometry','crops',stem+'-bottom.png');await page.screenshot({path:data.bottomCrop,fullPage:false,style:'nextjs-portal{display:none!important}'});
      }
      const file=join(out,'geometry','cells',id(cell)+'.json');await writeFile(file,JSON.stringify(data,null,1));index.records[id(cell)]={...cell,file,hasFlags:!!(data.splits.length||data.midword.length||data.clipped.length||status>=400),errors:errors.length};await save();completedNow++;
     }
    }catch(e){index.errors.push({engine,account,route,error:e.message,observedAt:new Date().toISOString()});await save();}
    finally{await page.close();console.log(JSON.stringify({stage:'geometry',engine,account,route,totalRecorded:Object.keys(index.records).length,stop}));}
   }}finally{await context.close();}
  }
 }finally{await browser.close();}}
}finally{await save();await lock.close();await unlink(lockpath);}
console.log(JSON.stringify({stage:'geometry',sha,recorded:Object.keys(index.records).length,expected:accounts.length*routes.length*sizes.length*texts.length*engines.length,harnessErrors:index.errors.length,checkpoint}));
