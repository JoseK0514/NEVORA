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
const report={checkpoint,tree,sourceClean,checks:[],errors:[],geometry:[],keyPaths:[],accessibility:[],networkCancellations:[]};
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
  await page.goto(app.url+'/login');await page.getByLabel('Employee ID',{exact:true}).fill('QAOWNER');await page.getByLabel('Password',{exact:true}).fill(TEST_PASSWORD);await Promise.all([page.waitForURL(u=>u.pathname==='/app'),page.getByRole('button',{name:'Sign In',exact:true}).click()]);
  await page.goto(app.url+'/app/reports?start=2026-09-21&end=2026-09-27');await page.getByRole('heading',{name:'Period summary',exact:true}).waitFor();
  for(const width of [320,375,390,430,768,1024,1440]){
   await page.setViewportSize({width,height:1000});
   await page.getByRole('button',{name:'Refresh',exact:true}).click();await page.getByRole('heading',{name:'Period summary',exact:true}).waitFor();
   await page.screenshot({path:join(evidence,engine+'-'+width+'.png'),fullPage:true});
   await check(engine+' report native keyboard '+width,async()=>{
    const scrolls=page.locator('section div').filter({has:page.locator('table')});
    assert.equal(await scrolls.count(),4);
    await page.getByRole('button',{name:'Print / Save PDF',exact:true}).focus();await page.keyboard.press('Tab');
    for(let i=0;i<4;i++){
     const region=scrolls.nth(i);
     assert(await region.evaluate(e=>document.activeElement===e),'Tab must reach report scrolling region '+i);
     const g=await region.evaluate(e=>({width:e.clientWidth,scroll:e.scrollWidth,left:e.scrollLeft,name:e.getAttribute('aria-label'),focusOutline:getComputedStyle(e).outlineWidth}));report.geometry.push({engine,viewportWidth:width,region:i,...g});
     if(i===0&&width===390)await page.screenshot({path:join(evidence,engine+'-390-focus.png'),fullPage:true});
     assert(g.name,'Scrolling region needs an accessible name');assert.notEqual(g.focusOutline,'0px','Visible focus is required');
     if(g.scroll>g.width){
      for(let n=0;n<100&&!await region.evaluate(e=>e.scrollLeft+e.clientWidth>=e.scrollWidth-2);n++)await page.keyboard.press('ArrowRight',{delay:70});
      await until(()=>region.evaluate(e=>e.scrollLeft+e.clientWidth>=e.scrollWidth-2));
      const end=await region.evaluate(e=>({scrollLeft:e.scrollLeft,clientWidth:e.clientWidth,scrollWidth:e.scrollWidth}));report.keyPaths.push({engine,viewportWidth:width,region:i,direction:'right',...end});
      for(let n=0;n<100&&!await region.evaluate(e=>e.scrollLeft<=2);n++)await page.keyboard.press('ArrowLeft',{delay:70});
      await until(()=>region.evaluate(e=>e.scrollLeft<=2));
      report.keyPaths.push({engine,viewportWidth:width,region:i,direction:'left',scrollLeft:await region.evaluate(e=>e.scrollLeft)});
     }
     await page.keyboard.press('Tab');
    }
    const exited=await page.evaluate(()=>({tag:document.activeElement?.tagName,text:document.activeElement?.textContent?.trim(),insideRegion:!!document.activeElement?.closest('[role=region]')}));
    assert(!exited.insideRegion&&['A','SUMMARY'].includes(exited.tag)&&['Review timecards','Report definitions'].includes(exited.text),'Tab must exit to the next native focus target without trapping focus');
    await page.keyboard.press('Shift+Tab');assert(await scrolls.last().evaluate(e=>document.activeElement===e));
    assert(await page.evaluate(()=>document.documentElement.scrollWidth<=document.documentElement.clientWidth+2),'No page overflow');
   });
  }
  const axeFile=process.env.NEVORA_AXE_RUNTIME_FILE??runtime.resolve('axe-core/axe.min.js');
  await page.addScriptTag({path:axeFile});
  await check(engine+' report scroll accessibility',async()=>{const result=await page.evaluate(async()=>{const r=await window.axe.run(document,{runOnly:{type:'rule',values:['scrollable-region-focusable']}});return {violations:r.violations,passes:r.passes.length};});report.accessibility.push({engine,...result});assert.deepEqual(result.violations,[]);});
  await context.close();await browser.close();browser=null;
 }
}finally{if(browser)await browser.close();if(app)await app.close();await writeFile(join(evidence,'report.json'),JSON.stringify(report,null,2));}
if(report.errors.length)process.exitCode=1;
