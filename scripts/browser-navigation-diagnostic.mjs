import assert from 'node:assert/strict';
import {createServer} from 'node:http';

const reads=new Set(['notification-read','home-read','recorded-time-read']);
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
 let release,started,signal,ingress=0;
 const server=createServer((request,response)=>{
  if(request.url==='/read'){ingress++;response.setHeader('content-type','application/json');response.end('{"ok":true}');return;}
  const send=()=>{response.setHeader('content-type','text/html');response.end('<!doctype html><title>QA navigation control</title><h1>'+request.url+'</h1>');};
  if(request.url==='/replacement'){release=send;signal();}else send();
 });
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));const origin='http://127.0.0.1:'+server.address().port;
 const cells=[];let windowObserverVerified=false;
 try{
  for(const navigation of [false,true]){
   const context=await browser.newContext({serviceWorkers:'block'}),errors=[];let navigationResult,reportWindow;const windowEvents=[];
   try{
    await context.route('**/*',route=>{assert.equal(new URL(route.request().url()).origin,origin);return route.continue();});
    const page=await context.newPage();page.setDefaultTimeout(15000);
    await observeWindowExceptions(context,(_page,kind)=>{windowEvents.push(kind);reportWindow?.();});
    page.on('pageerror',error=>errors.push(error.name==='Fetch API cannot load http'&&error.message==='/'+origin.slice('http://'.length)+'/read due to access control checks.'));
    await page.goto(origin+'/initial');
    const handle=await page.evaluateHandle(()=>{
     const state={id:crypto.randomUUID(),errors:0,rejections:0,pagehide:0};
     addEventListener('error',()=>state.errors++);addEventListener('unhandledrejection',()=>state.rejections++);addEventListener('pagehide',()=>state.pagehide++);
     return {state,async read(){try{const response=await fetch('/read',{credentials:'same-origin',cache:'no-store',redirect:'error',headers:{'X-Nevora-QA':'fictional'}});await response.json();return {...state,status:response.status,handled:false};}catch{return {...state,status:0,handled:true};}}};
    });
    const identity=await handle.evaluate(value=>value.state.id),before=ingress;
    if(navigation){started=new Promise(resolve=>{signal=resolve;});navigationResult=page.goto(origin+'/replacement').then(response=>({ok:response?.ok()}),()=>({ok:false}));await started;}
    let timer,result;
    try{result=await Promise.race([handle.evaluate(value=>value.read()),new Promise((_,reject)=>{timer=setTimeout(()=>reject(Error('Navigation diagnostic read did not settle')),5000);})]);}
    finally{clearTimeout(timer);release?.();release=undefined;}
    if(navigation){assert((await navigationResult).ok);await page.getByRole('heading',{name:'/replacement',exact:true}).waitFor();}
    const cell={navigation,identityMatches:result.id===identity,status:result.status,handled:result.handled,windowErrors:result.errors,unhandledRejections:result.rejections,pagehide:result.pagehide,serverReads:ingress-before,nativeDiagnostics:errors.length,onlyExactNativeDiagnostic:errors.every(Boolean)};
    assert(cell.identityMatches);assert.equal(cell.windowErrors,0);assert.equal(cell.unhandledRejections,0);assert.equal(cell.pagehide,0);
    if(!navigation){assert.equal(cell.status,200);assert.equal(cell.serverReads,1);assert.equal(cell.nativeDiagnostics,0);}
    cells.push(cell);
    if(!navigation){
     let timer,reportPage;const pageEvents=new Promise(resolve=>{reportPage=resolve;});page.on('pageerror',()=>{if(errors.length===2)reportPage();});
     const observed=new Promise(resolve=>{reportWindow=()=>{if(windowEvents.length===2)resolve();};});
     await page.evaluate(()=>{setTimeout(()=>{throw Error('Fictional QA exception');},0);void Promise.reject(Error('Fictional QA rejection'));});
     try{await Promise.race([Promise.all([observed,pageEvents]),new Promise((_,reject)=>{timer=setTimeout(()=>reject(Error('Window exception observer did not report')),5000);})]);}
     finally{clearTimeout(timer);}
     assert.deepEqual([...windowEvents].sort(),['error','unhandledrejection']);windowObserverVerified=true;
    }
   }finally{release?.();release=undefined;if(navigationResult)await navigationResult;await context.close();}
  }
  const last=cells[1],verified=last.status===0&&last.handled&&last.serverReads===0&&last.nativeDiagnostics===1&&last.onlyExactNativeDiagnostic;
  return {status:verified?'mechanism-reproduced':'not-reproduced',verified:verified&&windowObserverVerified,windowObserverVerified,cells};
 }finally{release?.();server.closeAllConnections();await new Promise(resolve=>server.close(resolve));}
}
