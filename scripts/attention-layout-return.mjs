import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {runBeforeRecoveryDeadline} from './browser-response-deadline.mjs';

/** Exercise the real week link without replacing the document that owns the
 * handled action/diagnostic reads. URL alone is never render readiness. */
export async function returnAttentionScheduleForLayout({page,origin,week,ready,deadline=performance.now()+15000}){
 assert.equal(typeof ready,'function');
 return runBeforeRecoveryDeadline(async()=>{
  const previous=page.getByRole('link',{name:'Previous week',exact:true});
  assert.equal(await previous.count(),1);
  assert.equal(await previous.getAttribute('href'),'/app/schedule?week='+week);
  const identity=await page.evaluate(()=>{const value=crypto.randomUUID();globalThis.__nevoraAttentionLayoutDocument=value;return value;});
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
    assert.equal(await page.evaluate(()=>globalThis.__nevoraAttentionLayoutDocument),identity,'The reviewed return must retain its original document');
    const current=new URL(page.url());assert.equal(current.origin,origin);assert.equal(current.pathname,'/app/schedule');assert.equal(current.searchParams.toString(),new URLSearchParams({week}).toString());
    assert.equal(documents,0,'A client week return cannot issue a main-frame document request');
    return {previousWeekLink:true,originalWeek:true,renderReady:true,sameDocument:true,mainFrameDocumentRequests:0};
   })()]);
  }finally{page.off('request',requested);}
 },deadline);
}

/** Actual-browser controls use early history and a held response body. They
 * prove that same-document identity, exact week and rendered content each gate
 * completion, including when a late body arrives after the original deadline. */
export async function verifyAttentionLayoutReturn(browser,{persist=async()=>{}}={}){
 const week='2028-01-10',empty='2028-01-17',wrong='2028-01-24',cells=[];
 for(const mode of ['client','document','wrong-week','late-body']){
  await persist({status:'running',currentMode:mode,cells});
  let held,seen;const requestedBody=new Promise(resolve=>{seen=resolve;});
  const server=createServer((request,response)=>{
   if(request.headers.rsc==='1'){
    response.writeHead(200,{'content-type':'text/plain','cache-control':'no-store'});
    if(mode==='late-body'){held=response;response.write('fictional partial');seen();}
    else response.end('fictional complete');
    return;
   }
   response.writeHead(200,{'content-type':'text/html','cache-control':'no-store'});
   const target='/app/schedule?week='+week;
   const script=mode==='document'?'':`<script>document.querySelector('a').addEventListener('click',async event=>{event.preventDefault();history.pushState({},'',${JSON.stringify('/app/schedule?week='+(mode==='wrong-week'?wrong:week))});const response=await fetch(${JSON.stringify(target)},{headers:{RSC:'1'},cache:'no-store'});await response.text();document.querySelector('main').dataset.reviewedWeek=${JSON.stringify(week)};document.querySelector('main').textContent=${JSON.stringify('Fictional reviewed week '+week)};});</script>`;
   response.end('<!doctype html><a aria-label="Previous week" href="'+target+'">Previous week</a><main></main>'+script);
  });
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));const origin='http://127.0.0.1:'+server.address().port;
  let context,page,documents=0,errors=0,complete=false;
  try{
   context=await browser.newContext({serviceWorkers:'block'});page=await context.newPage();
   await context.route('**/*',route=>{assert.equal(new URL(route.request().url()).origin,origin);return route.continue();});
   page.on('pageerror',()=>{errors++;});await page.goto(origin+'/app/schedule?week='+empty);
   page.on('request',request=>{if(request.isNavigationRequest()&&request.frame()===page.mainFrame())documents++;});
   const promise=returnAttentionScheduleForLayout({page,origin,week,ready:()=>page.getByText('Fictional reviewed week '+week,{exact:true}).waitFor(),deadline:performance.now()+(mode==='wrong-week'?1000:5000)});
   const outcome=promise.then(value=>{complete=true;return {passed:true,value};},error=>{complete=true;return {passed:false,error};});
   if(mode==='late-body'){
    await runBeforeRecoveryDeadline(()=>requestedBody,performance.now()+5000);
    await page.waitForURL(url=>url.searchParams.get('week')===week);
    assert.equal(complete,false);assert.equal(await page.locator('main[data-reviewed-week]').count(),0);assert.equal(held.writableEnded,false);
   }
   const result=await outcome;
   if(mode==='client'){
    assert.equal(result.passed,true);assert.deepEqual(result.value,{previousWeekLink:true,originalWeek:true,renderReady:true,sameDocument:true,mainFrameDocumentRequests:0});assert.equal(documents,0);
   }else{
    assert.equal(result.passed,false,'A negative navigation control cannot be accepted');
    if(mode==='document'){assert.match(result.error.message,/replacement document/);assert.equal(documents,1);}
    if(mode==='wrong-week'){assert.equal(new URL(page.url()).searchParams.get('week'),wrong);assert.equal(await page.locator('main[data-reviewed-week="'+week+'"]').count(),1);assert.equal(documents,0);}
    if(mode==='late-body'){
     assert.match(result.error.message,/original recovery deadline/);assert.equal(documents,0);
     held.end(' completed');await page.getByText('Fictional reviewed week '+week,{exact:true}).waitFor();
     await assert.rejects(promise,/original recovery deadline/);
    }
   }
   assert.equal(errors,0);cells.push({mode,status:'passed',accepted:result.passed,mainFrameDocumentRequests:documents,runtimeErrors:errors,...(mode==='late-body'?{bodyHeldBeforeDeadline:true,lateBodyCannotRescue:true}:{})});
  }catch(error){
   try{await persist({status:'failed',currentMode:mode,cells,mainFrameDocumentRequests:documents,runtimeErrors:errors});}catch{console.error('Layout control evidence unavailable; original control failure retained');}
   throw error;
  }finally{held?.end();try{await context?.close();}finally{server.closeAllConnections();await new Promise(resolve=>server.close(resolve));}}
 }
 assert.equal(cells.length,4);const result={status:'passed',cells};await persist(result);return result;
}
