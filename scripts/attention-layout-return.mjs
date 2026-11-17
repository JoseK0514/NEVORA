import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {runBeforeRecoveryDeadline} from './browser-response-deadline.mjs';
export const ATTENTION_SCHEDULE_TITLE='Schedule · NEVORA';

/** Exercise the real week link without replacing the document that owns the
 * handled action/diagnostic reads. URL alone is never render readiness. */
export async function returnAttentionScheduleForLayout({page,origin,week,ready,onTitleObservation=()=>{},deadline=performance.now()+15000}){
 assert.equal(typeof ready,'function');
 let identity;
 const observe=async stage=>{const value={stage,...await page.evaluate(({title,identity})=>({state:document.title===title?'expected':document.title.trim()?'wrong':'blank',titleElements:document.head.querySelectorAll(':scope > title').length,sameDocument:globalThis.__nevoraAttentionLayoutDocument===identity}),{title:ATTENTION_SCHEDULE_TITLE,identity})};await onTitleObservation(value);return value;};
 try{return await runBeforeRecoveryDeadline(async()=>{
  const previous=page.getByRole('link',{name:'Previous week',exact:true});
  assert.equal(await previous.count(),1);
  assert.equal(await previous.getAttribute('href'),'/app/schedule?week='+week);
  identity=await page.evaluate(()=>{const value=crypto.randomUUID();globalThis.__nevoraAttentionLayoutDocument=value;return value;});
  await observe('before-click');
  let documents=0,rejectDocument;
  const replacement=new Promise((_,reject)=>{rejectDocument=reject;});
  const requested=request=>{
   if(request.isNavigationRequest()&&request.frame()===page.mainFrame()){
    documents++;rejectDocument(Error('Attention layout return requested a replacement document'));
   }
  };
  page.on('request',requested);
  try{
   return await Promise.race([replacement,(async()=>{
    await previous.click({timeout:Math.max(1,deadline-performance.now())});
    await page.waitForURL(url=>url.origin===origin&&url.pathname==='/app/schedule'&&url.searchParams.toString()===new URLSearchParams({week}).toString(),{timeout:Math.max(1,deadline-performance.now())});
    await runBeforeRecoveryDeadline(ready,deadline);
    await observe('destination-body');
    // Retain the original Schedule driver's network-idle boundary. The single
    // outer deadline also owns these waits; neither may renew its time budget.
    await runBeforeRecoveryDeadline(()=>page.waitForLoadState('networkidle',{timeout:0}),deadline);
    await observe('network-idle');
    const titleReady=await runBeforeRecoveryDeadline(()=>page.waitForFunction(({title,identity})=>new Promise(resolve=>{
     let samples=0;const sample=()=>{samples=document.title===title&&document.head.querySelectorAll(':scope > title').length===1&&globalThis.__nevoraAttentionLayoutDocument===identity?samples+1:0;if(samples===2)resolve(true);else requestAnimationFrame(sample);};requestAnimationFrame(sample);
    }),{title:ATTENTION_SCHEDULE_TITLE,identity},{timeout:0}),deadline);
    await titleReady.dispose();const finalTitle=await observe('title-ready');assert.equal(finalTitle.state,'expected');assert.equal(finalTitle.titleElements,1);assert.equal(finalTitle.sameDocument,true);
    assert.equal(await page.evaluate(()=>globalThis.__nevoraAttentionLayoutDocument),identity,'The reviewed return must retain its original document');
    const current=new URL(page.url());assert.equal(current.origin,origin);assert.equal(current.pathname,'/app/schedule');assert.equal(current.searchParams.toString(),new URLSearchParams({week}).toString());
    assert.equal(documents,0,'A client week return cannot issue a main-frame document request');
    return {previousWeekLink:true,originalWeek:true,renderReady:true,sameDocument:true,mainFrameDocumentRequests:0,networkIdle:true,documentTitleReady:true,titleStableFrames:2};
   })()]);
  }finally{page.off('request',requested);}
 },deadline);}catch(error){try{await runBeforeRecoveryDeadline(()=>observe('failure'),performance.now()+1000);}catch{onTitleObservation({stage:'failure',state:'unavailable'});}throw error;}
}

