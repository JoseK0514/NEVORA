import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {observeDocumentNavigation,observeWindowExceptions} from './browser-navigation-diagnostic.mjs';

const deferred=()=>{let resolve;const promise=new Promise(done=>{resolve=done;});return {promise,resolve};};
async function bounded(promise){let timer;try{return await Promise.race([promise,new Promise((_,reject)=>{timer=setTimeout(()=>reject(Error('Reload diagnostic control did not settle')),5000);})]);}finally{clearTimeout(timer);}}

/** Per-browser loopback proof. A matching message alone never establishes a
 * cancellation: the streaming successor deliberately emits the same message. */
export async function verifyReloadFetchDiagnostic(browser){
 const cells=[];
 for(const mode of ['idle','reload','goto-same','source-history','stream-redirect','window-exceptions']){
  const context=await browser.newContext({serviceWorkers:'block'}),page=await context.newPage();page.setDefaultNavigationTimeout(10000);
  const requested=deferred(),successorRead=deferred(),exceptionsSeen=deferred(),nativeSeen=deferred();
  let documents=0,serverReads=0,held,mainRequest,mainOpen=false,navigationResult;
  const windows=[],native=[];
  const server=createServer((request,response)=>{
   if(request.url==='/api/notifications'){
    serverReads++;response.writeHead(mode==='stream-redirect'?302:200,mode==='stream-redirect'?{location:'/redirect-control'}:{'content-type':'application/json','cache-control':'no-store'});response.end('{}');return;
   }
   if(request.url!=='/app/ai-manager'){response.writeHead(404);response.end();return;}
   documents++;
   if(documents===1){response.writeHead(200,{'content-type':'text/html','cache-control':'no-store'});response.end('<!doctype html><h1>Source</h1>');return;}
   held=response;requested.resolve();
  });
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  const origin='http://127.0.0.1:'+server.address().port,url=origin+'/app/ai-manager';
  const state=observeDocumentNavigation(page,()=>origin,{allowSameUrlReload:true});
  try{
   await context.route('**/*',route=>{assert.equal(new URL(route.request().url()).origin,origin);return route.continue();});
   await observeWindowExceptions(context,(_page,kind)=>{windows.push(kind);if(windows.length===2)exceptionsSeen.resolve();});
   await context.exposeBinding('__nevoraReloadControlDone',(_source,result,id)=>successorRead.resolve({result,id}));
   await context.addInitScript(()=>{globalThis.__nevoraReloadDocumentId=crypto.randomUUID();});
   const top=request=>request.isNavigationRequest()&&request.frame()===page.mainFrame();
   page.on('request',request=>{if(top(request)){mainRequest=request;mainOpen=true;}});
   for(const event of ['requestfinished','requestfailed'])page.on(event,request=>{if(request===mainRequest)mainOpen=false;});
   page.on('pageerror',error=>{
    if(error.name==='Fetch API cannot load http'&&error.message==='/'+origin.slice('http://'.length)+'/api/notifications due to access control checks.'){
     native.push({eligible:state.pending(),documentRequestOpen:mainOpen,documentNavigation:state.snapshot()});nativeSeen.resolve();
    }
   });
   await page.goto(url);
   const handle=await page.evaluateHandle(()=>({id:globalThis.__nevoraReloadDocumentId,async read(){
    try{const response=await fetch('/api/notifications',{credentials:'same-origin',cache:'no-store',redirect:'error',headers:{'X-Nevora-Employee-View':'fictional'},signal:new AbortController().signal});await response.json();return {id:this.id,status:response.status,handled:false};}
    catch{return {id:this.id,status:0,handled:true};}
   }}));
   const sourceId=await handle.evaluate(value=>value.id);let sourceRead,successor;
   if(mode!=='idle'){
    navigationResult=(mode==='goto-same'?page.goto(url):page.reload()).then(response=>response.status());await bounded(requested.promise);
   }
   if(mode==='source-history'){
    const event=page.waitForEvent('framenavigated',{predicate:frame=>frame===page.mainFrame()});
    await handle.evaluate(()=>history.replaceState(history.state,'',location.href));await bounded(event);
    assert.equal(await handle.evaluate(value=>value.id),sourceId);assert.equal(state.pending(),false);
   }
   if(mode==='stream-redirect'){
    held.writeHead(200,{'content-type':'text/html','cache-control':'no-store'});
    held.write('<!doctype html><html><body><script>fetch("/api/notifications",{credentials:"same-origin",cache:"no-store",redirect:"error"}).then(r=>r.json()).then(()=>__nevoraReloadControlDone(200,__nevoraReloadDocumentId),()=>__nevoraReloadControlDone(0,__nevoraReloadDocumentId));</script>'+' '.repeat(8192));
    successor=await bounded(successorRead.promise);assert.notEqual(successor.id,sourceId);assert.equal(mainOpen,true);
   }else if(mode==='window-exceptions'){
    await handle.evaluate((_value,host)=>{
     setTimeout(()=>{const error=new Error('/'+host+'/api/notifications due to access control checks.');error.name='Fetch API cannot load http';throw error;},0);
     void Promise.reject(Error('Fictional reload rejection'));
    },origin.slice('http://'.length));await bounded(Promise.all([exceptionsSeen.promise,nativeSeen.promise]));
   }else sourceRead=await bounded(handle.evaluate(value=>value.read()));
   if(held){if(held.headersSent)held.end('</body></html>');else{held.writeHead(200,{'content-type':'text/html','cache-control':'no-store'});held.end('<!doctype html><h1>Replacement</h1>');}}
   if(navigationResult)assert.equal(await bounded(navigationResult),200);
   const distinctReplacement=mode!=='idle'&&(await page.evaluate(()=>globalThis.__nevoraReloadDocumentId))!==sourceId;
   cells.push({mode,serverReads,sourceIdentityRetained:sourceRead?.id===sourceId,sourceStatus:sourceRead?.status??null,sourceHandled:sourceRead?.handled??null,
    distinctReplacement,successorStatus:successor?.result??null,native:[...native],windowExceptions:[...windows]});
  }finally{held?.end();await context.close();if(navigationResult)await navigationResult.catch(()=>{});server.closeAllConnections();await new Promise(resolve=>server.close(resolve));}
 }
 const cell=mode=>cells.find(value=>value.mode===mode),oneNative=(value,eligible)=>value.native.length===1&&value.native[0].eligible===eligible;
 const idle=cell('idle'),history=cell('source-history'),successor=cell('stream-redirect'),exceptions=cell('window-exceptions');
 const positives=['reload','goto-same'].every(mode=>{const value=cell(mode);return value.sourceIdentityRetained&&value.sourceHandled&&value.sourceStatus===0&&value.serverReads===0&&value.distinctReplacement&&value.windowExceptions.length===0&&oneNative(value,true)&&value.native[0].documentNavigation.phase==='reload-requested';});
 const negatives=idle.sourceIdentityRetained&&idle.sourceStatus===200&&idle.serverReads===1&&idle.native.length===0&&idle.windowExceptions.length===0
  &&history.sourceIdentityRetained&&history.sourceHandled&&history.serverReads===0&&history.windowExceptions.length===0&&oneNative(history,false)&&history.native[0].documentNavigation.phase==='reload-boundary'
  &&successor.distinctReplacement&&successor.successorStatus===0&&successor.serverReads===1&&successor.windowExceptions.length===0&&oneNative(successor,false)&&successor.native[0].documentRequestOpen
  &&exceptions.serverReads===0&&oneNative(exceptions,true)&&[...exceptions.windowExceptions].sort().join(',')==='error,unhandledrejection';
 const verified=positives&&negatives;
 return {status:verified?'mechanism-reproduced':'not-reproduced',verified,cells};
}
