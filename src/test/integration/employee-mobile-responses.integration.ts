import {it,expect} from 'vitest';
import {createRequire} from 'node:module';
import {mkdir,writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {randomUUID} from 'node:crypto';
import {createOwnedNextApp} from './owned-next-app';
import {seedOwnedApp,seedOwnedScenario,TEST_PASSWORD} from './owned-app-fixture';
import {fixtureProof,reviewedFixtureSource} from './shift-change-api';
import {publishScheduleWithRevision} from './management-api';
import {executeShiftChange} from '../../lib/data/shift-changes';
import {readEmployeeExchange} from '../../lib/data/employee-exchange.server';
import {addDays} from '../../lib/date-utils';
import {measureRenderedContrast} from '../../../scripts/browser-contrast.mjs';
import type {ShiftChangeCommand} from '../../lib/shift-changes/types';
type CommandInput<T=ShiftChangeCommand>=T extends ShiftChangeCommand?Omit<T,'operationId'>:never;

it('integrates Employee swap/cover responses and own detail with current permissions, recorded terms and original operations',async()=>{
 const evidence=process.env.NEVORA_EMPLOYEE_RESPONSES_EVIDENCE;
 if(!evidence)throw Error('Choose explicit external NEVORA_EMPLOYEE_RESPONSES_EVIDENCE');
 await mkdir(evidence,{recursive:true});
 const runtime=createRequire(process.env.NEVORA_PLAYWRIGHT_RUNTIME_PACKAGE??resolve('tools/ci-browser-runtime/package.json'))('playwright');
 const app=await createOwnedNextApp(evidence),checks:{engine:string;name:string}[]=[],captures:string[]=[],contrasts:{engine:string;theme:string;width:number;control:string;ratio:number}[]=[],messages:{engine:string;stage:string;type:string;text:string;expected:boolean}[]=[];
 const failedRequests:{engine:string;stage:string;url:string;error:string|null;expected:boolean}[]=[];
 const q=<T=Record<string,unknown>>(text:string,values:unknown[]=[])=>app.database.executor.query<T>({text,values});
 const command=async(actor:string,input:CommandInput)=>executeShiftChange(await fixtureProof(app.database.executor,actor),{...input,operationId:randomUUID()} as ShiftChangeCommand,app.database.executor);
 const source=(id:string)=>reviewedFixtureSource(app.database.executor,id);
 let browser:{close():Promise<void>}|undefined,failure:(()=>Promise<void>)|undefined;
 try{
  await seedOwnedApp(app.database.executor);
  for(const [index,engine]of ['chromium','webkit','firefox'].entries()){
   const record=(name:string)=>checks.push({engine,name});
   const f=await seedOwnedScenario(app.database.executor,'RSP'+index,index),[actor,requester,peer]=f.actors;
   await q("UPDATE employees SET role='EMPLOYEE',first_name='Alex',last_name='Rivera' WHERE id=$1",[actor]);
   await q("UPDATE employees SET first_name='Blair',last_name='Cruz' WHERE id=$1",[requester]);
   await q("UPDATE shifts SET is_designated_lead=false WHERE id IN ($1,$2)",[f.sourceId,f.targetId]);
   await q("UPDATE shifts SET start_time='22:00',end_time='06:00' WHERE id=$1",[f.targetId]);
   const coverShift='rsp-own-cover-'+index,reportShift='rsp-own-report-'+index,pickupShift='rsp-peer-cover-'+index,secretShift='rsp-peer-report-'+index;
   for(const [id,who,day,location,start,end]of [[coverShift,actor,5,0,'08:00','12:00'],[reportShift,actor,6,0,'08:00','12:00'],[pickupShift,peer,4,1,'08:00','12:00'],[secretShift,peer,4,1,'16:00','20:00']] as const){
    await q("INSERT INTO shifts(id,schedule_id,employee_id,date,start_time,end_time,position_id) VALUES($1,$2,$3,$4,$5,$6,'qa-pos')",[id,'qa-RSP'+index+'-schedule-'+location,who,addDays(f.week,day),start,end]);
   }
   for(const locationId of ['loc-1','loc-2'])await publishScheduleWithRevision({locationId,weekStart:f.week,managerId:'QAOWNER'},app.database.executor);
   if(index===0){
    await q("SELECT nevora_set_workspace_presentation($1,'workspace-fuel','QAOWNER',0,$2,repeat('a',64))",[randomUUID(),JSON.stringify({version:1,brand:{},modules:{disabled:['marketplace']}})]);
    const off=await readEmployeeExchange(await fixtureProof(app.database.executor,actor),app.database.executor);
    expect(off.state).toBe('ready');if(off.state==='ready'){expect(off.enabled).toBe(false);expect(off.incoming).toEqual([]);expect(off.activity).toEqual([]);}
    await q("SELECT nevora_set_workspace_presentation($1,'workspace-fuel','QAOWNER',1,$2,repeat('b',64))",[randomUUID(),JSON.stringify({version:1,brand:{},modules:{disabled:[]}})]);
    record('Persisted marketplace-off read releases no response or request facts');
   }
   const manual=engine==='firefox';
   await q("UPDATE workspaces SET shift_change_policy=jsonb_set(shift_change_policy,'{swap,mode}',$1::jsonb)",[JSON.stringify(manual?'MANAGER_REVIEW':'AUTOMATIC_WHEN_VALID')]);
   const target=await source(f.sourceId),offered=await source(f.targetId);
   const proposed=await command(requester,{kind:'PROPOSE_SWAP',...offered,targetShiftId:target.sourceShiftId,targetEpisodeId:target.sourceEpisodeId,targetTermsFingerprint:target.sourceTermsFingerprint} as CommandInput);
   expect(proposed.status).toBe('pending');if(proposed.status!=='pending')throw Error('Swap precondition');
   const requestId=proposed.requestId;
   const ownCover=await command(actor,{kind:'OFFER_COVERAGE',...await source(coverShift)});
   const peerCover=await command(peer,{kind:'OFFER_COVERAGE',...await source(pickupShift)});
   const ownReport=await command(actor,{kind:'SUBMIT_CALLOUT',...await source(reportShift),reasonCode:'ILLNESS',reasonNote:'MY_OWN_NOTE'});
   const peerReport=await command(peer,{kind:'SUBMIT_CALLOUT',...await source(secretShift),reasonCode:'FAMILY_EMERGENCY',reasonNote:'PEER_SECRET_ABSENCE'});
   for(const result of [ownCover,peerCover,ownReport,peerReport])expect(result.status).toBe('pending');
   if(ownCover.status!=='pending'||peerCover.status!=='pending'||ownReport.status!=='pending'||peerReport.status!=='pending')throw Error('Request precondition');
   const proof=await fixtureProof(app.database.executor,actor),projection=await readEmployeeExchange(proof,app.database.executor,requestId);
   expect(projection.state).toBe('ready');if(projection.state==='ready'){
    expect(projection.detail?.summary.viewer).toBe('recipient');expect(projection.detail?.checks.find(check=>check.kind==='ACCEPT')).toMatchObject({allowed:true,outcome:manual?'pending':'completed'});
    expect(JSON.stringify(projection)).not.toMatch(/employeeId|participants|source_terms|operational_rule_profile|PEER_SECRET/);
   }
   const foreign=await readEmployeeExchange(proof,app.database.executor,peerReport.requestId);expect(foreign.state).toBe('ready');if(foreign.state==='ready')expect(foreign.detail).toBeNull();
   const lead=await readEmployeeExchange(await fixtureProof(app.database.executor,requester),app.database.executor,requestId);
   expect(lead.state).toBe('ready');if(lead.state==='ready'){expect(lead.detail?.summary.viewer).toBe('requester');expect(lead.detail?.checks.find(check=>check.kind==='CANCEL')?.allowed).toBe(true);expect(lead.detail?.checks.some(check=>check.kind==='ACCEPT')).toBe(false);}
   await q("UPDATE employees SET role='MANAGER' WHERE id=$1",[actor]);expect(await readEmployeeExchange(proof,app.database.executor,requestId)).toEqual({state:'unavailable',reason:'access_denied'});
   await q("UPDATE employees SET role='EMPLOYEE' WHERE id=$1",[actor]);record('Real SQL: target-only swap detail, safe original terms, peer absence refusal and exact current-role guard');
   const activeBrowser=await runtime[engine].launch({headless:true});browser=activeBrowser;
   const context=await activeBrowser.newContext({viewport:{width:390,height:844},reducedMotion:'reduce',serviceWorkers:'block'}),page=await context.newPage();
   page.setDefaultTimeout(15000);page.setDefaultNavigationTimeout(30000);
   let expected=false,stage='login',binding='';
   page.on('request',(request:{url():string;headers():Record<string,string>})=>{if(new URL(request.url()).pathname.startsWith('/api/employee/exchange'))binding=request.headers()['x-nevora-employee-view']??binding;});
   page.on('console',(message:{type():string;text():string})=>{if(['error','warning'].includes(message.type()))messages.push({engine,stage,type:message.type(),text:message.text(),expected});});
   page.on('pageerror',(error:Error)=>messages.push({engine,stage,type:'pageerror',text:error.stack??error.message,expected:false}));
   page.on('requestfailed',(request:{url():string;failure():{errorText:string}|null})=>failedRequests.push({engine,stage,url:request.url(),error:request.failure()?.errorText??null,expected}));
   failure=async()=>{await page.screenshot({path:evidence+'/'+engine+'-failure.png',fullPage:true,caret:'initial'});await writeFile(evidence+'/'+engine+'-failure.html',await page.locator('body').innerHTML());};
   await context.route('**/*',async(route:{request():{url():string};abort():Promise<void>;continue():Promise<void>})=>{const url=new URL(route.request().url());if(['http:','https:'].includes(url.protocol)&&url.origin!==new URL(app.url).origin){await route.abort();return;}await route.continue();});
   const ready=()=>page.locator('.em-exchange:visible[data-exchange-state="ready"]').waitFor();
   const settled=async()=>{await page.locator('.em-response-actions:visible[aria-busy="false"]').waitFor();await page.getByRole('button',{name:'Check response status',exact:true}).waitFor({state:'hidden'});await page.locator('.em-exchange:visible .em-request-footer button:not(:disabled)').waitFor();expect(await page.locator('.em-exchange:visible').innerText()).not.toMatch(/Outcome uncertain|Checking the original response|Refreshing…/);};
   const url=(tab:string,id?:string)=>app.url+'/app/exchange?tab='+tab+(id?'&requestId='+encodeURIComponent(id):'');
   const load=async(tab:string,id?:string)=>{await page.goto(url(tab,id));await ready();};
   // Keep capture tooling from mutating input styles while streamed desktop children hydrate.
   const shot=async(name:string)=>{const file=engine+'-'+name+'.png';await page.screenshot({path:evidence+'/'+file,fullPage:true,caret:'initial',style:'nextjs-portal {visibility:hidden;}'});captures.push(file);const viewport=engine+'-'+name+'-viewport.png';await page.screenshot({path:evidence+'/'+viewport,fullPage:false,caret:'initial',style:'nextjs-portal {visibility:hidden;}'});captures.push(viewport);};
   await page.goto(app.url+'/login');await page.getByLabel('Employee ID',{exact:true}).fill(actor);await page.getByLabel('Password',{exact:true}).fill(TEST_PASSWORD);await page.getByRole('button',{name:'Sign in',exact:true}).click();await page.waitForURL(app.url+'/app');
   await page.locator('[data-home-state="ready"]:visible,[data-home-state="partial"]:visible').waitFor();await page.locator('.employee-time-badge:visible').waitFor();
   stage='incoming';await load('foryou');expect(await page.getByRole('link',{name:/Swap with Blair C/}).count()).toBe(1);await shot('incoming');
   await page.getByRole('link',{name:/Swap with Blair C/}).click();await page.waitForURL(url('foryou',requestId));await ready();
   expect(await page.getByRole('heading',{name:'Your current shift',exact:true}).count()).toBe(1);expect(await page.getByRole('heading',{name:'You would work',exact:true}).count()).toBe(1);
   expect(await page.locator('.em-response-comparison:visible').innerText()).toContain('Ends');expect(await page.locator('.em-exchange:visible').innerText()).not.toMatch(/Location loc-|Position qa-|MANAGER_REVIEW|PEER_SECRET/);
   const selector=await page.request.get(app.url+'/api/employee/exchange?employeeId='+peer,{headers:{'X-Nevora-Employee-View':binding}});expect(selector.status()).toBe(400);
   const refused=await page.request.get(app.url+'/api/employee/exchange/'+peerReport.requestId,{headers:{'X-Nevora-Employee-View':binding}});expect(refused.status()).toBe(200);const foreignBody=await refused.json();expect(foreignBody.detail).toBeNull();expect(JSON.stringify(foreignBody)).not.toContain('PEER_SECRET');
   record('Actual Employee HTTP refuses arbitrary selectors and foreign report detail; incoming comparison preserves overnight and privacy');
   for(const theme of ['light','dark'])for(const width of [320,390,430]){
    await page.setViewportSize({width,height:844});await page.evaluate((theme:string)=>document.documentElement.setAttribute('data-theme',theme),theme);
    expect(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth)).toBe(true);
    expect(await page.locator('.page-frame').evaluate((el:HTMLElement)=>getComputedStyle(el).backgroundColor===getComputedStyle(el.querySelector('.em-exchange')!).backgroundColor)).toBe(true);
    expect(await page.locator('.mobile-nav').evaluate((el:HTMLElement)=>getComputedStyle(el).backgroundColor===getComputedStyle(document.querySelector('.em-response-comparison')!).backgroundColor)).toBe(true);
    for(const name of ['Accept swap','Decline swap']){
     const button=page.getByRole('button',{name,exact:true});await button.waitFor();
     expect(await button.evaluate((el:HTMLElement)=>el.getBoundingClientRect().height)).toBeGreaterThanOrEqual(48);
     const measured=await button.evaluate(measureRenderedContrast);expect(measured.ratio).toBeGreaterThanOrEqual(4.5);contrasts.push({engine,theme,width,control:name,ratio:measured.ratio});
    }
    await shot('detail-'+theme+'-'+width);
   }
   await page.setViewportSize({width:320,height:844});await page.evaluate(()=>{document.documentElement.style.fontSize='200%';document.documentElement.dataset.textStep='200';});
   expect(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth)).toBe(true);
   await page.getByRole('button',{name:'Refresh',exact:true}).scrollIntoViewIfNeeded();
   expect(await page.getByRole('button',{name:'Refresh',exact:true}).evaluate((el:HTMLElement)=>el.getBoundingClientRect().bottom<=document.querySelector('.mobile-nav')!.getBoundingClientRect().top+1)).toBe(true);
   await shot('detail-text-200');
   await page.evaluate(()=>{document.documentElement.style.fontSize='100%';delete document.documentElement.dataset.textStep;document.documentElement.setAttribute('data-theme','light');});await page.setViewportSize({width:390,height:844});
   await page.getByRole('link',{name:'Swaps for you',exact:true}).first().focus();
   let focused=false;for(let i=0;i<20;i++){await page.keyboard.press(engine==='webkit'?'Alt+Tab':'Tab');focused=await page.getByRole('button',{name:'Accept swap',exact:true}).evaluate((el:HTMLElement)=>el===document.activeElement&&el.matches(':focus-visible')&&parseFloat(getComputedStyle(el).outlineWidth)>=3);if(focused)break;}expect(focused).toBe(true);
   await shot('real-tab-focus');record('Light/dark320390430, response-control contrast,200%text, measured nav clearance and native keyboard focus (WebKit Option-Tab)');
   await page.getByRole('link',{name:'Swaps for you',exact:true}).first().click();await page.waitForURL(url('foryou')+'#exchange-request-'+requestId);await ready();
   await page.waitForFunction((id:string)=>document.activeElement?.id==='exchange-request-'+id,requestId);
   record('Back returns focus to the exact incoming request row');
   await page.getByRole('link',{name:/Swap with Blair C/}).click();await page.waitForURL(url('foryou',requestId));await ready();
   let dropped=false;
   await page.route('**/app/exchange*',async(route:{request():{method():string;headers():Record<string,string>};fetch(options:{timeout:number}):Promise<unknown>;abort():Promise<void>;continue():Promise<void>})=>{if(!dropped&&route.request().method()==='POST'&&route.request().headers()['next-action']){dropped=true;await route.fetch({timeout:10000});await route.abort();return;}await route.continue();});
   stage='lost-response';expected=true;await page.getByRole('button',{name:'Accept swap',exact:true}).click();await page.getByRole('button',{name:'Check response status',exact:true}).waitFor();expect(dropped).toBe(true);
   await context.setOffline(true);await page.locator('.em-exchange:visible[data-exchange-state="paused"]').waitFor();expect(await page.locator('.em-exchange:visible').innerText()).not.toContain('Blair');
   await context.setOffline(false);await ready();await page.getByRole('button',{name:'Check response status',exact:true}).click();
   await page.locator('.em-response-status:visible strong').filter({hasText:manual?'Waiting for manager review':'Completed'}).waitFor();
   const assignments=await q<{id:string;employee_id:string}>('SELECT id,employee_id FROM shifts WHERE id IN($1,$2) ORDER BY id',[f.sourceId,f.targetId]);
   expect(assignments.find(row=>row.id===f.targetId)?.employee_id).toBe(manual?requester:actor);expect(assignments.find(row=>row.id===f.sourceId)?.employee_id).toBe(manual?actor:requester);
   expect((await q<{count:number}>('SELECT count(*)::integer AS count FROM shift_change_operations WHERE actor_employee_id=$1 AND request_id=$2',[actor,requestId]))[0].count).toBe(1);
   await settled();await shot('accepted-canonical');record(manual?'Manual acceptance reconciles original response and preserves assignments pending review':'Automatic acceptance reconciles original response and exchanges exact published assignments');
   expected=false;await page.unroute('**/app/exchange*');
   if(manual){
    stage='manual-swap-withdrawal';expect(await page.locator('.em-response-actions:visible').innerText()).toContain('Withdrawing closes this swap request. Both employees keep their currently assigned shifts.');
    await page.getByRole('button',{name:'Withdraw response',exact:true}).click();await page.locator('.em-response-status:visible strong').filter({hasText:'Cancelled'}).waitFor();await settled();
    expect((await q('SELECT status FROM shift_exchanges WHERE id=$1',[requestId]))[0].status).toBe('CANCELLED');expect((await q('SELECT employee_id FROM shifts WHERE id=$1',[f.sourceId]))[0].employee_id).toBe(actor);expect((await q('SELECT employee_id FROM shifts WHERE id=$1',[f.targetId]))[0].employee_id).toBe(requester);
    await shot('manual-swap-withdrawn');record('Withdrawing a pending manual swap closes that swap, explains both assignments and settles on canonical Cancelled without moving either employee');
   }
   stage='own-cover';await load('requests',ownCover.requestId);await page.getByRole('button',{name:'Cancel request',exact:true}).click();await page.locator('.em-response-status:visible strong').filter({hasText:'Cancelled'}).waitFor();expect((await q('SELECT status FROM shift_exchanges WHERE id=$1',[ownCover.requestId]))[0].status).toBe('CANCELLED');await settled();await shot('own-cover-cancelled');
   await page.getByRole('link',{name:'My shift requests',exact:true}).first().click();await page.waitForURL(url('requests')+'#exchange-request-'+ownCover.requestId);await ready();await page.waitForFunction((id:string)=>document.activeElement?.id==='exchange-request-'+id,ownCover.requestId);
   stage='own-report';await load('requests',ownReport.requestId);expect(await page.locator('.em-exchange:visible').innerText()).toContain('MY_OWN_NOTE');await page.getByRole('button',{name:'Cancel report',exact:true}).click();await page.locator('.em-response-status:visible strong').filter({hasText:'Cancelled'}).waitFor();expect((await q('SELECT status FROM shift_callouts WHERE id=$1',[ownReport.requestId]))[0].status).toBe('CANCELLED');
   record('Own cover and own pending report cancellation use canonical decisions; list return focuses exact own row and no peer reason appears');
   await q("UPDATE workspaces SET shift_change_policy=jsonb_set(shift_change_policy,'{coverage,mode}','\"MANAGER_REVIEW\"')");
   expect((await command(actor,{kind:'ACCEPT',requestId:peerCover.requestId,expectedRevision:1} as CommandInput)).status).toBe('pending');
   stage='own-pickup';await load('requests',peerCover.requestId);expect(await page.locator('.em-response-actions:visible').innerText()).toContain('Withdrawing closes this pickup request.');await page.getByRole('button',{name:'Withdraw response',exact:true}).click();
   await page.getByText('Your response was withdrawn. Check your current schedule.',{exact:true}).waitFor();
   await page.locator('.em-response-status:visible strong').filter({hasText:'Cancelled'}).waitFor();await settled();
   const withdrawn=(await q('SELECT status,target_employee_id FROM shift_exchanges WHERE id=$1',[peerCover.requestId]))[0];expect(withdrawn.status).toBe('CANCELLED');expect(withdrawn.target_employee_id).toBe(actor);expect((await q('SELECT employee_id FROM shifts WHERE id=$1',[pickupShift]))[0].employee_id).toBe(peer);await shot('pickup-withdrawn');record('Withdrawing own pending pickup closes that request, retains own history membership and preserves the original assignment');
   await command(peer,{kind:'CANCEL_CALLOUT',requestId:peerReport.requestId,expectedRevision:1} as CommandInput);
   const declineSource=await source(secretShift),declineTarget=await source(reportShift);
   const decline=await command(peer,{kind:'PROPOSE_SWAP',...declineSource,targetShiftId:declineTarget.sourceShiftId,targetEpisodeId:declineTarget.sourceEpisodeId,targetTermsFingerprint:declineTarget.sourceTermsFingerprint} as CommandInput);
   expect(decline.status).toBe('pending');if(decline.status!=='pending')throw Error('Decline precondition');
   await load('foryou',decline.requestId);await page.getByRole('button',{name:'Decline swap',exact:true}).click();await page.locator('.em-response-status:visible strong').filter({hasText:'Declined'}).waitFor();expect((await q('SELECT status FROM shift_exchanges WHERE id=$1',[decline.requestId]))[0].status).toBe('DENIED');
   expect((await q('SELECT employee_id FROM shifts WHERE id=$1',[secretShift]))[0].employee_id).toBe(peer);record('Declining an addressed swap preserves original assignments and records the own decision');
   if(index===0){
    const stale=await command(peer,{kind:'PROPOSE_SWAP',...await source(secretShift),targetShiftId:declineTarget.sourceShiftId,targetEpisodeId:declineTarget.sourceEpisodeId,targetTermsFingerprint:declineTarget.sourceTermsFingerprint} as CommandInput);
    expect(stale.status).toBe('pending');if(stale.status!=='pending')throw Error('Stale precondition');
    await q("UPDATE shifts SET start_time='17:00' WHERE id=$1",[secretShift]);await publishScheduleWithRevision({locationId:'loc-2',weekStart:f.week,managerId:'QAOWNER'},app.database.executor);
    await load('foryou',stale.requestId);await page.locator('.em-response-status:visible strong').filter({hasText:'Needs your answer'}).waitFor();
    expect(await page.locator('.em-exchange:visible').innerText()).toContain('The reviewed shift changed or the request needs review.');
    expect(await page.getByRole('button',{name:'Accept swap',exact:true}).count()).toBe(0);
    expect(await page.getByRole('button',{name:'Decline swap',exact:true}).isEnabled()).toBe(true);
    expect((await page.locator('.em-response-comparison:visible').innerText()).replace(/\s+/g,' ')).toContain('4:00 PM');
    expect((await command(actor,{kind:'ACCEPT',requestId:stale.requestId,expectedRevision:1} as CommandInput)).status).toBe('blocked');
    await shot('reviewed-terms-changed');record('A changed publication withholds acceptance, preserves permitted decline and retains reviewed terms; the server also rejects stale acceptance');
   }
   if(index===0){
    // Older historical fixture rows exercise the incumbent recent window; their statuses are setup data, not tested cancellation receipts.
    await q("INSERT INTO shift_exchanges(id,kind,source_shift_id,requested_by_employee_id,status,legacy_manual,source_terms,created_at) SELECT 'rsp-older-window-'||n,'COVERAGE',$1,$2,'CANCELLED',false,source_terms,clock_timestamp()+n*interval '1 second' FROM shift_exchanges CROSS JOIN generate_series(1,21)n WHERE id=$3",[coverShift,actor,ownCover.requestId]);
    const recent=await readEmployeeExchange(await fixtureProof(app.database.executor,actor),app.database.executor);if(recent.state!=='ready')throw Error('Recent view');expect(recent.activity?.some(row=>row.id===ownCover.requestId)).toBe(false);
    await load('requests',ownCover.requestId);expect(await page.locator('.em-response-status:visible').innerText()).toContain('Cancelled');
    await q('DELETE FROM shift_exchanges WHERE id=$1',[ownCover.requestId]);await page.getByRole('button',{name:'Refresh',exact:true}).click();await page.locator('.em-response-status:visible strong').filter({hasText:'Recorded history'}).waitFor();expect(await page.getByRole('button',{name:'Cancel request',exact:true}).count()).toBe(0);
    await page.locator('.em-response-history:visible summary').click();expect(await page.locator('.em-response-history:visible').innerText()).toContain('Request cancelled');await shot('history-after-deletion');record('Exact own link survives the recent window and live-row deletion through protected immutable history without actions');
   }
   await page.setViewportSize({width:1440,height:1000});await page.goto(url('requests'));await page.locator('.q-shiftreq:visible').waitFor();expect(await page.locator('.em-exchange:visible').count()).toBe(0);await shot('desktop-preserved');record('Desktop retains existing own-request presentation and does not mount mobile response controls');
   await page.setViewportSize({width:390,height:844});await load('requests',decline.requestId);
   stage='authority-loss';expected=true;await q('UPDATE employees SET active=false WHERE id=$1',[actor]);
   let refusal:unknown=null;
   await page.route('**/api/employee/exchange/**',async(route:{fetch(options:{timeout:number}):Promise<{json():Promise<unknown>}>;fulfill(options:{response:unknown}):Promise<void>})=>{const response=await route.fetch({timeout:10000});refusal=await response.json();await route.fulfill({response});});
   await page.getByRole('button',{name:'Refresh',exact:true}).click();await page.locator('.em-exchange:visible[data-exchange-state="denied"]').waitFor();expect(refusal).toEqual({state:'unavailable',reason:'access_denied'});expect(await page.locator('.em-exchange:visible').innerText()).not.toContain('Blair');await shot('authority-denied');record('Current authority loss clears detail/history and refuses private reads/actions');
   await context.close();await activeBrowser.close();browser=undefined;failure=undefined;
  }
  const unmatched=messages.filter(row=>row.type==='pageerror'||row.type==='error'&&(!row.expected||!/Failed to (fetch|load resource)|Load failed|NetworkError|status of (401|403|503)/.test(row.text)));expect(unmatched).toEqual([]);
 }catch(error){await failure?.().catch(()=>{});throw error;}
 finally{await browser?.close();await app.close();await writeFile(evidence+'/results.json',JSON.stringify({checks,captures,contrasts,messages,failedRequests},null,2));}
});
