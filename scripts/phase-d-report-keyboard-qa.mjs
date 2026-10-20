import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {execFileSync} from 'node:child_process';
import {mkdir,writeFile} from 'node:fs/promises';
import {homedir} from 'node:os';
import {join,resolve} from 'node:path';
import {createOwnedNextApp} from '../src/test/integration/owned-next-app.ts';
import {seedOwnedApp,TEST_PASSWORD} from '../src/test/integration/owned-app-fixture.ts';
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
  browser=await pw[engine].launch({headless:true});const context=await browser.newContext({viewport:{width:390,height:1000},serviceWorkers:'block'});
  await context.route('**/*',r=>new URL(r.request().url()).origin!==app.url?r.abort():r.continue());const page=await context.newPage();page.setDefaultTimeout(15000);page.on('pageerror',e=>{if(e.message.endsWith('due to access control checks.')&&e.message.includes(new URL(app.url).host+'/api/'))report.networkCancellations.push({engine,error:String(e)});else report.errors.push({name:engine+' runtime',error:String(e)});});
  await page.goto(app.url+'/login');await page.getByLabel('Employee ID',{exact:true}).fill('QAOWNER');await page.getByLabel('Password',{exact:true}).fill(TEST_PASSWORD);await Promise.all([page.waitForURL(u=>u.pathname==='/app'),page.getByRole('button',{name:'Sign in',exact:true}).click()]);
  // The report responds before WebKit's load event settles in this owned dev
  // runtime. DOM readiness plus the real report heading is the test precondition.
  const navigationStarted=Date.now();
  const response=await page.goto(app.url+'/app/reports?start=2026-09-21&end=2026-09-27',{waitUntil:'domcontentloaded'});
  assert(response?.ok(),'Report navigation must return a successful response');
  await page.getByRole('heading',{name:'Hours by person',exact:true}).waitFor();
  report.navigation.push({engine,waitUntil:'domcontentloaded',status:response.status(),elapsedMs:Date.now()-navigationStarted});
  for(const width of [320,375,390,430,768,1024,1440]){
   await page.setViewportSize({width,height:1000});
   await Promise.all([page.waitForResponse(r=>new URL(r.url()).pathname==='/api/reports'&&r.request().method()==='POST'),page.getByRole('button',{name:'Refresh',exact:true}).click()]);await page.waitForFunction(()=>document.querySelector('button[aria-label="Refresh"]')?.getAttribute('aria-busy')!=='true');await page.getByRole('heading',{name:'Hours by person',exact:true}).waitFor();
   const tab=process.platform==='darwin'&&engine==='webkit'?'Alt+Tab':'Tab';
   const backTab=process.platform==='darwin'&&engine==='webkit'?'Alt+Shift+Tab':'Shift+Tab';
   const details=page.locator('details').filter({has:page.locator('summary').filter({hasText:'Period details'})});
   const summary=details.locator(':scope > summary');
   await check(engine+' report native keyboard '+width,async()=>{
    const exporter=page.getByRole('button',{name:'Export',exact:true});await exporter.focus();await page.keyboard.press('Enter');
    await page.getByRole('button',{name:'Print / Save PDF',exact:true}).waitFor();await page.keyboard.press('Escape');await page.getByRole('button',{name:'Print / Save PDF',exact:true}).waitFor({state:'hidden'});
    await summary.focus();if(!await details.evaluate(e=>e.open))await page.keyboard.press('Enter');await until(()=>details.evaluate(e=>e.open));
    await details.getByRole('heading',{name:'Scheduled vs recorded',exact:true}).waitFor();
    const scrolls=details.locator('.wb-table-scroll[role="region"]');
    const names=['Scheduled vs recorded columns','Hours by employee columns','Hours by location columns','Hours by position columns'];
    assert.deepEqual(await scrolls.evaluateAll(nodes=>nodes.map(e=>e.getAttribute('aria-label'))),names);
    const overflow=[];
    for(let i=0;i<4;i++){
     const region=scrolls.nth(i);const g=await region.evaluate(e=>{
      const bounds=e.getBoundingClientRect();return {width:e.clientWidth,scroll:e.scrollWidth,name:e.getAttribute('aria-label'),headers:[...e.querySelectorAll('thead th')].map(c=>c.textContent.trim()),cells:[...e.querySelectorAll('tbody th,tbody td')].map(c=>{const box=c.getBoundingClientRect(),range=document.createRange();range.selectNodeContents(c);const text=range.getBoundingClientRect();return {text:(c.querySelector('.wb-cell-value')??c).textContent.trim(),visible:box.width>0&&box.height>0,unclipped:c.scrollWidth<=c.clientWidth+2&&text.left>=bounds.left-2&&text.right<=bounds.right+2};})};
     });report.geometry.push({engine,viewportWidth:width,region:i,...g});
     assert.deepEqual(g.headers,i===0?['Employee','Recorded time']:['Name','Recorded time','Breaks recorded']);assert(g.cells.some(c=>c.text==='8h'),'Known recorded hours remain in every table');
     if(i<2)assert(g.cells.some(c=>c.text==='LongReportEmployee'.repeat(4)+' QA'),'Complete fictional long name remains');
     if(g.scroll>g.width+2)overflow.push(i);else assert(g.cells.every(c=>c.visible&&c.unclipped),'All nonoverflowing data cells must be visible and unclipped');
    }
    const focused=()=>page.evaluate(()=>{const e=document.activeElement;return {tag:e?.tagName,text:e?.textContent?.trim(),href:e?.getAttribute('href'),region:e?.matches('.wb-table-scroll')?e.getAttribute('aria-label'):null};});
    const path=[],reached=[];await summary.focus();report.keyPaths.push({engine,viewportWidth:width,path,overflow,reached,start:await focused(),open:await details.evaluate(e=>e.open)});
    for(let step=0;step<30;step++){
     await page.keyboard.press(tab);const active=await focused();path.push(active);
     assert(await page.evaluate(()=>document.hasFocus()),'Native traversal must remain in the foreground page');
     if(active.text==='Review timecards'&&active.tag==='A')break;
     assert(await details.evaluate(e=>e.contains(document.activeElement)),'Native traversal must stay inside details until its exit link');
     const i=names.indexOf(active.region);
     if(i>=0){
      reached.push(i);const region=scrolls.nth(i);assert.notEqual(await region.evaluate(e=>getComputedStyle(e).outlineWidth),'0px','Visible region focus is required');
      if(overflow.includes(i)){
       for(let n=0;n<100&&!await region.evaluate(e=>e.scrollLeft+e.clientWidth>=e.scrollWidth-2);n++)await page.keyboard.press('ArrowRight',{delay:70});
       await until(()=>region.evaluate(e=>e.scrollLeft+e.clientWidth>=e.scrollWidth-2));report.keyPaths.push({engine,viewportWidth:width,region:i,direction:'right',scrollLeft:await region.evaluate(e=>e.scrollLeft)});
       for(let n=0;n<100&&!await region.evaluate(e=>e.scrollLeft<=2);n++)await page.keyboard.press('ArrowLeft',{delay:70});await until(()=>region.evaluate(e=>e.scrollLeft<=2));report.keyPaths.push({engine,viewportWidth:width,region:i,direction:'left',scrollLeft:await region.evaluate(e=>e.scrollLeft)});
      }
     }
    }
    assert.equal(path.at(-1)?.text,'Review timecards','Tab must reach the native exit without trapping focus');
    assert.deepEqual(path.filter(e=>e.tag==='A'&&e.href?.startsWith('#')).map(e=>e.href),['#report-hours','#report-attendance','#report-changes','#report-approvals']);
    assert(overflow.every(i=>reached.includes(i)),'Every overflowing region must be reached by native keyboard');
    for(const expected of path.slice(0,-1).reverse()){await page.keyboard.press(backTab);assert.deepEqual(await focused(),expected,'Shift+Tab retraces the actual native entry path');}
    await page.keyboard.press(backTab);assert(await summary.evaluate(e=>document.activeElement===e),'Reverse traversal exits to native summary');
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
