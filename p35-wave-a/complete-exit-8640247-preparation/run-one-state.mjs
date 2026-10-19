import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {join} from 'node:path';
import {createRequire} from 'node:module';
import {createHash,randomInt,randomUUID,randomBytes} from 'node:crypto';

const [jobFile,dest]=process.argv.slice(2),job=JSON.parse(await readFile(jobFile,'utf8'));
if(process.env.WA_BROWSER_RELEASED!=='yes'||process.env.WA_BROWSER_RELEASE_SHA!==job.sourceSha)throw Error('Exact-SHA root release required.');
const bindings=JSON.parse(await readFile(job.bindingsPath,'utf8'));
const result={sourceSha:job.sourceSha,job,startedAt:new Date().toISOString(),complete:false,verdict:'unreviewed',requests:[],errors:[]};
const artifactJob={...job};if(artifactJob.route){const safe=new URL(artifactJob.route,job.url);for(const k of [...safe.searchParams.keys()])if(/review|token|proof|secret|signature/i.test(k))safe.searchParams.set(k,'REDACTED');artifactJob.route=safe.pathname+safe.search+safe.hash;}result.job=artifactJob;
const secrets=[];const save=()=>{let text=JSON.stringify(result,null,2);for(const value of secrets)text=text.replaceAll(value,'REDACTED').replaceAll(encodeURIComponent(value),'REDACTED');return writeFile(join(dest,'result.json'),text);};await mkdir(dest,{recursive:true});
const pw=createRequire(join(process.env.PLAYWRIGHT_RUNTIME_ROOT,'package.json'))('playwright');
const [width,height]=job.size.includes('x')?job.size.split('x').map(Number):[Number(job.size),Number(job.size)<600?844:900];
const phone=width<600||height<431;
let browser,context,page,phase='read',held=null,cycle=0,mockedResponses=0;
const deferred=()=>{let release;const promise=new Promise(r=>release=r);return {promise,release};};
const privateBodySalt=randomBytes(32);const hash=s=>createHash('sha256').update(privateBodySalt).update(s).digest('hex');
async function requestIdentity(req){
 const raw=req.postDataBuffer();if(!raw||/^pin-/.test(job.action??''))return{};
 let normalized,operationId;
 try{const value=req.postDataJSON();normalized=value;const find=v=>{if(!v||typeof v!=='object')return;for(const [k,x]of Object.entries(v)){if(k==='operationId'&&typeof x==='string')operationId=x;else if(x&&typeof x==='object')find(x);}};find(value);if(Array.isArray(value)&&value.length===1&&typeof value[0]==='string'&&/^[a-f0-9-]{36}$/.test(value[0]))operationId=value[0];}catch{}
 if(normalized===undefined&&/multipart\/form-data/i.test(req.headers()['content-type']??'')){try{const data=await new Request(req.url(),{method:req.method(),headers:req.headers(),body:raw}).formData();normalized=[...data].map(([k,v])=>[k,typeof v==='string'?v:'FILE']).sort((a,b)=>a[0].localeCompare(b[0]));for(const[k,v]of normalized)if(/(?:^|[_:])operationId$/.test(k)&&typeof v==='string')operationId=v;}catch{}}
 return{bodyIdentityHash:hash(normalized===undefined?raw:JSON.stringify(normalized)),...(operationId?{operationId}:{}),identityScope:'Private ephemeral salted hash; comparable within this one job only. No command/proof/PIN body retained.'};
}
const action=['form-states','sent'].includes(job.mode)?bindings.actions?.[job.action]?.[job.account]:null;
const path=action?.route||job.route;
if(['form-states','sent'].includes(job.mode)&&!action){result.gap='Missing read-only fixture/form binding for '+job.action+'/'+job.account;await save();process.exit(2);}
if(!path){result.gap='Missing case route';await save();process.exit(2);}
const target=new URL(path,job.url);if(target.origin!==job.url)throw Error('External state route refused.');for(const [name,value]of target.searchParams)if(/review|repair|token|proof|secret|signature/i.test(name)&&value)secrets.push(value);
const publicTarget=new URL(target);for(const name of [...publicTarget.searchParams.keys()])if(/review|repair|token|proof|secret|signature/i.test(name))publicTarget.searchParams.set(name,'REDACTED');result.boundRoute=publicTarget.pathname+publicTarget.search+publicTarget.hash;
const locator=(spec,root=page)=>{
 let found=spec.selector?root.locator(spec.selector):root.getByRole(spec.role||'button',{name:spec.name,exact:spec.exact!==false});
 if(spec.index!==undefined)found=found.nth(spec.index);
 return found;
};
async function prepare(steps=[]){
 for(const step of steps){
  if(step.op==='fill')await locator(step).fill(step.value);
  else if(step.op==='select'){
   const control=locator(step),value=step.value??await control.locator('option').evaluateAll(es=>es.find(e=>e.value&&!e.disabled)?.value);
   if(!value)throw Error('No selectable fixture option: '+JSON.stringify(step));await control.selectOption(value);
  }else if(step.op==='check')await locator(step).check();
  else if(step.op==='click')await locator(step).click();
  else if(step.op==='pinPair'){
   const digits=step.length??4,pin=String(randomInt(10**(digits-1),10**digits));for(const selector of step.selectors)await page.locator(selector).fill(pin);
  }else throw Error('Unsupported preparation operation: '+step.op);
 }
}
async function waitForHydratedForms(){
 await page.waitForFunction(()=>[...document.querySelectorAll('.wa-page form')].some(form=>Object.keys(form).some(key=>key.startsWith('__reactProps$')&&(typeof form[key]?.onSubmit==='function'||typeof form[key]?.action==='function'))),null,{timeout:30000});
}
async function metric(){return page.evaluate(()=>{
 const root=document.querySelector('.wa-page'),visible=e=>{const r=e.getBoundingClientRect(),s=getComputedStyle(e);return r.width>0&&r.height>0&&s.display!=='none'&&s.visibility!=='hidden'&&!e.closest('[hidden],[aria-hidden="true"]');};
 const box=e=>{const r=e.getBoundingClientRect();return {x:r.x,y:r.y,width:r.width,height:r.height,right:r.right,bottom:r.bottom};};
 const text=e=>(e.getAttribute('aria-label')||e.textContent||'').trim().replace(/\s+/g,' ').slice(0,180);
 const all=s=>[...(root?.querySelectorAll(s)??[])].filter(visible);
 const node=e=>{const s=getComputedStyle(e);return {text:text(e),class:e.getAttribute('class'),...box(e),font:s.font,fontSize:s.fontSize,lineHeight:s.lineHeight,color:s.color,background:s.backgroundColor,opacity:s.opacity,borderColor:s.borderColor,borderWidth:s.borderWidth,radius:s.borderRadius,outline:s.outline,outlineOffset:s.outlineOffset};};
 const small=[],walker=root?document.createTreeWalker(root,NodeFilter.SHOW_TEXT):null;
 for(let n=walker?.nextNode();n;n=walker.nextNode()){
  const e=n.parentElement;if(!e||!n.textContent.trim()||!visible(e))continue;
  const size=parseFloat(getComputedStyle(e).fontSize),floor=innerWidth<600||innerHeight<431?15:14,badge=/badge|count/i.test(String(e.className))&&/^\d+$/.test(n.textContent.trim());
  if(size<(badge?12:floor)-.01)small.push({text:n.textContent.trim().slice(0,100),size,class:e.getAttribute('class')});
 }
 const fields=all('.wa-field,.nevora-field').map(e=>{const f=e.querySelector('input:not([type=hidden]),select,textarea'),l=e.querySelector('.wa-field__label,.nevora-field-label'),h=e.querySelector('.wa-field__help,.nevora-field-hint');return {name:f?.name,field:f?node(f):null,label:l?node(l):null,help:h?node(h):null,labelGap:l&&f?box(f).y-box(l).bottom:null,helpGap:h&&f?box(h).y-box(f).bottom:null};});
 const tab=[...document.querySelectorAll('.mobile-nav')].find(visible),active=document.activeElement;
 return {viewport:{width:innerWidth,height:innerHeight},document:{width:document.documentElement.scrollWidth,height:document.documentElement.scrollHeight,scrollY},rootFound:!!root,
  title:all('h1').map(node),bands:all('[data-nv-band],.nv-band,.nv-masthead').map(node),cards:all('.nv-card').map(node),fields,
  controls:all('button,a[href],input:not([type=hidden]),select,textarea,summary').map(node),smallText:small,
  titles:all('.nv-row__title,.wa-option__title,.wa-check__title,.wa-notice__title').map(e=>({...node(e),clientHeight:e.clientHeight,scrollHeight:e.scrollHeight,clamp:getComputedStyle(e).webkitLineClamp})),
  notices:all('[role=alert],[role=status],.form-error,.form-success,.wa-target').map(node),tabBar:tab?box(tab):null,
  focus:active?node(active):null,text:root?.innerText.slice(0,18000),
  clipped:all('h1,h2,h3,p,label,.nv-row__title').filter(e=>e.scrollWidth>e.clientWidth+2&&['hidden','clip'].includes(getComputedStyle(e).overflowX)&&getComputedStyle(e).textOverflow!=='ellipsis').map(node)};
 });}
