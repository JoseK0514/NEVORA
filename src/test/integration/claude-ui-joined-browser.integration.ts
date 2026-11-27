import {expect,it,rs} from '@rstest/core';
import {createRequire} from 'node:module';
import {mkdir,writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {createOwnedNextApp} from './owned-next-app';
import {seedOwnedApp} from './owned-app-fixture';
import {seedPayrollFixture} from './payroll-fixture';
import {workerOnce} from '../../lib/payroll/worker';

const runtime=createRequire(resolve('tools/ci-browser-runtime/package.json'))('playwright');

it.each(['chromium','webkit'])('%s joins the delivered payroll UI to real imports, paid breaks and a reconciled manifest',async engine=>{
  if(!process.env.NEVORA_ALL_UI_BROWSER_EVIDENCE)throw Error('External evidence required');
  const evidence=resolve(process.env.NEVORA_ALL_UI_BROWSER_EVIDENCE,'claude-joined-'+engine);await mkdir(evidence,{recursive:true});
  const app=await createOwnedNextApp(evidence,{payrollEnabled:true});
  const browser=await runtime[engine].launch({headless:true}),context=await browser.newContext({viewport:{width:1440,height:1000},serviceWorkers:'block',reducedMotion:'reduce'});
  let page=await context.newPage();
  const errors:string[]=[],external:string[]=[],checks:string[]=[],network:{event:string;url:string;failure?:string}[]=[];
  let complete=false,leaseControl:Record<string,unknown>|null=null;
  try{
    rs.stubEnv('NEVORA_PAYROLL_ENABLED','true');
    await seedOwnedApp(app.database.executor);const fixture=await seedPayrollFixture(app.database.executor,{breaks:true,automaticPublish:false});
    const observe=(view:any)=>{view.setDefaultTimeout(20000);view.on('pageerror',(e:Error)=>errors.push(view.url()+' '+e.stack));view.on('requestfailed',(r:any)=>network.push({event:'failed',url:r.url(),failure:r.failure()?.errorText}));};observe(page);
    await context.route('**/*',async(route:{request():{url():string};abort():Promise<void>;continue():Promise<void>})=>{const url=new URL(route.request().url());if(['http:','https:'].includes(url.protocol)&&url.origin!==app.url){external.push(url.origin);await route.abort();}else await route.continue();});
    // Each workflow opens in an authenticated tab. Existing navigation suites cover route transitions; no page error is filtered.
    const visit=async(path:string)=>{if(page.url()!=='about:blank'){page=await context.newPage();observe(page);}await page.goto(app.url+path,{waitUntil:'domcontentloaded'});};
    await visit('/login');await page.getByLabel('Employee ID',{exact:true}).fill(fixture.ids.owner);await page.getByLabel('Password',{exact:true}).fill(fixture.password);await page.getByRole('button',{name:'Sign in',exact:true}).click();await page.waitForURL(app.url+'/app');
    await visit('/app/help');
    const helpQuestions = page.locator('details.c-help__q').filter({has: page.locator('a[href]')});
    expect(await helpQuestions.count()).toBeGreaterThan(0);
    for (const question of await helpQuestions.all()) {
      await question.locator('summary').click();
      await page.keyboard.press('Tab');
      expect(await question.locator('a[href]').first().evaluate((link: HTMLElement) => link === document.activeElement)).toBe(true);
    }
    const q=<T=Record<string,unknown>>(text:string,values:unknown[]=[])=>app.database.executor.query<T>({text,values});
    const roster=await q<{id:string}>('SELECT id FROM employees ORDER BY id');
    const csv='employeeId,gross,employeeDeductions,employerContributions,net\r\n'+roster.map(p=>p.id+','+(p.id===fixture.ids.a?'1000,123.40,70,876.60':'0,0,0,0')).join('\r\n')+'\r\n';
    await visit('/app/payroll/import?run='+fixture.runId);await page.getByRole('heading',{name:'Add the file from your payroll system',exact:true}).waitFor();
    const fileChooser=page.waitForEvent('filechooser');await page.getByRole('button',{name:'Choose a file',exact:true}).click();await (await fileChooser).setFiles({name:'fictional-payroll.csv',mimeType:'text/csv',buffer:Buffer.from(csv)});
    await page.getByLabel('Payroll system',{exact:true}).fill('Fictional accountant');await page.getByLabel('Report or reference',{exact:true}).fill('JOINED-'+engine);
    await page.getByRole('button',{name:'Match people',exact:true}).click();await page.getByRole('button',{name:'Review amounts',exact:true}).click();
    const amount = page.locator('button.pim-amt__btn').first();
    const initialAmount = await amount.innerText();
    await amount.focus();
    await page.keyboard.press('Enter');
    const amountInput = page.locator('input.pim-amt__in');
    await amountInput.fill('12.34');
    await amountInput.press('Enter');
    expect(await amount.evaluate((el: HTMLElement) => el === document.activeElement)).toBe(true);
    const undo = page.getByRole('button', { name: /undo/i });
    await undo.focus();
    await page.keyboard.press('Enter');
    await undo.waitFor({ state: 'hidden' });
    expect(await amount.innerText()).toBe(initialAmount);
    expect(await amount.evaluate((el: HTMLElement) => el === document.activeElement)).toBe(true);
    await page.getByRole('button',{name:'Check and save',exact:true}).click();
    const imported=page.waitForResponse((r:any)=>r.url()===app.url+'/api/payroll/runs'&&r.request().method()==='POST');
    await page.getByRole('button',{name:'Save amounts',exact:true}).click();const saved=await imported;expect(saved.status(),await saved.text()).toBe(200);
    const sent=saved.request().postDataJSON();expect(sent.amounts.schema).toBe('NEVORA_PAYROLL_CSV_TOTALS_V1');expect(sent.amounts.csv).toBe(csv);
    await page.getByText('Amounts saved',{exact:true}).waitFor();checks.push('Real saved CSV import; exact uploaded bytes; population review retained');
    const populationBefore=await q('SELECT payload FROM payroll_period_populations ORDER BY revision');
    await visit('/app/payroll/import?run='+fixture.runId);await page.getByRole('heading',{name:'Add the file from your payroll system',exact:true}).waitFor();
    const rematchedCsv='employeeId,gross,employeeDeductions,employerContributions,net\r\nexternal-worker,1000,123.40,70,876.60\r\n';
    const rematchChooser=page.waitForEvent('filechooser');await page.getByRole('button',{name:'Choose a file',exact:true}).click();await (await rematchChooser).setFiles({name:'fictional-rematch.csv',mimeType:'text/csv',buffer:Buffer.from(rematchedCsv)});
    await page.getByLabel('Payroll system',{exact:true}).fill('Fictional accountant');await page.getByLabel('Report or reference',{exact:true}).fill('REMATCH-'+engine);
    await page.getByRole('button',{name:'Match people',exact:true}).click();
    // The step deliberately moves focus to its heading on the next rendering
    // turn. Typing before that arrival lets the intended move blur/clear the
    // picker; await the actual focus contract before beginning keyboard entry.
    const matchHeading=page.getByRole('heading',{name:'Match each row to a person',exact:true});
    await expect.poll(()=>matchHeading.evaluate((element:HTMLElement)=>element===document.activeElement)).toBe(true);
    const personPicker=page.locator('.pim-pick__in');await personPicker.focus();await expect.poll(()=>personPicker.evaluate((element:HTMLElement)=>element===document.activeElement)).toBe(true);
    await personPicker.fill(fixture.ids.a);await expect.poll(()=>personPicker.inputValue()).toBe(fixture.ids.a);await expect.poll(()=>personPicker.getAttribute('aria-expanded')).toBe('true');
    await page.getByRole('option',{name:new RegExp(fixture.ids.a)}).waitFor();await expect.poll(()=>page.getByRole('option').count()).toBe(1);await personPicker.press('Enter');await expect.poll(()=>personPicker.inputValue()).toBe('María José Fictional QA');
    const zeroChoices=page.getByRole('radio',{name:'Not paid this period',exact:true});expect(await zeroChoices.count()).toBe(roster.length-1);for(const choice of await zeroChoices.all())await choice.check();
    await page.getByRole('button',{name:'Review amounts',exact:true}).click();
    for(const [field,amount] of [['gross','1001.00'],['net','877.60']]){await page.getByRole('button',{name:new RegExp('^Correct '+field+' for')}).click();await page.locator('.pim-amt__in').fill(amount);await page.locator('.pim-amt__in').press('Enter');}
    await page.getByRole('button',{name:'Check and save',exact:true}).click();
    const rematched=page.waitForResponse((r:any)=>r.url()===app.url+'/api/payroll/runs'&&r.request().method()==='POST');await page.getByRole('button',{name:'Save amounts',exact:true}).click();const revised=await rematched;expect(revised.status(),await revised.text()).toBe(200);
    const reviewed=revised.request().postDataJSON().amounts;expect(reviewed.schema).toBe('NEVORA_PAYROLL_IMPORT_V1');expect(reviewed.sourceDocument).toBeUndefined();expect(reviewed.rows.find((r:{employeeId:string})=>r.employeeId===fixture.ids.a)).toMatchObject({grossMinor:'100100',netMinor:'87760'});
    await page.getByText('Amounts saved',{exact:true}).waitFor();expect(await q('SELECT payload FROM payroll_period_populations ORDER BY revision')).toEqual(populationBefore);
    checks.push('Rematched and corrected CSV saves canonical reviewed JSON; missing-person choices do not replace persisted population facts');
    const period=fixture.period,exportPath='/app/payroll-export/paid-time?start='+period.startDate+'&end='+period.endDate;
    // Fault injection uses actual API rows and a controlled monotonic clock in a separate context.
    // The complete saved import/export/manifest/approval journey below keeps its normal browser clock.
    const leaseContext=await browser.newContext({viewport:{width:1440,height:1000},storageState:await context.storageState(),serviceWorkers:'block',reducedMotion:'reduce'});
    const leasePage=await leaseContext.newPage();observe(leasePage);
    try{
      await leaseContext.route('**/*',async(route:any)=>{const url=new URL(route.request().url());if(['http:','https:'].includes(url.protocol)&&url.origin!==app.url){external.push(url.origin);await route.abort();}else await route.continue();});
      await leasePage.clock.install();await leasePage.goto(app.url+exportPath,{waitUntil:'domcontentloaded'});await leasePage.locator('.pim-person').first().waitFor();
      await leasePage.clock.pauseAt(Date.now()+1000);
      await leaseContext.route('**/api/timecards',async(route:any)=>{const actual=await route.fetch(),body=await actual.json();if(body.state==='ready')body.validForMs=1000;await route.fulfill({response:actual,json:body});});
      // A focus refresh while already foreground renews this read without retiring its operational parent.
      // Await both actual response bodies, then let the rendered read commit before advancing its deadline.
      const timeRead=leasePage.waitForResponse((r:any)=>new URL(r.url()).pathname==='/api/timecards'&&r.request().method()==='POST');
      const closeRead=leasePage.waitForResponse((r:any)=>new URL(r.url()).pathname==='/api/period-close'&&r.request().method()==='POST');
      await leasePage.evaluate(()=>window.dispatchEvent(new Event('focus')));
      const reads=await Promise.all([timeRead,closeRead]);for(const response of reads){expect(response.status(),await response.text()).toBe(200);await response.finished();}
      await leasePage.clock.runFor(20);
      const shown=await leasePage.locator('.pim-person').count();expect(shown).toBeGreaterThan(0);
      await leasePage.clock.runFor(1001);await expect.poll(()=>leasePage.locator('.pim-person').count()).toBe(0);expect(await leasePage.locator('.pim').count()).toBe(1);
      leaseControl={realApiRows:true,separateContext:true,controlledClock:true,validForMs:1000,warmupMs:20,advancedMs:1001,shown,retired:0};
    }finally{await leaseContext.unrouteAll({behavior:'wait'});await leaseContext.close();}
    checks.push('A shortened real data observation expires under controlled time while its operational frame remains current; genuine write journey has an unmodified clock');
    await visit(exportPath);await page.locator('.pim-person').first().waitFor();
    // Private timecards must leave the DOM immediately on loss of focus; a pending refresh cannot extend the lease.
    await page.evaluate(()=>window.dispatchEvent(new Event('blur')));
    await expect.poll(()=>page.locator('.pim-person').count()).toBe(0);
    await page.evaluate(()=>window.dispatchEvent(new Event('focus')));await page.locator('.pim-person').first().waitFor();
    checks.push('Private break review clears on blur and requires a fresh server read');
    const groups=page.locator('.pim-choice');expect(await groups.count()).toBe(2);
    for(let i=0;i<2;i++)await groups.nth(i).getByRole('radio',{name:i===0?'Paid rest':'Unpaid meal',exact:true}).check();
    for(const width of [320,390,768,1440]){await page.setViewportSize({width,height:1000});expect(await page.evaluate(()=>document.documentElement.scrollWidth<=document.documentElement.clientWidth+2)).toBe(true);}
    await page.screenshot({path:resolve(evidence,'explicit-breaks.png'),fullPage:true});
    await page.getByRole('button',{name:'Plan the export',exact:true}).click();await page.getByRole('button',{name:'Go to sending',exact:true}).click();
    const exported=page.waitForResponse((r:any)=>r.url()===app.url+'/api/payroll-export'&&r.request().method()==='POST');
    await page.getByRole('button',{name:'Send batches',exact:true}).click();const artifact=await exported;expect(artifact.status(),await artifact.text()).toBe(200);
    const body=artifact.request().postDataJSON();expect(body.paidTime.breakTreatments.map((b:{treatment:string})=>b.treatment).sort()).toEqual(['PAID_REST','UNPAID_RELIEVED_MEAL']);
    await page.getByText('Every batch is saved.',{exact:true}).waitFor();await page.getByRole('button',{name:'Go to finish',exact:true}).click();
    const recorded=page.waitForResponse((r:any)=>r.url()===app.url+'/api/period-close'&&r.request().method()==='POST'&&r.request().postDataJSON().action==='MANIFEST');
    await page.getByRole('button',{name:'Confirm the period',exact:true}).click();const manifest=await recorded;expect(manifest.status(),await manifest.text()).toBe(200);
    const result=await manifest.json();expect(result.result.state).toBe('MANIFEST_PREPARED');expect(result.result.exports).toHaveLength(1);expect(result.result.exports[0].payload.model.rows.map((r:{employeeId:string})=>r.employeeId)).toEqual([fixture.ids.a]);
    expect(await q('SELECT count(*)::int n FROM payroll_period_manifests WHERE id=$1',[result.result.id])).toEqual([{n:1}]);
    checks.push('Real paid-time export with each break explicitly decided and real exact-plan manifest');
    await visit('/app/payroll/review?run='+fixture.runId);
    await page.getByRole('checkbox',{name:/I reviewed revision/}).check();
    let approvalId='';let resolveApproval:(id:string)=>void=()=>{},rejectApproval:(error:unknown)=>void=()=>{};const approvalCommitted=new Promise<string>((resolve,reject)=>{resolveApproval=resolve;rejectApproval=reject;});
    await page.route('**/api/payroll/runs',async(route:any)=>{const body=route.request().postDataJSON();if(route.request().method()==='POST'&&body?.action==='APPROVE'){try{const actual=await route.fetch();expect(actual.status(),await actual.text()).toBe(200);await route.abort('connectionreset');resolveApproval(body.operationId);}catch(error){rejectApproval(error);}}else await route.continue();});
    await page.getByRole('button',{name:'Approve payroll',exact:true}).click();approvalId=await approvalCommitted;
    await page.getByRole('button',{name:'Check action reference',exact:true}).waitFor();
    const recoveryKey=await page.evaluate((id:string)=>Object.keys(localStorage).find(key=>key.startsWith('nevora-payroll-operation:')&&localStorage.getItem(key)===id),approvalId);expect(recoveryKey).toBeTruthy();
    await q("UPDATE employees SET role='EMPLOYEE' WHERE id=$1",[fixture.ids.owner]);
    const deniedLookup=page.waitForResponse((r:any)=>new URL(r.url()).pathname==='/api/payroll/receipts');await page.getByRole('button',{name:'Check action reference',exact:true}).click();expect((await deniedLookup).status()).toBe(403);
    await expect.poll(()=>page.evaluate((key:string)=>localStorage.getItem(key),recoveryKey)).toBe(approvalId);
    await q("UPDATE employees SET role='OWNER' WHERE id=$1",[fixture.ids.owner]);await context.clearCookies();
    await visit('/login');await page.getByLabel('Employee ID',{exact:true}).fill(fixture.ids.owner);await page.getByLabel('Password',{exact:true}).fill(fixture.password);await page.getByRole('button',{name:'Sign in',exact:true}).click();await page.waitForURL(app.url+'/app');
    const recoveredReceipt=context.waitForEvent('response',(r:any)=>new URL(r.url()).pathname==='/api/payroll/receipts'&&new URL(r.url()).searchParams.get('operationId')===approvalId);
    await visit('/app/payroll/review?run='+fixture.runId);const recovered=await recoveredReceipt;expect(recovered.status(),await recovered.text()).toBe(200);await recovered.finished();await expect.poll(()=>page.evaluate((key:string)=>localStorage.getItem(key),recoveryKey)).toBeNull();
    checks.push('Approval committed with lost response; real revoked access refuses lookup without deleting original ID; authorized re-entry recovers receipt');
    for(let i=0;i<4;i++)await workerOnce(app.database.executor);
    await visit('/app/payroll/review?run='+fixture.runId);await page.getByRole('checkbox',{name:'Share the approved pay statements with each employee.',exact:true}).check();
    const publishing=page.waitForResponse((r:any)=>r.url()===app.url+'/api/payroll/runs'&&r.request().method()==='POST'&&r.request().postDataJSON().action==='PUBLISH');await page.getByRole('button',{name:'Share pay statements',exact:true}).click();const shared=await publishing;expect(shared.status(),await shared.text()).toBe(200);
    for(let i=0;i<4;i++)await workerOnce(app.database.executor);
    const runRead=await context.request.get(app.url+'/api/payroll/runs',{headers:{'x-nevora-payroll':'1'}});expect(runRead.status()).toBe(200);const run=(await runRead.json()).runs.find((r:{id:string})=>r.id===fixture.runId);
    expect(run.status).toBe('APPROVED');const statements=run.documents.filter((d:{kind:string})=>d.kind==='EMPLOYEE_STATEMENT');expect(statements).toHaveLength(roster.length);expect(statements.every((d:{published:boolean})=>d.published)).toBe(true);
    const pdf=await context.request.get(app.url+'/api/payroll/documents/'+statements[0].id,{headers:{'x-nevora-payroll':'1'}});expect(pdf.status()).toBe(200);expect((await pdf.body()).subarray(0,4).toString()).toBe('%PDF');
    checks.push('Actual reviewed approval, local PDF worker and separately confirmed statement publication; no delivery worker');
    expect(errors).toEqual([]);expect(external).toEqual([]);complete=true;
  }finally{rs.unstubAllEnvs();if(!complete)await page.screenshot({path:resolve(evidence,'failure.png'),fullPage:true}).catch(()=>{});await context.close();await browser.close();await app.close();await writeFile(resolve(evidence,'joined-report.json'),JSON.stringify({complete,checks,errors,external,network,leaseControl,source:app.sourceHashes,data:'Owned fictional PostgreSQL only; real save/export/manifest, no forced success'},null,2));}
});
