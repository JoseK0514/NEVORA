import {it,expect} from 'vitest';
import {createRequire} from 'node:module';
import {mkdir,writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {randomUUID} from 'node:crypto';
import {measureRenderedContrast} from '../../../scripts/browser-contrast.mjs';
import {createOwnedNextApp} from './owned-next-app';
import {seedOwnedApp,seedOwnedScenario,assignOwnedManagerCompanyAccess,TEST_PASSWORD} from './owned-app-fixture';
import {publishScheduleWithRevision} from './management-api';
import {businessDate} from '../../lib/business-time';
import {weekStartFor,addDays} from '../../lib/date-utils';

it('integrates approved Employee mobile Home and Schedule with real own reads, confirmation and current access',async()=>{
 const evidence=process.env.NEVORA_EMPLOYEE_MOBILE_EVIDENCE;
 if(!evidence)throw Error('Select explicit external NEVORA_EMPLOYEE_MOBILE_EVIDENCE');
 await mkdir(evidence,{recursive:true});
 const runtime=createRequire(process.env.NEVORA_PLAYWRIGHT_RUNTIME_PACKAGE??resolve('tools/ci-browser-runtime/package.json'))('playwright');
 const app=await createOwnedNextApp(evidence),checks:{engine:string;name:string}[]=[],errors:string[]=[],captures:string[]=[],consoleMessages:{engine:string;type:string;text:string;expectedTransportFailure:boolean;authorityLoss:boolean}[]=[],refusals:{engine:string;path:string;status:number;state:string;reason:string;privateDataPresent:boolean}[]=[],responseChecks:Promise<void>[]=[];
 const q=(text:string,values:unknown[]=[])=>app.database.executor.query({text,values});
 let browser:{close():Promise<void>}|undefined,failureScreenshot:(()=>Promise<void>)|undefined;
 try{
  await seedOwnedApp(app.database.executor);const f=await seedOwnedScenario(app.database.executor,'EMP1',0),actor=f.actors[0];
  await q("UPDATE employees SET role='EMPLOYEE',first_name='Alex',last_name='Rivera' WHERE id=$1",[actor]);
  const today=businessDate(new Date(),'America/Puerto_Rico'),week=weekStartFor(today),pastWeek=addDays(week,-7);
  for(const [index,location]of ['loc-1','loc-2'].entries()){
   await q("INSERT INTO schedules(id,location_id,week_start,status,created_by) VALUES($1,$2,$3,'DRAFT','QAOWNER')",['em-now-'+index,location,week]);
   if(index===0)await q("INSERT INTO shifts(id,schedule_id,employee_id,date,start_time,end_time,position_id) VALUES('em-own-today','em-now-0',$1,$2,'00:00','24:00','qa-pos')",[actor,today]);
   await publishScheduleWithRevision({locationId:location,weekStart:week,managerId:'QAOWNER'},app.database.executor);
  }
  await q("INSERT INTO shifts(id,schedule_id,employee_id,date,start_time,end_time,position_id) VALUES('em-own-split',$1,$2,$3,'17:00','20:00','qa-pos')",['qa-EMP1-schedule-0',actor,f.sourceDate]);
  await publishScheduleWithRevision({locationId:'loc-1',weekStart:f.week,managerId:'QAOWNER'},app.database.executor);
  for(const [index,location]of ['loc-1','loc-2'].entries()){
   await q("INSERT INTO schedules(id,location_id,week_start,status,created_by) VALUES($1,$2,$3,'DRAFT','QAOWNER')",['em-past-'+index,location,pastWeek]);
   if(index===0)await q("INSERT INTO shifts(id,schedule_id,employee_id,date,start_time,end_time,position_id) VALUES('em-past-overnight','em-past-0',$1,$2,'22:00','06:00','qa-pos')",[actor,addDays(pastWeek,1)]);
   await publishScheduleWithRevision({locationId:location,weekStart:pastWeek,managerId:'QAOWNER'},app.database.executor);
  }
  for(const engine of ['chromium','webkit','firefox']){
   const activeBrowser=await runtime[engine].launch({headless:true});browser=activeBrowser;
   const context=await activeBrowser.newContext({viewport:{width:390,height:844},reducedMotion:'reduce',serviceWorkers:'block'});
   await context.route('**/*',async(route:{request():{url():string};abort():Promise<void>;continue():Promise<void>})=>{const url=new URL(route.request().url());if(['http:','https:'].includes(url.protocol)&&url.origin!==app.url){errors.push('Unexpected external origin '+url.origin);await route.abort();}else await route.continue();});
   let expectedTransportFailure=false,authorityLoss=false;const page=await context.newPage();page.on('response',(response:{url():string;status():number;json():Promise<Record<string,unknown>>})=>{const path=new URL(response.url()).pathname;if(authorityLoss&&['/api/employee/home','/api/employee/my-time'].includes(path)&&[401,403,503].includes(response.status()))responseChecks.push(response.json().then(body=>{const privateDataPresent='snapshot'in body||JSON.stringify(body).includes('Main Office')||JSON.stringify(body).includes(actor);refusals.push({engine,path,status:response.status(),state:String(body.state),reason:String(body.reason),privateDataPresent});if(privateDataPresent||!['unauthorized','unavailable'].includes(String(body.state)))errors.push(engine+': invalid authority-loss response '+path);}));});page.on('console',(message:{type():string;text():string})=>{if(['error','warning'].includes(message.type())){const entry={engine,type:message.type(),text:message.text(),expectedTransportFailure,authorityLoss};consoleMessages.push(entry);}});failureScreenshot=async()=>{await page.screenshot({path:evidence+'/failure.png',fullPage:true});await writeFile(evidence+'/failure-layout.json',JSON.stringify(await page.evaluate(()=>({path:location.pathname,roots:[...document.querySelectorAll('[data-employee-mobile]')].map(el=>({id:el.id,active:el.getAttribute('data-employee-mobile-active'),page:el.getAttribute('data-employee-mobile-page')})),elements:[...document.querySelectorAll('.mobile-header,.mobile-header .brand,.q-home,.q-sched-e,.mobile-nav')].map(el=>{const style=getComputedStyle(el),rect=el.getBoundingClientRect();return{class:el.className,display:style.display,visibility:style.visibility,x:rect.x,y:rect.y,width:rect.width,height:rect.height};})})),null,2));};page.setDefaultTimeout(15000);page.on('pageerror',(e:Error)=>errors.push(engine+': '+e.message));
   let authority='';page.on('request',(r:{url():string;headers():Record<string,string>})=>{if(new URL(r.url()).pathname==='/api/employee/home')authority=r.headers()['x-nevora-home']??authority;});
   const record=(name:string)=>{checks.push({engine,name});console.log(engine+': '+name);};
   const load=async(path:string)=>{await page.goto(app.url+path);await page.locator('main h1:visible').waitFor();if(new URL(page.url()).pathname==='/login')return;if((page.viewportSize()?.width??0)<=767)await page.locator('[data-employee-mobile-active="true"]').waitFor();await page.waitForFunction(()=>[...document.querySelectorAll('.q-home,.q-sched-e')].filter(el=>el.getClientRects().length&&getComputedStyle(el).visibility!=='hidden').length===1);};
   const ready=async()=>{await page.locator('[data-home-state="ready"]:visible,[data-home-state="partial"]:visible').waitFor();};
   const shot=async(name:string)=>{const file=`${evidence}/${engine}-${name}.png`;await page.screenshot({path:file,fullPage:true});captures.push(file);};
   await page.goto(app.url+'/login');await page.getByLabel('Employee ID',{exact:true}).fill(actor);await page.getByLabel('Password',{exact:true}).fill(TEST_PASSWORD);await page.getByRole('button',{name:'Sign in',exact:true}).click();await page.waitForURL(app.url+'/app');await ready();
   await page.getByRole('heading',{name:'Today',exact:true}).waitFor();expect(await page.locator('[data-employee-mobile="true"]').count()).toBe(1);
   expect(await page.locator('.mobile-nav a').allTextContents()).toEqual(['Home','Schedule','Requests','Hours','More']);
   expect(await page.getByRole('link',{name:'Add shift',exact:true}).count()).toBe(0);record('Real password/session Home uses Employee-only five-destination navigation');
   await page.locator('.q-home__clock .employee-time-badge[data-state="OFF_CLOCK"]').waitFor();record('Recorded time is read independently; planned active shift does not fabricate clock-in');await shot('home-390-light');
   await page.locator('.q-next:visible').click();await page.getByRole('dialog').waitFor();expect(page.url()).toContain('shift=em-own-today');expect(await page.getByRole('dialog').innerText()).toContain('Main Office');await page.getByRole('dialog').getByRole('button',{name:'Done',exact:true}).click();await page.getByRole('dialog').waitFor({state:'hidden'});record('Home opens the exact currently authorized own shift and its details');
   await load('/app/schedule?week='+f.week);await page.getByRole('heading',{name:'Schedule',exact:true}).waitFor();await q('DELETE FROM schedule_acknowledgements WHERE employee_id=$1 AND week_start=$2',[actor,f.week]);await page.reload();await page.locator('.em-week-picker:visible summary').waitFor();expect(await page.locator('.q-sched-e:visible').innerText()).not.toContain('Blair');
   await page.getByRole('link',{name:'Next week',exact:true}).click();await page.waitForURL((url:URL)=>url.searchParams.get('week')===addDays(f.week,7));expect(page.url()).toContain(addDays(f.week,7));await page.getByRole('link',{name:'Previous week',exact:true}).click();await page.waitForURL((url:URL)=>url.searchParams.get('week')===f.week);expect(page.url()).toContain(f.week);record('Own published weeks and navigation retain exact server-source context');
   await page.locator('.em-week-picker:visible summary').click();expect(await page.getByRole('link',{name:'Calendar sync',exact:true}).getAttribute('href')).toBe('/app/profile#employee-calendar-title');await page.locator('.em-week-picker:visible').getByLabel('Choose any day in the week').fill(f.sourceDate);await page.getByRole('button',{name:'View week',exact:true}).click();await page.waitForURL((url:URL)=>url.searchParams.get('day')===f.sourceDate);expect(page.url()).toContain('week='+f.week);record('Native date selection resolves its actual Monday week without manager filters');
   await page.locator('.q-wk:visible').getByRole('link',{name:new RegExp('selected day')}).waitFor();expect(await page.locator('#my-day:visible').count()).toBe(1);
   await shot('schedule-390-light');
   const confirm=page.getByRole('button',{name:'Confirm schedule',exact:true});
   const beforeConfirm=await q('SELECT employee_id FROM schedule_acknowledgements WHERE employee_id=$1 AND week_start=$2',[actor,f.week]);
   if(!beforeConfirm.length){await confirm.waitFor();await confirm.click();}
   await page.getByRole('heading',{name:'You’re up to date',exact:true}).waitFor();await page.reload();await page.getByRole('heading',{name:'You’re up to date',exact:true}).waitFor();
   const persisted=await q('SELECT employee_id,week_start::text FROM schedule_acknowledgements WHERE employee_id=$1 AND week_start=$2',[actor,f.week]);expect(persisted.length).toBe(1);record('Schedule confirmation persists canonically for the exact own week; refresh renders its receipt');
   await load('/app');await ready();const response=await page.request.get(app.url+'/api/employee/home?employeeId='+f.actors[1],{headers:{'X-Nevora-Home':authority}});expect(response.status()).toBe(400);expect(JSON.stringify(await response.json())).not.toContain(f.actors[1]);const own=await page.request.get(app.url+'/api/employee/home',{headers:{'X-Nevora-Home':authority}});expect(own.status()).toBe(200);const home=await own.json();expect(home.snapshot.currentShift.shiftId).toBe('em-own-today');expect(JSON.stringify(home)).not.toContain(f.actors[1]);
   const denied=await page.request.get(app.url+'/api/employee/home',{headers:{'X-Nevora-Home':'invalid'}});expect([401,403]).toContain(denied.status());record('Server reads stay bound to current actor; foreign query and invalid proof cannot select another employee');
   for(const theme of ['light','dark'])for(const width of [320,390,430]){
    await page.evaluate((choice:string)=>{localStorage.setItem('nv-theme',choice);(window as Window&{__nvApplyTheme?:()=>void}).__nvApplyTheme?.();},theme);expect(await page.locator('html').getAttribute('data-theme')).toBe(theme);await page.setViewportSize({width,height:844});
    for(const path of ['/app','/app/schedule?week='+f.week]){
     await load(path);if(path==='/app')await ready();expect(await page.locator('.mobile-header .brand').isVisible()).toBe(true);expect(await page.locator('.mobile-header .e5-new').isVisible()).toBe(false);expect(await page.locator('[data-employee-mobile]').evaluate((el:HTMLElement)=>getComputedStyle(el).getPropertyValue('--em-canvas').trim())).toBe(theme==='dark'?'#0c1817':'#f4f7f6');expect(await page.locator('.q-home:visible,.q-sched-e:visible').evaluate((el:HTMLElement)=>getComputedStyle(el).backgroundColor)).toBe(theme==='dark'?'rgb(12, 24, 23)':'rgb(244, 247, 246)');expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true);
     const bad=await page.locator('.mobile-nav a,.em-week-picker summary,.q-weeknav > a,.q-wk a,.q-glance a,.q-seg a').evaluateAll((els:HTMLElement[])=>els.filter(el=>el.getClientRects().length&&(el.getBoundingClientRect().width<43.5||el.getBoundingClientRect().height<43.5)).map(el=>({text:el.textContent,width:el.getBoundingClientRect().width,height:el.getBoundingClientRect().height})));expect(bad).toEqual([]);const contrastTargets=path==='/app'?'.q-next:visible .q-next__top > :last-child,.q-next:visible .q-next__meta,.q-next:visible .em-next-action,.q-home__clock .employee-time-footer small':'.q-sched-e:visible .q-wk a.is-on b,.q-sched-e:visible .q-seg a[aria-current]';for(const el of await page.locator(contrastTargets).all())expect((await el.evaluate(measureRenderedContrast)).ratio).toBeGreaterThanOrEqual(4.5);
    }
   }
   record('Light/Dark320/390/430 layouts retain accessible navigation and week-control targets');await shot('schedule-430-dark');
   await page.setViewportSize({width:320,height:844});await page.evaluate(()=>{document.documentElement.style.fontSize='200%';window.dispatchEvent(new Event('resize'));});
   await page.waitForFunction(()=>document.documentElement.getAttribute('data-text-step')==='200');await page.waitForFunction(()=>{const links=[...document.querySelectorAll('.mobile-nav a')];return links[2].getBoundingClientRect().top>links[0].getBoundingClientRect().top;});expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true);await shot('schedule-320-dark-text200');
   const overlaps=await page.locator('.mobile-nav a span').evaluateAll((els:HTMLElement[])=>els.flatMap((el,index)=>{const a=el.getBoundingClientRect();return els.slice(index+1).filter(other=>{const b=other.getBoundingClientRect();return a.left<b.right&&a.right>b.left&&a.top<b.bottom&&a.bottom>b.top;}).map(other=>el.textContent+' / '+other.textContent);}));expect(overlaps).toEqual([]);await page.locator('.em-week-picker:visible summary').focus();await page.keyboard.press('Enter');await page.locator('.em-week-picker:visible').getByLabel('Choose any day in the week').focus();await page.keyboard.press('Escape');expect(await page.locator('.em-week-picker:visible summary').evaluate((e:HTMLElement)=>e===document.activeElement)).toBe(true);record('Enlarged text and native week-picker keyboard Escape preserve focus');
   await page.evaluate(()=>document.documentElement.style.fontSize='100%');await page.setViewportSize({width:1440,height:1000});await load('/app');await ready();expect(await page.getByRole('heading',{name:/Good (morning|afternoon|evening), Alex/}).count()).toBe(1);expect(await page.locator('.mobile-nav').isVisible()).toBe(false);expect(await page.locator('.em-next-action').isVisible()).toBe(false);await shot('home-desktop-unchanged');record('Desktop keeps original Home greeting, presentation and hidden mobile additions');
   await page.setViewportSize({width:390,height:844});await load('/app');await ready();expect(await page.locator('.q-next:visible').innerText()).toContain('Main Office');await page.locator('.employee-time-badge[data-state="OFF_CLOCK"]').waitFor();await page.evaluate(()=>window.dispatchEvent(new Event('offline')));await page.locator('[data-home-state="paused"]').waitFor();expect(await page.locator('.q-home').innerText()).not.toContain('Main Office');expect(await page.locator('.employee-time-badge[data-state="OFF_CLOCK"]').count()).toBe(0);record('Background/offline release clears private Home facts');
   await page.evaluate(()=>window.dispatchEvent(new Event('online')));await ready();expect(await page.locator('.q-next:visible').innerText()).toContain('Main Office');await page.locator('.employee-time-badge[data-state="OFF_CLOCK"]').waitFor();

   if(engine==='chromium'){
    await load('/app/schedule?week='+pastWeek+'&day='+addDays(pastWeek,1));expect(await page.locator('.q-sched-e:visible').innerText()).toMatch(/10:00\sPM/);expect(await page.locator('.q-sched-e:visible').innerText()).toMatch(/6:00\sAM/);
    await page.locator('.q-sched-e:visible .q-row').filter({hasText:'10:00 PM'}).click();await page.getByRole('dialog').waitFor();expect(await page.getByRole('dialog').innerText()).toContain('Ends');expect(await page.getByRole('dialog').getByRole('link',{name:'Swap with a teammate',exact:true}).count()).toBe(0);await shot('schedule-past-overnight');await page.getByRole('dialog').getByRole('button',{name:'Done',exact:true}).click();await page.getByRole('dialog').waitFor({state:'hidden'});record('Own published past overnight shift preserves end-day meaning without future-only swap controls');
    await load('/app/schedule?week='+f.week+'&day='+f.targetDate+'&shift='+f.targetId);expect(await page.getByRole('dialog').count()).toBe(0);expect(await page.locator('.q-sched-e:visible').innerText()).not.toContain('West Office');record('Foreign shift deep link cannot open another employee assignment');await load('/app');await ready();
    // Transport interruptions exercise the actual controller; no source rows are fabricated.
    let releaseHome!:()=>void;
    const homeGate=new Promise<void>(resolve=>{releaseHome=resolve;});
    await context.route('**/api/employee/home',async(route:{continue():Promise<void>})=>{await homeGate;await route.continue();});
    await page.reload();await page.locator('[data-home-state="loading"]:visible').waitFor();
    expect(await page.locator('.q-home:visible').innerText()).not.toContain('Main Office');await shot('home-loading');
    releaseHome();await ready();await context.unroute('**/api/employee/home');record('Loading withholds own shift facts until actual Home read completes');
    expectedTransportFailure=true;await context.route('**/api/employee/home',async(route:{abort(reason?:string):Promise<void>})=>route.abort('failed'));
    await page.reload();await page.locator('[data-home-state="unavailable"]:visible').waitFor();
    expect(await page.locator('.q-home:visible').innerText()).not.toContain('Main Office');await shot('home-network-error');
    await context.unroute('**/api/employee/home');await page.getByRole('button',{name:'Try again to load Home',exact:true}).click();await ready();
    expect(await page.locator('.q-next:visible').innerText()).toContain('Main Office');expectedTransportFailure=false;record('Failed Home transport shows honest unavailable state and explicit retry recovers actual data');
    await q("INSERT INTO time_off_requests(id,employee_id,start_date,end_date,status) SELECT 'em-mobile-cap-'||n,$1,'2030-12-01','2030-12-01','PENDING' FROM generate_series(1,101)n",[actor]);
    await page.reload();await page.locator('[data-home-state="partial"]:visible').waitFor();
    expect(await page.locator('.q-home:visible').innerText()).toContain('Partially shown');expect(await page.locator('.q-next:visible').innerText()).toContain('Main Office');await shot('home-partial-source-cap');
    await q("DELETE FROM time_off_requests WHERE id LIKE 'em-mobile-cap-%'");record('Real source-cap partial state discloses limits while retaining independently authorized shift');

    await q("SELECT nevora_set_workspace_presentation($1,'workspace-fuel','QAOWNER',0,$2,repeat('a',64))",[randomUUID(),JSON.stringify({version:1,brand:{},modules:{disabled:['marketplace','timeOff','updates']}})]);
    await load('/app/schedule?week='+f.week);expect(await page.getByRole('link',{name:/Open shifts/}).count()).toBe(0);
    await page.goto(app.url+'/app/exchange?tab=available');await page.locator('[data-module-off="marketplace"]').waitFor();expect(await page.getByRole('link',{name:'Turn it on in Settings',exact:true}).count()).toBe(0);
    await shot('module-off');await q("SELECT nevora_set_workspace_presentation($1,'workspace-fuel','QAOWNER',1,$2,repeat('b',64))",[randomUUID(),JSON.stringify({version:1,brand:{},modules:{disabled:[]}})]);
    record('Owner-saved module-off policy hides employee options and refuses a direct module route without management controls');

    await q('DELETE FROM schedule_acknowledgements WHERE employee_id=$1 AND week_start=$2',[actor,f.week]);await load('/app/schedule?week='+f.week);
    const operation=await page.locator('.q-weekconf:visible input[name="operationId"]').inputValue();let lostResponse=false;expectedTransportFailure=true;
    await context.route('**/app/schedule?**',async(route:{request():{method():string};fetch():Promise<{status():number}>;abort(reason?:string):Promise<void>;continue():Promise<void>})=>{
     if(!lostResponse&&route.request().method()==='POST'){lostResponse=true;const response=await route.fetch();expect(response.status()).toBe(200);await route.abort('failed');}else await route.continue();
    });
    await page.getByRole('button',{name:'Confirm schedule',exact:true}).click();await page.locator('.q-weekconf:visible').getByText('Confirmation outcome unknown. Retry to check the original confirmation.',{exact:true}).waitFor();
    expect((await q('SELECT employee_id FROM schedule_acknowledgements WHERE employee_id=$1 AND week_start=$2',[actor,f.week])).length).toBe(1);
    expect(await page.locator('.q-weekconf:visible input[name="operationId"]').inputValue()).toBe(operation);await shot('schedule-unknown-confirmation');
    await context.unroute('**/app/schedule?**');await page.getByRole('button',{name:'Retry confirmation',exact:true}).click();await page.getByRole('heading',{name:'You’re up to date',exact:true}).waitFor();
    expect((await q('SELECT employee_id FROM schedule_acknowledgements WHERE employee_id=$1 AND week_start=$2',[actor,f.week])).length).toBe(1);expectedTransportFailure=false;record('Lost committed response preserves original operation and retry recovers one canonical receipt');

    await q("UPDATE shifts SET end_time='21:00' WHERE id='em-own-split'");await publishScheduleWithRevision({locationId:'loc-1',weekStart:f.week,managerId:'QAOWNER'},app.database.executor);
    await load('/app/schedule?week='+f.week+'&day='+f.sourceDate);await page.getByRole('button',{name:'Confirm schedule',exact:true}).waitFor();
    expect(await page.locator('.q-sched-e:visible').innerText()).not.toContain('You’re up to date');await shot('schedule-republished');
    await q('DELETE FROM shifts WHERE id=$1 OR id=$2',[f.sourceId,'em-own-split']);await publishScheduleWithRevision({locationId:'loc-1',weekStart:f.week,managerId:'QAOWNER'},app.database.executor);
    await load('/app/schedule?week='+f.week);await page.getByRole('button',{name:'Confirm schedule',exact:true}).waitFor();
    expect(await page.locator('.q-sched-e:visible').innerText()).toContain('No assignments remain this week');await shot('schedule-empty-removal');
    await page.getByRole('button',{name:'Confirm schedule',exact:true}).click();await page.getByRole('heading',{name:'You’re up to date',exact:true}).waitFor();record('Republished changed and removed own assignments invalidate the old confirmation and preserve exact empty-week review');
    await q("DELETE FROM shifts WHERE id='em-own-today'");await publishScheduleWithRevision({locationId:'loc-1',weekStart:week,managerId:'QAOWNER'},app.database.executor);
    await load('/app');await ready();await page.getByRole('link',{name:'View schedule, no upcoming shift',exact:true}).waitFor();await page.locator('.employee-time-badge[data-state="OFF_CLOCK"]').waitFor();await shot('home-no-upcoming-shift');record('Real no-upcoming-shift Home retains actual recorded-clock access');
    await q("INSERT INTO shifts(id,schedule_id,employee_id,date,start_time,end_time,position_id) VALUES('em-own-today','em-now-0',$1,$2,'00:00','24:00','qa-pos')",[actor,today]);await publishScheduleWithRevision({locationId:'loc-1',weekStart:week,managerId:'QAOWNER'},app.database.executor);
    await q("INSERT INTO shifts(id,schedule_id,employee_id,date,start_time,end_time,position_id,is_designated_lead) VALUES($1,'qa-EMP1-schedule-0',$2,$3,'08:00','16:00','qa-pos',true),('em-own-split','qa-EMP1-schedule-0',$2,$3,'17:00','20:00','qa-pos',false)",[f.sourceId,actor,f.sourceDate]);await publishScheduleWithRevision({locationId:'loc-1',weekStart:f.week,managerId:'QAOWNER'},app.database.executor);

    await page.setViewportSize({width:320,height:844});await page.goto(app.url+'/app/profile#employee-calendar-title');await page.locator('.profile-calendar-disclosure[open]').waitFor();await page.locator('.employee-calendar-state:visible').waitFor();
    for(const scale of [125,150,200]){
     await page.evaluate((n:number)=>{document.documentElement.style.fontSize=n+'%';window.dispatchEvent(new Event('resize'));},scale);
     await page.waitForFunction((n:number)=>document.documentElement.getAttribute('data-text-step')===String(n),scale);
     expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true);
     const collisions=await page.locator('.mobile-nav a span').evaluateAll((els:HTMLElement[])=>els.flatMap((el,index)=>{const a=el.getBoundingClientRect();return els.slice(index+1).filter(other=>{const b=other.getBoundingClientRect();return a.left<b.right&&a.right>b.left&&a.top<b.bottom&&a.bottom>b.top;}).map(other=>el.textContent+' / '+other.textContent);}));expect(collisions).toEqual([]);
    }
    await shot('calendar-320-text200');await page.evaluate(()=>{document.documentElement.style.fontSize='100%';window.dispatchEvent(new Event('resize'));});record('Calendar direct entry and125/150/200 percent text retain readable disclosure and navigation');
    await load('/app');await ready();expect(await page.locator('.q-next:visible').innerText()).toContain('Main Office');
    authorityLoss=true;await q("UPDATE workspaces SET active=false WHERE id='workspace-fuel'");await page.evaluate(()=>window.dispatchEvent(new Event('storage')));await page.locator('[data-home-state="unauthorized"]:visible,[data-home-state="unavailable"]:visible').waitFor();expect(await page.locator('.q-home:visible').innerText()).not.toContain('Main Office');expect(await page.locator('.employee-time-badge[data-state="OFF_CLOCK"]').count()).toBe(0);await Promise.all(responseChecks);
    await q("UPDATE workspaces SET active=true WHERE id='workspace-fuel'");await load('/app');await ready();authorityLoss=false;record('Current workspace deactivation clears own facts and restoration requires a fresh authorized read');
   }
   authorityLoss=true;await q('DELETE FROM employee_sessions WHERE employee_id=$1',[actor]);await page.evaluate(()=>window.dispatchEvent(new Event('storage')));await page.locator('[data-home-state="unauthorized"],[data-home-state="unavailable"]').waitFor();expect(await page.locator('.q-home').innerText()).not.toContain('Main Office');expect(await page.locator('.employee-time-badge[data-state="OFF_CLOCK"]').count()).toBe(0);
   await page.goto(app.url+'/app/schedule?week='+f.week);await page.waitForURL(app.url+'/login');expect(new URL(page.url()).pathname).toBe('/login');await Promise.all(responseChecks);authorityLoss=false;record('Revoked sessions clear own Home and refuse a direct protected Schedule route');

   if(engine==='chromium'){
    await q("UPDATE employees SET role='MANAGER' WHERE id=$1",[f.actors[2]]);await assignOwnedManagerCompanyAccess(app.database.executor,f.actors[2]);
    for(const [id,role]of [[f.actors[1],'LEAD'],['QAOWNER','OWNER'],[f.actors[2],'MANAGER']]){
     await context.clearCookies();await page.goto(app.url+'/login');await page.getByLabel('Employee ID',{exact:true}).fill(id);await page.getByLabel('Password',{exact:true}).fill(TEST_PASSWORD);await page.getByRole('button',{name:'Sign in',exact:true}).click();await page.waitForURL(app.url+'/app');
     if(role==='LEAD'){
      await ready();await page.locator('[data-employee-mobile-active="true"]').waitFor();expect(await page.locator('.mobile-nav a').allTextContents()).toEqual(['Home','Schedule','Requests','Hours','More']);
      await load('/app/schedule?week='+f.week+'&day='+f.targetDate);expect(await page.locator('.q-sched-e:visible').innerText()).toContain('West Office');expect(await page.locator('.q-sched-e:visible').innerText()).not.toContain('Main Office');expect(await page.getByRole('link',{name:'Add shift',exact:true}).count()).toBe(0);
     }else{
      await page.locator('[data-nv-clean]').waitFor();expect(await page.locator('[data-employee-mobile]').count()).toBe(0);expect(await page.locator('.app-shell').evaluate((el:HTMLElement)=>getComputedStyle(el).getPropertyValue('--em-canvas').trim())).toBe('');
      if(role==='MANAGER'){const response=await page.request.get(app.url+'/api/company-access/operational-authority',{headers:{'x-nevora-company-access':'1'}});expect(response.status()).toBe(200);const grant=await response.json();expect(grant.state).toBe('ready');expect(grant.scope?.mode).toBe('COMPANY');}await page.locator('.mobile-nav').getByRole('link',{name:'Inbox',exact:true}).waitFor();expect(await page.locator('.mobile-nav a').allTextContents()).toContain('Inbox');
     }
     await shot(role.toLowerCase()+'-scope');if(role==='LEAD'){await q("UPDATE employee_sessions SET expires_at=clock_timestamp()-interval '1 second' WHERE employee_id=$1",[id]);await page.goto(app.url+'/app/schedule?week='+f.week);await page.waitForURL(app.url+'/login');expect(await page.locator('[data-employee-mobile]').count()).toBe(0);record('Expired Lead session cannot enter protected Schedule');}record(role+' real session retains role-owned navigation and presentation');
    }
   }
   await context.close();await activeBrowser.close();browser=undefined;
  }
  await Promise.all(responseChecks);for(const entry of consoleMessages.filter(entry=>entry.type==='error')){const hydration=/hydration|didn.t match|server.rendered|Invalid/.test(entry.text);const transport=entry.expectedTransportFailure&&/Failed to load resource.*(?:ERR_FAILED|Load failed)|Failed to fetch|NetworkError|Load failed/.test(entry.text);const match=entry.text.match(/status of (401|403|503)/);const denied=entry.authorityLoss&&match&&refusals.some(r=>r.engine===entry.engine&&r.status===Number(match[1])&&!r.privateDataPresent&&['unauthorized','unavailable'].includes(r.state));if(hydration||(!transport&&!denied))errors.push(entry.engine+': console '+entry.text);}expect(errors).toEqual([]);
 }catch(error){await failureScreenshot?.().catch(()=>{});throw error;}
 finally{await browser?.close();await app.close();await writeFile(evidence+'/results.json',JSON.stringify({checks,errors,captures,consoleMessages,refusals,ownedApp:app.root},null,2));}
});
