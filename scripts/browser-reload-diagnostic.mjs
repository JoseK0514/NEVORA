import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {observeDocumentNavigation} from './browser-navigation-diagnostic.mjs';
import {observeBrowserCell} from './phase-e-browser-qa.mjs';

const deferred=()=>{let resolve;const promise=new Promise(done=>{resolve=done;});return {promise,resolve};};
async function bounded(promise){let timer;try{return await Promise.race([promise,new Promise((_,reject)=>{timer=setTimeout(()=>reject(Error('Reload diagnostic control did not settle')),5000);})]);}finally{clearTimeout(timer);}}

/** Per-browser loopback proof. A matching message alone never establishes a
 * cancellation: the streaming successor deliberately emits the same message. */
export async function verifyReloadFetchDiagnostic(browser,{resource='notifications',bothWitnesses=false}={}){
 assert(['notifications','authority'].includes(resource),'Unknown owned read diagnostic');
 const authority=resource==='authority',targetPath=authority?'/api/company-access/operational-authority':'/api/notifications';
 const resourceKind=authority?'authority-read':'notification-read',unprovedType=authority?'unproven-authority-read':'unproven-notification-read';
 const cells=[];
 for(const mode of ['idle','reload','goto-same','source-history','stream-redirect','window-exceptions','different-get','idle-post','reload-post','different-post','unrelated-get','unrelated-post','request-input','accessor-method','mutated-method','base-post-idle','base-post-after-get',...(authority?['query-get','body-get','overlapping-gets','without-native-proof','without-method-witness']:[])]){
  const context=await browser.newContext({serviceWorkers:'block'}),candidateErrors=[];
  // Enable the candidate only inside this fictional control, then verify its
  // positives AND its fatal negatives before returning an app eligibility bit.
  const candidate=observeBrowserCell({engine:'webkit',navigationDiagnostics:[]},candidateErrors,{navigationDiagnosticVerified:true,reloadDiagnosticVerified:true,authorityDiagnosticVerified:(authority||bothWitnesses)&&mode!=='without-native-proof',navigationReadKinds:[resourceKind],requireNotificationGetWitness:!authority||bothWitnesses,requireAuthorityGetWitness:(authority||bothWitnesses)&&mode!=='without-method-witness'});
  await candidate.observeContext(context,'primary');
  const page=await context.newPage();page.setDefaultNavigationTimeout(10000);
  const requested=deferred(),successorRead=deferred(),exceptionsSeen=deferred(),nativeSeen=deferred();
  let documents=0,serverReads=0,held,mainRequest,mainOpen=false,navigationResult;
  const windows=[],native=[];
  const server=createServer((request,response)=>{
   if(request.url===targetPath||request.url==='/api/employee/home'){
    serverReads++;response.writeHead(mode==='stream-redirect'?302:request.method==='GET'?200:405,mode==='stream-redirect'?{location:'/redirect-control'}:{'content-type':'application/json','cache-control':'no-store'});response.end('{}');return;
   }
   if(!['/app/ai-manager','/replacement'].includes(request.url)){response.writeHead(404);response.end();return;}
   documents++;
   if(documents===1){response.writeHead(200,{'content-type':'text/html','cache-control':'no-store'});response.end('<!doctype html><base href="/api/"><h1>Source</h1>');return;}
   held=response;requested.resolve();
  });
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  const origin='http://127.0.0.1:'+server.address().port,url=origin+'/app/ai-manager';
  const state=observeDocumentNavigation(page,()=>origin,{allowSameUrlReload:true});
  try{
   await context.route('**/*',route=>{assert.equal(new URL(route.request().url()).origin,origin);return route.continue();});
   await context.exposeBinding('__nevoraReloadControlWindowEvent',(_source,kind)=>{windows.push(kind);if(windows.length===2)exceptionsSeen.resolve();});
   await context.addInitScript(()=>{for(const kind of ['error','unhandledrejection'])addEventListener(kind,event=>{if(kind==='error'&&!(event instanceof ErrorEvent))return;void globalThis.__nevoraReloadControlWindowEvent(kind).catch(()=>{});});});
   await context.exposeBinding('__nevoraReloadControlDone',(_source,result,id)=>successorRead.resolve({result,id}));
   await context.addInitScript(()=>{globalThis.__nevoraReloadDocumentId=crypto.randomUUID();});
   const top=request=>request.isNavigationRequest()&&request.frame()===page.mainFrame();
   page.on('request',request=>{if(top(request)){mainRequest=request;mainOpen=true;}});
   for(const event of ['requestfinished','requestfailed'])page.on(event,request=>{if(request===mainRequest)mainOpen=false;});
   page.on('pageerror',error=>{
    if(error.name==='Fetch API cannot load http'&&[targetPath,'/api/employee/home'].some(path=>error.message==='/'+origin.slice('http://'.length)+path+' due to access control checks.')){
     native.push({eligible:state.pending(),classified:candidate.isNavigationDiagnostic(error),documentRequestOpen:mainOpen,documentNavigation:state.snapshot()});nativeSeen.resolve();
    }
   });
   await page.goto(url);
   const handle=await page.evaluateHandle(({targetPath,authority})=>({id:globalThis.__nevoraReloadDocumentId,async read(mode){
    const options={credentials:'same-origin',cache:'no-store',redirect:'error',headers:authority?{'x-nevora-company-access':'1'}:{'X-Nevora-Employee-View':'fictional'},signal:new AbortController().signal};
    const path=mode.startsWith('base-post-')?targetPath.slice('/api/'.length):mode.startsWith('unrelated-')?'/api/employee/home':mode==='query-get'?targetPath+'?fixture=1':targetPath;
    if(mode.endsWith('-post')||mode.startsWith('base-post-'))options.method='POST';
    if(mode==='accessor-method')Object.defineProperty(options,'method',{get:()=> 'POST'});
    if(mode==='mutated-method'){options.method='GET';queueMicrotask(()=>{options.method='POST';});}
    if(mode==='body-get')options.body='fictional-owned-body';
    try{const response=await fetch(mode==='request-input'?new Request(location.origin+path):path,options);await response.json();return {id:this.id,status:response.status,handled:false};}
    catch{return {id:this.id,status:0,handled:true};}
   }}),{targetPath,authority});
   const sourceId=await handle.evaluate(value=>value.id);let sourceRead,successor;
   if(!['idle','idle-post','base-post-idle'].includes(mode)){
    navigationResult=(mode==='goto-same'?page.goto(url):['different-get','different-post','unrelated-get','unrelated-post'].includes(mode)?page.goto(origin+'/replacement'):page.reload()).then(response=>response.status());await bounded(requested.promise);
   }
   if(mode==='source-history'){
    const event=page.waitForEvent('framenavigated',{predicate:frame=>frame===page.mainFrame()});
    await handle.evaluate(()=>history.replaceState(history.state,'',location.href));await bounded(event);
    assert.equal(await handle.evaluate(value=>value.id),sourceId);assert.equal(state.pending(),false);
   }
   if(mode==='stream-redirect'){
    held.writeHead(200,{'content-type':'text/html','cache-control':'no-store'});
    held.write('<!doctype html><html><body><script>fetch('+JSON.stringify(targetPath)+',{credentials:"same-origin",cache:"no-store",redirect:"error"}).then(r=>r.json()).then(()=>__nevoraReloadControlDone(200,__nevoraReloadDocumentId),()=>__nevoraReloadControlDone(0,__nevoraReloadDocumentId));</script>'+' '.repeat(8192));
    successor=await bounded(successorRead.promise);assert.notEqual(successor.id,sourceId);assert.equal(mainOpen,true);
   }else if(mode==='window-exceptions'){
    await handle.evaluate((_value,{host,targetPath})=>{
     setTimeout(()=>{const error=new Error('/'+host+targetPath+' due to access control checks.');error.name='Fetch API cannot load http';throw error;},0);
     void Promise.reject(Error('Fictional reload rejection'));
    },{host:origin.slice('http://'.length),targetPath});await bounded(Promise.all([exceptionsSeen.promise,nativeSeen.promise]));
   }else{if(mode==='base-post-after-get')await bounded(handle.evaluate(value=>value.read('reload')));sourceRead=await bounded(handle.evaluate(async(value,mode)=>mode==='overlapping-gets'?(await Promise.all([value.read(mode),value.read(mode)]))[0]:value.read(mode),mode));}
   if(held){if(held.headersSent)held.end('</body></html>');else{held.writeHead(200,{'content-type':'text/html','cache-control':'no-store'});held.end('<!doctype html><h1>Replacement</h1>');}}
   if(navigationResult)assert.equal(await bounded(navigationResult),200);
   const distinctReplacement=!['idle','idle-post','base-post-idle'].includes(mode)&&(await page.evaluate(()=>globalThis.__nevoraReloadDocumentId))!==sourceId;
   let candidateClean=true;try{candidate.assertClean();}catch{candidateClean=false;}
   cells.push({mode,serverReads,sourceIdentityRetained:sourceRead?.id===sourceId,sourceStatus:sourceRead?.status??null,sourceHandled:sourceRead?.handled??null,
    distinctReplacement,successorStatus:successor?.result??null,candidateClean,candidateUnproved:candidateErrors.filter(event=>event.type===unprovedType).length,candidateWindowErrors:candidateErrors.filter(event=>event.type==='window-javascript-error').length,native:[...native],windowExceptions:[...windows]});
  }finally{held?.end();await context.close();if(navigationResult)await navigationResult.catch(()=>{});server.closeAllConnections();await new Promise(resolve=>server.close(resolve));}
 }
 const cell=mode=>cells.find(value=>value.mode===mode),oneNative=(value,eligible)=>value.native.length===1&&value.native[0].eligible===eligible&&value.native[0].classified===eligible;
 const idle=cell('idle'),history=cell('source-history'),successor=cell('stream-redirect'),exceptions=cell('window-exceptions');
 const positives=['reload','goto-same','different-get'].every(mode=>{const value=cell(mode);return value.sourceIdentityRetained&&value.sourceHandled&&value.sourceStatus===0&&value.serverReads===0&&value.distinctReplacement&&value.candidateClean&&value.windowExceptions.length===0&&oneNative(value,true)&&value.native[0].documentNavigation.phase===(mode==='different-get'?'requested':'reload-requested');});
 const negatives=idle.sourceIdentityRetained&&idle.sourceStatus===200&&idle.serverReads===1&&idle.candidateClean&&idle.native.length===0&&idle.windowExceptions.length===0
  &&history.sourceIdentityRetained&&history.sourceHandled&&history.serverReads===0&&!history.candidateClean&&history.windowExceptions.length===0&&oneNative(history,false)&&history.native[0].documentNavigation.phase==='reload-boundary'
  &&successor.distinctReplacement&&successor.successorStatus===0&&successor.serverReads===1&&!successor.candidateClean&&successor.windowExceptions.length===0&&oneNative(successor,false)&&successor.native[0].documentRequestOpen
  &&exceptions.serverReads===0&&!exceptions.candidateClean&&exceptions.candidateWindowErrors===2&&exceptions.native.length===1&&!exceptions.native[0].classified&&[...exceptions.windowExceptions].sort().join(',')==='error,unhandledrejection';
 const postIdle=cell('idle-post');
 const unsupported=postIdle.serverReads===1&&postIdle.sourceStatus===405&&!postIdle.candidateClean&&postIdle.candidateUnproved===1&&postIdle.native.length===0
  &&['reload-post','different-post','request-input','accessor-method','mutated-method'].every(mode=>{const value=cell(mode);return value.serverReads===0&&value.sourceHandled&&!value.candidateClean&&value.candidateUnproved>0&&value.native.length===1&&!value.native[0].classified;})
  &&['unrelated-get','unrelated-post'].every(mode=>{const value=cell(mode);return value.serverReads===0&&value.sourceHandled&&!value.candidateClean&&value.candidateUnproved===0&&value.native.length===1&&!value.native[0].classified;});
 const baseIdle=cell('base-post-idle'),basePair=cell('base-post-after-get');
 const paired=baseIdle.serverReads===1&&baseIdle.sourceStatus===405&&!baseIdle.candidateClean&&baseIdle.candidateUnproved===1
  &&basePair.serverReads===0&&!basePair.candidateClean&&basePair.candidateUnproved===1&&basePair.native.length===2&&basePair.native[0].classified&&!basePair.native[1].classified;
 const authorityNegatives=!authority||['query-get','body-get','overlapping-gets','without-native-proof','without-method-witness'].every(mode=>!cell(mode).candidateClean);
 const verified=positives&&negatives&&unsupported&&paired&&authorityNegatives;
 return {status:verified?'mechanism-reproduced':'not-reproduced',verified,resourceKind,bothWitnesses,cells};
}
