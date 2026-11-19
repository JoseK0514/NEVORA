import {it,expect,rs} from '@rstest/core';
import {createRequire} from 'node:module';
import {mkdir,writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {createOwnedNextApp} from './owned-next-app';
import {seedOwnedApp} from './owned-app-fixture';
import {seedPayrollFixture} from './payroll-fixture';
import {randomUUID} from 'node:crypto';
import {readTimecards,mutateTimecard} from '../../lib/timecards/service';
import {classifyExportAnswer} from '../../components/payroll-import/recovery';
const runtime=createRequire(resolve('tools/ci-browser-runtime/package.json'))('playwright');
type Wire={armed:boolean;release:(()=>void)|null;calls:string[]};
declare global{interface Window{__exportRecovery?:Wire}}
type Reply={status():number;json():Promise<unknown>};
for(const engine of ['chromium','webkit'])for(const kind of ['batch','manifest'])it(`${engine} gives a corrective exit for a retired ${kind} refused by its real source`,async()=>{
 const root=process.env.NEVORA_ALL_UI_BROWSER_EVIDENCE;if(!root)throw Error('External original-recovery evidence required');
 const evidence=resolve(root,'export-recovery-'+engine+'-'+kind);await mkdir(evidence,{recursive:true});
 const app=await createOwnedNextApp(evidence,{payrollEnabled:true,pinDevTypeReferences:true}),browser=await runtime[engine].launch({headless:true}),context=await browser.newContext({viewport:{width:1440,height:1000},serviceWorkers:'block',reducedMotion:'reduce'});
 let page=await context.newPage(),complete=false;const errors:string[]=[],checks:string[]=[];
 const observe=()=>{page.setDefaultTimeout(20000);page.on('pageerror',(error:Error)=>errors.push(error.message));};observe();
 try{
  rs.stubEnv('NEVORA_PAYROLL_ENABLED','true');await seedOwnedApp(app.database.executor);const fixture=await seedPayrollFixture(app.database.executor,{breaks:true,automaticPublish:false});
  await context.addInitScript((kind:string)=>{
   const wire:Wire={armed:false,release:null,calls:[]};window.__exportRecovery!=wire;const native=fetch.bind(window);
   window.fetch=(async(input:RequestInfo|URL,init?:RequestInit)=>{
    const url=new URL(input instanceof Request?input.url:String(input),location.href),body=String(init?.body??'');
    const match=init?.method==='POST'&&(kind==='batch'?url.pathname==='/api/payroll-export':url.pathname==='/api/period-close'&&JSON.parse(body).action==='MANIFEST');
    if(!match)return native(input,init);wire.calls.push(body);
    // The first issued write loses transport before reaching this owned server.
    // The exact replay below does reach the real service after source drift.
    if(wire.armed){wire.armed=false;return new Promise<Response>(done=>{wire.release=()=>done(new Response(JSON.stringify({state:'unavailable'}),{status:503,headers:{'Content-Type':'application/json'}}));});}
    return native(input,init);
   }) as typeof fetch;
  },kind);
  await page.goto(app.url+'/login');await page.getByLabel('Employee ID',{exact:true}).fill(fixture.ids.owner);await page.getByLabel('Password',{exact:true}).fill(fixture.password);await page.getByRole('button',{name:'Sign in',exact:true}).click();await page.waitForURL(app.url+'/app');
  page=await context.newPage();observe();const period=fixture.period,exportsHref='/app/payroll-export?start='+period.startDate+'&end='+period.endDate;
  await page.goto(app.url+'/app/payroll-export/paid-time?start='+period.startDate+'&end='+period.endDate);await page.locator('.pim-person').first().waitFor();
  const groups=page.locator('.pim-choice');for(let index=0;index<2;index++)await groups.nth(index).getByRole('radio',{name:index===0?'Paid rest':'Unpaid meal',exact:true}).check();
  await page.getByRole('button',{name:'Plan the export',exact:true}).click();await page.getByRole('button',{name:'Go to sending',exact:true}).click();
  if(kind==='manifest'){await page.getByRole('button',{name:'Send batches',exact:true}).click();await page.getByText('Every batch is saved.',{exact:true}).waitFor();await page.getByRole('button',{name:'Go to finish',exact:true}).click();}
  await page.evaluate(()=>window.__exportRecovery!.armed=true);await page.getByRole('button',{name:kind==='batch'?'Send batches':'Confirm the period',exact:true}).click();await page.waitForFunction(()=>window.__exportRecovery!.release!==null);
  await page.evaluate(()=>{window.dispatchEvent(new Event('blur'));window.__exportRecovery!.release!();});
  for(const action of ['REOPEN','APPROVE','FINALIZE'] as const){
   const read=await readTimecards(fixture.proof,period,app.database.executor);if(read.state!=="ready")throw Error("Owned timecards unavailable");const card=read.cards.find(card=>card.card.employeeId===fixture.ids.a)!;
   await mutateTimecard(fixture.proof,{operationId:randomUUID(),employeeId:fixture.ids.a,...period,expectedRevision:card.revision,expectedSourceHash:card.sourceHash,action,...(action==='REOPEN'?{note:'Fictional source changed before original ingress'}:{})},app.database.executor);
  }
  await page.evaluate(()=>window.dispatchEvent(new Event('focus')));
  const retry=page.getByRole('button',{name:kind==='batch'?'Check this batch':'Check again',exact:true});await retry.waitFor();
  const response:Promise<Reply>=page.waitForResponse((response:{url():string;request():{method():string;postDataJSON():{action?:string}}})=>new URL(response.url()).pathname===(kind==='batch'?'/api/payroll-export':'/api/period-close')&&response.request().method()==='POST'&&(kind==='batch'||response.request().postDataJSON().action==='MANIFEST'));
  await retry.click();const refused=await response,body=await refused.json();
  expect(refused.status()).toBe(409);expect(body).toMatchObject({state:'conflict'});if(kind==='batch')expect(classifyExportAnswer(refused.status(),body).kind).toBe('conflict');
  const calls=await page.evaluate(()=>window.__exportRecovery!.calls);expect(calls).toHaveLength(2);expect(calls[1]).toBe(calls[0]);checks.push('Closed real refusal for byte-identical original; no replacement operation');
  await expect.poll(()=>retry.count()).toBe(0);expect(await page.locator(`.pim a[href="${exportsHref}"]`).count()).toBeGreaterThan(0);checks.push('Terminal original has an explicit corrective exit');
  await page.evaluate(()=>window.dispatchEvent(new Event('blur')));await page.evaluate(()=>window.dispatchEvent(new Event('focus')));await page.locator(`.pim a[href="${exportsHref}"]`).waitFor();expect(await retry.count()).toBe(0);checks.push('Blocked original stays actionable after another retirement');
  expect(errors).toEqual([]);complete=true;
 }finally{rs.unstubAllEnvs();await page.screenshot({path:resolve(evidence,'final.png'),fullPage:true}).catch(()=>{});await context.close();await browser.close();await app.close();await writeFile(resolve(evidence,'results.json'),JSON.stringify({complete,engine,kind,checks,errors,scope:'Owned real SQL source drift and exact original replay; initial pre-ingress transport loss controlled'},null,2));}
},180000);
