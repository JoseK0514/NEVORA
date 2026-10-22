import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {writeFile} from 'node:fs/promises';
import {join,resolve} from 'node:path';
import {waitForCalendarCopyReady} from './browser-render-readiness.mjs';
import {captureSource,assertSourceUnchanged,externalEvidence} from './phase-e-owned.mjs';

const source=resolve(process.cwd()),custody=captureSource(source,process.env.PHASE_E_EXPECTED_SHA);
const evidence=externalEvidence(source,process.env.PHASE_E_EVIDENCE_DIR);
const runtime=createRequire(resolve('tools/ci-browser-runtime/package.json')),pw=runtime('playwright');
assert.equal(runtime('playwright/package.json').version,'1.62.1');
const results=[];
for(const engine of ['chromium','webkit']){
 const browser=await pw[engine].launch({headless:true});
 try{for(const reducedMotion of ['no-preference','reduce']){
  const result={engine,reducedMotion,status:'failed',observations:[]};results.push(result);let context;
  try{
   context=await browser.newContext({viewport:{width:320,height:1000},reducedMotion});const page=await context.newPage();page.setDefaultTimeout(15000);
   await page.setContent('<style>@keyframes moving{from{transform:translateY(24px)}to{transform:translateY(0)}}button{animation:moving 1s linear both paused}@media(prefers-reduced-motion:reduce){button{animation-duration:1ms}}</style><section data-calendar-setting><button>Copy link</button><div tabindex="-1"><p role="status">Link copied.</p></div></section>');
   await page.evaluate(()=>{window.fixtureClicks=0;document.querySelector('button').addEventListener('click',()=>window.fixtureClicks++);});
   let settled=false;const waiting=waitForCalendarCopyReady(page,'Link copied.').then(()=>{settled=true;});
   const render=()=>page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
   await page.getByText('Link copied.',{exact:true}).waitFor();await render();
   result.observations.push({phase:'Visible notice, feedback not focused',settled});assert.equal(settled,false);
   await page.locator('div').focus();await render();
   result.observations.push({phase:'Feedback focused, real CSS animation paused',settled});assert.equal(settled,false);
   await page.evaluate(()=>{const animations=document.querySelector('button').getAnimations();if(animations.length!==1)throw Error('Expected controlled CSS animation');animations[0].finish();});
   await waiting;await page.getByRole('button',{name:'Copy link',exact:true}).click();
   assert.equal(await page.evaluate(()=>window.fixtureClicks),1);result.observations.push({phase:'Animation completed, native click received',settled,clicks:1});result.status='passed';
  }catch(error){result.failure={name:error.name,message:error instanceof assert.AssertionError?error.message:'Controlled feedback readiness failed'};process.exitCode=1;}
  finally{await context?.close();}
 }}finally{await browser.close();for(const result of results.filter(item=>item.engine===engine))result.browserClosed=!browser.isConnected();}
}
assertSourceUnchanged(source,custody);
const passed=results.length===4&&results.every(result=>result.status==='passed'&&result.browserClosed);
await writeFile(join(evidence,'calendar-readiness-custody.json'),JSON.stringify({checkpoint:custody.checkpoint,tree:custody.tree,sourceClean:custody.sourceClean,sourceUnchanged:true,status:passed?'passed':'failed',results,limitations:['Controlled rendering regression; full real Next/PostgreSQL Calendar cells remain required.']},null,2));
if(!passed)process.exitCode=1;
console.log(JSON.stringify(results));
