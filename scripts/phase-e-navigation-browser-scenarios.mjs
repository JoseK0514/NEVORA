import assert from 'node:assert/strict';
import {writeFile} from 'node:fs/promises';
import {join} from 'node:path';
import {Client} from 'pg';
import {seedOwnedScenario,seedOwnedScenarioOwner,assignOwnedManagerCompanyAccess,TEST_PASSWORD} from '../src/test/integration/owned-app-fixture.ts';
import {interceptedInboxResponse,withActorRole} from './phase-e-navigation-request.mjs';
import {waitForSheetEntrance,waitForReviewedTimeOff,restoreSheetMotion} from './browser-render-readiness.mjs';

export async function runScenario({app,context,page,engine,width,evidenceDirectory,axeFile,runtimeErrors:cellRuntimeErrors}){
 let stage='seed';cellRuntimeErrors.setStageReader(()=>stage);
 const tabKey=process.platform==='darwin'&&engine==='webkit'?'Alt+Tab':'Tab',backTabKey=process.platform==='darwin'&&engine==='webkit'?'Alt+Shift+Tab':'Shift+Tab';
 const checks=[],contrast=[],focusTrace=[],expiryRecovery=[],runtimeErrors=[],loginAttempts=[],navigationAttempts=[],prefix=`navigation-${engine}-${width}`,headers={};
 let badgeBounds=null,retainedOverflowFailure=false;
 const q=(text,values=[])=>app.database.executor.query({text,values});
 page.on('pageerror',error=>{if(!cellRuntimeErrors.isNavigationDiagnostic(error))runtimeErrors.push({name:error.name,message:error.message.replace(/https?:[^\s]+/g,'[URL]').replace(/[A-Za-z0-9_-]{40,}/g,'[long value]'),path:new URL(page.url()).pathname.replace(/\/api\/calendar\/[^/]+/g,'/api/calendar/[redacted]'),lastCompleted:checks.at(-1),stack:error.stack?.replace(/https?:[^\s)]+/g,'[URL]').replace(/[A-Za-z0-9_-]{40,}/g,'[long value]')});});
 page.on('request',request=>{const path=new URL(request.url()).pathname;if(path.startsWith('/api/employee/')||path==='/api/notifications')headers[path]=request.headers()['x-nevora-employee-view'];});
 async function login(id){
  const attempt={outcome:'started'};loginAttempts.push(attempt);
  try{
   await page.bringToFront();await page.goto(app.url+'/login');await page.getByLabel('Employee ID',{exact:true}).fill(id);await page.getByLabel('Password',{exact:true}).fill(TEST_PASSWORD);
   await Promise.all([page.waitForURL(u=>u.pathname==='/app',{waitUntil:'commit'}),page.getByRole('button',{name:'Sign in',exact:true}).click()]);
   await page.locator('.app-shell.nevora-portal').waitFor();await page.waitForLoadState('networkidle');attempt.outcome='ready';
  }catch(error){
   const url=new URL(page.url()),code=url.searchParams.get('error');attempt.outcome='failed';attempt.route=['/login','/app'].includes(url.pathname)?url.pathname:'other';attempt.error=['busy','invalid','missing','locked'].includes(code)?code:code?'other':null;
   await page.screenshot({path:join(evidenceDirectory,`${prefix}-login-failure.png`),timeout:5000}).catch(()=>{});throw error;
  }
 }
 async function settle(){await page.waitForLoadState('networkidle');}
 async function nav(href,keyboard=false){
  assert(['/app','/app/schedule','/app/requests/hub','/app/my-time','/app/availability','/app/profile','/app/notifications','/app/updates'].includes(href),'Known navigation diagnostic destination');
  const source=new URL(page.url()).pathname,start=performance.now(),row={destination:href,keyboard,status:'started',requests:[],omittedRequests:0};
  if(navigationAttempts.length<64)navigationAttempts.push(row);
  const observed=new Map();
  const request=value=>{
   const url=new URL(value.url());if(url.origin!==app.url||url.pathname!==href||!(value.headers().rsc==='1'||value.isNavigationRequest()))return;
   if(row.requests.length===16){row.omittedRequests++;return;}
   const entry={kind:value.headers().rsc==='1'?'rsc':'document',status:null,finished:false,failed:false};observed.set(value,entry);row.requests.push(entry);
  };
  const response=value=>{const entry=observed.get(value.request());if(entry)entry.status=value.status();};
  const finished=value=>{const entry=observed.get(value);if(entry)entry.finished=true;};
  const failed=value=>{const entry=observed.get(value);if(entry)entry.failed=true;};
  page.on('request',request);page.on('response',response);page.on('requestfinished',finished);page.on('requestfailed',failed);
  try{await navigate(href,keyboard);row.status='passed';}
  catch(error){row.status='failed';if(!navigationAttempts.includes(row)&&!retainedOverflowFailure){retainedOverflowFailure=true;navigationAttempts.push(row);}throw error;}
  finally{
   row.elapsedMs=Math.round(performance.now()-start);row.destinationCommitted=new URL(page.url()).pathname===href;row.sourceUnchanged=new URL(page.url()).pathname===source;
   page.off('request',request);page.off('response',response);page.off('requestfinished',finished);page.off('requestfailed',failed);
  }
 }
 async function navigate(href,keyboard=false){
  const mobile=await page.locator('.mobile-nav').isVisible();
  const primary=['/app','/app/schedule','/app/requests/hub','/app/my-time'].includes(href);
  // Availability belongs to Requests on both layouts; desktop Profile is an account action.
  const sectionOwner={'/app/availability':'/app/requests/hub'}[href];
  if(sectionOwner){
   // v5: Requests lists Availability as a row (segments and Back replace the old section tabs).
   await nav(sectionOwner);const row=page.locator('main a[href="'+href+'"]').first();if(mobile)await row.tap();else await row.click();await page.waitForURL(u=>u.pathname===href);await settle();
   await page.waitForFunction(({mobile,sectionOwner})=>!document.querySelector('.section-tabs')&&(mobile?document.querySelector('.mobile-nav a[aria-current="page"]')?.getAttribute('href')===sectionOwner:true),{mobile,sectionOwner});return;
  }
  if(!mobile&&href==='/app/profile'){
   const trigger=page.getByRole('button',{name:/, account menu$/}),menu=page.locator('#portal-account-menu');
   if(keyboard){await page.bringToFront();await trigger.focus();await page.keyboard.press('Enter');}else await trigger.click();await menu.waitFor();
   const profile=menu.getByRole('link',{name:'Your profile',exact:true});
   if(keyboard){await page.waitForFunction(()=>document.querySelector('#portal-account-menu a[href="/app/profile"]')===document.activeElement);await page.keyboard.press('Enter');}else await profile.click();
   await page.waitForURL(u=>u.pathname===href);await settle();await menu.waitFor({state:'hidden'});
   assert.equal(await page.locator('nav[aria-label="Primary navigation"] a[href="/app/profile"]').count(),0,'Profile is reached from the account menu');
   assert.equal(await page.locator('nav[aria-label="Primary navigation"] a[aria-current]').count(),0,'Account pages do not select an unrelated sidebar section');return;
  }
  // v5: an Employee's or Lead's More is a page; its rows reach Updates, Notifications and Profile.
  if(mobile&&!primary){const more=page.locator('.mobile-nav a[href="/app/more"]');await more.tap();await page.waitForURL(u=>u.pathname==='/app/more');await settle();}
  const root=mobile?(primary?page.locator('.mobile-nav'):page.locator('main')):page.locator('nav[aria-label="Primary navigation"]');
  const destination=root.locator('a[href="'+href+'"]').first();if(mobile){const rect=await destination.boundingBox();assert(rect);await destination.evaluate(e=>e.addEventListener('touchstart',()=>{window.__employeeNavigationTouch=true;},{once:true}));await page.evaluate(()=>{window.__employeeNavigationTouch=false;});await destination.tap({position:{x:rect.width-8,y:rect.height/2}});assert(await page.evaluate(()=>window.__employeeNavigationTouch),'Native mobile navigation dispatched touchstart');}else await destination.click();await page.waitForURL(u=>u.pathname===href);await settle();
  await page.waitForFunction(({mobile,primary,href})=>mobile?(primary?document.querySelector('.mobile-nav a[aria-current="page"]')?.getAttribute('href')===href:document.querySelector('.mobile-nav a[href="'+(href==='/app/notifications'?'/app':'/app/more')+'"]')?.classList.contains('active')):document.querySelector('nav[aria-label="Primary navigation"] a[aria-current="page"]')?.getAttribute('href')===href,{mobile,primary,href});
  assert.equal(await page.locator('#employee-more-navigation').count(),0,'v5 has no More pop-up');
 }
 // Profile keeps aria-hidden placeholder rows; inbox controls exist even in a ready empty view.
 async function ready(kind){await page.waitForFunction(k=>{const e=document.querySelector(`[data-private-view="${k}"]`);return e&&(k==='profile'?[...e.querySelectorAll('.q-rv--l')].some(value=>value.textContent!=='–'):!!e.querySelector('[aria-label="Filter notifications"] button:not([disabled])'));},kind);}
 const notifications=()=>page.locator('[data-private-view="notifications"]');
 // v5 has no manual Refresh: the inbox re-reads when the app returns to the front. A storage event reaches only the
 // inbox panel (the bell ignores it), so each refresh is exactly one inbox read, as the old Refresh button was.
 const refreshNotifications=()=>page.evaluate(()=>window.dispatchEvent(new Event('storage')));
 const refreshProfile=()=>page.evaluate(()=>window.dispatchEvent(new Event('storage')));
 async function screenshot(name){await page.screenshot({path:join(evidenceDirectory,`${prefix}-${name}.png`),fullPage:true});}
 async function accessibility(name){
  const expectedTitle={'Requests hub':'Requests · NEVORA',Profile:'Profile · NEVORA',Notifications:'Notifications · NEVORA'}[name];assert(expectedTitle,'Known page title contract');await page.waitForFunction(title=>document.title===title,expectedTitle);const entrance=name==='Requests hub'?await waitForSheetEntrance(page):undefined;await page.addScriptTag({path:axeFile});
  const violations=await page.evaluate(async()=> (await window.axe.run(document,{runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21a','wcag21aa']}})).violations.map(v=>({id:v.id,nodes:v.nodes.slice(0,20).map(node=>({target:node.target.map(selector=>String(selector).replace(/https?:[^\s)]+/g,'[URL]').replace(/[A-Za-z0-9_-]{32,}/g,'[OPAQUE]')),contrast:[...node.any,...node.all,...node.none].filter(check=>check.id==='color-contrast').map(check=>({foreground:check.data?.fgColor,background:check.data?.bgColor,ratio:check.data?.contrastRatio,expected:check.data?.expectedContrastRatio}))}))})));
  await writeFile(join(evidenceDirectory,`navigation-${engine}-${width}-${name.toLowerCase().replace(/[^a-z0-9]+/g,'-')}-axe-report.json`),JSON.stringify({engine,width,page:name,entrance,violations},null,2));
  assert.deepEqual(violations,[],name+' accessibility');checks.push(name+' axe WCAG A/AA');
 }
 async function contrastStates(){
  // v5 Profile has no Refresh; measure the page's own Sign out button, then walk back through the account rows.
  const target=page.getByRole('region',{name:'Session',exact:true}).getByRole('button',{name:'Sign out',exact:true});
  const sample=()=>target.evaluate(element=>{
   const rgba=value=>{const parts=value.match(/[\d.]+/g).map(Number);return [parts[0],parts[1],parts[2],parts[3]??1];};
   const blend=(front,back)=>front.slice(0,3).map((v,i)=>v*front[3]+back[i]*(1-front[3]));
   const layers=[];for(let node=element;node;node=node.parentElement)layers.unshift(rgba(getComputedStyle(node).backgroundColor));
   const background=layers.reduce((back,front)=>blend(front,back),[255,255,255]),style=getComputedStyle(element),foreground=blend(rgba(style.color),background);
   const luminance=color=>color.map(v=>v/255).map(v=>v<=0.04045?v/12.92:((v+0.055)/1.055)**2.4).reduce((sum,v,i)=>sum+v*[0.2126,0.7152,0.0722][i],0);
   const ratio=(a,b)=>(Math.max(luminance(a),luminance(b))+0.05)/(Math.min(luminance(a),luminance(b))+0.05);
   const page=getComputedStyle(document.body).backgroundColor;
   return {active:element===document.activeElement,focusVisible:element.matches(':focus-visible'),disabled:element.disabled,foreground,background,textRatio:ratio(foreground,background),outline:style.outlineStyle,outlineWidth:style.outlineWidth,outlineRatio:ratio(blend(rgba(style.outlineColor),rgba(page)),rgba(page).slice(0,3))};
  });
  for(const state of ['normal','hover','pressed','focus']){
   if(state==='normal'){await target.scrollIntoViewIfNeeded();await page.mouse.move(0,0);}
   if(state==='hover')await target.hover();
   if(state==='pressed')await page.mouse.down();
   if(state==='focus'){await page.mouse.move(0,0);await page.mouse.up();await page.evaluate(()=>window.scrollTo(0,0));let reached=false;for(let n=0;n<40;n++){await page.keyboard.press(tabKey);const now=await target.evaluate(e=>({stage:'native Tab',active:e===document.activeElement,disabled:e.disabled,focusVisible:e.matches(':focus-visible')}));if(now.active){focusTrace.push(now);reached=true;break;}}assert(reached,'Native keyboard reaches Sign out');}
   const measured=await sample();contrast.push({state,...measured});
   assert(measured.textRatio>=4.5,state+' actual composited button text contrast');
   if(state==='focus'){assert(measured.active&&measured.focusVisible&&!measured.disabled,'Actual native keyboard focus is visible');assert.notEqual(measured.outline,'none');assert(measured.outlineRatio>=3,'focus outline contrast');}
  }
  const clear=async(control,name)=>{const sample=await control.evaluate(e=>{const r=e.getBoundingClientRect(),nav=document.querySelector('.mobile-nav')?.getBoundingClientRect(),header=document.querySelector('.mobile-header')?.getBoundingClientRect();return {top:r.top,bottom:r.bottom,minimum:header?.height?header.bottom:0,maximum:nav?.height?nav.top:innerHeight,active:e===document.activeElement,focusVisible:e.matches(':focus-visible')};});focusTrace.push({stage:name,...sample});assert(sample.active&&sample.focusVisible,name+' has native visible focus');assert(sample.top>=sample.minimum&&sample.bottom<=sample.maximum,name+' is unobscured above fixed navigation');};
  await clear(target,'Sign out');let walked=0;
  for(let n=0;n<4;n++){await page.keyboard.press(backTabKey);const current=page.locator(':focus');assert.equal(await current.count(),1);await clear(current,'Account control');walked++;}
  assert.equal(walked,4,'Native reverse traversal walks the account rows above Sign out');
  await page.mouse.move(0,0);await page.mouse.up();checks.push('Native '+tabKey+' traversal and scroll keeps Sign out and the account rows unobscured above mobile navigation');checks.push('Actual composited normal/hover/pressed/focus text and focus-outline contrast measured');
 }
 async function bounds(){assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),'document horizontal overflow');const bad=await page.locator('main .q-list a.q-row,main .q-list button.q-row,main .q-btn,.profile-signout-row,[data-inbox-row] > a').evaluateAll(elements=>elements.filter(e=>{const r=e.getBoundingClientRect();return r.width&& (r.left< -1||r.right>innerWidth+1||r.height<43);}).map(e=>e.textContent));assert.deepEqual(bad,[]);}
 try{
  const label='E'+(engine==='chromium'?'C':'W')+width,scenario=await seedOwnedScenario(app.database.executor,label,[320,375,390,430,768,1024,1440].indexOf(width)+(engine==='webkit'?7:0)+42),actor=scenario.actors[0],requestId='e41-'+label,noticeId='notice-'+label;
  await q('DELETE FROM notifications WHERE employee_id=$1',[actor]);
  await q("INSERT INTO time_off_requests(id,employee_id,start_date,end_date,status,reason) VALUES($1,$2,current_date+7,current_date+7,'APPROVED','Fictional private reason')",[requestId,actor]);
  await q("INSERT INTO notifications(id,employee_id,type,title,body,event_key,environment,source_kind,source_id,source_version,effective_version,purpose,due_at,expires_at,urgency,push_state) VALUES($1,$2,'TIME_OFF_DECIDED','STORED PRIVATE TITLE','STORED PRIVATE BODY',$1,'test','TIME_OFF',$3,'APPROVED','APPROVED','EVENT',now()-interval '1 hour',now()+interval '1 day','high','pending')",[noticeId,actor,requestId]);
  const actualRole=[320,1440].includes(width)?'EMPLOYEE':'LEAD';await q('UPDATE employees SET role=$1 WHERE id=$2',[actualRole,actor]);
  stage='login';await login(actor);await settle();
  const badge=await page.waitForFunction(()=>{
   for(const portal of document.querySelectorAll('nextjs-portal'))for(const button of portal.shadowRoot?.querySelectorAll('[data-nextjs-dev-tools-button][aria-label="Open Next.js Dev Tools"]')??[]){
    const style=getComputedStyle(button),rect=button.getBoundingClientRect();
    if(style.display!=='none'&&style.visibility==='visible'&&rect.width>0&&rect.height>0&&rect.y<100)return {x:rect.x,y:rect.y,width:rect.width,height:rect.height};
   }
   return false;
  });badgeBounds=await badge.jsonValue();await badge.dispose();assert(badgeBounds&&badgeBounds.y<100,'Configured development badge stays clear of bottom navigation');
  assert.equal(await page.evaluate(()=>matchMedia('(pointer: coarse)').matches),width<768,'Emulated touch pointer matches required context');assert.equal(await page.evaluate(()=>innerWidth),width);checks.push(`Actual authenticated ${actualRole} role`);checks.push('Required CSS width and mobile touch emulation verified; native taps used on mobile navigation');
  for(const href of ['/app/schedule','/app/my-time','/app']){await nav(href);const current=await page.locator('.mobile-nav').isVisible()?page.locator('.mobile-nav a[aria-current="page"]'):page.locator('nav[aria-label="Primary navigation"] a[aria-current="page"]');assert.equal(await current.getAttribute('href'),href);}
  checks.push('Home_Schedule_MyTime_More_all_routes_reachable through authenticated navigation');
  await nav('/app/requests/hub');await bounds();await screenshot('requests');await accessibility('Requests hub');
  // v5 (mockup E06): Ask for Time off and Swap or cover a shift; each page goes Back to Requests.
  const timeOff=page.locator('main').getByRole('link',{name:'Time off',exact:true}),shifts=page.locator('main').getByRole('link',{name:'Swap or cover a shift',exact:true});assert.equal(await timeOff.getAttribute('href'),'/app/requests');assert.equal(await shifts.getAttribute('href'),'/app/exchange');
  for(const [link,path] of [[timeOff,'/app/requests'],[shifts,'/app/exchange']]){
   await link.click();await page.waitForURL(u=>u.pathname===path);await settle();
   await page.locator('main a.q-nav__l[href="/app/requests/hub"]').waitFor();assert.equal(await page.locator('main a.q-nav__l[href="/app/requests/hub"]').count(),1,'Back to Requests');assert.equal(await page.locator('.section-tabs').count(),0);
   if(await page.locator('.mobile-nav').isVisible()){assert.equal(await page.locator('.mobile-nav a[aria-current="page"]').getAttribute('href'),'/app/requests/hub');assert.equal(await page.locator('.mobile-nav a[href="/app/more"]').evaluate(e=>e.classList.contains('active')),false);}
   await page.goBack();await settle();
  }
  checks.push('Requests_hub_preserves_TimeOff_ShiftRequests canonical URLs and selected ownership');
  await nav('/app/availability');assert.equal(new URL(page.url()).pathname,'/app/availability');
  if(await page.locator('.mobile-nav').isVisible()){
   // v5: More is a page. The keyboard opens it from the tab bar; its rows keep a fixed order; Back returns.
   const trigger=page.locator('.mobile-nav a[href="/app/more"]');await trigger.focus();await page.keyboard.press('Enter');await page.waitForURL(u=>u.pathname==='/app/more');await settle();
   await page.locator('main .q-list a.q-row[href="/app/profile"]').waitFor();
   const order=await page.locator('main .q-list a.q-row').evaluateAll(es=>es.map(e=>e.getAttribute('href')));
   assert(order.includes('/app/profile')&&order.includes('/app/notifications'),'More lists Profile and Notifications');
   const known=['/app/profile','/app/updates','/app/notifications'];assert.deepEqual(order.filter(href=>known.includes(href)),known.filter(href=>order.includes(href)),'More keeps its row order');
   assert(await trigger.evaluate(e=>e.classList.contains('active')));await page.goBack();await page.waitForURL(u=>u.pathname==='/app/availability');await settle();
   checks.push('More page reached by native Enter with explicit row order; Back returns');
  }else{await nav('/app/profile',true);checks.push('Native keyboard desktop account-menu Profile navigation and focus handoff');}
  stage='layout';await nav('/app/profile');await ready('profile');assert.equal(await page.locator('#portal-device-settings').count(),0);assert(await page.getByText('Your workplace hasn’t turned on alerts yet.',{exact:true}).isVisible());await bounds();await screenshot('profile');await accessibility('Profile');await contrastStates();
  await nav('/app/notifications');await ready('notifications');assert.equal(await page.locator('[data-inbox-row] > a').count(),1);assert.equal(await page.locator('[data-inbox-row] > a').getAttribute('href'),'/app/notifications/open?notificationId='+noticeId);assert(!await page.locator('[data-private-view]').innerText().then(t=>t.includes('STORED PRIVATE')));await bounds();await screenshot('inbox');await accessibility('Notifications');
  // The guarded open itself never mutates read state (checked on its own: the Quiet inbox row also marks an unread item
  // read when tapped, by its own explicit request).
  const before=await q('SELECT read_at FROM notifications WHERE id=$1',[noticeId]);const guarded=await page.request.get(app.url+'/app/notifications/open?notificationId='+noticeId,{maxRedirects:0});assert.equal(guarded.status(),303);assert.equal(new URL(guarded.headers().location,app.url).pathname,'/app/requests');assert.deepEqual(await q('SELECT read_at FROM notifications WHERE id=$1',[noticeId]),before);
  await page.locator('[data-inbox-row] > a').click();await page.waitForURL(u=>u.pathname==='/app/requests');
  // The guarded open loads a new document. Wait for its current bell read before Back;
  // a URL alone does not mean the destination's async reads have completed.
  await page.waitForFunction(()=>document.querySelector('.portal-notification-bell')?.getAttribute('data-state')==='ready');await settle();
  const opened=new URL(page.url());assert.equal(opened.searchParams.get('requestId'),requestId);assert.equal(opened.searchParams.get('tab'),'my');assert.equal(opened.hash,'#request-'+requestId);const afterOpen=await q('SELECT read_at FROM notifications WHERE id=$1',[noticeId]);await page.goBack();await ready('notifications');await settle();
  checks.push('push_disabled_profile_and_inbox_accessible persisted own source, guarded open preserves request ID/tab and causes no read mutation');
  stage='private-lifetime';for(const event of ['blur','pagehide']){await page.evaluate(e=>window.dispatchEvent(new Event(e)),event);await page.waitForFunction(()=>!document.querySelector('[data-inbox-row]'));assert.equal(await page.locator('[data-inbox-row]').count(),0);await page.evaluate(()=>window.dispatchEvent(new Event('focus')));await ready('notifications');}
  await context.setOffline(true);await page.waitForFunction(()=>!document.querySelector('[data-inbox-row]'));await context.setOffline(false);await ready('notifications');
  // Observe the real abort boundary and React commit separately. Keep an actual
  // authorized old response held: clearing cannot depend on another successful read.
  const visibilityEvidence={engine,width,requests:[],observations:[]};
  await page.evaluate(()=>{
   const observations=[],signals=[],originalFetch=window.fetch;
   const observe=event=>{const root=document.querySelector('[data-private-view="notifications"]');const entry={event,at:performance.now(),hidden:document.visibilityState==='hidden',paused:root?.textContent.includes('Updates paused')??false,rows:root?.querySelectorAll('[data-inbox-row]').length??0,requests:signals.length,aborted:signals.filter(signal=>signal.aborted).length};observations.push(entry);return entry;};
   window.fetch=function(input,options){if(new URL(typeof input==='string'?input:input.url??String(input),location.href).pathname==='/api/notifications'&&options?.signal){signals.push(options.signal);options.signal.addEventListener('abort',()=>observe('abort'),{once:true});observe('request');}return originalFetch.apply(this,arguments);};
   const observer=new MutationObserver(()=>observe('commit'));observer.observe(document.querySelector('[data-private-view="notifications"]'),{childList:true,subtree:true,attributes:true,characterData:true});
   window.__navigationVisibility={observe,observations,stop:()=>{observer.disconnect();window.fetch=originalFetch;}};observe('initial');
  });
  let release,started,finished,used=false,heldFailure,heldOutcome,operation='fetch';
  const gate=new Promise(resolve=>{release=resolve;}),seen=new Promise(resolve=>{started=resolve;}),done=new Promise(resolve=>{finished=resolve;});
  const heldHandler=async route=>{
   if(used)return route.continue();used=true;
   try{
    const response=await route.fetch();operation='parse';const payload=await response.json();
    visibilityEvidence.heldResponse={status:response.status(),state:payload.state,ownOldRow:payload.items?.length===1&&payload.items[0].id===noticeId};
    started();await gate;operation='fulfill';
    try{await route.fulfill({response});heldOutcome='fulfilled';}
    catch{if(route.request().failure())heldOutcome='request-aborted';else throw Error('Held response fulfillment failed');}
   }catch(error){heldFailure={operation,name:'RouteError',transportReset:error.message.includes('ECONNRESET'),requestFailed:!!route.request().failure()};started();await route.abort().catch(()=>{});}
   finally{finished();}
  };
  const observedRequest=(event,request)=>{if(new URL(request.url()).pathname==='/api/notifications')visibilityEvidence.requests.push({event,at:Date.now()});};
  const onStarted=request=>observedRequest('request',request),onFailed=request=>observedRequest('failed',request),onFinished=request=>observedRequest('finished',request);
  page.on('request',onStarted);page.on('requestfailed',onFailed);page.on('requestfinished',onFinished);
  await page.route('**/api/notifications',heldHandler);
  try{
   await refreshNotifications();await seen;assert.equal(heldFailure,undefined);assert.deepEqual(visibilityEvidence.heldResponse,{status:200,state:'ready',ownOldRow:true});
   visibilityEvidence.afterDispatch=await page.evaluate(()=>{Object.defineProperty(document,'visibilityState',{configurable:true,value:'hidden'});document.dispatchEvent(new Event('visibilitychange'));return window.__navigationVisibility.observe('after-dispatch');});
   visibilityEvidence.legacyImmediateRowCount=await page.locator('[data-inbox-row]').count();
   assert.equal(visibilityEvidence.afterDispatch.requests,1);assert.equal(visibilityEvidence.afterDispatch.aborted,1,'Hidden invalidation aborts the protected request before dispatch returns');
   // Dispatch synchronously invalidates the controller, but React commits later.
   // Observe that commit before asserting zero rows; do not wait on a new response.
   await page.getByRole('heading',{name:'Updates paused',exact:true}).waitFor({timeout:15000});assert.equal(await page.locator('[data-inbox-row]').count(),0);
   visibilityEvidence.pausedCommit=await page.evaluate(()=>window.__navigationVisibility.observe('paused-observed'));
   assert.equal(visibilityEvidence.pausedCommit.requests,1,'Private rows clear with the old response held and no new read');assert.equal(visibilityEvidence.requests.filter(item=>item.event==='request').length,1);
   await screenshot('visibility-paused-held');
   await q("UPDATE time_off_requests SET status='DENIED' WHERE id=$1",[requestId]);
   release();await done;assert.equal(heldFailure,undefined);visibilityEvidence.heldOutcome=heldOutcome;
   await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(resolve)));
   visibilityEvidence.afterHeldSettled=await page.evaluate(()=>window.__navigationVisibility.observe('held-settled'));
   assert.equal(visibilityEvidence.afterHeldSettled.hidden,true);assert.equal(visibilityEvidence.afterHeldSettled.paused,true);assert.equal(visibilityEvidence.afterHeldSettled.rows,0);assert.equal(visibilityEvidence.afterHeldSettled.requests,1);
   const observations=await page.evaluate(()=>window.__navigationVisibility.observations);
   assert(observations.slice(observations.findIndex(item=>item.paused)).every(item=>item.paused&&item.rows===0),'No observed commit after pausing may restore private rows');
   await page.unroute('**/api/notifications',heldHandler);
   const currentRead=page.waitForResponse(response=>new URL(response.url()).pathname==='/api/notifications'&&response.request().method()==='GET');
   await page.evaluate(()=>{delete document.visibilityState;document.dispatchEvent(new Event('visibilitychange'));});
   const currentResponse=await currentRead,currentView=await currentResponse.json();assert.equal(currentResponse.status(),200);assert.deepEqual(currentView.items,[]);await ready('notifications');await page.getByText('No notifications yet.',{exact:true}).waitFor();assert.equal(await page.locator('[data-inbox-row]').count(),0);
   visibilityEvidence.reentry={status:currentResponse.status(),currentItems:currentView.items.length,rows:0};assert.deepEqual(await q('SELECT read_at FROM notifications WHERE id=$1',[noticeId]),afterOpen);
   await q("UPDATE time_off_requests SET status='APPROVED' WHERE id=$1",[requestId]);await refreshNotifications();await ready('notifications');await page.locator('[data-inbox-row]').first().waitFor();assert.equal(await page.locator('[data-inbox-row]').count(),1);
  }finally{
   release();if(used)await done;await page.unroute('**/api/notifications',heldHandler);
   visibilityEvidence.failure=heldFailure;visibilityEvidence.observations=await page.evaluate(()=>{const evidence=window.__navigationVisibility;evidence.stop();delete window.__navigationVisibility;return evidence.observations;});
   page.off('request',onStarted);page.off('requestfailed',onFailed);page.off('requestfinished',onFinished);
   await writeFile(join(evidenceDirectory,`navigation-visibility-${engine}-${width}-report.json`),JSON.stringify(visibilityEvidence,null,2));
  }
  checks.push('Bound blur/hide/pagehide handlers and browser offline clear private rows; hidden abort is synchronous, paused commit clears with no new read, held old response cannot resurrect rows, and re-entry reads current authorized source exclusion');
  if(width===390){
   const session=await q("SELECT count(*)::integer AS count,bool_and(expires_at>clock_timestamp()+interval '1 day') AS long_lived FROM employee_sessions WHERE employee_id=$1",[actor]);assert.equal(session[0].count,1);assert.equal(session[0].long_lived,true);
   const nextInbox=()=>page.waitForResponse(response=>new URL(response.url()).pathname==='/api/notifications'&&response.request().method()==='GET');
   await q("UPDATE notifications SET expires_at=clock_timestamp()+interval '3 seconds' WHERE id=$1",[noticeId]);
   const expiring=nextInbox();await refreshNotifications();const shortResponse=await expiring,shortView=await shortResponse.json();assert.equal(shortResponse.status(),200);assert.equal(shortView.state,'ready');assert(shortView.validForMs>0&&shortView.validForMs<=3000);assert.equal(shortView.items.length,1);await ready('notifications');
   await page.getByRole('heading',{name:'Couldn’t load notifications',exact:true}).waitFor();assert.equal(await page.locator('[data-inbox-row]').count(),0);assert.equal(await page.getByRole('heading',{name:'Your session ended',exact:true}).count(),0);assert(await page.getByRole('button',{name:'Try again',exact:true}).isEnabled());await screenshot('source-expired-retry');
   const refreshed=nextInbox();await page.getByRole('button',{name:'Try again',exact:true}).click();const currentResponse=await refreshed,currentView=await currentResponse.json();assert.equal(currentResponse.status(),200);assert.equal(currentView.state,'ready');assert.deepEqual(currentView.items,[]);await page.getByText('No notifications yet.',{exact:true}).waitFor();assert.equal(await page.getByRole('heading',{name:'Your session ended',exact:true}).count(),0);
   expiryRecovery.push({sessionLongLived:session[0].long_lived,sourceLifetimeMs:shortView.validForMs,expiredRowsCleared:true,retryEnabled:true,falseSignIn:false,revalidationStatus:currentResponse.status(),currentItems:currentView.items.length});
   await q("UPDATE notifications SET expires_at=clock_timestamp()+interval '1 day' WHERE id=$1",[noticeId]);await refreshNotifications();await ready('notifications');
   const inboxBinding=headers['/api/notifications'],profileBinding=headers['/api/employee/profile'];
   assert(inboxBinding&&profileBinding&&inboxBinding!==profileBinding);
   for(const role of ['MANAGER','OWNER'])await withActorRole(q,actor,role,actualRole,async()=>{
    if(role==='MANAGER')await assignOwnedManagerCompanyAccess(app.database.executor,actor);
    const managementView=await context.request.get(app.url+'/api/notifications',{headers:{'X-Nevora-Employee-View':inboxBinding}});assert.equal(managementView.status(),200);const ownManagementItems=(await managementView.json()).items;assert.deepEqual(ownManagementItems.map(item=>item.id),[noticeId]);
    const wrongView=await context.request.get(app.url+'/api/notifications',{headers:{'X-Nevora-Employee-View':profileBinding}});assert.equal(wrongView.status(),403);
    expiryRecovery.push({role,ownBindingStatus:managementView.status(),profileBindingStatus:wrongView.status(),ownItemsOnly:true});
   });
   assert.deepEqual(await q('SELECT role FROM employees WHERE id=$1',[actor]),[{role:actualRole}]);
   for(const status of [401,403]){
    const cookies=await context.cookies();
    try{
     if(status===401)await context.clearCookies();
     const refused=await interceptedInboxResponse(page,()=>refreshNotifications(),requestHeaders=>status===403?{...requestHeaders,'x-nevora-employee-view':profileBinding}:requestHeaders);
     assert.equal(refused.status(),status);await page.getByRole('heading',{name:'Your session ended',exact:true}).waitFor();assert.equal(await page.locator('[data-inbox-row]').count(),0);assert.equal(await page.getByRole('button',{name:'Try again',exact:true}).count(),0);expiryRecovery.push({actualRefusalStatus:status,requestCorrelated:true,privateRowsCleared:true,signInRequired:true});
    }finally{if(status===401)await context.addCookies(cookies);}
    await page.evaluate(()=>window.dispatchEvent(new Event('focus')));await ready('notifications');
   }
   checks.push('Long-lived actual session plus near-expiry persisted source clears stale rows without false Sign in; Retry reauthorizes current empty state; allowed management role retains only own items; actual missing-cookie 401 and cross-view-binding 403 still clear and deny');
   const lock=new Client({connectionString:app.database.connectionString});await lock.connect();
   try{await lock.query('BEGIN');await lock.query('LOCK TABLE notifications IN ACCESS EXCLUSIVE MODE');await refreshNotifications();await page.getByRole('heading',{name:'Couldn’t load notifications',exact:true}).waitFor();assert.equal(await page.locator('[data-inbox-row]').count(),0);}
   finally{await lock.query('ROLLBACK');await lock.end();}
   await page.getByRole('button',{name:'Try again',exact:true}).click();await ready('notifications');
   await q("INSERT INTO notifications(id,employee_id,type,title,body) VALUES($1,$2,'LEGACY','PRIVATE','PRIVATE')",['legacy-'+label,actor]);await refreshNotifications();await page.getByText('Some notifications couldn’t be checked.',{exact:true}).waitFor();assert.equal(await page.locator('[data-inbox-row] > a').count(),1);
   await q('DELETE FROM notifications WHERE id=$1',['legacy-'+label]);await q("UPDATE time_off_requests SET status='DENIED' WHERE id=$1",[requestId]);await refreshNotifications();await page.getByText('No notifications yet.',{exact:true}).waitFor();
   await q("UPDATE time_off_requests SET status='APPROVED' WHERE id=$1",[requestId]);await refreshNotifications();await ready('notifications');
   checks.push('Actual PostgreSQL lock timeout renders unavailable+Retry; legacy source renders partial; authorized source exclusion renders empty; recovery reauthorizes');
  }
  stage='api';await nav('/app/profile');await ready('profile');
  if(width===390){
   const endpoint='/api/employee/profile',binding=headers[endpoint];assert(binding);const get=(path=endpoint,b=binding)=>context.request.get(app.url+path,{headers:{'X-Nevora-Employee-View':b}});
   assert.equal((await get(endpoint+'?employeeId='+scenario.actors[1])).status(),400);assert.equal((await get(endpoint,headers['/api/notifications'])).status(),403);
   const cookies=await context.cookies();await context.clearCookies();assert.equal((await get()).status(),401);await context.addCookies(cookies);
   await withActorRole(q,actor,'MANAGER',actualRole,async()=>assert.equal((await get()).status(),403));
   checks.push('Actual cookie API rejects missing session, cross-view binding, other-employee query and changed management role');
   let release,reached;const gate=new Promise(r=>release=r),seen=new Promise(r=>reached=r);let held=false;
   await context.route('**/api/employee/profile',async route=>{if(held)return route.continue();held=true;const response=await route.fetch();assert.equal(response.status(),200);reached();await gate;await route.fulfill({response});});
   await refreshProfile();await seen;await page.evaluate(()=>window.dispatchEvent(new Event('blur')));release();await page.waitForTimeout(100);assert.deepEqual(await page.locator('[data-private-view="profile"] .q-rv--l').allTextContents(),['–','–'],'Paused profile retains only static placeholders');await context.unroute('**/api/employee/profile');await page.evaluate(()=>window.dispatchEvent(new Event('focus')));await ready('profile');
   checks.push('Delayed real authenticated GET cannot repaint after blur (transport held; no fixture response content)');
   // Actual session replacement through login binds the old mounted view out.
   stage='replacement';await login(scenario.actors[1]);assert.equal((await get(endpoint,binding)).status(),403);await login(actor);await nav('/app/profile');await ready('profile');checks.push('Actual account/session replacement rejects former mounted-view binding');
  }
  if(width===390){
   // v5 (mockup E08): the request form is a sheet over Time off, with Full days / Part of a day and From / Until rows.
   stage='timeoff-form';const timeOffForm=()=>page.locator('dialog[open] form.nto-form');
   const openTimeOffForm=async()=>{await page.goto(app.url+'/app/requests?tab=new');await settle();await timeOffForm().waitFor();await timeOffForm().getByRole('button',{name:'Part of a day',exact:true}).click();await timeOffForm().getByLabel('Start time',{exact:true}).waitFor();await timeOffForm().getByRole('button',{name:'Full days',exact:true}).click();await timeOffForm().getByLabel('Until',{exact:true}).waitFor();assert.equal(await timeOffForm().getByRole('button',{name:'Full days',exact:true}).getAttribute('aria-pressed'),'true');};
   await openTimeOffForm();await timeOffForm().locator('[name="startDate"]').fill(scenario.targetDate);await timeOffForm().locator('[name="endDate"]').fill(scenario.sourceDate);const invalidId=await timeOffForm().locator('[name="requestId"]').inputValue();assert.equal(await timeOffForm().getByLabel('Until',{exact:true}).evaluate(field=>field.validity.rangeUnderflow),true);let invalidPosts=0;const observeInvalid=request=>{if(request.method()==='POST'&&new URL(request.url()).pathname==='/app/requests')invalidPosts++;};page.on('request',observeInvalid);await timeOffForm().getByRole('button',{name:'Send',exact:true}).click();await settle();page.off('request',observeInvalid);assert.equal(invalidPosts,0,'Native invalid-date constraint blocks submission');assert.equal(new URL(page.url()).searchParams.get('tab'),'new');assert.deepEqual(await q('SELECT id FROM time_off_requests WHERE id=$1',[invalidId]),[]);
   const submitTimeOff=async(replay)=>{await openTimeOffForm();await timeOffForm().locator('[name="startDate"]').fill(scenario.sourceDate);await timeOffForm().locator('[name="endDate"]').fill(scenario.sourceDate);await timeOffForm().locator('p[aria-live="polite"]').filter({hasText:/^1 full day$/}).waitFor();if(replay)await timeOffForm().locator('[name="requestId"]').evaluate((field,id)=>{field.value=id;},replay);const id=await timeOffForm().locator('[name="requestId"]').inputValue();await timeOffForm().getByRole('button',{name:'Send',exact:true}).click();await page.waitForURL(u=>u.searchParams.get('submitted')==='1');await settle();return id;};
   const created=await submitTimeOff();const pending=await q('SELECT id,employee_id,status FROM time_off_requests WHERE id=$1',[created]);assert.deepEqual(pending,[{id:created,employee_id:actor,status:'PENDING'}]);const intents=await q("SELECT id FROM notifications WHERE source_kind='TIME_OFF' AND source_id=$1 ORDER BY id",[created]);assert(intents.length>0,'Actual canonical notifications outbox exists before replay');assert.equal(await submitTimeOff(created),created);assert.deepEqual(await q('SELECT id,employee_id,status FROM time_off_requests WHERE id=$1',[created]),pending);assert.deepEqual(await q("SELECT id FROM notifications WHERE source_kind='TIME_OFF' AND source_id=$1 ORDER BY id",[created]),intents);
   stage='owner-login';await login(await seedOwnedScenarioOwner(app.database.executor,label));stage='owner-timeoff-review';await page.goto(app.url+'/app/requests?tab=pending');await settle();await page.locator('[id="request-'+created+'"]').getByRole('button',{name:/^Approve time off for /}).click();await page.waitForURL(u=>u.searchParams.get('reviewed')==='1');await waitForReviewedTimeOff(page,created);await settle();assert.equal(await page.locator('[id="request-'+created+'"]').count(),0);assert.deepEqual(await q('SELECT status FROM time_off_requests WHERE id=$1',[created]),[{status:'APPROVED'}]);stage='employee-decision';await login(actor);await page.goto(app.url+'/app/requests?filter=decided');await settle();assert(await page.locator('[id="request-'+created+'"]').innerText().then(t=>t.includes('Approved')));checks.push('Native time-off date constraint blocks invalid submissions without persistence; native submit and explicit stable-ID replay preserve one request/outbox; actual Owner approval and employee decision readback');
   // v5 (mockup E10): each day opens as a sheet (switch, From, Until); Save sits in the bar (UX-E-24: one verb, Save, for
   // the usual week and a schedule week).
   const editMonday=async(start,end)=>{await page.locator('main button.q-row--btn').filter({hasText:'Monday'}).click();const sheet=page.locator('dialog[open]');await sheet.waitFor();const on=sheet.getByLabel('Monday availability',{exact:true});if(!await on.isChecked())await on.check();await sheet.getByLabel('Monday start time',{exact:true}).fill(start);await sheet.getByLabel('Monday end time',{exact:true}).fill(end);await sheet.getByRole('button',{name:'Done',exact:true}).click();await sheet.waitFor({state:'detached'}).catch(()=>{});await page.locator('dialog[open]').waitFor({state:'hidden'});};
   await page.goto(app.url+'/app/availability');await settle();await editMonday('08:00','13:00');await page.getByRole('button',{name:'Save',exact:true}).click();await page.waitForURL(u=>u.searchParams.get('saved')==='1');await settle();assert.deepEqual(await q("SELECT left(start_time::text,5) start,left(end_time::text,5) end FROM availability_windows WHERE employee_id=$1 AND day_of_week=1",[actor]),[{start:'08:00',end:'13:00'}]);
   await q("INSERT INTO schedule_week_settings(week_start,availability_deadline,updated_by) VALUES($1,clock_timestamp()+interval '1 day','QAOWNER') ON CONFLICT(week_start) DO UPDATE SET availability_deadline=excluded.availability_deadline",[scenario.week]);await page.goto(app.url+'/app/availability?week='+scenario.week);await settle();await editMonday('09:00','14:00');await page.getByRole('button',{name:'Save',exact:true}).click();await page.waitForURL(u=>u.searchParams.get('saved')==='1');await settle();assert.deepEqual(await q("SELECT left(start_time::text,5) start,left(end_time::text,5) end FROM weekly_availability_windows WHERE employee_id=$1 AND week_start=$2 AND day_of_week=1",[actor,scenario.week]),[{start:'09:00',end:'14:00'}]);const submitted=await q('SELECT * FROM weekly_availability_windows WHERE employee_id=$1 AND week_start=$2 ORDER BY day_of_week,start_time',[actor,scenario.week]);
   await q("UPDATE schedule_week_settings SET availability_deadline=clock_timestamp()-interval '1 second' WHERE week_start=$1",[scenario.week]);await page.reload();await settle();await page.getByText(/The deadline passed\. Your submitted hours are kept\./).waitFor();await page.locator('main .q-hd p').filter({hasText:/Locked · submitted/}).waitFor();assert(await page.getByRole('button',{name:'Save',exact:true}).isDisabled());assert(await page.locator('main button.q-row--btn').filter({hasText:'Monday'}).isDisabled());assert(await page.getByLabel('Monday availability',{exact:true}).isDisabled());assert.deepEqual(await q('SELECT * FROM weekly_availability_windows WHERE employee_id=$1 AND week_start=$2 ORDER BY day_of_week,start_time',[actor,scenario.week]),submitted);checks.push('Actual normal/weekly availability save persists reviewed hours; past canonical deadline disables native controls and retains submitted records');
   await page.goto(app.url+'/app/profile');await ready('profile');
  }
  stage='keyboard';if(width<768){
   await page.goto(app.url+'/app/requests?tab=new');await settle();const field=page.locator('dialog[open] textarea').first();await field.fill('Fictional long keyboard text '.repeat(20));await field.focus();assert(await field.evaluate(e=>e===document.activeElement));await page.keyboard.press(tabKey);assert(await page.evaluate(()=>document.activeElement instanceof HTMLElement&&getComputedStyle(document.activeElement).visibility!=='hidden'));await page.keyboard.press(backTabKey);await page.goto(app.url+'/app/profile');await ready('profile');
   checks.push(`Native focus, text entry and ${tabKey}/${backTabKey} on existing request form; no submission; physical keyboard occlusion remains unverified`);
  }
  assert(await page.evaluate(()=>[...Object.values(localStorage),...Object.values(sessionStorage)].every(v=>!v.includes('STORED PRIVATE')&&!v.includes('QA E'))));
  await q("UPDATE employees SET first_name=$1,last_name=$2 WHERE id=$3",['Avery With A Very Long Fictional Display Name','Long Employee Name For Reflow Verification',actor]);await page.reload();await ready('profile');await bounds();
  // Match scripts/ui-checks/checks.mjs: text zoom scales the rem-based kit, not the whole page box.
  await page.emulateMedia({reducedMotion:'reduce'});const normalFont=await page.evaluate(()=>parseFloat(getComputedStyle(document.documentElement).fontSize));await page.evaluate(()=>{document.documentElement.style.fontSize='200%';});await page.waitForTimeout(600);assert.equal(await page.evaluate(()=>parseFloat(getComputedStyle(document.documentElement).fontSize)),normalFont*2,'200% root-font text scale is applied');await bounds();await screenshot('text-200-long-content');await page.evaluate(()=>{document.documentElement.style.fontSize='';});await restoreSheetMotion(page);
  if(width<768){
   // The kit reserves tab-bar space on the page, rather than the old outer frame.
   await page.evaluate(()=>window.scrollTo(0,document.documentElement.scrollHeight));
   const clearance=await page.locator('.q-profile-e').evaluate(e=>{const nav=document.querySelector('.mobile-nav').getBoundingClientRect(),signout=e.querySelector('.profile-signout-row').getBoundingClientRect();return {padding:parseFloat(getComputedStyle(e.closest('.page-frame')).paddingBottom)+parseFloat(getComputedStyle(e).paddingBottom),navigationHeight:nav.height,signoutBottom:signout.bottom,navigationTop:nav.top};});
   assert(clearance.navigationHeight>0);assert(clearance.padding>=clearance.navigationHeight,'Page reserves the actual fixed navigation height');assert(clearance.signoutBottom<=clearance.navigationTop,'Final Sign out control clears fixed navigation at the document end');
  }
  checks.push('long_content_safe_area_keyboard: real long identity, 200% root-font text reflow, bounds, reduced-motion and mobile bottom clearance');
  await screenshot('final');
  await writeFile(join(evidenceDirectory,prefix+'-report.json'),JSON.stringify({engine,width,status:'passed',checks,contrast,focusTrace,expiryRecovery,runtimeErrors,loginAttempts,navigationAttempts,badgeBounds,kind:'actual authenticated owned Next/PostgreSQL; synthetic lifecycle events labeled in checks'},null,2));
  return {checks};
 }catch(error){await screenshot('failure').catch(()=>{});await writeFile(join(evidenceDirectory,prefix+'-report.json'),JSON.stringify({engine,width,status:'failed',checks,contrast,focusTrace,expiryRecovery,runtimeErrors,loginAttempts,navigationAttempts,badgeBounds,error:String(error)},null,2));throw error;}
}
