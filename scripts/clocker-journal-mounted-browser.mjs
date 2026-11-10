import assert from 'node:assert/strict';
import {build} from 'esbuild';
import {readFile,writeFile} from 'node:fs/promises';
import {join,resolve} from 'node:path';

/** Real mounted recovery UI; only unused Next Image and the fictional HTTP boundary are substituted. */
export async function mountedJournalBundle(){
 const negative=process.env.CLOCKER_JOURNAL_SCOPE_NEGATIVE_CONTROL==='1';
 const bundle=await build({
  stdin:{contents:`import React from 'react';import{createRoot}from'react-dom/client';import{ClockerPinGate}from'./src/components/clocker-pin-gate';import{ClockerPresentation}from'./src/components/clocker-language';
   createRoot(document.getElementById('root')).render(<ClockerPresentation v2><ClockerPinGate locationKey="mounted-identity" timeZone="UTC" punchEnabled/></ClockerPresentation>);`,resolveDir:process.cwd(),loader:'tsx'},
  bundle:true,write:false,outdir:resolve('.journal-mounted-fixture'),platform:'browser',format:'iife',jsx:'automatic',loader:{'.module.css':'local-css'},
  define:{'process.env.NODE_ENV':'"development"','process.env':'{}'},
  plugins:[{name:'fictional-next-image-boundary',setup(builder){
   builder.onResolve({filter:/^next\/image$/},()=>({path:'image',namespace:'fixture'}));
   builder.onLoad({filter:/.*/,namespace:'fixture'},()=>({contents:'import React from "react";export default function Image(props){return React.createElement("img",props);}',loader:'js',resolveDir:process.cwd()}));
   if(negative)builder.onLoad({filter:/\/clocker-punch-panel\.tsx$/},async args=>{
    const original=await readFile(args.path,'utf8'),scoped='const {references:refs}=await store.references(locationKey,fresh.subject);';
    assert.equal(original.split(scoped).length,2,'Negative control must replace the exact initial subject-scoped read once');
    return {contents:original.replace(scoped,"const refs=fresh.subject==='2'.repeat(64)?await store.references(locationKey):(await store.references(locationKey,fresh.subject)).references;"),loader:'tsx',resolveDir:resolve('src/components')};
   });
  }}],
 });
 return {js:bundle.outputFiles.find(file=>file.path.endsWith('.js')).contents,css:bundle.outputFiles.find(file=>file.path.endsWith('.css')).contents,negative};
}

