import {accountReply,receiptReply,reference} from './fixture-contracts.mjs';
import {geometryMeasure as measure} from './geometry-measure.mjs';
// Supplementary measurements only. Never imported by the unchanged checker.
import {readFile,writeFile} from 'node:fs/promises';
import {join} from 'node:path';
import {createHash} from 'node:crypto';
let browser,engineName;
export async function close(){if(browser)await browser.close();browser=null;engineName=null;}
async function getBrowser(engine){if(engineName!==engine){await close();const pw=await import('/workspace/nevora-browser-runtime/node_modules/playwright/index.mjs');browser=await pw[engine].launch();engineName=engine;}return browser;}
function observeLoading(){
 window.__wcExitTrace=[];window.__wcExitCls=0;let last='';
 const sample=()=>{const nodes=[...document.querySelectorAll('.route-skeleton-band,.wc-skeleton,.nv-masthead,[data-guard]')].slice(0,12).map(e=>{const r=e.getBoundingClientRect();return{selector:e.className,back:[...e.querySelectorAll('.nv-masthead__back')].map(a=>({text:a.textContent,href:a.getAttribute('href')})),guard:e.hasAttribute('data-guard'),x:r.x,y:r.y,width:r.width,height:r.height,title:e.querySelector('h1,h2')?.textContent};});const key=JSON.stringify(nodes);if(key!==last&&window.__wcExitTrace.length<100){window.__wcExitTrace.push({t:performance.now(),nodes});last=key;}};
 new MutationObserver(sample).observe(document,{subtree:true,childList:true,attributes:true,attributeFilter:['class','style','data-guard']});
 try{new PerformanceObserver(l=>{for(const e of l.getEntries())if(!e.hadRecentInput)window.__wcExitCls+=e.value;}).observe({type:'layout-shift',buffered:true});}catch{}
 addEventListener('DOMContentLoaded',sample);addEventListener('load',sample);
}
function dimensions(size){const [width,height]=size.includes('x')?size.split('x').map(Number):[Number(size),Number(size)<600?844:900];return{width,height};}
async function initialize(job,preview,url){
 const b=await getBrowser(job.engine),viewport=dimensions(job.size),phone=viewport.width<600||viewport.height<431;
 const c=await b.newContext({...(job.account==='SIGNED-OUT'?{}:{storageState:join(preview,'state',job.account+'.json')}),viewport,isMobile:phone,hasTouch:phone,serviceWorkers:'block'});
 const gate={mode:'abort',requests:[],held:[],reply:null,js:[],holdJs:false};
 await c.route('**/*',async r=>{const request=r.request(),u=new URL(request.url());if(u.origin!==new URL(url).origin)return r.abort();if(request.method()==='GET'){if(gate.holdJs&&u.pathname.includes('/_next/static/')&&u.pathname.endsWith('.js')){gate.js.push(r);return;}return r.continue();}gate.requests.push({method:request.method(),path:u.pathname,bodySha256:createHash('sha256').update(request.postData()??'').digest('hex')});if(gate.mode==='hold'){gate.held.push(r);return;}if(gate.mode==='reply')return r.fulfill(typeof gate.reply==='function'?gate.reply(request):gate.reply);return r.abort();});
 await c.addInitScript(observeLoading);const p=await c.newPage();p.setDefaultTimeout(10000);const errors=[];p.on('pageerror',e=>errors.push('page: '+e.message.slice(0,300)));p.on('console',m=>{if(m.type()==='error')errors.push('console: '+m.text().slice(0,300));});
 return{c,p,gate,errors};
}
async function settle(p,text){await p.waitForTimeout(2500);await p.waitForFunction(()=>!document.querySelector('.wc-page [data-guard]'));await p.evaluate(()=>document.fonts.ready);if(text!==100){await p.evaluate(t=>document.documentElement.style.fontSize=t+'%',text);await p.waitForTimeout(600);}await p.waitForTimeout(100);}
async function load(p,url,route,text){let response=await p.goto(url+route,{waitUntil:'load',timeout:60000});let retry=null;if(response&&response.status()>=500){retry=response.status();response=await p.reload({waitUntil:'load',timeout:60000});}await settle(p,text);return{status:response?.status(),loadRetry:retry};}
async function release(gate){for(const r of gate.held.splice(0))await r.abort().catch(()=>{});gate.mode='abort';for(const r of gate.js.splice(0))await r.continue().catch(()=>{});gate.holdJs=false;}
async function capture(p,dir,phase,extra={}){const data={phase,...extra,...await p.evaluate(measure)};await p.screenshot({path:join(dir,phase+'.png'),fullPage:false,style:'nextjs-portal{display:none!important}'});return data;}
async function screenSweep(p,dir){const rows=[];for(const [phase,fraction]of [['top',0],['middle',0.5],['bottom',1]]){await p.evaluate(f=>window.scrollTo(0,(document.documentElement.scrollHeight-innerHeight)*f),fraction);await p.waitForTimeout(100);rows.push(await capture(p,dir,phase));}return rows;}
async function prepareForm(p,kind){
 if(kind==='workspace')await p.getByLabel('Business name',{exact:true}).fill('Fictional completion company');
 if(kind==='new-location'){await p.locator('#new-location-name').fill('Fictional completion location');await p.locator('#new-location-short-name').fill('Fictional completion');}
 if(kind==='edit-location')await p.locator('input[name=name]').first().fill('Fictional completion location');
 if(kind==='branding')await p.getByRole('button',{name:'Ocean, #1D4ED8',exact:true}).click();
 if(kind==='features')await p.locator('input[type=radio]').nth(1).check();
 if(kind==='position-add')await p.locator('#new-position-name').fill('Fictional completion role');
 if(kind==='position-edit'){await p.locator('.wc-editable > summary').first().click();await p.locator('.wc-editable[open] input[name=name]').fill('Fictional completion role');}
 if(kind==='account'){await p.getByLabel('Employee ID',{exact:true}).fill('AUDIT-E');await p.getByLabel('How you verified them',{exact:true}).fill('Verified fictional employee in person.');await p.locator('input[type=checkbox]').check();}
 if(kind==='clocker')await p.getByLabel('Saved action reference',{exact:true}).fill(reference);
 const labels={workspace:'Save changes','new-location':'Add location','edit-location':'Save changes',branding:'Save brand',features:'Save changes',policies:'Save policies','position-add':'Add position','position-edit':'Save position',account:'Issue recovery code',clocker:'Check receipt'};
 return p.getByRole('button',{name:labels[kind],exact:true});
}
async function formRun(job,ctx,dir){
 const {p,gate}=ctx,kind=job.formCase??job.case,rows=[];const primary=await prepareForm(p,kind);await primary.scrollIntoViewIfNeeded();rows.push(await capture(p,dir,'before'));
 if(job.stage==='auth'){gate.mode='reply';gate.reply={status:Number(job.state),contentType:'application/json',body:'{}'};await primary.click();await p.waitForTimeout(400);rows.push(await capture(p,dir,'auth-'+job.state));return{rows,requests:gate.requests};}
 if(kind==='branding'){const hex=p.locator('#brand-hex'),value=await hex.inputValue();await hex.fill('#12');await p.keyboard.press('Tab');rows.push(await capture(p,dir,'hex-validation',{requests:gate.requests.length}));await hex.fill(value);await p.keyboard.press('Tab');}
 if(!['branding','features'].includes(kind)){const required=p.locator('form').filter({has:primary}).locator('input[required]:enabled:not([type=checkbox]):not([type=radio]),textarea[required]:enabled').first();if(await required.count()){const value=await required.inputValue();await required.fill('');const start=gate.requests.length;await primary.click();await p.waitForTimeout(100);rows.push(await capture(p,dir,'validation',{requests:gate.requests.length-start}));await required.fill(value);}}
 gate.mode='hold';const start=gate.requests.length;await primary.evaluate(e=>{e.focus();e.click();e.click();});await p.waitForTimeout(300);rows.push(await capture(p,dir,'pending',{requests:gate.requests.length-start}));await release(gate);await p.waitForTimeout(400);rows.push(await capture(p,dir,'failed',{requests:gate.requests.length-start}));const bounded=p.locator('.wc-actions.nv-actionbar > .wc-feedback');if(await bounded.count()){await bounded.evaluate(e=>e.scrollTop=e.scrollHeight);rows.push(await capture(p,dir,'feedback-bottom'));}if(kind==='policies'){const retry=p.getByRole('button',{name:'Retry the same save',exact:true});if(await retry.count()){rows.push(await capture(p,dir,'retry-before'));gate.mode='hold';const retryStart=gate.requests.length;await retry.evaluate(e=>{e.focus();e.click();e.click();});await p.waitForTimeout(300);rows.push(await capture(p,dir,'retry-pending',{requests:gate.requests.length-retryStart}));await release(gate);await p.waitForTimeout(400);rows.push(await capture(p,dir,'retry-failed'));}}return{rows,requests:gate.requests};
}
async function dialogRun(job,ctx,dir){
 const {p,gate}=ctx,rows=[],trigger=p.getByRole('button',{name:job.case,exact:true});await trigger.click();await p.locator('dialog[open]').waitFor();rows.push(await capture(p,dir,'opened'));
 const scrollBefore=await p.evaluate(()=>scrollY);await p.mouse.wheel(0,300);await p.waitForTimeout(100);const backgroundDelta=await p.evaluate(()=>scrollY)-scrollBefore;
 const focus=[];for(const key of ['Tab','Shift+Tab'])for(let i=0;i<14;i++){await p.keyboard.press(key);focus.push(await p.evaluate(()=>({tag:document.activeElement.tagName,text:document.activeElement.innerText?.slice(0,80),inside:!!document.activeElement.closest('dialog[open]')})));}
 if(job.case==='Add break type'){await p.getByLabel('Break name',{exact:true}).fill('Fictional completion break');await p.getByLabel('Classification',{exact:true}).selectOption('REST');}
 if(job.case==='Add device'){await p.getByLabel('Device name',{exact:true}).fill('Fictional completion tablet');await p.getByLabel('Location',{exact:true}).selectOption('loc-1');}
 const primary=p.locator('dialog[open] button[type=submit]');await primary.scrollIntoViewIfNeeded();rows.push(await capture(p,dir,'before'));const start=gate.requests.length;gate.mode='hold';await primary.evaluate(e=>{e.focus();e.click();e.click();});await p.waitForTimeout(250);rows.push(await capture(p,dir,'pending',{requests:gate.requests.length-start}));await release(gate);await p.waitForTimeout(350);await p.locator('dialog[open] .wc-actions > .nv-btn').last().scrollIntoViewIfNeeded();rows.push(await capture(p,dir,'failed',{requests:gate.requests.length-start}));await p.keyboard.press('Escape');const focusBack=await trigger.evaluate(e=>e===document.activeElement);return{rows,backgroundDelta,focus,focusBack,requests:gate.requests};
}
async function recoveryRun(job,ctx,dir){
 const {p,c,gate}=ctx,rows=[],kind=job.kind,mode=job.state;await prepareForm(p,kind);gate.mode='reply';
 gate.reply=request=>{const payload=JSON.parse(request.postData()??'{}');return kind==='account'?accountReply({employeeId:payload.employeeId,state:mode}):receiptReply({commandId:payload.commandId,state:mode});};
 const primary=p.getByRole('button',{name:kind==='account'?'Issue recovery code':'Check receipt',exact:true});
 if(mode==='offline'&&kind==='clocker')await c.setOffline(true);
 await primary.click();await p.waitForTimeout(400);rows.push(await capture(p,dir,'response',{fabricatedResponse:true}));
 if(mode==='expired'){await p.waitForTimeout(1700);rows.push(await capture(p,dir,'expired'));}
 if(mode==='blur'||mode==='paused'){await p.evaluate(()=>window.dispatchEvent(new Event('blur')));await p.waitForTimeout(100);rows.push(await capture(p,dir,'paused'));if(kind==='clocker'){await p.evaluate(()=>window.dispatchEvent(new Event('focus')));await p.waitForTimeout(200);rows.push(await capture(p,dir,'resumed'));}}
 if(mode==='offline'&&kind==='account'){await c.setOffline(true);await p.waitForTimeout(100);rows.push(await capture(p,dir,'offline-cleared'));}
 if(mode==='large'){await p.evaluate(()=>window.scrollTo(0,document.documentElement.scrollHeight));rows.push(await capture(p,dir,'large-bottom'));}
 await c.setOffline(false);return{rows,requests:gate.requests};
}
export async function runJob({job,preview,source,checkpoint,dir,url}){
 if(job.dataset==='large'&&process.env.WC_DATASET!=='large')return{job,checkpoint,gap:'Run this stage on a separate owned preview seeded with --large; normal fixture must remain unchanged.'};
 const ctx=await initialize(job,preview,url),{p,c,gate,errors}=ctx;let result;
 try{
  const loaded=await load(p,url,job.route,job.text);
  if(job.stage==='access'||job.stage==='signed-out'){result={...loaded,rows:[await capture(p,dir,'redirect')],expectedPath:job.stage==='signed-out'?'/login':'/app',actualPath:new URL(p.url()).pathname};}
  else if(job.stage==='forms'||job.stage==='auth')result={...loaded,...await formRun(job,ctx,dir)};
  else if(job.stage==='dialogs')result={...loaded,...await dialogRun(job,ctx,dir)};
  else if(job.stage==='recovery')result={...loaded,...await recoveryRun(job,ctx,dir)};
  else if(job.stage==='motion'){const rows=[await capture(p,dir,'normal')];await p.emulateMedia({reducedMotion:'reduce'});rows.push(await capture(p,dir,'reduced'));await p.locator('.wc-disclosure').evaluateAll(es=>es.forEach(e=>e.open=true));rows.push(await capture(p,dir,'disclosures-open'));await p.evaluate(()=>window.scrollTo(0,0));const focus=[],focusSteps=await p.evaluate(()=>Math.min(256,[...document.querySelectorAll('a[href],button,input:not([type=hidden]),select,textarea,summary,[tabindex]')].filter(e=>{const r=e.getBoundingClientRect();return r.width>0&&r.height>0&&!e.disabled&&!e.closest('[hidden],[inert],[aria-hidden=true]')&&e.tabIndex>=0;}).length+2));for(let i=0;i<focusSteps;i++){await p.keyboard.press('Tab');focus.push(await p.evaluate(()=>({tag:document.activeElement.tagName,id:document.activeElement.id,text:document.activeElement.innerText?.slice(0,80),outline:getComputedStyle(document.activeElement).outline})));}rows.push(await capture(p,dir,'keyboard-focus'));const fieldStates=[];const fields=p.locator('.wc-page input:not([type=hidden]):not([type=file]),.wc-page select,.wc-page textarea');for(let i=0;i<await fields.count();i++){const field=fields.nth(i);if(!await field.isVisible())continue;for(const state of ['idle','hover','focus']){if(state==='idle'){await p.evaluate(()=>document.activeElement?.blur());await p.mouse.move(0,0);}if(state==='hover')await field.hover();if(state==='focus'){if(!await field.isEnabled())continue;await field.focus();await p.mouse.move(0,0);}fieldStates.push(await field.evaluate((e,state)=>{const s=getComputedStyle(e);return{state,id:e.id,type:e.type,label:e.labels?.[0]?.textContent,border:s.borderColor,color:s.color,background:s.backgroundColor,opacity:s.opacity,outline:s.outline,shadow:s.boxShadow,box:e.getBoundingClientRect().toJSON()};},state));}}result={...loaded,rows,focus,fieldStates};}
  else if(job.stage==='loading'||job.stage==='loading-back'){
   // A second hard visit holds JS only; all ready text zoom stays after hydration.
   gate.holdJs=true;await p.goto(url+job.route,{waitUntil:'commit',timeout:60000});await p.waitForTimeout(300);const rows=[await capture(p,dir,'guarded-before-hydration')];await release(gate);await p.waitForLoadState('load',{timeout:60000});await settle(p,job.text);rows.push(await capture(p,dir,'after-hydration'));const observed=rows.some(r=>r.loadingTrace.some(t=>t.nodes.some(n=>/skeleton/.test(n.selector))));result={...loaded,rows,...(!observed?{gap:'No native route placeholder was observed; a guarded SSR page is not loading-placeholder proof. Client-navigation held-read capture remains required.'}:{})};
  }else{
   const rows=await screenSweep(p,dir);
   if(job.stage==='judgment'){await p.locator('.wc-disclosure').evaluateAll(es=>es.forEach(e=>e.open=true));rows.push(await capture(p,dir,'disclosures-open'));await p.keyboard.press('Tab');rows.push(await capture(p,dir,'keyboard-focus'));}
   result={...loaded,rows};
  }
  return{checkpoint,source,job,...result,errors,requests:gate.requests,review:'CAPTURED ONLY — all five area judgments and finding closure remain manual.'};
 }finally{await release(gate);await c.close();}
}
