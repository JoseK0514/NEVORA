import {createRequire} from 'node:module';
import {readFile,readdir,writeFile,mkdir} from 'node:fs/promises';
import {join} from 'node:path';
const pw=createRequire('/workspace/nevora-browser-runtime/package.json')('playwright');
const out='/workspace/paused-previews/desktop',evidence='/workspace/nevora-inspections/p4-desktop/round-5-8012d97/evidence';
const run=(await readdir(out)).filter(n=>n.startsWith('evidence-')).sort().at(-1);
const {url}=JSON.parse(await readFile(join(out,run,'access.json'),'utf8'));
const records=[];await mkdir(join(evidence,'shots'),{recursive:true});
const allowed=new Set(['/api/manager/action-center','/api/timecards','/api/reports','/api/manager/action-intelligence']);
const engine=process.env.STATE_ENGINE??'chromium';const browser=await pw[engine].launch();
const record=async(p,label,extra={})=>{const data=await p.evaluate(()=>{
 const visible=e=>{const r=e.getBoundingClientRect(),s=getComputedStyle(e);return r.width>0&&r.height>0&&s.display!=='none'&&s.visibility!=='hidden';};
 const describe=e=>{if(!e)return null;const r=e.getBoundingClientRect(),s=getComputedStyle(e);return {tag:e.tagName,cls:String(e.className),id:e.id,text:(e.getAttribute('aria-label')||e.textContent||'').trim().replace(/\s+/g,' ').slice(0,150),x:r.x,y:r.y,w:r.width,h:r.height,bottom:r.bottom,right:r.right,outline:s.outline,shadow:s.boxShadow,disabled:e.disabled,ariaDisabled:e.getAttribute('aria-disabled')};};
 return {scrollY,docHeight:document.documentElement.scrollHeight,cls:window.__cls,state:document.querySelector('[data-inbox-state]')?.getAttribute('data-inbox-state'),active:describe(document.activeElement),status:[...document.querySelectorAll('[role=status]')].filter(visible).map(describe),list:describe(document.querySelector('.inbox-list-column')),pane:describe(document.querySelector('.inbox-side-column')),geometry:[...document.querySelectorAll('.premium-home__now,.premium-home__setup,.premium-home__week,.premium-home__today,.premium-skeleton--rows,.premium-skeleton__row,.premium-home .nv-card,.nv-pageband,.my-schedule-side')].filter(visible).map(describe),buttons:[...document.querySelectorAll('main button')].filter(visible).map(describe),current:[...document.querySelectorAll('[aria-current]')].filter(visible).map(e=>({...describe(e),current:e.getAttribute('aria-current')}))};
});records.push({label,engine,...extra,...data});await writeFile(join(evidence,'states-'+engine+'.json'),JSON.stringify(records,null,1));console.log('STATE '+label+' y='+data.scrollY+' active='+data.active?.id);return data;};
try{
for(const [account,width]of [['AUDIT-M',1440],['QAOWNER',1024]]){
 const c=await browser.newContext({storageState:join(out,'state',account+'.json'),viewport:{width,height:900},serviceWorkers:'block'});
 await c.route('**/*',r=>{const req=r.request(),u=new URL(req.url());if(u.origin!==url)return r.abort();if(!['GET','HEAD','OPTIONS'].includes(req.method())&&!allowed.has(u.pathname))return r.fulfill({status:503,contentType:'application/json',body:'{}'});return r.continue();});
 const p=await c.newPage();p.setDefaultTimeout(30000);
 await p.addInitScript(()=>{window.__cls=0;try{new PerformanceObserver(l=>{for(const e of l.getEntries())if(!e.hadRecentInput)window.__cls+=e.value;}).observe({type:'layout-shift',buffered:true});}catch{}});
 let releaseInbox;const inboxGate=new Promise(r=>{releaseInbox=r;});const inboxHold=async r=>{await inboxGate;await r.continue().catch(()=>{});};await p.route('**/api/manager/action-center',inboxHold);
 await p.goto(url+'/app/inbox?filter=planning',{waitUntil:'load',timeout:90000});await p.evaluate(()=>document.fonts.ready);await p.waitForTimeout(200);await record(p,`${account}-${width}-inbox-loading`);await p.screenshot({path:join(evidence,'shots',`${engine}-${account}-${width}-inbox-loading.png`)});await p.evaluate(()=>{window.__cls=0;});releaseInbox();await p.unroute('**/api/manager/action-center',inboxHold);await p.locator('[data-inbox-state=ready]').waitFor();await p.waitForTimeout(400);await record(p,`${account}-${width}-inbox-ready`);await p.screenshot({path:join(evidence,'shots',`${engine}-${account}-${width}-inbox-ready.png`)});
 await p.goto(url+'/app/inbox',{waitUntil:'load',timeout:90000});await p.locator('[data-inbox-state=ready]').waitFor();await p.waitForTimeout(400);
 await record(p,`${account}-${width}-ready`);
 const row=p.locator('.inbox-row a').first();await row.click();await p.waitForTimeout(150);await record(p,`${account}-${width}-selected`);
 await p.keyboard.press('Escape');await record(p,`${account}-${width}-escape`);
 const summaries=p.locator('.inbox-list-column summary');
 if(await summaries.count()){
  await summaries.first().focus();await p.keyboard.press('ArrowDown');await record(p,`${account}-${width}-down-from-group`);
  await summaries.first().focus();await p.keyboard.press('Enter');await summaries.first().focus();await p.keyboard.press('ArrowDown');await record(p,`${account}-${width}-down-open-group`);
  await summaries.first().focus();await p.keyboard.press('ArrowUp');await record(p,`${account}-${width}-up-from-group`);
 }
 await row.evaluate(e=>e.focus({preventScroll:true}));await p.evaluate(()=>window.scrollTo(0,800));await p.waitForTimeout(100);await record(p,`${account}-${width}-pre-offline`);
 await c.setOffline(true);await p.waitForTimeout(500);await record(p,`${account}-${width}-offline`);await p.screenshot({path:join(evidence,'shots',`${engine}-${account}-${width}-offline.png`)});
 await c.setOffline(false);await p.locator('[data-inbox-state=ready]').waitFor({timeout:45000});await p.waitForTimeout(300);await record(p,`${account}-${width}-online`);
 let held=0;let release;let gate=new Promise(r=>{release=r;});
 const hold=async r=>{held++;await gate;await r.continue();};await p.route('**/api/manager/action-center',hold);
 const refresh=p.getByRole('button',{name:'Refresh inbox',exact:true});
 const candidate=(await refresh.count())?refresh:p.locator('.nv-pageband button').first();
 await candidate.focus();await record(p,`${account}-${width}-pre-refresh`);await candidate.click();await p.waitForTimeout(400);await record(p,`${account}-${width}-held-refresh`,{held});await candidate.click({force:true});await p.waitForTimeout(100);await record(p,`${account}-${width}-double-refresh`,{held});release();await p.unroute('**/api/manager/action-center',hold);await p.waitForTimeout(1000);await record(p,`${account}-${width}-refresh-finished`,{held});
 for(const status of [503,401,403]){
  const fail=r=>r.fulfill({status,contentType:'application/json',body:'{}'});await p.route('**/api/manager/action-center',fail);
  await p.goto(url+'/app/inbox',{waitUntil:'load',timeout:90000});await p.waitForTimeout(600);await record(p,`${account}-${width}-initial-${status}`);await p.screenshot({path:join(evidence,'shots',`${engine}-${account}-${width}-${status}.png`)});await p.unroute('**/api/manager/action-center',fail);
 }
 for(const text of [100,200]){
  let releaseHome;const gateHome=new Promise(r=>{releaseHome=r;});const heldHome=async r=>{await gateHome;await r.continue();};await p.route('**/api/manager/action-center',heldHome);
  await p.goto(url+'/app',{waitUntil:'load',timeout:90000});await p.evaluate(t=>{document.documentElement.style.fontSize=t+'%';},text);await p.waitForTimeout(200);await p.evaluate(()=>window.scrollTo(0,400));await p.waitForTimeout(100);await record(p,`${account}-${width}-home-loading-${text}`);await p.screenshot({path:join(evidence,'shots',`${engine}-${account}-${width}-home-loading-${text}.png`)});
  releaseHome();await p.unroute('**/api/manager/action-center',heldHome);await p.waitForTimeout(1500);await record(p,`${account}-${width}-home-ready-${text}`);await p.screenshot({path:join(evidence,'shots',`${engine}-${account}-${width}-home-ready-${text}.png`)});
 }
 await c.close();
}
for(const account of ['QAOWNER','AUDIT-M','AUDIT-E','AUDIT-LEAD','AUDIT-LONG']){
 const c=await browser.newContext({storageState:join(out,'state',account+'.json'),viewport:{width:768,height:900},serviceWorkers:'block'});
 await c.route('**/*',r=>{const req=r.request(),u=new URL(req.url());if(u.origin!==url)return r.abort();if(!['GET','HEAD','OPTIONS'].includes(req.method())&&!allowed.has(u.pathname))return r.fulfill({status:503,contentType:'application/json',body:'{}'});return r.continue();});
 const p=await c.newPage();await p.goto(url+'/app',{waitUntil:'load',timeout:90000});await p.waitForTimeout(500);
 await p.keyboard.press('Tab');await record(p,`${account}-first-tab`);await p.keyboard.press('Enter');await record(p,`${account}-skip`);
 const menu=p.locator('[popovertarget=portal-account-menu]');await menu.focus();await p.keyboard.press('Enter');await p.waitForTimeout(100);await record(p,`${account}-account-open`);
 for(let i=0;i<7;i++){await p.keyboard.press('Tab');await record(p,`${account}-account-tab-${i}`);}
 await menu.focus();await p.keyboard.press('Enter');await p.waitForTimeout(100);await p.keyboard.press('Escape');await record(p,`${account}-account-escape`);
 await p.evaluate(()=>{document.documentElement.style.fontSize='200%';});await p.waitForTimeout(200);await p.screenshot({path:join(evidence,'shots',`${engine}-${account}-768-200-shell.png`)});await record(p,`${account}-200-shell`);
 await c.close();
}
}finally{await browser.close();}