async function snapshot(name){const value=await metric();value.screenshot=name+'.png';await page.screenshot({path:join(dest,value.screenshot)});return value;}
async function controlMetric(handle){return handle.evaluate(e=>{const r=e.getBoundingClientRect(),s=getComputedStyle(e);return {x:r.x,y:r.y,width:r.width,height:r.height,offsetWidth:e.offsetWidth,offsetHeight:e.offsetHeight,transform:s.transform,opacity:s.opacity,color:s.color,background:s.backgroundColor,text:e.textContent,disabled:e.disabled,ariaDisabled:e.getAttribute('aria-disabled'),docHeight:document.documentElement.scrollHeight,scrollY};});}
try{
 browser=await pw[job.engine].launch();
 context=await browser.newContext({storageState:join(job.previewOut,'state',job.account+'.json'),viewport:{width,height},isMobile:phone,hasTouch:phone,serviceWorkers:'block',reducedMotion:job.reducedMotion?'reduce':'no-preference'});
 await context.route('**/*',async route=>{
  const req=route.request(),u=new URL(req.url());if(['http:','https:'].includes(u.protocol)&&u.origin!==job.url)return route.abort();
  if(!['GET','HEAD','OPTIONS'].includes(req.method())){
   const isAction=Boolean(req.headers()['next-action'])||(!u.pathname.startsWith('/__nextjs')&&u.pathname.startsWith('/api/'));
   result.requests.push({method:req.method(),path:u.pathname,nextAction:Boolean(req.headers()['next-action']),isAction,phase,cycle,...(isAction?await requestIdentity(req):{})});
   if(isAction&&held)await held.promise;
   if(isAction&&job.mode==='sent'&&mockedResponses===0){
    if(!req.headers()['next-action'])return route.abort();
    mockedResponses++;phase='sent-fulfilled';
    const mock={status:'pending',operationId:randomUUID(),requestId:randomUUID(),revision:1};
    result.mockResponse={kind:'browser-owned Next Flight structured action result',status:'pending',persistentBusinessResult:false};
    // Empty string is Next's explicit no-flight-tree path; normalizeFlightData(null) throws.
    return route.fulfill({status:200,contentType:'text/x-component',body:'0:'+JSON.stringify({a:mock,f:'',i:false})+'\n'});
   }
   return route.abort();
  }
  if(job.mode==='sent'&&phase==='sent-fulfilled'&&req.headers().rsc==='1'){result.refreshReads??=[];result.refreshReads.push({path:u.pathname,method:req.method()});}
  return route.continue();
 });
 if(context.routeWebSocket)await context.routeWebSocket('**/*',socket=>{const u=new URL(socket.url());if(u.origin.replace(/^ws/,'http')===job.url)socket.connectToServer();else socket.close();});
 page=await context.newPage();page.setDefaultTimeout(12000);page.on('pageerror',e=>result.errors.push(e.message.slice(0,600)));
 const response=await page.goto(target.href,{waitUntil:'load',timeout:60000});result.status=response?.status();await page.waitForTimeout(500);
 result.finalPath=new URL(page.url()).pathname;
 if(job.mode==='role'){
  result.measurement=await snapshot('role');result.expected=job.expect;result.complete=true;result.verdict='measured role result; human authorization disposition required';
 }else{
  if(job.scenario?.state==='scheduling'){await page.getByRole('tab',{name:'Scheduling',exact:true}).click();await page.waitForFunction(()=>[...document.querySelectorAll('[role=tab]')].some(e=>e.textContent.trim()==='Scheduling'&&e.getAttribute('aria-selected')==='true'));}
  await page.evaluate(t=>document.documentElement.style.fontSize=t+'%',job.text);await page.waitForTimeout(300);
  if(['judgment','receipt'].includes(job.mode)){
   if(job.expectedTitle)await page.locator('.wa-page h1').filter({hasText:job.expectedTitle}).waitFor();
   result.measurement=await snapshot(job.mode);result.complete=result.measurement.rootFound&&(!job.expectedTitle||result.measurement.title.some(t=>t.text===job.expectedTitle));result.verdict='measured five-area geometry/copy; human visual judgment required';
  }else if(job.mode==='sent'){
   await waitForHydratedForms();await prepare(action.prepare);const button=locator(action.button);await button.scrollIntoViewIfNeeded();
   cycle=1;phase='submit';held=deferred();result.before=await snapshot('before-sent');
   await button.click();await page.waitForTimeout(60);
   const box=await button.boundingBox();if(box)await page.mouse.click(box.x+box.width/2,box.y+box.height/2);
   await page.waitForTimeout(400);result.pending=await snapshot('sent-pending');
   held.release();held=null;
   await page.locator('.wa-page h1').filter({hasText:job.expectedTitle}).waitFor({timeout:15000});
   result.sent=await snapshot('sent');await page.waitForTimeout(2000);result.afterRefresh=await snapshot('sent-after-refresh');
   result.actionRequests=result.requests.filter(r=>r.isAction).length;result.mockedResponses=mockedResponses;
   result.complete=result.actionRequests===1&&mockedResponses===1&&result.sent.rootFound&&result.afterRefresh.text.includes(job.expectedTitle)&&result.errors.length===0;
   result.verdict=result.complete?'measured browser-fulfilled sent state; persistence/consent remain joint testing; human visual judgment required':'incomplete';
   if(!result.complete)result.gap='Sent boundary, retained refresh, exactly-one intercepted action or client error assertion failed';
  }else if(job.mode==='form-states'){
   await waitForHydratedForms();await prepare(action.prepare);result.cycles=[];
   const count=action.repeatFailures??(['delete','timeoff-approve','timeoff-decline'].includes(job.action)?3:action.retryButton?2:1);
   for(cycle=1;cycle<=count;cycle++){
    if(job.resize&&cycle>1){await page.setViewportSize({width,height});await page.waitForTimeout(250);}
    phase='before';const button=locator(cycle>1&&action.retryButton?action.retryButton:action.button);await button.scrollIntoViewIfNeeded();
    const handle=await button.elementHandle(),item={cycle,before:await controlMetric(handle)};result.cycles.push(item);
    held=deferred();phase='submit';const b=await handle.boundingBox();
    await page.mouse.move(b.x+b.width/2,b.y+b.height/2);await page.mouse.down();await page.waitForTimeout(200);await page.mouse.up();
    await page.waitForTimeout(40);await page.mouse.click(b.x+b.width/2,b.y+b.height/2);phase='pending';await page.waitForTimeout(400);
    item.pending=await controlMetric(handle);item.pendingScreen=await snapshot('cycle-'+cycle+'-pending');
    await page.waitForTimeout(1000);item.slowPending=await controlMetric(handle);
    if(job.resize){await page.setViewportSize(job.resize);await page.waitForTimeout(350);item.resizedPending=await controlMetric(handle);item.resizedScreen=await snapshot('cycle-'+cycle+'-resized');item.resizedWithinViewport=item.resizedPending.x>=-1&&item.resizedPending.x+item.resizedPending.width<=job.resize.width+1;}
    item.actionRequestsBeforeAbort=result.requests.filter(r=>r.cycle===cycle&&r.isAction).length;
    phase='abort';held.release();held=null;await page.waitForTimeout(1800);phase='failure';
    item.failure=await snapshot('cycle-'+cycle+'-failure');item.after=await controlMetric(handle);
    item.geometryDelta={width:item.pending.width-item.before.width,height:item.pending.height-item.before.height,x:item.pending.x-item.before.x,y:item.pending.y-item.before.y,documentHeight:item.pending.docHeight-item.before.docHeight};
   }
   result.sameOperationEvidence=result.requests.filter(r=>r.isAction&&r.operationId).map(r=>({cycle:r.cycle,operationId:r.operationId,bodyIdentityHash:r.bodyIdentityHash}));
   phase='offline';await context.setOffline(true);await page.waitForTimeout(250);result.offline=await snapshot('offline');await context.setOffline(false);
   result.complete=result.cycles.every(c=>c.actionRequestsBeforeAbort>0);result.verdict=result.complete?'measured held/aborted form states; no request reached server; human findings review required':'incomplete';if(!result.complete)result.gap='No intercepted action request; verify valid fixture/required inputs before counting this form case.';
  }else throw Error('Unsupported job mode '+job.mode);
 }
}catch(e){result.gap=e.message.slice(0,2000);result.complete=false;result.verdict='incomplete';}
finally{held?.release();if(context)await context.close().catch(()=>{});if(browser)await browser.close().catch(()=>{});result.completedAt=new Date().toISOString();await save();}
console.log(JSON.stringify({mode:job.mode,case:job.case||job.action,complete:result.complete,gap:result.gap}));
process.exitCode=result.complete?0:2;
