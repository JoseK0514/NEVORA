import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {readFile,readdir,mkdir,writeFile} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import {join} from 'node:path';
import {measure} from '/workspace/NEVORA-inspections/premium-phase-3/complete-exit-preparation/scripts/geometry-measure.mjs';
const source='/workspace/NEVORA',out='/workspace/nevora-validation/preview',report='/workspace/nevora-validation/recheck';
const sha=execFileSync('git',['rev-parse','HEAD'],{cwd:source,encoding:'utf8'}).trim();
const run=(await readdir(out)).filter(x=>x.startsWith('evidence-')).sort().at(-1);
const access=JSON.parse(await readFile(join(out,run,'access.json'),'utf8'));
assert.equal(access.checkpoint,sha);assert.equal(execFileSync('git',['status','--porcelain','--untracked-files=no'],{cwd:source,encoding:'utf8'}).trim(),'');
const pw=createRequire('/opt/codex/runtimes/codex-primary-runtime/dependencies/node/node_modules/package.json')('playwright');
await mkdir(join(report,'crops'),{recursive:true});const records=[];
const save=()=>writeFile(join(report,process.env.RECHECK_RESULT??'named-rechecks.json'),JSON.stringify({sha,scope:'Named-ID regression rechecks; full five-area exits remain open',records},null,2));
const check=(row,ok,message,data)=>row.assertions.push({ok:!!ok,message,...(data===undefined?{}:{data})});
async function shot(page,row,name,locator){
 if(locator)await locator.scrollIntoViewIfNeeded();
 const file=`${row.engine}-${row.name}-${row.actor}-${row.width}-${row.text}-${name}.png`;
 await page.screenshot({path:join(report,'crops',file),style:'nextjs-portal{display:none!important}'});(row.crops??=[]).push('crops/'+file);
}
async function guard(c,row){
 await c.route('**/*',r=>{const q=r.request(),u=new URL(q.url());
  const readPost=q.method()==='POST'&&['/api/manager/action-center','/api/manager/action-intelligence','/api/timecards','/api/reports','/api/period-close'].includes(u.pathname)&&!q.headers()['next-action'];
  if(u.origin===access.url&&(['GET','HEAD','OPTIONS'].includes(q.method())||readPost))return r.continue();
  row.blocked.push({method:q.method(),path:u.pathname});return r.abort();
 });
 if(c.routeWebSocket)await c.routeWebSocket('**/*',s=>new URL(s.url()).origin.replace(/^ws/,'http')===access.url?s.connectToServer():s.close());
}
async function go(page,row,path,ready){
 const res=await page.goto(access.url+path,{waitUntil:'load',timeout:60000});assert.equal(res.status(),200);assert.equal(new URL(page.url()).pathname,path.split('?')[0]);
 await page.locator(ready).first().waitFor({timeout:30000});await page.evaluate(()=>document.fonts.ready);
 await page.evaluate(t=>document.documentElement.style.fontSize=t+'%',row.text);await page.waitForTimeout(350);
}
async function one(browser,engine,name,actor,width,text,fn){
 if(process.env.RECHECK_ONLY&&!process.env.RECHECK_ONLY.split(',').includes(name))return;
 const row={engine,name,actor,width,text,assertions:[],blocked:[]};records.push(row);
 const c=await browser.newContext({storageState:join(out,'state',actor+'.json'),viewport:{width,height:width<600?844:900},isMobile:width<600,hasTouch:width<600,serviceWorkers:'block'});await guard(c,row);const p=await c.newPage();p.setDefaultTimeout(20000);
 try{await fn(p,row,c);row.completed=true;row.ok=row.assertions.every(a=>a.ok);}catch(e){row.error=e.message;row.ok=false;try{await shot(p,row,'gap')}catch{}}
 finally{await c.close();await save();console.log(JSON.stringify({engine,name,actor,width,text,ok:row.ok,error:row.error,failed:row.assertions.filter(a=>!a.ok)}));}
}
for(const engine of (process.env.RECHECK_ENGINES??'chromium,webkit').split(',')){
 const b=await pw[engine].launch();try{
 for(const actor of ['QAOWNER','AUDIT-M'])await one(b,engine,'IS-WA-12',actor,390,100,async(p,r)=>{
  await go(p,r,'/app/employees/AUDIT-E','select[name=role]');
  for(const name of ['Access role','Status']){const f=p.getByRole('combobox',{name,exact:true});check(r,await f.count()===1,'Exact accessible name: '+name);if(await f.count()&&name==='Status')check(r,!!await f.getAttribute('aria-describedby'),name+' retains the rendered help description');}
  r.aria=await p.locator('main').ariaSnapshot();await shot(p,r,'names-corrected');
  if(actor==='QAOWNER'){await go(p,r,'/app/employees/new','input[name=firstName]');for(const name of ['Employee ID','Phone','Email'])check(r,await p.getByRole('textbox',{name,exact:true}).count()===1,'New employee exact accessible name: '+name);r.newEmployeeAria=await p.locator('main').ariaSnapshot();await shot(p,r,'new-employee-names');}
 });
 await one(b,engine,'IS-WA-12-callout','AUDIT-E',390,100,async(p,r)=>{await go(p,r,'/app/exchange/callout?shiftId=audit-next-1-1','textarea');check(r,await p.getByRole('textbox',{name:'More details',exact:true}).count()===1,'Callout More details name omits Optional, help, and count');r.aria=await p.locator('main').ariaSnapshot();await shot(p,r,'callout-name');});
 for(const actor of ['QAOWNER','AUDIT-M'])await one(b,engine,'IS-P4-11',actor,1440,100,async(p,r)=>{
  await go(p,r,'/app/inbox?filter=requests&item=TIME_OFF%3Aaudit-timeoff','.inbox-detail__actions a[href*="/app/requests"]');
  const link=p.locator('.inbox-detail__actions a[href*="/app/requests"]').first(),href=await link.getAttribute('href'),q=new URL(href,access.url).searchParams;
  check(r,q.get('item')==='TIME_OFF:audit-timeoff','Outgoing review retains selected item');check(r,q.get('filter')==='requests','Outgoing review retains filter');
  await go(p,r,href,'.premium-review-form');const back=p.locator('[data-nv-band] a[href*="/app/inbox"]').first(),backHref=await back.getAttribute('href'),q2=new URL(backHref,access.url).searchParams;
  check(r,q2.get('item')==='TIME_OFF:audit-timeoff','Back link retains item');check(r,q2.get('filter')==='requests','Back link retains filter');
  await go(p,r,backHref,'[data-inbox-key="TIME_OFF:audit-timeoff"][aria-current]');check(r,await p.locator('[data-inbox-key="TIME_OFF:audit-timeoff"][aria-current]').count()===1,'Returned Inbox selects same row');await shot(p,r,'returned');
 });
 for(const actor of ['AUDIT-E','AUDIT-LEAD'])for(const width of [320,390])await one(b,engine,'TC-P3-09-32-34-AL-47',actor,width,200,async(p,r)=>{
  await go(p,r,'/app/availability?week=2026-10-26','.av-submission-detail');
  const m=await measure(p);r.availability={splits:m.splits,selected:await p.locator('.section-tabs-track [aria-current],.nv-filters [aria-current]').evaluateAll(es=>es.map(e=>({text:e.innerText,box:e.getBoundingClientRect().toJSON(),track:e.parentElement.getBoundingClientRect().toJSON()})))};
  check(r,m.splits.length===0,'TC-P3-09: date and time atoms do not split',m.splits);
  const selected=await p.locator('.section-tabs-track [aria-current]').first().boundingBox();check(r,selected&&selected.x>=-1&&selected.x+selected.width<=width+1,'AL-47: selected section remains in viewport',selected);
  const pill=await p.locator('.nv-filters [aria-current]').first().boundingBox();check(r,pill&&pill.x>=-1&&pill.x+pill.width<=width+1,'AL-47: selected Specific week remains visible',pill);
  await shot(p,r,'availability',p.locator('.av-submission-detail'));
  await go(p,r,'/app','[data-nv-page] .employee-clock-compact');await p.waitForTimeout(1000);const home=await measure(p);r.home={splits:home.splits};check(r,home.splits.length===0,'TC-P3-32: Home date/time atoms do not split',home.splits);await shot(p,r,'home');
  await go(p,r,'/app/notifications','h1');const title=p.locator('h1').first();r.title={text:await title.innerText(),softHyphen:await title.evaluate(e=>e.textContent.includes('\u00ad')),box:await title.boundingBox()};check(r,r.title.softHyphen,'TC-P3-34: title supplies deliberate word breaks');check(r,await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),'Notifications remains within viewport');await shot(p,r,'notifications');
 });
 for(const actor of ['payroll-qa-a','payroll-qa-b'])await one(b,engine,'P3-ST-01',actor,320,100,async(p,r)=>{
  let held;const barrier=new Promise(resolve=>held=resolve),pending=[];await p.route('**/api/employee/my-time',async route=>{pending.push(route);await barrier;await route.continue()});
  await p.addInitScript(()=>{window.__namedCls=0;try{new PerformanceObserver(l=>{for(const e of l.getEntries())if(!e.hadRecentInput)window.__namedCls+=e.value}).observe({type:'layout-shift',buffered:true})}catch{}});
  try{await go(p,r,'/app','.employee-time-hold');const card=p.locator('.employee-clock-compact');await p.waitForTimeout(800);r.before=await card.boundingBox();await p.evaluate(()=>window.__namedCls=0);await shot(p,r,'loading',card);held();await p.locator('.employee-time-hold').waitFor({state:'detached'});await p.waitForTimeout(800);r.after=await card.boundingBox();r.cls=await p.evaluate(()=>window.__namedCls);r.shiftSupported=await p.evaluate(()=>PerformanceObserver.supportedEntryTypes.includes('layout-shift'));check(r,Math.abs(r.before.height-r.after.height)<=1,'Clock card height changes at most 1px',{before:r.before,after:r.after});if(r.shiftSupported)check(r,r.cls<=.01,'Read arrival CLS at most .01',r.cls);await shot(p,r,'ready',card);}finally{held();}
 });
 for(const width of [320,390])await one(b,engine,'ST-RC-PAYROLL-SAVE-01-TC-WA-16','QAOWNER',width,200,async(p,r)=>{
  await go(p,r,'/app/settings/payroll','form[data-form=company]');const form=p.locator('form[data-form=company]');await form.getByRole('button',{name:'Save company preferences',exact:true}).evaluate(e=>e.setAttribute('data-named-payroll','company'));const button=form.locator('[data-named-payroll=company]');await form.locator('[name=reason]').fill('Fictional regression recheck');
  let count=0;await p.route('**/api/payroll/settings',route=>{if(route.request().method()==='POST'){count++;return new Promise(resolve=>{r.release=()=>route.fulfill({status:409,contentType:'application/json',body:'{"error":"REVIEW_CONFLICT"}'}).then(resolve)})}return route.fallback()});
  await button.scrollIntoViewIfNeeded();await button.focus();r.before=await button.boundingBox();await button.evaluate(e=>{window.__pendingPaint=[];window.__paintTarget=e;window.__paintActive=true;const sample=()=>{if(!window.__paintActive)return;const s=getComputedStyle(e);window.__pendingPaint.push({color:s.color,bg:s.backgroundColor,opacity:s.opacity,height:e.getBoundingClientRect().height});requestAnimationFrame(sample)};sample()});
  try{await p.keyboard.press('Enter');await p.waitForFunction(()=>document.querySelector('form[data-form=company] button[type=submit]')?.getAttribute('aria-disabled')==='true');await p.waitForTimeout(250);r.after=await button.boundingBox();await p.keyboard.press('Enter');await p.waitForTimeout(100);check(r,count===1,'Double Enter sends one intercepted request',count);check(r,Math.abs(r.before.height-r.after.height)<=1,'ST-RC-PAYROLL-SAVE-01: pending height is stable',{before:r.before,after:r.after});r.paint=await p.evaluate(()=>{window.__paintActive=false;return window.__pendingPaint});await shot(p,r,'pending',button);}finally{if(r.release){await r.release();delete r.release}}
  function ratio(a,b){const lum=s=>s.match(/[\d.]+/g).slice(0,3).map(Number).map(x=>x/255).map(x=>x<=.04045?x/12.92:((x+.055)/1.055)**2.4).reduce((s,x,i)=>s+x*[.2126,.7152,.0722][i],0);const x=lum(a),y=lum(b);return(Math.max(x,y)+.05)/(Math.min(x,y)+.05)}
  r.minContrast=Math.min(...r.paint.map(v=>ratio(v.color,v.bg)));check(r,r.minContrast>=4.5,'TC-WA-16: visible transition text meets 4.5:1',r.minContrast);
 });
 for(const width of [320,390,1440])await one(b,engine,'TC-WA-3','QAOWNER',width,200,async(p,r)=>{
  await go(p,r,'/app/schedule/new?week=2026-10-26&date=2026-10-26&start=08%3A00&end=16%3A00','[aria-label="Shift summary"]');
  const time=p.locator('[aria-label="Shift summary"] .wa-fact').filter({has:p.locator('dt',{hasText:'Time'})});
  const summary=p.locator('aside[aria-label="Shift summary"]');r.summaryText=await summary.innerText();r.separator=await summary.evaluate(root=>{const w=document.createTreeWalker(root,NodeFilter.SHOW_TEXT);for(let n=w.nextNode();n;n=w.nextNode())if(n.textContent.includes('·')){const before=n.previousSibling;const range=document.createRange();range.selectNodeContents(n);return{text:n.textContent,rects:[...range.getClientRects()].map(x=>x.toJSON()),prior:before?.textContent,priorRects:before?.nodeType===3?(()=>{const q=document.createRange();q.selectNodeContents(before);return [...q.getClientRects()].map(x=>x.toJSON())})():[]}}});
  check(r,r.separator?.text.startsWith('\u00a0·'),'Time separator is attached to preceding time with NBSP');await shot(p,r,'summary',summary);
 });
 }finally{await b.close()}
}
await save();console.log(JSON.stringify({total:records.length,passed:records.filter(r=>r.ok).length,gaps:records.filter(r=>r.error).length}));
