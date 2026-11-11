import {expect,it} from 'vitest';
import {createRequire} from 'node:module';
import {mkdir,writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {createOwnedNextApp} from './owned-next-app';
import {seedOwnedApp,assignOwnedManagerCompanyAccess,TEST_PASSWORD} from './owned-app-fixture';
import {hashPassword} from '../../lib/auth/password';
import {businessDate,formatBusinessDateTimeInput,localDateTimeToInstant} from '../../lib/business-time';

it('offers an audited management close in real desktop/mobile timecards with recovery and privacy retirement',async()=>{
 const evidence=process.env.NEVORA_MANAGEMENT_CLOSE_UI_EVIDENCE;if(!evidence)throw Error('Choose external management-close UI evidence');await mkdir(evidence,{recursive:true});
 const runtime=createRequire(process.env.NEVORA_PLAYWRIGHT_RUNTIME_PACKAGE??resolve('tools/ci-browser-runtime/package.json'))('playwright');
 const app=await createOwnedNextApp(evidence),q=<T=Record<string,unknown>>(text:string,values:unknown[]=[])=>app.database.executor.query<T>({text,values});
 const checks:string[]=[],errors:string[]=[],captures:string[]=[],network:unknown[]=[];let browser:{close():Promise<void>}|undefined,failureShot:(()=>Promise<void>)|undefined,complete=false;
 try {
  await seedOwnedApp(app.database.executor);const password=await hashPassword(TEST_PASSWORD);
  await q("INSERT INTO employees(id,first_name,last_name,phone,role,primary_location_id) VALUES('R10UIMANAGER','Fictional','Manager','ui-manager','MANAGER','loc-1')");
  await q("INSERT INTO employee_credentials(employee_id,password_hash,must_change_password) VALUES('R10UIMANAGER',$1,false)",[password]);await assignOwnedManagerCompanyAccess(app.database.executor,'R10UIMANAGER');
  await q("INSERT INTO clocker_devices(id,name,location_id,active) VALUES('ui-retired-tablet','Retired fictional tablet','loc-2',false);UPDATE locations SET active=false WHERE id='loc-2'");
  let n=0;
  async function seed(){const id='UI-TARGET-'+n,entry='UI-ENTRY-'+n++;await q("INSERT INTO employees(id,first_name,last_name,phone,role,primary_location_id,active) VALUES($1,'Unavailable',$1,$1,'EMPLOYEE','loc-2',false)",[id]);
   await q("INSERT INTO time_entries(id,employee_id,location_id,device_id,clock_in_at,status) VALUES($1,$2,'loc-2','ui-retired-tablet',clock_timestamp()-interval '4 hours','CLOCKED_IN')",[entry,id]);return {id,entry};}
  const today=businessDate(new Date(),'America/Puerto_Rico');
  for(const engine of ['chromium','webkit']){
   const active=await runtime[engine].launch({headless:true});browser=active;
   for(const [index,actor] of ['QAOWNER','R10UIMANAGER'].entries()){
    const target=await seed(),context=await active.newContext({viewport:{width:index?390:1440,height:1000},reducedMotion:'reduce',serviceWorkers:'block'}),page=await context.newPage();page.setDefaultTimeout(20000);
    let surfacePhase='login';
    page.on('pageerror',(e:Error)=>errors.push(engine+' '+actor+' '+surfacePhase+': '+e.message+' '+(e.stack??'')));
    page.on('requestfailed',(r:{url():string;failure():unknown})=>network.push({engine,actor,phase:surfacePhase,path:new URL(r.url()).pathname,failure:r.failure()}));
    await context.route('**/*',async(route:{request():{url():string};abort():Promise<void>;continue():Promise<void>})=>{const url=new URL(route.request().url());if(['http:','https:'].includes(url.protocol)&&url.origin!==app.url){errors.push('External origin '+url.origin);await route.abort();}else await route.continue();});
    failureShot=()=>page.screenshot({path:resolve(evidence,engine+'-'+actor+'-failure.png'),fullPage:true});
    await page.goto(app.url+'/login');await page.getByLabel('Employee ID',{exact:true}).fill(actor);await page.getByLabel('Password',{exact:true}).fill(TEST_PASSWORD);await page.getByRole('button',{name:'Sign in',exact:true}).click();await page.waitForURL(app.url+'/app');
    const url=app.url+'/app/timecards?start='+today+'&end='+today+'#timecard-'+target.id;
    surfacePhase='timecards';await page.goto(url);await page.locator('dialog[open]').waitFor();
    const start=page.getByRole('button',{name:'Close open punch',exact:true});await start.focus();await page.keyboard.press('Enter');
    const end=page.getByLabel('Confirmed end time (America/Puerto_Rico)',{exact:true}),reason=page.getByLabel('Reason for closing',{exact:true});await end.waitFor();
    expect(await end.inputValue()).toBe('');expect(await reason.inputValue()).toBe('');expect(await end.evaluate((el:HTMLElement)=>el===document.activeElement)).toBe(true);
    expect(await page.getByRole('button',{name:'Record close',exact:true}).isDisabled()).toBe(true);
    // The existing page and form both retire private drafts on a real browser lifecycle event.
    surfacePhase='privacy-retirement';await reason.fill('PRIVATE-RETIRED-DRAFT');await page.evaluate(()=>window.dispatchEvent(new Event('blur')));
    expect(await page.locator('textarea').count()).toBe(0);await page.evaluate(()=>window.dispatchEvent(new Event('focus')));
    await page.locator('dialog[open]').waitFor({state:'detached'}).catch(()=>{});
    await page.goto(url);await page.locator('dialog[open]').waitFor();await page.getByRole('button',{name:'Close open punch',exact:true}).click();await end.waitFor();expect(await reason.inputValue()).toBe('');
    surfacePhase='confirmation';const chosen=formatBusinessDateTimeInput(new Date(Date.now()-30*60000).toISOString(),'America/Puerto_Rico');await end.fill(chosen);await reason.fill('Verified last worked time; worker and tablet are unavailable.');
    const confirmation=page.getByLabel('I verified this end time and reason.',{exact:true});
    expect(await confirmation.evaluate((el:HTMLInputElement)=>el.labels![0].getBoundingClientRect().height)).toBeGreaterThanOrEqual(44);
    if(engine==='chromium'){await end.focus();await page.keyboard.press('Tab');expect(await reason.evaluate((el:HTMLElement)=>el===document.activeElement)).toBe(true);await page.keyboard.press('Tab');expect(await confirmation.evaluate((el:HTMLElement)=>el===document.activeElement)).toBe(true);await page.keyboard.press('Space');}
    else await confirmation.check();
    for(const [width,scale] of [[320,100],[390,100],[1440,100],[390,200]]){
     await page.setViewportSize({width,height:1000});await page.evaluate((scale:number)=>{document.documentElement.style.fontSize=scale+'%';},scale);
     expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+2),engine+' '+width+' '+scale).toBe(true);
    }
    await page.evaluate(()=>{document.documentElement.style.fontSize='100%';});await page.setViewportSize({width:index?390:1440,height:1000});
    const shot=resolve(evidence,engine+'-'+actor+'-confirmation.png');await page.screenshot({path:shot,fullPage:false});captures.push(shot);
    const bodies:string[]=[];let interrupted=false;
    if(engine==='chromium'&&actor==='QAOWNER')await page.route('**/api/manager/timecards/'+target.entry+'/close',async(route:{request():{method():string;postData():string|null};fetch():Promise<unknown>;abort(reason:string):Promise<void>;continue():Promise<void>})=>{
     if(route.request().method()==='POST'){bodies.push(route.request().postData()!);if(!interrupted){interrupted=true;await route.fetch();await route.abort('failed');return;}}await route.continue();
    });
    surfacePhase='save';await page.getByRole('button',{name:'Record close',exact:true}).focus();await page.keyboard.press('Enter');
    if(engine==='chromium'&&actor==='QAOWNER'){
     await page.getByRole('button',{name:'Retry same close',exact:true}).waitFor();expect(await q('SELECT count(*)::int AS n FROM management_time_closes WHERE time_entry_id=$1',[target.entry])).toEqual([{n:1}]);
     surfacePhase='uncertain-recovery';
     // Retire the whole protected tree and remount it, then close/reopen its inspector.
     await page.evaluate(()=>window.dispatchEvent(new Event('blur')));expect(await page.getByRole('button',{name:'Record close',exact:true}).count()).toBe(0);await page.evaluate(()=>window.dispatchEvent(new Event('focus')));
     await page.getByRole('button',{name:'Retry same close',exact:true}).waitFor();
     await page.locator('.cm-tc-done').click();await page.locator('[id="timecard-'+target.id+'"] button').first().click();await page.getByRole('button',{name:'Retry same close',exact:true}).waitFor();
     // Replace the cookie from another tab: the original tab must not offer the
     // Owner's private recovery to a different actor. Returning as the Owner
     // re-establishes fresh authority without replacing the business operation.
     const switcher=await context.newPage();
     for(const replacement of ['R10UIMANAGER','QAOWNER']){
      await switcher.bringToFront();await context.clearCookies();await switcher.goto(app.url+'/login');await switcher.getByLabel('Employee ID',{exact:true}).fill(replacement);await switcher.getByLabel('Password',{exact:true}).fill(TEST_PASSWORD);await switcher.getByRole('button',{name:'Sign in',exact:true}).click();await switcher.waitForURL(app.url+'/app');await page.bringToFront();
      await page.evaluate(()=>window.dispatchEvent(new Event('focus')));
      if(replacement==='R10UIMANAGER'){
       await page.getByRole('button',{name:'Retry same close',exact:true}).waitFor({state:'detached'});
       expect(await page.getByText('Verified last worked time; worker and tablet are unavailable.',{exact:true}).count()).toBe(0);
      }else await page.getByRole('button',{name:'Retry same close',exact:true}).waitFor();
     }
     await switcher.close();await page.bringToFront();await page.getByRole('button',{name:'Retry same close',exact:true}).click();expect(bodies).toHaveLength(2);expect(bodies[1]).toBe(bodies[0]);checks.push('Committed response loss survives privacy retirement, inspector unmount and account replacement; exact original operation reconciles once');
    }
    await page.getByText('Punch closed. The selected end time and reason are recorded.',{exact:true}).waitFor();
    expect(await q('SELECT status,clock_out_at=$2::timestamptz AS correct_end FROM time_entries WHERE id=$1',[target.entry,localDateTimeToInstant(chosen,'America/Puerto_Rico')])).toEqual([{status:'CLOCKED_OUT',correct_end:true}]);
    expect(await q('SELECT count(*)::int AS n FROM management_time_closes WHERE time_entry_id=$1',[target.entry])).toEqual([{n:1}]);
    checks.push(engine+' '+actor+': keyboard-open, explicit blank fields, privacy retirement,320/390/1440reflow and200%text, real inactive worker/location/tablet close');
    surfacePhase='teardown';await context.close();
   }
   await active.close();browser=undefined;
  }
  expect(errors).toEqual([]);complete=true;
 }catch(error){await failureShot?.().catch(()=>{});throw error;}
 finally{await browser?.close();await app.close();await writeFile(resolve(evidence,'results.json'),JSON.stringify({complete,checks,errors,captures,network,scope:'Owned current development UI and actual cookies/SQL only; no held Claude629-file import, hosted activation, native or production certification'},null,2));}
},360000);
