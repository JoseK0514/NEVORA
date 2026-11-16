import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {createServer} from 'node:http';
import {createRequire} from 'node:module';
import {readFile,writeFile} from 'node:fs/promises';
import {join,resolve} from 'node:path';
import {captureSource,assertSourceUnchanged,externalEvidence} from './phase-e-owned.mjs';

const source=resolve(process.cwd()),custody=captureSource(source,process.env.PHASE_C_EXPECTED_SHA);
const evidence=externalEvidence(source,process.env.PHASE_C_EVIDENCE_DIR);
const project=createRequire(join(source,'package.json'));
const runtime=createRequire(join(source,'tools/ci-browser-runtime/package.json'));
const playwright=runtime('playwright');
const component=await readFile(join(source,'src/components/clocker-punch-panel.tsx'));
const bundle=await project('esbuild').build({
 stdin:{contents:`import React,{useState} from 'react';import{createRoot}from'react-dom/client';import{ClockerPunchPanel}from'./src/components/clocker-punch-panel';
 function Fixture(){const[resume,setResume]=useState(null);window.fixtureResume=step=>setResume({subject:'c'.repeat(64),mode:'select-break',binding:'outdated-fixture-binding-'+step});return <ClockerPunchPanel locationKey="2" timeZone="UTC" onDone={()=>{}} resume={resume}/>;}
 createRoot(document.getElementById('root')).render(<Fixture/>);`,resolveDir:source,loader:'tsx'},
 bundle:true,write:false,outdir:join(source,'.journal-lifecycle-fixture'),platform:'browser',format:'iife',jsx:'automatic',
 loader:{'.css':'empty','.module.css':'local-css','.ttf':'dataurl'},define:{'process.env.NODE_ENV':'"development"','process.env':'{}'},
 plugins:[{name:'local-clocker-font',setup(builder){builder.onResolve({filter:/^\/fonts\/clocker\/inter-variable\.ttf$/},()=>({path:join(source,'public/fonts/clocker/inter-variable.ttf')}));}}],
});
const javascript=bundle.outputFiles.find(file=>file.path.endsWith('.js')).text;
let reads=0,writes=0;
const server=createServer(async(request,response)=>{
 if(request.url==='/bundle.js'){response.setHeader('content-type','application/javascript');response.end(javascript);return;}
 if(request.url==='/api/clocker/2/punch'&&request.method==='POST'){
  let body='';for await(const chunk of request)body+=chunk;
  response.setHeader('content-type','application/json');
  if(JSON.parse(body).operation!=='state'){writes++;response.writeHead(409);response.end('{"error":"Only fictional state reads are allowed"}');return;}
  reads++;response.end(JSON.stringify({state:'ready',subject:'c'.repeat(64),verificationId:'d'.repeat(64),firstName:'Avery '+reads,
   expiresAt:new Date(Date.now()+60000).toISOString(),locationId:'loc-1',snapshot:{revision:0,entry:null,break:null},
   atOtherLocation:false,breakTypes:[],allowedActions:['CLOCK_IN']}));return;
 }
 response.setHeader('content-type','text/html');response.end('<!doctype html><div id="root"></div><script src="/bundle.js"></script>');
});
await new Promise(ready=>server.listen(0,'127.0.0.1',ready));
const origin='http://127.0.0.1:'+server.address().port,results=[];
try{for(const engine of ['chromium','webkit']){
 reads=0;writes=0;const browser=await playwright[engine].launch();
 const result={engine,status:'failed',observations:[]};results.push(result);
 try{
  const context=await browser.newContext();let externalRequests=0;
  await context.route('**/*',route=>{if(new URL(route.request().url()).origin!==origin){externalRequests++;return route.abort();}return route.continue();});
  const page=await context.newPage();page.setDefaultTimeout(5000);const errors=[];page.on('pageerror',error=>errors.push(error.message));
  await page.goto(origin);await page.getByRole('button',{name:'Clock in',exact:true}).waitFor();
  for(const step of [1,2,3]){
   await page.evaluate(step=>window.fixtureResume(step),step);
   // A stale Ready frame cannot pass: await the new response's distinct heading or a failure state.
   await page.waitForFunction(expected=>['storage','unavailable'].includes(document.querySelector('[data-clocker-state]')?.getAttribute('data-clocker-state'))||document.querySelector('h1')?.textContent===expected,'Hi, Avery '+(step+1)+'.');
   const state=await page.locator('[data-clocker-state]').getAttribute('data-clocker-state');
   result.observations.push({step,state});assert.equal(state,'ready','Restarted state reading must open a usable journal rather than reuse the cleanup-closed connection');
   await page.getByRole('heading',{name:'Hi, Avery '+(step+1)+'.',exact:true}).waitFor();
   await page.getByRole('button',{name:'Clock in',exact:true}).waitFor();
  }
  assert.equal(reads,4);assert.equal(writes,0);assert.equal(externalRequests,0);assert.deepEqual(errors,[]);
  result.status='passed';result.reads=reads;result.writes=writes;await context.close();
 }catch(error){result.failure={name:error.name,message:error.message};}
 finally{await browser.close();result.browserClosed=!browser.isConnected();}
 console.log(JSON.stringify(result));
}}finally{await new Promise(ready=>server.close(ready));}
assertSourceUnchanged(source,custody);
const passed=results.length===2&&results.every(result=>result.status==='passed'&&result.browserClosed);
const report={checkpoint:custody.checkpoint,tree:custody.tree,sourceClean:true,sourceUnchanged:true,status:passed?'passed':'failed',componentSha256:createHash('sha256').update(component).digest('hex'),results,
 limitations:['Actual component, React and IndexedDB with fictional loopback HTTP state responses; no authenticated Next/PostgreSQL, hosted, physical-device or visual certification.','The complete owned Clocker browser regression remains mandatory.']};
await writeFile(join(evidence,'clocker-journal-lifecycle-custody.json'),JSON.stringify(report,null,2));
console.log(JSON.stringify({status:report.status,checkpoint:report.checkpoint}));if(!passed)process.exitCode=1;
