import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {writeFile} from 'node:fs/promises';
import {join,resolve} from 'node:path';
import {waitForFreshHome,waitForRecordedTimeReady} from './phase-e-home-browser-scenarios.mjs';
import {captureSource,assertSourceUnchanged,externalEvidence} from './phase-e-owned.mjs';

// A scheduling fixture for the actual H06 helper, not product/SQL evidence.
// A prior ready snapshot may remain committed until the new generation renders.
const source=resolve(process.cwd()),custody=captureSource(source,process.env.PHASE_E_EXPECTED_SHA);
const evidence=externalEvidence(source,process.env.HOME_READINESS_EVIDENCE_DIR);
await writeFile(join(evidence,'source-manifest.json'),JSON.stringify(custody,null,2));
const runtime=createRequire(resolve('tools/ci-browser-runtime/package.json'));
const playwright=runtime('playwright');assert.equal(runtime('playwright/package.json').version,'1.62.1');
const results=[];
for(const engine of ['chromium','webkit']){
 const browser=await playwright[engine].launch({headless:true});let context;
 const result={engine,status:'failed',scenario:'Prior ready snapshot must not satisfy the fresh-generation wait',observations:[]};results.push(result);
 try{
  context=await browser.newContext({viewport:{width:320,height:600}});const page=await context.newPage();page.setDefaultTimeout(15000);
  await page.setContent('<main data-home-state="ready" aria-busy="true"><section style="display:contents" aria-labelledby="home-shift-label"><h2 id="home-shift-label">Next shift</h2><p>Main Office Operations and Customer Support</p></section></main>');
  await page.waitForLoadState('networkidle');
  const observe=()=>page.evaluate(()=>({state:document.querySelector('main').dataset.homeState,busy:document.querySelector('main').getAttribute('aria-busy'),fresh:document.querySelector('section').textContent.includes('Fresh fixture Main Office'),old:document.querySelector('section').textContent.includes('Main Office Operations and Customer Support')}));
  let settled=false;const waiting=waitForFreshHome(page,'Fresh fixture Main Office').then(async()=>{settled=true;result.resolved=await observe();});
  // Browser rendering barriers, with the next generation still held by this fixture.
  // No timer sleep, network-idle completion claim, retry, or shortened assertion budget.
  await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
  result.observations.push({phase:'prior-ready',settled,...await observe()});
  await page.screenshot({path:join(evidence,engine+'-prior-ready.png')});
  await page.evaluate(()=>{document.querySelector('main').dataset.homeState='loading';document.querySelector('section p').textContent='Loading Home…';});
  await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(resolve)));
  result.observations.push({phase:'new-generation-loading',settled,...await observe()});
  await page.evaluate(()=>{document.querySelector('main').dataset.homeState='ready';document.querySelector('main').setAttribute('aria-busy','false');document.querySelector('section p').textContent='Fresh fixture Main Office';});
  await waiting;await page.screenshot({path:join(evidence,engine+'-fresh.png')});
  assert.equal(result.observations[0].settled,false,'Prior ready snapshot must not release the fresh-generation wait');
  assert.equal(result.observations[1].settled,false,'Loading must not release the fresh-generation wait');
  assert.deepEqual(result.resolved,{state:'ready',busy:'false',fresh:true,old:false});
  // Corporate Employee: recorded time is on the Time tab. Phones: the Hours records view (Right now pill, footer Refresh).
  await page.setContent('<main><div class="em-hours" data-hours-view="records" data-hours-state="loading"><div class="c-card"><div class="c-card__head"><h2 class="c-card__label">Right now</h2><span class="c-pill">On the clock</span></div></div><footer class="em-request-footer"><span>Your information only</span><button type="button" disabled>Refreshing…</button></footer></div></main>');
  let recordedSettled=false;result.recordedReadiness=[];
  const recordedWaiting=waitForRecordedTimeReady(page,'OFF_CLOCK').then(value=>{recordedSettled=true;result.recordedResolved=value;});
  const render=()=>page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
  await render();result.recordedReadiness.push({phase:'Time tab still loading',settled:recordedSettled});assert.equal(recordedSettled,false);
  await page.evaluate(()=>{document.querySelector('.em-hours').setAttribute('data-hours-state','ready');const button=document.querySelector('button');button.disabled=false;button.textContent='Refresh';});
  await render();result.recordedReadiness.push({phase:'Ready, but an older Clocked-in status',settled:recordedSettled});assert.equal(recordedSettled,false);
  await page.evaluate(()=>{document.querySelector('.c-pill').textContent='Off the clock';const button=document.querySelector('button');button.disabled=true;button.textContent='Refreshing…';});
  await render();result.recordedReadiness.push({phase:'Recorded state arrived, refresh still disabled',settled:recordedSettled});assert.equal(recordedSettled,false);
  await page.evaluate(()=>{const button=document.querySelector('button');button.disabled=false;button.textContent='Refresh';});
  await recordedWaiting;assert.deepEqual(result.recordedResolved,{state:'OFF_CLOCK',view:'hours',refreshEnabled:true});
  // Wider layouts: the My time view (its status carries data-state only once the read is released).
  await page.setContent('<main><div class="q-mytime"><p role="status"><span class="q-mytime__state">Friday · <span>Loading recorded time</span></span></p></div></main>');
  let wideSettled=false;const wideWaiting=waitForRecordedTimeReady(page,'OFF_CLOCK').then(value=>{wideSettled=true;result.wideResolved=value;});
  await render();result.recordedReadiness.push({phase:'My time still loading',settled:wideSettled});assert.equal(wideSettled,false);
  await page.evaluate(()=>{const state=document.querySelector('.q-mytime__state');state.setAttribute('data-state','CLOCKED_IN');state.lastElementChild.textContent='Clocked in';});
  await render();result.recordedReadiness.push({phase:'My time released with an older Clocked-in status',settled:wideSettled});assert.equal(wideSettled,false);
  await page.evaluate(()=>{const state=document.querySelector('.q-mytime__state');state.setAttribute('data-state','OFF_CLOCK');state.lastElementChild.textContent='Off clock';});
  await wideWaiting;assert.deepEqual(result.wideResolved,{state:'OFF_CLOCK',view:'my-time',refreshEnabled:null});result.status='passed';
 }catch(error){result.failure={name:error.name,message:error instanceof assert.AssertionError?error.message:'Controlled readiness fixture failed'};process.exitCode=1;}
 finally{await context?.close();await browser.close();result.browserClosed=!browser.isConnected();await writeFile(join(evidence,'readiness-report.json'),JSON.stringify(results,null,2));}
}
let sourceUnchanged=false;
try{assertSourceUnchanged(source,custody);sourceUnchanged=true;}catch{process.exitCode=1;}
const passed=sourceUnchanged&&results.length===2&&results.every(result=>result.status==='passed'&&result.browserClosed);
if(!passed)process.exitCode=1;
await writeFile(join(evidence,'readiness-custody.json'),JSON.stringify({checkpoint:custody.checkpoint,tree:custody.tree,sourceClean:custody.sourceClean,sourceUnchanged,status:passed?'passed':'failed',engines:results.map(({engine,status,browserClosed})=>({engine,status,browserClosed})),limitations:['Controlled scheduling fixture; actual Next/PostgreSQL Home and hosted 70-cell gates remain separate.']},null,2));
console.log(JSON.stringify(results));
