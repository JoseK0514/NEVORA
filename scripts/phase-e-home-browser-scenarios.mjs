import {measureRenderedContrast} from './browser-contrast.mjs';
import {fulfillHeldResponse} from './browser-held-response.mjs';
import {safeLoginServerRequests,safeEvaluationFailure} from './release-browser-diagnostics.mjs';
import {OWNED_LOGIN_HEADER,readOwnedLoginEvents} from '../src/test/integration/owned-login-diagnostics.mjs';
import {waitForOwnedLoginWindow} from './browser-login-window.mjs';
import {LOGIN_LIMITS} from '../src/lib/auth/login-limits.server.ts';
import assert from 'node:assert/strict';
import {join} from 'node:path';
import {readFile,writeFile} from 'node:fs/promises';
import {Client} from 'pg';
import {randomUUID,createHash} from 'node:crypto';
import {hashPassword} from '../src/lib/auth/password.ts';
import {seedOwnedScenario,seedOwnedScenarioOwner,TEST_PASSWORD} from '../src/test/integration/owned-app-fixture.ts';
import {publishScheduleWithRevision} from '../src/test/integration/management-api.ts';

// Corporate Employee Home (approved Oct 26): the shift card is the CorpCard #home-shift, labelled by its own header.
export const HOME_SHIFT_CARD='[aria-labelledby="home-shift-label"]';
// Shared by H06 and its controlled browser scheduling regression.
export async function waitForFreshHome(page, freshLocation){
 await page.waitForFunction(fresh=>{
  const root=document.querySelector('[data-home-state]'),next=document.querySelector('[aria-labelledby="home-shift-label"]');
  if(!root||!next)return false;
  const text=next.textContent??'';
  const visibleFresh=[next,...next.querySelectorAll('*')].some(node=>{
   if(!node.textContent?.includes(fresh)||[...node.children].some(child=>child.textContent?.includes(fresh)))return false;
   const style=getComputedStyle(node);return node.getClientRects().length>0&&style.visibility==='visible'&&style.display!=='none';
  });
  return ['partial','ready'].includes(root.getAttribute('data-home-state'))&&root.getAttribute('aria-busy')==='false'&&visibleFresh&&!text.includes('Main Office Operations and Customer Support');
 },freshLocation,{timeout:15000});
}

// Corporate Employee: clock status lives on the Time tab, not on Home. Release 1 draws the same kit Time page at every
// width (board G-E-Time): the Right now / Current shift card's pill carries the recorded status. The page has no Refresh;
// it re-reads when the app returns to the front and marks itself aria-busy while a read is in flight.
// Ready only when the released status matches and no read is in flight (not a still-loading or still-refreshing frame).
const TIME_PILL={OFF_CLOCK:'Off the clock',CLOCKED_IN:'On the clock',ON_BREAK:'On break'};
export async function waitForRecordedTimeReady(page, expectedState){
 const ready=await page.waitForFunction(({expected,pill})=>{
  const time=document.querySelector('.c-hours[data-hours-view="records"]');
  if(!time||time.getAttribute('data-hours-state')!=='ready'||time.getAttribute('aria-busy')!=='false')return false;
  return time.querySelector('#hours-now .c-card__aside .c-pill')?.textContent===pill?{state:expected,view:'time',settled:true}:false;
 },{expected:expectedState,pill:TIME_PILL[expectedState]});
 try{return await ready.jsonValue();}finally{await ready.dispose();}
}

