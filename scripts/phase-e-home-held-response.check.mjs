import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {mkdir,writeFile} from 'node:fs/promises';
import {join,resolve} from 'node:path';
import {waitForFreshHome} from './phase-e-home-browser-scenarios.mjs';

// A scheduling fixture for the actual H06 helper, not product/SQL evidence.
// A prior ready snapshot may remain committed until the new generation renders.
const evidence=process.env.HOME_READINESS_EVIDENCE_DIR;
assert(evidence&&resolve(evidence)===evidence,'Explicit absolute evidence directory required');
await mkdir(evidence,{recursive:true});
const runtime=createRequire(resolve('tools/ci-browser-runtime/package.json'));
const playwright=runtime('playwright');assert.equal(runtime('playwright/package.json').version,'1.62.1');
const results=[];
for(const engine of ['chromium','webkit']){
 const browser=await playwright[engine].launch({headless:true});let context;
 const result={engine,status:'failed',scenario:'Prior ready snapshot must not satisfy the fresh-generation wait',observations:[]};results.push(result);
 try{
  context=await browser.newContext({viewport:{width:320,height:600}});const page=await context.newPage();page.setDefaultTimeout(15000);
  await page.setContent('<main data-home-state="ready" aria-busy="true"><section aria-labelledby="employee-reviewed-next-heading"><h2 id="employee-reviewed-next-heading">Next shift</h2><p>Main Office Operations and Customer Support</p></section></main>');
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
  assert.deepEqual(result.resolved,{state:'ready',busy:'false',fresh:true,old:false});result.status='passed';
 }catch(error){result.failure={name:error.name,message:error instanceof assert.AssertionError?error.message:'Controlled readiness fixture failed'};process.exitCode=1;}
 finally{await context?.close();await browser.close();result.browserClosed=!browser.isConnected();await writeFile(join(evidence,'readiness-report.json'),JSON.stringify(results,null,2));}
}
console.log(JSON.stringify(results));
