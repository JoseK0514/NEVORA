import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {observeDocumentNavigation,observeWindowExceptions} from './browser-navigation-diagnostic.mjs';
import {observeRscCaughtErrors} from './rsc-caught-error-observer.mjs';
import {runBeforeRecoveryDeadline} from './browser-response-deadline.mjs';
import {projectFrameworkNativeDiagnostic} from './role-redirect-diagnostic.mjs';

// HTTP controls use the same browser binary as the application scenario. They
// validate observation, not the cause or acceptability of any application error.
export async function verifyRscCaughtErrorDiagnostic(browser){
 const profiles=[
  {kind:'rsc-get',path:'/app?_rsc=fictional',options:{method:'GET',credentials:'same-origin',cache:'no-store',headers:{rsc:'1'}}},
  {kind:'framework-frames-post',path:'/__nextjs_original-stack-frames',options:{method:'POST',body:JSON.stringify({frames:[],isServer:false,isEdgeServer:false,isAppDirectory:true})}},
 ];
 let hold=false,release,arrived,ingress=0;
 const server=createServer((request,response)=>{
  if(profiles.some(profile=>request.url===profile.path)||request.url==='/malformed'){
   ingress++;response.setHeader('content-type','application/json');response.end(request.url==='/malformed'?'fictional-invalid-json':'{}');return;
  }
  const send=()=>{response.setHeader('content-type','text/html');response.end('<!doctype html><h1>Fictional document</h1>');};
  if(hold){release=send;arrived();}else send();
 });
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 const origin='http://127.0.0.1:'+server.address().port,cells=[];
 const waitFor=async test=>{
  const deadline=Date.now()+5000;
  while(!test()){if(Date.now()>deadline)throw Error('Caught-error diagnostic observation did not settle');await new Promise(resolve=>setTimeout(resolve,10));}
 };
 try{
  for(const profile of profiles)for(const navigation of [false,true]){
   const context=await browser.newContext({serviceWorkers:'block'}),nativeEvents=[],windowEvents=[],caught=[],consoleEvents=[];
   let navigationResult;
   try{
    await runBeforeRecoveryDeadline(async()=>{
    await context.route('**/*',route=>{assert.equal(new URL(route.request().url()).origin,origin);return route.continue();});
    await context.addInitScript(()=>{globalThis.__fictionalDocument=crypto.randomUUID();});
    await observeWindowExceptions(context,(_page,kind)=>windowEvents.push(kind));
    await observeRscCaughtErrors(context,(_page,metadata)=>caught.push(metadata));
    const page=await context.newPage(),documentNavigation=observeDocumentNavigation(page,()=>origin);page.setDefaultTimeout(5000);
    page.on('pageerror',error=>nativeEvents.push({exactNative:error.name==='Fetch API cannot load http'&&error.message==='/'+origin.slice('http://'.length)+profile.path+' due to access control checks.',framework:projectFrameworkNativeDiagnostic(error,origin,'HTTP-CONTROL'),documentNavigation:documentNavigation.snapshot()}));
    page.on('console',message=>{if(message.type()==='error')consoleEvents.push(message.text().includes('Failed to fetch RSC payload for ')&&message.text().includes('Falling back to browser navigation.'));});
    await page.goto(origin+'/initial');
    const handle=await page.evaluateHandle(()=>({id:globalThis.__fictionalDocument,pagehide:0,errors:0,rejections:0}));
    await handle.evaluate(state=>{addEventListener('pagehide',()=>state.pagehide++);addEventListener('error',()=>state.errors++);addEventListener('unhandledrejection',()=>state.rejections++);});
    const id=await handle.evaluate(state=>state.id),before=ingress;
    if(navigation){
     hold=true;const incoming=new Promise(resolve=>{arrived=resolve;});navigationResult=page.reload().then(response=>response?.ok(),()=>false);await incoming;
     assert.equal(documentNavigation.snapshot().phase,'same-url');assert.equal(documentNavigation.pending(),false);
    }
    const result=await handle.evaluate(async(state,profile)=>{
     async function createFetch(){return fetch(profile.path,{...profile.options,signal:new AbortController().signal});}
     try{const response=await createFetch();await response.json();return {...state,status:response.status,handled:false};}
     catch(error){console.error('Failed to fetch RSC payload for '+new URL(profile.path,location.href).href+'. Falling back to browser navigation.',error);return {...state,status:0,handled:true};}
    },profile);
    if(navigation)await waitFor(()=>caught.length===1&&consoleEvents.length===1);
    const cell={kind:profile.kind,navigation,identityMatches:result.id===id,status:result.status,handled:result.handled,pagehide:result.pagehide,windowErrors:result.errors,unhandledRejections:result.rejections,serverReads:ingress-before,nativeEvents:[...nativeEvents],caught:[...caught],consolePreserved:consoleEvents.length===caught.length&&consoleEvents.every(Boolean)};
    hold=false;release?.();release=undefined;
    if(navigation){assert(await navigationResult);cell.newDocument=await page.evaluate(()=>globalThis.__fictionalDocument)!==id;assert(cell.newDocument);}
    assert(cell.identityMatches);assert.equal(cell.pagehide,0);assert.equal(cell.windowErrors,0);assert.equal(cell.unhandledRejections,0);assert.deepEqual(windowEvents,[]);
    if(navigation){assert.equal(cell.status,0);assert(cell.handled);assert.equal(cell.serverReads,0);assert.equal(cell.nativeEvents.length,1);assert(cell.nativeEvents[0].exactNative);assert(cell.consolePreserved);assert.equal(cell.caught[0].projectionUnavailable,false);}
    else{
     assert.equal(cell.status,200);assert.equal(cell.serverReads,1);assert.deepEqual(cell.nativeEvents,[]);assert.deepEqual(cell.caught,[]);
     await page.evaluate(async()=>{
      try{const response=await fetch('/malformed');await response.json();}
      catch(error){console.error('Failed to fetch RSC payload for '+new URL('/malformed',location.href).href+'. Falling back to browser navigation.',error);}
     });
     await waitFor(()=>caught.length===1&&consoleEvents.length===1);
     cell.processingControl={caught:caught[0],consolePreserved:consoleEvents.length===1&&consoleEvents[0]};
     assert.equal(cell.processingControl.caught.error.name,'SyntaxError');assert.equal(cell.processingControl.caught.error.messageKind,'other');assert(cell.processingControl.consolePreserved);
     assert.deepEqual(windowEvents,[]);
    }
    cells.push(cell);
    },performance.now()+5000);
   }finally{hold=false;release?.();release=undefined;await context.close();if(navigationResult)await navigationResult;}
  }
  return {observerVerified:cells.length===4,cells,limitation:'HTTP observation controls, not actual Next response processing or application error classification.'};
 }finally{hold=false;release?.();server.closeAllConnections();await new Promise(resolve=>server.close(resolve));}
}
