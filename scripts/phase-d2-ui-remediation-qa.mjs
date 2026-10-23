import {boundCorrectionPost} from './phase-d-correction-http-fixture.mjs';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {join} from 'node:path';
import {Temporal} from '@js-temporal/polyfill';
import {hashPassword} from '../src/lib/auth/password.ts';
import {TEST_PASSWORD} from '../src/test/integration/owned-app-fixture.ts';
import {safeD2Error,safeD2Text,unexpectedD2Runtime} from './d2-runtime-failures.mjs';

// Runs only inside the existing owned PostgreSQL / exact-clean-SHA D2 gate.
export async function verifyD2UiRemediation({app,browser,engine,evidence,report,checked,context,login,geometry,widths}){
 const q=(text,values=[])=>app.database.executor.query({text,values});
 const employeeId=`UI-${engine}`,entryId=`ui-entry-${engine}`,breakId=`ui-break-${engine}`;
 const name=`UI ${engine} QA`;
 await q("INSERT INTO employees(id,first_name,last_name,phone,role,primary_location_id) VALUES($1,$2,'QA','555-0303','EMPLOYEE','loc-1')",[employeeId,`UI ${engine}`]);
 await q('INSERT INTO employee_credentials(employee_id,password_hash,must_change_password) VALUES($1,$2,false)',[employeeId,await hashPassword(TEST_PASSWORD)]);
 await q("INSERT INTO employee_location_eligibility VALUES($1,'loc-1')",[employeeId]);
 const dayStart=Temporal.Now.zonedDateTimeISO('America/Puerto_Rico').startOfDay().subtract({days:1}).toInstant();
 const [raw]=await q(`INSERT INTO time_entries(id,employee_id,location_id,device_id,clock_in_at,clock_out_at,status,version)
   VALUES($1,$2,'loc-1','d2-device',$3::timestamptz,$4::timestamptz,'CLOCKED_OUT',4)
   RETURNING clock_in_at::text AS start,clock_out_at::text AS finish,device_id,schedule_context,version`,
   [entryId,employeeId,dayStart.subtract({hours:3}).toString(),dayStart.add({hours:5}).toString()]);
 assert.notEqual(Temporal.Instant.from(raw.start).toZonedDateTimeISO('America/Puerto_Rico').toPlainDate().toString(),
   Temporal.Instant.from(raw.finish).toZonedDateTimeISO('America/Puerto_Rico').toPlainDate().toString(),'overnight fixture must cross a workspace-local date');
 const [rawBreak]=await q(`INSERT INTO break_entries(id,time_entry_id,break_start_at,break_end_at,version)
   VALUES($1,$2,$3::timestamptz+interval '4 hours',$3::timestamptz+interval '4 hours 15 minutes',2)
   RETURNING break_start_at::text AS start,break_end_at::text AS finish,break_type_id,break_type_snapshot,version`,[breakId,entryId,raw.start]);
 const employee=await context(browser),owner=await context(browser);
 await login(employee,employeeId);await login(owner,'QAOWNER');
 const ep=await employee.newPage(),mp=await owner.newPage();
 ep.setDefaultTimeout(15000);mp.setDefaultTimeout(15000);
 let phase='normal',stage='initial',requestSequence=0;
 const observations={engine,console:[],runtime:[],failedRequests:[],injectedFailures:[],keyboard:[],states:[],network:[]};
 const startedAt=performance.now(),requests=new WeakMap(),consoleDetails=[];
 const clean=safeD2Text;
 const record=value=>{observations.network.push({atMs:Math.round(performance.now()-startedAt),stage,phase,...value});if(observations.network.length>300)observations.network.shift();};
 report.remediation??=[];report.remediation.push(observations);
 for(const [role,page] of [['employee',ep],['manager',mp]]){
  page.on('console',message=>{if(message.type()==='error'){
   const entry={role,phase,stage,atMs:Math.round(performance.now()-startedAt),text:clean(message.text()),reactBoundary:message.text().includes('The above error occurred in the <'),extractionFailed:false,errors:[]};observations.console.push(entry);
   consoleDetails.push(Promise.all(message.args().map(arg=>arg.evaluate(value=>value instanceof Error?{name:value.name,message:value.message,stack:value.stack}:null).then(error=>{if(error)entry.errors.push(safeD2Error(error));},()=>{entry.extractionFailed=true;}))));
  }});
  page.on('pageerror',error=>observations.runtime.push({role,phase,stage,atMs:Math.round(performance.now()-startedAt),...safeD2Error(error)}));
  page.on('request',request=>{
   const url=new URL(request.url());if(url.origin!==app.url||!(url.pathname==='/app'||url.pathname.startsWith('/api/')||url.pathname==='/__nextjs_original-stack-frames'))return;
   const id=++requestSequence;requests.set(request,id);record({role,id,event:'request',path:clean(url.pathname),method:request.method(),rsc:request.headers().rsc==='1',serverAction:!!request.headers()['next-action'],document:request.isNavigationRequest()});
  });
  page.on('response',response=>{const id=requests.get(response.request());if(id)record({role,id,event:'response',status:response.status()});});
  page.on('requestfinished',request=>{const id=requests.get(request);if(id)record({role,id,event:'finished'});});
  page.on('requestfailed',request=>{const id=requests.get(request);if(id)record({role,id,event:'failed',reason:clean(request.failure()?.errorText)});});
  page.on('requestfailed',request=>observations.failedRequests.push({role,phase,path:clean(new URL(request.url()).pathname),method:request.method(),failure:clean(request.failure()?.errorText)}));
 }
 const headers={'X-Nevora-Time-Correction':'1',Origin:app.url};
 const add=(at,minutes)=>Temporal.Instant.from(at).add({minutes}).toString();
 const local=(at)=>Temporal.Instant.from(at).toZonedDateTimeISO('America/Puerto_Rico').toPlainDateTime().toString({smallestUnit:'minute'});
 const submit=async(kind,start,end)=>{
  const response=await boundCorrectionPost(employee.request,app.url+'/api/employee/time-corrections',{headers,data:{operationId:randomUUID(),kind,timeEntryId:entryId,...(kind==='BREAK_BOUNDARY'?{breakEntryId:breakId}:{}),proposedStartAt:start,proposedEndAt:end,reason:`Fictional ${kind} comparison.`}});
  assert.equal(response.status(),202);return (await response.json()).requestId;
 };
 const review=async(requestId,decision='APPROVE')=>{
  const response=await boundCorrectionPost(owner.request,app.url+'/api/manager/time-corrections',{headers,data:{operationId:randomUUID(),requestId,expectedRevision:1,decision,note:'Compared against fictional recorded time.'}});
  assert.equal(response.status(),200);
 };
 const shots=async(page,selector,state)=>{
  for(const width of widths){
   await page.setViewportSize({width,height:width<=430?844:1000});
   await geometry(page,selector,state,engine,width);
   const file=join(evidence,`${engine}-ui-${state}-${width}.png`);
   await page.screenshot({path:file,fullPage:true});report.screenshots.push(file);
  }
  observations.states.push(state);
 };
 const safePause=async(label,selector='.manager-corrections')=>{
  const text=await mp.locator(selector).innerText();
  assert(!text.includes('No correction requests'));assert(!text.includes('No employee time corrections are waiting for review.'));
  assert.equal(await mp.locator('.manager-corrections-count').count(),0);
  assert.equal(await mp.locator('.manager-correction-row').count(),0);
  const [count]=await q('SELECT count(*)::int AS count FROM nevora_pending_time_corrections WHERE employee_id=$1',[employeeId]);
  assert.equal(count.count,2);observations.states.push({label,pendingCount:count.count});
 };
 try{
  for(const offset of [15,30])await review(await submit('ENTRY_BOUNDARY',add(raw.start,offset),add(raw.finish,-offset)));
  for(const offset of [2,3])await review(await submit('BREAK_BOUNDARY',add(rawBreak.start,offset),add(rawBreak.finish,-offset)));
  const pendingEntry=await submit('ENTRY_BOUNDARY',add(raw.start,35),add(raw.finish,-35));
  const pendingBreak=await submit('BREAK_BOUNDARY',add(rawBreak.start,4),add(rawBreak.finish,-4));
  const [canonical]=await q('SELECT start_at::text AS start,end_at::text AS finish FROM nevora_effective_time_entries WHERE time_entry_id=$1',[entryId]);
  const [canonicalBreak]=await q('SELECT start_at::text AS start,end_at::text AS finish FROM nevora_effective_break_entries WHERE break_entry_id=$1',[breakId]);
  const response=await owner.request.get(app.url+'/api/manager/time-corrections',{headers});
  const snapshot=await response.json();assert.equal(snapshot.state,'ready');
  for(const [id,value] of [[pendingEntry,canonical],[pendingBreak,canonicalBreak]]){
   const item=snapshot.requests.find(r=>r.id===id);assert(item);
   assert.equal(item.context.state,'confirmed');assert.equal(item.context.sourceKind,'ADJUSTMENT');
   assert.equal(Temporal.Instant.compare(item.context.startAt,value.start),0);assert.equal(Temporal.Instant.compare(item.context.endAt,value.finish),0);
   assert.equal(item.context.totalDecisions,2);assert.equal(item.baseChanged,false);
   assert(item.context.decisions.every(d=>d.status==='APPROVED'));
  }
  observations.comparison={raw,rawBreak,canonical,canonicalBreak,requests:snapshot.requests.filter(r=>[pendingEntry,pendingBreak].includes(r.id))};
  stage='manager-initial';await mp.goto(app.url+'/app?view=attendance',{waitUntil:'networkidle'});
  await mp.getByRole('button',{name:`Approve correction for ${name}`,exact:true}).first().waitFor();
  assert.equal(await mp.locator('.manager-correction-row').filter({hasText:name}).getByText('Current effective',{exact:true}).count(),2);
  await shots(mp,'.manager-corrections','multiple-supersessions');
  const contrast=await mp.locator('.manager-corrections').evaluate(root=>{
   const rgb=value=>value.match(/[\d.]+/g).map(Number);
   const luminance=colour=>rgb(colour).slice(0,3).map(v=>{v/=255;return v<=0.04045?v/12.92:((v+0.055)/1.055)**2.4;}).reduce((sum,v,i)=>sum+v*[0.2126,0.7152,0.0722][i],0);
   return [...root.querySelectorAll('.correction-comparison :is(small,strong),.correction-context-zone,.correction-prior-decisions :is(p,strong,span)')].map(el=>{
    const foreground=getComputedStyle(el).color;let background='rgb(255, 255, 255)',opacity=1,foundBackground=false;
    for(let node=el;node;node=node.parentElement){const s=getComputedStyle(node);opacity*=Number(s.opacity);const c=rgb(s.backgroundColor);if(!foundBackground&&(c.length===3||c[3]===1)){background=s.backgroundColor;foundBackground=true;}}
    const a=luminance(foreground),b=luminance(background);
    return {foreground,background,opacity,ratio:(Math.max(a,b)+0.05)/(Math.min(a,b)+0.05)};
   });
  });
  assert(contrast.length>0);assert(contrast.every(pair=>pair.opacity===1&&pair.ratio>=4.5));observations.contrast=contrast;

  observations.keyboard.push({stage:'employee-before-foreground',employeeFocused:await ep.evaluate(()=>document.hasFocus()),managerFocused:await mp.evaluate(()=>document.hasFocus())});
  stage='employee-foreground';await ep.bringToFront();assert(await ep.evaluate(()=>document.hasFocus()),'Employee native keyboard page must be foreground');
  observations.keyboard.push({stage:'employee-after-foreground',employeeFocused:await ep.evaluate(()=>document.hasFocus())});
  await ep.goto(app.url+'/app/my-time',{waitUntil:'networkidle'});
  const details=ep.locator('.employee-time-entry').first();
  await details.locator('summary').focus();await details.locator('summary').press('Enter');
  const trigger=details.getByRole('button',{name:'Request a correction',exact:true});
  observations.keyboard.push({stage:'disclosure-before-settle',state:await details.evaluate(e=>({open:e.open,contentVisibility:getComputedStyle(e,'::details-content').contentVisibility,blockSize:getComputedStyle(e,'::details-content').blockSize,animations:e.getAnimations({subtree:true}).map(a=>a.playState)}))});
  await details.evaluate(async e=>{e.getBoundingClientRect();await new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)));await Promise.all(e.getAnimations({subtree:true}).filter(a=>a.effect?.getComputedTiming().iterations!==Infinity).map(a=>a.finished.catch(()=>{})));});
  observations.keyboard.push({stage:'disclosure-after-settle',state:await details.evaluate(e=>({open:e.open,contentVisibility:getComputedStyle(e,'::details-content').contentVisibility,blockSize:getComputedStyle(e,'::details-content').blockSize,animations:e.getAnimations({subtree:true}).map(a=>a.playState)}))});
  await trigger.focus();observations.keyboard.push({stage:'trigger-focus',state:await trigger.evaluate(e=>({documentFocused:document.hasFocus(),buttonFocused:document.activeElement===e,activeTag:document.activeElement?.tagName,enabled:!e.disabled}))});assert(await trigger.evaluate(e=>document.hasFocus()&&document.activeElement===e),'Correction trigger must have native foreground focus');await trigger.press('Enter');
  const form=details.locator('.employee-time-correction-form');await form.waitFor();
  await ep.waitForFunction(()=>document.querySelector('.employee-time-correction-form input[type="datetime-local"]')?.value);
  assert.equal(await form.getByLabel('Start',{exact:true}).inputValue(),local(canonical.start));
  assert.equal(await form.getByLabel('End',{exact:true}).inputValue(),local(canonical.finish));
  await shots(ep,'.employee-time-correction-form','employee-effective-defaults');
  await form.getByLabel('What needs correction?').selectOption(`break:${breakId}`);
  await ep.waitForFunction(()=>document.querySelector('.employee-time-correction-form input[type="datetime-local"]')?.value);
  assert.equal(await form.getByLabel('Start',{exact:true}).inputValue(),local(canonicalBreak.start));
  assert.equal(await form.getByLabel('End',{exact:true}).inputValue(),local(canonicalBreak.finish));
  await shots(ep,'.employee-time-correction-form','break-effective-defaults');
  // WebKit's native date control can keep DOM focus on the select after Tab.
  // Check an actual keyboard transition and direct focus separately, preserving both.
  const select=form.getByLabel('What needs correction?');await select.focus();await select.press('Tab');
  const focusDetails=()=>ep.evaluate(()=>{const el=document.activeElement,s=getComputedStyle(el);return {tag:el.tagName,type:el.getAttribute('type'),label:el.labels?.[0]?.textContent,outlineStyle:s.outlineStyle,outlineWidth:s.outlineWidth,focusVisible:el.matches(':focus-visible')};});
  let focus=await focusDetails();observations.keyboard.push({transition:'select → Tab',focus});
  if(focus.type!=='datetime-local'){await select.press('Alt+Tab');focus=await focusDetails();observations.keyboard.push({transition:'select → Alt+Tab',focus});}
  const focusShot=join(evidence,`${engine}-ui-native-date-focus.png`);await ep.screenshot({path:focusShot,fullPage:true});report.screenshots.push(focusShot);
  assert.equal(focus.type,'datetime-local',`${engine} native date input keyboard reachability`);
  // Actual visible focus is the contract; WebKit's recorded pseudo-class flag
  // remains false for its native date control despite a real Tab transition.
  assert.equal(focus.outlineStyle,'solid');assert(parseFloat(focus.outlineWidth)>=2);
  observations.keyboard.push({stage:'manager-before-foreground',employeeFocused:await ep.evaluate(()=>document.hasFocus()),managerFocused:await mp.evaluate(()=>document.hasFocus())});
  stage='manager-return';await mp.bringToFront();assert(await mp.evaluate(()=>document.hasFocus()),'Manager native keyboard page must be foreground');
  observations.keyboard.push({stage:'manager-return',state:await mp.evaluate(()=>({visibility:document.visibilityState,focused:document.hasFocus(),routeState:document.querySelector('.portal-route-state h2')?.textContent??null,correctionRows:document.querySelectorAll('.manager-correction-row').length}))});
  await mp.goto(app.url+'/app?view=attendance',{waitUntil:'networkidle'});
  const approve=mp.getByRole('button',{name:`Approve correction for ${name}`,exact:true}).first();await approve.waitFor();await approve.focus();
  const managerFocus=await approve.evaluate(el=>({active:document.activeElement===el,outlineStyle:getComputedStyle(el).outlineStyle,outlineWidth:getComputedStyle(el).outlineWidth}));
  assert(managerFocus.active);assert.equal(managerFocus.outlineStyle,'solid');assert(parseFloat(managerFocus.outlineWidth)>=2);observations.keyboard.push({role:'manager',focus:managerFocus});

  // Cleared states use real lifecycle events and preserve the authoritative count.
  stage='offline';phase='offline';await owner.setOffline(true);await mp.getByRole('heading',{name:'View paused',exact:true}).waitFor();await safePause('offline','.portal-route-state');await shots(mp,'.portal-route-state','offline');
  await owner.setOffline(false);await mp.getByRole('button',{name:`Approve correction for ${name}`,exact:true}).first().waitFor();phase='normal';checked(`${engine}: offline → online protected refresh`);
  stage='pagehide-pageshow';await mp.evaluate(()=>window.dispatchEvent(new Event('pagehide')));await mp.getByRole('heading',{name:'View paused',exact:true}).waitFor();await safePause('pagehide','.portal-route-state');
  await mp.evaluate(()=>window.dispatchEvent(new Event('pageshow')));await mp.getByRole('button',{name:`Approve correction for ${name}`,exact:true}).first().waitFor();
  stage='hidden-visible';await mp.evaluate(()=>{Object.defineProperty(document,'visibilityState',{configurable:true,value:'hidden'});document.dispatchEvent(new Event('visibilitychange'));});
  await mp.getByRole('heading',{name:'View paused',exact:true}).waitFor();await safePause('hidden','.portal-route-state');
  await mp.evaluate(()=>{Object.defineProperty(document,'visibilityState',{configurable:true,value:'visible'});document.dispatchEvent(new Event('visibilitychange'));});
  await mp.getByRole('button',{name:`Approve correction for ${name}`,exact:true}).first().waitFor();

  stage='delayed-read';let release;const delayed=new Promise(resolve=>{release=resolve;});
  const delayRoute=async route=>{if(route.request().method()==='GET')await delayed;await route.continue();};
  await mp.route('**/api/manager/time-corrections',delayRoute);
  await mp.evaluate(()=>{window.dispatchEvent(new Event('blur'));window.dispatchEvent(new Event('focus'));});
  await mp.getByText('Loading correction requests',{exact:true}).waitFor();await shots(mp,'.manager-corrections','loading');release();
  await mp.getByRole('button',{name:`Approve correction for ${name}`,exact:true}).first().waitFor();await mp.unroute('**/api/manager/time-corrections',delayRoute);
  const unavailable=route=>route.fulfill({status:503,contentType:'application/json',body:JSON.stringify({state:'unavailable',reason:'read_failed'})});
  stage='injected-503';phase='injected-503';await mp.route('**/api/manager/time-corrections',unavailable);observations.injectedFailures.push('503 protected correction read');
  await mp.evaluate(()=>{window.dispatchEvent(new Event('blur'));window.dispatchEvent(new Event('focus'));});await mp.getByText('Correction requests unavailable',{exact:true}).waitFor();await safePause('read failure');await shots(mp,'.manager-corrections','unavailable');
  await mp.unroute('**/api/manager/time-corrections',unavailable);await mp.evaluate(()=>{window.dispatchEvent(new Event('blur'));window.dispatchEvent(new Event('focus'));});
  await mp.getByRole('button',{name:`Approve correction for ${name}`,exact:true}).first().waitFor();
  phase='normal';
  stage='malformed-context';const malformed=route=>route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({...snapshot,requests:snapshot.requests.map(r=>({...r,context:{state:'confirmed',sourceKind:'ADJUSTMENT',startAt:'invalid'}}))})});
  await mp.route('**/api/manager/time-corrections',malformed);observations.injectedFailures.push('Malformed protected effective context');
  await mp.evaluate(()=>{window.dispatchEvent(new Event('blur'));window.dispatchEvent(new Event('focus'));});await mp.getByText('Correction requests unavailable',{exact:true}).waitFor();await safePause('malformed context');
  await mp.unroute('**/api/manager/time-corrections',malformed);await mp.evaluate(()=>{window.dispatchEvent(new Event('blur'));window.dispatchEvent(new Event('focus'));});
  await mp.getByRole('button',{name:`Approve correction for ${name}`,exact:true}).first().waitFor();
  stage='stale-source';await q('UPDATE time_entries SET version=version+1 WHERE id=$1',[entryId]);
  await mp.evaluate(()=>{window.dispatchEvent(new Event('blur'));window.dispatchEvent(new Event('focus'));});
  await mp.getByText('The source or approved baseline changed since this request. The proposed time is not the current effective time.',{exact:true}).first().waitFor();
  await shots(mp,'.manager-corrections','stale');
  // Declines do not consume stale-source approval authority; keyboard Enter is real.
  for(let i=0;i<2;i++){
   const decline=mp.getByRole('button',{name:`Decline correction for ${name}`,exact:true}).first();await decline.focus();await decline.press('Enter');
   await mp.getByText('Correction declined. The original recorded punch remains unchanged.',{exact:true}).waitFor();
   await mp.waitForFunction(n=>document.querySelectorAll('.manager-correction-row').length===n,1-i);
  }
  await mp.getByText('No correction requests',{exact:true}).waitFor();await shots(mp,'.manager-corrections','confirmed-empty');
  assert.equal((await q('SELECT count(*)::int AS count FROM nevora_pending_time_corrections WHERE employee_id=$1',[employeeId]))[0].count,0);
  observations.keyboard.push({decisions:'two declines activated with Enter'});
  stage='completed-history';await ep.reload({waitUntil:'networkidle'});await ep.getByText('Declined',{exact:true}).first().waitFor();await shots(ep,'.employee-correction-center','completed-history');
  // Restore only this disposable version mutation to compare untouched raw evidence.
  await q('UPDATE time_entries SET version=version-1 WHERE id=$1',[entryId]);
  assert.deepEqual((await q('SELECT clock_in_at::text AS start,clock_out_at::text AS finish,device_id,schedule_context,version FROM time_entries WHERE id=$1',[entryId]))[0],raw);
  assert.deepEqual((await q('SELECT break_start_at::text AS start,break_end_at::text AS finish,break_type_id,break_type_snapshot,version FROM break_entries WHERE id=$1',[breakId]))[0],rawBreak);
  assert.equal((await q('SELECT count(*)::int AS count FROM time_correction_adjustments WHERE employee_id=$1',[employeeId]))[0].count,4);
  const unrelated=await owner.request.get(app.url+'/api/employee/time-corrections',{headers});assert.equal(unrelated.status(),403);
  stage='authority-denied';phase='authority-denied';await q("UPDATE employees SET role='LEAD' WHERE id='QAOWNER'");
  await mp.evaluate(()=>{window.dispatchEvent(new Event('blur'));window.dispatchEvent(new Event('focus'));});await mp.locator('.manager-corrections').waitFor({state:'detached'});assert.equal(await mp.locator('.manager-correction-row').count(),0);
  assert.equal((await owner.request.get(app.url+'/api/manager/time-corrections',{headers})).status(),403);
  await q("UPDATE employees SET role='OWNER' WHERE id='QAOWNER'");
  // Record all native errors. Only explicitly injected transport failures may be classified.
  await Promise.all(consoleDetails);
  const unexpected=unexpectedD2Runtime(observations);
  observations.unexpectedRuntime=unexpected.runtime;observations.unexpectedConsole=unexpected.console;
  assert.deepEqual(observations.unexpectedRuntime,[]);
  assert.deepEqual(observations.unexpectedConsole,[],'React-handled JavaScript exceptions remain fatal');
  checked(`${engine}: 006 canonical comparisons/defaults/history, 008 lifecycle states and privacy`);
 }catch(error){
  observations.failureState=await mp.evaluate(()=>({visibility:document.visibilityState,focused:document.hasFocus(),routeState:document.querySelector('.portal-route-state h2')?.textContent??null,correctionRows:document.querySelectorAll('.manager-correction-row').length,correctionStatus:document.querySelector('.manager-corrections-empty')?.textContent??null})).catch(()=>null);
  await mp.screenshot({path:join(evidence,`${engine}-ui-manager-failure.png`),fullPage:true}).catch(()=>{});throw error;
 }finally{await employee.close();await owner.close();}
}
