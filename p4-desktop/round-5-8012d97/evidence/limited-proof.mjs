import {createRequire} from 'node:module';
import {readFile,readdir,writeFile,mkdir} from 'node:fs/promises';
import {join} from 'node:path';
const pw=createRequire('/workspace/nevora-browser-runtime/package.json')('playwright');
const out='/workspace/paused-previews/desktop',evidence='/workspace/nevora-inspections/p4-desktop/round-5-8012d97/evidence';
const run=(await readdir(out)).filter(n=>n.startsWith('evidence-')).sort().at(-1);
const {url}=JSON.parse(await readFile(join(out,run,'access.json'),'utf8'));
await mkdir(join(evidence,'shots'),{recursive:true});
const records=[],allowed=new Set(['/api/manager/action-center','/api/timecards','/api/reports']);
const browser=await pw.chromium.launch();
const desc=async(p,selector)=>p.locator(selector).evaluateAll(es=>es.filter(e=>{const r=e.getBoundingClientRect(),s=getComputedStyle(e);return r.width>0&&r.height>0&&s.visibility!=='hidden';}).map(e=>{const r=e.getBoundingClientRect(),s=getComputedStyle(e);return {tag:e.tagName,cls:e.className,text:e.textContent.trim().slice(0,180),x:r.x,y:r.y,w:r.width,h:r.height,font:s.font,fontSize:s.fontSize,lineHeight:s.lineHeight,padding:s.padding,minHeight:s.minHeight,display:s.display};}));
const save=async()=>writeFile(join(evidence,'limited-proof.json'),JSON.stringify(records,null,1));
async function context(account){const c=await browser.newContext({storageState:join(out,'state',account+'.json'),viewport:{width:1440,height:900},serviceWorkers:'block'});await c.route('**/*',r=>{const req=r.request(),u=new URL(req.url());if(u.origin!==url)return r.abort();if(!['GET','HEAD','OPTIONS'].includes(req.method())&&!allowed.has(u.pathname))return r.fulfill({status:503,contentType:'application/json',body:'{}'});return r.continue();});return c;}
try{
 const c=await context('AUDIT-E');const p=await c.newPage();p.setDefaultTimeout(60000);
 await p.goto(url+'/app/availability',{waitUntil:'load',timeout:90000});await p.evaluate(()=>document.fonts.ready);await p.waitForTimeout(500);
 for(const text of [100,200]){await p.evaluate(t=>{document.documentElement.style.fontSize=t+'%';},text);await p.waitForTimeout(200);const metrics=await desc(p,'.av-time-range label > span');records.push({key:'TC-P4-22',account:'AUDIT-E',route:'/app/availability',width:1440,text,metrics});await p.locator('.av-time-range').first().screenshot({path:join(evidence,'shots',`TC-P4-22-1440-${text}.png`)});await save();}
 await p.goto(url+'/app/my-pay',{waitUntil:'load',timeout:90000});await p.locator('.pw-document strong').first().waitFor();await p.evaluate(()=>document.fonts.ready);
 for(const text of [100,200]){await p.evaluate(t=>{document.documentElement.style.fontSize=t+'%';},text);await p.waitForTimeout(200);const metrics=await desc(p,'.pw-document strong,.pw-statements header p');records.push({key:'TC-P4-23',account:'AUDIT-E',route:'/app/my-pay',width:1440,text,metrics});await p.locator('.pw-document').first().screenshot({path:join(evidence,'shots',`TC-P4-23-document-1440-${text}.png`)});await p.locator('.pw-statements section').first().screenshot({path:join(evidence,'shots',`TC-P4-23-earlier-1440-${text}.png`)});await save();}
 await c.close();
 const owner=await context('QAOWNER');const q=await owner.newPage();q.setDefaultTimeout(60000);
 await q.addInitScript(()=>{window.__cls=0;window.__shifts=[];try{new PerformanceObserver(l=>{for(const e of l.getEntries())if(!e.hadRecentInput){window.__cls+=e.value;window.__shifts.push({value:e.value,at:e.startTime,sources:e.sources?.map(s=>({html:s.node?.outerHTML?.slice(0,500),previous:{x:s.previousRect.x,y:s.previousRect.y,w:s.previousRect.width,h:s.previousRect.height},current:{x:s.currentRect.x,y:s.currentRect.y,w:s.currentRect.width,h:s.currentRect.height}}))});}}).observe({type:'layout-shift',buffered:true});}catch{}});
 await q.goto(url+'/app/inbox?filter=planning',{waitUntil:'load',timeout:90000});await q.locator('[data-inbox-state=ready]').waitFor();await q.evaluate(()=>document.fonts.ready);await q.waitForTimeout(600);
 records.push({key:'sidebar-reference',source:'8012d97',account:'QAOWNER',width:1440,text:100,metrics:await desc(q,'.sidebar-group-label,.sidebar .nav-label,.sidebar-platform-footer small')});await q.locator('.sidebar').screenshot({path:join(evidence,'shots','sidebar-reference-8012d97-1440-100.png')});records.push({key:'planning-natural',cls:await q.evaluate(()=>({cls:window.__cls,shifts:window.__shifts}))});await save();
 for(let attempt=1;attempt<=2;attempt++){
  let release;const gate=new Promise(r=>{release=r;});let requests=0;const hold=async r=>{requests++;await gate;await r.continue().catch(()=>{});};await q.route('**/api/manager/action-center',hold);
  await q.goto(url+'/app/inbox?filter=planning',{waitUntil:'load',timeout:90000});await q.evaluate(()=>document.fonts.ready);await q.waitForTimeout(300);
  const before=await desc(q,'.nv-pageband,.nv-masthead__summary,.nv-masthead__extra,.inbox-columns,.inbox-list-column,.inbox-side-column,.inbox-status,.nv-card');await q.screenshot({path:join(evidence,'shots',`planning-controlled-${attempt}-loading.png`)});await q.evaluate(()=>{window.__cls=0;window.__shifts=[];});release();await q.unroute('**/api/manager/action-center',hold);await q.locator('[data-inbox-state=ready]').waitFor();await q.waitForTimeout(600);
  const after=await desc(q,'.nv-pageband,.nv-masthead__summary,.nv-masthead__extra,.inbox-columns,.inbox-list-column,.inbox-side-column,.inbox-status,.nv-card');const shift=await q.evaluate(()=>({cls:window.__cls,shifts:window.__shifts}));records.push({key:'planning-controlled',attempt,requests,before,after,...shift});await q.screenshot({path:join(evidence,'shots',`planning-controlled-${attempt}-ready.png`)});await save();
 }
 await owner.close();
}finally{await browser.close();await save();}
console.log('LIMITED_PROOF_DONE '+records.length+' records');
