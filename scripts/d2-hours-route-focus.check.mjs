import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {waitForD2HoursRouteFocus} from './d2-hours-route-focus.mjs';

const runtime=createRequire(process.env.NEVORA_PLAYWRIGHT_RUNTIME_PACKAGE??new URL('../tools/ci-browser-runtime/package.json',import.meta.url));
assert.equal(runtime('playwright/package.json').version,'1.62.1');
const {chromium,webkit}=runtime('playwright');
const results=[];
for(const [engine,launch] of [['chromium',chromium],['webkit',webkit]]){
 const browser=await launch.launch({headless:true});
 try{
  const page=await browser.newPage();
  await page.setContent('<main class="c-hours" data-hours-context="records|today|entry-fixture||pending" data-hours-state="ready"><h1 id="hours-title" tabindex="-1">Time entry</h1><a href="#activated">Request a correction</a></main>');
  const heading=page.locator('#hours-title'),link=page.getByRole('link');
  // Real DOM focus reproduces the retained CI witness: the normal route heading
  // takes focus after an early link focus, with the document still foreground.
  await link.focus();await heading.focus();
  assert.deepEqual(await link.evaluate(e=>({documentFocused:document.hasFocus(),linkFocused:document.activeElement===e,activeTag:document.activeElement.tagName})),{documentFocused:true,linkFocused:false,activeTag:'H1'});
  await link.focus();let settled=false;
  const waiting=waitForD2HoursRouteFocus(heading,'entry-fixture',performance.now()+2000).then(()=>{settled=true;});
  await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
  assert.equal(settled,false,'Visible route content is not proof that route focus settled');
  await heading.focus();await waiting;
  await link.focus();assert(await link.evaluate(e=>document.hasFocus()&&document.activeElement===e));
  await link.press('Enter');assert.equal(new URL(page.url()).hash,'#activated');
  await page.evaluate(()=>{location.hash='';document.querySelector('.c-hours').dataset.hoursContext='records|today|foreign-entry||pending';});
  await heading.focus();
  await assert.rejects(waitForD2HoursRouteFocus(heading,'entry-fixture',performance.now()+75),/deadline|route focus/i);
  assert.equal(new URL(page.url()).hash,'');
  await page.evaluate(()=>{document.querySelector('.c-hours').dataset.hoursContext='records|today|entry-fixture||pending';});
  await link.focus();
  await assert.rejects(waitForD2HoursRouteFocus(heading,'entry-fixture',performance.now()+75),/deadline|route focus/i);
  assert(await link.evaluate(e=>document.activeElement===e),'Observation must not manufacture heading focus');
  await assert.rejects(waitForD2HoursRouteFocus(heading,'entry-fixture',performance.now()-1),/deadline/i);
  results.push({engine,delayedHeadingFocusObserved:true,foreignRouteRejected:true,missingFocusRejected:true,expiredDeadlineRejected:true,singleEnter:true});
 }finally{await browser.close();}
}
console.log(JSON.stringify({state:'passed',results}));
