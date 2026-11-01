import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {execFileSync} from 'node:child_process';
import {mkdir,writeFile} from 'node:fs/promises';
import {homedir} from 'node:os';
import {join,resolve} from 'node:path';
import {createOwnedNextApp} from '../src/test/integration/owned-next-app.ts';
import {seedOwnedApp,TEST_PASSWORD} from '../src/test/integration/owned-app-fixture.ts';
import {waitForDisclosureReady} from './browser-render-readiness.mjs';
const runtime=createRequire(process.env.NEVORA_PLAYWRIGHT_RUNTIME_PACKAGE??join(homedir(),'.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/package.json'));
const pw=runtime('playwright');
const evidence=resolve(process.env.PHASE_D_REMEDIATION_EVIDENCE_DIR);
await mkdir(evidence,{recursive:true});
const checkpoint=execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),tree=execFileSync('git',['rev-parse','HEAD^{tree}'],{encoding:'utf8'}).trim();
const sourceClean=execFileSync('git',['status','--porcelain'],{encoding:'utf8'}).trim()==='';
if(process.env.PHASE_D_EXPECTED_SHA){assert.equal(checkpoint,process.env.PHASE_D_EXPECTED_SHA);assert(sourceClean);}
const report={checkpoint,tree,sourceClean,checks:[],errors:[],geometry:[],keyPaths:[],accessibility:[],networkCancellations:[],navigation:[]};
let app,browser;
async function check(name,fn){try{await fn();report.checks.push(name);console.log('PASS '+name);}catch(error){report.errors.push({name,error:String(error.stack??error)});console.log('FAIL '+name);}await writeFile(join(evidence,'report.json'),JSON.stringify(report,null,2));}
async function until(fn){const deadline=Date.now()+2000;while(!await fn()){if(Date.now()>deadline)throw Error('Native keyboard scrolling did not reach the expected column');await new Promise(r=>setTimeout(r,20));}}
try{
 app=await createOwnedNextApp(evidence);await seedOwnedApp(app.database.executor);
 const q=(text,values=[])=>app.database.executor.query({text,values});
 await q("INSERT INTO employees(id,first_name,last_name,phone,role,primary_location_id) VALUES('KEY-E',$1,'QA','555-0900','EMPLOYEE','loc-1')",['LongReportEmployee'.repeat(4)]);
 await q("INSERT INTO clocker_devices(id,location_id,name,active) VALUES('key-device','loc-1','Fictional keyboard device',true)");
 await q("INSERT INTO time_entries(id,employee_id,location_id,device_id,clock_in_at,clock_out_at,status,version) VALUES('KEY-T','KEY-E','loc-1','key-device','2026-09-22T12:00:00Z','2026-09-22T20:00:00Z','CLOCKED_OUT',1)");
 for(const engine of ['webkit','chromium']){
  browser=await pw[engine].launch({headless:true});const context=await browser.newContext({viewport:{width:1440,height:1000},serviceWorkers:'block'});
  await context.route('**/*',r=>new URL(r.request().url()).origin!==app.url?r.abort():r.continue());const page=await context.newPage();page.setDefaultTimeout(15000);page.on('pageerror',e=>{if(e.message.endsWith('due to access control checks.')&&e.message.includes(new URL(app.url).host+'/api/'))report.networkCancellations.push({engine,error:String(e)});else report.errors.push({name:engine+' runtime',error:String(e)});});
  await page.goto(app.url+'/login');await page.getByLabel('Employee ID',{exact:true}).fill('QAOWNER');await page.getByLabel('Password',{exact:true}).fill(TEST_PASSWORD);await Promise.all([page.waitForURL(u=>u.pathname==='/app'),page.getByRole('button',{name:'Sign in',exact:true}).click()]);
  // The report responds before WebKit's load event settles in this owned dev
  // runtime. DOM readiness plus the real Labor hours figure is the test precondition.
  const navigationStarted=Date.now();
  const response=await page.goto(app.url+'/app/reports?start=2026-09-21&end=2026-09-27',{waitUntil:'domcontentloaded'});
  assert(response?.ok(),'Report navigation must return a successful response');
  await page.locator('#ins-labor .c-ins__labor b').waitFor();
  report.navigation.push({engine,waitUntil:'domcontentloaded',status:response.status(),elapsedMs:Date.now()-navigationStarted});
  for(const width of [320,375,390,430,768,1024,1440]){
   await page.setViewportSize({width,height:1000});
   // Start each native traversal in a fresh document: WebKit preserves its
   // sequential focus starting point across refreshes of the reused disclosure.
   await page.goto(app.url+'/app/reports?start=2026-09-21&end=2026-09-27',{waitUntil:'domcontentloaded'});
   // Insights (board O-Insights, Release 1) is one page at every width: the periods, Labor hours, Attendance and Hours by
   // day with "How we count" (plus the period menu and Export on wide screens). The full tables (Period details,
   // Hours by person, their jump links and scroll regions) and the phone's former "This period · Review timecards" card are
   // no longer on screen; the tables are the printable report, checked below under print.
   await page.bringToFront();const labor=page.locator('#ins-labor .c-ins__labor b');await labor.waitFor();
   const tab=process.platform==='darwin'&&engine==='webkit'?'Alt+Tab':'Tab';
   const backTab=process.platform==='darwin'&&engine==='webkit'?'Alt+Shift+Tab':'Shift+Tab';
   const counted=page.locator('.c-page.c-ins details.c-ins__counted'),countedSummary=counted.locator(':scope > summary');
   await check(engine+' report native keyboard '+width,async()=>{
    assert.equal((await labor.innerText()).replace(/\s+/g,' '),'8 h','The Labor hours figure uses the persisted eight recorded hours');
    // Native order through every rendered control of the page, forward and then back, without leaving the foreground page.
    const order=await page.evaluate(()=>{const root=document.querySelector('.c-page.c-ins');const shown=e=>{const r=e.getBoundingClientRect(),s=getComputedStyle(e);return r.width>0&&r.height>0&&s.visibility!=='hidden';};
     window.__insOrder=[...root.querySelectorAll('a[href],button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled]),summary,[tabindex]:not([tabindex="-1"])')].filter(e=>!e.closest('.c-ins-print')&&shown(e));
     return window.__insOrder.map(e=>e.getAttribute('aria-label')||e.labels?.[0]?.textContent?.trim()||e.textContent.trim());});
    // R13: one period control per width. Phones show the segments (with Custom); tablets and desktop show the period menu.
    const segmentsShown=await page.locator('.c-ins__seg').isVisible(),pickerShown=await page.locator('.c-ins__tools .cm-insights__picker').isVisible();
    assert.notEqual(segmentsShown,pickerShown,'Exactly one period control is shown at '+width);
    assert(order.includes('How we count'),'The counting disclosure is a keyboard control');
    if(segmentsShown)assert(['This week','Last week','30 days','Custom'].every(name=>order.includes(name)),'The period segments are keyboard controls: '+JSON.stringify(order));
    else assert(order.some(name=>name.startsWith('Report period:'))&&order.includes('Export'),'The period menu and Export are keyboard controls: '+JSON.stringify(order));
    const at=index=>page.evaluate(index=>document.activeElement===window.__insOrder[index],index);
    await page.evaluate(()=>window.__insOrder[0].focus());assert(await at(0));
    // A native date field (Custom period) has its own month/day/year stops; focus stays on that field until it is left.
    const active=()=>page.evaluate(()=>{const e=document.activeElement;return {focused:document.hasFocus(),tag:e?.tagName,type:e?.getAttribute('type'),text:(e?.getAttribute('aria-label')||e?.textContent||'').trim().slice(0,60)};});
    const step=async(key,from,to)=>{for(let press=0;press<4;press++){await page.keyboard.press(key);const now=await active();assert(now.focused,'Native traversal must remain in the foreground page: '+key+' from '+order[from]+' '+JSON.stringify({order,now}));if(await at(to))return;assert(await at(from),'Focus moves only to the next control in order: '+key+' from '+order[from]+' '+JSON.stringify({order,now}));}assert.fail(key+' reaches '+order[to]+' in order');};
    for(let index=1;index<order.length;index++)await step(tab,index-1,index);
    // WebKit's Option+Shift+Tab from inside a native date field leaves the page instead of reaching the previous control (an
    // engine behavior; forward order through the same fields is native above). There, focus moves on programmatically.
    const engineSkips=[];
    for(let index=order.length-2;index>=0;index--){
     if(engine==='webkit'&&await page.evaluate(index=>window.__insOrder[index]?.matches('input[type="date"]'),index+1)){engineSkips.push(order[index+1]);await page.evaluate(index=>window.__insOrder[index].focus(),index);assert(await at(index));continue;}
     await step(backTab,index+1,index);
    }
    await countedSummary.focus();await page.keyboard.press('Enter');await until(()=>counted.evaluate(e=>e.open));await waitForDisclosureReady(counted);
    await counted.getByText('Hours come from clock-ins and include breaks.',{exact:true}).waitFor();assert(await counted.locator('time[datetime]').isVisible());
    await page.keyboard.press('Enter');await until(async()=>!await counted.evaluate(e=>e.open));
    const exporter=page.getByRole('button',{name:'Export',exact:true}),exportShown=await exporter.isVisible();
    if(exportShown){await exporter.focus();await page.keyboard.press('Enter');await page.getByRole('button',{name:'Print / Save PDF',exact:true}).waitFor();await page.keyboard.press('Escape');await page.getByRole('button',{name:'Print / Save PDF',exact:true}).waitFor({state:'hidden'});}
    // The printable report keeps every table with the complete fictional long name and its recorded hours.
    await page.emulateMedia({media:'print'});
    try{const printed=page.locator('.c-ins-print');assert(await printed.isVisible());
     const scrolls=printed.locator('.wb-table-scroll[role="region"]');assert.deepEqual(await scrolls.evaluateAll(nodes=>nodes.map(e=>e.getAttribute('aria-label'))),['Scheduled vs recorded columns','Hours by employee columns','Hours by location columns','Hours by position columns']);
     // Print expands the report's disclosures on the media change; wait for each table's rows to show.
     for(let index=0;index<2;index++)await scrolls.nth(index).locator('tbody th,tbody td').filter({hasText:'LongReportEmployee'.repeat(4)+' QA'}).first().waitFor({timeout:5000});
     for(let index=0;index<4;index++)await scrolls.nth(index).locator('.wb-cell-value').filter({hasText:/^8h$/}).first().waitFor({timeout:5000});}
    finally{await page.emulateMedia({media:'screen'});}
    report.keyPaths.push({engine,viewportWidth:width,order,forwardAndReverseKeyboard:true,reverseEngineSkips:engineSkips,countedDisclosure:true,exportMenu:exportShown,printedTables:true});
    assert(await page.evaluate(()=>document.documentElement.scrollWidth<=document.documentElement.clientWidth+2),'No page overflow');
   });
   await page.screenshot({path:join(evidence,engine+'-'+width+'.png'),fullPage:true});
   const axeFile=process.env.NEVORA_AXE_RUNTIME_FILE??runtime.resolve('axe-core/axe.min.js');if(!await page.evaluate(()=>!!window.axe))await page.addScriptTag({path:axeFile});
   await check(engine+' report scroll accessibility '+width,async()=>{const result=await page.evaluate(async()=>{const r=await window.axe.run(document,{runOnly:{type:'rule',values:['scrollable-region-focusable']}});return {violations:r.violations,passes:r.passes.length};});report.accessibility.push({engine,width,...result});assert.deepEqual(result.violations,[]);});
  }
  await context.close();await browser.close();browser=null;
 }
}finally{if(browser)await browser.close();if(app)await app.close();await writeFile(join(evidence,'report.json'),JSON.stringify(report,null,2));}
if(report.errors.length)process.exitCode=1;
