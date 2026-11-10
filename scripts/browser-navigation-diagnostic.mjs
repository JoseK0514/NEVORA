import assert from 'node:assert/strict';
import {createServer} from 'node:http';

const reads=new Set(['notification-read','home-read','recorded-time-read','requests-read','calendar-read','manager-today-read','action-center-read','clock-monitor-read']);
export function observeDocumentNavigation(page,origin=()=>new URL(page.url()).origin,{allowSameUrlReload=false}={}){
 let pending=null,phase='idle',startedAt=null,source=null,destination=null,sequence=0,sourceHistoryEvents=0,reload=false;
 const read=fn=>{try{return fn();}catch{return undefined;}};
 const documentUrl=value=>{const url=new URL(value);url.hash='';return url.href;};
 page.on('request',request=>{
  if(!read(()=>request.isNavigationRequest()&&request.frame()===page.mainFrame()))return;
  pending=null;phase='unproven';startedAt=Date.now();sequence++;sourceHistoryEvents=0;reload=false;
  source=read(()=>documentUrl(page.url()));destination=read(()=>documentUrl(request.url()));
  if(!source||!destination||!read(()=>new URL(destination).origin===origin()))return;
  if(source===destination){
   if(allowSameUrlReload===true&&read(()=>request.resourceType()==='document'&&request.method()==='GET')){pending=request;reload=true;phase='reload-requested';}
   else phase='same-url';return;
  }
  pending=request;phase='requested';
 });
 page.on('framenavigated',frame=>{
  if(!read(()=>frame===page.mainFrame())||!pending)return;
  const url=read(()=>documentUrl(frame.url()));
  // A same-URL frame event could be source history or the successor document.
  // End attribution conservatively; never wait for a streaming HTML body to finish.
  if(reload){pending=null;phase='reload-boundary';return;}
  // A history update in the source document is not the pending destination's commit.
  if(url===source){sourceHistoryEvents++;return;}
  pending=null;phase=url===destination?'committed':'unproven';
 });
 page.on('domcontentloaded',()=>{if(phase==='committed')phase='dom-ready';});
 const notificationRead=request=>read(()=>{const url=new URL(request.url());return request.method()==='GET'&&url.origin===origin()&&url.pathname==='/api/notifications'&&!url.username&&!url.password&&!url.search&&!url.hash;});
 page.on('response',response=>{
  if(!reload||!pending)return;const request=read(()=>response.request());
  if(request===pending){pending=null;phase='reload-response';}
  else if(notificationRead(request)&&read(()=>response.status()>=300)){pending=null;phase='reload-read-failure';}
 });
 page.on('requestfailed',request=>{if(pending===request){pending=null;phase='failed';}else if(reload&&pending&&notificationRead(request)){pending=null;phase='reload-read-failure';}});
 page.on('requestfinished',request=>{if(pending===request){pending=null;phase='finished';}});
 return {pending:()=>pending!==null,snapshot:()=>({phase,sequence,sourceHistoryEvents,ageMs:startedAt===null?null:Math.min(60000,Math.max(0,Date.now()-startedAt))})};
}
export function navigationFetchDiagnostic(execution,diagnostic,pending,verified,phase){
 return execution.engine==='webkit'&&verified===true&&pending===true&&phase==='scenario'&&diagnostic.plainOwnRead===true
  &&diagnostic.canonicalMessage==='Fetch API cannot load resource due to access control checks.'
  &&reads.has(diagnostic.resourceKind);
}

export async function observeWindowExceptions(context,report){
 await context.exposeBinding('__nevoraQaWindowException',(source,kind)=>report(source.page,kind==='error'||kind==='unhandledrejection'?kind:'invalid'));
 await context.addInitScript(()=>{
  for(const kind of ['error','unhandledrejection'])addEventListener(kind,event=>{
   if(kind==='error'&&!(event instanceof ErrorEvent))return;
   void globalThis.__nevoraQaWindowException(kind).catch(()=>{});
  });
 });
}

