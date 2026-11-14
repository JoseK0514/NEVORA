import {expect,it} from 'vitest';
import {createRequire} from 'node:module';
import {mkdir,writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {createOwnedNextApp} from './owned-next-app';
import {seedOwnedApp,assignOwnedManagerCompanyAccess,TEST_PASSWORD} from './owned-app-fixture';
import {hashPassword} from '../../lib/auth/password';
import {formatBusinessDateTimeInput} from '../../lib/business-time';
it('creates delegated proposals through real management UI and requires separate review with private same-operation recovery',async()=>{
 const evidence=process.env.NEVORA_DELEGATED_UI_EVIDENCE;if(!evidence)throw Error('Choose external delegated UI evidence');await mkdir(evidence,{recursive:true});
 const runtime=createRequire(resolve('tools/ci-browser-runtime/package.json'))('playwright'),app=await createOwnedNextApp(evidence),q=<T=Record<string,unknown>>(text:string,values:unknown[]=[])=>app.database.executor.query<T>({text,values});
 const errors:string[]=[],checks:string[]=[],captures:string[]=[],releases:(()=>void)[]=[];let browser:{close():Promise<void>}|undefined,failure:(()=>Promise<void>)|undefined,complete=false;
 try{
  await seedOwnedApp(app.database.executor);const password=await hashPassword(TEST_PASSWORD);
  await q("INSERT INTO employees(id,first_name,last_name,phone,role,primary_location_id) VALUES('R11-MANAGER','Fictional','Manager','r11-manager','MANAGER','loc-1')");await q("INSERT INTO employee_credentials(employee_id,password_hash,must_change_password) VALUES('R11-MANAGER',$1,false)",[password]);await assignOwnedManagerCompanyAccess(app.database.executor,'R11-MANAGER');
  await q("INSERT INTO clocker_devices(id,name,location_id,active) VALUES('ui-r11-retired','Fictional retired tablet','loc-1',false)");
  let n=0;
  for(const [engine,actor,reviewer,width] of [['chromium','QAOWNER','R11-MANAGER',1440],['webkit','R11-MANAGER','QAOWNER',390]] as const){
   const active=await runtime[engine].launch({headless:true});browser=active;const employee='R11-WORKER-'+n++,entry='R11-ENTRY-'+n,name='Fictional Worker '+n;
   await q("INSERT INTO employees(id,first_name,last_name,phone,role,primary_location_id,active) VALUES($1,'Fictional',$2,$1,'EMPLOYEE','loc-1',false)",[employee,'Worker '+n]);await q('INSERT INTO employee_location_eligibility(employee_id,location_id) VALUES($1,$2)',[employee,'loc-1']);
   await q("INSERT INTO time_entries(id,employee_id,location_id,device_id,clock_in_at,clock_out_at,status,version) VALUES($1,$2,'loc-1','ui-r11-retired',clock_timestamp()-interval '4 hours',clock_timestamp()-interval '2 hours','CLOCKED_OUT',4)",[entry,employee]);
   const contexts:{close():Promise<void>}[]=[];
   async function login(who:string){
    const context=await active.newContext({viewport:{width,height:1000},serviceWorkers:'block',reducedMotion:'reduce'});contexts.push(context);const page=await context.newPage();page.setDefaultTimeout(20000);
    page.on('pageerror',(error:Error)=>errors.push(engine+' '+who+': '+error.message+' '+(error.stack??'')));
    await context.route('**/*',async(route:{request():{url():string};abort():Promise<void>;continue():Promise<void>})=>{const u=new URL(route.request().url());if(['http:','https:'].includes(u.protocol)&&u.origin!==app.url){errors.push('External origin '+u.origin);await route.abort();}else await route.continue();});
    await page.goto(app.url+'/login');await page.getByLabel('Employee ID',{exact:true}).fill(who);await page.getByLabel('Password',{exact:true}).fill(TEST_PASSWORD);
    const reads=Promise.all(['/api/notifications','/api/manager/inbox-count'].map(path=>page.waitForResponse((r:{url():string;status():number})=>new URL(r.url()).pathname===path&&r.status()===200).then((r:{finished():Promise<unknown>})=>r.finished())));
    await page.getByRole('button',{name:'Sign in',exact:true}).click();await page.waitForURL(app.url+'/app');await reads;await page.locator('a[href="/app/timecards"]:visible').first().click();await page.waitForURL(app.url+'/app/timecards');return page;
   }
   const page=await login(actor);failure=()=>page.screenshot({path:resolve(evidence,engine+'-failure.png'),fullPage:true}).then(()=>{});
   await page.locator('[id="timecard-'+employee+'"] button').first().click();await page.getByRole('link',{name:'Request time correction',exact:true}).focus();await page.keyboard.press('Enter');await page.waitForURL(app.url+'/app/timecards/corrections/new/'+employee);await page.getByText(name,{exact:true}).waitFor();
   const selection=page.getByLabel('Time to correct',{exact:true}),start=page.getByLabel('Proposed start time',{exact:true}),end=page.getByLabel('Proposed end time',{exact:true}),reason=page.getByLabel('Reason for correction',{exact:true}),confirmation=page.getByLabel('I verified this proposal. A different authorized person must approve it.',{exact:true});
   await selection.selectOption('missing');expect(await start.inputValue()).toBe('');expect(await end.inputValue()).toBe('');expect(await page.getByLabel('Location',{exact:true}).inputValue()).toBe('');expect(await page.getByRole('button',{name:'Send correction request',exact:true}).isDisabled()).toBe(true);
   await selection.selectOption(JSON.stringify(['ENTRY_BOUNDARY',entry,null]));await start.fill(formatBusinessDateTimeInput(new Date(Date.now()-235*60000).toISOString(),'America/Puerto_Rico'));await end.fill(formatBusinessDateTimeInput(new Date(Date.now()-125*60000).toISOString(),'America/Puerto_Rico'));await reason.fill('Verified proposal for an unavailable worker; requires separate review.');expect(await reason.evaluate((el:HTMLTextAreaElement)=>el.labels![0].textContent)).toBe('Reason for correction');await confirmation.check();
   for(const [w,scale] of [[320,100],[390,100],[1440,100],[390,200]]){await page.setViewportSize({width:w,height:1000});await page.evaluate((scale:number)=>{document.documentElement.style.fontSize=scale+'%';},scale);expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+2),engine+' '+w+' '+scale).toBe(true);}
   await page.evaluate(()=>{document.documentElement.style.fontSize='100%';});await page.setViewportSize({width,height:1000});const shot=resolve(evidence,engine+'-proposal.png');await page.screenshot({path:shot,fullPage:true});captures.push(shot);
   const bodies:string[]=[];let holdReads=false,readRequested:()=>void=()=>{},releaseRead:()=>void=()=>{};const requestedRead=new Promise<void>(resolve=>{readRequested=resolve;}),readGate=new Promise<void>(resolve=>{releaseRead=resolve;});releases.push(releaseRead);let foreign=false,interrupted=false,commit:()=>void=()=>{},release:()=>void=()=>{};const committed=new Promise<void>(resolve=>{commit=resolve;}),gate=new Promise<void>(resolve=>{release=resolve;});releases.push(release);
   if(engine==='chromium')await page.route('**/api/manager/time-corrections/delegated/'+employee,async(route:{request():{method():string;postData():string|null};fetch():Promise<{json():Promise<unknown>}>;fulfill(options:unknown):Promise<void>;abort(reason:string):Promise<void>;continue():Promise<void>})=>{
    if(route.request().method()==='GET'&&holdReads){const response=await route.fetch();readRequested();await readGate;await route.fulfill({response});return;}
    if(route.request().method()==='GET'&&foreign){const response=await route.fetch(),body=await response.json() as Record<string,unknown>;await route.fulfill({response,json:{...body,recoveryScope:'d'.repeat(64)}});return;}
    if(route.request().method()==='POST'){bodies.push(route.request().postData()!);if(!interrupted){interrupted=true;await route.fetch();commit();await gate;await route.abort('failed');return;}}await route.continue();
   });
   await page.getByRole('button',{name:'Send correction request',exact:true}).click();
   if(engine==='chromium'){
    await Promise.race([committed,new Promise<never>((_,reject)=>setTimeout(()=>reject(Error('Actual delegated commit barrier not reached')),20000))]);expect(await q('SELECT count(*)::int AS n FROM time_correction_requests WHERE employee_id=$1',[employee])).toEqual([{n:1}]);
    holdReads=true;await page.evaluate(()=>window.dispatchEvent(new Event('storage')));release();await Promise.race([requestedRead,new Promise<never>((_,reject)=>setTimeout(()=>reject(Error('Delayed recovery read barrier not reached')),20000))]);expect(await page.locator('textarea').count()).toBe(0);expect(await page.getByText(name,{exact:true}).count()).toBe(0);expect(await page.getByText('Verified proposal for an unavailable worker; requires separate review.',{exact:true}).count()).toBe(0);holdReads=false;releaseRead();await page.getByRole('button',{name:'Retry same request',exact:true}).waitFor();await page.getByText(name,{exact:true}).waitFor();
    foreign=true;await page.getByRole('button',{name:'Refresh correction information',exact:true}).click();await page.getByText('Current correction information is unavailable.',{exact:true}).waitFor();expect(await page.getByRole('button',{name:'Retry same request',exact:true}).isDisabled()).toBe(true);expect(await page.getByText('Verified proposal for an unavailable worker; requires separate review.',{exact:true}).count()).toBe(0);expect(bodies).toHaveLength(1);
    foreign=false;await page.getByRole('button',{name:'Refresh correction information',exact:true}).click();await page.getByText(name,{exact:true}).waitFor();await page.getByRole('button',{name:'Retry same request',exact:true}).click();expect(bodies).toHaveLength(2);expect(bodies[1]).toBe(bodies[0]);checks.push('Real lost-ACK commit survives storage/protected-tree retirement; foreign-company context refuses recovery; exact retry creates one request');
   }
   await page.getByText('Request sent. A different authorized person must review it.',{exact:true}).waitFor();const [request]=await q<{id:string}>('SELECT id FROM time_correction_requests WHERE employee_id=$1',[employee]);await page.getByRole('link',{name:'View correction queue',exact:true}).click();
   const row=page.locator('[id="correction-'+request.id+'"]');await row.waitFor();expect(await row.getByRole('button',{name:'Approve correction for '+name,exact:true}).isDisabled()).toBe(true);await row.getByText('Requested by Fictional '+(actor==='QAOWNER'?'Owner':'Manager')+' for this employee.',{exact:true}).waitFor();
   const reviewerPage=await login(reviewer);await reviewerPage.getByRole('link',{name:'Time corrections',exact:true}).click();const other=reviewerPage.locator('[id="correction-'+request.id+'"]');await other.getByRole('button',{name:'Approve correction for '+name,exact:true}).click();await reviewerPage.getByText('Correction approved. The original recorded punch remains unchanged.',{exact:true}).waitFor();
   expect(await q('SELECT requested_by_employee_id FROM time_correction_requests WHERE id=$1',[request.id])).toEqual([{requested_by_employee_id:actor}]);expect(await q('SELECT created_by FROM time_correction_adjustments WHERE request_id=$1',[request.id])).toEqual([{created_by:reviewer}]);expect(await q('SELECT version FROM time_entries WHERE id=$1',[entry])).toEqual([{version:4}]);checks.push(engine+' '+actor+': actual Timecards entry, explicit proposal/labels, inactive target, desktop/phone/reflow, requester disabled and different '+reviewer+' approval; immutable raw punch');
   for(const context of contexts)await context.close();await active.close();browser=undefined;
  }
  expect(errors).toEqual([]);complete=true;
 }catch(error){await failure?.().catch(()=>{});throw error;}
 finally{for(const release of releases)release();await browser?.close();await app.close();await writeFile(resolve(evidence,'results.json'),JSON.stringify({complete,checks,errors,captures,scope:'Owned current development only; no held Claude UI import, hosted/native/production or real payroll/provider action'},null,2));}
},360000);
