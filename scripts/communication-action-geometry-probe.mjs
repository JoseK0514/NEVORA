import assert from 'node:assert/strict';
import {measureCommunicationActions} from './communication-action-geometry.mjs';

/** Fictional DOM controls of the QA sampler, never application acceptance. */
export async function verifyCommunicationActionGeometry(browser){
 const cells=[];
 for(const phone of [false,true])for(const mode of ['ready','retire-and-return','permanent-loading','ready-empty-then-added','ready-small-then-grown','unavailable','wrong-body','wrong-revision','wrong-route']){
  if(phone&&mode==='wrong-revision')continue;
  const context=await browser.newContext({serviceWorkers:'block'}),page=await context.newPage(),errors=[];
  page.on('pageerror',()=>errors.push('pageerror'));
  try{
   const setup={phone,mode};
   await page.setContent('<!doctype html><title>Fictional geometry control</title><div id="fixture"></div>');
   await page.evaluate(({phone,mode})=>{
    const ready=(height=44,empty=false)=>'<article '+(phone?'class="em-message-detail"':'data-update-revision="fictional-revision"')+'><p class="'+(phone?'em-message-copy':'wb-update-body')+'">Fictional current update</p>'+(empty?'':'<button style="height:'+height+'px">Acknowledge update</button>')+'</article>';
    const loading='<section aria-busy="true">Loading update…</section>';
    const makeRoot=()=>{const root=document.createElement('main');root.className=phone?'em-messages':'wb-update';if(phone)root.dataset.messagesState='ready';return root;};
    let root=makeRoot();document.querySelector('#fixture').append(root);
    root.innerHTML=ready(mode==='ready-small-then-grown'?30:44,mode==='ready-empty-then-added');
    if(mode==='retire-and-return'){
     root.animate([{opacity:.99},{opacity:1}],{duration:300});
     setTimeout(()=>{root.innerHTML=loading;if(phone)root.dataset.messagesState='loading';},60);
     setTimeout(()=>{const next=makeRoot();next.innerHTML=ready();root.replaceWith(next);root=next;},420);
    }
    if(mode==='permanent-loading'){root.innerHTML=loading;if(phone)root.dataset.messagesState='loading';}
    if(mode==='ready-empty-then-added'||mode==='ready-small-then-grown')setTimeout(()=>{root.innerHTML=ready();},1200);
    if(mode==='unavailable'){root.innerHTML='<h1>Access changed</h1><button style="height:44px">Try again</button>';if(phone)root.dataset.messagesState='denied';}
    if(mode==='wrong-body')root.querySelector('p').textContent='Different fictional update';
    if(mode==='wrong-revision'&&!phone)root.querySelector('article').dataset.updateRevision='other-revision';
   },setup);
   let result,failure;const measurements=[],start=performance.now();
   try{result=await measureCommunicationActions({page,phone,expectedPath:mode==='wrong-route'?'/different-route':'blank',expectedBody:'Fictional current update',expectedRevision:'fictional-revision',record:sample=>measurements.push(sample),timeout:mode==='permanent-loading'?400:5000});}
   catch(error){failure={name:error.name,message:error.message};}
   const elapsedMs=Math.round(performance.now()-start);
   const positive=['ready','retire-and-return'].includes(mode);
   if(positive){assert.equal(failure,undefined);assert(result.heights.length>0);assert(result.heights.every(h=>h>=44));if(mode==='retire-and-return')assert(result.animationSamples>0||result.pendingSamples>0);}
   else{
    assert(failure,'Negative sampler control must fail');
    if(mode==='ready-empty-then-added'){assert.match(failure.message,/were measured/);assert.deepEqual(measurements.map(s=>s.heights),[[]],'Ready-empty must fail on its first settled measurement');}
    if(mode==='ready-small-then-grown'){assert.match(failure.message,/44px/);assert.deepEqual(measurements.map(s=>s.heights),[[30]],'Ready-small must fail on its first settled measurement');}
    if(mode==='permanent-loading')assert(elapsedMs<2000,'Loading must remain bounded');
    if(mode==='unavailable')assert.match(failure.message,/unavailable/);
    if(mode==='wrong-body'||mode==='wrong-revision')assert.match(failure.message,/wrong-current-update/);
    if(mode==='wrong-route')assert.match(failure.message,/wrong-route/);
   }
   assert.deepEqual(errors,[]);
   cells.push({phone,mode,expected:positive?'pass':'fail',observed:failure?'fail':'pass',elapsedMs,...(result?{measurement:result}:{}),...(failure?{failure}:{}),runtimeErrors:errors.length});
  }finally{await context.close();}
 }
 return {verified:true,cells};
}
