import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {readFile,writeFile} from 'node:fs/promises';
import {join,resolve} from 'node:path';
import {waitForCalendarCopyReady,waitForReviewedTimeOff,restoreSheetMotion,waitForDisclosureReady} from './browser-render-readiness.mjs';
import {captureSource,assertSourceUnchanged,externalEvidence} from './phase-e-owned.mjs';

const source=resolve(process.cwd()),custody=captureSource(source,process.env.PHASE_E_EXPECTED_SHA);
const evidence=externalEvidence(source,process.env.PHASE_E_EVIDENCE_DIR);
const runtime=createRequire(resolve('tools/ci-browser-runtime/package.json')),pw=runtime('playwright');
assert.equal(runtime('playwright/package.json').version,'1.62.1');
const sheetCss=await readFile('src/components/signature/components.css','utf8'),motionCss=await readFile('src/app/app/portal-motion.css','utf8'),axeFile=runtime.resolve('axe-core/axe.min.js');
assert.equal(runtime('axe-core/package.json').version,'4.11.0');
const results=[];
for(const engine of ['chromium','webkit']){
 const browser=await pw[engine].launch({headless:true});
 try{for(const reducedMotion of ['no-preference','reduce']){
  const result={engine,reducedMotion,status:'failed',observations:[]};results.push(result);let context;
  try{
   context=await browser.newContext({viewport:{width:320,height:1000},reducedMotion});const page=await context.newPage();page.setDefaultTimeout(15000);
   await page.setContent('<style>@keyframes moving{from{transform:translateY(24px)}to{transform:translateY(0)}}button{animation:moving 1s linear both paused}@media(prefers-reduced-motion:reduce){button{animation-duration:1ms}}</style><section data-calendar-setting><button>Copy calendar link</button><div tabindex="-1"><p role="status">Link copied.</p></div></section>');
   await page.evaluate(()=>{window.fixtureClicks=0;document.querySelector('button').addEventListener('click',()=>window.fixtureClicks++);});
   let settled=false;const waiting=waitForCalendarCopyReady(page,'Link copied.').then(()=>{settled=true;});
   const render=()=>page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
   await page.getByText('Link copied.',{exact:true}).waitFor();await render();
   result.observations.push({phase:'Visible notice, feedback not focused',settled});assert.equal(settled,false);
   await page.locator('div').focus();await render();
   result.observations.push({phase:'Feedback focused, real CSS animation paused',settled});assert.equal(settled,false);
   await page.evaluate(()=>{const animations=document.querySelector('button').getAnimations();if(animations.length!==1)throw Error('Expected controlled CSS animation');animations[0].finish();});
   await waiting;await page.getByRole('button',{name:'Copy calendar link',exact:true}).click();
   assert.equal(await page.evaluate(()=>window.fixtureClicks),1);result.observations.push({phase:'Animation completed, native click received',settled,clicks:1});
   await page.setContent('<main class="q-timeoff"><article id="request-fictional-review">Waiting</article></main>');
   let reviewSettled=false;const reviewed=waitForReviewedTimeOff(page,'fictional-review').then(()=>{reviewSettled=true;});
   await render();result.observations.push({phase:'Reviewed navigation without fresh decision view',settled:reviewSettled});assert.equal(reviewSettled,false);
   await page.evaluate(()=>document.querySelector('main').insertAdjacentHTML('beforeend','<p role="status">Decision saved.</p>'));await render();
   result.observations.push({phase:'Decision notice with stale pending request',settled:reviewSettled});assert.equal(reviewSettled,false);
   await page.evaluate(()=>document.getElementById('request-fictional-review').remove());await reviewed;
   result.observations.push({phase:'Fresh decision notice and pending request removed',settled:reviewSettled});assert.equal(reviewSettled,true);
   await page.setContent('<!doctype html><html lang="en"><head><title>Fictional disclosure readiness control</title><style>'+motionCss+'</style></head><body><main class="app-shell nevora-portal"><div class="page-frame"><details><summary>Recorded time</summary><div><span data-recorded>8 h</span></div></details></div></main></body></html>');
   const disclosure=page.locator('details');await disclosure.locator('summary').focus();await page.keyboard.press('Enter');
   const opening=await disclosure.evaluate(element=>{element.getBoundingClientRect();const animations=element.getAnimations({subtree:true}).filter(animation=>Number.isFinite(animation.effect?.getComputedTiming().endTime));animations.forEach(animation=>{animation.pause();animation.currentTime=0;});return {open:element.open,renderedText:element.querySelector('[data-recorded]').innerText,animations:animations.length};});
   assert.equal(opening.open,true);let disclosureReady=false;const openingReady=waitForDisclosureReady(disclosure).then(()=>{disclosureReady=true;});
   await render();if(opening.animations){assert.equal(disclosureReady,false);await disclosure.evaluate(element=>element.getAnimations({subtree:true}).forEach(animation=>animation.finish()));}
   await openingReady;assert.equal(await disclosure.locator('[data-recorded]').innerText(),'8 h');assert(await disclosure.locator('[data-recorded]').isVisible());
   result.observations.push({phase:'Actual portal disclosure motion retains eight recorded hours and waits for rendered content',opening,ready:disclosureReady});
   await disclosure.evaluate(element=>{const animation=element.querySelector('[data-recorded]').animate([{opacity:0},{opacity:1}],{duration:500,fill:'both'});animation.pause();});
   let finiteReady=false;const finiteWaiting=waitForDisclosureReady(disclosure).then(()=>{finiteReady=true;});await render();assert.equal(finiteReady,false);
   await disclosure.evaluate(element=>element.getAnimations({subtree:true}).forEach(animation=>animation.finish()));await finiteWaiting;assert.equal(finiteReady,true);
   result.observations.push({phase:'A paused finite child animation keeps readiness pending until it finishes',pendingObserved:true,ready:finiteReady});
   await disclosure.locator('summary').press('Enter');await assert.rejects(waitForDisclosureReady(disclosure,150),error=>error.name==='TimeoutError');
   result.observations.push({phase:'A closed disclosure cannot pass readiness',rejected:true});
   if(reducedMotion==='reduce'){
    await page.setContent('<!doctype html><html lang="en"><head><title>Fictional sheet motion control</title><style>'+sheetCss+' [data-sig-sheet]{animation-play-state:paused;background:white;color:black;padding:30px}button{background:white;color:black;font-size:18px}</style></head><body><main data-sig-sheet><button>Fictional profile control</button></main></body></html>');
    await page.evaluate(()=>document.querySelector('[data-sig-sheet]').getAnimations().forEach(animation=>animation.finish()));
    let restored=false;const restoring=restoreSheetMotion(page).then(value=>{restored=true;return value;});
    await page.waitForFunction(()=>document.querySelector('[data-sig-sheet]').getAnimations().some(animation=>animation.animationName==='sig-sheet-rise'));
    await page.evaluate(()=>document.querySelector('[data-sig-sheet]').getAnimations().forEach(animation=>{animation.pause();animation.currentTime=5;}));
    await page.addScriptTag({path:axeFile});
    const scan=()=>page.evaluate(async()=>(await window.axe.run(document,{runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21a','wcag21aa']}})).violations.map(item=>item.id));
    const earlyViolations=await scan();await render();assert.equal(restored,false);assert(earlyViolations.includes('color-contrast'));
    await page.evaluate(()=>document.querySelector('[data-sig-sheet]').getAnimations().forEach(animation=>animation.finish()));
    const entrance=await restoring,settledViolations=await scan();assert(entrance.after.every(item=>item.opacity===1));assert.deepEqual(settledViolations,[]);
    result.observations.push({phase:'Actual sheet CSS restarts on motion restoration; readiness waits before contrast audit',earlyViolations,entrance,settledViolations});
   }
   result.status='passed';
  }catch(error){result.failure={name:error.name,message:error instanceof assert.AssertionError?error.message:'Controlled feedback readiness failed'};process.exitCode=1;}
  finally{await context?.close();}
 }}finally{await browser.close();for(const result of results.filter(item=>item.engine===engine))result.browserClosed=!browser.isConnected();}
}
assertSourceUnchanged(source,custody);
const passed=results.length===4&&results.every(result=>result.status==='passed'&&result.browserClosed);
await writeFile(join(evidence,'calendar-readiness-custody.json'),JSON.stringify({checkpoint:custody.checkpoint,tree:custody.tree,sourceClean:custody.sourceClean,sourceUnchanged:true,status:passed?'passed':'failed',results,limitations:['Controlled rendering regression; full real Next/PostgreSQL Calendar cells remain required.']},null,2));
if(!passed)process.exitCode=1;
console.log(JSON.stringify(results));