// Actual authenticated persisted Task11 Home journeys with canonical communication sources.
export async function runScenario({app,browser,context,page,engine,width,evidenceDirectory,axeFile,runtimeErrors:cellRuntimeErrors}){
 const label=`H${engine==='chromium'?'C':'W'}${width}`,index=[320,375,390,430,768,1024,1440].indexOf(width)+(engine==='webkit'?7:0);
 const scenario=await seedOwnedScenario(app.database.executor,label,index+14),actor=scenario.actors[0],q=(text,values=[])=>app.database.executor.query({text,values});
 const checks=[],runtimeErrors=[],screenshots=[],details={stage:'Task11 developer verification',engine,width,actor,checks,screenshots,runtimeErrors};let stage='seed',binding,homeResponse,managerContext,manager;
 cellRuntimeErrors.setStageReader(()=>stage);
 page.on('pageerror',error=>{if(!cellRuntimeErrors.isNavigationDiagnostic(error))runtimeErrors.push({stage,name:error.name,message:error.message.replace(/https?:[^\s]+/g,'[URL]')});});
 details.lifecycleTrace=[];
 const trace=sample=>{if(details.lifecycleTrace.length===160)details.lifecycleTrace.shift();details.lifecycleTrace.push({at:Date.now(),stage,...sample});};
 await page.exposeBinding('__nevoraHomeLifecycle',(_source,sample)=>trace(sample));
 await page.addInitScript(()=>{
  const documentId=crypto.randomUUID();
  const sample=event=>void globalThis.__nevoraHomeLifecycle({event,documentId,route:location.pathname,focused:document.hasFocus(),visibility:document.visibilityState,readyState:document.readyState}).catch(()=>{});
  for(const event of ['focus','blur','pagehide','pageshow'])window.addEventListener(event,()=>sample(event));
  for(const event of ['DOMContentLoaded','visibilitychange'])document.addEventListener(event,()=>sample(event));
  sample('document-created');
 });
 const notificationTrace=(event,request)=>{const route=new URL(request.url()).pathname;if(['/api/notifications','/api/employee/my-time'].includes(route))trace({event,route,method:request.method(),navigation:request.isNavigationRequest()});};
 const notificationStart=request=>notificationTrace('notification-start',request),notificationFinish=request=>notificationTrace('notification-finished',request),notificationFailed=request=>notificationTrace('notification-failed',request),nativeError=()=>trace({event:'pageerror'});
 page.on('request',notificationStart);page.on('requestfinished',notificationFinish);page.on('requestfailed',notificationFailed);page.on('pageerror',nativeError);
 page.on('request',request=>{if(new URL(request.url()).pathname==='/api/employee/home')binding=request.headers()['x-nevora-home'];});
 const shot=async name=>{const path=join(evidenceDirectory,`home-task11-${engine}-${width}-${name}.png`);await page.screenshot({path,fullPage:true});screenshots.push(path);};
 const next=()=>page.locator(HOME_SHIFT_CARD);
 const assignments=()=>next().getByRole('link',{name:'View shift',exact:true});
 // Corporate (board C-Employee): Things to do lists up to three rows; a "See all N" row opens Notifications.
 const todo=()=>page.locator('#employee-home-todo');
 // Board C-Employee: the card is named Things to do (its header, or aria-label when one row stands alone); the count
 // is carried by the rows and the See all N row, not by the header.
 const todoName=()=>todo().evaluate(card=>card.getAttribute('aria-label')??document.getElementById(card.getAttribute('aria-labelledby')??'')?.textContent??null);
 const seeAll=()=>todo().getByRole('link',{name:/^See all \d+$/});
 const items=()=>todo().locator('li > a.c-row').filter({hasNotText:/^See all \d+$/});
 const allSet=()=>page.getByText('You’re all set. Nothing needs you right now.',{exact:true});
 const shownHrefs=async()=>items().evaluateAll(es=>es.map(e=>e.getAttribute('href')));
 // Clock status (Time tab). Phones show the Right now pill; wider layouts the My time status word.
 const clockedIn=()=>page.locator('main').getByText(/^(Clocked in|On the clock)$/);
 const offClock=()=>page.locator('main').getByText(/^(Off clock|Off the clock)$/);
 const timePaused=()=>page.locator('.c-hours[data-hours-view="records"][data-hours-state="paused"]');
 const navLink=href=>page.locator(`.mobile-nav a[href="${href}"]:visible, nav[aria-label="Primary navigation"] a[href="${href}"]:visible`).first();
 const openTime=async expected=>{await navLink('/app/my-time').click();await page.waitForURL(u=>u.pathname==='/app/my-time');const time=await waitForRecordedTimeReady(page,expected);assert.equal(await next().count(),0,'Leaving Home unmounts its private shift card');return time;};
 const openHome=async()=>{await navLink('/app').click();await page.waitForURL(u=>u.pathname==='/app');await ready();};
 // The Time page's own private read; it has no Refresh and re-reads when the app returns to the front (the same storage
 // lifecycle sync Home uses), keeping the shown status while it reads.
 const timeReadPath=()=>'**/api/employee/hours/**';
 const refreshTime=()=>page.evaluate(()=>window.dispatchEvent(new Event('storage')));
 const actionHrefs=result=>{const rows=result.snapshot.attention.filter(item=>item.required||item.actionable),weeks=rows.filter(item=>item.ref.kind==='SCHEDULE'&&!item.label.startsWith('Schedule removed'));return rows.filter(item=>!weeks.includes(item)||item===weeks[0]).map(item=>item.href);};
 const recorded=()=>page.locator('aside[aria-label="Own recorded time"]');
 const nativeTab=process.platform==='darwin'&&engine==='webkit'?'Alt+Tab':'Tab',nativeBackTab=process.platform==='darwin'&&engine==='webkit'?'Alt+Shift+Tab':'Shift+Tab';
 const ready=async()=>{await page.locator('[data-home-state="partial"],[data-home-state="ready"]').waitFor();await page.waitForLoadState('networkidle');};
 const refresh=async()=>{
  await page.bringToFront();await ready();
  try {
   // v5 has no manual Refresh: Home re-reads when the app returns to the front (the same lifecycle sync).
   const [response]=await Promise.all([page.waitForResponse(r=>new URL(r.url()).pathname==='/api/employee/home'),page.evaluate(()=>window.dispatchEvent(new Event('storage')))]);
   await response.finished();await ready();
  } catch(error) {
   const diagnostic=await page.evaluate(()=>{
    const button=document.querySelector('[data-home-refresh]'),root=document.querySelector('[data-home-state]');
    return {visibility:document.visibilityState,focused:document.hasFocus(),state:root?.getAttribute('data-home-state'),busy:root?.getAttribute('aria-busy'),refresh:button?{disabled:button.disabled,text:button.textContent,rectangle:button.getBoundingClientRect().toJSON(),display:getComputedStyle(button).display,visibility:getComputedStyle(button).visibility}:null,active:document.activeElement?.tagName};
   });
   await writeFile(join(evidenceDirectory,`home-refresh-${engine}-${width}-report.json`),JSON.stringify({stage,diagnostic},null,2));throw error;
  }
 };
 async function login(target=page,id=actor,{waitForIdle=true}={}){
  const windowWaits=[];
  await waitForOwnedLoginWindow(q,{limit:LOGIN_LIMITS.perAddress,onWait:sample=>{windowWaits.push(sample);console.log('[Home native login window] '+JSON.stringify({engine,width,...sample}));}});
  const started=Date.now(),attemptId=randomUUID(),attempt={stage,target:target===page?'primary':'replacement',status:'started',windowWaits,trace:[]};details.loginAttempts??=[];details.loginAttempts.push(attempt);
  const routeOf=value=>{try{const path=new URL(value).pathname;return ['/app','/login'].includes(path)?path:'other';}catch{return 'other';}};
  const record=value=>{if(attempt.trace.length<40)attempt.trace.push({afterMs:Date.now()-started,...value});};
  let sequence=0;const identities=new WeakMap();
  const requestMeta=request=>{if(!identities.has(request))identities.set(request,++sequence);const type=request.resourceType();return {id:identities.get(request),route:routeOf(request.url()),method:request.method(),navigation:request.isNavigationRequest(),resourceType:['document','fetch','xhr'].includes(type)?type:'other',serverAction:typeof request.headers()['next-action']==='string'};};
  const requested=request=>{const metadata=requestMeta(request);if(metadata.route!=='other')record({event:'request',...metadata});};
  const responded=response=>{const metadata=requestMeta(response.request());if(metadata.route!=='other')record({event:'response',...metadata,status:response.status(),redirect:!!(response.headers()['x-action-redirect']||response.headers().location)});};
  const failed=request=>{const metadata=requestMeta(request);if(metadata.route!=='other')record({event:'request-failed',...metadata,reason:/abort|cancel/i.test(request.failure()?.errorText??'')?'aborted':'transport-failed'});};
  const finished=request=>{const metadata=requestMeta(request);if(metadata.route!=='other')record({event:'request-finished',...metadata});};
  const navigated=frame=>{if(frame===target.mainFrame())record({event:'document',route:routeOf(frame.url())});};
  target.on('request',requested);target.on('response',responded);target.on('requestfailed',failed);target.on('requestfinished',finished);target.on('framenavigated',navigated);
  try{
   await target.setExtraHTTPHeaders({[OWNED_LOGIN_HEADER]:attemptId});
   await target.bringToFront();await target.goto(app.url+'/login');await target.getByLabel('Employee ID',{exact:true}).fill(id);await target.getByLabel('Password',{exact:true}).fill(TEST_PASSWORD);
   await target.getByRole('button',{name:'Sign in',exact:true}).click({noWaitAfter:true});
   await target.waitForFunction(()=>location.pathname==='/app'&&!!document.querySelector('.app-shell.nevora-portal'));
   await target.locator('.app-shell.nevora-portal').waitFor();attempt.arrival={documentRoute:'app',pageRoute:routeOf(target.url()),shellVisible:true};if(waitForIdle)await target.waitForLoadState('networkidle');
   attempt.serverTrace=readOwnedLoginEvents(await readFile(join(app.root,'next.log'),'utf8'),attemptId);assert(attempt.serverTrace.some(event=>event.event==='request-start'&&event.method==='POST'),'Owned native login server observation required');attempt.status='ready';
  }catch(error){
   const url=new URL(target.url()),code=url.searchParams.get('error');details.loginFailure={route:routeOf(target.url()),error:['busy','invalid','missing','locked'].includes(code)?code:code?'other':null};attempt.status='failed';attempt.failure=details.loginFailure;
   let diagnosticTimer;
   try{attempt.pageState=await Promise.race([target.evaluate(()=>{const button=document.querySelector('form button[type=submit]');return {route:['/login','/app'].includes(location.pathname)?location.pathname:'other',readyState:document.readyState,focused:document.hasFocus(),visibility:document.visibilityState,busy:button?.getAttribute('aria-busy'),disabled:button?.getAttribute('aria-disabled'),shell:!!document.querySelector('.app-shell.nevora-portal')};}).catch(error=>({state:'unavailable',failure:safeEvaluationFailure(error)})),new Promise(resolve=>{diagnosticTimer=setTimeout(()=>resolve({state:'unresponsive'}),1000);})]);}finally{clearTimeout(diagnosticTimer);}
   try{const log=await readFile(join(app.root,'next.log'),'utf8');attempt.serverRequests=safeLoginServerRequests(log);attempt.serverTrace=readOwnedLoginEvents(log,attemptId);}catch{attempt.serverRequests='unavailable';attempt.serverTrace='unavailable';}
   const diagnosticClient=new Client({connectionString:app.database.connectionString,connectionTimeoutMillis:1000,statement_timeout:1000});
   try{await diagnosticClient.connect();attempt.databaseWaits=(await diagnosticClient.query("SELECT state,wait_event_type,wait_event,count(*)::int AS connections FROM pg_stat_activity WHERE datname=current_database() AND pid<>pg_backend_pid() GROUP BY state,wait_event_type,wait_event")).rows;attempt.sessionOutcome=(await diagnosticClient.query('SELECT EXISTS(SELECT 1 FROM employee_sessions WHERE employee_id=$1 AND created_at>=to_timestamp($2::double precision/1000)) AS "createdSinceAttempt"',[id,started])).rows[0];}catch{attempt.databaseWaits='unavailable';attempt.sessionOutcome='unavailable';}finally{await diagnosticClient.end().catch(()=>{});}
   await writeFile(join(evidenceDirectory,`home-login-${engine}-${width}-report.json`),JSON.stringify({engine,width,attempts:details.loginAttempts},null,2));
   await target.screenshot({path:join(evidenceDirectory,`home-${engine}-${width}-login-failure.png`),timeout:5000,mask:[target.locator('input,textarea')]}).catch(()=>{});throw error;
  }finally{
   await target.setExtraHTTPHeaders({}).catch(()=>{});
   target.off('request',requested);target.off('response',responded);target.off('requestfailed',failed);target.off('requestfinished',finished);target.off('framenavigated',navigated);
   await writeFile(join(evidenceDirectory,`home-login-${engine}-${width}-report.json`),JSON.stringify({engine,width,attempts:details.loginAttempts},null,2));
  }
 }
 function gate(path){
  let release,started,finished,used=false,failure,outcome,operation='fetch',navigationReleased=false;const documentUrl=page.url();
  const wait=new Promise(r=>{release=r;}),seen=new Promise(r=>{started=r;}),done=new Promise(r=>{finished=r;});
  const handler=async route=>{
   if(used)return route.continue();used=true;
   try{
    const response=await route.fetch();operation='parse';if(path.includes('/home'))homeResponse=await response.json();started();await wait;operation='fulfill';
    outcome=await fulfillHeldResponse(route,{response},navigationReleased);
   }catch(error){
    // Never leak Playwright's request headers through an unhandled route error.
    // Unexpected fetch/fulfillment failure remains a failed scenario, not a retry.
    failure={stage,operation,name:'RouteError',transportReset:error.message.includes('ECONNRESET'),requestFailed:!!route.request().failure()};runtimeErrors.push(failure);started();await route.abort().catch(()=>{});
   }finally{finished();}
  };
  return {handler,get seen(){return seen.then(()=>{if(failure)throw Error('Held response operation failed; see sanitized runtimeErrors');});},get done(){return used?done:Promise.resolve();},get outcome(){return outcome;},get failure(){return failure;},release:(reason)=>{if(reason==='navigation'){assert.notEqual(page.url(),documentUrl,'Navigation release requires an actually changed document URL');navigationReleased=true;}release();},path};
 }
 try {
 // Release 1 Home is the corporate Employee Home (approved Oct 26); a Lead keeps the v5 view while that role is on hold.
 await q("UPDATE employees SET role='EMPLOYEE' WHERE id=$1",[actor]);
 if(engine==='chromium'&&width===320){
  const prepared=[];
  for(const path of ['/app/requests/hub','/app/schedule']){const response=await context.request.get(app.url+path,{maxRedirects:0,timeout:15000});assert.equal(response.status(),307);assert.equal(new URL(response.headers().location,app.url).pathname,'/login');prepared.push({path,status:response.status()});}
  await writeFile(join(evidenceDirectory,'home-route-preparation-report.json'),JSON.stringify(prepared,null,2));
 }
 await q("UPDATE locations SET short_name='Main Office Operations and Customer Support' WHERE id='loc-1'");
 await q("INSERT INTO time_off_requests(id,employee_id,start_date,end_date,status,reason) SELECT $1||'-leave-'||n,$2,'2030-11-01'::date+(n-1)*2,'2030-11-02'::date+(n-1)*2,'APPROVED','PRIVATE HOME SENTINEL' FROM generate_series(1,7)n",[label,actor]);
 const [clock]=await q("SELECT date_trunc('week',(clock_timestamp()-interval '1 hour') AT TIME ZONE 'America/Puerto_Rico')::date::text AS week,((clock_timestamp()-interval '1 hour') AT TIME ZONE 'America/Puerto_Rico')::date::text AS day,to_char((clock_timestamp()-interval '1 hour') AT TIME ZONE 'America/Puerto_Rico','HH24:MI') AS start,to_char((clock_timestamp()+interval '1 hour') AT TIME ZONE 'America/Puerto_Rico','HH24:MI') AS finish");
 await q("INSERT INTO schedules(id,location_id,week_start,status,created_by) VALUES($1,'loc-1',$2,'DRAFT','QAOWNER') ON CONFLICT(location_id,week_start) DO NOTHING",['home-current-'+clock.week,clock.week]);
 const [schedule]=await q("SELECT id FROM schedules WHERE location_id='loc-1' AND week_start=$1",[clock.week]);
 await q("INSERT INTO shifts(id,schedule_id,employee_id,date,start_time,end_time) VALUES($1,$2,$3,$4,$5,$6)",[label+'-ongoing',schedule.id,actor,clock.day,clock.start,clock.finish]);
 await publishScheduleWithRevision({locationId:'loc-1',weekStart:clock.week,managerId:'QAOWNER'},app.database.executor);
 await q("INSERT INTO clocker_devices(id,location_id,name) VALUES($1,'loc-1','Fictional Home device')",[label+'-device']);
 await q("INSERT INTO time_entries(id,employee_id,location_id,device_id,clock_in_at,status) VALUES($1,$2,'loc-1',$3,clock_timestamp()-interval '20 minutes','CLOCKED_IN')",[label+'-time',actor,label+'-device']);
 stage='loading';const loading=gate('**/api/employee/home');await page.route(loading.path,loading.handler);await login(page,actor,{waitForIdle:false});await loading.seen;
 // Corporate Home never mounts a clock panel: clock status lives on the Time tab (checked below and in H05/H07/H11).
 assert(await page.getByText('Loading your shift…',{exact:true}).isVisible());assert.equal(await assignments().count(),0);assert.equal(await items().count(),0);assert.equal(await todo().count(),0);assert.equal(await recorded().count(),0,'Corporate Home has no clock panel');assert.equal(await page.getByText('On shift now',{exact:true}).count(),0);assert.equal(await page.getByRole('heading',{level:1,name:/^Welcome back/}).count(),0,'The name is private and waits for released Home data');await shot('loading');loading.release();await ready();await page.unroute(loading.path,loading.handler);
 await next().getByText('On shift now',{exact:true}).waitFor();
 assert.equal(homeResponse.state,'partial');assert.equal(homeResponse.allSet,false);assert.equal(homeResponse.snapshot.sources.communications.state,'complete');assert.equal(homeResponse.snapshot.nextShift.shiftId,scenario.sourceId);assert.equal(homeResponse.snapshot.currentShift.shiftId,label+'-ongoing');
 assert.equal(await page.getByRole('heading',{level:1}).count(),1);assert.equal(await page.getByRole('heading',{level:1,name:'Welcome back, QA '+label,exact:true}).count(),1);assert.equal(homeResponse.snapshot.publicationState,'partial');assert.equal(await page.locator('[data-home-state="ready"]').count(),1,'complete source reads are ready while the publication note explains unpublished locations');
 const publicationNote=page.locator('.c-ehome__body > .c-note').filter({hasText:/published this week yet\. Shifts shown are published\.$/});assert(await publicationNote.isVisible());assert(await next().evaluate((card,note)=>!!(card.compareDocumentPosition(note)&Node.DOCUMENT_POSITION_FOLLOWING),await publicationNote.elementHandle()),'The publication note follows the shift card');assert.equal(await allSet().count(),0);
 assert.equal(await page.getByText('Some Home sections could not be fully checked. Counts show known items. Refresh Home below to check again.',{exact:true}).count(),0,'an unpublished location is explained by publication state, not a failed read');
 assert(!(await page.locator('.employee-home').innerText()).includes('PRIVATE HOME SENTINEL'));assert(await next().getByText('On shift now',{exact:true}).isVisible());assert.equal(await assignments().count(),1);
 const hierarchy=await page.locator(HOME_SHIFT_CARD+',#employee-home-todo').evaluateAll(es=>({tops:es.map(e=>e.getBoundingClientRect().top),nextBeforeActions:es.length===2&&!!(es[0].compareDocumentPosition(es[1])&Node.DOCUMENT_POSITION_FOLLOWING)}));assert.equal(hierarchy.tops.length,2);assert(hierarchy.nextBeforeActions);assert(hierarchy.tops[0]<=hierarchy.tops[1]);details.homeHierarchy=hierarchy;
 assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));await shot('ready');
 // Corporate (board C-Employee): Things to do shows the first three rows (weeks to confirm share one row) in the
 // canonical order, then "See all N", which opens Notifications. Informational updates are read in Notifications.
 details.homeDisclosures=[];
 {
  const expected=actionHrefs(homeResponse);
  assert(await todo().isVisible());assert.equal(await todoName(),'Things to do');assert.equal(await todo().locator('#employee-home-todo-label').count(),expected.length===1&&await page.locator('[data-home-state="partial"]').count()===0?0:1,'One thing to do is its own card; several share the Things to do header');
  assert.deepEqual(await shownHrefs(),expected.slice(0,3));assert.equal(await seeAll().count(),expected.length>3?1:0);
  if(expected.length>3){assert.equal(await seeAll().getAttribute('href'),'/app/notifications');assert.equal((await seeAll().textContent()).trim(),`See all ${expected.length}`);}
  details.homeDisclosures.push({kind:'actions',rows:expected.length,hasOverflow:expected.length>3,seeAll:expected.length>3});
 }
 for(const item of homeResponse.snapshot.attention.filter(item=>!item.required&&!item.actionable))assert.equal(await page.locator('.employee-home').getByText(item.label,{exact:true}).count(),0,'Informational updates are read in Notifications');
 assert.equal(await page.getByRole('button',{name:'Mark read',exact:true}).count(),0);assert.equal(await page.getByRole('button',{name:'Confirm schedule',exact:true}).count(),0);
 {const weeks=homeResponse.snapshot.attention.filter(item=>item.ref.kind==='SCHEDULE'&&!item.label.startsWith('Schedule removed')&&(item.required||item.actionable));if(weeks.length&&actionHrefs(homeResponse).slice(0,3).includes(weeks[0].href))for(const item of weeks)assert.equal(await todo().locator(`time[datetime="${item.ref.id}"]`).count(),1);}
 const leave=homeResponse.snapshot.attention.filter(item=>item.ref.kind==='TIME_OFF');assert.equal(new Set(leave.map(item=>item.label)).size,7);for(const item of leave)assert.equal(await page.locator('.employee-home').getByText(item.label,{exact:true}).count(),0);await shot('show-all');
 checks.push('H02 actual Things to do membership and order follow the canonical response (weeks share one row): the first three rows, then See all N to Notifications when more; weekly reviews carry their own week dates; informational updates stay in Notifications; no compact consent or Mark read');
 // Re-anchored clock status: Home shows the shift under way; the actual recorded Clocked in is on the Time tab.
 details.timeClockedIn=await openTime('CLOCKED_IN');assert(await clockedIn().first().isVisible());await shot('time-clocked-in');await openHome();await next().getByText('On shift now',{exact:true}).waitFor();
 checks.push('H01 actual loading contains no private row/name/success; the shift under way leads (On shift now) with the persisted next shift in the canonical read; the actual recorded Clocked in shows on the Time tab while Home keeps no clock; six-source canonical communications complete and private notes absent');
 stage='canonical-communications';
 const ownerId=await seedOwnedScenarioOwner(app.database.executor,label);
 managerContext=await browser.newContext({viewport:{width,height:900}});await managerContext.route('**/*',route=>new URL(route.request().url()).origin===new URL(app.url).origin?route.continue():route.abort());manager=await managerContext.newPage();await login(manager,ownerId);
 const [ownerSession]=await q('SELECT token_hash FROM employee_sessions WHERE employee_id=$1 ORDER BY created_at DESC LIMIT 1',[ownerId]);
 const owner={employee:{id:ownerId},sessionTokenHash:ownerSession.token_hash};
 const [session]=await q('SELECT token_hash FROM employee_sessions WHERE employee_id=$1 ORDER BY created_at DESC LIMIT 1',[actor]);
 const self={employee:{id:actor,firstName:'Fictional',lastName:'Self',role:'EMPLOYEE',primaryLocationId:'loc-1'},sessionTokenHash:session.token_hash};
 // Public lifetime header is derived only from this fixture's actual SQL session;
 // no raw proof is sent to the browser or stored in evidence.
 const communicationAuthority=proof=>createHash('sha256').update(JSON.stringify(['nevora:communication:lifetime:v1',proof.employee.id,proof.sessionTokenHash])).digest('hex');
 const communicationRequest=async(proof,action,value,id)=>{const target=proof===owner?manager:page,mode=proof===owner?'manager':'employee';return target.evaluate(async({mode,action,value,id,authority})=>{
 const read=action==='read',path='/api/'+mode+'/communications'+(read?'/'+id:action==='preview'?'/preview':'');
 const response=await fetch(path,{method:read?'GET':'POST',credentials:'same-origin',cache:'no-store',headers:{'X-Nevora-Communication':'1','X-Nevora-Communication-Authority':authority,...(read?{}:{'Content-Type':'application/json'})},...(read?{}:{body:JSON.stringify(value)})});return response.json();
 },{mode,action,value,id,authority:communicationAuthority(proof)});};
 const previewCommunicationAudience=(proof,draft)=>communicationRequest(proof,'preview',draft),executeCommunicationCommand=(proof,command)=>communicationRequest(proof,'command',command),recordCommunicationRead=executeCommunicationCommand,readCommunication=(proof,id)=>communicationRequest(proof,'read',null,id);

 async function publishUpdate(acknowledgement){const draft={type:'LOCATION_ANNOUNCEMENT',scope:{kind:'LOCATION',locationId:'loc-1'},title:'Operational update '+label+' — revisión 👷',body:'PRIVATE COMPLETE CONTENT '+label,acknowledgement,expiresAt:null};
 const preview=await previewCommunicationAudience(owner,draft,app.database.executor);assert.equal(preview.state,'ready');const result=await executeCommunicationCommand(owner,{kind:'PUBLISH',operationId:randomUUID(),authority:preview.authority,draft,audienceFingerprint:preview.fingerprint},app.database.executor);assert.equal(result.status,'committed');return {result,draft};}
 const required=await publishUpdate('REQUIRED');await refresh();
 const row=()=>todo().locator('a.c-row[href="/app/updates/'+required.result.id+'"]');
 // Corporate (board C-Employee): a required review carries the teal Review action text (v5 said "Review needed").
 assert(await row().locator('.c-row__trail').getByText('Review',{exact:true}).isVisible());assert.equal(await allSet().count(),0);assert(!(await page.locator('.employee-home').innerText()).includes('PRIVATE COMPLETE CONTENT'));
 assert.equal(await page.getByRole('button',{name:'Mark read',exact:true}).count(),0);
 assert.equal((await recordCommunicationRead(self,{kind:'MARK_READ',operationId:randomUUID(),authority:communicationAuthority(self),ref:{kind:'COMMUNICATION',id:required.result.id,version:required.result.version}},app.database.executor)).status,'blocked');
 await refresh();assert(await row().locator('.c-row__trail').getByText('Review',{exact:true}).isVisible());await shot('required-push-off');
 // The Task11 fixture uses the authenticated full-content API before a receipt;
 // Task10 owns the actual detail-screen acknowledgement journey.
 const detail=await readCommunication(self,required.result.id,app.database.executor);assert.equal(detail.state,'ready');assert.equal(detail.body,required.draft.body);
 assert.equal((await executeCommunicationCommand(self,{kind:'ACKNOWLEDGE',operationId:randomUUID(),authority:detail.authority,communicationId:detail.id,expectedRevisionId:detail.revisionId,contentHash:detail.contentHash},app.database.executor)).status,'committed');await refresh();assert.equal(await row().count(),0);
 const revisedDraft={...required.draft,body:'PRIVATE REVISED CONTENT '+label},preview=await previewCommunicationAudience(owner,revisedDraft,app.database.executor);assert.equal(preview.state,'ready');
 const revised=await executeCommunicationCommand(owner,{kind:'REVISE',operationId:randomUUID(),authority:preview.authority,communicationId:required.result.id,expectedRevisionId:required.result.version,draft:revisedDraft,audienceFingerprint:preview.fingerprint},app.database.executor);assert.equal(revised.status,'committed');await refresh();assert(await row().locator('.c-row__trail').getByText('Review',{exact:true}).isVisible());await shot('new-revision');
 assert.equal((await executeCommunicationCommand(owner,{kind:'WITHDRAW',operationId:randomUUID(),authority:communicationAuthority(owner),communicationId:required.result.id,expectedRevisionId:revised.version},app.database.executor)).status,'committed');await refresh();assert.equal(await row().count(),0);
 // Home lists what needs you; an optional update is read in Updates. The canonical Home response still carries it.
 const homeRead=()=>page.evaluate(async binding=>{const response=await fetch('/api/employee/home',{cache:'no-store',headers:{'X-Nevora-Home':binding}});return response.json();},binding);
 const optional=await publishUpdate('OPTIONAL');await refresh();
 const optionalItem=(await homeRead()).snapshot.attention.find(item=>item.ref.kind==='COMMUNICATION'&&item.ref.id===optional.result.id);assert(optionalItem,'The canonical Home response carries the optional update');assert.equal(optionalItem.required,false);
 {const current=await homeRead();assert.equal(await todo().locator('a[href="/app/updates/'+optional.result.id+'"]').count(),optionalItem.actionable&&actionHrefs(current).slice(0,3).includes('/app/updates/'+optional.result.id)?1:0);}
 const optionalDetail=await readCommunication(self,optional.result.id,app.database.executor);assert.equal(optionalDetail.state,'ready');assert.equal((await recordCommunicationRead(self,{kind:'MARK_READ',operationId:randomUUID(),authority:optionalDetail.authority,ref:{kind:'COMMUNICATION',id:optional.result.id,version:optional.result.version}},app.database.executor)).status,'committed');await refresh();assert.equal(await page.locator('a[href="/app/updates/'+optional.result.id+'"]').count(),0);assert.equal((await homeRead()).snapshot.attention.some(item=>item.ref.kind==='COMMUNICATION'&&item.ref.id===optional.result.id),false,'A read optional update leaves the canonical response');
 checks.push('H14 authenticated Home follows actual canonical required receipt, push-off/Mark read denial, revision reset, withdrawal and optional version read; private body is absent and full review stays on Updates');
 // ACTIONS_OVERFLOW_BROWSER_EXTENSION_BEGIN
 // Four actual REQUIRED publications make Actions overflow mandatory. The
 // canonical refreshed Home response supplies all membership and ordering.
 stage='actions-overflow';
 const overflowEvidence=details.actionsOverflow={fixturePublicationCount:4,phase:'baseline',publications:[],withdrawals:[],keyboard:[]};
 const overflowPublished=[];
 const overflowRefresh=async()=>{const observed=page.waitForResponse(r=>new URL(r.url()).pathname==='/api/employee/home');await refresh();const response=await observed;assert.equal(response.status(),200);const result=await response.json();assert(['ready','partial'].includes(result.state));assert.equal(result.snapshot.sources.communications.state,'complete');return result;};
 // Corporate: the overflow control is the "See all N" row (Show all / Show fewer was removed); every row is listed in
 // Notifications. Informational rows are not on Home.
 const overflowRows=result=>actionHrefs(result);
 const overflowBaseline=await overflowRefresh();
 const overflowBaselineOpen={actions:await seeAll().count()?'see-all':null};
 overflowEvidence.baseline={state:overflowBaseline.state,allSet:overflowBaseline.allSet,hrefs:{actions:overflowRows(overflowBaseline)},open:overflowBaselineOpen};
 let overflowCause=null;
 try{
  overflowEvidence.phase='publish';
  for(let i=0;i<4;i++){const published=await publishUpdate('REQUIRED');overflowPublished.push(published);overflowEvidence.publications.push({id:published.result.id,version:published.result.version,status:published.result.status});}
  assert.equal(new Set(overflowPublished.map(published=>published.result.id)).size,4);
  overflowEvidence.phase='refreshed-membership';const actual=await overflowRefresh();
  const actionRows=overflowRows(actual);
  overflowEvidence.refreshed={state:actual.state,allSet:actual.allSet,communicationsState:actual.snapshot.sources.communications.state,attentionCount:actual.snapshot.attention.length,hrefs:{actions:actionRows}};
  assert.equal(actual.allSet,false);assert(actionRows.length>3);
  assert.equal(actionRows.length,overflowEvidence.baseline.hrefs.actions.length+4);
  assert.deepEqual(actionRows.filter(href=>!overflowPublished.some(published=>href==='/app/updates/'+published.result.id)),overflowEvidence.baseline.hrefs.actions);
  for(const published of overflowPublished){const canonical=actual.snapshot.attention.filter(item=>item.ref.kind==='COMMUNICATION'&&item.ref.id===published.result.id);assert.equal(canonical.length,1);assert.equal(canonical[0].required,true);assert.equal(canonical[0].ref.version,published.result.version);assert.equal(canonical[0].href,'/app/updates/'+published.result.id);}
  assert.deepEqual(await shownHrefs(),actionRows.slice(0,3));assert.equal(await todoName(),'Things to do');assert.equal(await todo().locator('#employee-home-todo-label').textContent(),'Things to do');
  assert.equal(await seeAll().count(),1);assert.equal(await seeAll().getAttribute('href'),'/app/notifications');assert.equal((await seeAll().textContent()).trim(),`See all ${actionRows.length}`);
  assert.equal(await items().count(),3);assert.equal(await page.getByRole('button',{name:'Mark read',exact:true}).count(),0);assert.equal(await page.getByRole('button',{name:'Confirm schedule',exact:true}).count(),0);assert.equal(await allSet().count(),0);assert(!(await page.locator('.employee-home').innerText()).includes('PRIVATE COMPLETE CONTENT'));
  await shot('actions-overflow');
  overflowEvidence.phase='native-keyboard';
  // Native Tab reaches See all with visible focus at a 44px target; Enter opens Notifications (a link has no Space activation).
  await page.locator('h1').click();let seeAllReached=false;
  for(let i=0;i<60;i++){await page.keyboard.press(nativeTab);if(await seeAll().evaluate(e=>e===document.activeElement)){seeAllReached=true;break;}}
  assert(seeAllReached,'Native keyboard reaches See all');
  const focus=await seeAll().evaluate(e=>{const r=e.getBoundingClientRect();return {active:e===document.activeElement,visible:e.matches(':focus-visible'),outlineStyle:getComputedStyle(e).outlineStyle,outlineWidth:getComputedStyle(e).outlineWidth,boxShadow:getComputedStyle(e).boxShadow,width:r.width,height:r.height};});
  overflowEvidence.keyboard.push({key:'Tab',focus});assert(focus.active);assert(focus.visible);assert(focus.height>=44&&focus.width>=44);
  assert(focus.outlineStyle!=='none'&&parseFloat(focus.outlineWidth)>=2||/\b2px\b|\b3px\b/.test(focus.boxShadow),'See all shows a visible 2px focus indicator');
  const openedNotifications=page.waitForURL(u=>u.pathname==='/app/notifications');await page.keyboard.press('Enter');await openedNotifications;overflowEvidence.keyboard.push({key:'Enter',route:'/app/notifications'});
  overflowEvidence.phase='notifications-list';
  // Phones draw the messages view; wider layouts the account panel. Both list the same rows once their own read is ready.
  await page.waitForFunction(phone=>phone?document.querySelector('.em-messages[data-messages-view="notifications"]')?.getAttribute('data-messages-state')==='ready':!!document.querySelector('[data-private-view="notifications"] [aria-label="Show notifications"]'),width<768);
  overflowEvidence.notificationRows=await page.locator('main a.em-notif-row').evaluateAll(rows=>rows.map(row=>row.id));
  const notices=[];
  for(const published of overflowPublished){
   const rows=await q("SELECT id FROM notifications WHERE employee_id=$1 AND source_kind='COMMUNICATION' AND source_id=$2 ORDER BY id",[actor,published.result.id]);assert.equal(rows.length,1,'One notification per overflowed update');
   // Board E-Notifications: phone and desktop draw the same rows (All / Unread, grouped by day).
   const shown=page.locator(`main a.em-notif-row[id="message-${rows[0].id}"]`);assert.equal(await shown.count(),1,'Notifications lists every overflowed update');assert(await shown.isVisible());notices.push(rows[0].id);
  }
  overflowEvidence.notifications={listed:notices.length};assert(!(await page.locator('main').innerText()).includes('PRIVATE COMPLETE CONTENT'));await shot('actions-overflow-notifications');
  await openHome();
 }catch(error){overflowCause=error;throw error;}finally{
  overflowEvidence.phase='withdraw-extra-publications';
  // Try every created publication even on a failed assertion. Never mask the
  // original browser failure with a later cleanup failure.
  for(const published of overflowPublished){try{const withdrawn=await executeCommunicationCommand(owner,{kind:'WITHDRAW',operationId:randomUUID(),authority:communicationAuthority(owner),communicationId:published.result.id,expectedRevisionId:published.result.version},app.database.executor);overflowEvidence.withdrawals.push({id:published.result.id,version:published.result.version,status:withdrawn.status});}catch(error){overflowEvidence.withdrawals.push({id:published.result.id,version:published.result.version,status:'error',name:error.name,code:error.code??null});}}
  const failed=overflowEvidence.withdrawals.filter(result=>result.status!=='committed');overflowEvidence.withdrawalComplete=failed.length===0&&overflowEvidence.withdrawals.length===overflowPublished.length;
  if(!overflowCause)assert.equal(overflowEvidence.withdrawalComplete,true,'Every extra REQUIRED publication must be withdrawn before later journeys');
 }
 overflowEvidence.phase='restored-home';const restored=await overflowRefresh();
 overflowEvidence.restored={state:restored.state,allSet:restored.allSet,hrefs:{actions:overflowRows(restored)}};
 assert.deepEqual(overflowEvidence.restored.hrefs,overflowEvidence.baseline.hrefs);assert.equal(restored.state,overflowBaseline.state);assert.equal(restored.allSet,overflowBaseline.allSet);
 for(const published of overflowPublished)assert.equal(await page.locator('a[href="/app/updates/'+published.result.id+'"]').count(),0);
 assert.deepEqual(await shownHrefs(),overflowRows(restored).slice(0,3));assert.equal(await seeAll().count(),overflowRows(restored).length>3?1:0);
 overflowEvidence.phase='complete';
 // ACTIONS_OVERFLOW_BROWSER_EXTENSION_END
 stage='keyboard';await page.locator('h1').click();const link=assignments().first(),tab=nativeTab;let reached=false;
 for(let i=0;i<55;i++){await page.keyboard.press(tab);if(await link.evaluate(e=>e===document.activeElement)){reached=true;break;}}
 assert(reached);assert(await link.evaluate(e=>e.matches(':focus-visible')));const rect=await link.boundingBox();assert(rect&&rect.height>=44&&rect.width>=44);
 const measureContrast=()=>link.evaluate(measureRenderedContrast);details.linkContrast={focus:await measureContrast()};await link.evaluate(e=>e.blur());await page.mouse.move(0,0);details.linkContrast.normal=await measureContrast();await link.hover();details.linkContrast.hover=await measureContrast();await page.mouse.down();details.linkContrast.pressed=await measureContrast();await page.mouse.move(0,0);await page.mouse.up();for(const value of Object.values(details.linkContrast))assert(value.ratio>=4.5);await link.focus();
 // Re-anchored clock recovery: Home has no clock panel, so its keyboard route to recorded time is the Time tab.
 // Phones: the tab bar follows main (forward Tab). Wider layouts: the sidebar precedes main (reverse Tab).
 const myTime=navLink('/app/my-time');const timeKey=await page.locator('.mobile-nav').isVisible()?tab:nativeBackTab;await page.locator('h1').click();let clockFocus=false;
 for(let i=0;i<55;i++){await page.keyboard.press(timeKey);if(await myTime.evaluate(e=>e===document.activeElement)){clockFocus=true;break;}}
 assert(clockFocus);assert(await myTime.evaluate(e=>e.matches(':focus-visible')));details.clockRecoveryFocus=await myTime.evaluate(e=>{const r=e.getBoundingClientRect();return {outlineStyle:getComputedStyle(e).outlineStyle,outlineWidth:getComputedStyle(e).outlineWidth,width:r.width,height:r.height};});assert.notEqual(details.clockRecoveryFocus.outlineStyle,'none');assert(parseFloat(details.clockRecoveryFocus.outlineWidth)>=2);if(timeKey===tab)assert(details.clockRecoveryFocus.height>=44&&details.clockRecoveryFocus.width>=44,'Phone Time tab is a 44px target');await link.focus();
 await page.emulateMedia({reducedMotion:'reduce'});await page.evaluate(()=>{document.documentElement.style.fontSize='200%';});assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));await page.evaluate(()=>{document.documentElement.style.fontSize='';});await shot('focus');
 checks.push('H03 native keyboard reaches visible focus; actual 44px View shift link, measured normal/hover/pressed/focus contrast, visible keyboard route to the Time tab (clock status; 44px tab on phones), 200% text/reflow and reduced-motion state');
 stage='api';const api=await page.evaluate(async binding=>{const response=await fetch('/api/employee/home',{cache:'no-store',headers:{'X-Nevora-Home':binding}});return {status:response.status,cache:response.headers.get('cache-control'),vary:response.headers.get('vary'),body:await response.json()};},binding);
 assert.equal(api.status,200);assert.equal(api.cache,'no-store, private');assert(api.vary.split(',').map(value=>value.trim().toLowerCase()).includes('cookie'));assert(!JSON.stringify(api.body).match(/PRIVATE HOME SENTINEL|sessionTokenHash|managerNotes/));
 const rejected=await page.evaluate(async()=>{const r=await fetch('/api/employee/home?employeeId=other',{headers:{'X-Nevora-Home':'invalid'}});return r.status;});assert.equal(rejected,400);checks.push('H04 actual authenticated Home API is private/no-store; client identity selectors refused; no source-note/raw-proof disclosure');
 stage='offline';await context.setOffline(true);await page.evaluate(()=>window.dispatchEvent(new Event('offline')));await page.locator('[data-home-state="paused"]').waitFor();assert.equal(await assignments().count(),0);assert.equal(await page.getByText('On shift now',{exact:true}).count(),0);assert.equal(await items().count(),0);assert.equal(await todo().count(),0);assert.equal(await page.getByRole('heading',{level:1,name:/^Welcome back/}).count(),0,'Paused Home clears the private name');assert.equal(await recorded().count(),0);await shot('offline');await context.setOffline(false);await page.evaluate(()=>window.dispatchEvent(new Event('online')));await ready();await next().getByText('On shift now',{exact:true}).waitFor();
 // Re-anchored clock rows: the Time tab clears its recorded status offline and re-reads on reconnect.
 await openTime('CLOCKED_IN');await context.setOffline(true);await page.evaluate(()=>window.dispatchEvent(new Event('offline')));await timePaused().waitFor();assert.equal(await clockedIn().count(),0,'Offline Time clears the recorded clock status');await shot('time-offline');
 await context.setOffline(false);await page.evaluate(()=>window.dispatchEvent(new Event('online')));details.timeReconnected=await waitForRecordedTimeReady(page,'CLOCKED_IN');assert(await clockedIn().first().isVisible());await openHome();
 checks.push('H05 actual network offline clears Home assignment/to-do rows and the Time tab clock status; online re-entry performs fresh authorized reads');
 stage='late-home';
 const lateEvidence={requests:[],observations:[]},requestIds=new Map();details.lateHome=lateEvidence;
 const requestEvent=(event,request)=>{if(new URL(request.url()).pathname!=='/api/employee/home')return;if(!requestIds.has(request))requestIds.set(request,requestIds.size+1);lateEvidence.requests.push({event,id:requestIds.get(request),at:Date.now()});};
 const onRequest=request=>requestEvent('request',request),onFinished=request=>requestEvent('finished',request),onFailed=request=>requestEvent('failed',request);
 page.on('request',onRequest);page.on('requestfinished',onFinished);page.on('requestfailed',onFailed);
 await page.evaluate(fresh=>{
  const observations=[],observe=event=>{const root=document.querySelector('[data-home-state]'),next=document.querySelector('[aria-labelledby="home-shift-label"]'),text=next?.textContent??'';observations.push({event,at:Date.now(),state:root?.getAttribute('data-home-state'),busy:root?.getAttribute('aria-busy'),fresh:text.includes(fresh),old:text.includes('Main Office Operations and Customer Support'),visible:!!next?.getClientRects().length,visibility:document.visibilityState,focused:document.hasFocus()});};
  const observer=new MutationObserver(()=>observe('mutation'));observer.observe(document.querySelector('.employee-home'),{subtree:true,childList:true,attributes:true,characterData:true});
  const events=['storage','focus','blur','pageshow','pagehide','online','offline'],handlers=events.map(event=>{const handler=()=>observe(event);window.addEventListener(event,handler);return [event,handler];});
  window.__homeHeldEvidence={observations,observe,stop:()=>{observer.disconnect();for(const [event,handler] of handlers)window.removeEventListener(event,handler);}};observe('initial');
 },'Fresh '+label);
 const markLate=event=>page.evaluate(event=>window.__homeHeldEvidence.observe(event),event);
 const late=gate('**/api/employee/home');await page.route(late.path,late.handler);
 try{
  await page.evaluate(()=>window.dispatchEvent(new Event('storage')));await late.seen;await markLate('old-response-held');
  lateEvidence.oldResponse={fresh:JSON.stringify(homeResponse).includes('Fresh '+label),old:JSON.stringify(homeResponse).includes('Main Office Operations and Customer Support')};
  await q("UPDATE locations SET short_name=$1 WHERE id='loc-1'",['Fresh '+label+' Main Office']);await page.evaluate(()=>window.dispatchEvent(new Event('storage')));
  await waitForFreshHome(page,'Fresh '+label+' Main Office');await markLate('fresh-generation-rendered');
  assert(lateEvidence.requests.some(event=>event.event==='finished'&&event.id>1),'A newer Home request must finish before releasing the held response');
  assert.deepEqual(lateEvidence.oldResponse,{fresh:false,old:true});
  late.release();await late.done;assert.equal(late.failure,undefined);lateEvidence.heldOutcome=late.outcome;
  await page.unroute(late.path,late.handler);
  // Settle a real browser rendering turn after the held handler, then assert once.
  // Waiting for fresh again here could conceal an overwrite followed by recovery.
  await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(resolve)));await markLate('after-held-handler-settled');
  const afterFresh=await page.evaluate(()=>{const observations=window.__homeHeldEvidence.observations;return observations.slice(observations.findIndex(item=>item.event==='fresh-generation-rendered'));});
  assert(afterFresh.every(item=>item.fresh&&!item.old),'No observed commit may restore old private rows after fresh Home is displayed');
  assert((await next().innerText()).includes('Fresh '+label));assert(!(await next().innerText()).includes('Main Office Operations and Customer Support'));checks.push('H06 actual old Home response held while source and generation change cannot repopulate prior private rows');
 }finally{late.release();await late.done;await page.unroute(late.path,late.handler);lateEvidence.observations=await page.evaluate(()=>{const evidence=window.__homeHeldEvidence;evidence.observe('final');evidence.stop();delete window.__homeHeldEvidence;return evidence.observations;});page.off('request',onRequest);page.off('requestfinished',onFinished);page.off('requestfailed',onFailed);await writeFile(join(evidenceDirectory,`home-held-${engine}-${width}.json`),JSON.stringify(lateEvidence,null,2));}

 stage='late-time';
 // Re-anchored: clock status lives on the Time tab, so its own private read is held there.
 const timeView=(await openTime('CLOCKED_IN')).view;
 const timeEvidence={view:timeView,requests:[]};details.lateTime=timeEvidence;
 const timeRequest=(event,request)=>{const path=new URL(request.url()).pathname;if(path==='/api/employee/home'||path==='/api/employee/my-time'||path.startsWith('/api/employee/hours/'))timeEvidence.requests.push({event,endpoint:path.endsWith('/home')?'home':path.endsWith('/my-time')?'my-time':'hours',at:Date.now()});};
 const timeStarted=request=>timeRequest('request',request),timeFailed=request=>timeRequest('failed',request),timeFinished=request=>timeRequest('finished',request);
 page.on('request',timeStarted);page.on('requestfailed',timeFailed);page.on('requestfinished',timeFinished);
 const time=gate(timeReadPath(timeView));await page.route(time.path,time.handler);
 try{
  await refreshTime(timeView);await time.seen;
  await q("UPDATE time_entries SET clock_out_at=clock_timestamp(),status='CLOCKED_OUT' WHERE id=$1",[label+'-time']);
  timeEvidence.afterDispatch=await page.evaluate(()=>{window.dispatchEvent(new Event('pagehide'));return {at:Date.now(),time:document.querySelector('.c-hours')?.getAttribute('data-hours-state')??null};});
  // Synthetic lifecycle dispatch returns before React necessarily commits its
  // invalidated state. Keep the old response held until that commit is visible.
  await timePaused().waitFor({timeout:15000});assert.equal(await clockedIn().count(),0);
  timeEvidence.pausedCommit={at:Date.now(),clockedInCount:await clockedIn().count(),requestCount:timeEvidence.requests.filter(item=>item.event==='request').length};
  assert.equal(timeEvidence.pausedCommit.requestCount,1,'Pagehide clearing must not require a new Home or Time request');
  time.release();await time.done;assert.equal(time.failure,undefined);timeEvidence.heldOutcome=time.outcome;
  await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(resolve)));
  assert.equal(await timePaused().count(),1);assert.equal(await clockedIn().count(),0);
  timeEvidence.afterHeldSettled={at:Date.now(),state:'paused',clockedInCount:0};
 }finally{time.release();await time.done;await page.unroute(time.path,time.handler);page.off('request',timeStarted);page.off('requestfailed',timeFailed);page.off('requestfinished',timeFinished);await writeFile(join(evidenceDirectory,`home-held-time-${engine}-${width}.json`),JSON.stringify(timeEvidence,null,2));}
 await page.evaluate(()=>window.dispatchEvent(new Event('pageshow')));details.timeAfterClockOut=await waitForRecordedTimeReady(page,'OFF_CLOCK');assert(await offClock().first().isVisible());await openHome();checks.push('H07 held actual Time read after pagehide/unmount cannot restore old Clocked In on the Time tab; fresh re-entry reflects persisted clock-out');
 stage='route-leave';const leaving=gate('**/api/employee/home');await page.route(leaving.path,leaving.handler);await page.evaluate(()=>window.dispatchEvent(new Event('storage')));await leaving.seen;await page.waitForFunction(()=>document.querySelector('.portal-notification-bell')?.getAttribute('data-state')==='ready');const leavingNavigation=await page.goto(app.url+'/app/requests/hub',{waitUntil:'domcontentloaded'});assert(leavingNavigation?.ok());await page.getByRole('heading',{name:'Requests',exact:true}).waitFor();leaving.release('navigation');await leaving.done;assert.equal(leaving.failure,undefined);details.routeLeaveOutcome=leaving.outcome;await page.unroute(leaving.path,leaving.handler);await page.waitForLoadState('networkidle');assert.equal(await page.locator(HOME_SHIFT_CARD+' a[href^="/app/schedule"]').count(),0);await page.goto(app.url+'/app');await ready();checks.push('H08 hard route leave during actual Home read unmounts private Home; re-entry reads current sources');
 if(width===390){stage='sql-source-failure';const blocker=new Client({connectionString:app.database.connectionString});await blocker.connect();try{await blocker.query('BEGIN');await blocker.query('LOCK TABLE time_off_requests IN ACCESS EXCLUSIVE MODE');await refresh();const timeOffSource=()=>todo().locator('a.c-row[href="/app/requests?tab=my"]').filter({hasText:'Couldn’t be checked'});await timeOffSource().waitFor();assert.equal(await assignments().count(),1,'Independently authorized assignments stay: one shift card');await shot('unavailable');await blocker.query('COMMIT');await refresh();assert.equal(await timeOffSource().count(),0);checks.push('H09 actual time-off lock timeout retains independently authorized assignments, discloses unavailable and Retry restores current source');}finally{await blocker.query('ROLLBACK');await blocker.end();}}
 stage='replaced-session';const other=await context.newPage();await login(other,scenario.actors[1]);await other.waitForLoadState('networkidle');await other.close();await page.evaluate(()=>window.dispatchEvent(new Event('storage')));await page.locator('[data-home-state="unauthorized"]').waitFor();assert.equal(await assignments().count(),0);assert.equal(await items().count(),0);assert.equal(await recorded().count(),0);assert(await page.locator('main').getByRole('link',{name:'Sign in',exact:true}).isVisible());await shot('session-replaced');checks.push('H10 actual same-browser account cookie replacement refuses former lifetime binding and clears every Home private row');
 await page.bringToFront();await login();await ready();stage='early-my-time-route';
 const bellHold=gate('**/api/notifications');let bellReads=0;
 const observeBell=request=>{if(request.method()==='GET'&&new URL(request.url()).pathname==='/api/notifications')bellReads++;};
 await page.waitForFunction(()=>document.querySelector('.portal-notification-bell')?.getAttribute('data-state')==='ready');
 await page.waitForLoadState('networkidle');
 page.on('request',observeBell);await page.route(bellHold.path,bellHold.handler);
 try{
  await page.evaluate(()=>window.dispatchEvent(new Event('nevora:notifications-changed')));await bellHold.seen;
  await page.waitForFunction(()=>document.querySelector('.portal-notification-bell')?.getAttribute('data-state')==='loading');
  await page.evaluate(()=>{window.dispatchEvent(new Event('focus'));window.dispatchEvent(new Event('pageshow'));});
  await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
  assert.equal(bellReads,1,'Duplicate foreground events retain the held current notification read');
  const reply=page.waitForResponse(response=>new URL(response.url()).pathname==='/api/notifications'&&response.request().method()==='GET');
  bellHold.release();await bellHold.done;assert.equal((await reply).status(),200);assert.equal(bellHold.outcome,'fulfilled');assert.equal(bellHold.failure,undefined);
  await page.waitForFunction(()=>document.querySelector('.portal-notification-bell')?.getAttribute('data-state')==='ready');
 }finally{bellHold.release();await bellHold.done;await page.unroute(bellHold.path,bellHold.handler);page.off('request',observeBell);}
 checks.push('H11 duplicate foreground focus/pageshow retains one actual held authorized notification read; its returned current count is required');
 // Re-anchored: the recorded-time read is the Time tab's, so the early departure leaves from Time.
 await page.bringToFront();await ready();const earlyView=(await openTime('OFF_CLOCK')).view;
 details.earlyTimeBaseline=await waitForRecordedTimeReady(page,'OFF_CLOCK');
 assert.deepEqual(details.earlyTimeBaseline,{state:'OFF_CLOCK',view:'time',settled:true});
 const early=gate(timeReadPath(earlyView));await page.route(early.path,early.handler);await refreshTime(earlyView);await early.seen;
 await page.waitForFunction(()=>document.querySelector('.portal-notification-bell')?.getAttribute('data-state')==='ready');
 const earlyNavigation=await page.goto(app.url+'/app/schedule?week='+scenario.week,{waitUntil:'domcontentloaded'});assert(earlyNavigation?.ok());await page.getByRole('heading',{level:1,name:'Schedule',exact:true}).waitFor();
 await page.locator('.portal-notification-bell[data-state="ready"]').waitFor({state:'attached'});
 details.earlyTimeDestination=await page.evaluate(()=>({route:location.pathname,bellState:document.querySelector('.portal-notification-bell')?.getAttribute('data-state')}));
 assert.deepEqual(details.earlyTimeDestination,{route:'/app/schedule',bellState:'ready'});
 early.release('navigation');await early.done;assert.equal(early.failure,undefined);details.earlyTimeRouteOutcome=early.outcome;await page.unroute(early.path,early.handler);await page.waitForLoadState('networkidle');await page.goto(app.url+'/app');await ready();checks.push('H11 actual Time-tab recorded-time read interrupted by early hard route navigation produces no stale Home rows or page runtime error; destination notification read is ready before the next departure');
 stage='removal-review';
 await page.goto(app.url+'/app/schedule?week='+scenario.week);
 // Board G-E-Schedule: Confirm this week sits in the week card; a confirmed week shows the Confirmed pill there.
 await page.getByRole('group',{name:'Confirm this week',exact:true}).getByRole('button',{name:'Confirm schedule',exact:true}).click();
 await page.locator('main [aria-label="Week"]').locator('.c-pill').getByText('Confirmed',{exact:true}).waitFor();assert.equal(await page.getByRole('button',{name:'Confirm schedule',exact:true}).count(),0);
 const [ack]=await q('SELECT publication_revision_id FROM schedule_acknowledgements WHERE employee_id=$1 AND week_start=$2',[actor,scenario.week]);
 const [published]=await q('SELECT id FROM schedule_publication_revisions WHERE week_start=$1 ORDER BY revision_number DESC LIMIT 1',[scenario.week]);
 assert.equal(ack.publication_revision_id,published.id);
 await page.goto(app.url+'/app');await ready();
 stage='empty';await q('DELETE FROM shifts WHERE employee_id=$1',[actor]);await refresh();
 // Publish changes (5f234911, Jose Oct 29/30): an edit to a published week is held, and Home keeps the last
 // published shift until the Owner publishes. Then both weeks are published without this person's shifts.
 assert.equal(await assignments().count(),1,'A held, unpublished removal leaves the published next shift on Home');
 await publishScheduleWithRevision({locationId:'loc-1',weekStart:clock.week,managerId:'QAOWNER'},app.database.executor);
 await publishScheduleWithRevision({locationId:'loc-1',weekStart:scenario.week,managerId:'QAOWNER'},app.database.executor);
 await refresh();await next().getByText('No upcoming shift. New shifts show here once they’re published.',{exact:true}).waitFor();assert.equal(await assignments().count(),0);assert.equal(await page.getByText('On shift now',{exact:true}).count(),0);assert.equal(await allSet().count(),0);await shot('empty');checks.push('H12 actual held edit stays invisible until published; then the no-future-assignment state uses precise empty copy and incomplete publication/other attention prevents all-clear');
 stage='last-shift-removal';
 // The removal was published in the empty stage (held edits publish together); this is its current review.
 await refresh();
 const removed=todo().locator('a.c-row[href="/app/schedule?week='+scenario.week+'"]');
 await removed.getByText('Schedule removed',{exact:true}).waitFor();assert(await removed.locator('.c-row__trail').getByText('Review',{exact:true}).isVisible());
 const removalResponse=await page.evaluate(async binding=>{const response=await fetch('/api/employee/home',{headers:{'X-Nevora-Home':binding},cache:'no-store'});return response.json();},binding);
 details.removalSource=removalResponse.snapshot.sources.acknowledgements;
 assert.equal(details.removalSource.state,'partial');assert.equal(details.removalSource.reason,'unpublished');
 assert(removalResponse.snapshot.attention.some(item=>item.ref.kind==='SCHEDULE'&&item.ref.id===scenario.week&&item.required&&item.actionable));
 assert.equal(removalResponse.allSet,false);
 assert.equal(await page.locator('.employee-home').getByText('Time off approved · Nov 1, 2030 – Nov 2, 2030',{exact:true}).count(),0,'Informational time-off rows are read in Notifications');
 assert.equal(await page.getByRole('button',{name:'Confirm schedule',exact:true}).count(),0);
 assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
 await shot('last-shift-removal');
 checks.push('H13 actual canonical confirmation then last own shift removal and republish exposes current actionable removal review, preserves independent time-off rows and canonical review without compact consent');
 stage='complete-zero';const clearActor='QA-'+label+'-CLEAR';
 await q("INSERT INTO employees(id,first_name,last_name,phone,role,primary_location_id) VALUES($1,'Fictional','Clear','555-0197','EMPLOYEE','loc-1')",[clearActor]);
 await q('INSERT INTO employee_credentials(employee_id,password_hash,must_change_password) VALUES($1,$2,false)',[clearActor,await hashPassword(TEST_PASSWORD)]);
 await login(page,clearActor);await ready();await allSet().waitFor();assert.equal(await page.locator('[data-home-state="ready"]').count(),1);assert.equal(await items().count(),0);assert.equal(await todo().count(),0);await shot('all-set');
 const clearApi=await page.evaluate(async binding=>{const r=await fetch('/api/employee/home',{cache:'no-store',headers:{'X-Nevora-Home':binding}});return r.json();},binding);assert.equal(clearApi.allSet,true);assert.equal(clearApi.snapshot.publicationState,'complete');for(const source of Object.values(clearApi.snapshot.sources))assert.equal(source.state,'complete');
 checks.push('H15 actual new eligible account has no historical communication grants; all six canonical sources/publication complete and zero items yield exact all-set copy');
 if(width===390){stage='communication-source-failure';const blocker=new Client({connectionString:app.database.connectionString});await blocker.connect();try{await blocker.query('BEGIN');await blocker.query('LOCK TABLE communications IN ACCESS EXCLUSIVE MODE');await refresh();await todo().locator('a.c-row[href="/app/updates"]').filter({hasText:'Couldn’t be checked'}).waitFor();assert.equal(await allSet().count(),0);await shot('communications-unavailable');await blocker.query('COMMIT');await refresh();await allSet().waitFor();checks.push('H16 actual communication SQL lock failure suppresses all-clear and Retry restores current complete zero source');}finally{await blocker.query('ROLLBACK');await blocker.end();}}
 stage='axe-diagnostic';await page.addScriptTag({path:axeFile});details.axe=await page.evaluate(async()=>{const result=await window.axe.run(document,{runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21a','wcag21aa']}});return result.violations.map(v=>({id:v.id,nodes:v.nodes.map(n=>({target:n.target.map(t=>String(t).replace(/\[[^\]]*\]/g,'[attribute]')),contrast:n.any.filter(a=>a.id==='color-contrast').map(a=>({ratio:a.data?.contrastRatio,foreground:a.data?.fgColor,background:a.data?.bgColor}))}))}));});assert.deepEqual(details.axe,[]);
 details.runtimeErrors=runtimeErrors;assert.deepEqual(runtimeErrors,[]);details.html=await page.locator('.employee-home').innerHTML();await writeFile(join(evidenceDirectory,`home-task11-${engine}-${width}-checks.json`),JSON.stringify(details,null,2));return {checks};
 }catch(error){details.failedStage=stage;details.failure={name:error.name,code:error.code??null,message:'Browser step failed; see named stage and source location',location:error.stack?.split('\n').find(line=>line.includes('phase-e-home-browser-scenarios.mjs'))};await shot('failure').catch(()=>{});await writeFile(join(evidenceDirectory,`home-task11-${engine}-${width}-failure.json`),JSON.stringify(details,null,2));throw error;}finally{page.off('request',notificationStart);page.off('requestfinished',notificationFinish);page.off('requestfailed',notificationFailed);page.off('pageerror',nativeError);await writeFile(join(evidenceDirectory,`home-lifecycle-${engine}-${width}-report.json`),JSON.stringify({engine,width,events:details.lifecycleTrace},null,2));await managerContext?.close();}
}
