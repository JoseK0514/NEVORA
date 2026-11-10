import assert from 'node:assert/strict';

/** Observe only: private reads may retire while finite animations settle. One
 * deadline covers every observation; ready layout defects never earn a retry. */
export async function measureCommunicationActions({page,phone,expectedPath,expectedBody,expectedRevision,record=()=>{},timeout=15_000}){
 const deadline=performance.now()+timeout,rootSelector=phone?'.em-messages':'.wb-update',bodySelector=phone?'.em-message-detail .em-message-copy':'.wb-update-body';
 const remaining=()=>{const ms=deadline-performance.now();assert(ms>0,'Current update actions did not settle before the original deadline');return ms;};
 const root=page.locator(rootSelector);await root.waitFor({state:'visible',timeout:remaining()});
 let pendingSamples=0,animationSamples=0;
 for(;;){
  remaining();
  // Role resolution, current identity, readiness and geometry are read in one
  // synchronous browser task. No awaited animation separates them.
  const sample=await root.getByRole('button').evaluateAll((nodes,args)=>{
   const roots=document.querySelectorAll(args.rootSelector),root=roots[0];
   if(location.pathname+location.search!==args.expectedPath)return {state:'wrong-route'};
   if(roots.length!==1||!root.isConnected)return {state:'missing-root'};
   const bodies=root.querySelectorAll(args.bodySelector),body=bodies[0],article=body?.closest(args.phone?'.em-message-detail':'article[data-update-revision]');
   if(body&&(bodies.length!==1||body.innerText!==args.expectedBody||!article||(!args.phone&&article.getAttribute('data-update-revision')!==args.expectedRevision)))return {state:'wrong-current-update'};
   const phoneState=root.getAttribute('data-messages-state');
   if(args.phone&&!['ready','loading'].includes(phoneState))return {state:'unavailable'};
   if(root.matches('[aria-busy="true"]')||root.querySelector('[aria-busy="true"]'))return {state:'pending'};
   if(!body||!article)return {state:'unavailable'};
   if(root.getAnimations({subtree:true}).some(a=>(a.playState==='running'||a.pending)&&Number.isFinite(a.effect?.getComputedTiming().endTime)))return {state:'animating'};
   if(nodes.some(n=>!n.isConnected||n.closest(args.rootSelector)!==root))return {state:'replaced-targets'};
   return {state:'ready',targets:nodes.map(n=>({label:(n.textContent??'').trim().slice(0,40),height:n.getBoundingClientRect().height}))};
  },{rootSelector,bodySelector,phone,expectedPath,expectedBody,expectedRevision});
  if(sample.state==='ready'){
   const heights=sample.targets.map(t=>t.height),measurement={heights,labels:sample.targets.map(t=>t.label),pendingSamples,animationSamples};
   record(measurement);
   assert(heights.length>0,'Current update actions were measured');
   assert(heights.every(h=>h>=44),'Current update actions keep 44px targets');
   return measurement;
  }
  assert(['pending','animating'].includes(sample.state),'Current update action sample requires the expected available update: '+sample.state);
  if(sample.state==='pending')pendingSamples++;else animationSamples++;
  // This wakeup only avoids busy polling. A fresh atomic sample rechecks every
  // predicate, so replacement between the wakeup and sampling is harmless.
  const wakeup=await page.waitForFunction(({rootSelector,bodySelector,phone,expectedPath,expectedBody,expectedRevision})=>{
   if(location.pathname+location.search!==expectedPath)return true;
   const root=document.querySelector(rootSelector);if(!root)return true;
   if(phone&&!['ready','loading'].includes(root.getAttribute('data-messages-state')))return true;
   const bodies=root.querySelectorAll(bodySelector),body=bodies[0],article=body?.closest(phone?'.em-message-detail':'article[data-update-revision]');
   if(body&&(bodies.length!==1||body.innerText!==expectedBody||!article||(!phone&&article.getAttribute('data-update-revision')!==expectedRevision)))return true;
   const pending=root.matches('[aria-busy="true"]')||root.querySelector('[aria-busy="true"]');
   const animating=root.getAnimations({subtree:true}).some(a=>(a.playState==='running'||a.pending)&&Number.isFinite(a.effect?.getComputedTiming().endTime));
   return !pending&&!animating;
  },{rootSelector,bodySelector,phone,expectedPath,expectedBody,expectedRevision},{polling:'raf',timeout:remaining()});
  await wakeup.dispose();
 }
}
