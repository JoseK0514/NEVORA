import assert from 'node:assert/strict';
import {join} from 'node:path';
import {writeFile} from 'node:fs/promises';
import {Client} from 'pg';
import {randomUUID,createHash} from 'node:crypto';
import {hashPassword} from '../src/lib/auth/password.ts';
import {seedOwnedScenario,TEST_PASSWORD} from '../src/test/integration/owned-app-fixture.ts';
import {publishScheduleWithRevision} from '../src/test/integration/management-api.ts';

// Actual authenticated persisted Task11 Home journeys with canonical communication sources.
export async function runScenario({app,browser,context,page,engine,width,evidenceDirectory,axeFile}){
 const label=`H${engine==='chromium'?'C':'W'}${width}`,index=[320,375,390,430,768,1024,1440].indexOf(width)+(engine==='webkit'?7:0);
 const scenario=await seedOwnedScenario(app.database.executor,label,index+14),actor=scenario.actors[0],q=(text,values=[])=>app.database.executor.query({text,values});
 const checks=[],runtimeErrors=[],screenshots=[],details={stage:'Task11 developer verification',engine,width,actor,checks,screenshots,runtimeErrors};let stage='seed',binding,homeResponse,managerContext,manager;
 page.on('pageerror',error=>runtimeErrors.push({stage,name:error.name,message:error.message.replace(/https?:[^\s]+/g,'[URL]')}));
 page.on('request',request=>{if(new URL(request.url()).pathname==='/api/employee/home')binding=request.headers()['x-nevora-home'];});
 const shot=async name=>{const path=join(evidenceDirectory,`home-task11-${engine}-${width}-${name}.png`);await page.screenshot({path,fullPage:true});screenshots.push(path);};
 const next=()=>page.locator('[aria-labelledby="employee-reviewed-next-heading"]');
 const assignments=()=>next().getByRole('link',{name:'View schedule',exact:false});
 const items=()=>page.locator('[data-home-group] li');
 const recorded=()=>page.locator('aside[aria-label="Own recorded time"]');
 const ready=async()=>{await page.locator('[data-home-state="partial"],[data-home-state="ready"]').waitFor();await page.waitForLoadState('networkidle');};
 const refresh=async()=>{const response=page.waitForResponse(r=>new URL(r.url()).pathname==='/api/employee/home');await page.locator('[data-home-refresh]').click();await (await response).finished();await page.getByRole('button',{name:/^(Refresh home|Retry home)$/}).waitFor();await ready();};
 async function login(target=page,id=actor){await target.goto(app.url+'/login');await target.getByLabel('Employee ID',{exact:true}).fill(id);await target.getByLabel('Password',{exact:true}).fill(TEST_PASSWORD);await Promise.all([target.waitForURL(u=>u.pathname==='/app'),target.getByRole('button',{name:'Sign In',exact:true}).click()]);}
 function gate(path){let release,started,used=false;const wait=new Promise(r=>{release=r;}),seen=new Promise(r=>{started=r;});const handler=async route=>{if(used)return route.continue();used=true;const response=await route.fetch();if(path.includes('/home'))homeResponse=await response.json();started();await wait;await route.fulfill({response}).catch(()=>{});};return {handler,seen,release:()=>release(),path};}
 try {
 await q("UPDATE locations SET short_name='Main Office Operations and Customer Support' WHERE id='loc-1'");
 await q("INSERT INTO time_off_requests(id,employee_id,start_date,end_date,status,reason) SELECT $1||'-leave-'||n,$2,'2030-11-01'::date+(n-1)*2,'2030-11-02'::date+(n-1)*2,'APPROVED','PRIVATE HOME SENTINEL' FROM generate_series(1,7)n",[label,actor]);
 const [clock]=await q("SELECT date_trunc('week',(clock_timestamp()-interval '1 hour') AT TIME ZONE 'America/Puerto_Rico')::date::text AS week,((clock_timestamp()-interval '1 hour') AT TIME ZONE 'America/Puerto_Rico')::date::text AS day,to_char((clock_timestamp()-interval '1 hour') AT TIME ZONE 'America/Puerto_Rico','HH24:MI') AS start,to_char((clock_timestamp()+interval '1 hour') AT TIME ZONE 'America/Puerto_Rico','HH24:MI') AS finish");
 await q("INSERT INTO schedules(id,location_id,week_start,status,created_by) VALUES($1,'loc-1',$2,'DRAFT','QAOWNER') ON CONFLICT(location_id,week_start) DO NOTHING",['home-current-'+clock.week,clock.week]);
 const [schedule]=await q("SELECT id FROM schedules WHERE location_id='loc-1' AND week_start=$1",[clock.week]);
 await q("INSERT INTO shifts(id,schedule_id,employee_id,date,start_time,end_time) VALUES($1,$2,$3,$4,$5,$6)",[label+'-ongoing',schedule.id,actor,clock.day,clock.start,clock.finish]);
 await publishScheduleWithRevision({locationId:'loc-1',weekStart:clock.week,managerId:'QAOWNER'},app.database.executor);
 await q("INSERT INTO clocker_devices(id,location_id,name) VALUES($1,'loc-1','Fictional Home device')",[label+'-device']);
 await q("INSERT INTO time_entries(id,employee_id,location_id,device_id,clock_in_at,status) VALUES($1,$2,'loc-1',$3,clock_timestamp()-interval '20 minutes','CLOCKED_IN')",[label+'-time',actor,label+'-device']);
 stage='loading';const loading=gate('**/api/employee/home');await page.route(loading.path,loading.handler);await login();await loading.seen;
 assert(await page.getByText('Loading Home…',{exact:true}).isVisible());assert.equal(await assignments().count(),0);assert.equal(await items().count(),0);assert(!(await recorded().isVisible()),'a first load shows only the Next shift placeholder; recorded time appears with the snapshot');assert.equal(await recorded().locator('time').count(),0);await shot('loading');loading.release();await ready();await page.unroute(loading.path,loading.handler);
 await page.getByText('Clocked in',{exact:true}).waitFor();
 assert.equal(homeResponse.state,'partial');assert.equal(homeResponse.allSet,false);assert.equal(homeResponse.snapshot.sources.communications.state,'complete');assert.equal(homeResponse.snapshot.nextShift.shiftId,scenario.sourceId);assert.equal(homeResponse.snapshot.currentShift.shiftId,label+'-ongoing');
 assert.equal(await page.getByRole('heading',{level:1}).count(),1);
 assert(Object.values(homeResponse.snapshot.sources).every(source=>source.state==='complete'||(source.state==='partial'&&source.reason==='unpublished')),'this fixture is partial only because a known location has not published');
 assert(await next().getByText('West Office hasn’t published this week yet. Shifts shown are published.',{exact:true}).isVisible());
 assert.equal(await page.getByText('Some Home sections could not be fully checked. Counts show known items. Refresh Home below to check again.',{exact:true}).count(),0);assert.equal(await page.getByText("You’re all set.",{exact:true}).count(),0);
 assert(!(await page.locator('.employee-home').innerText()).includes('PRIVATE HOME SENTINEL'));assert(await next().getByText('Scheduled now',{exact:true}).isVisible());
 const hierarchy=await page.locator('[aria-labelledby="employee-reviewed-next-heading"],[data-home-group="actions"]').evaluateAll(es=>({tops:es.map(e=>e.getBoundingClientRect().top),nextBeforeActions:es.length===2&&!!(es[0].compareDocumentPosition(es[1])&Node.DOCUMENT_POSITION_FOLLOWING)}));assert.equal(hierarchy.tops.length,2);assert(hierarchy.nextBeforeActions);assert(hierarchy.tops[0]<=hierarchy.tops[1]);details.homeHierarchy=hierarchy;
 assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));await shot('ready');
 checks.push('H01 actual loading contains no private row/success; Scheduled now leads and the persisted future Next shift follows, with actual recorded Clocked In coexisting; six-source canonical communications complete and private notes absent');
 // Native disclosures are independent. Complete row membership/order comes only
 // from the actual canonical response; opening a summary grants no authority.
 details.homeDisclosures=[];
 for(const kind of ['actions','updates']){
  const group=page.locator(`[data-home-group="${kind}"]`),rows=homeResponse.snapshot.attention.filter(item=>kind==='actions'?item.required||item.actionable:!item.required&&!item.actionable),overflow=group.locator('details');
  assert(await group.isVisible());assert.equal(await group.locator('li').count(),rows.length);
  assert.equal(await overflow.count(),rows.length>3?1:0);
  assert.equal(await group.locator('li a').evaluateAll(es=>es.map(e=>e.getAttribute('href'))).then(values=>JSON.stringify(values)),JSON.stringify(rows.map(item=>item.href)));
  const disclosure={kind,rows:rows.length,hasOverflow:rows.length>3,keyboardObserved:false};
  if(rows.length>3){
   const summary=overflow.locator('summary'),peer=page.locator(`[data-home-group="${kind==='actions'?'updates':'actions'}"] details`),peerOpen=await peer.count()?await peer.evaluate(e=>e.open):null;
   assert.equal(await overflow.evaluate(e=>e.open),false);await summary.focus();await page.keyboard.press('Enter');assert.equal(await overflow.evaluate(e=>e.open),true);assert(await summary.evaluate(e=>e.matches(':focus-visible')));
   for(const link of await group.locator('li a').all())assert(await link.isVisible());
   await page.keyboard.press('Space');assert.equal(await overflow.evaluate(e=>e.open),false);await page.keyboard.press('Enter');assert.equal(await overflow.evaluate(e=>e.open),true);
   if(peerOpen!==null)assert.equal(await peer.evaluate(e=>e.open),peerOpen);
   disclosure.keyboardObserved=true;
  }
  details.homeDisclosures.push(disclosure);
 }
 assert.equal(await items().count(),homeResponse.snapshot.attention.length);assert.equal(await page.getByRole('button',{name:'Mark read',exact:true}).count(),0);assert.equal(await page.getByRole('button',{name:'Confirm schedule',exact:true}).count(),0);for(const item of homeResponse.snapshot.attention.filter(item=>item.ref.kind==='SCHEDULE'))assert(await page.locator(`[data-home-group] time[datetime="${item.ref.id}"]`).isVisible());assert.equal(await page.locator('[data-home-group] small').filter({hasText:'Recorded '}).count(),homeResponse.snapshot.attention.filter(item=>item.ref.kind!=='SCHEDULE').length);const leave=homeResponse.snapshot.attention.filter(item=>item.ref.kind==='TIME_OFF');assert.equal(new Set(leave.map(item=>item.label)).size,7);for(const item of leave)assert(await page.getByText(item.label,{exact:true}).isVisible());await shot('show-all');
 checks.push('H02 actual separate Actions/Updates membership and available native keyboard disclosures expose every returned item; weekly reviews show their own week and distinct time-off periods remain distinguishable; Home has canonical review links and no compact consent or Mark read');
 stage='canonical-communications';
 managerContext=await browser.newContext({viewport:{width,height:900}});await managerContext.route('**/*',route=>new URL(route.request().url()).origin===new URL(app.url).origin?route.continue():route.abort());manager=await managerContext.newPage();await login(manager,'QAOWNER');
 const [ownerSession]=await q('SELECT token_hash FROM employee_sessions WHERE employee_id=$1 ORDER BY created_at DESC LIMIT 1',['QAOWNER']);
 const owner={employee:{id:'QAOWNER'},sessionTokenHash:ownerSession.token_hash};
 const [session]=await q('SELECT token_hash FROM employee_sessions WHERE employee_id=$1 ORDER BY created_at DESC LIMIT 1',[actor]);
 const self={employee:{id:actor,firstName:'Fictional',lastName:'Self',role:'LEAD',primaryLocationId:'loc-1'},sessionTokenHash:session.token_hash};
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
 const row=()=>items().filter({has:page.locator('a[href="/app/updates/'+required.result.id+'"]')});
 assert(await row().getByText('Review needed',{exact:true}).isVisible());assert.equal(await page.getByText("You’re all set.",{exact:true}).count(),0);assert(!(await page.locator('.employee-home').innerText()).includes('PRIVATE COMPLETE CONTENT'));
 assert.equal(await page.getByRole('button',{name:'Mark read',exact:true}).count(),0);
 assert.equal((await recordCommunicationRead(self,{kind:'MARK_READ',operationId:randomUUID(),authority:communicationAuthority(self),ref:{kind:'COMMUNICATION',id:required.result.id,version:required.result.version}},app.database.executor)).status,'blocked');
 await refresh();assert(await row().getByText('Review needed',{exact:true}).isVisible());await shot('required-push-off');
 // The Task11 fixture uses the authenticated full-content API before a receipt;
 // Task10 owns the actual detail-screen acknowledgement journey.
 const detail=await readCommunication(self,required.result.id,app.database.executor);assert.equal(detail.state,'ready');assert.equal(detail.body,required.draft.body);
 assert.equal((await executeCommunicationCommand(self,{kind:'ACKNOWLEDGE',operationId:randomUUID(),authority:detail.authority,communicationId:detail.id,expectedRevisionId:detail.revisionId,contentHash:detail.contentHash},app.database.executor)).status,'committed');await refresh();assert.equal(await row().count(),0);
 const revisedDraft={...required.draft,body:'PRIVATE REVISED CONTENT '+label},preview=await previewCommunicationAudience(owner,revisedDraft,app.database.executor);assert.equal(preview.state,'ready');
 const revised=await executeCommunicationCommand(owner,{kind:'REVISE',operationId:randomUUID(),authority:preview.authority,communicationId:required.result.id,expectedRevisionId:required.result.version,draft:revisedDraft,audienceFingerprint:preview.fingerprint},app.database.executor);assert.equal(revised.status,'committed');await refresh();assert(await row().getByText('Review needed',{exact:true}).isVisible());await shot('new-revision');
 assert.equal((await executeCommunicationCommand(owner,{kind:'WITHDRAW',operationId:randomUUID(),authority:communicationAuthority(owner),communicationId:required.result.id,expectedRevisionId:revised.version},app.database.executor)).status,'committed');await refresh();assert.equal(await row().count(),0);
 const optional=await publishUpdate('OPTIONAL');await refresh();assert.equal(await page.locator('a[href="/app/updates/'+optional.result.id+'"]').count(),1);
 const optionalDetail=await readCommunication(self,optional.result.id,app.database.executor);assert.equal(optionalDetail.state,'ready');assert.equal((await recordCommunicationRead(self,{kind:'MARK_READ',operationId:randomUUID(),authority:optionalDetail.authority,ref:{kind:'COMMUNICATION',id:optional.result.id,version:optional.result.version}},app.database.executor)).status,'committed');await refresh();assert.equal(await page.locator('a[href="/app/updates/'+optional.result.id+'"]').count(),0);
 checks.push('H14 authenticated Home follows actual canonical required receipt, push-off/Mark read denial, revision reset, withdrawal and optional version read; private body is absent and full review stays on Updates');
 // ACTIONS_OVERFLOW_BROWSER_EXTENSION_BEGIN
 // Four actual REQUIRED publications make Actions overflow mandatory. The
 // canonical refreshed Home response supplies all membership and ordering.
 stage='actions-overflow';
 const overflowEvidence=details.actionsOverflow={fixturePublicationCount:4,phase:'baseline',publications:[],withdrawals:[],keyboard:[]};
 const overflowPublished=[];
 const overflowRefresh=async()=>{const observed=page.waitForResponse(r=>new URL(r.url()).pathname==='/api/employee/home');await refresh();const response=await observed;assert.equal(response.status(),200);const result=await response.json();assert(['ready','partial'].includes(result.state));assert.equal(result.snapshot.sources.communications.state,'complete');return result;};
 const overflowRows=(result,kind)=>result.snapshot.attention.filter(item=>kind==='actions'?item.required||item.actionable:!item.required&&!item.actionable);
 const overflowGroup=kind=>page.locator(`[data-home-group="${kind}"]`);
 const overflowOpen=async kind=>{const disclosure=overflowGroup(kind).locator('details');return await disclosure.count()?await disclosure.evaluate(e=>e.open):null;};
 const overflowToggle=async(kind,key)=>{const summary=overflowGroup(kind).locator('details summary');await summary.focus();await page.keyboard.press(key);const observation={kind,key,actionsOpen:await overflowOpen('actions'),updatesOpen:await overflowOpen('updates'),focus:await summary.evaluate(e=>({active:e===document.activeElement,visible:e.matches(':focus-visible'),outlineStyle:getComputedStyle(e).outlineStyle,outlineWidth:getComputedStyle(e).outlineWidth}))};overflowEvidence.keyboard.push(observation);assert(observation.focus.active);assert(observation.focus.visible);assert.notEqual(observation.focus.outlineStyle,'none');assert(parseFloat(observation.focus.outlineWidth)>=2);return observation;};
 const overflowBaseline=await overflowRefresh();
 const overflowBaselineOpen={actions:await overflowOpen('actions'),updates:await overflowOpen('updates')};
 overflowEvidence.baseline={state:overflowBaseline.state,allSet:overflowBaseline.allSet,hrefs:{actions:overflowRows(overflowBaseline,'actions').map(item=>item.href),updates:overflowRows(overflowBaseline,'updates').map(item=>item.href)},open:overflowBaselineOpen};
 let overflowCause=null;
 try{
  overflowEvidence.phase='publish';
  for(let i=0;i<4;i++){const published=await publishUpdate('REQUIRED');overflowPublished.push(published);overflowEvidence.publications.push({id:published.result.id,version:published.result.version,status:published.result.status});}
  assert.equal(new Set(overflowPublished.map(published=>published.result.id)).size,4);
  overflowEvidence.phase='refreshed-membership';const actual=await overflowRefresh();
  const actionRows=overflowRows(actual,'actions'),updateRows=overflowRows(actual,'updates');
  overflowEvidence.refreshed={state:actual.state,allSet:actual.allSet,communicationsState:actual.snapshot.sources.communications.state,attentionCount:actual.snapshot.attention.length,hrefs:{actions:actionRows.map(item=>item.href),updates:updateRows.map(item=>item.href)}};
  assert.equal(actual.allSet,false);assert(actionRows.length>3);assert(updateRows.length>3);
  assert.equal(actionRows.length,overflowEvidence.baseline.hrefs.actions.length+4);
  assert.deepEqual(updateRows.map(item=>item.href),overflowEvidence.baseline.hrefs.updates);
  assert.deepEqual(actionRows.filter(item=>!overflowPublished.some(published=>item.ref.kind==='COMMUNICATION'&&item.ref.id===published.result.id)).map(item=>item.href),overflowEvidence.baseline.hrefs.actions);
  for(const published of overflowPublished){const canonical=actionRows.filter(item=>item.ref.kind==='COMMUNICATION'&&item.ref.id===published.result.id);assert.equal(canonical.length,1);assert.equal(canonical[0].required,true);assert.equal(canonical[0].ref.version,published.result.version);assert.equal(canonical[0].href,'/app/updates/'+published.result.id);assert.equal(updateRows.filter(item=>item.ref.kind==='COMMUNICATION'&&item.ref.id===published.result.id).length,0);}
  for(const kind of ['actions','updates']){const group=overflowGroup(kind),canonical=overflowRows(actual,kind);assert.equal(await group.locator('details').count(),1);assert.equal(await group.locator('li').count(),canonical.length);assert.deepEqual(await group.locator('li a').evaluateAll(es=>es.map(e=>e.getAttribute('href'))),canonical.map(item=>item.href));}
  assert.equal(await items().count(),actual.snapshot.attention.length);assert.equal(await page.getByRole('button',{name:'Mark read',exact:true}).count(),0);assert.equal(await page.getByRole('button',{name:'Confirm schedule',exact:true}).count(),0);assert.equal(await page.getByText("You’re all set.",{exact:true}).count(),0);assert(!(await page.locator('.employee-home').innerText()).includes('PRIVATE COMPLETE CONTENT'));
  overflowEvidence.phase='native-keyboard';
  // Exercise Actions with the peer Updates closed, then open, without setting
  // details.open or replacing the actual controller/response.
  if(await overflowOpen('updates'))await overflowToggle('updates','Space');
  if(await overflowOpen('actions'))await overflowToggle('actions','Space');
  assert.equal(await overflowOpen('actions'),false);assert.equal(await overflowOpen('updates'),false);
  let observation=await overflowToggle('actions','Enter');assert.equal(observation.actionsOpen,true);assert.equal(observation.updatesOpen,false);
  for(const link of await overflowGroup('actions').locator('li a').all())assert(await link.isVisible());
  observation=await overflowToggle('actions','Space');assert.equal(observation.actionsOpen,false);assert.equal(observation.updatesOpen,false);
  for(const link of await overflowGroup('actions').locator('details li a').all())assert.equal(await link.isVisible(),false);
  observation=await overflowToggle('actions','Enter');assert.equal(observation.actionsOpen,true);assert.equal(observation.updatesOpen,false);
  observation=await overflowToggle('updates','Enter');assert.equal(observation.updatesOpen,true);assert.equal(observation.actionsOpen,true);
  for(const link of await overflowGroup('updates').locator('li a').all())assert(await link.isVisible());
  observation=await overflowToggle('actions','Space');assert.equal(observation.actionsOpen,false);assert.equal(observation.updatesOpen,true);
  observation=await overflowToggle('actions','Enter');assert.equal(observation.actionsOpen,true);assert.equal(observation.updatesOpen,true);
  for(const link of await overflowGroup('actions').locator('li a').all())assert(await link.isVisible());
  await shot('actions-overflow');
 }catch(error){overflowCause=error;throw error;}finally{
  overflowEvidence.phase='withdraw-extra-publications';
  // Try every created publication even on a failed assertion. Never mask the
  // original browser failure with a later cleanup failure.
  for(const published of overflowPublished){try{const withdrawn=await executeCommunicationCommand(owner,{kind:'WITHDRAW',operationId:randomUUID(),authority:communicationAuthority(owner),communicationId:published.result.id,expectedRevisionId:published.result.version},app.database.executor);overflowEvidence.withdrawals.push({id:published.result.id,version:published.result.version,status:withdrawn.status});}catch(error){overflowEvidence.withdrawals.push({id:published.result.id,version:published.result.version,status:'error',name:error.name,code:error.code??null});}}
  const failed=overflowEvidence.withdrawals.filter(result=>result.status!=='committed');overflowEvidence.withdrawalComplete=failed.length===0&&overflowEvidence.withdrawals.length===overflowPublished.length;
  if(!overflowCause)assert.equal(overflowEvidence.withdrawalComplete,true,'Every extra REQUIRED publication must be withdrawn before later journeys');
 }
 overflowEvidence.phase='restored-home';const restored=await overflowRefresh();
 overflowEvidence.restored={state:restored.state,allSet:restored.allSet,hrefs:{actions:overflowRows(restored,'actions').map(item=>item.href),updates:overflowRows(restored,'updates').map(item=>item.href)}};
 assert.deepEqual(overflowEvidence.restored.hrefs,overflowEvidence.baseline.hrefs);assert.equal(restored.state,overflowBaseline.state);assert.equal(restored.allSet,overflowBaseline.allSet);
 for(const published of overflowPublished)assert.equal(await page.locator('a[href="/app/updates/'+published.result.id+'"]').count(),0);
 assert.equal(await items().count(),restored.snapshot.attention.length);
 for(const kind of ['actions','updates']){const target=overflowBaselineOpen[kind],current=await overflowOpen(kind);if(target!==null){assert.notEqual(current,null);if(current!==target)await overflowToggle(kind,'Space');assert.equal(await overflowOpen(kind),target);}else assert.equal(current,null);}
 overflowEvidence.phase='complete';
 // ACTIONS_OVERFLOW_BROWSER_EXTENSION_END
 stage='keyboard';await page.locator('h1').click();const link=next().getByRole('link',{name:'View schedule',exact:false}).first(),tab=process.platform==='darwin'&&engine==='webkit'?'Alt+Tab':'Tab';let reached=false;
 for(let i=0;i<55;i++){await page.keyboard.press(tab);if(await link.evaluate(e=>e===document.activeElement)){reached=true;break;}}
 assert(reached);assert(await link.evaluate(e=>e.matches(':focus-visible')));const rect=await link.boundingBox();assert(rect&&rect.height>=44&&rect.width>=44);
 const measureContrast=()=>link.evaluate(e=>{const rgb=s=>s.match(/[\d.]+/g).slice(0,3).map(Number);const lum=c=>c.map(v=>{v/=255;return v<=.04045?v/12.92:((v+.055)/1.055)**2.4;}).reduce((v,n,i)=>v+n*[.2126,.7152,.0722][i],0);let bg=e;while(bg&&getComputedStyle(bg).backgroundColor==='rgba(0, 0, 0, 0)')bg=bg.parentElement;return (Math.max(lum(rgb(getComputedStyle(e).color)),lum(rgb(getComputedStyle(bg).backgroundColor)))+.05)/(Math.min(lum(rgb(getComputedStyle(e).color)),lum(rgb(getComputedStyle(bg).backgroundColor)))+.05);});details.linkContrast={focus:await measureContrast()};await link.evaluate(e=>e.blur());await page.mouse.move(0,0);details.linkContrast.normal=await measureContrast();await link.hover();details.linkContrast.hover=await measureContrast();await page.mouse.down();details.linkContrast.pressed=await measureContrast();await page.mouse.move(0,0);await page.mouse.up();for(const value of Object.values(details.linkContrast))assert(value>=4.5);await link.focus();
 const myTime=recorded().getByRole('link',{name:'My time',exact:false});await page.locator('h1').click();let clockFocus=false;
 for(let i=0;i<55;i++){await page.keyboard.press(tab);if(await myTime.evaluate(e=>e===document.activeElement)){clockFocus=true;break;}}
 assert(clockFocus);assert(await myTime.evaluate(e=>e.matches(':focus-visible')));details.clockRecoveryFocus=await myTime.evaluate(e=>({outlineStyle:getComputedStyle(e).outlineStyle,outlineWidth:getComputedStyle(e).outlineWidth}));assert.notEqual(details.clockRecoveryFocus.outlineStyle,'none');assert(parseFloat(details.clockRecoveryFocus.outlineWidth)>=2);await link.focus();
 await page.emulateMedia({reducedMotion:'reduce'});await page.evaluate(()=>{document.documentElement.style.fontSize='200%';});assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));await page.evaluate(()=>{document.documentElement.style.fontSize='';});await shot('focus');
 checks.push('H03 native keyboard reaches visible focus; actual 44px review link, measured normal/hover/pressed/focus contrast, 200% text/reflow and reduced-motion state');
 stage='api';const api=await page.evaluate(async binding=>{const response=await fetch('/api/employee/home',{cache:'no-store',headers:{'X-Nevora-Home':binding}});return {status:response.status,cache:response.headers.get('cache-control'),vary:response.headers.get('vary'),body:await response.json()};},binding);
 assert.equal(api.status,200);assert.equal(api.cache,'no-store, private');assert(api.vary.split(',').map(value=>value.trim().toLowerCase()).includes('cookie'));assert(!JSON.stringify(api.body).match(/PRIVATE HOME SENTINEL|sessionTokenHash|managerNotes/));
 const rejected=await page.evaluate(async()=>{const r=await fetch('/api/employee/home?employeeId=other',{headers:{'X-Nevora-Home':'invalid'}});return r.status;});assert.equal(rejected,400);checks.push('H04 actual authenticated Home API is private/no-store; client identity selectors refused; no source-note/raw-proof disclosure');
 stage='offline';await context.setOffline(true);await page.evaluate(()=>window.dispatchEvent(new Event('offline')));await page.locator('[data-home-state="paused"]').waitFor();assert.equal(await assignments().count(),0);assert.equal(await page.getByText('Clocked in',{exact:true}).count(),0);assert.equal(await items().count(),0);assert.equal(await recorded().locator('time').count(),0);assert(await recorded().getByRole('link',{name:'My time',exact:false}).isVisible());assert(await recorded().getByRole('button',{name:'Refresh recorded time',exact:true}).isDisabled());await shot('offline');await context.setOffline(false);await page.evaluate(()=>window.dispatchEvent(new Event('online')));await ready();await page.getByText('Clocked in',{exact:true}).waitFor();checks.push('H05 actual network offline clears assignment and clock rows; online re-entry performs fresh authorized reads');
 stage='late-home';const late=gate('**/api/employee/home');await page.route(late.path,late.handler);await page.locator('[data-home-refresh]').click();await late.seen;
 await q("UPDATE locations SET short_name=$1 WHERE id='loc-1'",['Fresh '+label+' Main Office']);await page.evaluate(()=>window.dispatchEvent(new Event('storage')));await ready();late.release();await page.unroute(late.path,late.handler);await page.waitForLoadState('networkidle');assert((await next().innerText()).includes('Fresh '+label));assert(!(await next().innerText()).includes('Main Office Operations and Customer Support'));checks.push('H06 actual old Home response held while source and generation change cannot repopulate prior private rows');
 stage='late-time';const time=gate('**/api/employee/my-time');await page.route(time.path,time.handler);await page.getByRole('button',{name:'Refresh recorded time',exact:true}).click();await time.seen;
 await q("UPDATE time_entries SET clock_out_at=clock_timestamp(),status='CLOCKED_OUT' WHERE id=$1",[label+'-time']);await page.evaluate(()=>window.dispatchEvent(new Event('pagehide')));assert.equal(await page.getByText('Clocked in',{exact:true}).count(),0);time.release();await page.unroute(time.path,time.handler);await page.evaluate(()=>window.dispatchEvent(new Event('pageshow')));await ready();await page.getByText('Off clock',{exact:true}).waitFor();checks.push('H07 held actual MyTime response after pagehide/unmount cannot restore old Clocked In; fresh re-entry reflects persisted clock-out');
 stage='route-leave';const leaving=gate('**/api/employee/home');await page.route(leaving.path,leaving.handler);await page.locator('[data-home-refresh]').click();await leaving.seen;await page.goto(app.url+'/app/requests/hub');leaving.release();await page.unroute(leaving.path,leaving.handler);await page.waitForLoadState('networkidle');assert.equal(await page.locator('[aria-labelledby="employee-reviewed-next-heading"] a[href^="/app/schedule"]').count(),0);await page.goto(app.url+'/app');await ready();checks.push('H08 hard route leave during actual Home read unmounts private Home; re-entry reads current sources');
 if(width===390){stage='sql-source-failure';const blocker=new Client({connectionString:app.database.connectionString});await blocker.connect();try{await blocker.query('BEGIN');await blocker.query('LOCK TABLE time_off_requests IN ACCESS EXCLUSIVE MODE');await refresh();await page.getByText('Time off unavailable',{exact:true}).waitFor();assert(await page.getByText('Some Home sections could not be fully checked. Counts show known items. Refresh Home below to check again.',{exact:true}).isVisible());assert.equal(await assignments().count(),2);await shot('unavailable');await blocker.query('COMMIT');await refresh();assert.equal(await page.getByText('Time off unavailable',{exact:true}).count(),0);checks.push('H09 actual time-off lock timeout retains independently authorized assignments, discloses unavailable and Retry restores current source');}finally{await blocker.query('ROLLBACK');await blocker.end();}}
 stage='replaced-session';const other=await context.newPage();await login(other,scenario.actors[1]);await other.waitForLoadState('networkidle');await other.close();await page.evaluate(()=>window.dispatchEvent(new Event('storage')));await page.locator('[data-home-state="unauthorized"]').waitFor();assert.equal(await assignments().count(),0);assert.equal(await items().count(),0);assert.equal(await recorded().locator('time').count(),0);assert(await recorded().getByRole('link',{name:'Sign in',exact:true}).isVisible());assert(await recorded().getByRole('link',{name:'My time',exact:false}).isVisible());assert.equal(await recorded().getByRole('button',{name:'Refresh recorded time',exact:true}).count(),0);await shot('session-replaced');checks.push('H10 actual same-browser account cookie replacement refuses former lifetime binding and clears every Home private row');
 await login();await ready();stage='early-my-time-route';const early=gate('**/api/employee/my-time');await page.route(early.path,early.handler);await page.getByRole('button',{name:'Refresh recorded time',exact:true}).click();await early.seen;await page.goto(app.url+'/app/schedule?week='+scenario.week);early.release();await page.unroute(early.path,early.handler);await page.waitForLoadState('networkidle');await page.goto(app.url+'/app');await ready();checks.push('H11 actual MyTime read interrupted by early hard route navigation produces no stale Home rows or page runtime error');
 stage='removal-review';
 await page.goto(app.url+'/app/schedule?week='+scenario.week);
 await page.getByRole('button',{name:'Confirm schedule',exact:true}).click();
 await page.getByText('Schedule confirmed',{exact:true}).waitFor();
 const [ack]=await q('SELECT publication_revision_id FROM schedule_acknowledgements WHERE employee_id=$1 AND week_start=$2',[actor,scenario.week]);
 const [published]=await q('SELECT id FROM schedule_publication_revisions WHERE week_start=$1 ORDER BY revision_number DESC LIMIT 1',[scenario.week]);
 assert.equal(ack.publication_revision_id,published.id);
 await page.goto(app.url+'/app');await ready();
 stage='empty';await q('DELETE FROM shifts WHERE employee_id=$1',[actor]);await refresh();await page.getByText('No upcoming published shift',{exact:true}).waitFor();assert.equal(await page.getByText('Scheduled now',{exact:true}).count(),0);assert.equal(await page.getByText("You’re all set.",{exact:true}).count(),0);await shot('empty');checks.push('H12 actual no-future-assignment state uses precise empty copy and incomplete publication/other attention prevents all-clear');
 stage='last-shift-removal';
 await publishScheduleWithRevision({locationId:'loc-1',weekStart:scenario.week,managerId:'QAOWNER'},app.database.executor);
 await refresh();
 await page.getByText('Schedule reviews unavailable — a changed schedule needs review',{exact:true}).waitFor();
 assert(await page.getByRole('link',{name:'Open schedule reviews',exact:true}).isVisible());
 assert(await page.getByText('Time off approved · Nov 1, 2030 – Nov 2, 2030',{exact:true}).isVisible());
 assert.equal(await page.getByRole('button',{name:'Confirm schedule',exact:true}).count(),0);
 assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
 await shot('last-shift-removal');
 checks.push('H13 actual canonical confirmation then last own shift removal and republish discloses unavailable weekly review, preserves independent time-off rows and canonical recovery without compact consent');
 stage='complete-zero';const clearActor='QA-'+label+'-CLEAR';
 await q("INSERT INTO employees(id,first_name,last_name,phone,role,primary_location_id) VALUES($1,'Fictional','Clear','555-0197','EMPLOYEE','loc-1')",[clearActor]);
 await q('INSERT INTO employee_credentials(employee_id,password_hash,must_change_password) VALUES($1,$2,false)',[clearActor,await hashPassword(TEST_PASSWORD)]);
 await login(page,clearActor);await ready();await page.getByText("You’re all set.",{exact:true}).waitFor();assert.equal(await page.locator('[data-home-state="ready"]').count(),1);assert.equal(await items().count(),0);await shot('all-set');
 const clearApi=await page.evaluate(async binding=>{const r=await fetch('/api/employee/home',{cache:'no-store',headers:{'X-Nevora-Home':binding}});return r.json();},binding);assert.equal(clearApi.allSet,true);assert.equal(clearApi.snapshot.publicationState,'complete');for(const source of Object.values(clearApi.snapshot.sources))assert.equal(source.state,'complete');
 checks.push('H15 actual new eligible account has no historical communication grants; all six canonical sources/publication complete and zero items yield exact all-set copy');
 if(width===390){stage='communication-source-failure';const blocker=new Client({connectionString:app.database.connectionString});await blocker.connect();try{await blocker.query('BEGIN');await blocker.query('LOCK TABLE communications IN ACCESS EXCLUSIVE MODE');await refresh();await page.getByText('Communications unavailable',{exact:true}).waitFor();assert.equal(await page.getByText("You’re all set.",{exact:true}).count(),0);await shot('communications-unavailable');await blocker.query('COMMIT');await refresh();await page.getByText("You’re all set.",{exact:true}).waitFor();checks.push('H16 actual communication SQL lock failure suppresses all-clear and Retry restores current complete zero source');}finally{await blocker.query('ROLLBACK');await blocker.end();}}
 stage='axe-diagnostic';await page.addScriptTag({path:axeFile});details.axe=await page.evaluate(async()=>{const result=await window.axe.run(document,{runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21a','wcag21aa']}});return result.violations.map(v=>({id:v.id,nodes:v.nodes.map(n=>({target:n.target.map(t=>String(t).replace(/\[[^\]]*\]/g,'[attribute]')),contrast:n.any.filter(a=>a.id==='color-contrast').map(a=>({ratio:a.data?.contrastRatio,foreground:a.data?.fgColor,background:a.data?.bgColor}))}))}));});assert.deepEqual(details.axe,[]);
 details.runtimeErrors=runtimeErrors;assert.deepEqual(runtimeErrors,[]);details.html=await page.locator('.employee-home').innerHTML();await writeFile(join(evidenceDirectory,`home-task11-${engine}-${width}-checks.json`),JSON.stringify(details,null,2));return {checks};
 }catch(error){details.failedStage=stage;details.failure={name:error.name,code:error.code??null,message:'Browser step failed; see named stage and source location',location:error.stack?.split('\n').find(line=>line.includes('phase-e-home-browser-scenarios.mjs'))};await shot('failure').catch(()=>{});await writeFile(join(evidenceDirectory,`home-task11-${engine}-${width}-failure.json`),JSON.stringify(details,null,2));throw error;}finally{await managerContext?.close();}
}
