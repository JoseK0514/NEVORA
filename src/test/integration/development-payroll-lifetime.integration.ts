import {it,expect,rs} from '@rstest/core';
import {createRequire} from 'node:module';
import {mkdir,writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {createOwnedNextApp} from './owned-next-app';
import {seedOwnedApp} from './owned-app-fixture';
import {seedPayrollFixture} from './payroll-fixture';
const runtime=createRequire(resolve('tools/ci-browser-runtime/package.json'))('playwright');

it.each(['chromium','webkit'])('%s retires payroll drafts and late artifacts while retaining original uncertain custody',async engine=>{
 const root=process.env.NEVORA_ALL_UI_BROWSER_EVIDENCE;if(!root)throw Error('External payroll lifetime evidence required');
 const evidence=resolve(root,'payroll-lifetime-'+engine);await mkdir(evidence,{recursive:true});
 const app=await createOwnedNextApp(evidence,{payrollEnabled:true,pinDevTypeReferences:true}),browser=await runtime[engine].launch({headless:true}),context=await browser.newContext({viewport:{width:1440,height:1000},serviceWorkers:'block',reducedMotion:'reduce'}),page=await context.newPage();
 const checks:{name:string;passed:boolean}[]=[],errors:string[]=[];let complete=false,downloads=0;
 const check=(name:string,passed:boolean)=>checks.push({name,passed});
 try{
  rs.stubEnv('NEVORA_PAYROLL_ENABLED','true');await seedOwnedApp(app.database.executor);const fixture=await seedPayrollFixture(app.database.executor,{breaks:true,automaticPublish:false});
  page.setDefaultTimeout(20000);page.on('pageerror',(error:Error)=>errors.push(error.message));page.on('download',()=>downloads++);page.on('dialog',(dialog:any)=>dialog.accept());
  const q=(text:string,values:unknown[]=[])=>app.database.executor.query({text,values});
  await context.addInitScript(()=>{
   const wire={mode:'normal',held:[] as (()=>void)[],writes:[] as {path:string;body:string}[],reads:[] as string[]};(window as any).__payWire=wire;const native=fetch.bind(window);
   window.fetch=(async(input:RequestInfo|URL,init?:RequestInit)=>{
    const url=new URL(input instanceof Request?input.url:String(input),location.href),method=init?.method??'GET';
    if(!url.pathname.startsWith('/api/payroll')&&url.pathname!=='/api/timecards')return native(input,init);
    const read=method==='GET',mode=wire.mode;
    if(read)wire.reads.push(url.pathname);else if(url.pathname==='/api/payroll/runs'||url.pathname==='/api/payroll-export')wire.writes.push({path:url.pathname,body:String(init?.body)});
    const response=await native(input,{...init,signal:undefined});
    if(mode==='hold-read'&&read||mode==='hold-import'&&method==='POST'&&url.pathname==='/api/payroll/runs'||mode==='hold-export'&&method==='POST'&&url.pathname==='/api/payroll-export')await new Promise<void>(done=>wire.held.push(done));
    return response;
   }) as typeof fetch;
  });
  const visit=async(path:string)=>{await page.goto(app.url+path,{waitUntil:'domcontentloaded'});};
  const event=(type:string,mode='normal')=>page.evaluate(({type,mode}:{type:string;mode:string})=>{(window as any).__payWire.mode=mode;window.dispatchEvent(new Event(type));},{type,mode});
  const settle=()=>page.evaluate(()=>new Promise<void>(done=>requestAnimationFrame(()=>requestAnimationFrame(()=>done()))));
  const release=()=>page.evaluate(()=>{const wire=(window as any).__payWire;wire.mode='normal';wire.held.splice(0).forEach((done:()=>void)=>done());});
  await visit('/login');await page.getByLabel('Employee ID',{exact:true}).fill(fixture.ids.owner);await page.getByLabel('Password',{exact:true}).fill(fixture.password);await page.getByRole('button',{name:'Sign in',exact:true}).click();await page.waitForURL(app.url+'/app');
  const importPath='/app/payroll/import?run='+fixture.runId;
  const roster=await q('SELECT id FROM employees ORDER BY id'),csv='employeeId,gross,employeeDeductions,employerContributions,net\r\n'+roster.map(p=>p.id+','+(p.id===fixture.ids.a?'1000,123.40,70,876.60':'0,0,0,0')).join('\r\n')+'\r\n';
  const file=async()=>{await page.locator('input[type="file"]').setInputFiles({name:'private-payroll-draft.csv',mimeType:'text/csv',buffer:Buffer.from(csv)});await page.getByText(/private-payroll-draft.csv/).waitFor();};
  const hasDraft=()=>page.getByText(/private-payroll-draft.csv/).count();
  await visit(importPath);await page.locator('input[type="file"]').waitFor({state:'attached'});await file();await event('blur');await settle();check('import draft disappears on blur',await hasDraft()===0);
  await event('focus');await page.locator('input[type="file"]').waitFor({state:'attached'});check('fresh import observation does not revive draft',await hasDraft()===0);
  await file();await q("UPDATE employees SET role='EMPLOYEE' WHERE id=$1",[fixture.ids.owner]);await event('online');await page.getByText('Your access to this page ended',{exact:true}).waitFor();
  await q("UPDATE employees SET role='OWNER' WHERE id=$1",[fixture.ids.owner]);await event('online');await page.locator('input[type="file"]').waitFor({state:'attached'});check('same-actor revoke and regrant cannot revive imported payload',await hasDraft()===0);
  await event('online','hold-read');await page.waitForFunction(()=>(window as any).__payWire.held.length>=2);await event('blur','hold-read');await release();await settle();check('late inner read cannot repopulate retired import',await page.locator('input[type="file"]').count()===0);await event('focus');
  await page.locator('input[type="file"]').waitFor({state:'attached'});await file();await page.getByLabel('Payroll system',{exact:true}).fill('Fictional accountant');await page.getByLabel('Report or reference',{exact:true}).fill('Private original reference');
  await page.getByRole('button',{name:'Match people',exact:true}).click();await page.getByRole('button',{name:'Review amounts',exact:true}).click();await page.getByRole('button',{name:'Check and save',exact:true}).click();
  await page.evaluate(()=>(window as any).__payWire.mode='hold-import');await page.getByRole('button',{name:'Save amounts',exact:true}).click();await page.waitForFunction(()=>(window as any).__payWire.held.length>0);
  const original=await page.evaluate(()=>(window as any).__payWire.writes.filter((r:any)=>r.path==='/api/payroll/runs'));
  await event('blur');await release();await settle();check('late committed import cannot complete retired view',await page.getByText('Amounts saved',{exact:true}).count()===0);await event('focus');
  const recovery=page.getByRole('button',{name:'Check again',exact:true});await page.waitForFunction(()=>document.body.textContent?.includes('Check again')||document.body.textContent?.includes('Amounts saved'));if(await recovery.count()){await recovery.click();await page.getByText('Amounts saved',{exact:true}).waitFor();}else check('retired original remains available for reconciliation',false);
  check('recovery checks original committed operation without replacement write',(await page.evaluate(()=>(window as any).__payWire.writes.filter((r:any)=>r.path==='/api/payroll/runs').length))===original.length);
  const period=fixture.period,exportPath='/app/payroll-export/paid-time?start='+period.startDate+'&end='+period.endDate;
  await visit(exportPath);await page.locator('.pim-person').first().waitFor();const groups=page.locator('.pim-choice');for(let i=0;i<2;i++)await groups.nth(i).getByRole('radio',{name:i===0?'Paid rest':'Unpaid meal',exact:true}).check();
  await event('blur');await event('focus');await page.locator('.pim-person').first().waitFor();check('retired export clears private break choices',await page.locator('.pim-choice input:checked').count()===0);
  for(let i=0;i<2;i++)await groups.nth(i).getByRole('radio',{name:i===0?'Paid rest':'Unpaid meal',exact:true}).check();
  await page.getByRole('button',{name:'Plan the export',exact:true}).click();await page.getByRole('button',{name:'Go to sending',exact:true}).click();await page.getByRole('button',{name:'Send batches',exact:true}).click();await page.getByText('Every batch is saved.',{exact:true}).waitFor();
  await q("UPDATE employees SET role='EMPLOYEE' WHERE id=$1",[fixture.ids.owner]);await page.getByRole('button',{name:/Download/}).first().click();await settle();await page.waitForTimeout(300);
  check('artifact download rechecks server authority',downloads===0);check('denied download retires prior CSV controls',await page.getByRole('button',{name:/Download/}).count()===0);
  await q("UPDATE employees SET role='OWNER' WHERE id=$1",[fixture.ids.owner]);await event('focus');await page.waitForTimeout(500);check('regrant does not reactivate old CSV',await page.getByRole('button',{name:/Download/}).count()===0);
  expect(errors).toEqual([]);expect(checks.filter(item=>!item.passed)).toEqual([]);complete=true;
 }finally{rs.unstubAllEnvs();await page.screenshot({path:resolve(evidence,'final.png'),fullPage:true}).catch(()=>{});await context.close();await browser.close();await app.close();await writeFile(resolve(evidence,'results.json'),JSON.stringify({complete,checks,errors,downloads,scope:'Real owned payroll import/export/receipts with actual role revocation; only reply ordering controlled'},null,2));}
},240000);
