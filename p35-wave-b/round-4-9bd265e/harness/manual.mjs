import {readFile,readdir,writeFile,mkdir} from 'node:fs/promises';
import {join} from 'node:path';
import {createRequire} from 'node:module';
const require=createRequire('/workspace/nevora-browser-runtime/package.json');
const {chromium,webkit}=require('playwright');
const out='/workspace/paused-previews/wave-b',report='/workspace/nevora-inspections/p35-wave-b/round-4-9bd265e';
const ev=(await readdir(out)).filter(n=>n.startsWith('evidence-')).sort().at(-1);
const access=JSON.parse(await readFile(join(out,ev,'access.json'),'utf8'));
const results=[];await mkdir(report+'/crops',{recursive:true});
const browser=await chromium.launch();
let active=[];
async function page(account,width=390,text=100,height=width<600?844:900,engineBrowser=browser){
 const c=await engineBrowser.newContext({storageState:join(out,'state',account+'.json'),viewport:{width,height},isMobile:width<600||height<431,hasTouch:width<600||height<431,serviceWorkers:'block'});active.push(c);
 await c.route('**/*',r=>{const q=r.request(),u=new URL(q.url());if(!['http:','https:'].includes(u.protocol))return r.continue();if(u.origin!==access.url||/signout|logout/i.test(u.pathname))return r.abort();if(!['GET','HEAD','OPTIONS'].includes(q.method())&&!(u.pathname==='/api/reports'&&q.method()==='POST'))return r.abort();return r.continue();});
 const p=await c.newPage();p.setDefaultTimeout(25000);
 const load=async route=>{await p.goto(access.url+route,{waitUntil:'load',timeout:60000});await p.evaluate(()=>document.fonts.ready);const ready=({'/app/reports':'.wb-insights-view','/app/updates/compose':'#communication-title','/app/settings/payroll':'form[data-form=company]','/app/payroll':'.pw-toolbar'})[route.split('?')[0]];if(ready)await p.locator(ready).waitFor({timeout:30000});await p.waitForTimeout(500);if(text!==100){await p.evaluate(t=>document.documentElement.style.fontSize=t+'%',text);await p.waitForTimeout(500);}};
 return {p,c,load,account,width,text,height};
}
async function record(key,item,selector){const {p,account,width,text,height}=item;const data=await p.evaluate(sel=>{const b=e=>{if(!e)return null;const r=e.getBoundingClientRect(),s=getComputedStyle(e),range=document.createRange();range.selectNodeContents(e);const rt=range.getBoundingClientRect();return {textBox:{x:rt.x,y:rt.y,width:rt.width,height:rt.height,right:rt.right},scrollWidth:e.scrollWidth,clientWidth:e.clientWidth,whiteSpace:s.whiteSpace,tag:e.tagName,text:(e.innerText||e.getAttribute('aria-label')||'').replace(/\s+/g,' ').slice(0,140),x:r.x,y:r.y,width:r.width,height:r.height,right:r.right,bottom:r.bottom,font:s.fontSize,line:s.lineHeight,padding:s.padding,margin:s.margin,disabled:e.disabled,ariaDisabled:e.getAttribute('aria-disabled')};};return {width:innerWidth,height:innerHeight,scrollX,scrollY,documentWidth:document.documentElement.scrollWidth,active:b(document.activeElement),items:[...document.querySelectorAll(sel)].map(b),text:document.querySelector('main')?.innerText.slice(0,16000)}},selector);const shot='crops/'+key+'.png';await p.screenshot({path:join(report,shot),fullPage:false});const v={key,account,width,text,height,route:new URL(p.url()).pathname,shot,...data};results.push(v);await writeFile(report+'/manual.json',JSON.stringify(results,null,2));console.log(key,JSON.stringify({...v,text:undefined,items:v.items.slice(0,5)}));return v;}
try{
 if(['geometry','rules'].includes(process.argv[2])){
 for(const [w,t]of [[768,200],[768,150],[1024,200],[1440,100],[390,100],[320,200],[844,100]]){
  const item=await page('QAOWNER',w,t,w===844?390:undefined);await item.load('/app/schedule/settings');await item.p.locator('.wb-savebar').scrollIntoViewIfNeeded();await record(`rules-${w}-t${t}`,item,'.wb-savebar,.wb-savebar > *, .wb-setting__name, .wb-setting__fields input, .nv-pageband, .wb-auto select');await item.c.close();
 }
 const m=await page('AUDIT-M',390);await m.load('/app/schedule/settings');await record('rules-manager-facts-390',m,'.wb-facts,.wb-facts > div,.wb-facts dt,.wb-facts dd');await m.c.close();
 if(process.argv[2]==='geometry')for(const [route,key]of [['/app/reports','reports'],['/app/schedule/templates','templates'],['/app/updates/compose','compose'],['/app/settings/payroll','payroll-settings'],['/app/payroll','payroll-runs']]){
  for(const [w,t]of [[320,200],[390,100],[1440,100]]){const item=await page('QAOWNER',w,t);await item.load(route);await record(`${key}-${w}-t${t}`,item,'.nv-pageband,.nv-card,.wb-glance > li,.wb-glance a > *, .pw-totals > div,.pw-totals dd,.wb-auto select');await item.c.close();}
 }
 }
 if(process.argv[2]==='typography'){
 const pay=await page('QAOWNER',390);await pay.load('/app/payroll');for(const [key,sel]of [['payroll-document-filenames-390','.pw-document strong'],['payroll-corrections-summary-390','.pw-secondary-actions > summary'],['payroll-job-labels-390','.pw-job strong']]){await pay.p.locator(sel).first().scrollIntoViewIfNeeded();await record(key,pay,sel);}await pay.c.close();
 }
 if(process.argv[2]==='details'){
 const pay=await page('QAOWNER',390);await pay.load('/app/payroll');await pay.p.locator('.pw-document strong').first().scrollIntoViewIfNeeded();await record('payroll-document-filenames-390',pay,'.pw-document strong,.pw-document small');await pay.c.close();
 const totals=await page('payroll-qa-reviewer',320,200);await totals.load('/app/payroll');await totals.p.locator('.pw-totals').scrollIntoViewIfNeeded();await record('payroll-totals-320-t200',totals,'.pw-totals,.pw-totals > div,.pw-totals dd,.pw-totals dt');await totals.c.close();
 for(const role of ['QAOWNER','AUDIT-E']){const item=await page(role,320,200);await item.load('/app/updates');const href=await item.p.locator('a[href^="/app/updates/"]:not([href*="compose"])').first().getAttribute('href');await item.load(href);await item.p.locator('article[data-update-revision]').waitFor();await item.p.locator('.wb-receipt').first().scrollIntoViewIfNeeded();await record('detail-receipt-'+role+'-320-t200',item,'.nv-status,.wb-receipt,.wb-receipt h2,#communication-acknowledgement-help');await item.c.close();}
 }
 if(process.argv[2]==='offline'){
 for(const role of ['QAOWNER','AUDIT-E']){const item=await page(role,390);await item.load('/app/updates/compose');await item.p.locator('#communication-title').fill('Fictional retained draft');await item.c.setOffline(true);await item.p.waitForTimeout(300);await record('compose-offline-'+role,item,'.nv-card h2,.nv-card p,.nv-card button');await item.c.setOffline(false);await item.p.locator('#communication-title').waitFor();results.push({key:'compose-reconnect-'+role,titleValue:await item.p.locator('#communication-title').inputValue(),active:await item.p.evaluate(()=>document.activeElement?.id)});await item.c.close();}
 }
 if(process.argv[2]==='confirms'){
 const item=await page('QAOWNER',844,100,390);await item.load('/app/updates');const href=await item.p.locator('a[href^="/app/updates/"]:not([href*="compose"])').first().getAttribute('href');await item.load(href);await item.p.getByRole('button',{name:'Withdraw update',exact:true}).click();await item.p.waitForTimeout(300);await record('detail-withdraw-confirm-landscape',item,'.wb-confirm,.wb-confirm button,.mobile-nav');await item.c.close();
 const rules=await page('QAOWNER',844,100,390);await rules.load('/app/schedule/settings');if(await rules.p.locator('.wb-period-remove button').count()){await rules.p.locator('.wb-period-remove button').first().click();await rules.p.waitForTimeout(300);await record('rules-remove-confirm-landscape',rules,'.wb-confirm,.wb-confirm button,.mobile-nav');}else results.push({key:'rules-remove-confirm-landscape',gap:'No coverage periods in fixture'});await rules.c.close();
 }
 if(process.argv[2]==='states'){
 for(const role of ['QAOWNER','AUDIT-E']){
  const rec=await page(role,390);await rec.load('/app/updates');const rhref=await rec.p.locator('a[href^="/app/updates/"]:not([href*="compose"])').first().getAttribute('href');if(!rhref)throw Error('No update');
  const failRead=r=>r.fulfill({status:503,contentType:'application/json',body:JSON.stringify({state:'unavailable',reason:'read_failed'})});await rec.c.route('**/api/*/communications/*',failRead);await rec.load(rhref);await record(`detail-read-failed-${role}`,rec,'.nv-pageband,.nv-content button');await rec.c.unroute('**/api/*/communications/*',failRead);await rec.p.getByRole('button',{name:'Try again',exact:true}).focus();await rec.p.keyboard.press('Enter');await rec.p.locator('article[data-update-revision]').waitFor();await rec.p.waitForTimeout(600);await record(`detail-recovered-${role}`,rec,'article[data-update-revision],article[data-update-revision] :focus');await rec.c.close();
 }
 for(const role of ['QAOWNER','AUDIT-E']){
  const item=await page(role,390);await item.load('/app/updates');const href=await item.p.locator('a[href^="/app/updates/"]:not([href*="compose"])').first().getAttribute('href');if(!href)throw Error('No update');
  await item.c.route('**/api/*/communications/*',r=>r.fulfill({status:401,contentType:'application/json',body:JSON.stringify({state:'unauthorized',reason:'access_denied'})}));await item.load(href);await record(`detail-401-${role}`,item,'.nv-pageband,.nv-content a,.nv-content button');await item.c.close();
 }
 const item=await page('QAOWNER',390);await item.load('/app/schedule/settings');let writes=0,release;const held=new Promise(r=>release=r);await item.c.route('**/*',async r=>{if(r.request().method()==='POST'&&new URL(r.request().url()).origin===access.url){writes++;await held;return r.abort();}return r.fallback();});const input=item.p.locator('.wb-setting__fields input[type="number"]').first();await input.focus();await input.press('Enter');await item.p.waitForTimeout(500);await record('rules-enter-held',item,'.wb-savebar button,.wb-config fieldset');release();await item.p.waitForTimeout(1000);await record('rules-enter-failed',item,'.wb-savebar button,.wb-savebar .wb-error');results.push({key:'rules-writes',writes});await item.c.close();
 }
 if(['states','payroll'].includes(process.argv[2])){
 const pay=await page('QAOWNER',390);await pay.load('/app/settings/payroll');await pay.p.locator('form[data-form="company"] input[name="reason"]').fill('Fictional inspection only');let payCount=0,payRelease;const payHeld=new Promise(r=>payRelease=r);await pay.c.route('**/api/payroll/settings',async r=>{if(r.request().method()==='POST'){payCount++;await payHeld;return r.abort();}return r.fallback();});await pay.p.getByRole('button',{name:'Save company preferences',exact:true}).click();await pay.p.waitForTimeout(500);await record('payroll-save-held',pay,'.wb-payroll-feedback,.pw-feedback,form[data-form="company"] button[type="submit"]');payRelease();await pay.p.waitForTimeout(700);await record('payroll-save-failed',pay,'.wb-payroll-feedback,.pw-feedback,form[data-form="company"] button[type="submit"]');results.push({key:'payroll-writes',writes:payCount});await pay.c.close();
 }
}finally{for(const c of active)await c.close().catch(()=>{});await browser.close();await writeFile(report+'/manual-'+process.argv[2]+'.json',JSON.stringify(results,null,2));}
