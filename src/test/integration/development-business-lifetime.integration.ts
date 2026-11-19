import {it,expect} from '@rstest/core';
import {createRequire} from 'node:module';
import {randomUUID} from 'node:crypto';
import {mkdir,writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {createOwnedNextApp} from './owned-next-app';
import {seedOwnedApp,TEST_PASSWORD} from './owned-app-fixture';
import {fictionalBusinessInput} from '../fixtures/rondo-business';

const runtime=createRequire(resolve('tools/ci-browser-runtime/package.json'))('playwright');
// Only response delivery/lease duration and the browser's wall clock are controlled.
// The actual app, sign-in, SQL authorization, commands, parsers and views all run.
it.each(['chromium','webkit'])('%s fences business observations and preserves submitted read identities',async engine=>{
 const root=process.env.NEVORA_OWNER_ADVISOR_BROWSER_EVIDENCE;if(!root)throw Error('External business lifetime evidence required');
 const evidence=resolve(root,'business-lifetime-'+engine);await mkdir(evidence,{recursive:true});
 const app=await createOwnedNextApp(evidence,{ownerAdvisorEnabled:true,ownerAdvisorBusinessImportsEnabled:true,ownerAdvisorBusinessRetrievalEnabled:true,pinDevTypeReferences:true});
 const browser=await runtime[engine].launch({headless:true}),context=await browser.newContext({viewport:{width:1440,height:1000},serviceWorkers:'block',reducedMotion:'reduce'}),page=await context.newPage(),origin=app.url.replace('127.0.0.1','localhost');
 const checks:{name:string;passed:boolean}[]=[],errors:string[]=[];let complete=false;
 const check=(name:string,passed:boolean)=>checks.push({name,passed});
 try{
  await seedOwnedApp(app.database.executor);page.setDefaultTimeout(20000);page.on('pageerror',(error:Error)=>errors.push(error.message));
  await context.addInitScript(()=>{
   type Command={op:string;requestId:string;query?:unknown};
   const wire={mode:'normal',reads:[] as Command[],held:[] as (()=>void)[],offset:0};
   (window as any).__businessWire=wire;const wall=Date.now;Date.now=()=>wall()+wire.offset;
   const native=fetch.bind(window);
   window.fetch=(async(input:RequestInfo|URL,init?:RequestInit)=>{
    const url=new URL(input instanceof Request?input.url:String(input),location.href);
    if(url.pathname!=='/api/owner/advisor/business')return native(input,init);
    const command=init?.body?JSON.parse(String(init.body)) as Command:null,read=!command||['read_source_version','read_coverage_map','query_finance','query_sales'].includes(command.op);
    if(!read)return native(input,init);
    if(command)wire.reads.push(command);
    const mode=wire.mode;
    if(mode==='fail-catalog'&&!command)return new Response('{}',{status:503});
    const response=await native(input,{...init,signal:undefined}),body=await response.json();
    if(response.ok)body.validForMs=4000;
    if(mode==='hold-all'||mode==='hold-catalog'&&!command||mode==='hold-query'&&command?.op.startsWith('query_'))await new Promise<void>(done=>wire.held.push(done));
    return new Response(JSON.stringify(body),{status:response.status,headers:{'Content-Type':'application/json'}});
   }) as typeof fetch;
  });
  const visit=async(path:string)=>{await page.goto(origin+path,{waitUntil:'domcontentloaded'});};
  await visit('/login');await page.getByLabel('Employee ID',{exact:true}).fill('QAOWNER');await page.getByLabel('Password',{exact:true}).fill(TEST_PASSWORD);await page.getByRole('button',{name:'Sign in',exact:true}).click();await page.waitForURL(origin+'/app');
  const send=(command:unknown)=>page.evaluate(async command=>{const response=await fetch('/api/owner/advisor/business',{method:'POST',headers:{'content-type':'application/json','x-nevora-business-evidence':'1'},body:JSON.stringify(command)});if(!response.ok)throw Error('Fixture command refused '+response.status);return response.json();},command);
  const input=fictionalBusinessInput();input.source.name='Private lifetime fixture';input.window={fromAt:'2026-01-01T04:00:00.000Z',toAt:'2026-02-01T04:00:00.000Z'};input.sourceAsOf=input.window.toAt;
  for(const row of input.records){if(row.kind==='BALANCE')row.at=row.recordId==='opening'?input.window.fromAt:input.window.toAt;if('recordedAt' in row)row.recordedAt=input.window.fromAt;}
  const staged=await send({op:'stage_source_version',requestId:randomUUID(),format:'JSON',input}),sourceId=staged.receipt.sourceId,versionId=staged.receipt.versionId;
  const library='/app/ai-manager/business',version=library+'?view=version&record='+sourceId+'&version='+versionId;
  const privateName=()=>page.locator('.be').getByText(input.source.name,{exact:true});
  const wire=async(mode:string,event?:string)=>page.evaluate(({mode,event})=>{(window as any).__businessWire.mode=mode;if(event)window.dispatchEvent(new Event(event));},{mode,event});
  const release=()=>page.evaluate(()=>{const wire=(window as any).__businessWire;wire.mode='normal';wire.held.splice(0).forEach((done:()=>void)=>done());});
  const settle=()=>page.evaluate(()=>new Promise<void>(done=>requestAnimationFrame(()=>requestAnimationFrame(()=>done()))));
  await visit(library);await privateName().first().waitFor();await wire('hold-catalog','blur');await settle();check('blur clears catalog',await privateName().count()===0);
  await wire('hold-catalog','focus');await page.waitForFunction(()=>(window as any).__businessWire.held.length>0);await wire('hold-catalog','blur');await release();await settle();check('late catalog cannot revive retired generation',await privateName().count()===0);
  await visit(library);await privateName().first().waitFor();await wire('fail-catalog','online');await settle();check('failed catalog refresh clears old private catalog',await privateName().count()===0);
  await visit(library);await privateName().first().waitFor();await page.evaluate(()=>{const wire=(window as any).__businessWire;wire.mode='hold-catalog';wire.offset=-86400000;});
  await page.waitForTimeout(4300);check('monotonic catalog expiry survives backward wall clock',await privateName().count()===0);await release();
  await visit(version);const ack=page.getByRole('checkbox',{name:'I reviewed the rows, the period and the things to check, and I want Rondo to use this version',exact:true});await ack.waitFor();await ack.check();
  await page.waitForTimeout(3300);
  const reads=await page.evaluate(()=>(window as any).__businessWire.reads.filter((command:any)=>command.op==='read_source_version'));
  check('review renews original complete read command',reads.length>=2&&reads.every((read:unknown)=>JSON.stringify(read)===JSON.stringify(reads[0])));check('unchanged review preserves acknowledgement',await ack.isChecked());
  await app.database.executor.query({text:"INSERT INTO owner_advisor_profiles(workspace_id,owner_id,revision) VALUES('workspace-fuel','QAOWNER',1) ON CONFLICT(workspace_id,owner_id) DO UPDATE SET revision=owner_advisor_profiles.revision+1",values:[]});
  await page.waitForTimeout(3300);check('context drift retires reviewed rows',await page.locator('#be-rows li').count()===0);
  const show=page.getByRole('button',{name:/Show again|Try again/,exact:true});if(await show.count()){await show.first().click();await ack.waitFor();check('fresh review resets acknowledgement',!await ack.isChecked());const after=await page.evaluate(()=>(window as any).__businessWire.reads.filter((command:any)=>command.op==='read_source_version'));check('deliberate fresh review has a new identity',after.at(-1).requestId!==reads[0].requestId);}else check('fresh review action available',false);
  await visit(library+'?view=figures');await page.locator('#be-q-domain').selectOption('FINANCE');await page.locator('#be-q-time').selectOption('HISTORICAL');await page.locator('#be-q-first').fill('2026-01-01');await page.locator('#be-q-last').fill('2026-01-31');await page.getByRole('button',{name:'Show figures',exact:true}).click();await page.waitForFunction(()=>(window as any).__businessWire.reads.some((c:any)=>c.op==='query_finance'));await page.locator('#be-figures [aria-busy="true"]').waitFor({state:'detached'});
  await page.locator('#be-q-domain').selectOption('SALES');await wire('hold-query');await page.waitForTimeout(3300);
  const queries=await page.evaluate(()=>(window as any).__businessWire.reads.filter((c:any)=>c.op.startsWith('query_')));check('unsent domain edits cannot change a renewal',queries.length>=2&&queries.every((command:unknown)=>JSON.stringify(command)===JSON.stringify(queries[0])));
  await page.getByRole('button',{name:'Show figures',exact:true}).click();await wire('normal');await page.waitForTimeout(700);
  const resubmitted=await page.evaluate(()=>(window as any).__businessWire.reads.filter((c:any)=>c.op.startsWith('query_')));check('deliberate resubmit supersedes pending renewal',resubmitted.at(-1).op==='query_sales'&&resubmitted.at(-1).requestId!==queries[0].requestId);await release();await settle();
  check('new submitted domain stays selected',await page.locator('#be-q-domain').inputValue()==='SALES');
  expect(errors).toEqual([]);expect(checks.filter(item=>!item.passed)).toEqual([]);complete=true;
 }finally{await page.screenshot({path:resolve(evidence,'final.png'),fullPage:true}).catch(()=>{});await context.close();await browser.close();await app.close();await writeFile(resolve(evidence,'results.json'),JSON.stringify({complete,checks,errors,scope:'Owned fictional SQL and real views; lease/clock/delivery transport boundaries controlled'},null,2));}
},240000);
