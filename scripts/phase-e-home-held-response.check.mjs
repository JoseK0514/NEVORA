import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {writeFile} from 'node:fs/promises';
import {join,resolve} from 'node:path';
import {waitForFreshHome,waitForRecordedTimeReady,installHomeHeldObserver,assertNoTimeReadAfterPause,installTimeReadStartObserver} from './phase-e-home-browser-scenarios.mjs';
import {captureSource,assertSourceUnchanged,externalEvidence} from './phase-e-owned.mjs';

// A scheduling fixture for the actual H06 helper, not product/SQL evidence.
// A prior ready snapshot may remain committed until the new generation renders.
const source=resolve(process.cwd()),custody=captureSource(source,process.env.PHASE_E_EXPECTED_SHA);
const evidence=externalEvidence(source,process.env.HOME_READINESS_EVIDENCE_DIR);
await writeFile(join(evidence,'source-manifest.json'),JSON.stringify(custody,null,2));
const runtime=createRequire(resolve('tools/ci-browser-runtime/package.json'));
const playwright=runtime('playwright');assert.equal(runtime('playwright/package.json').version,'1.62.1');
// Node request notifications can arrive after the browser has already started
// and aborted the read. The browser's creation boundary determines causality.
assert.doesNotThrow(()=>assertNoTimeReadAfterPause({requestCount:3,browserRequestCount:4},{requestCount:4,browserRequestCount:4}),'Delayed delivery of a pre-pagehide request is not a new read');
assert.throws(()=>assertNoTimeReadAfterPause({requestCount:3,browserRequestCount:3},{requestCount:3,browserRequestCount:4}),assert.AssertionError,'A real new browser read must fail even before Node receives its request event');
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
  // A B-only stale commit must be observed even when hidden legacy text stays fresh.
  await page.setContent('<main class="employee-home" data-home-state="ready" aria-busy="false"><section aria-labelledby="home-shift-label" style="display:none"><h2 id="home-shift-label">Next shift</h2><p>Fresh fixture Main Office</p></section><section id="b-home-shift" style="display:contents"><p>Fresh fixture Main Office</p></section></main>');
  await page.evaluate(installHomeHeldObserver,'Fresh fixture Main Office');await page.evaluate(()=>window.__homeHeldEvidence.observe('fresh-generation-rendered'));
  await page.evaluate(()=>{document.querySelector('#b-home-shift p').textContent='Main Office Operations and Customer Support';});await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
  const stale=await page.evaluate(()=>{const evidence=window.__homeHeldEvidence;const observations=evidence.observations;evidence.stop();delete window.__homeHeldEvidence;return {observations,hiddenLegacyFresh:document.querySelector('[aria-labelledby="home-shift-label"]').textContent.includes('Fresh fixture Main Office')};});
  assert(stale.hiddenLegacyFresh);assert(stale.observations.some(item=>item.event==='mutation'&&item.visible&&item.old&&!item.fresh),'The actual B-only stale mutation must be recorded');assert.equal(stale.observations.every(item=>item.visible&&item.fresh&&!item.old),false,'A hidden fresh legacy card cannot conceal a visible stale B commit');result.visibleHeldObserverNegative=stale;
  // Corporate Employee: recorded time is on the Time tab, the same kit page at every width (no Refresh, aria-busy while a
  // read is in flight). Clocked in, the "Current shift" card carries an "Clocked in" pill; off the clock (Nov 1 upscale
  // S9) the "Right now" card says "Not clocked in" once, with no pill.
  await page.setContent('<main><div class="c-page c-page--narrow c-hours" data-hours-view="records" data-hours-state="loading" aria-busy="true"><section class="c-card" id="hours-now"><div class="c-card__head"><h2 class="c-card__label">Current shift</h2><div class="c-card__aside"><span class="c-pill">Clocked in</span></div></div><div class="c-card__body"><b class="c-big">Clocked in at 9:00 AM</b></div></section></div></main>');
  let recordedSettled=false;result.recordedReadiness=[];
  const recordedWaiting=waitForRecordedTimeReady(page,'OFF_CLOCK').then(value=>{recordedSettled=true;result.recordedResolved=value;});
  const render=()=>page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
  await render();result.recordedReadiness.push({phase:'Time tab still loading',settled:recordedSettled});assert.equal(recordedSettled,false);
  await page.evaluate(()=>{const time=document.querySelector('.c-hours');time.setAttribute('data-hours-state','ready');time.setAttribute('aria-busy','false');});
  await render();result.recordedReadiness.push({phase:'Ready, but an older Clocked-in status',settled:recordedSettled});assert.equal(recordedSettled,false);
  await page.evaluate(()=>{document.querySelector('.c-card__label').textContent='Right now';document.querySelector('.c-big').textContent='Not clocked in';});
  await render();result.recordedReadiness.push({phase:'Ready with the off-the-clock heading, but the older pill still shown',settled:recordedSettled});assert.equal(recordedSettled,false);
  await page.evaluate(()=>{document.querySelector('.c-card__aside').remove();document.querySelector('.c-hours').setAttribute('aria-busy','true');});
  await render();result.recordedReadiness.push({phase:'Recorded state arrived, a read still in flight',settled:recordedSettled});assert.equal(recordedSettled,false);
  await page.evaluate(()=>{document.querySelector('.c-hours').setAttribute('aria-busy','false');});
  await recordedWaiting;assert.deepEqual(result.recordedResolved,{state:'OFF_CLOCK',view:'time',settled:true});
  // The released B view must be read, even when hidden legacy markup disagrees.
  await page.setContent('<main class="c-hours" data-hours-view="records" data-hours-state="ready" aria-busy="true"><section id="hours-now" style="display:none"><h2 class="c-card__label">Right now</h2><p class="c-big">Not clocked in</p></section><section id="b-hours-now"><div class="b-card__h"><h2>Right now</h2><span class="b-status">Clocked in</span></div></section></main>');
  let bSettled=false;const bWaiting=waitForRecordedTimeReady(page,'OFF_CLOCK').then(()=>{bSettled=true;});await render();assert.equal(bSettled,false);
  await page.evaluate(()=>document.querySelector('.c-hours').setAttribute('aria-busy','false'));await render();assert.equal(bSettled,false,'A hidden legacy off-clock card cannot authorize the visible Clocked in view');
  await page.evaluate(()=>document.querySelector('#b-hours-now .b-status').textContent='Not clocked in');await bWaiting;assert.equal(bSettled,true);
  result.recordedReadiness.push({phase:'Visible B status matches the fresh released read; hidden legacy status cannot pass',settled:bSettled});
  // After a real clock-out during a scheduled shift, the delivered status also
  // says how long the shift has been under way. It remains OFF_CLOCK. Invalid
  // text, a clocked-in status, paused data and an in-flight read must still wait.
  await page.setContent('<main class="c-hours" data-hours-view="records" data-hours-state="ready" aria-busy="false"><section id="b-hours-now"><div class="b-card__h"><h2>Right now</h2><span class="b-status" data-dot="green">Clocked in</span></div></section></main>');
  let elapsedSettled=false;const elapsedWaiting=waitForRecordedTimeReady(page,'OFF_CLOCK').then(value=>{elapsedSettled=true;result.elapsedRecordedResult=value;});
  await render();assert.equal(elapsedSettled,false,'An old Clocked in status must remain refused');
  await page.evaluate(()=>{const status=document.querySelector('.b-status');status.textContent='Not clocked in · unknown';status.dataset.dot='amber';});await render();assert.equal(elapsedSettled,false,'An unknown off-clock duration cannot authorize readiness');
  await page.evaluate(()=>{const status=document.querySelector('.b-status');status.textContent='Not clocked in · 1 h';status.dataset.dot='green';});await render();assert.equal(elapsedSettled,false,'The elapsed not-clocked-in hint is amber, not a recorded green clock-in');
  await page.evaluate(()=>{document.querySelector('.b-status').dataset.dot='amber';document.querySelector('.c-hours').dataset.hoursState='paused';});await render();assert.equal(elapsedSettled,false,'Paused data cannot authorize the elapsed status');
  await page.evaluate(()=>{const time=document.querySelector('.c-hours');time.dataset.hoursState='ready';time.setAttribute('aria-busy','true');});await render();assert.equal(elapsedSettled,false,'A current read must settle before its elapsed status is admitted');
  await page.evaluate(()=>document.querySelector('.c-hours').setAttribute('aria-busy','false'));await elapsedWaiting;assert.deepEqual(result.elapsedRecordedResult,{state:'OFF_CLOCK',view:'time',settled:true});
  result.recordedReadiness.push({phase:'Settled OFF_CLOCK can include the delivered amber elapsed hint; stale and malformed states remain refused',settled:elapsedSettled});
  // A real forwarded fetch starts before pagehide, while this fixture holds its
  // Node notification. Delivering that notification afterward is not a new read.
  await page.route('https://owned.invalid/**',route=>route.fulfill({status:200,headers:{'access-control-allow-origin':'*','content-type':'application/json'},body:'{"owned":true}'}));
  let delivered=0;const pending=[];const lateNotification=request=>{if(new URL(request.url()).pathname.startsWith('/api/employee/hours/'))pending.push(()=>delivered++);};page.on('request',lateNotification);
  await page.evaluate(installTimeReadStartObserver);
  const forwarded=await page.evaluate(async()=>{const response=await fetch('https://owned.invalid/api/employee/hours/records/overview');return response.json();});assert.deepEqual(forwarded,{owned:true});
  const before={requestCount:delivered,browserRequestCount:await page.evaluate(()=>window.__homeTimeReadStarts.snapshot().count)};assert.equal(before.requestCount,0);assert.equal(before.browserRequestCount,1);
  await page.evaluate(()=>window.dispatchEvent(new Event('pagehide')));for(const deliver of pending.splice(0))deliver();
  const paused={requestCount:delivered,browserRequestCount:await page.evaluate(()=>window.__homeTimeReadStarts.snapshot().count)};assert.equal(paused.requestCount,1);assertNoTimeReadAfterPause(before,paused);
  await page.evaluate(async()=>{await fetch('https://owned.invalid/api/employee/hours/records/overview');});
  const newRead={requestCount:delivered,browserRequestCount:await page.evaluate(()=>window.__homeTimeReadStarts.snapshot().count)};assert.equal(newRead.requestCount,paused.requestCount,'The new Node notification remains held');assert.equal(newRead.browserRequestCount,2);assert.throws(()=>assertNoTimeReadAfterPause(paused,newRead),assert.AssertionError,'A real post-pagehide fetch cannot pass merely because Node has not received its event');
  result.readStartBoundary={before,paused,newRead,observer:await page.evaluate(()=>{const observer=window.__homeTimeReadStarts,snapshot=observer.snapshot(),nativeFetchRestored=observer.stop();delete window.__homeTimeReadStarts;return {...snapshot,nativeFetchRestored};})};assert(result.readStartBoundary.observer.nativeFetchRestored);page.off('request',lateNotification);await page.unroute('https://owned.invalid/**');result.status='passed';
 }catch(error){result.failure={name:error.name,message:error instanceof assert.AssertionError?error.message:'Controlled readiness fixture failed'};process.exitCode=1;}
 finally{await context?.close();await browser.close();result.browserClosed=!browser.isConnected();await writeFile(join(evidence,'readiness-report.json'),JSON.stringify(results,null,2));}
}
let sourceUnchanged=false;
try{assertSourceUnchanged(source,custody);sourceUnchanged=true;}catch{process.exitCode=1;}
const passed=sourceUnchanged&&results.length===2&&results.every(result=>result.status==='passed'&&result.browserClosed);
if(!passed)process.exitCode=1;
await writeFile(join(evidence,'readiness-custody.json'),JSON.stringify({checkpoint:custody.checkpoint,tree:custody.tree,sourceClean:custody.sourceClean,sourceUnchanged,status:passed?'passed':'failed',engines:results.map(({engine,status,browserClosed})=>({engine,status,browserClosed})),limitations:['Controlled scheduling fixture; actual Next/PostgreSQL Home and hosted 70-cell gates remain separate.']},null,2));
console.log(JSON.stringify(results));
