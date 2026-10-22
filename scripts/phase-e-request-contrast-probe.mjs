import {createRequire} from 'node:module';
import {mkdir,readFile,writeFile} from 'node:fs/promises';
import {join,resolve} from 'node:path';
import assert from 'node:assert/strict';
import {createOwnedNextApp} from '../src/test/integration/owned-next-app.ts';
import {seedOwnedApp} from '../src/test/integration/owned-app-fixture.ts';
import {runScenario} from './phase-e-navigation-browser-scenarios.mjs';
import {observeBrowserCell} from './phase-e-browser-qa.mjs';
import {verifyNavigationFetchDiagnostic} from './browser-navigation-diagnostic.mjs';
import {captureSource,assertSourceUnchanged,externalEvidence} from './phase-e-owned.mjs';
import {safeBrowserFailure} from './release-browser-diagnostics.mjs';
import {waitForSheetEntrance} from './browser-render-readiness.mjs';

const source=resolve(process.cwd()),custody=captureSource(source,process.env.PHASE_E_EXPECTED_SHA),evidence=externalEvidence(source,process.env.PHASE_E_EVIDENCE_DIR);
const runtime=createRequire(resolve('tools/ci-browser-runtime/package.json')),pw=runtime('playwright'),axeFile=runtime.resolve('axe-core/axe.min.js');
assert.equal(runtime('playwright/package.json').version,'1.62.1');assert.equal(runtime('axe-core/package.json').version,'4.11.0');
const report={checkpoint:custody.checkpoint,tree:custody.tree,sourceClean:true,cases:[],limitations:['Repeated WebKit 375 diagnosis only; not the mandatory 70-cell development verification.']};
await writeFile(join(evidence,'source-manifest.json'),JSON.stringify(custody,null,2));
let browser;
try{
 browser=await pw.webkit.launch({headless:true});const navigationDiagnosticVerified=(await verifyNavigationFetchDiagnostic(browser)).verified;
 // Exercise the actual approved stylesheet in a controlled document. A paused,
 // partially faded sheet must keep the audit waiting in both motion modes.
 const motionContext=await browser.newContext();report.renderReadinessRegression=[];
 try{
  const motionPage=await motionContext.newPage();motionPage.setDefaultTimeout(15000);
  const css=await readFile(resolve('src/components/signature/components.css'),'utf8');
  for(const reducedMotion of ['no-preference','reduce']){
   await motionPage.emulateMedia({reducedMotion});
   await motionPage.setContent('<style>'+css+'</style><div data-sig-sheet>Fictional sheet</div>');
   const paused=await motionPage.locator('[data-sig-sheet]').evaluate(element=>{
    const animation=element.getAnimations()[0];animation.pause();animation.currentTime=70;
    return {name:animation.animationName,opacity:Number(getComputedStyle(element).opacity)};
   });
   assert(paused.opacity>0&&paused.opacity<1);
   let resolved=false;const pending=waitForSheetEntrance(motionPage).then(result=>{resolved=true;return result;});
   await motionPage.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
   assert.equal(resolved,false,'Entrance wait must not resolve while the real animation is paused');
   await motionPage.locator('[data-sig-sheet]').evaluate(element=>element.getAnimations()[0].play());
   const result=await pending;assert(result.before[0].opacity<1);assert.equal(result.after[0].opacity,1);
   report.renderReadinessRegression.push({reducedMotion,paused,...result});
  }
 }finally{await motionContext.close();}
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