export async function runMountedJournalTransition(context,origin,engine,evidence){
 const result={engine,status:'failed',negativeControl:process.env.CLOCKER_JOURNAL_SCOPE_NEGATIVE_CONTROL==='1',observations:[],errors:[],requests:[]};
 const page=await context.newPage();page.setDefaultTimeout(10000);
 page.on('pageerror',error=>result.errors.push({message:error.message,stack:error.stack}));
 const location='mounted-identity',subjectA='1'.repeat(64),subjectB='2'.repeat(64),verification='b'.repeat(64);
 const command=(commandId)=>({commandId,action:'CLOCK_IN',verificationId:verification,expected:{revision:0,timeEntryId:null,timeEntryVersion:null,breakEntryId:null,breakEntryVersion:null}});
 const a={subject:subjectA,command:command('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa')};
 const aHistory={subject:subjectA,command:command('cccccccc-cccc-4ccc-8ccc-cccccccccccc')};
 const bHistory={subject:subjectB,command:command('dddddddd-dddd-4ddd-8ddd-dddddddddddd')};
 let identity=null;
 const route=async request=>{
  const body=request.request().postDataJSON();result.requests.push({path:new URL(request.request().url()).pathname,...body});
  const reply=(json,status=200)=>request.fulfill({status,json});
  if(request.request().url().endsWith('/pin')){
   if(body.action==='clear'){identity=null;return reply({state:'idle'});}
   if(body.action==='verify'){assert(['1111','2222'].includes(body.pin));identity=body.pin==='1111'?'A':'B';}
   return reply(identity?{state:'verified',firstName:identity==='A'?'Avery':'Blair',expiresAt:new Date(Date.now()+120000).toISOString()}:{state:'idle'});
  }
  assert.equal(body.operation,'state','Privacy transitions must not replay a punch or request another person receipt');
  assert(identity,'A punch state read requires the fictional PIN boundary to be verified');
  return reply({state:'ready',subject:identity==='A'?subjectA:subjectB,verificationId:verification,firstName:identity==='A'?'Avery':'Blair',expiresAt:new Date(Date.now()+120000).toISOString(),locationId:location,atOtherLocation:false,snapshot:{entry:null,break:null,revision:0},allowedActions:['CLOCK_IN'],breakTypes:[]});
 };
 await context.route('**/api/clocker/mounted-identity/*',route);
 const state=()=>page.evaluate(()=>({pin:document.querySelector('[data-clocker-pin]')?.getAttribute('data-clocker-pin'),panel:document.querySelector('[data-clocker-state]')?.getAttribute('data-clocker-state'),text:document.querySelector('main').textContent,codes:[...document.querySelectorAll('code')].map(e=>e.textContent),actions:[...document.querySelectorAll('button[data-clocker-action]')].map(e=>e.getAttribute('aria-label'))}));
 const noA=value=>{assert(!value.text.includes(a.command.commandId),'A pending reference must be absent from another identity DOM');assert(!value.text.includes(aHistory.command.commandId),'A resolved-history reference must be absent from another identity DOM');};
 const pin=async digits=>{await page.getByRole('heading',{name:'Enter your PIN',exact:true}).waitFor();await page.waitForFunction(()=>!document.querySelector('input[name=pin]').disabled);await page.getByLabel('Employee PIN',{exact:true}).fill(digits);await page.getByRole('button',{name:'Continue',exact:true}).click();};
 try{
  await page.goto(origin+'/mounted');await page.getByRole('heading',{name:'Enter your PIN',exact:true}).waitFor();
  await page.evaluate(async({location,a,aHistory,bHistory})=>{const store=await ClockerJournal.openClockerJournal();try{await store.saveExact(location,aHistory);await store.resolveExact(location,aHistory,'recorded');await store.saveExact(location,bHistory);await store.resolveExact(location,bHistory,'reviewed-context');await store.saveExact(location,a);}finally{store.close();}},{location,a,aHistory,bHistory});
  await pin('1111');await page.getByRole('button',{name:'Check Action Status',exact:true}).waitFor();await page.getByRole('button',{name:'Help with a saved action',exact:true}).click();
  const aView=await state();assert.deepEqual(aView.codes.sort(),[a.command.commandId,aHistory.command.commandId].sort());assert.deepEqual(aView.actions,[]);assert(!aView.text.includes(bHistory.command.commandId),'A sees only its own pending/history');
  result.observations.push({phase:'A verified: actual panel reads pending and resolved history',...aView});
  await page.getByRole('button',{name:'Return to PIN',exact:true}).click();await page.getByRole('heading',{name:'Enter your PIN',exact:true}).waitFor();
  const unverified=await state();assert.equal(unverified.pin,'entry');assert.equal(unverified.panel,undefined);assert.deepEqual(unverified.codes,[]);assert.deepEqual(unverified.actions,[]);noA(unverified);
  result.observations.push({phase:'A → unverified: private panel unmounts and identifiers/actions clear',...unverified});
  await pin('2222');await page.getByRole('button',{name:'Clock In',exact:true}).waitFor();await page.getByRole('button',{name:'Help with a saved action',exact:true}).click();
  const bView=await state();noA(bView);assert.deepEqual(bView.codes,[bHistory.command.commandId]);assert.deepEqual(bView.actions,['Clock In']);assert.equal(await page.getByRole('button',{name:'Check Action Status',exact:true}).count(),0);assert.equal(await page.getByRole('button',{name:'Retry Same Action',exact:true}).count(),0);assert.equal(await page.getByRole('button',{name:'Review current status',exact:true}).count(),0);
  result.observations.push({phase:'B verified: only B history and B current actions render',...bView});
  await page.getByRole('button',{name:'Done',exact:true}).click();await pin('1111');await page.getByRole('button',{name:'Check Action Status',exact:true}).waitFor();await page.getByRole('button',{name:'Help with a saved action',exact:true}).click();
  const returned=await state();assert.deepEqual(returned.codes.sort(),aView.codes);assert.deepEqual(returned.actions,[]);
  const retained=await page.evaluate(async({location,subject})=>{const store=await ClockerJournal.openClockerJournal();try{return {pending:await store.read(location,subject),owner:await store.references(location)};}finally{store.close();}},{location,subject:subjectA});
  assert.deepEqual(retained.pending,a);assert.deepEqual(retained.owner.map(item=>item.commandId).sort(),[a.command.commandId,aHistory.command.commandId,bHistory.command.commandId].sort());assert(result.requests.every(item=>item.operation!=='execute'&&item.operation!=='receipt'));assert.deepEqual(result.errors,[]);
  result.observations.push({phase:'Return to A preserves exact pending/history; independent unscoped Owner overload retains A/B records',...returned,retained});result.status='passed';
 }catch(error){result.failure={message:error.message,stack:error.stack};result.dom=await state().catch(()=>null);throw error;}
 finally{
  if(evidence){await page.screenshot({path:join(evidence,engine+'-mounted-identity.png'),fullPage:true});await writeFile(join(evidence,engine+'-mounted-identity.json'),JSON.stringify(result,null,2));}
  await page.close();await context.unroute('**/api/clocker/mounted-identity/*',route);
 }
 return result;
}