export async function verifyNavigationFetchDiagnostic(browser){
 const profiles=[
  {name:'private-get',options:{credentials:'same-origin',cache:'no-store',redirect:'error',headers:{'X-Nevora-QA':'fictional'}}},
  {name:'today-get',options:{method:'GET',credentials:'same-origin',cache:'no-store',headers:{'X-Nevora-Today':'1'}}},
  {name:'action-center-post-read',options:{method:'POST',credentials:'same-origin',cache:'no-store',headers:{'Content-Type':'application/json','X-Nevora-Action-Center':'1','X-Nevora-Actor':'fictional-qa'},body:JSON.stringify({weekStart:'2026-10-19'})}},
  {name:'clock-monitor-get',options:{method:'GET',credentials:'same-origin',cache:'no-store',redirect:'error',headers:{Accept:'application/json','X-Nevora-Monitor':'1'}}},
 ];
 let release,started,signal,ingress=0;
 const server=createServer((request,response)=>{
  if(request.url==='/read'){ingress++;response.setHeader('content-type','application/json');response.end('{"ok":true}');return;}
  const send=()=>{response.setHeader('content-type','text/html');response.end('<!doctype html><title>QA navigation control</title><h1>'+request.url+'</h1>');};
  if(request.url==='/replacement'){release=send;signal();}else send();
 });
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));const origin='http://127.0.0.1:'+server.address().port;
 const cells=[];let windowObserverVerifications=0;
 try{
  for(const profile of profiles){
  for(const navigation of [false,true]){
   const context=await browser.newContext({serviceWorkers:'block'}),errors=[];let navigationResult,reportWindow;const windowEvents=[];
   try{
    await context.route('**/*',route=>{assert.equal(new URL(route.request().url()).origin,origin);return route.continue();});
    const page=await context.newPage();page.setDefaultTimeout(15000);const navigationPhase=observeDocumentNavigation(page,()=>origin),nativeNavigation=[];
    await observeWindowExceptions(context,(_page,kind)=>{windowEvents.push(kind);reportWindow?.();});
    page.on('pageerror',error=>{const native=error.name==='Fetch API cannot load http'&&error.message==='/'+origin.slice('http://'.length)+'/read due to access control checks.';errors.push(native);if(native)nativeNavigation.push(navigationPhase.snapshot());});
    await page.goto(origin+'/initial');
    const handle=await page.evaluateHandle(()=>{
     const state={id:crypto.randomUUID(),errors:0,rejections:0,pagehide:0};
     addEventListener('error',()=>state.errors++);addEventListener('unhandledrejection',()=>state.rejections++);addEventListener('pagehide',()=>state.pagehide++);
     return {state,async read(options){try{const response=await fetch('/read',{...options,signal:new AbortController().signal});await response.json();return {...state,status:response.status,handled:false};}catch{return {...state,status:0,handled:true};}}};
    });
    const identity=await handle.evaluate(value=>value.state.id),before=ingress;
    if(navigation){
     started=new Promise(resolve=>{signal=resolve;});navigationResult=page.goto(origin+'/replacement').then(response=>({ok:response?.ok()}),()=>({ok:false}));await started;
     await handle.evaluate(()=>history.replaceState(history.state,'',location.href));
     assert.equal(navigationPhase.pending(),true,'Source-document history cannot commit another navigation destination');
    }
    let timer,result;
    try{result=await Promise.race([handle.evaluate((value,options)=>value.read(options),profile.options),new Promise((_,reject)=>{timer=setTimeout(()=>reject(Error('Navigation diagnostic read did not settle')),5000);})]);}
    finally{clearTimeout(timer);release?.();release=undefined;}
    if(navigation){assert((await navigationResult).ok);await page.getByRole('heading',{name:'/replacement',exact:true}).waitFor();assert.equal(navigationPhase.pending(),false,'Actual destination commit ends native-diagnostic eligibility');}
    const cell={profile:profile.name,navigation,identityMatches:result.id===identity,status:result.status,handled:result.handled,windowErrors:result.errors,unhandledRejections:result.rejections,pagehide:result.pagehide,serverReads:ingress-before,nativeDiagnostics:errors.length,onlyExactNativeDiagnostic:errors.every(Boolean),nativeNavigation};
    assert(cell.identityMatches);assert.equal(cell.windowErrors,0);assert.equal(cell.unhandledRejections,0);assert.equal(cell.pagehide,0);
    if(!navigation){assert.equal(cell.status,200);assert.equal(cell.serverReads,1);assert.equal(cell.nativeDiagnostics,0);}
    cells.push(cell);
    if(!navigation){
     let timer,reportPage;const pageEvents=new Promise(resolve=>{reportPage=resolve;});page.on('pageerror',()=>{if(errors.length===2)reportPage();});
     const observed=new Promise(resolve=>{reportWindow=()=>{if(windowEvents.length===2)resolve();};});
     await page.evaluate(()=>{setTimeout(()=>{throw Error('Fictional QA exception');},0);void Promise.reject(Error('Fictional QA rejection'));});
     try{await Promise.race([Promise.all([observed,pageEvents]),new Promise((_,reject)=>{timer=setTimeout(()=>reject(Error('Window exception observer did not report')),5000);})]);}
     finally{clearTimeout(timer);}
     assert.deepEqual([...windowEvents].sort(),['error','unhandledrejection']);windowObserverVerifications++;
    }
   }finally{release?.();release=undefined;if(navigationResult)await navigationResult;await context.close();}
  }
  }
  const windowObserverVerified=windowObserverVerifications===profiles.length;
  const verified=cells.length===profiles.length*2&&cells.filter(cell=>cell.navigation).every(cell=>cell.status===0&&cell.handled&&cell.serverReads===0&&cell.nativeDiagnostics===1&&cell.onlyExactNativeDiagnostic);
  return {status:verified?'mechanism-reproduced':'not-reproduced',verified:verified&&windowObserverVerified,windowObserverVerified,cells};
 }finally{release?.();server.closeAllConnections();await new Promise(resolve=>server.close(resolve));}
}
