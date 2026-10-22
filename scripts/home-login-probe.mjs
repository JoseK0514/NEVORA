import {createRequire} from 'node:module';
import {mkdir,writeFile} from 'node:fs/promises';
import {join,resolve} from 'node:path';
import {createOwnedNextApp} from '../src/test/integration/owned-next-app.ts';
import {seedOwnedApp} from '../src/test/integration/owned-app-fixture.ts';
import {runScenario} from './phase-e-home-browser-scenarios.mjs';
import {observeBrowserCell} from './phase-e-browser-qa.mjs';
import {verifyNavigationFetchDiagnostic} from './browser-navigation-diagnostic.mjs';
import {captureSource,assertSourceUnchanged,externalEvidence} from './phase-e-owned.mjs';
import {safeBrowserFailure} from './release-browser-diagnostics.mjs';

const source=resolve(process.cwd()),custody=captureSource(source,process.env.PHASE_E_EXPECTED_SHA),evidence=externalEvidence(source,process.env.PHASE_E_EVIDENCE_DIR);
const runtime=createRequire(resolve('tools/ci-browser-runtime/package.json')),pw=runtime('playwright'),axeFile=runtime.resolve('axe-core/axe.min.js');
const report={checkpoint:custody.checkpoint,tree:custody.tree,sourceClean:true,cases:[],limitations:['Focused first four shared-server Home WebKit cells and native secondary sign-in; not full development acceptance.']};
await writeFile(join(evidence,'source-manifest.json'),JSON.stringify(custody,null,2));
const browser=await pw.webkit.launch({headless:true});let app;
try{
 const navigationDiagnosticVerified=(await verifyNavigationFetchDiagnostic(browser)).verified;
 app=await createOwnedNextApp(join(evidence,'shared-app'),{pinDevTypeReferences:true});await seedOwnedApp(app.database.executor);
 for(const width of [320,375,390,430]){
  const directory=join(evidence,'case-'+width);await mkdir(directory,{recursive:true});
  const record={suite:'home',engine:'webkit',width,status:'failed',checks:[],errors:[]};report.cases.push(record);
  const observer=observeBrowserCell(record,record.errors,{navigationDiagnosticVerified});let context;
  try{
   context=await browser.newContext({viewport:{width,height:1000},hasTouch:true,isMobile:true,serviceWorkers:'block'});
   await context.route('**/*',route=>{const url=new URL(route.request().url());if(['http:','https:'].includes(url.protocol)&&url.origin!==app.url){record.errors.push('External request refused');return route.abort();}return route.continue();});
   await observer.observeContext(context,'primary');const page=await context.newPage();page.setDefaultTimeout(15000);
   const result=await runScenario({app,browser,context,page,engine:'webkit',width,evidenceDirectory:directory,axeFile,runtimeErrors:observer});observer.assertClean();record.checks=result.checks;record.status='passed';
  }catch(error){record.failure=safeBrowserFailure(error,record);}finally{
   observer.setPhase('context-close');try{await context?.close();observer.assertClean();}catch(error){record.status='failed';record.contextFailure=safeBrowserFailure(error,record);}record.closed=true;
   await writeFile(join(evidence,'probe-report.json'),JSON.stringify(report,null,2));console.log(JSON.stringify({width,status:record.status,errors:record.errors.length}));
  }
  if(record.status!=='passed')break;
 }
}finally{
 await browser.close();report.browserClosed=true;if(app){await app.close();report.appClosed=true;}assertSourceUnchanged(source,custody);report.sourceUnchanged=true;
 report.status=report.cases.length===4&&report.cases.every(item=>item.status==='passed'&&item.closed)?'passed':'failed';
 await writeFile(join(evidence,'probe-report.json'),JSON.stringify(report,null,2));if(report.status!=='passed')process.exitCode=1;
}
