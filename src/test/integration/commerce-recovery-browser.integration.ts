import {expect,it} from 'vitest';
import {createRequire} from 'node:module';
import {resolve,join} from 'node:path';
import {mkdir,writeFile,readFile} from 'node:fs/promises';
import {createOwnedNextApp} from './owned-next-app';
import {seedOwnedApp,TEST_PASSWORD} from './owned-app-fixture';
import {hashPassword} from '../../lib/auth/password';
import {withOwnedTestResources} from './owned-test-resources';
import {measureRenderedContrast} from '../../../scripts/browser-contrast.mjs';

it('renders actual recovery routes with current sessions, bounded status reads and no operational pollers',async()=>{
 const parent=process.env.NEVORA_MOBILE_ACCESS_EVIDENCE;if(!parent)throw Error('Select external NEVORA_MOBILE_ACCESS_EVIDENCE');
 const evidence=join(parent,'commerce-recovery');await mkdir(evidence,{recursive:true});
 const runtime=createRequire(process.env.NEVORA_PLAYWRIGHT_RUNTIME_PACKAGE??resolve('tools/ci-browser-runtime/package.json'))('playwright');
 const app=await createOwnedNextApp(evidence,{commerceRecoveryEnabled:true,payrollEnabled:true});
 const checks:string[]=[],errors:string[]=[];let passed=false;
 await withOwnedTestResources(async defer=>{
  defer(async()=>{
   let ownership:{closed?:boolean}|null=null;
   try{ownership=JSON.parse(await readFile(join(app.root,'ownership.json'),'utf8'));}
   finally{await writeFile(join(evidence,'report.json'),JSON.stringify({status:passed&&ownership?.closed?'passed':'failed',checks,errors,ownershipClosed:ownership?.closed===true,scope:'Exact committed Next source, owned local PostgreSQL and normal password sign-in; bounded client response fixtures for financial presentation only. No real provider, billing success, device or hosted acceptance claimed.'},null,2));}
   if(!ownership?.closed)throw Error('Owned recovery app closure unverified');
  });
  defer(()=>app.close());
  await seedOwnedApp(app.database.executor);
  await app.database.executor.query({text:"INSERT INTO employees(id,first_name,last_name,phone,role,primary_location_id) VALUES('QA-RECOVERY-EMP','Fictional','Employee','555-0123','EMPLOYEE','loc-1')",values:[]});
  await app.database.executor.query({text:'INSERT INTO employee_credentials(employee_id,password_hash,must_change_password) VALUES($1,$2,false)',values:['QA-RECOVERY-EMP',await hashPassword(TEST_PASSWORD)]});
  const origin=app.url.replace('127.0.0.1','localhost');
  for(const engine of ['chromium','webkit']){
   const browser=await runtime[engine].launch({headless:true});defer(()=>browser.close());
   const context=await browser.newContext({viewport:{width:390,height:844},serviceWorkers:'block'}),page=await context.newPage();page.setDefaultTimeout(15000);
   const requests:string[]=[];let mode='actual';
   const status={state:'restricted',operational:false,trialEndsAt:'2026-11-12T12:00:00.000Z',paidThrough:null,graceEndsAt:null,plan:'small',employeeLimit:15,activeEmployees:2,reason:'trial_ended',billing:true,export:true};
   page.on('pageerror',(error:Error)=>errors.push(engine+':'+error.message.slice(0,200)));
   page.on('request',(request:{url():string})=>{requests.push(new URL(request.url()).pathname);});
   await context.route('**/*',async(route:{request():{url():string};abort(reason?:string):Promise<void>;continue():Promise<void>;fulfill(options:unknown):Promise<void>})=>{
    const url=new URL(route.request().url());
    if(['http:','https:'].includes(url.protocol)&&url.origin!==origin){await route.abort('blockedbyclient');return;}
    if(url.pathname==='/api/commerce/status'&&mode!=='actual'){
     if(mode==='denied'){await route.fulfill({status:403,contentType:'application/json',body:JSON.stringify({error:{code:'owner_required'}})});return;}
     await route.fulfill({status:200,contentType:'application/json',body:JSON.stringify(mode==='invalid'?{...status,businessId:'must-not-render',state:'unknown'}:mode==='paid'?{...status,state:'paid',operational:true,reason:null}:status)});return;
    }
    await route.continue();
   });
   await page.goto(origin+'/app/billing');await page.waitForURL(/\/login(?:\?|$)/);checks.push(engine+': anonymous billing requires normal sign-in');
   await page.goto(origin+'/clocker/access/paused?from=%2Fclocker%2Fmain&reason=billing_status_unavailable&secret=must-not-echo');
   await page.getByRole('heading',{name:'Access could not be checked',exact:true}).waitFor();
   expect(await page.getByRole('link',{name:'Try Clocker again'}).getAttribute('href')).toBe('/clocker/main');
   expect(await page.locator('body').innerText()).not.toContain('must-not-echo');
   for(const width of [320,390,768,1440]){
    await page.setViewportSize({width,height:900});expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true);
    await page.screenshot({path:join(evidence,engine+'-clocker-'+width+'.png'),fullPage:true});
    await page.addStyleTag({content:'html{font-size:200%}'});expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true);await page.addStyleTag({content:'html{font-size:100%}'});
   }
   await page.getByRole('link',{name:'Try Clocker again'}).focus();expect(await page.getByRole('link',{name:'Try Clocker again'}).evaluate((el:HTMLElement)=>el===document.activeElement)).toBe(true);
   await page.keyboard.press(engine==='webkit'&&process.platform==='darwin'?'Alt+Tab':'Tab');expect(await page.getByRole('link',{name:'Owner sign in'}).evaluate((el:HTMLElement)=>el===document.activeElement)).toBe(true);
   await page.goto(origin+'/clocker/access/paused?from=https%3A%2F%2Fevil.invalid');expect(await page.getByRole('link',{name:'Try Clocker again'}).count()).toBe(0);
   checks.push(engine+': public tablet has bounded return, no private data, four widths and keyboard focus');
   for(const [id,owner] of [['QAOWNER',true],['QA-RECOVERY-EMP',false]] as const){
    await context.clearCookies();await page.goto(origin+'/login');await page.getByLabel('Employee ID',{exact:true}).fill(id);await page.getByLabel('Password',{exact:true}).fill(TEST_PASSWORD);await page.getByRole('button',{name:'Sign in',exact:true}).click();
    await page.waitForURL(origin+'/app/billing?reason=billing_status_unavailable');
    requests.length=0;
    if(owner){
     await page.getByText('Billing status is unavailable. Try again in a moment.',{exact:true}).waitFor();
     expect(await page.locator('.app-shell').count()).toBe(0);expect(await page.locator('[data-commerce-recovery]').count()).toBe(1);
     await page.getByRole('button',{name:'Open billing in Velani',exact:true}).click();await page.getByRole('alert').filter({hasText:'Billing could not be opened'}).waitFor();
     mode='restricted';await page.getByRole('button',{name:'Refresh status',exact:true}).click();await page.getByText('Access paused',{exact:true}).waitFor();expect(await page.getByText('2 / 15',{exact:true}).count()).toBe(1);expect(await page.getByRole('link',{name:'Return to workspace'}).count()).toBe(0);
     for(const width of [320,390,768,1440]){await page.setViewportSize({width,height:900});expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true);await page.screenshot({path:join(evidence,engine+'-billing-'+width+'.png'),fullPage:true});await page.addStyleTag({content:'html{font-size:200%}'});expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true);await page.addStyleTag({content:'html{font-size:100%}'});}
     for(const label of await page.locator('main :is(h1,p,dt,dd,a,button):visible').all())expect((await label.evaluate(measureRenderedContrast)).ratio).toBeGreaterThanOrEqual(4.5);
     await page.getByRole('link',{name:'My pay statements',exact:true}).click();await page.waitForURL(origin+'/app/my-pay');expect(await page.locator('.app-shell').count()).toBe(0);
     await page.goBack();await page.waitForURL(origin+'/app/billing?reason=billing_status_unavailable');await page.getByText('Access paused',{exact:true}).waitFor();expect(await page.locator('.app-shell').count()).toBe(0);
     await page.getByRole('button',{name:'Open billing in Velani',exact:true}).focus();expect(await page.getByRole('button',{name:'Open billing in Velani',exact:true}).evaluate((el:HTMLElement)=>el===document.activeElement)).toBe(true);
     mode='paid';await page.getByRole('button',{name:'Refresh status',exact:true}).click();await page.getByText('Active',{exact:true}).waitFor();expect(await page.getByRole('link',{name:'Return to workspace'}).count()).toBe(1);
     mode='invalid';await page.getByRole('button',{name:'Refresh status',exact:true}).click();await page.getByText('Billing status is unavailable. Try again in a moment.',{exact:true}).waitFor();expect(await page.getByText('2 / 15',{exact:true}).count()).toBe(0);expect(await page.locator('body').innerText()).not.toContain('must-not-render');
     mode='denied';await page.getByRole('button',{name:'Refresh status',exact:true}).click();await page.getByRole('alert').filter({hasText:'Sign in with the current workplace Owner'}).waitFor();expect(await page.getByRole('button',{name:'Open billing in Velani'}).count()).toBe(0);
     mode='actual';checks.push(engine+': real Owner session, unavailable/handoff failure, bounded presentation fixtures restricted/paid/invalid/revoked, no stale private status');
    }else{
     await page.getByRole('heading',{name:'Workplace access needs attention',exact:true}).waitFor();expect(await page.getByRole('button',{name:'Open billing in Velani'}).count()).toBe(0);expect(requests).not.toContain('/api/commerce/status');checks.push(engine+': current non-Owner receives contact-Owner view without private status reads');
    }
    expect(await page.locator('.app-shell').count()).toBe(0);
    expect(requests.filter(path=>/^\/api\/(notifications|employee|company-access|passkeys)/.test(path))).toEqual([]);
   }
   await context.close();
  }
  expect(errors).toEqual([]);passed=true;
 });
},360000);
