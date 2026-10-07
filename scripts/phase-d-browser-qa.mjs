import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {createRequire} from 'node:module';
import {homedir} from 'node:os';
import {join,resolve} from 'node:path';
import {mkdir,writeFile} from 'node:fs/promises';
import {createOwnedNextApp} from '../src/test/integration/owned-next-app.ts';
import {seedOwnedApp,TEST_PASSWORD} from '../src/test/integration/owned-app-fixture.ts';
import {hashPassword} from '../src/lib/auth/password.ts';
const evidence=resolve(process.env.PHASE_D_EVIDENCE_DIR??join(homedir(),'.codex/visualizations/nevora-phase-d-d3-d8'));
await mkdir(evidence,{recursive:true});
const runtime=createRequire(process.env.NEVORA_PLAYWRIGHT_RUNTIME_PACKAGE??join(homedir(),'.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/package.json'));
const {chromium,webkit}=runtime('playwright');
const checkpoint=execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),tree=execFileSync('git',['rev-parse','HEAD^{tree}'],{encoding:'utf8'}).trim();
const dirty=execFileSync('git',['status','--porcelain=v1'],{encoding:'utf8'}).trim();
if(process.env.PHASE_D_EXPECTED_SHA){assert.equal(checkpoint,process.env.PHASE_D_EXPECTED_SHA);assert.equal(dirty,'','Exact candidate browser verification requires a clean worktree');}
const report={checkpoint,tree,sourceClean:dirty==='',checks:[],errors:[],screenshots:[],limitations:['Owned local runtime is not hosted verification.','Chromium/WebKit automation is not physical-device or screen-reader acceptance.']};
async function waitUntil(test){const deadline=Date.now()+15000;while(!test()){if(Date.now()>deadline)throw Error('Expected browser request did not arrive');await new Promise(resolve=>setTimeout(resolve,10));}}
const checked=name=>{report.checks.push(name);console.log('[Phase D browser] PASS '+name);};
let app;const browsers=[];
const url='/app/timecards?start=2026-09-21&end=2026-09-27';
try{
  app=await createOwnedNextApp(evidence,{clockerPinKey:"3d".repeat(32),clockerPunchEnabled:true});const q=(text,values=[])=>app.database.executor.query({text,values});
  await seedOwnedApp(app.database.executor);const password=await hashPassword(TEST_PASSWORD);
  for(const [id,first,role] of [['D3-E','Avery','EMPLOYEE'],['D3-M','Morgan','MANAGER'],['D3-L','Taylor','LEAD']]){
    await q("INSERT INTO employees(id,first_name,last_name,phone,role,primary_location_id) VALUES($1,$2,'Period QA','555-0300',$3,'loc-1')",[id,first,role]);
    await q('INSERT INTO employee_credentials(employee_id,password_hash,must_change_password) VALUES($1,$2,false)',[id,password]);
    await q("INSERT INTO employee_location_eligibility VALUES($1,'loc-1')",[id]);
  }
  await q("INSERT INTO clocker_devices(id,location_id,name,active) VALUES('d3-device','loc-1','Fictional D3 tablet',true)");
  await q("INSERT INTO time_entries(id,employee_id,location_id,device_id,clock_in_at,clock_out_at,status,version) VALUES('D3-UI','D3-E','loc-1','d3-device','2026-09-22T12:00:00Z','2026-09-22T20:00:00Z','CLOCKED_OUT',1)");
  await q("INSERT INTO break_entries(id,time_entry_id,break_start_at,break_end_at) VALUES('D3-UI-B','D3-UI','2026-09-22T16:00:00Z','2026-09-22T16:30:00Z')");
  async function context(browser,id){
    const context=await browser.newContext({viewport:{width:1440,height:1000},serviceWorkers:'block'});
    await context.route('**/*',route=>{const target=new URL(route.request().url());return ['http:','https:'].includes(target.protocol)&&target.origin!==app.url?route.abort():route.continue();});
    const page=await context.newPage();page.setDefaultTimeout(15000);
    await page.goto(app.url+'/login');await page.getByLabel('Employee ID',{exact:true}).fill(id);await page.getByLabel('Password',{exact:true}).fill(TEST_PASSWORD);
    await Promise.all([page.waitForURL(u=>u.pathname==='/app'),page.getByRole('button',{name:'Sign In',exact:true}).click()]);
    return {context,page};
  }
  for(const [engine,type] of [['chromium',chromium],['webkit',webkit]]){
    const browser=await type.launch({headless:true});browsers.push(browser);
    const {context:employee,page:ep}=await context(browser,'D3-E');await ep.goto(app.url+url);
    await ep.getByRole('heading',{name:'Your timecard',exact:true}).waitFor();assert.equal(await ep.getByRole('article').count(),1);
    assert.match(await ep.getByRole('article').innerText(),/8h 0m/);assert.match(await ep.getByRole('article').innerText(),/0h 30m/);checked(engine+': employee self period and break totals');
    await ep.getByRole('link',{name:/Request a correction/}).waitFor();
    for(const width of [320,375,390,430,768,1024,1440]){
      await ep.setViewportSize({width,height:1000});
      const geometry=await ep.evaluate(()=>({width:document.documentElement.clientWidth,scroll:document.documentElement.scrollWidth,
        controls:[...document.querySelectorAll('section[aria-label="Your period timecard"] button,section[aria-label="Your period timecard"] input')].map(e=>e.getBoundingClientRect().height)}));
      assert(geometry.scroll<=geometry.width+2,`${engine} ${width} page overflow`);assert(geometry.controls.every(h=>h>=43.5));checked(`${engine}: employee geometry ${width}`);
    }
    await ep.getByLabel('Period start').focus();assert(await ep.getByLabel('Period start').evaluate(e=>document.activeElement===e));await ep.keyboard.press('Tab');checked(engine+': period keyboard focus');
    const {context:management,page:mp}=await context(browser,'D3-M');await mp.goto(app.url+url);
    const card=mp.getByRole('article').filter({has:mp.getByRole('heading',{name:'Avery Period QA',exact:true})});await card.waitFor();
    await card.getByRole('button',{name:'Approve timecard',exact:true}).click();await card.getByText('approved',{exact:true}).waitFor();
    await card.getByRole('button',{name:'Finalize period',exact:true}).click();await card.getByText('finalized',{exact:true}).waitFor();
    await card.getByLabel('Reopen reason').fill('Fictional correction review needs a new revision.');await card.getByRole('button',{name:'Reopen period',exact:true}).click();await card.getByText('reopened',{exact:true}).waitFor();
    assert.match(await card.innerText(),/Historical revisions \(3\)/);checked(engine+': actual Manager approve-finalize-reopen with history');
    for(const width of [320,375,390,430,768,1024,1440]){
      await mp.setViewportSize({width,height:1000});
      assert(await mp.evaluate(()=>document.documentElement.scrollWidth<=document.documentElement.clientWidth+2),`${engine} ${width} manager overflow`);checked(`${engine}: manager geometry ${width}`);
    }
    const screen=join(evidence,`${engine}-timecards-390.png`);await mp.setViewportSize({width:390,height:1000});await mp.screenshot({path:screen,fullPage:true});report.screenshots.push(screen);
    await employee.setOffline(true);await ep.evaluate(()=>window.dispatchEvent(new Event('offline')));assert.equal(await ep.getByRole('article').count(),0);checked(engine+': offline clears private period data');
    await employee.setOffline(false);await ep.evaluate(()=>window.dispatchEvent(new Event('online')));await ep.getByRole('heading',{name:'Your timecard',exact:true}).waitFor();
    await ep.route('**/api/timecards',route=>route.fulfill({status:503,contentType:'application/json',body:'{"state":"unavailable","reason":"read_failed"}'}));
    await ep.getByRole('button',{name:'Refresh timecards',exact:true}).click();await ep.getByRole('status').filter({hasText:'Timecards unavailable'}).waitFor();assert.equal(await ep.getByRole('article').count(),0);checked(engine+': read error clears stale totals');
    await ep.unroute('**/api/timecards');
    const {context:lead,page:lp}=await context(browser,'D3-L');await lp.goto(app.url+url);await lp.getByRole('heading',{name:'Your timecard',exact:true}).waitFor();
    assert.equal(await lp.getByRole('button',{name:'Approve timecard',exact:true}).count(),0);checked(engine+': Lead self-service without management controls');
    await card.getByRole('button',{name:'Approve timecard',exact:true}).click();await card.getByText('approved',{exact:true}).waitFor();await card.getByRole('button',{name:'Finalize period',exact:true}).click();await card.getByText('finalized',{exact:true}).waitFor();
    await mp.goto(app.url+'/app/payroll-export?start=2026-09-21&end=2026-09-27');await mp.getByRole('heading',{name:'Choose finalized employees',exact:true}).waitFor();
    await mp.getByRole('checkbox',{name:/Avery Period QA/}).check();await mp.getByRole('button',{name:'Generate reviewed export',exact:true}).click();await mp.getByRole('button',{name:'Download mapped CSV',exact:true}).waitFor();checked(engine+': finalized neutral export receipt verified');
    for(const [name,extension] of [['Download mapped CSV','csv'],['Download canonical time record','json']]){const waiting=mp.waitForEvent('download');await mp.getByRole('button',{name,exact:true}).click();const file=await waiting;await file.saveAs(join(evidence,`${engine}-payroll-neutral.${extension}`));}checked(engine+': canonical and mapped export downloads');
    await mp.getByText('Configure an import mapping',{exact:true}).click();await mp.getByLabel('Profile name',{exact:true}).fill('Fictional customer CSV');await mp.getByLabel('Payroll product / edition',{exact:true}).fill('Fictional provider');await mp.getByRole('checkbox',{name:/I verified the required fields/}).check();await mp.getByRole('button',{name:'Save mapping profile',exact:true}).click();await mp.getByRole('status').filter({hasText:'Mapping saved as revision 1'}).waitFor();checked(engine+': current manager configurable mapping save');
    for(const width of [320,375,390,430,768,1024,1440]){await mp.setViewportSize({width,height:1000});const geometry=await mp.evaluate(()=>({width:document.documentElement.clientWidth,scroll:document.documentElement.scrollWidth,scrollX:window.scrollX,inner:window.innerWidth,overflow:[...document.querySelectorAll('*')].filter(e=>(e.getBoundingClientRect().right+window.scrollX>document.documentElement.clientWidth+2||e.scrollWidth>e.clientWidth+2)&&getComputedStyle(e).display!=='none').map(e=>({tag:e.tagName,class:e.className,width:e.getBoundingClientRect().width,right:e.getBoundingClientRect().right,scroll:e.scrollWidth,client:e.clientWidth,minWidth:getComputedStyle(e).minWidth})).slice(-25)}));if(geometry.scroll>geometry.width+2){console.log(JSON.stringify(geometry));await mp.screenshot({path:join(evidence,`${engine}-mapping-overflow.png`),fullPage:true});}assert(geometry.scroll<=geometry.width+2,`${engine}: mapping overflow ${width}`);checked(`${engine}: mapping geometry ${width}`);}
    await mp.goto(app.url+'/app/reports?start=2026-09-21&end=2026-09-27');await mp.getByRole('heading',{name:'Period summary',exact:true}).waitFor();
    assert.match(await mp.locator('main').innerText(),/8h 0m/);assert.match(await mp.locator('main').innerText(),/Scheduled totals and differences are unavailable/);checked(engine+': report canonical totals and unpublished-plan distinction');
    for(const width of [320,375,390,430,768,1024,1440]){await mp.setViewportSize({width,height:1000});assert(await mp.evaluate(()=>document.documentElement.scrollWidth<=document.documentElement.clientWidth+2));checked(`${engine}: reports geometry ${width}`);}
    await mp.getByLabel('First day',{exact:true}).focus();assert(await mp.getByLabel('First day',{exact:true}).evaluate(e=>document.activeElement===e));await mp.keyboard.press('Tab');checked(engine+': report keyboard');
    const reportScreen=join(evidence,`${engine}-reports-390.png`);await mp.setViewportSize({width:390,height:1000});await mp.screenshot({path:reportScreen,fullPage:true});report.screenshots.push(reportScreen);
    const downloaded=mp.waitForEvent('download');await mp.getByRole('button',{name:'Download CSV',exact:true}).click();const download=await downloaded;const csvPath=join(evidence,`${engine}-report.csv`);await download.saveAs(csvPath);checked(engine+': protected CSV download');
    await mp.emulateMedia({media:'print'});assert.equal(await mp.locator('.mobile-nav:visible').count(),0);assert.equal(await mp.getByRole('button',{name:'Download CSV',exact:true}).isVisible(),false);assert(await mp.getByRole('heading',{name:'Period summary',exact:true}).isVisible());checked(engine+': printable report without navigation or controls');
    if(engine==='chromium'){const pdf=await mp.pdf({path:join(evidence,'period-report.pdf'),preferCSSPageSize:true,printBackground:true});assert.equal(pdf.subarray(0,5).toString(),'%PDF-');checked(engine+': generated useful PDF artifact');}
    await mp.emulateMedia({media:'screen'});
    await management.setOffline(true);await mp.evaluate(()=>window.dispatchEvent(new Event('offline')));await mp.getByRole('heading',{name:'Reports unavailable offline'}).waitFor();assert.equal(await mp.getByRole('heading',{name:'Period summary',exact:true}).count(),0);checked(engine+': report offline privacy clearing');
    await management.setOffline(false);await mp.evaluate(()=>window.dispatchEvent(new Event('online')));await mp.getByRole('heading',{name:'Period summary',exact:true}).waitFor();
    await mp.route('**/api/reports',route=>route.fulfill({status:403,contentType:'application/json',body:'{"state":"unavailable"}'}));await mp.getByRole('button',{name:'Refresh',exact:true}).click();await mp.getByRole('heading',{name:'Reports access ended'}).waitFor();assert.equal(await mp.getByRole('heading',{name:'Period summary',exact:true}).count(),0);checked(engine+': report authorization-loss clearing');
    await lp.goto(app.url+'/app/reports');await lp.waitForURL(u=>u.pathname==='/app');checked(engine+': Lead denied reports');
    let releaseQueue;await mp.route('**/api/manager/time-corrections',route=>new Promise(resolve=>{releaseQueue=()=>route.continue().then(resolve);}));
    await mp.goto(app.url+'/app?view=attendance');await mp.getByText('Loading correction requests',{exact:true}).waitFor();assert.equal(await mp.getByText('No correction requests',{exact:true}).count(),0);checked(engine+': UX-04 loading never claims empty');
    await waitUntil(()=>releaseQueue);assert(releaseQueue);await releaseQueue();await mp.unroute('**/api/manager/time-corrections');await mp.getByText('No correction requests',{exact:true}).waitFor();checked(engine+': UX-04 verified empty');
    const requestId=crypto.randomUUID(),submitted=await ep.request.post(app.url+'/api/employee/time-corrections',{headers:{origin:app.url,'x-nevora-time-correction':'1'},data:{operationId:requestId,kind:'MISSING_ENTRY',locationId:'loc-1',proposedStartAt:'2026-09-28T12:00:00Z',proposedEndAt:'2026-09-28T13:00:00Z',reason:'Fictional completed work for queue verification'}});assert(submitted.ok());const submittedBody=await submitted.json();
    await mp.evaluate(()=>window.dispatchEvent(new Event('nevora:time-correction-changed')));await mp.locator('.manager-correction-row').filter({hasText:'Avery Period QA'}).waitFor();checked(engine+': UX-04 actual pending queue');
    await management.setOffline(true);await mp.evaluate(()=>window.dispatchEvent(new Event('offline')));await mp.getByText('Correction requests unavailable offline',{exact:true}).waitFor();assert.equal(await mp.locator('.manager-correction-row').count(),0);assert.equal(await mp.getByText('No correction requests',{exact:true}).count(),0);checked(engine+': UX-04 offline clears names and no false all-clear');
    releaseQueue=null;await mp.route('**/api/manager/time-corrections',route=>new Promise(resolve=>{releaseQueue=()=>route.continue().then(resolve);}));await management.setOffline(false);await mp.evaluate(()=>window.dispatchEvent(new Event('online')));await mp.getByText('Reconnecting to correction requests',{exact:true}).waitFor();assert.equal(await mp.getByText('No correction requests',{exact:true}).count(),0);await waitUntil(()=>releaseQueue);assert(releaseQueue);await releaseQueue();await mp.unroute('**/api/manager/time-corrections');await mp.locator('.manager-correction-row').waitFor();checked(engine+': UX-04 reconnecting remains unconfirmed until response');
    await mp.route('**/api/manager/time-corrections',route=>route.fulfill({status:403,contentType:'application/json',body:'{"state":"unavailable"}'}));await mp.evaluate(()=>window.dispatchEvent(new Event('nevora:time-correction-changed')));await mp.getByText('Correction access ended',{exact:true}).waitFor();assert.equal(await mp.locator('.manager-correction-row').count(),0);assert.equal(await mp.getByText('No correction requests',{exact:true}).count(),0);checked(engine+': UX-04 authorization-loss privacy state');await mp.unroute('**/api/manager/time-corrections');
    const rejected=await mp.request.post(app.url+'/api/manager/time-corrections',{headers:{origin:app.url,'x-nevora-time-correction':'1'},data:{operationId:crypto.randomUUID(),requestId:submittedBody.requestId,expectedRevision:submittedBody.revision,decision:'REJECT'}});assert(rejected.ok());
    const uxWeek=engine==='chromium'?'2030-10-07':'2030-10-14',uxSchedule='ux3-'+engine;
    await q("INSERT INTO schedules(id,location_id,week_start,status,created_by) VALUES($1,'loc-1',$2,'DRAFT','QAOWNER')",[uxSchedule,uxWeek]);
    await q("INSERT INTO shifts(id,schedule_id,employee_id,date,start_time,end_time,notes) VALUES($1,$2,'D3-E',$3,'08:00','12:00','PRIVATE UX3 DRAFT')",[uxSchedule+'-draft',uxSchedule,uxWeek]);
    await ep.goto(app.url+'/app/schedule?week='+uxWeek);await ep.getByRole('heading',{name:'My Schedule',exact:true}).waitFor();
    assert.match(await ep.locator('main').innerText(),/Schedule not published yet/);assert.equal(await ep.getByText('Off — no assignment',{exact:true}).count(),0);assert(!(await ep.content()).includes('PRIVATE UX3 DRAFT'));assert.equal(await ep.getByText('8:00 AM – 12:00 PM',{exact:true}).count(),0);checked(engine+': UX-03 unpublished never confirms time off or discloses draft');
    for(const width of [320,390,768,1440]){await ep.setViewportSize({width,height:1000});assert(await ep.evaluate(()=>document.documentElement.scrollWidth<=document.documentElement.clientWidth+2));checked(engine+': UX-03 schedule geometry '+width);}
    await q('DELETE FROM shifts WHERE id=$1',[uxSchedule+'-draft']);await q("UPDATE schedules SET status='PUBLISHED' WHERE id=$1",[uxSchedule]);
    await ep.reload();await ep.getByText('Off — no assignment',{exact:true}).first().waitFor();assert.equal(await ep.getByText('Off — no assignment',{exact:true}).count(),7);checked(engine+': UX-03 published empty week confirms no assignment');
    await ep.goto(app.url+'/app');await ep.getByText('Schedule not published yet',{exact:true}).first().waitFor();assert.equal(await ep.getByText('You’re all caught up',{exact:true}).count(),0);checked(engine+': UX-03 Home unpublished stays unconfirmed');
    const {context:ownerContext,page:op}=await context(browser,'QAOWNER');
    const clockContext=await browser.newContext({viewport:{width:390,height:1000},serviceWorkers:'block'});await clockContext.route('**/*',route=>new URL(route.request().url()).origin===app.url?route.continue():route.abort());const cp=await clockContext.newPage();cp.setDefaultTimeout(15000);
    const pinA=engine==='chromium'?'2468':'6812',pinB=engine==='chromium'?'3579':'7935';
    for(const [id,first,pin] of [['UX5-A-'+engine,'Fictional Avery',pinA],['UX5-B-'+engine,'Fictional Blair',pinB]]){
      await q("INSERT INTO employees(id,first_name,last_name,phone,role,primary_location_id) VALUES($1,$2,'Recovery QA','555-0500','EMPLOYEE','loc-1')",[id,first]);await q("INSERT INTO employee_location_eligibility VALUES($1,'loc-1')",[id]);
      await op.goto(app.url+'/app/employees/'+id+'/clocker-pin');await op.getByLabel('New Clocker PIN',{exact:true}).fill(pin);await op.getByLabel('Confirm Clocker PIN',{exact:true}).fill(pin);await op.getByRole('button',{name:'Save PIN',exact:true}).click();await op.getByRole('status').filter({hasText:'PIN saved'}).waitFor();
    }
    await op.goto(app.url+'/app/settings/clocker');await op.getByRole('button',{name:'Add Device',exact:true}).click();const dialog=op.getByRole('dialog');await dialog.getByLabel('Device name',{exact:true}).fill('UX5 '+engine+' tablet');await dialog.getByRole('combobox',{name:'Location',exact:true}).selectOption('loc-1');await dialog.getByRole('button',{name:'Create Setup Code',exact:true}).click();await dialog.waitFor({state:'hidden'});
    const setupCode=await op.getByRole('textbox',{name:'Setup code',exact:true}).inputValue();await cp.goto(app.url+'/clocker/2');await cp.getByRole('textbox',{name:'Setup code',exact:true}).fill(setupCode);await cp.getByRole('button',{name:'Connect Tablet',exact:true}).click();
    async function pin(value){await cp.getByRole('heading',{name:'Enter Your PIN',exact:true}).waitFor();await cp.waitForFunction(()=>{const i=document.querySelector('input[name=pin]');return i&&!i.matches(':disabled');});for(const digit of value)await cp.getByRole('button',{name:'Number '+digit,exact:true}).click();await cp.getByRole('button',{name:'Continue',exact:true}).click();}
    await pin(pinA);await cp.getByRole('button',{name:'Clock In',exact:true}).waitFor();let dropped=false;
    await cp.route('**/api/clocker/2/punch',async route=>{if(!dropped&&route.request().postDataJSON()?.operation==='execute'){dropped=true;assert.equal((await route.fetch()).status(),200);await route.abort('failed');}else await route.continue();});
    await cp.getByRole('button',{name:'Clock In',exact:true}).click();await cp.getByRole('button',{name:'Check Action Status',exact:true}).waitFor();assert(dropped);
    const saved=await cp.evaluate(()=>{const key=Object.keys(sessionStorage).find(k=>k.startsWith('nevora.clocker.pending.v2:2:'));return {key,text:sessionStorage.getItem(key)};});assert(saved.text);const reference=JSON.parse(saved.text).command.commandId;
    if(engine==='chromium')await cp.evaluate(saved=>{sessionStorage.setItem('nevora.clocker.pending.v1:2',saved.text);sessionStorage.removeItem(saved.key);},saved);
    await cp.unroute('**/api/clocker/2/punch');await cp.reload();await pin(pinB);await cp.getByRole('button',{name:'Clock In',exact:true}).waitFor();assert.equal(await cp.getByRole('button',{name:'Check Action Status',exact:true}).count(),0);checked(engine+': UX-05 identity switch preserves prior uncertain intent and enables own work');
    await cp.getByRole('button',{name:'Clock In',exact:true}).evaluate(button=>{button.click();button.click();});await cp.getByRole('heading',{name:'Clock In Recorded',exact:true}).waitFor();
    assert.equal((await q("SELECT count(*)::int AS n FROM time_entries WHERE employee_id=$1",['UX5-B-'+engine]))[0].n,1);assert.equal(await cp.evaluate(key=>sessionStorage.getItem(key),engine==='chromium'?'nevora.clocker.pending.v1:2':saved.key),saved.text);checked(engine+': UX-05 next employee records exactly once without discarding prior receipt');
    await cp.getByRole('button',{name:'Done',exact:true}).click();await pin(pinA);await cp.getByRole('button',{name:'Check Action Status',exact:true}).click();await cp.getByRole('heading',{name:'Clock In Recorded',exact:true}).waitFor();assert.equal((await q("SELECT count(*)::int AS n FROM time_entries WHERE employee_id=$1",['UX5-A-'+engine]))[0].n,1);assert.equal(await cp.evaluate(key=>sessionStorage.getItem(key),engine==='chromium'?'nevora.clocker.pending.v1:2':saved.key),null);checked(engine+': UX-05 refresh and re-PIN recover original receipt without replay');
    await op.goto(app.url+'/app/clocker-recovery');await op.getByLabel('Saved action reference',{exact:true}).fill(reference);await op.getByRole('button',{name:'Check receipt',exact:true}).click();await op.getByRole('heading',{name:'Recorded action',exact:true}).waitFor();assert.match(await op.locator('main').innerText(),/Fictional Avery Recovery QA/);checked(engine+': UX-05 actual manager-assisted immutable receipt review');
    await op.getByLabel('Saved action reference',{exact:true}).fill(crypto.randomUUID());await op.getByRole('button',{name:'Check receipt',exact:true}).click();await op.getByText(/No committed receipt was observed/).waitFor();assert.match(await op.locator('main').innerText(),/absent receipt alone does not cancel/);checked(engine+': UX-05 manager missing receipt remains unconfirmed');
    await ownerContext.setOffline(true);await op.evaluate(()=>window.dispatchEvent(new Event('offline')));assert.equal(await op.getByRole('heading',{name:'Recorded action',exact:true}).count(),0);checked(engine+': UX-05 manager review offline privacy clearing');
    await clockContext.close();await ownerContext.close();
    await lead.close();await employee.close();await management.close();
    await q('TRUNCATE timecard_revisions');
  }
}catch(error){report.errors.push(error instanceof Error?error.stack:String(error));process.exitCode=1;console.error(error);}
finally{
  for(const browser of browsers)await browser.close();if(app)await app.close();
  await writeFile(join(evidence,'report.json'),JSON.stringify(report,null,2));
  console.log(JSON.stringify({checkpoint,sourceClean:report.sourceClean,checks:report.checks.length,errors:report.errors.length,evidence}));
}