/** Actual-browser controls use early history and a held response body. They
 * prove that same-document identity, exact week and rendered content each gate
 * completion, including when a late body arrives after the original deadline. */
export async function verifyAttentionLayoutReturn(browser,{persist=async()=>{}}={}){
 const week='2028-01-10',empty='2028-01-17',wrong='2028-01-24',cells=[];
 for(const mode of ['client','document','wrong-week','late-body','deferred-title','missing-title','whitespace-title','wrong-title','late-title']){
  await persist({status:'running',currentMode:mode,cells});
  let held,seen,observedIdle;const requestedBody=new Promise(resolve=>{seen=resolve;});const idleObserved=new Promise(resolve=>{observedIdle=resolve;});const titleObservations=[];
  const server=createServer((request,response)=>{
   if(request.headers.rsc==='1'){
    response.writeHead(200,{'content-type':'text/plain','cache-control':'no-store'});
    if(mode==='late-body'){held=response;response.write('fictional partial');seen();}
    else response.end('fictional complete');
    return;
   }
   response.writeHead(200,{'content-type':'text/html; charset=utf-8','cache-control':'no-store'});
   const target='/app/schedule?week='+week;
   const titleScript=['deferred-title','late-title'].includes(mode)?`document.title='';await new Promise(resolve=>{globalThis.__nevoraReleaseTitle=resolve;});document.title=${JSON.stringify(ATTENTION_SCHEDULE_TITLE)};`:mode==='missing-title'?`document.head.querySelector('title').remove();`:mode==='whitespace-title'?`document.title='   ';`:mode==='wrong-title'?`document.title='Other';`:'';
   const script=mode==='document'?'':`<script>document.querySelector('a').addEventListener('click',async event=>{event.preventDefault();history.pushState({},'',${JSON.stringify('/app/schedule?week='+(mode==='wrong-week'?wrong:week))});const response=await fetch(${JSON.stringify(target)},{headers:{RSC:'1'},cache:'no-store'});await response.text();document.querySelector('main').dataset.reviewedWeek=${JSON.stringify(week)};document.querySelector('main').textContent=${JSON.stringify('Fictional reviewed week '+week)};${titleScript}});</script>`;
   response.end('<!doctype html><title>'+ATTENTION_SCHEDULE_TITLE+'</title><a aria-label="Previous week" href="'+target+'">Previous week</a><main></main><svg aria-labelledby="fictional-graphic"><title id="fictional-graphic">Fictional graphic</title><rect width="10" height="10"/></svg>'+script);
  });
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));const origin='http://127.0.0.1:'+server.address().port;
  let context,page,documents=0,errors=0,complete=false;
  try{
   context=await browser.newContext({serviceWorkers:'block'});page=await context.newPage();
   await context.route('**/*',route=>{assert.equal(new URL(route.request().url()).origin,origin);return route.continue();});
   page.on('pageerror',()=>{errors++;});await page.goto(origin+'/app/schedule?week='+empty);
   page.on('request',request=>{if(request.isNavigationRequest()&&request.frame()===page.mainFrame())documents++;});
   const promise=returnAttentionScheduleForLayout({page,origin,week,ready:()=>page.getByText('Fictional reviewed week '+week,{exact:true}).waitFor(),onTitleObservation:value=>{titleObservations.push(value);if(value.stage==='network-idle')observedIdle(value);},deadline:performance.now()+(['wrong-week','missing-title','whitespace-title','wrong-title'].includes(mode)?1000:5000)});
   const outcome=promise.then(value=>{complete=true;return {passed:true,value};},error=>{complete=true;return {passed:false,error};});
   if(mode==='late-body'){
    await runBeforeRecoveryDeadline(()=>requestedBody,performance.now()+5000);
    await page.waitForURL(url=>url.searchParams.get('week')===week);
    assert.equal(complete,false);assert.equal(await page.locator('main[data-reviewed-week]').count(),0);assert.equal(held.writableEnded,false);
   }
   if(['deferred-title','late-title'].includes(mode)){
    const idle=await runBeforeRecoveryDeadline(()=>idleObserved,performance.now()+5000);assert.equal(idle.state,'blank');assert.equal(idle.titleElements,1);await page.getByText('Fictional reviewed week '+week,{exact:true}).waitFor();assert.equal(await page.title(),'');assert.equal(complete,false);
    if(mode==='deferred-title')await page.evaluate(()=>globalThis.__nevoraReleaseTitle());
   }
   const result=await outcome;
   if(['client','deferred-title'].includes(mode)){
    assert.equal(result.passed,true,result.error?.message);assert.deepEqual(result.value,{previousWeekLink:true,originalWeek:true,renderReady:true,sameDocument:true,mainFrameDocumentRequests:0,networkIdle:true,documentTitleReady:true,titleStableFrames:2});assert.equal(documents,0);
   }else{
    assert.equal(result.passed,false,'A negative navigation control cannot be accepted');
    if(mode==='document'){assert.match(result.error.message,/replacement document/);assert.equal(documents,1);}
    if(mode==='wrong-week'){assert.equal(new URL(page.url()).searchParams.get('week'),wrong);assert.equal(await page.locator('main[data-reviewed-week="'+week+'"]').count(),1);assert.equal(documents,0);}
    if(mode==='late-body'){
     assert.match(result.error.message,/original recovery deadline/);assert.equal(documents,0);
     held.end(' completed');await page.getByText('Fictional reviewed week '+week,{exact:true}).waitFor();
     await assert.rejects(promise,/original recovery deadline/);
    }
    if(['missing-title','whitespace-title','wrong-title'].includes(mode)){assert.match(result.error.message,/original recovery deadline/);assert.equal(documents,0);assert.equal(await page.getByText('Fictional reviewed week '+week,{exact:true}).count(),1);assert.equal(await page.title(),mode==='wrong-title'?'Other':'');if(mode==='whitespace-title')assert.equal(await page.locator('head > title').textContent(),'   ');assert(titleObservations.some(v=>v.stage==='network-idle'&&v.state===(mode==='wrong-title'?'wrong':'blank')));}
    if(mode==='late-title'){assert.match(result.error.message,/original recovery deadline/);assert.equal(documents,0);await page.evaluate(()=>globalThis.__nevoraReleaseTitle());await page.waitForFunction(title=>document.title===title,ATTENTION_SCHEDULE_TITLE);await assert.rejects(promise,/original recovery deadline/);}
   }
   if(['deferred-title','late-title'].includes(mode)){assert(titleObservations.some(v=>v.stage==='before-click'&&v.state==='expected'));assert(titleObservations.some(v=>v.stage==='destination-body'&&v.state==='blank'));}
   assert.equal(errors,0);cells.push({mode,status:'passed',accepted:result.passed,mainFrameDocumentRequests:documents,runtimeErrors:errors,titleObservations,...(mode==='late-body'?{bodyHeldBeforeDeadline:true,lateBodyCannotRescue:true}:{}),...(mode==='late-title'?{titleHeldBeforeDeadline:true,lateTitleCannotRescue:true}:{})});
  }catch(error){
   try{await persist({status:'failed',currentMode:mode,cells,mainFrameDocumentRequests:documents,runtimeErrors:errors,titleObservations});}catch{console.error('Layout control evidence unavailable; original control failure retained');}
   throw error;
  }finally{held?.end();try{await context?.close();}finally{server.closeAllConnections();await new Promise(resolve=>server.close(resolve));}}
 }
 assert.equal(cells.length,9);const result={status:'passed',cells};await persist(result);return result;
}
