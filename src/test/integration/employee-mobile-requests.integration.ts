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
import {readEmployeeRequests} from '../../lib/data/employee-requests.server';
import {measureRenderedContrast} from '../../../scripts/browser-contrast.mjs';

it('integrates protected Employee Requests and eligible pickup using actual SQL and three browser engines',async()=>{
 const evidence=process.env.NEVORA_EMPLOYEE_MOBILE_EVIDENCE;
 if(!evidence)throw Error('Select explicit external evidence directory');
 await mkdir(evidence,{recursive:true});
 const runtime=createRequire(process.env.NEVORA_PLAYWRIGHT_RUNTIME_PACKAGE??resolve('tools/ci-browser-runtime/package.json'))('playwright');
 const app=await createOwnedNextApp(evidence),checks:{engine:string;name:string}[]=[],captures:string[]=[],contrast:{engine:string;theme:string;width:number;ratio:number}[]=[],messages:{engine:string;type:string;text:string;expected:boolean;stage:string;url:string}[]=[];
 const q=<T=Record<string,unknown>>(text:string,values:unknown[]=[])=>app.database.executor.query<T>({text,values});
 let browser:{close():Promise<void>}|undefined,failed:(()=>Promise<void>)|undefined;
 try{
  await seedOwnedApp(app.database.executor);
  for(const [index,engine] of ['chromium','webkit','firefox'].entries()){
   const record=(name:string)=>checks.push({engine,name});
   const f=await seedOwnedScenario(app.database.executor,'REQ'+index,index),actor=f.actors[0];
   await q("UPDATE employees SET role='EMPLOYEE',first_name='Alex',last_name='Rivera' WHERE id=$1",[actor]);
   if(index===0){
    await q("SELECT nevora_set_workspace_presentation($1,'workspace-fuel','QAOWNER',0,$2,repeat('a',64))",[randomUUID(),JSON.stringify({version:1,brand:{},modules:{disabled:['marketplace','timeOff']}})]);
    const off=await readEmployeeRequests(await fixtureProof(app.database.executor,actor),app.database.executor);
    expect(off.state).toBe('ready');if(off.state==='ready'){expect(off.modules).toEqual({timeOff:false,marketplace:false});expect(off.open).toEqual([]);expect(off.recent).toEqual([]);}
    await q("SELECT nevora_set_workspace_presentation($1,'workspace-fuel','QAOWNER',1,$2,repeat('b',64))",[randomUUID(),JSON.stringify({version:1,brand:{},modules:{disabled:[]}})]);
    record('Real SQL: persisted disabled modules release no module-owned requests or pickup facts');
   }
   await q("UPDATE shifts SET start_time='22:00',end_time='06:00',is_designated_lead=false WHERE id=$1",[f.targetId]);
   const blockedId='req-blocked-'+index;
   await q("INSERT INTO shifts(id,schedule_id,employee_id,date,start_time,end_time,position_id) VALUES($1,$2,$3,$4,'08:00','16:00','qa-pos')",[blockedId,'qa-REQ'+index+'-schedule-1',f.actors[2],f.sourceDate]);
   await publishScheduleWithRevision({locationId:'loc-2',weekStart:f.week,managerId:'QAOWNER'},app.database.executor);
   for(const [sourceId,owner] of [[f.targetId,f.actors[1]],[blockedId,f.actors[2]]]){
    const result=await executeShiftChange(await fixtureProof(app.database.executor,owner),{kind:'OFFER_COVERAGE',...await reviewedFixtureSource(app.database.executor,sourceId),operationId:randomUUID()},app.database.executor);
    expect(result.status).toBe('pending');
   }
   await q("INSERT INTO time_off_requests(id,employee_id,start_date,end_date,reason,status) VALUES($1,$2,$3,$3,'OWN PRIVATE REASON','PENDING'),($4,$5,$3,$3,'PEER PRIVATE REASON','PENDING')",['req-own-'+index,actor,f.sourceDate,'req-peer-'+index,f.actors[1]]);
   const proof=await fixtureProof(app.database.executor,actor);
   const own=await readEmployeeRequests(proof,app.database.executor);
   expect(own.state).toBe('ready');if(own.state!=='ready')throw Error('Requests read not ready');
   expect(own.open?.filter(row=>row.check==='eligible')).toHaveLength(1);
   expect(own.open?.filter(row=>row.check==='refused')).toHaveLength(1);
   expect(own.open?.find(row=>row.check==='eligible')?.outcome).toBe('completed');
   await q("UPDATE workspaces SET shift_change_policy=jsonb_set(shift_change_policy,'{coverage,mode}','\"MANAGER_REVIEW\"')");
   const manual=await readEmployeeRequests(proof,app.database.executor);
   expect(manual.state).toBe('ready');if(manual.state==='ready')expect(manual.open?.find(row=>row.check==='eligible')?.outcome).toBe('pending');
   await q("UPDATE workspaces SET shift_change_policy=jsonb_set(shift_change_policy,'{coverage,mode}','\"AUTOMATIC_WHEN_VALID\"')");
   expect(JSON.stringify(own)).not.toMatch(/PRIVATE REASON|req-peer-|sessionTokenHash|requestedByName|reasonNote/);
   await q("UPDATE employees SET role='OWNER' WHERE id=$1",[actor]);
   expect(await readEmployeeRequests(proof,app.database.executor)).toEqual({state:'unavailable',reason:'access_denied'});
   await q("UPDATE employees SET role='EMPLOYEE' WHERE id=$1",[actor]);
   await q("UPDATE employees SET role='LEAD' WHERE id=$1",[actor]);
   expect((await readEmployeeRequests(await fixtureProof(app.database.executor,actor),app.database.executor)).state).toBe('ready');
   expect(await readEmployeeRequests(proof,app.database.executor)).toEqual({state:'unavailable',reason:'access_denied'});
   await q("UPDATE employees SET role='EMPLOYEE' WHERE id=$1",[actor]);
   record('Real SQL: own minimal projection, positive vs refused eligibility, actual role guard and no private reasons');
   const activeBrowser=await runtime[engine].launch({headless:true});browser=activeBrowser;
   const context=await activeBrowser.newContext({viewport:{width:390,height:844},reducedMotion:'reduce',serviceWorkers:'block'});
   const page=await context.newPage();
   page.setDefaultTimeout(15000);page.setDefaultNavigationTimeout(30000);
   let expectedFailure=false,stage='login',binding='';
   page.on('request',(request:{url():string;headers():Record<string,string>})=>{if(new URL(request.url()).pathname==='/api/employee/requests')binding=request.headers()['x-nevora-employee-view']??'';});
   page.on('console',(message:{type():string;text():string})=>{if(['error','warning'].includes(message.type()))messages.push({engine,type:message.type(),text:message.text(),expected:expectedFailure,stage,url:page.url()});});
   page.on('pageerror',(error:Error)=>messages.push({engine,type:'pageerror',text:error.message,expected:false,stage,url:page.url()}));
   failed=async()=>{await page.screenshot({path:evidence+'/'+engine+'-failure.png',fullPage:true});await writeFile(evidence+'/'+engine+'-failure.html',await page.locator('body').innerHTML());};
   await context.route('**/*',async(route:{request():{url():string};abort():Promise<void>;continue():Promise<void>})=>{const url=new URL(route.request().url());if(['http:','https:'].includes(url.protocol)&&url.origin!==new URL(app.url).origin){await route.abort();return;}await route.continue();});
   const ready=()=>page.locator('.em-requests:visible[data-requests-state="ready"]').waitFor();
   const load=async(path:string)=>{await page.goto(app.url+path);await ready();};
   const shot=async(name:string)=>{const file=engine+'-'+name+'.png';await page.screenshot({path:evidence+'/'+file,fullPage:true,style:'nextjs-portal {visibility:hidden;}'});captures.push(file);};
   await page.goto(app.url+'/login');
   await page.getByLabel('Employee ID',{exact:true}).fill(actor);
   await page.getByLabel('Password',{exact:true}).fill(TEST_PASSWORD);
   await page.getByRole('button',{name:'Sign in',exact:true}).click();await page.waitForURL(app.url+'/app');
   await page.locator('[data-home-state="ready"]:visible,[data-home-state="partial"]:visible').waitFor();
   await page.locator('.employee-time-badge:visible').waitFor();
   stage='requests';
   await load('/app/requests/hub');
   expect(await page.getByRole('heading',{name:'Requests',exact:true}).count()).toBe(1);
   expect(await page.getByRole('link',{name:/Request time off/}).count()).toBe(1);
   expect(await page.locator('.em-requests:visible').innerText()).not.toContain('PRIVATE REASON');
   expect(binding).toMatch(/^[a-f0-9]{64}$/);
   const foreign=await page.request.get(app.url+'/api/employee/requests?employeeId='+f.actors[1],{headers:{'X-Nevora-Employee-View':binding}});
   expect(foreign.status()).toBe(400);expect(await foreign.json()).toEqual({state:'unavailable',reason:'access_denied'});
   await shot('requests-hub');
   if(index===0){
    // Presentation-only partial-read fixture derived from the actual own response. No peer rows or authorization facts are fabricated.
    stage='controlled-incoming-unavailable';
    await page.route('**/api/employee/requests',async(route:{fetch(options:{timeout:number}):Promise<{json():Promise<Record<string,unknown>>}>;fulfill(options:{response:unknown;json:unknown}):Promise<void>})=>{
     const response=await route.fetch({timeout:10000});const body=await response.json();await route.fulfill({response,json:{...body,incoming:null}});
    });
    await page.getByRole('button',{name:'Refresh',exact:true}).click();
    await page.getByText('Swaps for you couldn’t be checked.',{exact:true}).waitFor();
    expect(await page.getByRole('link',{name:'Open swaps for you',exact:true}).getAttribute('href')).toBe('/app/exchange?tab=foryou');
    await shot('incoming-unavailable');
    await page.unroute('**/api/employee/requests');
    await page.getByRole('button',{name:'Try again',exact:true}).click();
    await page.getByText('Swaps for you couldn’t be checked.',{exact:true}).waitFor({state:'hidden'});
    record('Controlled incoming-null presentation has a recovery action and destination; retry restores actual checked zero');
    stage='requests';
   }
   await page.getByRole('link',{name:/Open shifts 1 shift matches/}).click();await page.waitForURL(app.url+'/app/exchange?tab=available');await ready();
   await page.getByRole('heading',{name:'Open shifts',exact:true}).waitFor();
   await page.locator('.mobile-header .brand:visible').waitFor();
   expect(await page.locator('.em-open-shift:visible').count()).toBe(1);
   await page.locator('.em-open-shift:visible > summary').focus();await page.keyboard.press('Enter');
   await page.getByRole('button',{name:'Pick up shift',exact:true}).waitFor();
   expect(await page.locator('.em-open-detail:visible').innerText()).toContain('immediately');
   expect(await page.locator('.em-open-detail:visible').innerText()).toContain('Ends');
   expect(await page.locator('.em-open-shift:visible').innerText()).toContain('Overnight');
   record('Mobile hub navigation, distinct eligibility, keyboard disclosure and actual overnight pickup terms');
   for(const theme of ['light','dark'])for(const width of [320,390,430]){
    await page.setViewportSize({width,height:844});await page.evaluate((theme:string)=>document.documentElement.setAttribute('data-theme',theme),theme);
    const button=page.getByRole('button',{name:'Pick up shift',exact:true});
    const measurement=await button.evaluate(measureRenderedContrast);contrast.push({engine,theme,width,ratio:measurement.ratio});expect(measurement.ratio).toBeGreaterThanOrEqual(4.5);
    expect(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth)).toBe(true);
    expect(await page.locator('.page-frame').evaluate((el:HTMLElement)=>getComputedStyle(el).backgroundColor===getComputedStyle(el.querySelector('.em-requests')!).backgroundColor)).toBe(true);
    const small=await page.locator('.em-requests:visible a,.em-requests:visible button,.em-requests:visible summary').evaluateAll((els:HTMLElement[])=>els.filter(el=>el.getClientRects().length&&(el.getBoundingClientRect().height<43.5)).map(el=>el.textContent));
    expect(small).toEqual([]);
    await button.focus();await shot('open-'+theme+'-'+width);
   }
   record('Light/dark 320/390/430, actual primary contrast, minimum targets, visible focus and no page overflow');
   await page.setViewportSize({width:320,height:844});
   await page.evaluate(()=>{document.documentElement.style.fontSize='200%';document.documentElement.dataset.textStep='200';});
   expect(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth)).toBe(true);
   await page.getByRole('button',{name:'Refresh',exact:true}).scrollIntoViewIfNeeded();
   expect(await page.getByRole('button',{name:'Refresh',exact:true}).evaluate((el:HTMLElement)=>el.getBoundingClientRect().bottom<=document.querySelector('.mobile-nav')!.getBoundingClientRect().top+1)).toBe(true);
   await shot('open-text-200');record('Enlarged root text reflows with measured navigation clearance');
   await page.evaluate(()=>{document.documentElement.style.fontSize='100%';delete document.documentElement.dataset.textStep;});
   await page.setViewportSize({width:390,height:844});await page.evaluate(()=>document.documentElement.setAttribute('data-theme','light'));
   if(index===0){
    await q("UPDATE workspaces SET shift_change_policy=jsonb_set(shift_change_policy,'{coverage,mode}','\"MANAGER_REVIEW\"')");
    await page.getByRole('button',{name:'Refresh',exact:true}).click();
    await page.getByText('Your manager must approve this pickup before the shift is assigned to you.',{exact:true}).waitFor();
    await shot('manual-review-terms');
    await q("UPDATE workspaces SET shift_change_policy=jsonb_set(shift_change_policy,'{coverage,mode}','\"AUTOMATIC_WHEN_VALID\"')");
    await page.getByRole('button',{name:'Refresh',exact:true}).click();
    await page.getByText('Picking up this shift assigns it to you immediately if it is still available and you still meet the rules.',{exact:true}).waitFor();
    record('Current company review mode changes the explicit pickup consequence without changing the command planner');
    stage='interrupted-read';expectedFailure=true;
    await page.route('**/api/employee/requests',async(route:{abort():Promise<void>})=>route.abort());
    await page.getByRole('button',{name:'Refresh',exact:true}).click();
    await page.locator('.em-requests:visible[data-requests-state="unavailable"]').waitFor();
    expect(await page.locator('.em-open-shift:visible').count()).toBe(0);
    expect(await page.getByText('No eligible open shifts right now.',{exact:false}).count()).toBe(0);
    await shot('read-unavailable');
    await page.unroute('**/api/employee/requests');expectedFailure=false;
    await page.getByRole('button',{name:'Try again',exact:true}).click();await ready();
    record('Interrupted read clears facts and offers recovery, never a false empty or eligible result');
   }
   await page.evaluate(()=>window.dispatchEvent(new Event('offline')));
   await page.locator('.em-requests:visible[data-requests-state="paused"]').waitFor();
   expect(await page.locator('.em-requests:visible').innerText()).not.toContain('West Office');
   expect(await page.getByRole('button',{name:'Pick up shift',exact:true}).count()).toBe(0);
   await page.evaluate(()=>window.dispatchEvent(new Event('online')));await ready();
   await page.locator('.em-open-shift:visible > summary').click();
   await page.getByRole('button',{name:'Pick up shift',exact:true}).waitFor();
   record('Offline/background release removes private facts and actions; resume rereads current eligibility');
   // Real committed action with an intentionally lost transport response; reconciliation must reuse the original operation.
   let dropped=false;
   await page.route('**/app/exchange*',async(route:{request():{method():string;headers():Record<string,string>};fetch():Promise<unknown>;abort():Promise<void>;continue():Promise<void>})=>{
    if(!dropped&&route.request().method()==='POST'&&route.request().headers()['next-action']){dropped=true;await route.fetch();await route.abort();return;}await route.continue();
   });
   const manualPickup=engine==='firefox';
   if(manualPickup){
    await q("UPDATE workspaces SET shift_change_policy=jsonb_set(shift_change_policy,'{coverage,mode}','\"MANAGER_REVIEW\"')");
    await page.getByRole('button',{name:'Refresh',exact:true}).click();
    await page.getByText('Your manager must approve this pickup before the shift is assigned to you.',{exact:true}).waitFor();
   }
   stage='lost-pickup-response';expectedFailure=true;await page.getByRole('button',{name:'Pick up shift',exact:true}).click();
   await page.getByRole('button',{name:'Check pickup status',exact:true}).waitFor();expect(dropped).toBe(true);
   await page.evaluate(()=>window.dispatchEvent(new Event('offline')));await page.locator('.em-requests:visible[data-requests-state="paused"]').waitFor();
   await page.evaluate(()=>window.dispatchEvent(new Event('online')));await ready();
   await page.getByRole('button',{name:'Check pickup status',exact:true}).click();
   await page.getByText(manualPickup?'Pickup requested. Your assignment is awaiting review.':'Shift pickup completed. Check your current schedule.',{exact:true}).waitFor();
   await page.waitForFunction(()=>document.querySelectorAll('.em-open-shift').length===0);
   const assigned=await q('SELECT employee_id FROM shifts WHERE id=$1',[f.targetId]);expect(assigned[0].employee_id).toBe(manualPickup?f.actors[1]:actor);
   const receipts=await q("SELECT count(*)::integer AS count FROM shift_change_operations WHERE actor_employee_id=$1",[actor]);
   expect(receipts[0].count).toBe(1);
   await shot('pickup-reconciled');record(manualPickup?'Manual-review pickup survives lost response, reconciles one receipt and does not fabricate assignment':'Automatic pickup survives lost response, reconciles one receipt and canonical assignment');
   expectedFailure=false;stage='desktop-isolation';
   await page.unroute('**/app/exchange*');
   await page.setViewportSize({width:1440,height:1000});await page.goto(app.url+'/app/requests/hub');
   await page.locator('.q-reqhub:visible').waitFor();expect(await page.locator('.em-requests:visible').count()).toBe(0);
   await shot('desktop-preserved');record('Desktop retains existing RequestHub and does not mount the new mobile view');
   await page.setViewportSize({width:390,height:844});await load('/app/requests/hub');
   expectedFailure=true;stage='authority-loss';await q('UPDATE employees SET active=false WHERE id=$1',[actor]);
   let refusal:unknown=null;
   await page.route('**/api/employee/requests',async(route:{fetch(options:{timeout:number}):Promise<{status():number;json():Promise<unknown>}>;fulfill(options:{response:unknown}):Promise<void>})=>{
    const response=await route.fetch({timeout:10000});expect([401,403]).toContain(response.status());refusal=await response.json();await route.fulfill({response});
   });
   await page.getByRole('button',{name:'Refresh',exact:true}).click();await page.locator('.em-requests:visible[data-requests-state="denied"]').waitFor();
   expect(refusal).toEqual({state:'unavailable',reason:'access_denied'});
   expect(await page.locator('.em-requests:visible').innerText()).not.toContain('Time off ·');
   await shot('access-denied');record('Current authority loss clears request facts and refuses further actions');
   await context.close();await browser!.close();browser=undefined;failed=undefined;
   // Retire this engine's remaining fictional offer through the real owner command before the next independent scenario.
   const remaining=await q<{id:string;revision:number}>('SELECT id,request_revision AS revision FROM shift_exchanges WHERE source_shift_id=$1 AND status=\'OPEN\'',[blockedId]);
   for(const row of remaining)expect((await executeShiftChange(await fixtureProof(app.database.executor,f.actors[2]),{kind:'CANCEL',requestId:row.id,expectedRevision:row.revision,operationId:randomUUID()},app.database.executor)).status).toBe('closed');
  }
  const unexpected=messages.filter(row=>row.type==='pageerror'||row.type==='error'&&(!row.expected||!/Failed to (fetch|load resource)|Load failed|NetworkError|status of (401|403|503)/.test(row.text)));
  expect(unexpected).toEqual([]);
 }catch(error){await failed?.().catch(()=>{});throw error;}
 finally{
  await browser?.close();await app.close();
  await writeFile(evidence+'/results.json',JSON.stringify({checks,captures,contrast,messages},null,2));
 }
});
