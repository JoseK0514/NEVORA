import {expect,it,vi} from 'vitest';
import {createRequire} from 'node:module';
import {mkdir,writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {createOwnedNextApp} from './owned-next-app';
import {seedOwnedApp} from './owned-app-fixture';
import {seedPayrollFixture} from './payroll-fixture';

const runtime=createRequire(resolve('tools/ci-browser-runtime/package.json'))('playwright');

it.each(['chromium','webkit'])('%s joins the delivered payroll UI to real imports, paid breaks and a reconciled manifest',async engine=>{
  if(!process.env.NEVORA_ALL_UI_BROWSER_EVIDENCE)throw Error('External evidence required');
  const evidence=resolve(process.env.NEVORA_ALL_UI_BROWSER_EVIDENCE,'claude-joined-'+engine);await mkdir(evidence,{recursive:true});
  const app=await createOwnedNextApp(evidence,{payrollEnabled:true});
  const browser=await runtime[engine].launch({headless:true}),context=await browser.newContext({viewport:{width:1440,height:1000},serviceWorkers:'block',reducedMotion:'reduce'}),page=await context.newPage();
  const errors:string[]=[],external:string[]=[],checks:string[]=[],requests=new Set<object>(),network:{event:string;url:string;failure?:string}[]=[];
  let complete=false;
  try{
    vi.stubEnv('NEVORA_PAYROLL_ENABLED','true');
    await seedOwnedApp(app.database.executor);const fixture=await seedPayrollFixture(app.database.executor,{breaks:true});
    page.on('pageerror',(e:Error)=>errors.push(page.url()+' '+e.stack));page.setDefaultTimeout(20000);
    page.on('request',(r:any)=>{const u=new URL(r.url());if(u.origin===app.url&&u.pathname.startsWith('/api/'))requests.add(r);});
    page.on('requestfinished',(r:any)=>{requests.delete(r);});
    page.on('requestfailed',(r:any)=>{requests.delete(r);network.push({event:'failed',url:r.url(),failure:r.failure()?.errorText});});
    await context.route('**/*',async(route:{request():{url():string};abort():Promise<void>;continue():Promise<void>})=>{const url=new URL(route.request().url());if(['http:','https:'].includes(url.protocol)&&url.origin!==app.url){external.push(url.origin);await route.abort();}else await route.continue();});
    const visit=async(path:string)=>{if(page.url()!=='about:blank'){await page.evaluate(()=>window.dispatchEvent(new Event('pagehide')));await expect.poll(()=>requests.size,{timeout:20000}).toBe(0);}await page.goto(app.url+path,{waitUntil:'domcontentloaded'});};
    await visit('/login');await page.getByLabel('Employee ID',{exact:true}).fill(fixture.ids.owner);await page.getByLabel('Password',{exact:true}).fill(fixture.password);await page.getByRole('button',{name:'Sign in',exact:true}).click();await page.waitForURL(app.url+'/app');
    const q=<T=Record<string,unknown>>(text:string,values:unknown[]=[])=>app.database.executor.query<T>({text,values});
    const roster=await q<{id:string}>('SELECT id FROM employees ORDER BY id');
    const csv='employeeId,gross,employeeDeductions,employerContributions,net\r\n'+roster.map(p=>p.id+','+(p.id===fixture.ids.a?'1000,123.40,70,876.60':'0,0,0,0')).join('\r\n')+'\r\n';
    await visit('/app/payroll/import?run='+fixture.runId);await page.getByRole('heading',{name:'Add the file from your payroll system',exact:true}).waitFor();
    const fileChooser=page.waitForEvent('filechooser');await page.getByRole('button',{name:'Choose a file',exact:true}).click();await (await fileChooser).setFiles({name:'fictional-payroll.csv',mimeType:'text/csv',buffer:Buffer.from(csv)});
    await page.getByLabel('Payroll system',{exact:true}).fill('Fictional accountant');await page.getByLabel('Report or reference',{exact:true}).fill('JOINED-'+engine);
    await page.getByRole('button',{name:'Match people',exact:true}).click();await page.getByRole('button',{name:'Review amounts',exact:true}).click();
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
    await page.getByRole('button',{name:'Match people',exact:true}).click();await page.locator('.pim-pick__in').fill(fixture.ids.a);await page.getByRole('option',{name:new RegExp(fixture.ids.a)}).waitFor();await expect.poll(()=>page.getByRole('option').count()).toBe(1);await page.locator('.pim-pick__in').press('Enter');await expect.poll(()=>page.locator('.pim-pick__in').inputValue()).toBe('María José Fictional QA');
    const zeroChoices=page.getByRole('radio',{name:'Not paid this period',exact:true});expect(await zeroChoices.count()).toBe(roster.length-1);for(const choice of await zeroChoices.all())await choice.check();
    await page.getByRole('button',{name:'Review amounts',exact:true}).click();
    for(const [field,amount] of [['gross','1001.00'],['net','877.60']]){await page.getByRole('button',{name:new RegExp('^Correct '+field+' for')}).click();await page.locator('.pim-amt__in').fill(amount);await page.locator('.pim-amt__in').press('Enter');}
    await page.getByRole('button',{name:'Check and save',exact:true}).click();
    const rematched=page.waitForResponse((r:any)=>r.url()===app.url+'/api/payroll/runs'&&r.request().method()==='POST');await page.getByRole('button',{name:'Save amounts',exact:true}).click();const revised=await rematched;expect(revised.status(),await revised.text()).toBe(200);
    const reviewed=revised.request().postDataJSON().amounts;expect(reviewed.schema).toBe('NEVORA_PAYROLL_IMPORT_V1');expect(reviewed.sourceDocument).toBeUndefined();expect(reviewed.rows.find((r:{employeeId:string})=>r.employeeId===fixture.ids.a)).toMatchObject({grossMinor:'100100',netMinor:'87760'});
    await page.getByText('Amounts saved',{exact:true}).waitFor();expect(await q('SELECT payload FROM payroll_period_populations ORDER BY revision')).toEqual(populationBefore);
    checks.push('Rematched and corrected CSV saves canonical reviewed JSON; missing-person choices do not replace persisted population facts');
    const period=fixture.period,exportPath='/app/payroll-export/paid-time?start='+period.startDate+'&end='+period.endDate;
    // The real read is given a shorter observation lifetime; no source rows or success values are invented.
    await page.route('**/api/timecards',async(route:any)=>{const actual=await route.fetch(),body=await actual.json();if(body.state==='ready')body.validForMs=1000;await route.fulfill({response:actual,json:body});});
    await visit(exportPath);await page.locator('.pim-person').first().waitFor();
    await expect.poll(()=>page.locator('.pim-person').count(),{timeout:4000}).toBe(0);
    await page.unroute('**/api/timecards');await page.evaluate(()=>window.dispatchEvent(new Event('focus')));await page.locator('.pim-person').first().waitFor();
    checks.push('The data observation expires even while operational authority is still current');
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
    expect(errors).toEqual([]);expect(external).toEqual([]);complete=true;
  }finally{vi.unstubAllEnvs();if(!complete)await page.screenshot({path:resolve(evidence,'failure.png'),fullPage:true}).catch(()=>{});await context.close();await browser.close();await app.close();await writeFile(resolve(evidence,'joined-report.json'),JSON.stringify({complete,checks,errors,external,network,source:app.sourceHashes,data:'Owned fictional PostgreSQL only; real save/export/manifest, no forced success'},null,2));}
});
