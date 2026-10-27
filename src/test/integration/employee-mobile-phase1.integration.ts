import {it,expect} from 'vitest';
import {createRequire} from 'node:module';
import {mkdir,writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {createOwnedNextApp} from './owned-next-app';
import {seedOwnedApp,seedOwnedScenario,TEST_PASSWORD} from './owned-app-fixture';
import {publishScheduleWithRevision} from './management-api';
import {businessDate} from '../../lib/business-time';
import {weekStartFor,addDays} from '../../lib/date-utils';

it('integrates approved Employee mobile Home and Schedule with real own reads, confirmation and current access',async()=>{
 const evidence=process.env.NEVORA_EMPLOYEE_MOBILE_EVIDENCE;
 if(!evidence)throw Error('Select explicit external NEVORA_EMPLOYEE_MOBILE_EVIDENCE');
 await mkdir(evidence,{recursive:true});
 const runtime=createRequire(process.env.NEVORA_PLAYWRIGHT_RUNTIME_PACKAGE??resolve('tools/ci-browser-runtime/package.json'))('playwright');
 const app=await createOwnedNextApp(evidence),checks:{engine:string;name:string}[]=[],errors:string[]=[],captures:string[]=[];
 const q=(text:string,values:unknown[]=[])=>app.database.executor.query({text,values});
 let browser:{close():Promise<void>}|undefined,failureScreenshot:(()=>Promise<void>)|undefined;
 try{
  await seedOwnedApp(app.database.executor);const f=await seedOwnedScenario(app.database.executor,'EMP1',0),actor=f.actors[0];
  await q("UPDATE employees SET role='EMPLOYEE',first_name='Alex',last_name='Rivera' WHERE id=$1",[actor]);
  const today=businessDate(new Date(),'America/Puerto_Rico'),week=weekStartFor(today);
  for(const [index,location]of ['loc-1','loc-2'].entries()){
   await q("INSERT INTO schedules(id,location_id,week_start,status,created_by) VALUES($1,$2,$3,'DRAFT','QAOWNER')",['em-now-'+index,location,week]);
   if(index===0)await q("INSERT INTO shifts(id,schedule_id,employee_id,date,start_time,end_time,position_id) VALUES('em-own-today','em-now-0',$1,$2,'00:00','24:00','qa-pos')",[actor,today]);
   await publishScheduleWithRevision({locationId:location,weekStart:week,managerId:'QAOWNER'},app.database.executor);
  }
  await q("INSERT INTO shifts(id,schedule_id,employee_id,date,start_time,end_time,position_id) VALUES('em-own-split',$1,$2,$3,'17:00','20:00','qa-pos')",['qa-EMP1-schedule-0',actor,f.sourceDate]);
  await publishScheduleWithRevision({locationId:'loc-1',weekStart:f.week,managerId:'QAOWNER'},app.database.executor);
  for(const engine of ['chromium','webkit','firefox']){
   const activeBrowser=await runtime[engine].launch({headless:true});browser=activeBrowser;
   const context=await activeBrowser.newContext({viewport:{width:390,height:844},reducedMotion:'reduce',serviceWorkers:'block'});
   await context.route('**/*',async(route:{request():{url():string};abort():Promise<void>;continue():Promise<void>})=>{const url=new URL(route.request().url());if(['http:','https:'].includes(url.protocol)&&url.origin!==app.url){errors.push('Unexpected external origin '+url.origin);await route.abort();}else await route.continue();});
   const page=await context.newPage();failureScreenshot=async()=>{await page.screenshot({path:evidence+'/failure.png',fullPage:true});};page.setDefaultTimeout(15000);page.on('pageerror',(e:Error)=>errors.push(engine+': '+e.message));
   let authority='';page.on('request',(r:{url():string;headers():Record<string,string>})=>{if(new URL(r.url()).pathname==='/api/employee/home')authority=r.headers()['x-nevora-home']??authority;});
   const record=(name:string)=>{checks.push({engine,name});console.log(engine+': '+name);};
   const load=async(path:string)=>{await page.goto(app.url+path);await page.locator('main h1').first().waitFor();};
   const ready=async()=>{await page.locator('[data-home-state="ready"],[data-home-state="partial"]').waitFor();};
   const shot=async(name:string)=>{const file=`${evidence}/${engine}-${name}.png`;await page.screenshot({path:file,fullPage:true});captures.push(file);};
   await page.goto(app.url+'/login');await page.getByLabel('Employee ID',{exact:true}).fill(actor);await page.getByLabel('Password',{exact:true}).fill(TEST_PASSWORD);await page.getByRole('button',{name:'Sign in',exact:true}).click();await page.waitForURL(app.url+'/app');await ready();
   await page.getByRole('heading',{name:'Today',exact:true}).waitFor();expect(await page.locator('[data-employee-mobile="true"]').count()).toBe(1);
   expect(await page.locator('.mobile-nav a').allTextContents()).toEqual(['Home','Schedule','Requests','Hours','More']);
   expect(await page.getByRole('link',{name:'Add shift',exact:true}).count()).toBe(0);record('Real password/session Home uses Employee-only five-destination navigation');
   await page.locator('.q-home__clock .employee-time-badge[data-state="OFF_CLOCK"]').waitFor();record('Recorded time is read independently; planned active shift does not fabricate clock-in');await shot('home-390-light');
   await page.locator('.q-next').click();await page.getByRole('dialog').waitFor();expect(page.url()).toContain('shift=em-own-today');expect(await page.getByRole('dialog').innerText()).toContain('Main Office');await page.getByRole('dialog').getByRole('button',{name:'Done',exact:true}).click();await page.getByRole('dialog').waitFor({state:'hidden'});record('Home opens the exact currently authorized own shift and its details');
   await load('/app/schedule?week='+f.week);await page.getByRole('heading',{name:'Schedule',exact:true}).waitFor();expect(await page.locator('.q-sched-e').innerText()).not.toContain('Blair');
   await page.getByRole('link',{name:'Next week',exact:true}).click();await page.waitForURL((url:URL)=>url.searchParams.get('week')===addDays(f.week,7));expect(page.url()).toContain(addDays(f.week,7));await page.getByRole('link',{name:'Previous week',exact:true}).click();await page.waitForURL((url:URL)=>url.searchParams.get('week')===f.week);expect(page.url()).toContain(f.week);record('Own published weeks and navigation retain exact server-source context');
   await page.locator('.em-week-picker summary').click();await page.getByLabel('Choose any day in the week').fill(f.sourceDate);await page.getByRole('button',{name:'View week',exact:true}).click();await page.waitForURL((url:URL)=>url.searchParams.get('day')===f.sourceDate);expect(page.url()).toContain('week='+f.week);record('Native date selection resolves its actual Monday week without manager filters');
   await page.locator('.q-wk').getByRole('link',{name:new RegExp('selected day')}).waitFor();expect(await page.locator('#my-day').count()).toBe(1);
   await shot('schedule-390-light');
   const confirm=page.getByRole('button',{name:'Confirm',exact:true});
   if(await confirm.count()){await confirm.click();await page.getByText('You’re up to date',{exact:true}).waitFor();}
   const persisted=await q('SELECT employee_id,week_start::text FROM schedule_acknowledgements WHERE employee_id=$1 AND week_start=$2',[actor,f.week]);expect(persisted.length).toBe(1);record('Schedule confirmation persists canonically for the exact own week; refresh renders its receipt');
   await load('/app');await ready();const response=await page.request.get(app.url+'/api/employee/home?employeeId='+f.actors[1],{headers:{'X-Nevora-Home':authority}});expect(response.status()).toBe(200);const home=await response.json();expect(home.snapshot.currentShift.shiftId).toBe('em-own-today');expect(JSON.stringify(home)).not.toContain(f.actors[1]);
   const denied=await page.request.get(app.url+'/api/employee/home',{headers:{'X-Nevora-Home':'invalid'}});expect([401,403]).toContain(denied.status());record('Server reads stay bound to current actor; foreign query and invalid proof cannot select another employee');
   for(const theme of ['light','dark'])for(const width of [320,390,430]){
    await page.evaluate((choice:string)=>{localStorage.setItem('nv-theme',choice);(window as Window&{__nvApplyTheme?:()=>void}).__nvApplyTheme?.();},theme);expect(await page.locator('html').getAttribute('data-theme')).toBe(theme);await page.setViewportSize({width,height:844});
    for(const path of ['/app','/app/schedule?week='+f.week]){
     await load(path);if(path==='/app')await ready();expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true);
     const bad=await page.locator('.mobile-nav a,.em-week-picker summary,.q-weeknav > a').evaluateAll((els:HTMLElement[])=>els.filter(el=>el.getClientRects().length&&(el.getBoundingClientRect().width<43.5||el.getBoundingClientRect().height<43.5)).map(el=>el.textContent));expect(bad).toEqual([]);
    }
   }
   record('Light/Dark320/390/430 layouts retain accessible navigation and week-control targets');await shot('schedule-430-dark');
   await page.setViewportSize({width:320,height:844});await page.evaluate(()=>{document.documentElement.style.fontSize='200%';window.dispatchEvent(new Event('resize'));});
   await page.waitForFunction(()=>document.documentElement.getAttribute('data-text-step')==='200');expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true);await shot('schedule-320-dark-text200');
   await page.locator('.em-week-picker summary').focus();await page.keyboard.press('Enter');await page.getByLabel('Choose any day in the week').focus();await page.keyboard.press('Escape');expect(await page.locator('.em-week-picker summary').evaluate((e:HTMLElement)=>e===document.activeElement)).toBe(true);record('Enlarged text and native week-picker keyboard Escape preserve focus');
   await page.evaluate(()=>document.documentElement.style.fontSize='100%');await page.setViewportSize({width:1440,height:1000});await load('/app');await ready();expect(await page.getByRole('heading',{name:/Good (morning|afternoon|evening), Alex/}).count()).toBe(1);expect(await page.locator('.mobile-nav').isVisible()).toBe(false);expect(await page.locator('.em-next-action').isVisible()).toBe(false);await shot('home-desktop-unchanged');record('Desktop keeps original Home greeting, presentation and hidden mobile additions');
   await page.setViewportSize({width:390,height:844});await load('/app');await ready();await page.evaluate(()=>window.dispatchEvent(new Event('offline')));await page.locator('[data-home-state="paused"]').waitFor();expect(await page.locator('.q-next').innerText()).not.toContain('Northside');record('Background/offline release clears private Home facts');
   await page.evaluate(()=>window.dispatchEvent(new Event('online')));await ready();
   await q('DELETE FROM employee_sessions WHERE employee_id=$1',[actor]);await page.evaluate(()=>window.dispatchEvent(new Event('storage')));await page.locator('[data-home-state="unauthorized"],[data-home-state="unavailable"]').waitFor();expect(await page.locator('.q-home').innerText()).not.toContain('Alex');
   await load('/app/schedule?week='+f.week);expect(new URL(page.url()).pathname).toBe('/login');record('Revoked sessions clear own Home and refuse a direct protected Schedule route');
   await context.close();await activeBrowser.close();browser=undefined;
  }
  expect(errors).toEqual([]);
 }catch(error){await failureScreenshot?.().catch(()=>{});throw error;}
 finally{await browser?.close();await app.close();await writeFile(evidence+'/results.json',JSON.stringify({checks,errors,captures,ownedApp:app.root},null,2));}
});
