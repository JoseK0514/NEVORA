import {createRequire} from 'node:module';
import {writeFile} from 'node:fs/promises';
import {join,resolve} from 'node:path';
import assert from 'node:assert/strict';
import {createOwnedNextApp} from '../src/test/integration/owned-next-app.ts';
import {seedOwnedApp,TEST_PASSWORD} from '../src/test/integration/owned-app-fixture.ts';
import {captureSource,assertSourceUnchanged,externalEvidence} from './phase-e-owned.mjs';
import {safeBrowserFailure} from './release-browser-diagnostics.mjs';

const source=resolve(process.cwd()),custody=captureSource(source,process.env.PHASE_E_EXPECTED_SHA),evidence=externalEvidence(source,process.env.PHASE_E_EVIDENCE_DIR);
const runtime=createRequire(resolve('tools/ci-browser-runtime/package.json')),pw=runtime('playwright');
const report={checkpoint:custody.checkpoint,tree:custody.tree,sourceClean:true,cases:[],limitations:['Focused Clocker hydration regression; not full development acceptance.']};
await writeFile(join(evidence,'source-manifest.json'),JSON.stringify(custody,null,2));
let app;
try{
 app=await createOwnedNextApp(join(evidence,'shared-app'),{pinDevTypeReferences:true});await seedOwnedApp(app.database.executor);
 for(const engine of ['chromium','webkit']){
  const record={engine,status:'failed',errors:[]};report.cases.push(record);
  const browser=await pw[engine].launch({headless:true});let loginContext,context,page;let release;
  try{
   loginContext=await browser.newContext({serviceWorkers:'block'});
   await loginContext.route('**/*',route=>new URL(route.request().url()).origin===app.url?route.continue():route.abort());
   const login=await loginContext.newPage();login.setDefaultTimeout(15000);
   login.on('pageerror',error=>record.errors.push(safeBrowserFailure(error)));
   await login.goto(app.url+'/login');await login.getByLabel('Employee ID',{exact:true}).fill('QAOWNER');await login.getByLabel('Password',{exact:true}).fill(TEST_PASSWORD);
   await Promise.all([login.waitForURL(url=>url.pathname==='/app'),login.getByRole('button',{name:'Sign in',exact:true}).click()]);await login.waitForLoadState('networkidle');
   context=await browser.newContext({viewport:{width:1440,height:1000},serviceWorkers:'block'});await context.addCookies(await loginContext.cookies());await loginContext.close();loginContext=null;
   await context.route('**/*',route=>new URL(route.request().url()).origin===app.url?route.continue():route.abort());
   const barrier=new Promise(resolve=>{release=resolve;});let blocked=0;
   await context.route('**/_next/static/**',async route=>{if(new URL(route.request().url()).pathname.endsWith('.js')){blocked++;await barrier;}await route.continue();});
   page=await context.newPage();page.setDefaultTimeout(15000);page.on('pageerror',error=>record.errors.push(safeBrowserFailure(error)));
   await page.goto(app.url+'/app/settings/clocker',{waitUntil:'domcontentloaded'});
   await page.getByRole('heading',{name:'Clocker devices',exact:true}).waitFor();
   const add=page.getByRole('button',{name:'Add device',exact:true});
   record.before={blocked,disabled:await add.isDisabled(),openDialogs:await page.getByRole('dialog').count()};
   assert(blocked>0);assert.equal(record.before.disabled,true);assert.equal(record.before.openDialogs,0);
   release();await context.unroute('**/_next/static/**');
   await add.click();const dialog=page.getByRole('dialog',{name:'Add device',exact:true});await dialog.getByLabel('Device name',{exact:true}).fill('Fictional hydration tablet');
   await dialog.getByRole('combobox',{name:'Location',exact:true}).selectOption('loc-1');
   record.after={enabled:await add.isEnabled(),deviceName:await dialog.getByLabel('Device name',{exact:true}).inputValue(),location:await dialog.getByRole('combobox',{name:'Location',exact:true}).inputValue()};
   assert.equal(record.after.enabled,true);assert.equal(record.after.deviceName,'Fictional hydration tablet');assert.equal(record.after.location,'loc-1');
   await dialog.getByRole('button',{name:'Cancel',exact:true}).click();await dialog.waitFor({state:'hidden'});
   await add.press('Enter');await dialog.getByLabel('Device name',{exact:true}).waitFor();record.keyboardOpened=true;
   await dialog.getByRole('button',{name:'Cancel',exact:true}).click();await dialog.waitFor({state:'hidden'});
   assert.deepEqual(record.errors,[]);record.status='passed';
  }catch(error){record.failure=safeBrowserFailure(error);}finally{
   release?.();await page?.screenshot({path:join(evidence,engine+'-clocker-hydration.png'),fullPage:true}).catch(()=>{});await loginContext?.close();await context?.close();await browser.close();record.closed=true;
   await writeFile(join(evidence,'probe-report.json'),JSON.stringify(report,null,2));console.log(JSON.stringify(record));
  }
 }
}finally{
 if(app){await app.close();report.appClosed=true;}assertSourceUnchanged(source,custody);report.sourceUnchanged=true;
 report.status=report.cases.length===2&&report.cases.every(item=>item.status==='passed'&&item.closed)?'passed':'failed';
 await writeFile(join(evidence,'probe-report.json'),JSON.stringify(report,null,2));if(report.status!=='passed')process.exitCode=1;
}
