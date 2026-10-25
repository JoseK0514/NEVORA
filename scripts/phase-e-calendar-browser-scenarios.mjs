import assert from 'node:assert/strict';
import {join} from 'node:path';
import {readFile,writeFile} from 'node:fs/promises';
import {seedOwnedScenario,TEST_PASSWORD} from '../src/test/integration/owned-app-fixture.ts';
import {safeBrowserFailure,safeEvaluationFailure} from './release-browser-diagnostics.mjs';
import {waitForCalendarCopyReady} from './browser-render-readiness.mjs';
import {observeDocumentNavigation} from './browser-navigation-diagnostic.mjs';
import {runBeforeRecoveryDeadline} from './browser-response-deadline.mjs';
export async function runScenario({app,page,context,engine,width,evidenceDirectory,runtimeErrors:cellRuntimeErrors}){
 const checks=[],runtimeErrors=[],receipt=join(evidenceDirectory,`calendar-case-${engine}-${width}-report.json`);let stage='seed';
 const started=performance.now(),diagnostics={events:[]},navigation=observeDocumentNavigation(page,()=>app.url);let diagnosticActor;
 const record=(event,fields={})=>{diagnostics.events.push({stage,event,atMs:Math.round(performance.now()-started),...fields});if(diagnostics.events.length>64)diagnostics.events.shift();};
 for(const event of ['close','crash','domcontentloaded','load'])page.on(event,()=>record(event));
 const calendarPost=request=>request.method()==='POST'&&new URL(request.url()).origin===app.url&&new URL(request.url()).pathname==='/api/employee/calendar-subscriptions';
 page.on('request',request=>{if(calendarPost(request))record('post-request');});
 page.on('response',response=>{if(calendarPost(response.request()))record('post-response',{status:response.status()});});
 page.on('requestfinished',request=>{if(calendarPost(request))record('post-finished');});
 page.on('requestfailed',request=>{if(calendarPost(request))record('post-failed');});
 await context.exposeBinding('__nevoraQaCalendarLifecycle',(source,value)=>{
  if(source.page!==page||!value||!['focus','blur','pagehide','pageshow','visibilitychange'].includes(value.event))return;
  record(value.event,{visibility:['visible','hidden'].includes(value.visibility)?value.visibility:'unknown',focused:value.focused===true});
 });
 await context.addInitScript(()=>{
  const report=event=>{void globalThis.__nevoraQaCalendarLifecycle({event,visibility:document.visibilityState,focused:document.hasFocus()}).catch(()=>{});};
  for(const event of ['focus','blur','pagehide','pageshow'])window.addEventListener(event,()=>report(event));
  document.addEventListener('visibilitychange',()=>report('visibilitychange'));
 });
 const view=()=>runBeforeRecoveryDeadline(()=>page.evaluate(()=>{
  const panel=document.querySelector('[data-calendar-setting]'),text=panel?.textContent??'',replace=[...(panel?.querySelectorAll('button')??[])].find(e=>e.textContent?.trim()==='Replace link');
  return {visibility:['visible','hidden'].includes(document.visibilityState)?document.visibilityState:'unknown',focused:document.hasFocus(),panel:!!panel,disclosureOpen:panel?.closest('details.profile-calendar-disclosure')?.open??null,
   paused:text.includes('Calendar settings paused.'),active:text.includes('Link active'),unknown:text.includes('The result is unknown.'),unavailable:text.includes('Calendar settings unavailable.'),urlFields:panel?.querySelectorAll('textarea').length??0,
   replace:replace?{disabled:replace.disabled,ariaDisabled:replace.getAttribute('aria-disabled')==='true'}:null};
 }),performance.now()+5000);
 const operationCount=()=>runBeforeRecoveryDeadline(async()=>Number((await app.database.executor.query({text:'SELECT count(*)::integer n FROM calendar_operations WHERE actor_employee_id=$1',values:[diagnosticActor]}))[0].n),performance.now()+5000);
 page.on('pageerror',error=>{if(!cellRuntimeErrors.isNavigationDiagnostic(error))runtimeErrors.push({stage,...safeBrowserFailure(error,{suite:'calendar',engine,width,status:'failed'})});});
 const step=async(name,run)=>{stage=name;await writeFile(receipt,JSON.stringify({stage:name,status:'running',checks,runtimeErrors,diagnostics}));try{await run();checks.push(name);await writeFile(receipt,JSON.stringify({stage:name,status:'passed',checks,runtimeErrors,diagnostics}));}catch(error){
  diagnostics.failure={pageClosed:page.isClosed(),browserConnected:context.browser()?.isConnected()??null,navigation:navigation.snapshot()};
  try{diagnostics.failure.view=await view();}catch(error){diagnostics.failure.viewReadFailure=safeEvaluationFailure(error);}
  if(diagnosticActor)try{diagnostics.failure.canonicalOperations=await operationCount();}catch(error){diagnostics.failure.canonicalReadFailure=safeEvaluationFailure(error);}
  await writeFile(receipt,JSON.stringify({stage:name,status:'failed',checks,runtimeErrors,diagnostics,failure:safeBrowserFailure(error,{suite:'calendar',engine,width,status:'failed'})}));throw Error('Calendar case failed: '+name);
 }};
 const currentPageReady=async()=>{await page.waitForFunction(()=>document.querySelector('.portal-notification-bell')?.getAttribute('data-state')==='ready');await page.waitForLoadState('networkidle');};
 const panel=page.locator('[data-calendar-setting]');
 const retry=()=>panel.getByRole('button',{name:'Try again to load the calendar link',exact:true});
 const management=()=>panel.locator('details.employee-calendar-management');
 const openManagement=async()=>{if(await management().getAttribute('open')===null)await management().locator('summary').click();await management().locator('p').waitFor({state:'visible'});};
 const state=async(text)=>{await panel.getByText(text,{exact:true}).waitFor();};
 const noUrl=async()=>assert.equal(await panel.locator('textarea').count(),0);
 let firstUrl,secondUrl,firstBody;
 // This non-secret probe MUST run before any real test capability is issued.
 await step('Pre-issuance sentinel absent from persisted request and Next logs',async()=>{
  const sentinel='A'.repeat(43),endpoint=app.url+'/api/calendar/'+sentinel+'/schedule.ics';
  for(const method of ['GET','HEAD','POST']){const response=await fetch(endpoint,{method,redirect:'manual'});assert.equal(response.status,method==='POST'?405:404);await response.text();}
  await fetch(endpoint+'?probe=1');await fetch(app.url+'/login');await new Promise(resolve=>setTimeout(resolve,150));assert.equal((await readFile(join(app.root,'next.log'),'utf8')).includes(sentinel),false);
 });
 // Other suites deliberately vary the fictional location label. Restore this suite's expected canonical label.
 await app.database.executor.query({text:"UPDATE locations SET short_name='Main Office' WHERE id='loc-1'",values:[]});
 const fixture=await seedOwnedScenario(app.database.executor,'CALENDAR'+engine.toUpperCase()+width,[320,375,390,430,768,1024,1440].indexOf(width)+(engine==='webkit'?7:0));
 diagnosticActor=fixture.actors[0];
 const q=(text,values=[])=>app.database.executor.query({text,values});
 await step('Real fictional login and Schedule secondary calendar entry',async()=>{
  await page.goto(app.url+'/login');await page.getByLabel('Employee ID',{exact:true}).fill(fixture.actors[0]);await page.getByLabel('Password',{exact:true}).fill(TEST_PASSWORD);
  try{
   await Promise.all([page.waitForURL(url=>url.pathname==='/app',{waitUntil:'commit'}),page.getByRole('button',{name:'Sign in',exact:true}).click()]);await page.locator('.app-shell.nevora-portal').waitFor();await currentPageReady();
  }catch(error){
   const url=new URL(page.url()),reason=url.searchParams.get('error');
   await writeFile(join(evidenceDirectory,`calendar-login-${engine}-${width}-report.json`),JSON.stringify({engine,width,route:['/login','/app'].includes(url.pathname)?url.pathname:'other',reason:['busy','invalid','deleting'].includes(reason)?reason:null,failure:safeBrowserFailure(error,{suite:'calendar',engine,width,status:'failed'})},null,2));
   await page.screenshot({path:join(evidenceDirectory,`calendar-login-${engine}-${width}-failure.png`),fullPage:true});throw error;
  }
  await page.goto(app.url+'/app/schedule');await currentPageReady();const calendarEntry=page.getByRole('link',{name:/^Add shifts to your calendar\b/});assert.equal(await calendarEntry.getAttribute('href'),'/app/more#employee-calendar-title');await calendarEntry.click();await state('No calendar link');await currentPageReady();
 });
 await step('Deliberate create produces one transient URL and own private GET/HEAD feed',async()=>{
  await panel.getByRole('button',{name:'Create link',exact:true}).click();await panel.getByText('Link created.',{exact:true}).waitFor();firstUrl=await panel.getByLabel('Your private calendar link',{exact:true}).inputValue();assert.equal(new URL(firstUrl).origin,app.url);
  const feed=await page.request.get(firstUrl,{maxRedirects:0,headers:{'If-None-Match':'"fictional-old"'}});assert.equal(feed.status(),200);firstBody=await feed.text();assert.equal((firstBody.match(/BEGIN:VEVENT/g)||[]).length,1);assert.equal(firstBody.includes('LOCATION:Main Office'),true);assert.equal(firstBody.includes(fixture.actors[1]),false);
  for(const key of ['cache-control','referrer-policy'])assert.equal(feed.headers()[key],key==='cache-control'?'no-store, private':'no-referrer');assert.equal(feed.headers()['access-control-allow-origin'],undefined);assert.equal(feed.headers().location,undefined);assert.equal(feed.headers().etag,undefined);
  const head=await page.request.head(firstUrl);assert.equal(head.status(),200);assert.equal(await head.text(),'');
  const stored=JSON.stringify(await q('SELECT * FROM calendar_subscriptions WHERE employee_id=$1',[fixture.actors[0]]))+JSON.stringify(await q('SELECT * FROM calendar_operations WHERE actor_employee_id=$1',[fixture.actors[0]]));assert.equal(stored.includes(firstUrl),false);assert.equal(stored.includes(new URL(firstUrl).pathname.split('/')[3]),false);
 });
 await step('Completed controlled clipboard write shows copied feedback only after completion',async()=>{
  await waitForCalendarCopyReady(page,'Link created.');
  await page.evaluate(()=>Object.defineProperty(navigator,'clipboard',{configurable:true,value:{writeText:()=>new Promise(resolve=>{window.finishFictionalCopy=resolve;})}}));await panel.getByRole('button',{name:'Copy link',exact:true}).click();assert.equal(await panel.getByText('Link copied.',{exact:true}).count(),0);await page.evaluate(()=>window.finishFictionalCopy?.());await panel.getByText('Link copied.',{exact:true}).waitFor();
 });
 await step('Clipboard rejection offers keyboard-accessible manual select without false copied success',async()=>{
  await waitForCalendarCopyReady(page,'Link copied.');
  await page.evaluate(()=>Object.defineProperty(navigator,'clipboard',{configurable:true,value:{writeText:async()=>{throw Error('Fictional clipboard unavailable');}}}));await panel.getByRole('button',{name:'Copy link',exact:true}).click();await panel.getByText('Copy was unavailable. Use Select link, then copy it manually.',{exact:true}).waitFor();assert.equal(await panel.getByText('Link copied.',{exact:true}).count(),0);
  await panel.getByRole('button',{name:'Select link',exact:true}).focus();await page.keyboard.press('Enter');assert.equal(await page.evaluate(()=>{const field=document.activeElement;return field instanceof HTMLTextAreaElement&&field.selectionStart===0&&field.selectionEnd===field.value.length;}),true);
 });
 await step('Blur and offline clear the one-time URL and refocus returns only safe active status',async()=>{
  await page.evaluate(()=>window.dispatchEvent(new Event('blur')));await noUrl();await panel.getByText('Calendar settings paused. Return to this window to check the link.',{exact:true}).waitFor();await context.setOffline(true);await page.evaluate(()=>window.dispatchEvent(new Event('offline')));await noUrl();await context.setOffline(false);await page.evaluate(()=>window.dispatchEvent(new Event('online')));await state('Link active');await noUrl();
  assert.equal(await panel.getByText('The link is stored securely and cannot be retrieved. Replace link to create a new URL; the previous link will stop working.',{exact:true}).count(),1);
 });
 await step('Replace revokes old origin requests while event UID and serialized bytes remain stable',async()=>{
  await panel.getByRole('button',{name:'Replace link',exact:true}).click();await panel.getByText('Link created.',{exact:true}).waitFor();secondUrl=await panel.getByLabel('Your private calendar link',{exact:true}).inputValue();assert.equal(firstUrl===secondUrl,false);const old=await page.request.get(firstUrl,{headers:{'If-None-Match':'"fictional-old"'}});assert.equal(old.status(),404);assert.equal(await old.text(),'Calendar unavailable.');const replacement=await page.request.get(secondUrl);assert.equal(replacement.status(),200);assert.equal(await replacement.text(),firstBody);
 });
 await step('Delayed completed clipboard response after hide cannot restore copied notice or private URL',async()=>{
  await waitForCalendarCopyReady(page,'Link created.');
  await page.evaluate(()=>Object.defineProperty(navigator,'clipboard',{configurable:true,value:{writeText:()=>new Promise(resolve=>{window.finishFictionalCopy=resolve;})}}));await panel.getByRole('button',{name:'Copy link',exact:true}).click();await page.evaluate(()=>window.dispatchEvent(new Event('blur')));await page.evaluate(()=>window.finishFictionalCopy?.());await noUrl();assert.equal(await panel.getByText('Link copied.',{exact:true}).count(),0);await page.evaluate(()=>window.dispatchEvent(new Event('focus')));await state('Link active');await noUrl();
 });
 await step('Lost issuance response retries the same committed operation without recovering the raw URL',async()=>{
  diagnostics.responseLoss={before:await view(),canonicalOperationsBefore:await operationCount(),intercepted:false,upstreamCreated:false,fulfilled:false};
  let intercepted=false,completed;const injected=new Promise(resolve=>{completed=resolve;});
  await page.route('**/api/employee/calendar-subscriptions',async route=>{if(route.request().method()==='POST'&&!intercepted){intercepted=true;diagnostics.responseLoss.intercepted=true;record('response-loss-intercept');const response=await route.fetch();record('response-loss-upstream',{status:response.status()});const result=await response.json();diagnostics.responseLoss.upstreamCreated=result.status==='created';assert.equal(result.status,'created');await route.fulfill({status:503,contentType:'application/json',body:JSON.stringify({status:'outcome_unknown',operationId:result.operationId}),headers:{'Cache-Control':'no-store, private'}});diagnostics.responseLoss.fulfilled=true;record('response-loss-fulfilled');completed();}else await route.continue();});
  await panel.getByRole('button',{name:'Replace link',exact:true}).click();record('response-loss-click-returned');const deadline=performance.now()+15000;await panel.getByText('The result is unknown. Retry the same operation to check it.',{exact:true}).waitFor();await runBeforeRecoveryDeadline(()=>injected,deadline);assert(diagnostics.responseLoss.intercepted&&diagnostics.responseLoss.upstreamCreated&&diagnostics.responseLoss.fulfilled,'The original-operation recovery must follow actual committed response loss');await noUrl();assert(await panel.getByRole('button',{name:'Replace link',exact:true}).isDisabled());await openManagement();assert(await panel.getByRole('button',{name:'Revoke link',exact:true}).isDisabled());await retry().click();await panel.getByText('The link is active. Its URL cannot be retrieved; replace the link to create a new one.',{exact:true}).waitFor();await state('Link active');await noUrl();await page.unroute('**/api/employee/calendar-subscriptions');assert.equal((await page.request.get(secondUrl)).status(),404);assert.equal(Number((await q('SELECT count(*)::integer n FROM calendar_subscriptions WHERE employee_id=$1 AND revoked_at IS NULL',[fixture.actors[0]]))[0].n),1);diagnostics.responseLoss.canonicalOperationsAfter=await operationCount();assert.equal(diagnostics.responseLoss.canonicalOperationsAfter,diagnostics.responseLoss.canonicalOperationsBefore+1,'The committed operation replay cannot issue a second link');
 });
 await step('Late creation response after hide remains suppressed and replay has no URL',async()=>{
  let intercepted=false;await page.route('**/api/employee/calendar-subscriptions',async route=>{if(route.request().method()==='POST'&&!intercepted){intercepted=true;const response=await route.fetch();assert.equal(response.status(),200);await page.evaluate(()=>window.dispatchEvent(new Event('blur')));await route.fulfill({response});}else await route.continue();});await panel.getByRole('button',{name:'Replace link',exact:true}).click();await panel.getByText('Calendar settings paused. Return to this window to check the link.',{exact:true}).waitFor();await noUrl();await page.unroute('**/api/employee/calendar-subscriptions');await page.evaluate(()=>window.dispatchEvent(new Event('focus')));await state('Link active');await noUrl();await retry().click();await panel.getByText('The link is active. Its URL cannot be retrieved; replace the link to create a new one.',{exact:true}).waitFor();await noUrl();
 });
 await step('Unavailable settings offer retry and real current status recovers',async()=>{
  await page.route('**/api/employee/calendar-subscriptions',route=>route.request().method()==='GET'?route.fulfill({status:503,contentType:'application/json',body:JSON.stringify({state:'unavailable',reason:'fictional_failure'})}):route.continue());await page.evaluate(()=>window.dispatchEvent(new Event('focus')));await panel.getByText('Calendar settings unavailable.',{exact:false}).waitFor();await noUrl();await page.unroute('**/api/employee/calendar-subscriptions');await retry().click();await state('Link active');
 });
 await step('Revocation status, client caveats, responsive keyboard controls and token-free capture',async()=>{
  await openManagement();await management().getByText('Replacing the link stops the previous link and requires you to subscribe again. Revoking this link stops future access; it cannot remove information already copied by a calendar app.',{exact:true}).waitFor();
  await page.bringToFront();const revoke=panel.getByRole('button',{name:'Revoke link',exact:true});await revoke.scrollIntoViewIfNeeded();await revoke.focus();assert(await revoke.evaluate(e=>e===document.activeElement),'Revoke has native keyboard focus before Enter');await page.keyboard.press('Enter');await state('Link revoked');await noUrl();assert.equal(await management().count(),0);
  for(const [provider,guide] of [['Apple Calendar','Apple subscription guide'],['Google Calendar','Google subscription guide'],['Outlook','Outlook subscription guide']]){const instructions=panel.locator('.employee-calendar-providers details').filter({hasText:provider});assert.equal(await instructions.getAttribute('open'),null);await instructions.locator('summary').click();await instructions.getByRole('link',{name:guide,exact:true}).waitFor();await instructions.locator('summary').click();}
  assert(await panel.getByText('Calendar apps refresh on their own schedule.',{exact:false}).isVisible());assert(await panel.getByText('Creating or copying a link does not confirm a calendar connection.',{exact:false}).isVisible());assert.equal(await panel.getByText('Calendar connected',{exact:true}).count(),0);
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=document.documentElement.clientWidth+1),true);const persisted=await page.evaluate(async()=>({text:JSON.stringify({...localStorage,...sessionStorage}),cached:(await Promise.all((await caches.keys()).map(async key=>(await (await caches.open(key)).keys()).map(r=>r.url)))).flat()}));assert.equal(persisted.text.includes(new URL(firstUrl).pathname.split('/')[3]),false);assert.equal(persisted.cached.some(url=>url.includes('/api/calendar/')),false);
  await page.screenshot({path:join(evidenceDirectory,`calendar-profile-${engine}-${width}.png`),fullPage:true});assert.equal((await readFile(join(app.root,'next.log'),'utf8')).includes(new URL(firstUrl).pathname.split('/')[3]),false);assert.equal((await readFile(join(app.root,'next.log'),'utf8')).includes(new URL(secondUrl).pathname.split('/')[3]),false);
 });
 return {checks};
}
