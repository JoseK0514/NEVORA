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
const checked=name=>{report.checks.push(name);console.log('[Phase D browser] PASS '+name);};
let app;const browsers=[];
const url='/app/timecards?start=2026-09-21&end=2026-09-27';
try{
  app=await createOwnedNextApp(evidence);const q=(text,values=[])=>app.database.executor.query({text,values});
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
    await lead.close();await employee.close();await management.close();
    await q('TRUNCATE timecard_revisions');
  }
}catch(error){report.errors.push(error instanceof Error?error.stack:String(error));process.exitCode=1;console.error(error);}
finally{
  for(const browser of browsers)await browser.close();if(app)await app.close();
  await writeFile(join(evidence,'report.json'),JSON.stringify(report,null,2));
  console.log(JSON.stringify({checkpoint,sourceClean:report.sourceClean,checks:report.checks.length,errors:report.errors.length,evidence}));
}
