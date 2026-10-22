import {createRequire} from 'node:module';
import {mkdir,writeFile} from 'node:fs/promises';
import {join,resolve} from 'node:path';
import assert from 'node:assert/strict';
import {createOwnedNextApp} from '../src/test/integration/owned-next-app.ts';
import {seedOwnedApp} from '../src/test/integration/owned-app-fixture.ts';
import {runScenario} from './phase-e-navigation-browser-scenarios.mjs';
import {observeBrowserCell} from './phase-e-browser-qa.mjs';
import {verifyNavigationFetchDiagnostic} from './browser-navigation-diagnostic.mjs';
import {captureSource,assertSourceUnchanged,externalEvidence} from './phase-e-owned.mjs';
import {safeBrowserFailure} from './release-browser-diagnostics.mjs';

const source=resolve(process.cwd()),custody=captureSource(source,process.env.PHASE_E_EXPECTED_SHA),evidence=externalEvidence(source,process.env.PHASE_E_EVIDENCE_DIR);
const runtime=createRequire(resolve('tools/ci-browser-runtime/package.json')),pw=runtime('playwright'),axeFile=runtime.resolve('axe-core/axe.min.js');
assert.equal(runtime('playwright/package.json').version,'1.62.1');assert.equal(runtime('axe-core/package.json').version,'4.11.0');
const report={checkpoint:custody.checkpoint,tree:custody.tree,sourceClean:true,cases:[],limitations:['Repeated WebKit 375 diagnosis only; not the mandatory 70-cell development verification.']};
await writeFile(join(evidence,'source-manifest.json'),JSON.stringify(custody,null,2));
let browser;
try{
 browser=await pw.webkit.launch({headless:true});const navigationDiagnosticVerified=(await verifyNavigationFetchDiagnostic(browser)).verified;
 for(let index=0;index<7;index++){
  const directory=join(evidence,'case-'+index);await mkdir(directory,{recursive:true});
  const record={suite:'navigation',engine:'webkit',width:375,index,status:'failed',checks:[],errors:[]};report.cases.push(record);
  const observer=observeBrowserCell(record,record.errors,{navigationDiagnosticVerified});let app,context;
  try{
   app=await createOwnedNextApp(directory);await seedOwnedApp(app.database.executor);
   context=await browser.newContext({viewport:{width:375,height:1000},hasTouch:true,isMobile:true,serviceWorkers:'block'});
   await context.route('**/*',route=>{const url=new URL(route.request().url());if(['http:','https:'].includes(url.protocol)&&url.origin!==app.url){record.errors.push('External request refused');return route.abort();}return route.continue();});
   await observer.observeContext(context,'primary');const page=await context.newPage();page.setDefaultTimeout(15000);
   const result=await runScenario({app,browser,context,page,engine:'webkit',width:375,evidenceDirectory:directory,axeFile,runtimeErrors:observer});
   observer.assertClean();record.checks=result.checks;record.status='passed';
  }catch(error){record.failure=safeBrowserFailure(error,record);}
  finally{
   observer.setPhase('context-close');try{await context?.close();observer.assertClean();}catch(error){record.status='failed';record.contextFailure=safeBrowserFailure(error,record);}
   try{await app?.close();record.closed=true;}catch(error){record.status='failed';record.closureFailure=safeBrowserFailure(error,record);}
   await writeFile(join(evidence,'probe-report.json'),JSON.stringify(report,null,2));console.log(JSON.stringify({index,status:record.status,errors:record.errors.length}));
  }
 }
}finally{
 await browser?.close();assertSourceUnchanged(source,custody);
 report.sourceUnchanged=true;report.status=report.cases.length===7&&report.cases.every(item=>item.status==='passed'&&item.closed)?'passed':'failed';
 await writeFile(join(evidence,'probe-report.json'),JSON.stringify(report,null,2));if(report.status!=='passed')process.exitCode=1;
}
