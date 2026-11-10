import assert from 'node:assert/strict';
import {join} from 'node:path';
import {readFile,writeFile} from 'node:fs/promises';
import {seedOwnedScenario,TEST_PASSWORD} from '../src/test/integration/owned-app-fixture.ts';
import {safeBrowserFailure,safeEvaluationFailure} from './release-browser-diagnostics.mjs';
import {waitForCalendarCopyReady} from './browser-render-readiness.mjs';
import {observeDocumentNavigation} from './browser-navigation-diagnostic.mjs';
import {runBeforeRecoveryDeadline} from './browser-response-deadline.mjs';
export async function runScenario({app,page,context,engine,width,evidenceDirectory,runtimeErrors:cellRuntimeErrors}){
 // Release 1 (board E-Calendar): the calendar link is its own page, /app/profile/calendar, and every width draws the same
 // corporate view (employee-mobile/calendar.tsx) on the shared calendar client. The link's status is the card's pill.
 const phone=width<768,copy={
  create:'Create calendar link',copyLink:'Copy calendar link',
  created:'Link created. Copy it now to use it in your calendar app.',
  paused:'Calendar settings paused. Return to this window to check your link.',
  stored:'For your privacy the link is shown only once. Get a new link if you need to copy it again.',
  unknown:'The result is unknown. Retry the original request to finish checking it. No new request will be created.',
  finished:'Your earlier request went through, but the private link can’t be shown again. Get a new link if you still need to copy it.',
  unavailable:'Calendar settings could not be checked. Try again to see the current status.',
  copyFailed:'Copy was unavailable. Select the link above, then copy it manually.',
  revokeCaveat:'Your calendar app will no longer receive shifts through this link. Events already copied may remain in the app.',
  privacy:'Your calendar app picks up schedule changes the next time it refreshes, which can take a while. Anyone with the link can see your shift times and locations, so keep it to yourself.',
 };
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
  const panel=document.querySelector('[data-calendar-setting]'),text=panel?.textContent??'',reset=[...(panel?.querySelectorAll('button')??[])].find(e=>e.textContent?.trim()==='Get a new link');
  return {visibility:['visible','hidden'].includes(document.visibilityState)?document.visibilityState:'unknown',focused:document.hasFocus(),panel:!!panel,state:panel?.getAttribute('data-calendar-state')??null,pill:panel?.querySelector('.c-card__aside .c-pill')?.textContent??null,
   paused:text.includes('Calendar settings paused.'),unknown:text.includes('The result is unknown.'),unavailable:text.includes('Calendar settings could not be checked.'),urlFields:panel?.querySelectorAll('textarea').length??0,
   reset:reset?{disabled:reset.disabled}:null};
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
 // The outcome-unknown replay and the failed read are named separately.
 const retry=()=>panel.getByRole('button',{name:'Retry original request',exact:true});
 const retryRead=()=>panel.getByRole('button',{name:'Try again',exact:true});
 // Reset (rotate) and Revoke sit under the link card while it is active; each opens a consequence confirmation first.
 const management=()=>panel.locator('.em-calendar-manage');
 // B7 wording: kind 'Reset' presses "Get a new link"; kind 'Revoke' presses "Turn off link".
 const confirmChange=async kind=>{const before=await operationCount();const group=panel.getByRole('group',{name:kind==='Reset'?'Get a new calendar link?':'Turn off your calendar link?',exact:true});await group.waitFor();assert.equal(await operationCount(),before,'Confirmation precedes the calendar mutation');await group.getByRole('button',{name:kind==='Reset'?'Get a new link':'Turn off link',exact:true}).click();};
 // The status pill names the link's state (Off, Active, Revoked) once the current status is read.
 const pills={none:'Off',active:'Active',revoked:'Turned off'};
 const state=async kind=>{await page.locator(`[data-calendar-setting][data-calendar-state="${kind}"]`).waitFor({state:'attached'});await panel.locator('.c-card__aside .c-pill').first().getByText(pills[kind],{exact:true}).waitFor();};
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
 // Release 1: the subscriber is an Employee (the corporate profile that ships; a Lead keeps the on-hold v5 look).
 await app.database.executor.query({text:"UPDATE employees SET role='EMPLOYEE' WHERE id=$1",values:[fixture.actors[0]]});
 const q=(text,values=[])=>app.database.executor.query({text,values});
 await step('Real fictional login and secondary calendar entry from the Employee shell',async()=>{
  await page.goto(app.url+'/login');await page.getByLabel('Employee ID',{exact:true}).fill(fixture.actors[0]);await page.getByLabel('Password',{exact:true}).fill(TEST_PASSWORD);
  try{
   await Promise.all([page.waitForURL(url=>url.pathname==='/app',{waitUntil:'commit'}),page.getByRole('button',{name:'Sign in',exact:true}).click()]);await page.locator('.app-shell.nevora-portal').waitFor();await currentPageReady();
  }catch(error){
   const url=new URL(page.url()),reason=url.searchParams.get('error');
   await writeFile(join(evidenceDirectory,`calendar-login-${engine}-${width}-report.json`),JSON.stringify({engine,width,route:['/login','/app'].includes(url.pathname)?url.pathname:'other',reason:['busy','invalid','deleting'].includes(reason)?reason:null,failure:safeBrowserFailure(error,{suite:'calendar',engine,width,status:'failed'})},null,2));
   await page.screenshot({path:join(evidenceDirectory,`calendar-login-${engine}-${width}-failure.png`),fullPage:true});throw error;
  }
  // Board E-Calendar: the link is its own page. The older Profile deep link (#employee-calendar-title) still lands there.
  await page.goto(app.url+'/app/profile#employee-calendar-title');await page.waitForURL(url=>url.pathname==='/app/profile/calendar');await panel.waitFor();
  // The approved Schedule board (G-E-Schedule) has no calendar control. Phones reach it from the header avatar's More page
  // (board E-More, "Add shifts to your calendar"); wider viewports, which have no More page, from the account menu.
  await page.goto(app.url+'/app/schedule');await currentPageReady();
  if(phone){await page.getByRole('link',{name:/^More, /}).click();await page.waitForURL(url=>url.pathname==='/app/more');}
  else await page.getByRole('button',{name:/, account menu$/}).click();
  const calendarEntry=(phone?page.locator('main'):page.locator('#portal-account-menu')).getByRole('link',{name:'Add shifts to your calendar',exact:true});assert.equal(await calendarEntry.getAttribute('href'),'/app/profile/calendar');
  await calendarEntry.click();await page.waitForURL(url=>url.pathname==='/app/profile/calendar');await page.getByRole('heading',{level:1,name:'Add to calendar',exact:true}).waitFor();
  await state('none');await currentPageReady();
 });
 await step('Deliberate create produces one transient URL and own private GET/HEAD feed',async()=>{
  await panel.getByRole('button',{name:copy.create,exact:true}).click();await panel.getByText(copy.created,{exact:true}).waitFor();firstUrl=await panel.getByLabel('Your private calendar link',{exact:true}).inputValue();assert.equal(new URL(firstUrl).origin,app.url);
  const feed=await page.request.get(firstUrl,{maxRedirects:0,headers:{'If-None-Match':'"fictional-old"'}});assert.equal(feed.status(),200);firstBody=await feed.text();assert.equal((firstBody.match(/BEGIN:VEVENT/g)||[]).length,1);assert.equal(firstBody.includes('LOCATION:Main Office'),true);assert.equal(firstBody.includes(fixture.actors[1]),false);
  for(const key of ['cache-control','referrer-policy'])assert.equal(feed.headers()[key],key==='cache-control'?'no-store, private':'no-referrer');assert.equal(feed.headers()['access-control-allow-origin'],undefined);assert.equal(feed.headers().location,undefined);assert.equal(feed.headers().etag,undefined);
  const head=await page.request.head(firstUrl);assert.equal(head.status(),200);assert.equal(await head.text(),'');
  const stored=JSON.stringify(await q('SELECT * FROM calendar_subscriptions WHERE employee_id=$1',[fixture.actors[0]]))+JSON.stringify(await q('SELECT * FROM calendar_operations WHERE actor_employee_id=$1',[fixture.actors[0]]));assert.equal(stored.includes(firstUrl),false);assert.equal(stored.includes(new URL(firstUrl).pathname.split('/')[3]),false);
 });
 await step('Completed controlled clipboard write shows copied feedback only after completion',async()=>{
  await waitForCalendarCopyReady(page,copy.created);
  await page.evaluate(()=>Object.defineProperty(navigator,'clipboard',{configurable:true,value:{writeText:()=>new Promise(resolve=>{window.finishFictionalCopy=resolve;})}}));await panel.getByRole('button',{name:copy.copyLink,exact:true}).click();assert.equal(await panel.getByText('Link copied.',{exact:true}).count(),0);await page.evaluate(()=>window.finishFictionalCopy?.());await panel.getByText('Link copied.',{exact:true}).waitFor();
 });
 await step('Clipboard rejection offers keyboard-accessible manual select without false copied success',async()=>{
  await waitForCalendarCopyReady(page,'Link copied.');
  await page.evaluate(()=>Object.defineProperty(navigator,'clipboard',{configurable:true,value:{writeText:async()=>{throw Error('Fictional clipboard unavailable');}}}));await panel.getByRole('button',{name:copy.copyLink,exact:true}).click();await panel.getByText(copy.copyFailed,{exact:true}).waitFor();assert.equal(await panel.getByText('Link copied.',{exact:true}).count(),0);
  // The link field sits just above Copy calendar link and selects its whole value when it takes focus (no Select link button).
  await panel.getByRole('button',{name:copy.copyLink,exact:true}).focus();await page.keyboard.press(process.platform==='darwin'&&engine==='webkit'?'Alt+Shift+Tab':'Shift+Tab');assert.equal(await page.evaluate(()=>document.activeElement?.id),'employee-calendar-link','Native reverse Tab reaches the link field');
  // The field selects its whole value once focus has settled (WebKit places the caret first).
  await page.waitForFunction(()=>{const field=document.activeElement;return field instanceof HTMLTextAreaElement&&field.id==='employee-calendar-link'&&field.value.length>0&&field.selectionStart===0&&field.selectionEnd===field.value.length;});
 });
 await step('Blur and offline clear the one-time URL and refocus returns only safe active status',async()=>{
  await page.evaluate(()=>window.dispatchEvent(new Event('blur')));await noUrl();await panel.getByText(copy.paused,{exact:true}).waitFor();await context.setOffline(true);await page.evaluate(()=>window.dispatchEvent(new Event('offline')));await noUrl();await context.setOffline(false);await page.evaluate(()=>window.dispatchEvent(new Event('online')));await state('active');await noUrl();
  assert.equal(await panel.getByText(copy.stored,{exact:true}).count(),1);
 });
 await step('Replace revokes old origin requests while event UID and serialized bytes remain stable',async()=>{
  await panel.getByRole('button',{name:'Get a new link',exact:true}).click();await confirmChange('Reset');await panel.getByText(copy.created,{exact:true}).waitFor();secondUrl=await panel.getByLabel('Your private calendar link',{exact:true}).inputValue();assert.equal(firstUrl===secondUrl,false);const old=await page.request.get(firstUrl,{headers:{'If-None-Match':'"fictional-old"'}});assert.equal(old.status(),404);assert.equal(await old.text(),'Calendar unavailable.');const replacement=await page.request.get(secondUrl);assert.equal(replacement.status(),200);assert.equal(await replacement.text(),firstBody);
 });
 await step('Delayed completed clipboard response after hide cannot restore copied notice or private URL',async()=>{
  await waitForCalendarCopyReady(page,copy.created);
  await page.evaluate(()=>Object.defineProperty(navigator,'clipboard',{configurable:true,value:{writeText:()=>new Promise(resolve=>{window.finishFictionalCopy=resolve;})}}));await panel.getByRole('button',{name:copy.copyLink,exact:true}).click();await page.evaluate(()=>window.dispatchEvent(new Event('blur')));await page.evaluate(()=>window.finishFictionalCopy?.());await noUrl();assert.equal(await panel.getByText('Link copied.',{exact:true}).count(),0);await page.evaluate(()=>window.dispatchEvent(new Event('focus')));await state('active');await noUrl();
 });
 await step('Lost issuance response retries the same committed operation without recovering the raw URL',async()=>{
  diagnostics.responseLoss={before:await view(),canonicalOperationsBefore:await operationCount(),intercepted:false,upstreamCreated:false,fulfilled:false};
  let intercepted=false,completed;const injected=new Promise(resolve=>{completed=resolve;});
  await page.route('**/api/employee/calendar-subscriptions',async route=>{if(route.request().method()==='POST'&&!intercepted){intercepted=true;diagnostics.responseLoss.intercepted=true;record('response-loss-intercept');const response=await route.fetch();record('response-loss-upstream',{status:response.status()});const result=await response.json();diagnostics.responseLoss.upstreamCreated=result.status==='created';assert.equal(result.status,'created');await route.fulfill({status:503,contentType:'application/json',body:JSON.stringify({status:'outcome_unknown',operationId:result.operationId}),headers:{'Cache-Control':'no-store, private'}});diagnostics.responseLoss.fulfilled=true;record('response-loss-fulfilled');completed();}else await route.continue();});
  await panel.getByRole('button',{name:'Get a new link',exact:true}).click();await confirmChange('Reset');record('response-loss-click-returned');const deadline=performance.now()+15000;await panel.getByText(copy.unknown,{exact:true}).waitFor();await runBeforeRecoveryDeadline(()=>injected,deadline);assert(diagnostics.responseLoss.intercepted&&diagnostics.responseLoss.upstreamCreated&&diagnostics.responseLoss.fulfilled,'The original-operation recovery must follow actual committed response loss');await noUrl();
  // Reset and Revoke are withheld (not merely disabled) until the original request is checked.
  await retry().waitFor();assert.equal(await panel.getByRole('button',{name:'Get a new link',exact:true}).count(),0);assert.equal(await panel.getByRole('button',{name:'Turn off link',exact:true}).count(),0);assert.equal(await management().count(),0);
  await retry().click();await panel.getByText(copy.finished,{exact:true}).waitFor();await state('active');await noUrl();await page.unroute('**/api/employee/calendar-subscriptions');assert.equal((await page.request.get(secondUrl)).status(),404);assert.equal(Number((await q('SELECT count(*)::integer n FROM calendar_subscriptions WHERE employee_id=$1 AND revoked_at IS NULL',[fixture.actors[0]]))[0].n),1);diagnostics.responseLoss.canonicalOperationsAfter=await operationCount();assert.equal(diagnostics.responseLoss.canonicalOperationsAfter,diagnostics.responseLoss.canonicalOperationsBefore+1,'The committed operation replay cannot issue a second link');
 });
 await step('Late creation response after hide remains suppressed and replay has no URL',async()=>{
  let intercepted=false;await page.route('**/api/employee/calendar-subscriptions',async route=>{if(route.request().method()==='POST'&&!intercepted){intercepted=true;const response=await route.fetch();assert.equal(response.status(),200);await page.evaluate(()=>window.dispatchEvent(new Event('blur')));await route.fulfill({response});}else await route.continue();});await panel.getByRole('button',{name:'Get a new link',exact:true}).click();await confirmChange('Reset');await panel.getByText(copy.paused,{exact:true}).waitFor();await noUrl();await page.unroute('**/api/employee/calendar-subscriptions');await page.evaluate(()=>window.dispatchEvent(new Event('focus')));await state('active');await noUrl();await retry().click();await panel.getByText(copy.finished,{exact:true}).waitFor();await noUrl();
 });
 await step('Unavailable settings offer retry and real current status recovers',async()=>{
  await page.route('**/api/employee/calendar-subscriptions',route=>route.request().method()==='GET'?route.fulfill({status:503,contentType:'application/json',body:JSON.stringify({state:'unavailable',reason:'fictional_failure'})}):route.continue());await page.evaluate(()=>{window.dispatchEvent(new Event('blur'));window.dispatchEvent(new Event('focus'));});await panel.getByText(copy.unavailable,{exact:false}).waitFor();await noUrl();assert.equal(await panel.getByRole('button',{name:/^(Get a new link|Turn off link|Create calendar link|Copy calendar link)$/}).count(),0);await page.unroute('**/api/employee/calendar-subscriptions');await retryRead().click();await state('active');
 });
 await step('Revocation status, client caveats, responsive keyboard controls and token-free capture',async()=>{
  assert(await panel.getByText(copy.privacy,{exact:true}).isVisible(),'The link card says who can see the shifts');
  await page.bringToFront();const revoke=management().getByRole('button',{name:'Turn off link',exact:true});await revoke.scrollIntoViewIfNeeded();await revoke.focus();assert(await revoke.evaluate(e=>e===document.activeElement),'Revoke has native keyboard focus before Enter');await page.keyboard.press('Enter');
  // Enter opens the consequence confirmation, which takes focus and states the client caveat. Native Tab reaches Keep current
  // link first (the safe choice), then the red Revoke link, and Enter presses it.
  const before=await operationCount(),group=panel.getByRole('group',{name:'Turn off your calendar link?',exact:true});await group.waitFor();await page.waitForFunction(()=>document.activeElement?.id==='calendar-link-confirmation');assert.equal(await operationCount(),before,'Confirmation precedes revocation');
  assert(await group.getByText(copy.revokeCaveat,{exact:true}).isVisible(),'Revocation cannot remove events a calendar app already copied');
  const tab=process.platform==='darwin'&&engine==='webkit'?'Alt+Tab':'Tab',keep=group.getByRole('button',{name:'Keep current link',exact:true}),confirm=group.getByRole('button',{name:'Turn off link',exact:true});
  await page.keyboard.press(tab);assert(await keep.evaluate(e=>e===document.activeElement),'Keep current link comes first');await page.keyboard.press(tab);assert(await confirm.evaluate(e=>e===document.activeElement),'Confirm revoke has native keyboard focus before Enter');await page.keyboard.press('Enter');
  await state('revoked');await panel.getByText('Link turned off. Calendar apps can’t get your shifts through it anymore.',{exact:true}).waitFor();await noUrl();assert.equal(await management().count(),0);
  for(const [provider,guide] of [['Apple Calendar','Apple setup guide'],['Google Calendar','Google setup guide'],['Outlook','Outlook setup guide']]){const toggle=panel.getByRole('button',{name:new RegExp('^'+provider+'\\b')});assert.equal(await toggle.getAttribute('aria-expanded'),'false');await toggle.click();assert.equal(await toggle.getAttribute('aria-expanded'),'true');const steps=panel.locator('#'+await toggle.getAttribute('aria-controls'));await steps.getByRole('link',{name:guide+' (opens a new tab)',exact:true}).waitFor();await toggle.click();assert.equal(await steps.count(),0);}
  assert.equal(await panel.getByText('Calendar connected',{exact:true}).count(),0);
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=document.documentElement.clientWidth+1),true);const persisted=await page.evaluate(async()=>({text:JSON.stringify({...localStorage,...sessionStorage}),cached:(await Promise.all((await caches.keys()).map(async key=>(await (await caches.open(key)).keys()).map(r=>r.url)))).flat()}));assert.equal(persisted.text.includes(new URL(firstUrl).pathname.split('/')[3]),false);assert.equal(persisted.cached.some(url=>url.includes('/api/calendar/')),false);
  await page.screenshot({path:join(evidenceDirectory,`calendar-page-${engine}-${width}.png`),fullPage:true});assert.equal((await readFile(join(app.root,'next.log'),'utf8')).includes(new URL(firstUrl).pathname.split('/')[3]),false);assert.equal((await readFile(join(app.root,'next.log'),'utf8')).includes(new URL(secondUrl).pathname.split('/')[3]),false);
 });
 return {checks};
}
