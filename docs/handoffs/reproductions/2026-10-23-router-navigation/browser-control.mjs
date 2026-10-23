import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {resolve} from 'node:path';
const runtime=createRequire(resolve('tools/ci-browser-runtime/package.json'));
const playwright=runtime('playwright'),origin=process.env.FICTIONAL_ROUTER_ORIGIN,engine=process.env.FICTIONAL_ROUTER_ENGINE??'webkit';
assert(origin&&new URL(origin).hostname==='127.0.0.1'&&new URL(origin).protocol==='http:'&&new URL(origin).origin===origin);
assert(['chromium','webkit'].includes(engine));
const versions=await(await fetch(origin+'/api/fixture-version')).json();
assert.equal(versions.fixture,'nevora-fictional-router-control');assert.equal(versions.next,'16.4.2');assert.equal(versions.react,'19.3.0');
const browser=await playwright[engine].launch({headless:true}),result={engine,browser:browser.version(),next:versions.next,react:versions.react,cases:[]};
try{
 for(const mode of ['hard','link']){
  const context=await browser.newContext({serviceWorkers:'block'}),page=await context.newPage(),events=[];page.setDefaultTimeout(5000);
  await context.route('**/*',route=>new URL(route.request().url()).origin===origin?route.continue():route.abort());
  page.on('pageerror',error=>events.push({kind:'pageerror',sourceRsc:error.message.includes('/source')&&error.message.endsWith('due to access control checks.'),nextFrames:error.message.includes('/__nextjs_original-stack-frames')&&error.message.endsWith('due to access control checks.')}));
  page.on('request',request=>{const u=new URL(request.url());if(u.origin===origin&&['/source','/destination'].includes(u.pathname))events.push({kind:'request',path:u.pathname,navigation:request.isNavigationRequest(),rsc:request.headers().rsc==='1'});});
  page.on('framenavigated',frame=>{if(frame===page.mainFrame())events.push({kind:'commit',path:new URL(frame.url()).pathname});});
  let release,arrive,navigation,destinationSeen=false;
  try{
   await page.goto(origin+'/source');await page.waitForFunction(()=>document.documentElement.dataset.fixtureReady==='yes');
   let triggered;const triggeredPromise=new Promise(resolve=>{triggered=resolve;});
   await context.exposeBinding('__fictionalRefreshStarted',()=>triggered({destinationSeen}));
   const started=new Promise(resolve=>{arrive=resolve;});
   let holding=true;const held=[];
   release=async()=>{holding=false;await Promise.all(held.splice(0).map(resume=>resume()));};
   await page.route('**/destination*',route=>holding?new Promise(resolve=>{held.push(()=>route.continue().then(resolve));destinationSeen=true;arrive();}):route.continue());
   await page.evaluate(()=>{setTimeout(()=>{void window.__fictionalRefreshStarted();window.refreshFictionalRouter();},200);});
   if(mode==='hard')navigation=page.goto(origin+'/destination').then(()=>({status:'completed'}),error=>({status:'failed',interrupted:error.message.includes('is interrupted by another navigation'),sourceFallback:error.message.includes('/source')}));
   else{navigation=page.getByRole('link',{name:'Insights',exact:true}).click().then(()=>({status:'clicked'}));}
   await Promise.race([started,new Promise((_,reject)=>setTimeout(()=>reject(Error('No destination request')),5000))]);
   const trigger=await Promise.race([triggeredPromise,new Promise((_,reject)=>setTimeout(()=>reject(Error('Refresh signal was not consumed')),5000))]);
   assert.equal(trigger.destinationSeen,true,'Controlled refresh must run after the destination request is held');
   if(mode==='hard'){
    const outcome=await Promise.race([navigation,new Promise(resolve=>setTimeout(()=>resolve({status:'pending'}),3000))]);
    await release();release=undefined;const finalOutcome=await navigation;
    result.cases.push({mode,triggeredAfterDestination:trigger.destinationSeen,outcome,finalOutcome,events:[...events]});
   }else{
    await release();release=undefined;await navigation;await page.getByRole('heading',{name:'Fictional destination',exact:true}).waitFor();
    result.cases.push({mode,triggeredAfterDestination:trigger.destinationSeen,path:new URL(page.url()).pathname,events:[...events]});
   }
  }catch(error){result.cases.push({mode,outcome:{status:'failed',name:error.name},path:new URL(page.url()).pathname,events:[...events]});throw error;}
  finally{if(release)await release().catch(()=>{});await context.close();if(navigation)await navigation.catch(()=>{});}
 }
}finally{await browser.close();result.browserClosed=!browser.isConnected();console.log(JSON.stringify(result,null,2));}
const hard=result.cases.find(c=>c.mode==='hard'),link=result.cases.find(c=>c.mode==='link');
assert.equal(link.path,'/destination');assert.equal(link.events.filter(e=>e.kind==='pageerror').length,0);
if(engine==='webkit'){
 assert.equal(hard.finalOutcome.interrupted,true);assert.equal(hard.finalOutcome.sourceFallback,true);
 const errors=hard.events.filter(e=>e.kind==='pageerror');assert.equal(errors.length,2);assert(errors.every(e=>e.sourceRsc||e.nextFrames));
}else{assert.equal(hard.finalOutcome.status,'completed');assert.equal(hard.events.filter(e=>e.kind==='pageerror').length,0);}
assert.equal(result.browserClosed,true);
