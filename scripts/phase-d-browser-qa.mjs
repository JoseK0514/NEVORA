import {publishScheduleWithRevision} from '../src/test/integration/management-api.ts';
import {boundCorrectionPost} from './phase-d-correction-http-fixture.mjs';
import {safeBrowserFailure} from './release-browser-diagnostics.mjs';
import {observeDocumentNavigation,observeWindowExceptions,verifyNavigationFetchDiagnostic} from './browser-navigation-diagnostic.mjs';
import {observeRscCaughtErrors} from './rsc-caught-error-observer.mjs';
import {verifyRscCaughtErrorDiagnostic} from './rsc-caught-error-diagnostic.mjs';
import {finalizeRoleRedirectDiagnostics,projectFrameworkNativeDiagnostic} from './role-redirect-diagnostic.mjs';
import {openPeriodReports,reportNavigationStage,reportNavigationObservation} from './phase-d-report-navigation.mjs';
import {verifyReportRecoveryNavigation} from './scoped-navigation-browser-check.mjs';
import {finishResponseByDeadline,runBeforeRecoveryDeadline} from './browser-response-deadline.mjs';
import {parseCurrentTimecards} from '../src/lib/timecards/client.ts';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {createRequire} from 'node:module';
import {homedir} from 'node:os';
import {join,resolve} from 'node:path';
import {mkdir,readFile,writeFile} from 'node:fs/promises';
import {createOwnedNextApp} from '../src/test/integration/owned-next-app.ts';
import {seedOwnedApp,assignOwnedManagerCompanyAccess,TEST_PASSWORD} from '../src/test/integration/owned-app-fixture.ts';
import {hashPassword} from '../src/lib/auth/password.ts';
import {createOwnedSmtp} from '../src/test/integration/owned-smtp.ts';
const evidence=resolve(process.env.PHASE_D_EVIDENCE_DIR??join(homedir(),'.codex/visualizations/nevora-phase-d-d3-d8'));
await mkdir(evidence,{recursive:true});
const runtime=createRequire(process.env.NEVORA_PLAYWRIGHT_RUNTIME_PACKAGE??join(homedir(),'.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/package.json'));
const {chromium,webkit}=runtime('playwright');
const checkpoint=execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),tree=execFileSync('git',['rev-parse','HEAD^{tree}'],{encoding:'utf8'}).trim();
const dirty=execFileSync('git',['status','--porcelain=v1'],{encoding:'utf8'}).trim();
if(process.env.PHASE_D_EXPECTED_SHA){assert.equal(checkpoint,process.env.PHASE_D_EXPECTED_SHA);assert.equal(dirty,'','Exact candidate browser verification requires a clean worktree');}
const report={checkpoint,tree,sourceClean:dirty==='',checks:[],errors:[],networkCancellations:[],screenshots:[],recovery:[],runtimeDiagnostics:[],windowExceptions:[],caughtRscErrors:[],omittedCaughtRscErrors:0,limitations:['Owned local runtime is not hosted verification.','Chromium/WebKit automation is not physical-device or screen-reader acceptance.']};
const runtimeStarted=performance.now();
async function waitUntil(test){const deadline=Date.now()+15000;while(!test()){if(Date.now()>deadline)throw Error('Expected browser request did not arrive');await new Promise(resolve=>setTimeout(resolve,10));}}
async function waitUntilAsync(test){const deadline=Date.now()+15000;while(!await test()){if(Date.now()>deadline)throw Error('Expected UI state did not arrive');await new Promise(resolve=>setTimeout(resolve,10));}}
const checked=name=>{report.checks.push(name);console.log('[Phase D browser] PASS '+name);};
let app,smtp,currentPage,recoveryEmployee,lifecycle='setup';const browsers=[];
const url='/app/timecards?start=2026-09-21&end=2026-09-27';
// Quiet timecards (Team U4): the Employee's card, and the Owner/Manager sheet's status row and history rows.
const MY_TIMECARD='section[aria-label="Your timecard"]';
const sheetState=(card,state)=>card.locator('#tc-sheet-period li',{hasText:'Status'}).locator('.q-rv',{hasText:new RegExp(`^${state}$`)});
const sheetHistory=(card,action)=>card.locator('#tc-sheet-history li').filter({hasText:new RegExp(`^${action} · Revision \\d+`)}).first();
async function issueAssistedRecovery(page,employeeId,attestation){
 await page.getByLabel('Employee ID',{exact:true}).fill(employeeId);
 await page.getByRole('combobox',{name:'How you checked who they are',exact:true}).selectOption('other');
 await page.getByRole('textbox',{name:'How you checked',exact:true}).fill(attestation);
 await page.getByRole('switch',{name:'I confirmed who they are',exact:true}).check();
 await page.getByRole('button',{name:'Issue recovery code',exact:true}).click();
 await page.getByLabel('Recovery code',{exact:true}).waitFor();
 return page.getByLabel('Recovery code',{exact:true}).inputValue();
}
try{
  smtp=await createOwnedSmtp();app=await createOwnedNextApp(evidence,{clockerPinKey:"3d".repeat(32),clockerPunchEnabled:true,recoverySmtpPort:smtp.port});const q=(text,values=[])=>app.database.executor.query({text,values});
  const prepared=[];for(const path of ['/app/inbox','/app/settings/clocker','/app/clocker-recovery','/app/schedule']){const response=await fetch(app.url+path,{redirect:'manual',signal:AbortSignal.timeout(15000)});assert.equal(response.status,307);assert.equal(new URL(response.headers.get('location'),app.url).pathname,'/login');await response.text();prepared.push({path,status:response.status});}await writeFile(join(evidence,'route-preparation-report.json'),JSON.stringify(prepared,null,2));
  await seedOwnedApp(app.database.executor);const password=await hashPassword(TEST_PASSWORD);
  for(const [id,first,role] of [['D3-E','Avery','EMPLOYEE'],['D3-M','Morgan','MANAGER'],['D3-L','Taylor','LEAD']]){
    await q("INSERT INTO employees(id,first_name,last_name,phone,role,primary_location_id) VALUES($1,$2,'Period QA','555-0300',$3,'loc-1')",[id,first,role]);
    await q('INSERT INTO employee_credentials(employee_id,password_hash,must_change_password) VALUES($1,$2,false)',[id,password]);
    await q("INSERT INTO employee_location_eligibility VALUES($1,'loc-1')",[id]);
  }
  await q("INSERT INTO clocker_devices(id,location_id,name,active) VALUES('d3-device','loc-1','Fictional D3 tablet',true)");
  await assignOwnedManagerCompanyAccess(app.database.executor,'D3-M');
  await q("INSERT INTO time_entries(id,employee_id,location_id,device_id,clock_in_at,clock_out_at,status,version) VALUES('D3-UI','D3-E','loc-1','d3-device','2026-09-22T12:00:00Z','2026-09-22T20:00:00Z','CLOCKED_OUT',1)");
  await q("INSERT INTO break_entries(id,time_entry_id,break_start_at,break_end_at) VALUES('D3-UI-B','D3-UI','2026-09-22T16:00:00Z','2026-09-22T16:30:00Z')");
  const engineName=id=>'Portal '+id;
  async function context(browser,id){
    const context=await browser.newContext({viewport:{width:1440,height:1000},serviceWorkers:'block'});
    await observeWindowExceptions(context,(page,kind)=>{
      report.errors.push(engineName(id)+': window '+kind);
      report.windowExceptions.push({portal:id,lifecycle,elapsedMs:Math.round(performance.now()-runtimeStarted),reportControl:reportNavigationStage(page),kind});
    });
    await observeRscCaughtErrors(context,(page,metadata)=>{
      if(report.caughtRscErrors.length>=64){report.omittedCaughtRscErrors++;return;}
      report.caughtRscErrors.push({portal:id,lifecycle,monotonicMs:Math.round(performance.now()),reportControl:reportNavigationStage(page),...metadata});
    });
    await context.route('**/*',route=>{const target=new URL(route.request().url());return ['http:','https:'].includes(target.protocol)&&target.origin!==app.url?route.abort():route.continue();});
    // Lifecycle record: window events, the access frame's state and the page body's identity (a remount replaces it).
    // settled() reads it; a failure reports it.
    await context.addInitScript(()=>{
      const log=[];let frame,body;window.__nevoraLifecycle=log;window.__nevoraQuietSince=Date.now();
      const note=(kind,detail)=>{window.__nevoraQuietSince=Date.now();if(log.length<300)log.push({at:Date.now(),kind,detail,focused:document.hasFocus(),visibility:document.visibilityState});};
      for(const type of ['blur','focus','pagehide','pageshow','online','offline','storage'])window.addEventListener(type,event=>{if(event.target===window)note(type,event.persisted);},true);
      document.addEventListener('visibilitychange',()=>note('visibility'),true);
      new MutationObserver(()=>{const state=document.querySelector('.portal-route-state h2')?.textContent??'ready',page=document.querySelector('[data-nv-page]');if(state!==frame){frame=state;note('frame',state);}if(page!==body){body=page;note('page',page?'mounted':'none');}}).observe(document,{subtree:true,childList:true});
    });
    const page=await context.newPage();currentPage=page;const documentNavigation=observeDocumentNavigation(page,()=>app.url);page.setDefaultTimeout(15000);page.on('pageerror',error=>{
      if(error.message.endsWith('due to access control checks.')&&error.message.includes(new URL(app.url).host+'/api/'))report.networkCancellations.push(engineName(id)+': '+error.message);
      else{
       const errorIndex=report.errors.length,navigationObservation=reportNavigationObservation(page);
       report.errors.push(engineName(id)+': '+error.message);
       report.runtimeDiagnostics.push({portal:id,lifecycle,errorIndex,monotonicMs:navigationObservation?.monotonicMs??Math.round(performance.now()),elapsedMs:Math.round(performance.now()-runtimeStarted),reportControl:reportNavigationStage(page),nativeFetchName:error.name==='Fetch API cannot load http',framework:projectFrameworkNativeDiagnostic(error,app.url,id),navigationObservation,pendingDocumentNavigation:documentNavigation.pending(),documentNavigation:documentNavigation.snapshot(),afterCheck:report.checks.at(-1),route:new URL(page.url()).pathname.replace(/[A-Za-z0-9_-]{32,}/g,'[opaque]'),failure:safeBrowserFailure(error),stack:safeBrowserFailure({message:error.stack}).summary});
      }
    });
    await page.goto(app.url+'/login');await page.getByLabel('Employee ID',{exact:true}).fill(id);await page.getByLabel('Password',{exact:true}).fill(TEST_PASSWORD);
    await Promise.all([page.waitForURL(u=>u.pathname==='/app'),page.getByRole('button',{name:'Sign in',exact:true}).click()]);
    await page.waitForLoadState('networkidle');
    return {context,page};
  }
  // WebKit can deliver window lifecycle events after a download; the access frame then re-checks and remounts its page.
  // Act only once the page has been ready, with no lifecycle event or remount, for 750 ms.
  const settled=page=>page.waitForFunction(()=>!document.querySelector('.portal-route-state')&&Date.now()-window.__nevoraQuietSince>=750,null,{polling:100});
  for(const [engine,type] of [['chromium',chromium],['webkit',webkit]].filter(([name])=>!process.env.PHASE_D_QA_ENGINES||process.env.PHASE_D_QA_ENGINES.split(',').includes(name))){
    lifecycle='scenario';
    const browser=await type.launch({headless:true});browsers.push(browser);
    if(engine==='webkit'){
      report.navigationDiagnosticControl=await verifyNavigationFetchDiagnostic(browser);
      assert.equal(report.navigationDiagnosticControl.windowObserverVerified,true,'Window exception observation must catch the real thrown/rejected negative controls');
      report.rscCaughtErrorControl=await verifyRscCaughtErrorDiagnostic(browser);
      assert.equal(report.rscCaughtErrorControl.observerVerified,true,'Caught RSC error observation must retain both network and processing controls without suppressing console output');
    }
    const {context:employee,page:ep}=await context(browser,'D3-E');await ep.goto(app.url+url);
    // Team U4 (T-17) and Team P: the Quiet timecard. Totals: Worked is paid time (8 h less the unpaid 30 min break),
    // Breaks are shown separately. The period fields are in the "Other dates" sheet.
    await ep.locator(MY_TIMECARD).waitFor();assert.equal(await ep.locator(MY_TIMECARD).count(),1);
    const totals=ep.locator(MY_TIMECARD).locator('#tc-totals');
    assert.equal(await totals.locator('li',{hasText:'Worked'}).locator('.q-rv').innerText(),'7 h 30 min');
    assert.equal(await totals.locator('li',{hasText:'Breaks'}).locator('.q-rv').innerText(),'30 min');
    assert(await totals.locator('li',{hasText:'Worked'}).isVisible());checked(engine+': employee self period and break totals');
    await ep.getByRole('link',{name:/Request a correction/}).waitFor();
    await ep.getByRole('button',{name:'Other dates',exact:true}).click();await ep.locator('form[aria-label="Choose a period"]').waitFor();
    for(const width of [320,375,390,430,768,1024,1440]){
      await ep.setViewportSize({width,height:1000});
      const geometry=await ep.evaluate(()=>({width:document.documentElement.clientWidth,scroll:document.documentElement.scrollWidth,
        controls:[...document.querySelectorAll('section[aria-label="Your timecard"] button,section[aria-label="Your timecard"] input,form[aria-label="Choose a period"] input,form[aria-label="Choose a period"] button')].map(e=>{const box=e.getBoundingClientRect(),style=getComputedStyle(e);return {tag:e.tagName,type:e.getAttribute('type'),label:e.getAttribute('aria-label')??(e.tagName==='BUTTON'?e.textContent?.trim():e.closest('label')?.textContent?.trim()),className:e.className,height:box.height,width:box.width,display:style.display,visibility:style.visibility,minimum:style.minHeight,rendered:e.getClientRects().length>0&&style.visibility!=='hidden'&&style.visibility!=='collapse'};})}));
      // A phone-only disclosure stays in the shared tree but is display:none on desktop.
      // Preserve every raw node; the same target threshold applies to actual rendered controls.
      (report.employeeControlGeometry??=[]).push({engine,viewport:width,...geometry});
      await writeFile(join(evidence,'employee-control-geometry-report.json'),JSON.stringify({checkpoint:report.checkpoint,tree:report.tree,measurements:report.employeeControlGeometry},null,2));
      const rendered=geometry.controls.filter(control=>control.rendered);
      assert(geometry.scroll<=geometry.width+2,`${engine} ${width} page overflow`);assert(rendered.length>=4,'Both period inputs and both form actions (Cancel, View period) are rendered');assert(rendered.every(control=>control.height>=43.5),`${engine} ${width} rendered period controls keep the existing target floor`);checked(`${engine}: employee geometry ${width}`);
    }
    await ep.getByLabel('Period start').focus();assert(await ep.getByLabel('Period start').evaluate(e=>document.activeElement===e));await ep.keyboard.press('Tab');checked(engine+': period keyboard focus');
    await ep.getByRole('button',{name:'Cancel',exact:true}).click();await ep.locator('form[aria-label="Choose a period"]').waitFor({state:'hidden'});
    const {context:management,page:mp}=await context(browser,'D3-M');await mp.goto(app.url+url);
    const card=mp.getByRole('dialog');
    const openCard=async()=>{await mp.locator('#timecard-D3-E').getByRole('button').click();await card.getByRole('heading',{name:/^(Avery|Renamed) Period QA$/}).waitFor();};
    const refreshCards=async()=>{await card.getByRole('button',{name:'Done',exact:true}).click();await mp.getByRole('button',{name:'Refresh timecards',exact:true}).click();await openCard();};
    await openCard();
    await card.getByRole('button',{name:'Approve timecard',exact:true}).click();await sheetState(card,'Approved').waitFor();
    await card.getByRole('button',{name:'Finalize period',exact:true}).click();await sheetState(card,'Finalized').waitFor();
    const frozenRevisions=await q("SELECT to_jsonb(t) AS row FROM timecard_revisions t WHERE employee_id='D3-E' ORDER BY revision");
    const labels=await q("SELECT name,short_name FROM locations WHERE id='loc-1'");
    await q("UPDATE employees SET first_name='Renamed' WHERE id='D3-E'");await q("UPDATE locations SET name='Renamed historical location',short_name='Renamed' WHERE id='loc-1'");
    await refreshCards();await sheetState(card,'Finalized').waitFor();
    await card.getByLabel('Reopen reason').fill('Fictional correction review needs a new revision.');await card.getByRole('button',{name:'Reopen period',exact:true}).click();await sheetHistory(card,'Reopened').waitFor();
    assert.deepEqual(await q("SELECT to_jsonb(t) AS row FROM timecard_revisions t WHERE employee_id='D3-E' AND revision<=(SELECT max(revision)-1 FROM timecard_revisions WHERE employee_id='D3-E') ORDER BY revision"),frozenRevisions);
    await q("UPDATE employees SET first_name='Avery' WHERE id='D3-E'");await q("UPDATE locations SET name=$1,short_name=$2 WHERE id='loc-1'",[labels[0].name,labels[0].short_name]);
    await refreshCards();await sheetHistory(card,'Reopened').waitFor();checked(engine+': D-AUD-001 actual reopen after employee/location labels change preserves finalized history');
    assert.equal(await card.locator('#tc-sheet-history li').count(),3);checked(engine+': actual Manager approve-finalize-reopen with history');
    for(const width of [320,375,390,430,768,1024,1440]){
      await mp.setViewportSize({width,height:1000});
      const geometry=await mp.evaluate(()=>({width:document.documentElement.clientWidth,scroll:document.documentElement.scrollWidth,overflow:[...document.querySelectorAll('*')].filter(e=>getComputedStyle(e).display!=='none'&&(e.getBoundingClientRect().right+window.scrollX>document.documentElement.clientWidth+2||e.scrollWidth>e.clientWidth+2)).map(e=>({tag:e.tagName,class:e.className,width:e.getBoundingClientRect().width,right:e.getBoundingClientRect().right,scroll:e.scrollWidth,client:e.clientWidth,minWidth:getComputedStyle(e).minWidth,whiteSpace:getComputedStyle(e).whiteSpace})).slice(-25)}));
      if(geometry.scroll>geometry.width+2)console.log(JSON.stringify({engine,viewport:width,managerGeometry:geometry}));
      assert(geometry.scroll<=geometry.width+2,`${engine} ${width} manager overflow`);checked(`${engine}: manager geometry ${width}`);
    }
    const screen=join(evidence,`${engine}-timecards-390.png`);await mp.setViewportSize({width:390,height:1000});await mp.screenshot({path:screen,fullPage:true});report.screenshots.push(screen);
    await employee.setOffline(true);await ep.evaluate(()=>window.dispatchEvent(new Event('offline')));assert.equal(await ep.locator(MY_TIMECARD).count(),0);checked(engine+': offline clears private period data');
    await employee.setOffline(false);await ep.evaluate(()=>window.dispatchEvent(new Event('online')));await ep.locator(MY_TIMECARD).waitFor();
    await ep.route('**/api/timecards',route=>route.fulfill({status:503,contentType:'application/json',body:'{"state":"unavailable","reason":"read_failed"}'}));
    // No Refresh button on the Quiet view: View period on the same dates reads the period again.
    await ep.getByRole('button',{name:'Other dates',exact:true}).click();await ep.getByRole('button',{name:'View period',exact:true}).click();
    await ep.getByRole('heading',{name:'Couldn’t load your timecard',exact:true}).waitFor();assert.equal(await ep.locator(MY_TIMECARD).count(),0);checked(engine+': read error clears stale totals');
    await ep.unroute('**/api/timecards');
    const {context:lead,page:lp}=await context(browser,'D3-L');await lp.goto(app.url+url);await lp.locator(MY_TIMECARD).waitFor();
    assert.equal(await lp.getByRole('button',{name:'Approve timecard',exact:true}).count(),0);checked(engine+': Lead self-service without management controls');
    currentPage=mp;
    // Exercise the real protected return even where headless windows keep focus.
    // This is an explicit lifecycle regression, not physical OS certification.
    const returnDeadline=performance.now()+15000;
    await runBeforeRecoveryDeadline(async()=>{
      await mp.evaluate(()=>window.dispatchEvent(new Event('blur')));
      await mp.getByRole('heading',{name:'View paused',exact:true}).waitFor();
      assert.equal(await mp.locator('#timecard-D3-E').count(),0,'Retired manager cards stay hidden before a fresh authority/page read');
      const [response]=await Promise.all([
        mp.waitForResponse(response=>{
          const request=response.request(),target=new URL(response.url());
          if(target.origin!==app.url||target.pathname!=='/api/timecards'||request.method()!=='POST'||request.headers()['x-nevora-actor']!=='D3-M')return false;
          try{const body=request.postDataJSON();return body.startDate==='2026-09-21'&&body.endDate==='2026-09-27';}catch{return false;}
        },{timeout:15000}),
        (async()=>{
          const rsc=mp.waitForRequest(request=>{const target=new URL(request.url());return target.origin===app.url&&target.pathname==='/app/timecards'&&request.headers().rsc==='1';},{timeout:15000});
          await mp.bringToFront();await mp.evaluate(()=>window.dispatchEvent(new FocusEvent('focus')));await rsc;
          // The existing RSC recovery owns this return to the selected period.
        })(),
      ]);
      assert.equal(response.status(),200);await finishResponseByDeadline(response,returnDeadline);
      const current=parseCurrentTimecards(await response.json(),{startDate:'2026-09-21',endDate:'2026-09-27'});
      assert(current.cards.some(item=>item.card.employeeId==='D3-E'),'Fresh protected response contains the reviewed employee');
      assert.equal(new URL(mp.url()).pathname+new URL(mp.url()).search,url,'Foreground return preserves the exact selected period');
      await openCard();
      (report.managerReturn??=[]).push({engine,lifecycle:'explicit blur/focus',responseStatus:response.status(),bodyFinished:true,observedAt:current.observedAt,validForMs:current.validForMs,period:current.period,elapsedMs:15000-(returnDeadline-performance.now())});
    },returnDeadline);
    checked(engine+': controlled Manager return hides retired cards and completes a fresh exact-period read within the original deadline');
    await card.getByRole('button',{name:'Approve timecard',exact:true}).click();await sheetState(card,'Approved').waitFor();await card.getByRole('button',{name:'Finalize period',exact:true}).click();await sheetState(card,'Finalized').waitFor();
    await mp.goto(app.url+'/app/payroll-export?start=2026-09-21&end=2026-09-27');await mp.getByRole('button',{name:'Export finalized time',exact:true}).click();await mp.locator('.q-export-phone').getByRole('button',{name:/^Time file/}).waitFor();checked(engine+': Quiet phone finalized export produces current files');await mp.setViewportSize({width:1440,height:1000});await mp.getByRole('heading',{name:'Choose finalized employees',exact:true}).waitFor();
    await mp.getByRole('checkbox',{name:/Avery Period QA/}).check();await mp.getByRole('button',{name:'Generate reviewed export',exact:true}).click();await mp.getByRole('button',{name:'Download mapped CSV',exact:true}).waitFor();checked(engine+': finalized neutral export receipt verified');
    for(const [name,extension] of [['Download mapped CSV','csv'],['Download canonical time record','json']]){const waiting=mp.waitForEvent('download');await mp.getByRole('button',{name,exact:true}).click();const file=await waiting;await file.saveAs(join(evidence,`${engine}-payroll-neutral.${extension}`));}checked(engine+': canonical and mapped export downloads');await settled(mp);
    // The downloads above can use most of the access frame's 15 s view window; the mapping steps start on a fresh view so
    // a slow background refresh can't retire the page mid-save.
    await mp.reload();await settled(mp);await mp.getByText('Import mapping',{exact:true}).click();await mp.getByLabel('Profile name',{exact:true}).fill('Fictional customer CSV');await mp.getByLabel('Payroll product / edition',{exact:true}).fill('Fictional provider');await mp.getByRole('checkbox',{name:/I verified the required fields/}).check();await mp.getByRole('button',{name:'Save mapping profile',exact:true}).click();await mp.getByRole('status').filter({hasText:'Mapping saved as revision 1'}).waitFor();checked(engine+': current manager configurable mapping save');
    for(const width of [320,375,390,430,768,1024,1440]){await mp.setViewportSize({width,height:1000});const geometry=await mp.evaluate(()=>({width:document.documentElement.clientWidth,scroll:document.documentElement.scrollWidth,scrollX:window.scrollX,inner:window.innerWidth,overflow:[...document.querySelectorAll('*')].filter(e=>(e.getBoundingClientRect().right+window.scrollX>document.documentElement.clientWidth+2||e.scrollWidth>e.clientWidth+2)&&getComputedStyle(e).display!=='none').map(e=>({tag:e.tagName,class:e.className,width:e.getBoundingClientRect().width,right:e.getBoundingClientRect().right,scroll:e.scrollWidth,client:e.clientWidth,minWidth:getComputedStyle(e).minWidth,overflow:getComputedStyle(e).overflow,caption:e.tagName==='LABEL'?e.textContent.slice(0,140):null,children:e.tagName==='LABEL'?[...e.children].map(child=>({tag:child.tagName,width:child.getBoundingClientRect().width,scroll:child.scrollWidth,overflow:getComputedStyle(child).overflow})):undefined})).slice(-25)}));if(geometry.scroll>geometry.width+2){console.log(JSON.stringify(geometry));await mp.screenshot({path:join(evidence,`${engine}-mapping-overflow.png`),fullPage:true});}assert(geometry.scroll<=geometry.width+2,`${engine}: mapping overflow ${width}`);checked(`${engine}: mapping geometry ${width}`);}
    currentPage=mp;await openPeriodReports(mp,app.url,engine,report);
    await verifyReportRecoveryNavigation(mp,app,engine,report,'D3-M');
    const periodDetails=mp.locator('details').filter({has:mp.locator('summary').filter({hasText:'Period details'})});await periodDetails.locator('summary').click();await waitUntilAsync(()=>periodDetails.evaluate(e=>e.open));await periodDetails.getByRole('status').filter({hasText:'Scheduled totals and differences are unavailable'}).waitFor();await mp.getByRole('heading',{name:'Scheduled vs recorded',exact:true}).waitFor();await waitUntilAsync(async()=>(await mp.locator('main').innerText()).includes('Scheduled totals and differences are unavailable'));assert(await mp.locator('main').getByText('8h',{exact:true}).first().isVisible());assert.match(await mp.locator('main').innerText(),/Scheduled totals and differences are unavailable/);checked(engine+': report canonical totals and unpublished-plan distinction');
    for(const width of [320,375,390,430,768,1024,1440]){await mp.setViewportSize({width,height:1000});assert(await mp.evaluate(()=>document.documentElement.scrollWidth<=document.documentElement.clientWidth+2));checked(`${engine}: reports geometry ${width}`);}
    await mp.getByLabel('First day',{exact:true}).focus();assert(await mp.getByLabel('First day',{exact:true}).evaluate(e=>document.activeElement===e));await mp.keyboard.press('Tab');checked(engine+': report keyboard');
    const reportScreen=join(evidence,`${engine}-reports-390.png`);await mp.setViewportSize({width:390,height:1000});await mp.screenshot({path:reportScreen,fullPage:true});report.screenshots.push(reportScreen);
    const phoneFigures=mp.locator('.q-insights-phone').getByRole('list',{name:'Period figures',exact:true});assert(await phoneFigures.isVisible());assert.match(await phoneFigures.innerText(),/\b8\s*h\b/);checked(engine+': Quiet phone figures retain canonical recorded hours');
    await mp.setViewportSize({width:1440,height:1000});await mp.getByRole('button',{name:'Export',exact:true}).click();const downloaded=mp.waitForEvent('download');await mp.getByRole('button',{name:'Download CSV',exact:true}).click();const download=await downloaded;const csvPath=join(evidence,`${engine}-report.csv`);await download.saveAs(csvPath);checked(engine+': protected CSV download');
    await mp.emulateMedia({media:'print'});assert.equal(await mp.locator('.mobile-nav:visible').count(),0);assert.equal(await mp.getByRole('button',{name:'Download CSV',exact:true}).isVisible(),false);assert(await mp.getByRole('heading',{name:'Hours by person',exact:true}).isVisible());checked(engine+': printable report without navigation or controls');
    await mp.locator('.q-insights-desk .wb-definitions').getByText('Actual time uses D2 canonical effective entries and breaks; finalized cards use their immutable snapshots.',{exact:true}).waitFor();await mp.locator('.q-insights-desk .wb-definitions ~ .wb-note').getByText(/^As of /).waitFor();checked(engine+': D5 print expands definitions and source observation');
    if(engine==='chromium'){const pdf=await mp.pdf({path:join(evidence,'period-report.pdf'),preferCSSPageSize:true,printBackground:true});assert.equal(pdf.subarray(0,5).toString(),'%PDF-');checked(engine+': generated useful PDF artifact');}
    await mp.emulateMedia({media:'screen'});
    assert.equal(await mp.getByText('Report definitions',{exact:true}).evaluate(e=>e.closest('details').open),false);checked(engine+': D5 print restores the collapsed disclosure');
    await management.setOffline(true);await mp.evaluate(()=>window.dispatchEvent(new Event('offline')));await mp.getByRole('heading',{name:'View paused',exact:true}).waitFor();assert.equal(await mp.getByRole('heading',{name:'Hours by person',exact:true}).count(),0);checked(engine+': report offline privacy clearing');
    await management.setOffline(false);await mp.evaluate(()=>window.dispatchEvent(new Event('online')));await mp.getByRole('heading',{name:'Hours by person',exact:true}).waitFor();
    await mp.route('**/api/reports',route=>route.fulfill({status:403,contentType:'application/json',body:'{"state":"unavailable"}'}));await mp.getByRole('button',{name:'Refresh',exact:true}).click();await mp.getByRole('heading',{name:'Your session ended',exact:true}).waitFor();assert.equal(await mp.getByRole('heading',{name:'Hours by person',exact:true}).count(),0);checked(engine+': report authorization-loss clearing');
    await lp.goto(app.url+'/app/reports');await lp.waitForURL(u=>u.pathname==='/app');checked(engine+': Lead denied reports');
    await mp.bringToFront();currentPage=mp;const corrections=mp.locator('main #on-shift-corrections');let releaseQueue;await mp.route('**/api/manager/time-corrections',route=>new Promise(resolve=>{releaseQueue=()=>route.continue().then(resolve);}));
    await mp.goto(app.url+'/app?view=attendance');await corrections.getByText('Checking correction requests…',{exact:true}).waitFor();assert.equal(await corrections.locator('li.u1-correction').count(),0);checked(engine+': UX-04 loading never claims empty');
    await waitUntil(()=>releaseQueue);assert(releaseQueue);await releaseQueue();await mp.unroute('**/api/manager/time-corrections');await corrections.waitFor({state:'detached'});checked(engine+': UX-04 verified empty');
    const requestId=crypto.randomUUID(),submitted=await boundCorrectionPost(ep.request,app.url+'/api/employee/time-corrections',{headers:{origin:app.url,'x-nevora-time-correction':'1'},data:{operationId:requestId,kind:'MISSING_ENTRY',locationId:'loc-1',proposedStartAt:'2026-09-28T12:00:00Z',proposedEndAt:'2026-09-28T13:00:00Z',reason:'Fictional completed work for queue verification'}});assert(submitted.ok());const submittedBody=await submitted.json();
    await mp.evaluate(()=>window.dispatchEvent(new Event('nevora:time-correction-changed')));await corrections.locator('li.u1-correction').filter({hasText:'Avery Period QA'}).waitFor();checked(engine+': UX-04 actual pending queue');
    await management.setOffline(true);await mp.evaluate(()=>window.dispatchEvent(new Event('offline')));await mp.getByRole('heading',{name:'View paused',exact:true}).waitFor();assert.equal(await corrections.locator('li.u1-correction').count(),0);assert.equal(await corrections.locator('li.u1-correction').count(),0);checked(engine+': UX-04 offline clears names and no false all-clear');
    releaseQueue=null;await mp.route('**/api/manager/time-corrections',route=>new Promise(resolve=>{releaseQueue=()=>route.continue().then(resolve);}));await management.setOffline(false);await mp.evaluate(()=>window.dispatchEvent(new Event('online')));await corrections.getByText('Checking correction requests…',{exact:true}).waitFor();assert.equal(await corrections.locator('li.u1-correction').count(),0);await waitUntil(()=>releaseQueue);assert(releaseQueue);await releaseQueue();await mp.unroute('**/api/manager/time-corrections');await corrections.locator('li.u1-correction').waitFor();checked(engine+': UX-04 reconnecting remains unconfirmed until response');
    await mp.route('**/api/manager/time-corrections',route=>route.fulfill({status:403,contentType:'application/json',body:'{"state":"unavailable"}'}));await mp.evaluate(()=>window.dispatchEvent(new Event('nevora:time-correction-changed')));await corrections.getByText('Sign in again to review corrections.',{exact:true}).waitFor();assert.equal(await corrections.locator('li.u1-correction').count(),0);assert.equal(await corrections.locator('li.u1-correction').count(),0);checked(engine+': UX-04 authorization-loss privacy state');await mp.unroute('**/api/manager/time-corrections');
    assert.equal((await mp.request.post(app.url+'/api/timecards',{headers:{origin:app.url,'x-nevora-timecards':'1','x-nevora-actor':'D3-E'},data:{startDate:'2026-09-21',endDate:'2026-09-27'}})).status(),403);assert.equal((await mp.request.post(app.url+'/api/manager/timecards',{headers:{origin:app.url,'x-nevora-timecards':'1','x-nevora-actor':'D3-E'},data:{action:'APPROVE'}})).status(),403);checked(engine+': D8 identity-switched actor cannot read or replay timecard commands');
    const periodRead=await mp.request.post(app.url+'/api/timecards',{headers:{origin:app.url,'x-nevora-timecards':'1','x-nevora-actor':'D3-M'},data:{startDate:'2026-09-21',endDate:'2026-09-27'}});assert(periodRead.ok());const reviewed=(await periodRead.json()).cards.find(item=>item.card.employeeId==='D3-E');assert(reviewed);
    const reopened=await mp.request.post(app.url+'/api/manager/timecards',{headers:{origin:app.url,'x-nevora-timecards':'1','x-nevora-actor':'D3-M'},data:{operationId:crypto.randomUUID(),employeeId:'D3-E',startDate:'2026-09-21',endDate:'2026-09-27',expectedRevision:reviewed.revision,expectedSourceHash:reviewed.sourceHash,action:'REOPEN',note:'Fictional D7 context review.'}});assert(reopened.ok());
    const timeOffId='D7-TO-'+engine;await q("INSERT INTO time_off_requests(id,employee_id,start_date,end_date,reason) VALUES($1,'D3-E','2030-10-21','2030-10-21','PRIVATE D7 ABSENCE REASON')",[timeOffId]);
    await q("INSERT INTO time_entries(id,employee_id,location_id,device_id,clock_in_at,clock_out_at,status,version) VALUES($1,'D3-E','loc-1','d3-device',clock_timestamp()-interval '1 hour',clock_timestamp(),'CLOCKED_OUT',1)",['D7-CURRENT-'+engine]);
    await mp.bringToFront();currentPage=mp;const centerUrl=app.url+'/app/inbox',center=mp.locator('main .manager-inbox');let releaseActions;
    const readyInbox=()=>mp.waitForFunction(()=>document.querySelector('main .manager-inbox')?.getAttribute('data-inbox-state')==='ready');
    const openGroups=async()=>{for(const disclosure of await center.locator('details').all()){if(!await disclosure.evaluate(e=>e.open))await disclosure.locator(':scope > summary').click();}};
    const inboxFilters=[['now','Act now'],['requests','Requests'],['planning','Plan ahead']];
    const chooseInboxFilter=async(value,label)=>{await readyInbox();const button=center.getByRole('group',{name:'Show',exact:true}).getByRole('button',{name:new RegExp('^'+label+'(?:, \\d+)?$')});await button.click();await waitUntilAsync(async()=>await button.getAttribute('aria-pressed')==='true'&&new URL(mp.url()).searchParams.get('filter')===value);assert.equal(await button.getAttribute('aria-pressed'),'true');assert.equal(new URL(mp.url()).searchParams.get('filter'),value);await openGroups();};
    const selectInboxItem=async key=>{for(const [value,label] of inboxFilters){await chooseInboxFilter(value,label);const item=center.locator('[data-inbox-key="'+key+'"]');if(await item.count()){await item.waitFor();return item;}}throw Error('Canonical Inbox action was not reachable in any section');};
    const recheckInbox=()=>mp.evaluate(()=>window.dispatchEvent(new Event('nevora:time-correction-changed')));
    const assertNoInboxEmpty=async()=>assert.equal(await center.getByText(/^(?:All caught up|Nothing needs you right now\.|Nothing to act on now\.|No requests are waiting\.|Nothing to plan ahead right now\.)$/).count(),0,'An unconfirmed Inbox never reports an empty checked section');
    const assertInboxCountsCleared=async()=>{const controls=center.locator('.premium-inbox-filters button');assert.equal(await controls.count(),3);assert.deepEqual(await controls.evaluateAll(buttons=>buttons.map(button=>({disabled:button.disabled,count:/\d/.test((button.getAttribute('aria-label')??'')+button.textContent)}))),Array.from({length:3},()=>({disabled:true,count:false})));};
    await mp.route('**/api/manager/action-center',route=>new Promise(resolve=>{releaseActions=()=>route.continue().then(resolve);}));await mp.goto(centerUrl);await center.getByText('Loading your Inbox…',{exact:true}).waitFor();assert.equal(await center.locator('[data-inbox-key]').count(),0);assert.equal(await center.getByText('All caught up',{exact:true}).count(),0);await assertNoInboxEmpty();await assertInboxCountsCleared();await waitUntil(()=>releaseActions);const initialRead=mp.waitForResponse(response=>new URL(response.url()).pathname==='/api/manager/action-center');await releaseActions();await mp.unroute('**/api/manager/action-center');const inboxActions=await (await initialRead).json();await readyInbox();checked(engine+': D7 Inbox loading hides private rows and no false all-clear');
    const centerReply=await mp.request.post(app.url+'/api/manager/action-center',{headers:{origin:app.url,'x-nevora-action-center':'1','x-nevora-actor':'D3-M'},data:{weekStart:'2026-09-21'}});assert(centerReply.ok());const actions=await centerReply.json();assert.equal(actions.items.length,new Set(actions.items.map(item=>item.id)).size);assert.equal(actions.counts.total,actions.counts.scheduling+actions.counts.requests+actions.counts.timekeeping);assert(actions.counts.scheduling>0&&actions.counts.requests>0&&actions.counts.timekeeping>0);assert(actions.items.some(i=>i.id==='TIME_CORRECTION:'+submittedBody.requestId));assert(actions.items.some(i=>i.type==='TIMECARD'&&i.employeeId==='D3-E'));assert(actions.items.some(i=>i.type==='TIME_OFF'));const noted=actions.items.filter(item=>JSON.stringify(item).includes('PRIVATE D7 ABSENCE REASON'));assert.equal(noted.length,1);assert.equal(noted[0].id,'TIME_OFF:'+timeOffId);assert.equal(noted[0].request.note,'PRIVATE D7 ABSENCE REASON');assert(!JSON.stringify(actions.items.map(({request,...compact})=>compact)).includes('PRIVATE D7 ABSENCE REASON'));assert(!JSON.stringify(actions).includes('Fictional completed work for queue verification'));checked(engine+': D7 canonical mixed-source counts, deduplication and authorized request-note scope and compact/private-correction exclusion');
    await mp.bringToFront();await readyInbox();assert.equal(await center.getByRole('button',{name:/^Act now(?:, \d+)?$/}).getAttribute('aria-pressed'),'true','The approved Inbox opens on Act now');
    assert.equal(inboxActions.state,'ready');assert.equal(inboxActions.items.length,new Set(inboxActions.items.map(item=>item.id)).size);
    const todayReply=await mp.request.get(app.url+'/api/manager/today',{headers:{'x-nevora-today':'1'}}),todaySource=await todayReply.json();assert(['ready','unavailable'].includes(todaySource.state));if(todaySource.state==='ready')assert.equal(todayReply.status(),200);
    const expectedInboxKeys=[...inboxActions.items.map(item=>item.id),...(todaySource.state==='ready'?todaySource.missed.map(shift=>'shift:'+shift.id):[])].sort(),visibleInboxKeys=[];
    for(const [value,label] of inboxFilters){await chooseInboxFilter(value,label);const keys=await center.locator('[data-inbox-key]').evaluateAll(nodes=>nodes.map(node=>node.dataset.inboxKey));assert.equal(keys.length,new Set(keys).size);visibleInboxKeys.push(...keys);(report.inboxVisibility??=[]).push({engine,filter:value,keys});}
    assert.equal(visibleInboxKeys.length,new Set(visibleInboxKeys).size,'Canonical actions appear in exactly one Inbox section');assert.deepEqual(visibleInboxKeys.sort(),expectedInboxKeys);checked(engine+': D7 three Inbox sections expose every actual current-week canonical action and current missed shift exactly once');
    await selectInboxItem('TIME_OFF:'+timeOffId);
    for(const width of [320,375,390,430,768,1024,1440]){await mp.setViewportSize({width,height:1000});assert(await mp.evaluate(()=>document.documentElement.scrollWidth<=document.documentElement.clientWidth+2));assert(await center.locator('[data-inbox-key]').first().evaluate(e=>e.getBoundingClientRect().height>=43.5));checked(engine+': D7 action geometry '+width);}
    const requestFilter=center.getByRole('button',{name:/^Requests(?:, \d+)?$/});await requestFilter.focus();assert(await requestFilter.evaluate(e=>document.activeElement===e));await center.locator('a[data-inbox-key]').first().focus();await mp.keyboard.press(process.platform==='darwin'&&engine==='webkit'?'Alt+Tab':'Tab');assert(await center.evaluate(e=>e.contains(document.activeElement)&&document.hasFocus()),'Native Inbox traversal keeps focus within the foreground surface');checked(engine+': D7 keyboard focus through actual Inbox sections and rows');
    await center.locator('[data-inbox-key="TIME_OFF:'+timeOffId+'"]').click();await center.locator('.inbox-detail [data-fact="note"]').getByText('PRIVATE D7 ABSENCE REASON',{exact:true}).waitFor();assert(!(await center.locator('.inbox-list-column').innerText()).includes('PRIVATE D7 ABSENCE REASON'));checked(engine+': D7 authorized selected request note appears only in detail');await mp.screenshot({path:join(evidence,engine+'-inbox-authorized-note-1440.png'),fullPage:true});
    // The independent corrections read may win while Attendance still hides its
    // section. Hold that real read to exercise the native focus/reveal ordering.
    let releaseAttendance;
    const attendancePattern='**/api/manager/attendance';
    await mp.route(attendancePattern,route=>new Promise(resolve=>{releaseAttendance=()=>route.continue().then(resolve);}));
    const focusEvidence={states:[],reads:[]};
    const recordRead=response=>{const path=new URL(response.url()).pathname;if(['/api/manager/attendance','/api/manager/time-corrections'].includes(path))focusEvidence.reads.push({path,status:response.status()});};
    mp.on('response',recordRead);
    const recordFocus=async stage=>{focusEvidence.states.push({stage,...await mp.evaluate(id=>{
      const target=document.getElementById(id),active=document.activeElement;
      return {path:location.pathname,hashMatches:location.hash==='#'+id,view:new URL(location.href).searchParams.get('view'),documentFocused:document.hasFocus(),visibility:document.visibilityState,readyState:document.readyState,
        activeTag:active?.tagName??null,targetFocused:active===target,targetConnected:!!target?.isConnected,targetTabIndex:target?.tabIndex??null,targetRects:target?.getClientRects().length??0,
        sectionDisplay:target?.closest('#on-shift-corrections')?getComputedStyle(target.closest('#on-shift-corrections')).display:null,
        attendanceBusy:document.querySelector('.attendance-review-summary')?.getAttribute('aria-busy'),
        animations:target?.getAnimations().map(animation=>animation.playState)??[]};
    },'correction-'+submittedBody.requestId)});};
    try{
      const correctionLink=await selectInboxItem('TIME_CORRECTION:'+submittedBody.requestId);await correctionLink.click({delay:100});await center.locator('.inbox-detail__actions a').first().click();
      const targetedCorrection=mp.locator('main [id="correction-'+submittedBody.requestId+'"]');
      await waitUntil(()=>releaseAttendance);await targetedCorrection.waitFor({state:'attached'});
      await mp.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
      await recordFocus('protected-row-ready-attendance-held');
      assert.equal(focusEvidence.states.at(-1).sectionDisplay,'none');assert.equal(focusEvidence.states.at(-1).targetFocused,false);
      await releaseAttendance();releaseAttendance=null;await mp.unroute(attendancePattern);
      await targetedCorrection.waitFor();await waitUntilAsync(()=>targetedCorrection.evaluate(e=>document.activeElement===e));
      await recordFocus('revealed-and-focused');checked(engine+': D7 pointer Inbox correction detail opens and focuses the protected request');
      await mp.screenshot({path:join(evidence,engine+'-correction-focus-1440.png'),fullPage:true});
    }finally{
      await recordFocus('final');mp.off('response',recordRead);
      await writeFile(join(evidence,engine+'-correction-focus.json'),JSON.stringify(focusEvidence,null,2));
      if(releaseAttendance)await releaseAttendance();await mp.unroute(attendancePattern);
    }
    await mp.goto(centerUrl);await readyInbox();const currentTimecard=inboxActions.items.find(item=>item.type==='TIMECARD'&&item.employeeId==='D3-E');assert(currentTimecard);const timecardDestination=new URL(currentTimecard.href,app.url),timecardLink=await selectInboxItem(currentTimecard.id);await timecardLink.focus();await timecardLink.press('Enter');const detailLink=center.locator('.inbox-detail__actions a').first();await detailLink.focus();await detailLink.press('Enter');await mp.locator('#timecard-D3-E').waitFor();assert.equal(new URL(mp.url()).searchParams.get('start'),timecardDestination.searchParams.get('start'));assert.equal(new URL(mp.url()).searchParams.get('end'),timecardDestination.searchParams.get('end'));const timecardSheet=mp.getByRole('dialog',{name:'Avery Period QA',exact:false});await timecardSheet.waitFor();await waitUntilAsync(()=>timecardSheet.evaluate(e=>e.contains(document.activeElement)));assert(await timecardSheet.getByRole('button',{name:'Done',exact:true}).isVisible());checked(engine+': D7 keyboard Inbox timecard detail preserves canonical employee/period context and focus');
    await mp.goto(centerUrl);await readyInbox();await (await selectInboxItem('TIME_OFF:'+timeOffId)).click();await center.locator('.inbox-detail [data-fact="note"]').getByText('PRIVATE D7 ABSENCE REASON',{exact:true}).waitFor();await management.setOffline(true);await mp.evaluate(()=>window.dispatchEvent(new Event('offline')));await center.getByText('You’re offline. This updates when you reconnect.',{exact:true}).waitFor();assert.equal(await center.locator('[data-inbox-key],.cm-filter-count,[data-fact="note"]').count(),0);await assertInboxCountsCleared();assert(!(await center.innerText()).includes('PRIVATE D7 ABSENCE REASON'));checked(engine+': D7 offline clears current private Inbox snapshot and counts');
    releaseActions=null;await mp.route('**/api/manager/action-center',route=>new Promise(resolve=>{releaseActions=()=>route.continue().then(resolve);}));await management.setOffline(false);await mp.evaluate(()=>window.dispatchEvent(new Event('online')));await center.getByText('Reconnecting…',{exact:true}).waitFor();assert.equal(await center.locator('[data-inbox-key],.cm-filter-count,[data-fact="note"]').count(),0);await assertInboxCountsCleared();await assertNoInboxEmpty();assert(!(await center.innerText()).includes('PRIVATE D7 ABSENCE REASON'));await waitUntil(()=>releaseActions);await releaseActions();await mp.unroute('**/api/manager/action-center');await readyInbox();checked(engine+': D7 reconnect waits for new current protected sources');
    await (await selectInboxItem('TIME_OFF:'+timeOffId)).click();await center.locator('.inbox-detail [data-fact="note"]').getByText('PRIVATE D7 ABSENCE REASON',{exact:true}).waitFor();await mp.route('**/api/manager/action-center',route=>route.fulfill({status:503,contentType:'application/json',body:'{"state":"unavailable"}'}));await recheckInbox();await center.getByText('The Inbox isn’t available right now.',{exact:true}).waitFor();assert.equal(await center.locator('[data-inbox-key],.cm-filter-count,[data-fact="note"]').count(),0);await assertInboxCountsCleared();assert(!(await center.innerText()).includes('PRIVATE D7 ABSENCE REASON'));await assertNoInboxEmpty();checked(engine+': D7 same-view revalidation through existing correction event renders unavailable and never empty');await mp.unroute('**/api/manager/action-center');
    await center.getByRole('button',{name:'Try again',exact:true}).click();await readyInbox();await (await selectInboxItem('TIME_OFF:'+timeOffId)).click();await center.locator('.inbox-detail [data-fact="note"]').getByText('PRIVATE D7 ABSENCE REASON',{exact:true}).waitFor();await mp.route('**/api/manager/action-center',route=>route.fulfill({status:403,contentType:'application/json',body:'{"state":"unavailable"}'}));await recheckInbox();await center.getByText('Sign in again to see your Inbox.',{exact:true}).waitFor();assert.equal(await center.locator('[data-inbox-key],.cm-filter-count,[data-fact="note"]').count(),0);await assertInboxCountsCleared();assert(!(await center.innerText()).includes('PRIVATE D7 ABSENCE REASON'));checked(engine+': D7 same-view revalidation authority loss clears Inbox snapshot');await mp.unroute('**/api/manager/action-center');
    assert.equal((await lp.request.post(app.url+'/api/manager/action-center',{headers:{origin:app.url,'x-nevora-action-center':'1','x-nevora-actor':'D3-L'},data:{weekStart:'2026-09-21'}})).status(),403);checked(engine+': D7 Lead denied management source');await q('DELETE FROM time_off_requests WHERE id=$1',[timeOffId]);await q('DELETE FROM time_entries WHERE id=$1',['D7-CURRENT-'+engine]);
    await mp.goto(centerUrl);await readyInbox();
    const d7Screen=join(evidence,engine+'-action-center-390.png');await mp.setViewportSize({width:390,height:1000});await mp.screenshot({path:d7Screen,fullPage:true});report.screenshots.push(d7Screen);
    const rejected=await boundCorrectionPost(mp.request,app.url+'/api/manager/time-corrections',{headers:{origin:app.url,'x-nevora-time-correction':'1'},data:{operationId:crypto.randomUUID(),requestId:submittedBody.requestId,expectedRevision:submittedBody.revision,decision:'REJECT'}});assert(rejected.ok());
    const uxWeek=engine==='chromium'?'2030-10-07':'2030-10-14',uxSchedule='ux3-'+engine;
    await q("INSERT INTO schedules(id,location_id,week_start,status,created_by) VALUES($1,'loc-1',$2,'DRAFT','QAOWNER')",[uxSchedule,uxWeek]);
    await q("INSERT INTO shifts(id,schedule_id,employee_id,date,start_time,end_time,notes) VALUES($1,$2,'D3-E',$3,'08:00','12:00','PRIVATE UX3 DRAFT')",[uxSchedule+'-draft',uxSchedule,uxWeek]);
    await ep.goto(app.url+'/app/schedule?week='+uxWeek);await ep.getByRole('heading',{name:'Schedule',exact:true,level:1}).waitFor();
    assert.match(await ep.locator('main').innerText(),/Schedule not published yet/);assert.equal(await ep.getByText(/^(Off — no assignment|Day off)$/).count(),0);assert(!(await ep.content()).includes('PRIVATE UX3 DRAFT'));assert.equal(await ep.getByText('8:00 AM – 12:00 PM',{exact:true}).count(),0);checked(engine+': UX-03 unpublished never confirms time off or discloses draft');
    for(const width of [320,390,768,1440]){await ep.setViewportSize({width,height:1000});assert(await ep.evaluate(()=>document.documentElement.scrollWidth<=document.documentElement.clientWidth+2));checked(engine+': UX-03 schedule geometry '+width);}
    await q('DELETE FROM shifts WHERE id=$1',[uxSchedule+'-draft']);await publishScheduleWithRevision({locationId:'loc-1',weekStart:uxWeek,managerId:'QAOWNER'},app.database.executor);
    await ep.reload();await ep.getByText('Day off',{exact:true}).waitFor();await ep.getByText(/^No shift (today|this day)\.$/).waitFor();const uxDays=ep.locator('nav[aria-label="Days in this week"] a');assert.equal(await uxDays.count(),7);for(const label of await uxDays.evaluateAll(links=>links.map(link=>link.getAttribute('aria-label'))))assert(!/assigned shift/.test(label),label);checked(engine+': UX-03 published empty week confirms no assignment');
    await q('ALTER TABLE schedules RENAME TO ux3_unavailable_schedules');
    try{await ep.goto(app.url+'/app/schedule?week='+uxWeek);await ep.getByText('Schedule unavailable',{exact:true}).first().waitFor();assert.equal(await ep.getByText(/^(Off — no assignment|Day off)$/).count(),0);checked(engine+': UX-03 actual unavailable schedule never confirms days off');}finally{await q('ALTER TABLE ux3_unavailable_schedules RENAME TO schedules');}
    await ep.goto(app.url+'/app');await ep.getByText(/published this week yet\. Shifts shown are published\.$|shifts are published\./).waitFor();assert.equal(await ep.getByText("You're all set.",{exact:true}).count(),0);assert.equal(await ep.getByText('You’re all caught up',{exact:true}).count(),0);checked(engine+': UX-03 Home unpublished stays unconfirmed');
    const {context:ownerContext,page:op}=await context(browser,'QAOWNER');
    const clockContext=await browser.newContext({viewport:{width:390,height:1000},serviceWorkers:'block'});await clockContext.route('**/*',route=>new URL(route.request().url()).origin===app.url?route.continue():route.abort());const cp=await clockContext.newPage();cp.setDefaultTimeout(15000);
    const pinA=engine==='chromium'?'2468':'6812',pinB=engine==='chromium'?'3579':'7935';
    for(const [id,first,pin] of [['UX5-A-'+engine,'Fictional Avery',pinA],['UX5-B-'+engine,'Fictional Blair',pinB]]){
      await q("INSERT INTO employees(id,first_name,last_name,phone,role,primary_location_id) VALUES($1,$2,'Recovery QA','555-0500','EMPLOYEE','loc-1')",[id,first]);await q("INSERT INTO employee_location_eligibility VALUES($1,'loc-1')",[id]);
      await op.goto(app.url+'/app/employees/'+id+'/clocker-pin');await op.getByLabel('New PIN',{exact:true}).fill(pin);await op.getByLabel('Confirm PIN',{exact:true}).fill(pin);const savePin=op.getByRole('button',{name:'Save',exact:true});assert.equal(await savePin.getAttribute('form'),'clocker-pin-form');await savePin.click();await op.getByRole('status').filter({hasText:'PIN saved'}).waitFor();await op.waitForLoadState('networkidle');
    }
    const devicesNavigation=await op.goto(app.url+'/app/settings/clocker',{waitUntil:'domcontentloaded'});assert(devicesNavigation?.ok());await op.getByRole('heading',{name:'Clocker devices',exact:true}).waitFor();await op.getByRole('button',{name:'Add device',exact:true}).click();const dialog=op.getByRole('dialog');await dialog.getByLabel('Device name',{exact:true}).fill('UX5 '+engine+' tablet');await dialog.getByRole('combobox',{name:'Location',exact:true}).selectOption('loc-1');await dialog.getByRole('button',{name:'Create setup code',exact:true}).click();await dialog.waitFor({state:'hidden'});
    const clockerEvidence={engine,pinAttempts:[],responses:[]};(report.clockerSetup??=[]).push(clockerEvidence);
    cp.on('response',response=>{if(new URL(response.url()).pathname!=='/api/clocker/2/pin')return;let action;try{action=response.request().postDataJSON()?.action;}catch{}if(clockerEvidence.responses.length===50)clockerEvidence.responses.shift();clockerEvidence.responses.push({action:['clear','verify','status'].includes(action)?action:'other',status:response.status()});});
    const displayedSetup=op.getByRole('textbox',{name:/^Setup code · expires /});assert.equal(await displayedSetup.getAttribute('readonly'),'');const setupCode=await displayedSetup.inputValue();assert(setupCode);currentPage=cp;await cp.goto(app.url+'/clocker/2');await cp.getByRole('textbox',{name:'Setup code',exact:true}).fill(setupCode);await cp.getByRole('button',{name:'Connect tablet',exact:true}).click();
    async function pin(value){
      currentPage=cp;await cp.bringToFront();await cp.waitForFunction(()=>document.hasFocus()&&document.visibilityState==='visible'&&navigator.onLine);
      await cp.getByRole('heading',{name:'Enter your PIN',exact:true}).waitFor();await cp.waitForFunction(()=>{const i=document.querySelector('input[name=pin]');return i&&!i.matches(':disabled');});
      const attempt=await cp.evaluate(()=>({focused:document.hasFocus(),visibility:document.visibilityState,online:navigator.onLine}));clockerEvidence.pinAttempts.push(attempt);
      for(const digit of value)await cp.getByRole('button',{name:'Number '+digit,exact:true}).click();
      attempt.enteredDigits=await cp.locator('input[name=pin]').evaluate(input=>input.value.length);assert.equal(attempt.enteredDigits,4);
      await cp.getByRole('button',{name:'Continue',exact:true}).click();attempt.submitted=true;
    }
    let clockWrites=0;const observeClockWrite=request=>{if(request.method()==='POST'&&/^\/api\/clocker\/[^/]+\/punch$/.test(new URL(request.url()).pathname))clockWrites++;};cp.on('request',observeClockWrite);
    await pin(pinA);await cp.getByRole('button',{name:'Clock In',exact:true}).waitFor();let dropped=false;
    await cp.route('**/api/clocker/2/punch',async route=>{if(!dropped&&route.request().postDataJSON()?.operation==='execute'){dropped=true;assert.equal((await route.fetch()).status(),200);await route.abort('failed');}else await route.continue();});
    await cp.getByRole('button',{name:'Clock In',exact:true}).click();await cp.getByRole('button',{name:'Check Action Status',exact:true}).waitFor();assert(dropped);
    const saved=await cp.evaluate(()=>{const key=Object.keys(sessionStorage).find(k=>k.startsWith('nevora.clocker.pending.v2:2:'));return {key,text:sessionStorage.getItem(key)};});assert(saved.text);const reference=JSON.parse(saved.text).command.commandId;
    if(engine==='chromium')await cp.evaluate(saved=>{sessionStorage.setItem('nevora.clocker.pending.v1:2',saved.text);sessionStorage.removeItem(saved.key);},saved);
    await cp.unroute('**/api/clocker/2/punch');await cp.reload();await pin(pinB);await cp.getByRole('button',{name:'Clock In',exact:true}).waitFor();assert.equal(await cp.getByRole('button',{name:'Check Action Status',exact:true}).count(),0);checked(engine+': UX-05 identity switch preserves prior uncertain intent and enables own work');
    await cp.getByRole('button',{name:'Clock In',exact:true}).evaluate(button=>{button.click();button.click();});await cp.getByRole('heading',{name:'Clock In Recorded',exact:true}).waitFor();
    assert.equal((await q("SELECT count(*)::int AS n FROM time_entries WHERE employee_id=$1",['UX5-B-'+engine]))[0].n,1);assert.equal(await cp.evaluate(key=>sessionStorage.getItem(key),engine==='chromium'?'nevora.clocker.pending.v1:2':saved.key),saved.text);checked(engine+': UX-05 next employee records exactly once without discarding prior receipt');
    await cp.getByRole('button',{name:'Done',exact:true}).click();await pin(pinA);await cp.getByRole('button',{name:'Check Action Status',exact:true}).click();await cp.getByRole('heading',{name:'Clock In Recorded',exact:true}).waitFor();assert.equal((await q("SELECT count(*)::int AS n FROM time_entries WHERE employee_id=$1",['UX5-A-'+engine]))[0].n,1);assert.equal(await cp.evaluate(key=>sessionStorage.getItem(key),engine==='chromium'?'nevora.clocker.pending.v1:2':saved.key),null);checked(engine+': UX-05 refresh and re-PIN recover original receipt without replay');
    cp.off('request',observeClockWrite);assert(clockWrites>0,'Replay observer detects the actual location-scoped Clocker punch requests');clockWrites=0;
    await op.bringToFront();currentPage=op;await op.waitForLoadState('networkidle');
    const heldScripts=[],scriptPattern='**/_next/static/**/*.js';let releaseScripts;
    const scriptsReady=new Promise(resolve=>{releaseScripts=resolve;});
    const holdScript=route=>{if(new URL(route.request().url()).origin!==app.url)return route.abort();const pending=scriptsReady.then(()=>route.continue());heldScripts.push(pending);return pending;};
    await op.route(scriptPattern,holdScript);
    let preinitReceiptRequests=0;
    const beforeInitialization=request=>{if(new URL(request.url()).pathname==='/api/manager/clocker-recovery')preinitReceiptRequests++;};
    op.on('request',beforeInitialization);
    try{
      await op.goto(app.url+'/app/clocker-recovery',{waitUntil:'commit'});
      await op.getByRole('heading',{name:'Current view needs a fresh check',exact:true}).waitFor();
      assert.equal(await op.getByLabel('Saved reference',{exact:true}).count(),0,'Company Access withholds the recovery form before initialization');
      assert.equal(await op.getByRole('button',{name:'Check',exact:true}).count(),0,'Receipt submission is unavailable before fresh authorization');
      assert.equal(preinitReceiptRequests,0,'No receipt lookup is sent while initialization is held');
    }finally{op.off('request',beforeInitialization);releaseScripts();await Promise.all(heldScripts);}
    await op.getByLabel('Saved reference',{exact:true}).waitFor();assert(await op.getByLabel('Saved reference',{exact:true}).isEnabled());assert(await op.getByRole('button',{name:'Check',exact:true}).isEnabled());checked(engine+': UX-05 delayed scripts withhold receipt controls until current access and initialization');
    const receiptRequests=[],receiptReplies=[];
    const requestReceipt=request=>{if(request.url().endsWith('/api/manager/clocker-recovery'))receiptRequests.push({commandId:request.postDataJSON()?.commandId});};
    const responseReceipt=async response=>{if(!response.url().endsWith('/api/manager/clocker-recovery'))return;try{const data=await response.json();receiptReplies.push({status:response.status(),state:data.state,reason:data.reason,commandId:data.commandId,observedAt:data.observedAt,validForMs:data.validForMs,receiptCount:data.receipts?.length});}catch{receiptReplies.push({status:response.status(),body:'unavailable'});}};
    op.on('request',requestReceipt);op.on('response',responseReceipt);
    try{await op.getByLabel('Saved reference',{exact:true}).fill(reference);await op.getByRole('button',{name:'Check',exact:true}).click();await op.getByRole('status').filter({hasText:'Recorded action found'}).waitFor();assert.match(await op.locator('main').innerText(),/Fictional Avery Recovery QA/);}
    catch(error){console.log(JSON.stringify({engine,receiptReview:{requests:receiptRequests,replies:receiptReplies,ui:await op.locator('main').innerText(),input:await op.getByLabel('Saved reference',{exact:true}).inputValue(),browser:await op.evaluate(()=>({visibility:document.visibilityState,focused:document.hasFocus(),readyState:document.readyState}))}}));throw error;}
    finally{op.off('request',requestReceipt);op.off('response',responseReceipt);}
    checked(engine+': UX-05 actual manager-assisted immutable receipt review');
    const immutableClock=()=>q('SELECT to_jsonb(c) AS row FROM clocker_command_ledger c WHERE command_id=$1 ORDER BY employee_id,device_id',[reference]);
    const beforeReceiptRefresh=await immutableClock();assert(beforeReceiptRefresh.length>0);
    let focusReads=0,releaseReceiptRead;const recoveryRead=route=>{focusReads++;return new Promise(resolve=>{releaseReceiptRead=()=>route.continue().then(resolve);});};await op.route('**/api/manager/clocker-recovery',recoveryRead);
    op.on('request',observeClockWrite);
    try{
    await op.evaluate(()=>{window.dispatchEvent(new Event('focus'));return new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)));});assert.equal(focusReads,0,'Duplicate foreground focus does not restart a current receipt lookup');assert.equal(await op.getByRole('status').filter({hasText:'Recorded action found'}).count(),1);
    await op.evaluate(()=>window.dispatchEvent(new Event('blur')));assert.equal(await op.getByRole('status').filter({hasText:'Recorded action found'}).count(),0);
    const freshReceipt=op.waitForResponse(response=>new URL(response.url()).pathname==='/api/manager/clocker-recovery');await op.evaluate(()=>window.dispatchEvent(new Event('focus')));await waitUntil(()=>releaseReceiptRead);assert.equal(focusReads,1);assert.equal(await op.getByRole('status').filter({hasText:'Recorded action found'}).count(),0,'Prior receipt stays hidden while the fresh protected read is held');const release=releaseReceiptRead;releaseReceiptRead=undefined;await release();const freshReceiptResponse=await freshReceipt;assert.equal(freshReceiptResponse.status(),200);assert.equal((await freshReceiptResponse.json()).commandId,reference);
    await op.getByRole('status').filter({hasText:'Recorded action found'}).waitFor();assert.equal(await op.getByLabel('Saved reference',{exact:true}).inputValue(),reference);assert.match(await op.locator('main').innerText(),/Fictional Avery Recovery QA/);assert.deepEqual(await immutableClock(),beforeReceiptRefresh);assert.equal(clockWrites,0,'Receipt refresh never replays a clock command');
    }finally{if(releaseReceiptRead)await releaseReceiptRead();await op.unroute('**/api/manager/clocker-recovery',recoveryRead);op.off('request',observeClockWrite);}
    checked(engine+': UX-05 access return retains the selected reference, withholds private receipts until a fresh protected read, and preserves the immutable clock ledger');
    const missingReference=crypto.randomUUID(),beforeMissingReceipt=await immutableClock();clockWrites=0;op.on('request',observeClockWrite);
    try{
      await op.getByLabel('Saved reference',{exact:true}).fill(missingReference);const missingReply=op.waitForResponse(response=>new URL(response.url()).pathname==='/api/manager/clocker-recovery'&&response.request().postDataJSON()?.commandId===missingReference);await op.getByRole('button',{name:'Check',exact:true}).click();
      const response=await missingReply;assert.equal(response.status(),200);const missing=await response.json();assert.equal(missing.state,'ready');assert.equal(missing.commandId,missingReference);assert.deepEqual(missing.receipts,[]);
      await op.getByText('Not recorded yet',{exact:true}).waitFor();await op.getByText('It may still be in progress. They check again on the same tablet.',{exact:true}).waitFor();assert.equal(await op.getByRole('status').filter({hasText:'Recorded action found'}).count(),0);assert.deepEqual(await immutableClock(),beforeMissingReceipt);assert.equal(clockWrites,0,'A missing receipt never replays or cancels a clock command');
    }finally{op.off('request',observeClockWrite);}
    checked(engine+': UX-05 manager missing receipt remains unconfirmed without mutating or replaying the recorded command');
    await ownerContext.setOffline(true);await op.evaluate(()=>window.dispatchEvent(new Event('offline')));assert.equal(await op.getByRole('status').filter({hasText:'Recorded action found'}).count(),0);checked(engine+': UX-05 manager review offline privacy clearing');
    const recoveryId='UX1-'+engine,recoveryEmail='ux1-'+engine+'@example.invalid';
    recoveryEmployee=recoveryId;
    await q("INSERT INTO employees(id,first_name,last_name,phone,email,role,primary_location_id) VALUES($1,'Fictional Recovery','Employee','555-0101',$2,'EMPLOYEE','loc-1')",[recoveryId,recoveryEmail]);await q("INSERT INTO employee_credentials(employee_id,password_hash,must_change_password) VALUES($1,$2,false)",[recoveryId,password]);await q("INSERT INTO employee_location_eligibility VALUES($1,'loc-1')",[recoveryId]);
    const {context:recoveree,page:rp}=await context(browser,recoveryId),publicContext=await browser.newContext({viewport:{width:390,height:1000},serviceWorkers:'block'});await publicContext.route('**/*',route=>new URL(route.request().url()).origin===app.url?route.continue():route.abort());const fp=await publicContext.newPage();currentPage=fp;fp.setDefaultTimeout(15000);fp.on('pageerror',error=>report.errors.push('Recovery runtime: '+error.message));
    const recovery={engine,calls:[]},calls=new Map();report.recovery.push(recovery);
    fp.on('request',request=>{const path=new URL(request.url()).pathname;if(!['/api/auth/recovery','/api/auth/reset-access'].includes(path))return;const call={path,startedAt:Date.now()};calls.set(request,call);recovery.calls.push(call);});
    fp.on('response',async response=>{const call=calls.get(response.request());if(!call)return;call.status=response.status();call.elapsedMs=Date.now()-call.startedAt;try{const data=await response.json();call.state=['accepted','reset','invalid','unavailable'].includes(data.state)?data.state:'unclassified';}catch{call.state='unreadable';}});
    fp.on('requestfailed',request=>{const call=calls.get(request);if(!call)return;call.elapsedMs=Date.now()-call.startedAt;call.failure=/aborted|cancelled/i.test(request.failure()?.errorText??'')?'cancelled':'failed';});
    const openReset=async path=>{if(new URL(fp.url()).pathname==='/reset-access')await fp.goto('about:blank');const response=await fp.goto(app.url+path,{waitUntil:'domcontentloaded'});assert(response?.ok());await fp.getByLabel('Recovery code',{exact:true}).waitFor();await fp.waitForFunction(()=>window.location.hash==='');};
    const boundaryHeaders={origin:app.url,'x-nevora-recovery':'1'},unknownReply=await fp.request.post(app.url+'/api/auth/recovery',{headers:boundaryHeaders,data:{employeeId:'UNKNOWN-'+engine,email:'unknown@example.invalid'}});assert.equal(unknownReply.status(),202);const unknownBody=await unknownReply.json();
    await fp.goto(app.url+'/login');await fp.getByRole('link',{name:'Forgot access?',exact:true}).click();await fp.getByRole('heading',{name:'Forgot access',exact:true}).waitFor();await fp.getByLabel('Employee ID',{exact:true}).fill(recoveryId);await fp.getByLabel('Recovery email',{exact:true}).fill(recoveryEmail);
    for(const width of [320,390,768,1440]){await fp.setViewportSize({width,height:1000});assert(await fp.evaluate(()=>document.documentElement.scrollWidth<=document.documentElement.clientWidth+2));checked(engine+': UX-01 recovery geometry '+width);}
    assert(await fp.locator('form').evaluate(form=>form.checkValidity()),'Recovery form validity');assert.equal(await fp.getByLabel('Recovery email',{exact:true}).inputValue(),recoveryEmail);
    const sent=fp.waitForResponse(response=>response.url().endsWith('/api/auth/recovery')); await fp.getByRole('button',{name:'Request recovery',exact:true}).click();const knownReply=await sent;assert.equal(knownReply.status(),202);assert.deepEqual(await knownReply.json(),unknownBody);await waitUntil(()=>smtp.messages.some(m=>m.recipient.includes(recoveryEmail)));checked(engine+': UX-01 known/unknown identical response and fictional registered-channel delivery');
    const mail=smtp.messages.find(m=>m.recipient.includes(recoveryEmail)).body.replace(/=\r\n/g,'').replace(/=3D/g,'='),emailProof=mail.match(/reset-access#proof=([A-Za-z0-9_-]{43})/)?.[1];assert(emailProof);
    await openReset('/reset-access#proof='+emailProof);await fp.getByLabel('Recovery code',{exact:true}).waitFor();await fp.waitForFunction(()=>window.location.hash==='');assert.equal(await fp.getByLabel('Recovery code',{exact:true}).inputValue(),emailProof);checked(engine+': UX-01 fragment proof consumed into form without URL/query exposure');
    await fp.getByLabel('New password',{exact:true}).fill('Fictional Reset Password '+engine);await fp.getByLabel('Confirm password',{exact:true}).fill('Fictional Reset Password '+engine);await fp.getByRole('button',{name:'Reset password',exact:true}).click();await fp.getByText(/Password reset. All portal sessions/).waitFor();
    const staleSession=await rp.request.post(app.url+'/api/timecards',{headers:{origin:app.url,'x-nevora-timecards':'1','x-nevora-actor':recoveryId},data:{startDate:'2026-09-21',endDate:'2026-09-27'}});assert([401,403].includes(staleSession.status()));assert.equal((await q("SELECT count(*)::int AS n FROM employee_sessions WHERE employee_id=$1",[recoveryId]))[0].n,0);checked(engine+': UX-01 reset invalidates current portal authority');
    await openReset('/reset-access#proof='+emailProof);await fp.getByLabel('New password',{exact:true}).fill('Fictional Attempt Reuse');await fp.getByLabel('Confirm password',{exact:true}).fill('Fictional Attempt Reuse');await fp.getByRole('button',{name:'Reset password',exact:true}).click();await fp.getByText(/expired, was already used/).waitFor();checked(engine+': UX-01 reused proof rejected with recovery path');
    await mp.goto(app.url+'/app/account-recovery');const assisted=await issueAssistedRecovery(mp,recoveryId,'Fictional in-person identity confirmed through established workplace process.');
    await openReset('/reset-access');await fp.getByLabel('Recovery code',{exact:true}).fill(assisted);await fp.getByLabel('New password',{exact:true}).fill(TEST_PASSWORD);await fp.getByLabel('Confirm password',{exact:true}).fill(TEST_PASSWORD);recovery.assistedSubmit=await fp.evaluate(()=>({focused:document.hasFocus(),visibility:document.visibilityState,online:navigator.onLine}));await fp.getByRole('button',{name:'Reset password',exact:true}).click();await fp.getByText(/Password reset. All portal sessions/).waitFor();checked(engine+': UX-01 inaccessible-channel assisted proof resets through the same protocol');
    await fp.getByRole('link',{name:'Sign in with new password',exact:true}).click();await fp.getByLabel('Employee ID',{exact:true}).fill(recoveryId);await fp.getByLabel('Password',{exact:true}).fill(TEST_PASSWORD);await Promise.all([fp.waitForURL(u=>u.pathname==='/app'),fp.getByRole('button',{name:'Sign in',exact:true}).click()]);checked(engine+': UX-01 normal new-password sign-in after reset');
    await mp.bringToFront();await mp.goto(app.url+'/app/account-recovery');const expiring=await issueAssistedRecovery(mp,recoveryId,'Fictional established verification for expiry regression.');
    await q("UPDATE password_recovery_proofs SET created_at=clock_timestamp()-interval '16 minutes',expires_at=clock_timestamp()-interval '1 minute' WHERE token_hash=$1",[createHash('sha256').update(expiring).digest('hex')]);await openReset('/reset-access#proof='+expiring);await fp.getByLabel('New password',{exact:true}).fill('Fictional Expired Reset');await fp.getByLabel('Confirm password',{exact:true}).fill('Fictional Expired Reset');await fp.getByRole('button',{name:'Reset password',exact:true}).click();await fp.getByText(/expired, was already used/).waitFor();checked(engine+': UX-01 expired proof gives the safe recovery path');
    lifecycle='context-close';
    for(const context of [recoveree,publicContext,clockContext,ownerContext,lead,employee,management]){
      for(const page of context.pages())await page.waitForLoadState('networkidle');
      await context.close();
    }
    await q('TRUNCATE timecard_revisions');
  }
  report.scenarioComplete=true;
}catch(error){
  if(currentPage){
    report.failurePage=await currentPage.evaluate(()=>({path:location.pathname.replace(/[A-Za-z0-9_-]{32,}/g,'[opaque]'),focused:document.hasFocus(),visibility:document.visibilityState,online:navigator.onLine,clockerPin:document.querySelector('[data-clocker-pin]')?.getAttribute('data-clocker-pin'),alerts:document.querySelectorAll('[role=alert]').length})).catch(()=>({state:'unavailable'}));
    report.failureLifecycle=await currentPage.evaluate(()=>window.__nevoraLifecycle?.slice(-120)??null).catch(()=>null);console.log(JSON.stringify({failureLifecycle:report.failureLifecycle}));
    await currentPage.screenshot({path:join(evidence,'recovery-failure.png'),fullPage:true,mask:[currentPage.locator('input,textarea')]}).catch(()=>{});
  }
  if(app){
    try{
      report.databaseWaits=await app.database.executor.query({text:"SELECT state,wait_event_type,wait_event,count(*)::int AS connections FROM pg_stat_activity WHERE datname=current_database() AND pid<>pg_backend_pid() GROUP BY state,wait_event_type,wait_event",values:[]});
      if(recoveryEmployee)report.recoveryProofs=await app.database.executor.query({text:'SELECT method,used_at IS NOT NULL AS consumed,retired_at IS NOT NULL AS retired FROM password_recovery_proofs WHERE employee_id=$1 ORDER BY created_at',values:[recoveryEmployee]});
    }catch{report.databaseDiagnostics='unavailable';}
    try{
      const log=(await readFile(join(app.root,'next.log'),'utf8')).replace(/\[[0-9;]*m/g,'').replaceAll(String.fromCharCode(27),'');
      report.recoveryServerRequests=log.split('\n').flatMap(line=>{
        const match=line.match(/\b(POST|GET) (\/api\/auth\/(?:recovery|reset-access)|\/api\/manager\/account-recovery) (\d{3}) in ([\d.]+)(ms|s)/);
        const duration=pattern=>{const value=line.match(pattern);return value?Number(value[1])*(value[2]==='s'?1000:1):null;};
        return match?[{method:match[1],path:match[2],status:Number(match[3]),elapsedMs:Number(match[4])*(match[5]==='s'?1000:1),compileMs:duration(/compile: ([\d.]+)(ms|s)/),renderMs:duration(/render: ([\d.]+)(ms|s)/)}]:[];
      }).slice(-32);
    }catch{report.serverDiagnostics='unavailable';}
  }
  report.errors.push(error instanceof Error?error.stack:String(error));process.exitCode=1;console.error(error);
}
finally{
  lifecycle='browser-close';
  for(const browser of browsers)await browser.close();if(app)await app.close();if(smtp)await smtp.close();
  report.runtimeClosed=true;
  Object.assign(report,finalizeRoleRedirectDiagnostics(report,'D3-M'));
  await writeFile(join(evidence,'report.json'),JSON.stringify(report,null,2));
  if(report.errors.length)process.exitCode=1;
  console.log(JSON.stringify({checkpoint,sourceClean:report.sourceClean,checks:report.checks.length,errors:report.errors.length,evidence}));
}
