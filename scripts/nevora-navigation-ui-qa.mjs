import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {isAbsolute,join,resolve} from 'node:path';
import {mkdir,writeFile} from 'node:fs/promises';
import {createOwnedNextApp} from '../src/test/integration/owned-next-app.ts';
import {seedOwnedApp,seedOwnedScenario,TEST_PASSWORD} from '../src/test/integration/owned-app-fixture.ts';

assert(!process.env.DATABASE_URL,'Application database must remain unset');
assert(process.env.NEVORA_NAV_EVIDENCE_DIR?.startsWith('/'),'Explicit external evidence directory required');
assert(process.env.PLAYWRIGHT_RUNTIME_ROOT && isAbsolute(process.env.PLAYWRIGHT_RUNTIME_ROOT),'Explicit existing Playwright runtime required; no download');
const evidence=resolve(process.env.NEVORA_NAV_EVIDENCE_DIR);
const runtime=createRequire(join(process.env.PLAYWRIGHT_RUNTIME_ROOT,'package.json'));
const playwright=runtime('playwright');
const report={checks:[],errors:[],limitations:['Owned local transport and emulated Chromium/WebKit; no physical device certification.']};
let app;const browsers=[],contexts=[];
try{
 await mkdir(evidence,{recursive:true});app=await createOwnedNextApp(evidence);report.sourceManifest=join(app.root,'source-manifest.json');
 await seedOwnedApp(app.database.executor);const scenario=await seedOwnedScenario(app.database.executor,'NAV',0);
 for(const engine of ['chromium','webkit']){
  const browser=await playwright[engine].launch();browsers.push(browser);
  for(const [employeeId,path,target,label] of [['QAOWNER','/app/settings/clocker','manager-more-navigation','More navigation'],[scenario.actors[0],'/app/requests','employee-more-navigation','More']]){
   const name=engine+': '+target+' keyboard focus does not depend on a future animation frame';
   const context=await browser.newContext({viewport:{width:390,height:844},hasTouch:true,isMobile:true,serviceWorkers:'block'});contexts.push(context);
   await context.route('**/*',r=>new URL(r.request().url()).origin===app.url?r.continue():r.abort());
   const page=await context.newPage();page.on('pageerror',e=>report.errors.push(e.message));page.setDefaultTimeout(12000);
   try{
    await page.goto(app.url+'/login');await page.getByLabel('Employee ID',{exact:true}).fill(employeeId);await page.getByLabel('Password',{exact:true}).fill(TEST_PASSWORD);
    await Promise.all([page.waitForURL(u=>u.pathname==='/app'),page.getByRole('button',{name:'Sign in',exact:true}).click()]);
    await page.waitForLoadState('networkidle');await page.goto(app.url+path);await page.waitForLoadState('networkidle');
    // A background or busy document may defer animation callbacks. Popover
    // keyboard focus is an interaction effect and must not depend on a paint.
    await page.evaluate(()=>{window.__navigationFrame=requestAnimationFrame;window.requestAnimationFrame=()=>0;});
    const trigger=page.getByRole('button',{name:label,exact:true}),menu=page.locator('#'+target);
    await trigger.focus();await page.keyboard.press('Enter');await menu.waitFor({state:'visible'});
    // The observer must not use the animation frames held by this regression.
    await page.waitForFunction(id=>document.getElementById(id)?.contains(document.activeElement),target,{timeout:500,polling:10});
    await page.keyboard.press('Escape');await menu.waitFor({state:'hidden'});assert(await trigger.evaluate(e=>e===document.activeElement));
    report.checks.push({name,status:'PASS'});console.log('PASS',name);
   }catch(e){
    const focus=await page.evaluate(id=>({activeTag:document.activeElement?.tagName,activeClass:document.activeElement?.className,focusInside:document.getElementById(id)?.contains(document.activeElement),open:document.getElementById(id)?.matches(':popover-open')}),target).catch(()=>null);
    report.checks.push({name,status:'FAIL',error:String(e),focus});console.log('FAIL',name,String(e));
   }
   finally{await page.evaluate(()=>{if(window.__navigationFrame)window.requestAnimationFrame=window.__navigationFrame;}).catch(()=>{});await context.close();}
  }
  await browser.close();
 }
}finally{
 for(const context of contexts)await context.close().catch(()=>{});for(const browser of browsers)await browser.close().catch(()=>{});await app?.close();
 await writeFile(join(evidence,'report.json'),JSON.stringify(report,null,2));
}
assert.equal(report.checks.length,4,'All role/engine combinations must execute');
process.exitCode=report.checks.some(x=>x.status==='FAIL')||report.errors.length?1:0;
