import type {BusinessCommand,BusinessApiResult} from '../../lib/owner-advisor/business/contracts';
import {it,expect} from '@rstest/core';
import {createRequire} from 'node:module';
import {randomUUID} from 'node:crypto';
import {mkdir,writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {createOwnedNextApp} from './owned-next-app';
import {seedOwnedApp,TEST_PASSWORD} from './owned-app-fixture';
import {fictionalBusinessInput} from '../fixtures/rondo-business';
type BusinessResponse={request():{method():string;url():string;postDataJSON():BusinessCommand};json():Promise<BusinessApiResult>;status():number};
const runtime=createRequire(resolve('tools/ci-browser-runtime/package.json'))('playwright');

for(const engine of ['chromium','webkit'])for(const kind of ['source','map'])it(`${engine} renews ${kind} review at actual10000 capacity without extending publication`,async()=>{
 const root=process.env.NEVORA_OWNER_ADVISOR_BROWSER_EVIDENCE;if(!root)throw Error('External capacity evidence required');
 const evidence=resolve(root,'review-capacity-'+engine+'-'+kind);await mkdir(evidence,{recursive:true});
 const app=await createOwnedNextApp(evidence,{ownerAdvisorEnabled:true,ownerAdvisorBusinessImportsEnabled:true,ownerAdvisorBusinessRetrievalEnabled:true,pinDevTypeReferences:true}),browser=await runtime[engine].launch({headless:true}),context=await browser.newContext({viewport:{width:1440,height:1000},serviceWorkers:'block',reducedMotion:'reduce'}),page=await context.newPage(),origin=app.url.replace('127.0.0.1','localhost');
 const errors:string[]=[],observed:{command:unknown;handle:string|null;expires:string|null;status:number}[]=[];let complete=false;
 try{
  await seedOwnedApp(app.database.executor);page.setDefaultTimeout(20000);page.on('pageerror',(error:Error)=>errors.push(error.message));
  page.on('response',async(response:BusinessResponse)=>{const request=response.request();if(request.method()!=='POST'||new URL(request.url()).pathname!=='/api/owner/advisor/business')return;const command=request.postDataJSON();if(command.op!==(kind==='source'?'read_source_version':'read_coverage_map'))return;try{const result=await response.json();observed.push({command,handle:result.readReceiptId,expires:result.readReceiptExpiresAt,status:response.status()});}catch{errors.push('Unreadable review response');}});
  await page.goto(origin+'/login');await page.getByLabel('Employee ID',{exact:true}).fill('QAOWNER');await page.getByLabel('Password',{exact:true}).fill(TEST_PASSWORD);await page.getByRole('button',{name:'Sign in',exact:true}).click();await page.waitForURL(origin+'/app');
  const command=kind==='source'?{op:'stage_source_version',requestId:randomUUID(),format:'JSON',input:fictionalBusinessInput()}:{op:'stage_coverage_map',requestId:randomUUID(),map:{expectedRevision:0,accounts:[],cells:[]}};
  const staged=await page.evaluate(async(command:unknown)=>{const response=await fetch('/api/owner/advisor/business',{method:'POST',headers:{'content-type':'application/json','x-nevora-business-evidence':'1'},body:JSON.stringify(command)});if(!response.ok)throw Error('Fixture stage refused');return response.json();},command);
  const review=await context.newPage();review.setDefaultTimeout(20000);review.on('pageerror',(error:Error)=>errors.push(error.message));
  // Capture actual response bodies without changing the lease, timer or receipt.
  review.on('response',async(response:BusinessResponse)=>{const request=response.request();if(request.method()!=='POST'||new URL(request.url()).pathname!=='/api/owner/advisor/business')return;const command=request.postDataJSON();if(!['read_source_version','read_coverage_map'].includes(command.op))return;try{const body=await response.json();observed.push({command,handle:body.readReceiptId,expires:body.readReceiptExpiresAt,status:response.status()});}catch{errors.push('Unreadable capacity renewal');}});
  const path=kind==='source'?`?view=version&record=${staged.receipt.sourceId}&version=${staged.receipt.versionId}`:`?view=map&map=${staged.receipt.mapVersionId}`;
  await review.goto(origin+'/app/ai-manager/business'+path);const ack=review.getByRole('checkbox');await ack.waitFor();await ack.check();
  await expect.poll(()=>observed.length).toBe(1);
  const [count]=await app.database.executor.query<{n:number}>({text:'SELECT ((SELECT count(*) FROM owner_advisor_business_operations)+(SELECT count(*) FROM owner_advisor_business_inspections))::int AS n',values:[]});
  await app.database.executor.query({text:"INSERT INTO owner_advisor_business_operations(workspace_id,owner_id,request_id,command_kind,command_hash) SELECT 'workspace-fuel','QAOWNER',gen_random_uuid(),'stage_source_version',repeat('d',64) FROM generate_series(1,$1::int)",values:[10000-count.n]});
  await expect.poll(()=>observed.length,{timeout:18000}).toBeGreaterThanOrEqual(2);
  expect(observed[0].handle).not.toBeNull();expect(observed[0].expires).not.toBeNull();expect(observed.every(row=>row.status===200&&JSON.stringify(row.command)===JSON.stringify(observed[0].command)&&row.handle===observed[0].handle&&row.expires===observed[0].expires)).toBe(true);expect(await ack.isChecked()).toBe(true);
  expect(await app.database.executor.query({text:'SELECT ((SELECT count(*) FROM owner_advisor_business_operations)+(SELECT count(*) FROM owner_advisor_business_inspections))::int AS n',values:[]})).toEqual([{n:10000}]);expect(errors).toEqual([]);complete=true;
 }finally{await context.close();await browser.close();await app.close();await writeFile(resolve(evidence,'results.json'),JSON.stringify({complete,engine,kind,observed,errors,scope:'Real UI callbacks, original15s lease, actual10000 ledger; no receipt pruning or transport substitution'},null,2));}
},180000);
