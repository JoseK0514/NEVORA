import {expect,it} from '@rstest/core';
import {createRequire} from 'node:module';
import {randomUUID} from 'node:crypto';
import {mkdir,readFile,writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {createOwnedNextApp} from './owned-next-app';
import {seedOwnedApp,TEST_PASSWORD} from './owned-app-fixture';
import {fictionalBusinessInput} from '../fixtures/rondo-business';
import type {BusinessApiResult} from '../../lib/owner-advisor/business/contracts';
const runtime=createRequire(resolve('tools/ci-browser-runtime/package.json'))('playwright');

it.each(['chromium','webkit'])('%s preserves a real post-commit conflict, then publishes and queries the delivered business screens',async engine=>{
 if(!process.env.NEVORA_OWNER_ADVISOR_BROWSER_EVIDENCE)throw Error('External evidence required');
 const evidence=resolve(process.env.NEVORA_OWNER_ADVISOR_BROWSER_EVIDENCE,'joined-business-'+engine);await mkdir(evidence,{recursive:true});
 const app=await createOwnedNextApp(evidence,{ownerAdvisorEnabled:true,ownerAdvisorBusinessImportsEnabled:true,ownerAdvisorBusinessRetrievalEnabled:true});
 const browser=await runtime[engine].launch({headless:true}),context=await browser.newContext({viewport:{width:1440,height:1000},serviceWorkers:'block',reducedMotion:'reduce'}),page=await context.newPage(),origin=app.url.replace('127.0.0.1','localhost');
 const errors:string[]=[],external:string[]=[],checks:string[]=[];let complete=false;
 try{
  await seedOwnedApp(app.database.executor);const q=(text:string,values:unknown[]=[])=>app.database.executor.query({text,values});
  page.on('pageerror',(e:Error)=>errors.push(e.message));page.setDefaultTimeout(20000);
  await context.route('**/*',async(route:{request():{url():string};abort():Promise<void>;continue():Promise<void>})=>{const url=new URL(route.request().url());if(['http:','https:'].includes(url.protocol)&&url.origin!==origin){external.push(url.origin);await route.abort();}else await route.continue();});
  const visit=async(path:string)=>{await page.goto(origin+path,{waitUntil:'domcontentloaded'});};
  await visit('/login');await page.getByLabel('Employee ID',{exact:true}).fill('QAOWNER');await page.getByLabel('Password',{exact:true}).fill(TEST_PASSWORD);await page.getByRole('button',{name:'Sign in',exact:true}).click();await page.waitForURL(origin+'/app');
  const send=async(command:unknown):Promise<BusinessApiResult>=>page.evaluate(async(value:unknown)=>{const response=await fetch('/api/owner/advisor/business',{method:'POST',headers:{'content-type':'application/json','x-nevora-business-evidence':'1'},body:JSON.stringify(value)});if(!response.ok)throw Error('Business fixture request refused '+response.status+' '+await response.text());return response.json();},command);
  const input=fictionalBusinessInput();input.window={fromAt:'2026-01-01T04:00:00.000Z',toAt:'2026-02-01T04:00:00.000Z'};input.sourceAsOf=input.window.toAt;
  for(const row of input.records){if(row.kind==='BALANCE')row.at=row.recordId==='opening'?input.window.fromAt:input.window.toAt;if('recordedAt' in row)row.recordedAt=input.window.fromAt;}
  const staged=await send({op:'stage_source_version',requestId:randomUUID(),format:'JSON',input}),sourceId=staged.receipt!.sourceId!,versionId=staged.receipt!.versionId!;
  await visit('/app/ai-manager/business?view=version&record='+sourceId+'&version='+versionId);
  const ack=page.getByRole('checkbox',{name:'I reviewed the rows, the period and the things to check, and I want Rondo to use this version',exact:true});await ack.waitFor();
  expect(await page.locator('#be-rows li').count()).toBe(input.records.length);
  await ack.check();
  // The exact production service executes and commits, then its final observation loses the context race.
  // The IO barrier changes no returned rows or envelopes; only this owned fictional profile revision is advanced.
  const gate='postcommit-context';await writeFile(resolve(app.barriers,'armed.json'),JSON.stringify({id:gate,stage:'before',contains:'GREATEST(0,LEAST(15000'}));
  const response=page.waitForResponse((r:any)=>r.url()===origin+'/api/owner/advisor/business'&&r.request().method()==='POST'&&r.request().postDataJSON().op==='publish_source_version');
  await page.getByRole('button',{name:'Publish for Rondo',exact:true}).click();
  await expect.poll(async()=>{try{return await readFile(resolve(app.barriers,gate+'.reached'),'utf8');}catch{return null;}},{timeout:8000}).toBe('before');
  const committed=await q("SELECT request_id::text FROM owner_advisor_business_operations WHERE command_kind='publish_source_version' AND state='completed'");expect(committed).toHaveLength(1);
  await q("INSERT INTO owner_advisor_profiles(workspace_id,owner_id,revision) VALUES('workspace-fuel','QAOWNER',1) ON CONFLICT(workspace_id,owner_id) DO UPDATE SET revision=owner_advisor_profiles.revision+1");
  await writeFile(resolve(app.barriers,gate+'.release'),'release');
  const conflicted=await response;expect(conflicted.status(),await conflicted.text()).toBe(409);const operationId=conflicted.request().postDataJSON().requestId;
  await page.getByText('Not confirmed yet',{exact:true}).waitFor();expect(await page.getByText('Nothing was saved.',{exact:true}).count()).toBe(0);
  const stored=await page.evaluate(()=>JSON.parse(sessionStorage.getItem('nevora.rondo.business.pending')!));expect(stored.operationId).toBe(operationId);expect(Object.keys(stored).sort()).toEqual(['authority','mapVersionId','op','operationId','sourceId','versionId']);
  await page.getByRole('button',{name:'Check again',exact:true}).click();await page.waitForURL((url:URL)=>url.searchParams.get('view')==='record');
  expect(await q('SELECT status FROM owner_advisor_business_versions WHERE version_id=$1',[versionId])).toEqual([{status:'PUBLISHED'}]);checks.push('Real committed publication returns real 409 after context race; UI retains original identity and recovers actual receipt');
  const catalog=await page.evaluate(async()=>{const r=await fetch('/api/owner/advisor/business',{headers:{'x-nevora-business-evidence':'1'}});return r.json();});
  const map={expectedRevision:catalog.catalog.mapRevision??0,accounts:[{accountRef:'operating',ownership:{kind:'COMPANY_SHARED'}}],cells:['CASH','OBLIGATIONS','RECEIVABLES'].map(metric=>({sourceId,domain:'FINANCE',metric,currency:'USD',window:input.window,role:'PRIMARY',accountRefs:['operating'],locationIds:[]}))};
  const draftedMap=await send({op:'stage_coverage_map',requestId:randomUUID(),map});await visit('/app/ai-manager/business?view=map&map='+draftedMap.receipt!.mapVersionId);
  await page.getByRole('checkbox',{name:'I reviewed the accounts and entries, and I want Rondo to count these as my main records',exact:true}).check();await page.getByRole('button',{name:'Publish for Rondo',exact:true}).click();await page.waitForURL((url:URL)=>url.searchParams.get('view')==='map'&&!url.searchParams.has('map'));
  checks.push('Delivered map review publishes the real complete map with fresh acknowledgement');
  await visit('/app/ai-manager/business?view=figures');await page.locator('#be-q-domain').selectOption('FINANCE');await page.locator('#be-q-time').selectOption('HISTORICAL');await page.locator('#be-q-first').fill('2026-01-01');await page.locator('#be-q-last').fill('2026-01-31');
  const queried=page.waitForResponse((r:any)=>r.url()===origin+'/api/owner/advisor/business'&&r.request().method()==='POST'&&r.request().postDataJSON().op==='query_finance');await page.getByRole('button',{name:'Show figures',exact:true}).click();const figures=await queried;expect(figures.status(),await figures.text()).toBe(200);const result=await figures.json();expect(result.result.finance.currencies[0].calculatedClosingMinor).toBe('143500');
  await page.getByText(/1,435\.00/).first().waitFor();
  for(const width of [320,390,768,1440]){await page.setViewportSize({width,height:1000});expect(await page.evaluate(()=>document.documentElement.scrollWidth<=document.documentElement.clientWidth+2)).toBe(true);}
  await page.screenshot({path:resolve(evidence,'figures-real.png'),fullPage:true});checks.push('Delivered figures panel displays actual historical finance; 320/390/768/1440 no overflow');
  expect(errors).toEqual([]);expect(external).toEqual([]);complete=true;
 }finally{if(!complete)await page.screenshot({path:resolve(evidence,'failure.png'),fullPage:true}).catch(()=>{});await context.close();await browser.close();await app.close();await writeFile(resolve(evidence,'joined-report.json'),JSON.stringify({complete,checks,errors,external,source:app.sourceHashes,data:'Owned fictional PostgreSQL only; no forced success or model calls'},null,2));}
});
