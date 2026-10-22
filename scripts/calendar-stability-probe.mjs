import {createRequire} from 'node:module';
import {mkdir,writeFile} from 'node:fs/promises';
import {join,resolve} from 'node:path';
import assert from 'node:assert/strict';
import {createOwnedNextApp} from '../src/test/integration/owned-next-app.ts';
import {seedOwnedApp} from '../src/test/integration/owned-app-fixture.ts';
import {runScenario} from './phase-e-calendar-browser-scenarios.mjs';
import {observeBrowserCell} from './phase-e-browser-qa.mjs';
import {verifyNavigationFetchDiagnostic} from './browser-navigation-diagnostic.mjs';
import {captureSource,assertSourceUnchanged,externalEvidence} from './phase-e-owned.mjs';
import {safeBrowserFailure} from './release-browser-diagnostics.mjs';

const source=resolve(process.cwd()),custody=captureSource(source,process.env.PHASE_E_EXPECTED_SHA),evidence=externalEvidence(source,process.env.PHASE_E_EVIDENCE_DIR);
const runtime=createRequire(resolve('tools/ci-browser-runtime/package.json')),pw=runtime('playwright');
const report={checkpoint:custody.checkpoint,tree:custody.tree,sourceClean:true,cases:[],limitations:['Focused Calendar stability diagnosis; not full development acceptance.']};
await writeFile(join(evidence,'source-manifest.json'),JSON.stringify(custody,null,2));
let app;
try{
 app=await createOwnedNextApp(join(evidence,'shared-app'),{pinDevTypeReferences:true});await seedOwnedApp(app.database.executor);
 for(const engine of ['chromium','webkit']){
  const browser=await pw[engine].launch({headless:true}),navigationDiagnosticVerified=(await verifyNavigationFetchDiagnostic(browser)).verified;
  try{for(const width of engine==='chromium'?[320,375,390,430,768,1024,1440]:[320,375,390]){
   const directory=join(evidence,engine+'-'+width);await mkdir(directory,{recursive:true});
   const record={suite:'calendar',engine,width,status:'failed',checks:[],errors:[]};report.cases.push(record);
   const observer=observeBrowserCell(record,record.errors,{navigationDiagnosticVerified});let context,page;
   try{
    context=await browser.newContext({viewport:{width,height:1000},hasTouch:width<768,isMobile:width<768,serviceWorkers:'block'});
    await context.route('**/*',route=>{const url=new URL(route.request().url());if(['http:','https:'].includes(url.protocol)&&url.origin!==app.url){record.errors.push('External request refused');return route.abort();}return route.continue();});
    await observer.observeContext(context,'primary');page=await context.newPage();page.setDefaultTimeout(15000);
    await page.addInitScript(()=>{
     window.calendarGeometry=[];
     setInterval(()=>{
      const button=[...document.querySelectorAll('[data-calendar-setting] button')].find(element=>element.textContent==='Copy link');
      if(!button)return;const box=button.getBoundingClientRect(),style=getComputedStyle(button),focused=document.activeElement;
      window.calendarGeometry.push({time:Math.round(performance.now()),x:box.x,y:box.y,width:box.width,height:box.height,scrollX,scrollY,innerHeight,viewport:visualViewport?{top:visualViewport.offsetTop,height:visualViewport.height,scale:visualViewport.scale}:null,transform:style.transform,transition:style.transition,focus:focused?.tagName,focusClass:focused?.className,notice:[...document.querySelectorAll('[data-calendar-setting] [role=status]')].map(element=>element.textContent).filter(value=>['Link created.','Link copied.','Copy was unavailable. Use Select link, then copy it manually.'].includes(value)),animations:document.getAnimations().filter(animation=>animation.playState==='running').map(animation=>({name:animation.animationName??null,time:animation.currentTime,target:animation.effect?.target?.className})).slice(0,8)});
      if(window.calendarGeometry.length>600)window.calendarGeometry.shift();
     },50);
    });
    const result=await runScenario({app,browser,context,page,engine,width,evidenceDirectory:directory,runtimeErrors:observer});observer.assertClean();record.checks=result.checks;record.status='passed';
   }catch(error){record.failure=safeBrowserFailure(error,record);}finally{
    if(page){await writeFile(join(directory,'geometry.json'),JSON.stringify(await page.evaluate(()=>window.calendarGeometry??[]),null,2));await page.screenshot({path:join(directory,'calendar-masked.png'),fullPage:true,mask:[page.locator('textarea')]}).catch(()=>{});}
    observer.setPhase('context-close');try{await context?.close();observer.assertClean();}catch(error){record.status='failed';record.contextFailure=safeBrowserFailure(error,record);}record.closed=true;
    await writeFile(join(evidence,'probe-report.json'),JSON.stringify(report,null,2));console.log(JSON.stringify({engine,width,status:record.status,errors:record.errors.length}));
   }
   if(record.status!=='passed')break;
  }}finally{await browser.close();}
 }
}finally{
 if(app){await app.close();report.appClosed=true;}assertSourceUnchanged(source,custody);report.sourceUnchanged=true;
 report.status=report.cases.length===10&&report.cases.every(item=>item.status==='passed'&&item.closed)?'passed':'failed';
 await writeFile(join(evidence,'probe-report.json'),JSON.stringify(report,null,2));if(report.status!=='passed')process.exitCode=1;
}
