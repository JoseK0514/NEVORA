import {it,expect} from 'vitest';
import {createRequire} from 'node:module';
import {mkdir,writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {randomUUID} from 'node:crypto';
import {measureRenderedContrast} from '../../../scripts/browser-contrast.mjs';
import {createOwnedNextApp} from './owned-next-app';
import {seedOwnedApp,seedOwnedScenario,assignOwnedManagerCompanyAccess,TEST_PASSWORD} from './owned-app-fixture';
import {publishScheduleWithRevision} from './management-api';
import {fixtureReadGate} from './fixture-read-gate';
import {expectedNotificationRefusal,safeNotificationRefusal,type ObservedNotificationRefusal} from './authority-refusal-observation';
import {businessDate} from '../../lib/business-time';
import {weekStartFor,addDays} from '../../lib/date-utils';

it('integrates the Release 1 Employee phone Home and Schedule with real own reads, confirmation and current access',async()=>{
 const evidence=process.env.NEVORA_EMPLOYEE_MOBILE_EVIDENCE;
 if(!evidence)throw Error('Select explicit external NEVORA_EMPLOYEE_MOBILE_EVIDENCE');
 await mkdir(evidence,{recursive:true});
 const runtime=createRequire(process.env.NEVORA_PLAYWRIGHT_RUNTIME_PACKAGE??resolve('tools/ci-browser-runtime/package.json'))('playwright');
 const app=await createOwnedNextApp(evidence),checks:{engine:string;name:string}[]=[],errors:string[]=[],captures:string[]=[],consoleMessages:{engine:string;type:string;text:string;expectedTransportFailure:boolean;authorityLoss:boolean;url:string;at:number}[]=[],refusals:{engine:string;path:string;status:number;state:string;reason:string;privateDataPresent:boolean}[]=[],responseChecks:Promise<void>[]=[],notificationRefusals:ObservedNotificationRefusal[]=[],fixtureEvents:{engine:string;event:string;at:number;active:number}[]=[],controlContrast:{engine:string;theme:string;width:number;control:string;ratio:number}[]=[],stripLimits:Record<string,unknown>[]=[];
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
   const notificationGate=fixtureReadGate(event=>fixtureEvents.push({engine,...event}));
   let expectedTransportFailure=false,authorityLoss=false;const page=await context.newPage();page.on('console',(message:{type():string;text():string;location():{url:string}})=>{if(['error','warning'].includes(message.type())){const entry={engine,type:message.type(),text:message.text(),expectedTransportFailure,authorityLoss,url:message.location().url,at:Date.now()};consoleMessages.push(entry);}});failureScreenshot=async()=>{await page.screenshot({path:evidence+'/failure.png',fullPage:false});await writeFile(evidence+'/failure-layout.json',JSON.stringify(await page.evaluate(()=>({path:location.pathname,roots:[...document.querySelectorAll('[data-employee-mobile]')].map(el=>({id:el.id,active:el.getAttribute('data-employee-mobile-active'),page:el.getAttribute('data-employee-mobile-page'),chrome:el.getAttribute('data-employee-mobile-chrome')})),elements:[...document.querySelectorAll('.mobile-header,.mobile-header .brand,.c-ehome,.c-esched,.c-more,.mobile-nav')].map(el=>{const style=getComputedStyle(el),rect=el.getBoundingClientRect();return{class:el.className,display:style.display,visibility:style.visibility,x:rect.x,y:rect.y,width:rect.width,height:rect.height};})})),null,2));};page.setDefaultTimeout(15000);page.on('pageerror',(e:Error)=>errors.push(engine+': '+e.message));
   await context.route('**/*',async(route:{request():{url():string};fetch():Promise<{status():number;json():Promise<Record<string,unknown>>}>;fulfill(options:{response:{status():number;json():Promise<Record<string,unknown>>}}):Promise<void>;abort():Promise<void>;continue():Promise<void>})=>{
    const url=new URL(route.request().url());
    if(['http:','https:'].includes(url.protocol)&&url.origin!==app.url){errors.push('Unexpected external origin '+url.origin);await route.abort();return;}
    if(url.pathname==='/api/notifications'){
     const intentionalAtStart=authorityLoss;
     const captured=notificationGate.read(async()=>{const response=await route.fetch();if([401,403].includes(response.status())){const body=await response.json();notificationRefusals.push({engine,url:url.href,status:response.status(),at:Date.now(),authorityLoss:intentionalAtStart||authorityLoss,bodySafe:safeNotificationRefusal(body)});}await route.fulfill({response});});
     const settled=captured.catch(async()=>{errors.push(engine+': notification response capture failed');await route.abort().catch(()=>{});});responseChecks.push(settled);await settled;return;
    }
    if(authorityLoss&&['/api/employee/home','/api/employee/my-time'].includes(url.pathname)){
     // Read the actual server bytes before delivering the unchanged response. A
     // page navigation can retire Chromium's response-body handle immediately.
     const captured=(async()=>{const response=await route.fetch();if([401,403,503].includes(response.status())){const body=await response.json(),privateDataPresent='snapshot'in body||JSON.stringify(body).includes('Main Office')||JSON.stringify(body).includes(actor);refusals.push({engine,path:url.pathname,status:response.status(),state:String(body.state),reason:String(body.reason),privateDataPresent});if(privateDataPresent||!['unauthorized','unavailable'].includes(String(body.state)))errors.push(engine+': invalid authority-loss response '+url.pathname);}await route.fulfill({response});})();
     const settled=captured.catch(async()=>{errors.push(engine+': authority-loss response capture failed '+url.pathname);await route.abort().catch(()=>{});});responseChecks.push(settled);await settled;return;
    }
    await route.continue();
   });
   let authority='';page.on('request',(r:{url():string;headers():Record<string,string>})=>{if(new URL(r.url()).pathname==='/api/employee/home')authority=r.headers()['x-nevora-home']??authority;});
   const record=(name:string)=>{checks.push({engine,name});console.log(engine+': '+name);};
   // An Employee gets the corporate pages; a Lead (on hold for Release 1) keeps its v5 Home and Schedule.
   const load=async(path:string)=>{await page.goto(app.url+path);await page.locator('main h1:visible').waitFor();if(new URL(page.url()).pathname==='/login')return;if((page.viewportSize()?.width??0)<=767)await page.locator('[data-employee-mobile-active="true"]').waitFor();await page.waitForFunction(()=>[...document.querySelectorAll('.c-ehome,.c-esched,.c-more,.q-home,.q-sched-e,.em-more')].filter(el=>el.getClientRects().length&&getComputedStyle(el).visibility!=='hidden').length===1);};
   const privateHomeCleared=async(checkpoint:string)=>{
    const homeRoots:{visible:boolean;hiddenByAncestor:boolean;privateTextPresent:boolean;privateAttributePresent:boolean;privateSectionCount:number}[]=await page.locator('.c-ehome').evaluateAll((elements:HTMLElement[])=>elements.map(el=>{
     let ancestor:HTMLElement|null=el,hiddenByAncestor=false;
     while(ancestor){if(getComputedStyle(ancestor).display==='none'){hiddenByAncestor=true;break;}ancestor=ancestor.parentElement;}
     const r=el.getBoundingClientRect();
     const privateTextPresent=/Main Office|, Alex/.test(el.textContent??'');
     const privateAttributePresent=[el,...el.querySelectorAll('*')].some(node=>[...node.attributes].some(attribute=>/Main Office/.test(attribute.value)));
     // Corporate Home's private parts: the shift facts and its status pill, Upcoming shifts, Things to do and the read time.
     const privateSectionCount=el.querySelectorAll('#home-shift .c-big,#home-shift .c-ehome__where,#home-shift .c-pill,#home-upcoming,#employee-home-todo,[data-home-updated],a[href*="shift="]').length;
     return {visible:r.width>0&&r.height>0,hiddenByAncestor,privateTextPresent,privateAttributePresent,privateSectionCount};
    }));
    // Save booleans/counts only; a hidden framework-retained root cannot exempt private content.
    await writeFile(evidence+'/'+engine+'-retained-home-roots-'+checkpoint+'.json',JSON.stringify(homeRoots,null,2));
    expect(homeRoots.filter(row=>row.visible)).toHaveLength(1);
    expect(homeRoots.filter(row=>!row.visible).every(row=>row.hiddenByAncestor)).toBe(true);
    expect(homeRoots.every(row=>!row.privateTextPresent&&!row.privateAttributePresent&&row.privateSectionCount===0)).toBe(true);
    expect((await page.locator('.c-ehome').allTextContents()).join('\n')).not.toContain('Main Office');
    expect(await page.getByRole('link',{name:'View shift',exact:true}).count()).toBe(0);
   };

   const clearance=async()=>{await page.waitForFunction(()=>{const shell=document.querySelector<HTMLElement>('[data-employee-mobile]'),nav=document.querySelector('.mobile-nav');return shell&&nav&&Math.abs(Number.parseFloat(shell.style.getPropertyValue('--em-nav-height'))-nav.getBoundingClientRect().height)<=1;});await page.evaluate(()=>window.scrollTo(0,document.documentElement.scrollHeight));const last=await page.locator('#main-content :is(a,button,summary):visible').last().boundingBox(),nav=await page.locator('.mobile-nav').boundingBox();expect(last&&nav&&last.y+last.height<=nav.y+1).toBe(true);await page.evaluate(()=>window.scrollTo(0,0));};
   const ready=async()=>{await page.locator('[data-home-state="ready"]:visible,[data-home-state="partial"]:visible').waitFor();};
   const shot=async(name:string)=>{const file=`${evidence}/${engine}-${name}.png`;await page.screenshot({path:file,fullPage:false,style:'nextjs-portal {visibility:hidden;}'});captures.push(file);};
   // Release 1 corporate Employee pages (boards C-Employee, G-E-Schedule, E-More): Home's shift card, the Schedule week card
   // and its Confirmed pill. Clock-in is tablet-only, so Home has no phone clock panel; recorded time lives on the Time tab.
   const homeShift=()=>page.locator('.c-ehome:visible #home-shift'),viewShift=()=>homeShift().getByRole('link',{name:'View shift',exact:true});
   const confirmedWeek=()=>page.locator('.c-esched:visible [aria-label="Week"] .c-pill').filter({hasText:/^Confirmed$/});
   const forwardKey=engine==='webkit'&&process.platform==='darwin'?'Alt+Tab':'Tab';
   await page.goto(app.url+'/login');await page.getByLabel('Employee ID',{exact:true}).fill(actor);await page.getByLabel('Password',{exact:true}).fill(TEST_PASSWORD);await page.getByRole('button',{name:'Sign in',exact:true}).click();await page.waitForURL(app.url+'/app');await ready();
   await page.getByRole('heading',{name:'Welcome back, Alex',exact:true,level:1}).waitFor();expect(await page.locator('[data-employee-mobile="true"]').count()).toBe(1);
   expect(await page.locator('.mobile-nav a').allTextContents()).toEqual(['Home','Schedule','Time','Requests']);
   expect(await page.getByRole('link',{name:'Add shift',exact:true}).count()).toBe(0);record('Real password/session Home uses the Employee-only tab bar (Home, Schedule, Time, Requests; Pay stays off without payroll)');
   await viewShift().waitFor();expect((await homeShift().innerText()).replace(/\s+/g,' ')).toContain('On shift now');expect(await homeShift().innerText()).toContain('Clock in on the Main Office tablet.');
   expect(await page.locator('.c-ehome:visible').getByRole('button',{name:/clock (in|out)/i}).count()).toBe(0);expect(await page.locator('.c-ehome:visible').innerText()).not.toMatch(/clocked in|on the clock/i);
   record('A planned active shift points to the location tablet and neither claims nor offers a phone clock-in');await shot('home-390-light');
   await page.goto(app.url+'/app/more');await page.getByRole('heading',{name:'More',exact:true}).waitFor();await shot('more-root-header');
   // Boards E-More and E-PastTimecards: pushed pages draw their own ‹ Back bar in place of the brand header and keep the tab bar.
   const pushed=async(back:string,href:string)=>{expect(await page.locator('.mobile-header .brand:visible').count()).toBe(0);expect(await page.locator('main .c-nav:visible').getByRole('link',{name:back,exact:true}).getAttribute('href')).toBe(href);expect(await page.locator('.mobile-nav').isVisible()).toBe(true);};
   await pushed('Home','/app');expect(await page.locator('[data-employee-mobile-chrome="root"]').count()).toBe(1);
   expect(await page.locator('.c-more').getByRole('link',{name:'Add shifts to your calendar',exact:true}).getAttribute('href')).toBe('/app/profile/calendar');
   await page.goto(app.url+'/app/my-time');await page.locator('.c-hours[data-hours-state="ready"]').waitFor();expect((await page.locator('#hours-now').innerText()).replace(/\s+/g,' ')).toContain('Not clocked in');expect(await page.locator('#hours-now .c-pill').innerText()).toBe('Off the clock');
   record('Recorded time is read independently on Time; the planned active shift does not fabricate a clock-in');
   await page.goto(app.url+'/app/my-time?view=cards');await page.getByRole('heading',{name:'Past timecards',exact:true}).waitFor();await pushed('Time','/app/my-time');expect(await page.locator('[data-employee-mobile-chrome="root"]').count()).toBe(1);
   await page.goto(app.url+'/app/my-time?entry=missing-owned-entry');await page.getByRole('heading',{name:'Time entry',exact:true}).waitFor();await pushed('Time','/app/my-time#hours-entry-missing-owned-entry');expect(await page.locator('[data-employee-mobile-chrome="detail"]').count()).toBe(1);
   record('More and Past timecards are root-chrome pushed pages with their own back bar and the tab bar; an exact time entry is a detail page whose back link returns to that entry; More holds the calendar link');await load('/app');await ready();
   await viewShift().click();await page.getByRole('dialog').waitFor();expect(page.url()).toContain('shift=em-own-today');expect(await page.getByRole('dialog').innerText()).toContain('Main Office');await page.getByRole('dialog').getByRole('button',{name:'Done',exact:true}).click();await page.getByRole('dialog').waitFor({state:'hidden'});record('Home opens the exact currently authorized own shift and its details');
   await load('/app/schedule?week='+f.week);await page.getByRole('heading',{name:'Schedule',exact:true,level:1}).waitFor();await q('DELETE FROM schedule_acknowledgements WHERE employee_id=$1 AND week_start=$2',[actor,f.week]);await page.reload();await page.locator('.c-esched:visible [aria-label="Week"]').waitFor();expect(await page.locator('.c-esched:visible').innerText()).not.toContain('Blair');
   await page.getByRole('link',{name:'Next week',exact:true}).click();await page.waitForURL((url:URL)=>url.searchParams.get('week')===addDays(f.week,7));expect(page.url()).toContain(addDays(f.week,7));await page.getByRole('link',{name:'Previous week',exact:true}).click();await page.waitForURL((url:URL)=>url.searchParams.get('week')===f.week);expect(page.url()).toContain(f.week);record('Own published weeks and navigation retain exact server-source context');
   // Board G-E-Schedule replaced the native week picker with the week strip; the calendar link moved to More (checked above).
   const utcLabel=(date:string,options:Intl.DateTimeFormatOptions)=>new Intl.DateTimeFormat('en-US',{timeZone:'UTC',...options}).format(new Date(date+'T12:00:00Z'));
   await page.locator('.c-esched:visible .c-esched__days').getByRole('link',{name:new RegExp('^'+utcLabel(f.sourceDate,{weekday:'long',month:'long',day:'numeric'})+'(,|$)')}).click();await page.waitForURL((url:URL)=>url.searchParams.get('day')===f.sourceDate);expect(page.url()).toContain('week='+f.week);record('The week strip selects an exact own day inside its actual Monday week without manager filters');
   await page.locator('.c-esched:visible .c-esched__days').getByRole('link',{name:/selected day/}).waitFor();expect((await page.locator('#my-agenda-label').innerText()).replace(/\s+/g,' ')).toBe(utcLabel(f.sourceDate,{weekday:'long',month:'short',day:'numeric'}));
   await shot('schedule-390-light');
   const confirm=page.getByRole('button',{name:'Confirm schedule',exact:true});
   const beforeConfirm=await q('SELECT employee_id FROM schedule_acknowledgements WHERE employee_id=$1 AND week_start=$2',[actor,f.week]);
   if(!beforeConfirm.length){await confirm.waitFor();await confirm.click();}
   await confirmedWeek().waitFor();await page.reload();await confirmedWeek().waitFor();expect(await confirm.count()).toBe(0);
   const persisted=await q('SELECT employee_id,week_start::text FROM schedule_acknowledgements WHERE employee_id=$1 AND week_start=$2',[actor,f.week]);expect(persisted.length).toBe(1);record('Schedule confirmation persists canonically for the exact own week; refresh renders its receipt');
   await load('/app');await ready();const response=await page.request.get(app.url+'/api/employee/home?employeeId='+f.actors[1],{headers:{'X-Nevora-Home':authority}});expect(response.status()).toBe(400);expect(JSON.stringify(await response.json())).not.toContain(f.actors[1]);const own=await page.request.get(app.url+'/api/employee/home',{headers:{'X-Nevora-Home':authority}});expect(own.status()).toBe(200);const home=await own.json();expect(home.snapshot.currentShift.shiftId).toBe('em-own-today');expect(JSON.stringify(home)).not.toContain(f.actors[1]);
   const denied=await page.request.get(app.url+'/api/employee/home',{headers:{'X-Nevora-Home':'invalid'}});expect([401,403]).toContain(denied.status());record('Server reads stay bound to current actor; foreign query and invalid proof cannot select another employee');
   // Release 1 is light only (Jose): 'dark' is a stored dark choice plus a dark device preference, and it must still render
   // the light corporate look with passing contrast.
   for(const theme of ['light','dark'])for(const width of [320,390,430]){
    await page.emulateMedia({colorScheme:theme as 'light'|'dark'});await page.evaluate((choice:string)=>{localStorage.setItem('nv-theme',choice);(window as Window&{__nvApplyTheme?:()=>void}).__nvApplyTheme?.();},theme);expect(await page.locator('html').getAttribute('data-theme')).toBe(theme);await page.setViewportSize({width,height:844});
    for(const path of ['/app','/app/schedule?week='+f.week,'/app/more']){
     await load(path);if(path==='/app'){await ready();await viewShift().waitFor();const measured=await viewShift().evaluate(measureRenderedContrast);expect(measured.ratio).toBeGreaterThanOrEqual(4.5);controlContrast.push({engine,theme,width,control:'View shift',ratio:measured.ratio});}
     expect(await page.locator('.mobile-header .brand').isVisible()).toBe(path!=='/app/more');expect(await page.locator('.mobile-header .e5-new').isVisible()).toBe(false);
     expect(await page.locator('[data-employee-mobile]').evaluate((el:HTMLElement)=>getComputedStyle(el).getPropertyValue('--em-canvas').trim().toLowerCase())).toBe('#f5f6f6');expect(await page.locator('.c-ehome:visible,.c-esched:visible,.c-more:visible').evaluate((el:HTMLElement)=>getComputedStyle(el).backgroundColor)).toBe('rgb(245, 246, 246)');expect(await page.locator('.c-ehome:visible,.c-esched:visible,.c-more:visible').evaluate((el:HTMLElement)=>getComputedStyle(el).color)).toBe('rgb(26, 28, 30)');expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true);
     if(path==='/app/more'){expect(await page.locator('.page-frame').evaluate((el:HTMLElement)=>getComputedStyle(el).backgroundColor)).toMatch(/^rgb\(245, 246, 246\)$|^rgba\(0, 0, 0, 0\)$/);expect(await page.locator('.app-main').evaluate((el:HTMLElement)=>getComputedStyle(el).backgroundColor)).toBe('rgb(245, 246, 246)');await page.evaluate(()=>scrollTo(0,document.documentElement.scrollHeight));await shot('more-end-'+theme+'-'+width);await page.evaluate(()=>scrollTo(0,0));}
     if(path==='/app'){
      // Board C-Employee: one white shift card with its 1px ring, the label and a status pill in its header, the time, where,
      // one View shift link to the exact own shift and the tablet note.
      await homeShift().scrollIntoViewIfNeeded();await shot('shift-card-'+theme+'-'+width);
      const surface=await homeShift().evaluate((el:HTMLElement)=>({background:getComputedStyle(el).backgroundColor,ring:getComputedStyle(el).boxShadow,label:el.querySelector('#home-shift-label')?.textContent,pill:el.querySelectorAll('.c-card__aside .c-pill').length,where:el.querySelector('.c-ehome__where')?.textContent,views:[...el.querySelectorAll('a')].map(a=>a.getAttribute('href')),note:el.querySelector('.c-note')?.textContent}));
      expect(surface.background).toBe('rgb(255, 255, 255)');expect(surface.ring).toMatch(/1px/);expect(surface.label).toBe('On shift now');expect(surface.pill).toBe(1);expect(surface.where).toBe('Customer Support · Main Office');expect(surface.views).toHaveLength(1);expect(surface.views[0]).toContain('shift=em-own-today');expect(surface.note).toBe('Clock in on the Main Office tablet.');
     }
     // Seven 44px days need 308px; a 320px phone's week card has 280px, so there the days are checked to take their full
     // equal share (about 40px wide, 44px+ tall, no gaps) and the limit is recorded (reported to Jose; WCAG 2.5.8 is met).
     if(path.startsWith('/app/schedule')&&width<340){const strip=await page.locator('.c-esched:visible .c-esched__days').evaluate((nav:HTMLElement)=>{const style=getComputedStyle(nav),inner=nav.clientWidth-parseFloat(style.paddingLeft)-parseFloat(style.paddingRight),cells=[...nav.querySelectorAll('a')].map(a=>a.getBoundingClientRect());return {inner,widths:cells.map(r=>r.width),heights:cells.map(r=>r.height),gaps:cells.slice(1).map((r,i)=>r.left-cells[i].right)};});stripLimits.push({engine,theme,width,...strip});expect(strip.widths).toHaveLength(7);expect(strip.widths.every((w:number)=>w>=strip.inner/7-.5&&w>=39.5)).toBe(true);expect(strip.heights.every((h:number)=>h>=43.5)).toBe(true);expect(strip.gaps.every((g:number)=>Math.abs(g)<=.5)).toBe(true);}
     const bad=await page.locator('.mobile-nav a,.c-esched:visible .c-esched__arrows a,'+(width<340?'':'.c-esched:visible .c-esched__days a,')+'.c-esched:visible .c-title__actions a,.c-esched:visible .c-esched__confirm :is(a,button),#home-shift a,.c-more:visible :is(a,button)').evaluateAll((els:HTMLElement[])=>els.filter(el=>el.getClientRects().length&&(el.getBoundingClientRect().width<43.5||el.getBoundingClientRect().height<43.5)).map(el=>({text:el.textContent,width:el.getBoundingClientRect().width,height:el.getBoundingClientRect().height})));expect(bad).toEqual([]);
     const contrastTargets=path==='/app'?'.c-ehome:visible #home-shift :is(.c-card__label,.c-pill,.c-big,.c-ehome__where,.c-btn,.c-note):visible':path==='/app/more'?'.c-more:visible .c-nav__title,.c-more:visible .c-card__label,.c-more:visible .c-row__title,.c-more:visible .c-row__detail':'.c-esched:visible .c-title__sub,.c-esched:visible .c-esched__range,.c-esched:visible .c-esched__days a b,.c-esched:visible .c-esched__days a small,.c-esched:visible #my-agenda .c-row__title,.c-esched:visible #my-agenda .c-row__detail > span:first-child';
     const targets=await page.locator(contrastTargets).all();expect(targets.length).toBeGreaterThan(3);for(const el of targets)expect((await el.evaluate(measureRenderedContrast)).ratio).toBeGreaterThanOrEqual(4.5);await clearance();
    }
   }
   await load('/app/schedule?week='+f.week);record('Light, and a dark request still rendered light, at 320/390/430 keep the corporate canvas, accessible navigation, week-control targets and contrast');await shot('schedule-430-dark-request');
   await page.setViewportSize({width:320,height:844});await page.evaluate(()=>{document.documentElement.style.fontSize='200%';window.dispatchEvent(new Event('resize'));});
   await page.waitForFunction(()=>document.documentElement.getAttribute('data-text-step')==='200');expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true);await shot('schedule-320-dark-request-text200');
   const overlaps=await page.locator('.mobile-nav a span').evaluateAll((els:HTMLElement[])=>els.flatMap((el,index)=>{const a=el.getBoundingClientRect();return els.slice(index+1).filter(other=>{const b=other.getBoundingClientRect();return a.left<b.right&&a.right>b.left&&a.top<b.bottom&&a.bottom>b.top;}).map(other=>el.textContent+' / '+other.textContent);}));expect(overlaps).toEqual([]);expect(await page.locator('.mobile-nav a').evaluateAll((els:HTMLElement[])=>els.filter(el=>el.getBoundingClientRect().height<43.5||el.getBoundingClientRect().width<43.5).length)).toBe(0);
   // The week strip replaced the native week picker: native keyboard traversal reaches a day with a visible focus ring and Enter chooses it.
   const strip=page.locator('.c-esched:visible .c-esched__days a');await strip.nth(1).focus();await page.keyboard.press(forwardKey);expect(await strip.nth(2).evaluate((el:HTMLElement)=>el===document.activeElement&&getComputedStyle(el).outlineStyle!=='none'&&parseFloat(getComputedStyle(el).outlineWidth)>=2)).toBe(true);
   await page.keyboard.press('Enter');await page.waitForURL((url:URL)=>url.searchParams.get('day')===addDays(f.week,2));await page.locator('.c-esched:visible .c-esched__days').getByRole('link',{name:/selected day/}).waitFor();expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true);
   await clearance();record('Enlarged text and content clearance; native '+forwardKey+' reaches a week-strip day with a visible focus ring and Enter chooses it');
   await load('/app');await ready();await viewShift().waitFor();
   await page.evaluate(()=>{document.documentElement.style.fontSize='200%';window.dispatchEvent(new Event('resize'));});
   await page.waitForFunction(()=>getComputedStyle(document.documentElement).fontSize==='32px'&&document.documentElement.getAttribute('data-text-step')==='200');
   expect(await page.evaluate(()=>getComputedStyle(document.documentElement).fontSize)).toBe('32px');
   expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true);
   const clippedDayText=(await page.locator('.c-ehome:visible #home-shift > :is(.c-card__head,.c-card__body)').evaluateAll((parts:HTMLElement[])=>parts.map(el=>{
    const box=el.getBoundingClientRect(),style=getComputedStyle(el),left=box.left+parseFloat(style.borderLeftWidth)+parseFloat(style.paddingLeft),right=box.right-parseFloat(style.borderRightWidth)-parseFloat(style.paddingRight),walker=document.createTreeWalker(el,NodeFilter.SHOW_TEXT),overflow:{tag:string;left:number;right:number}[]=[];
    for(let node=walker.nextNode();node;node=walker.nextNode()){
     const parent=node.parentElement;if(!parent||!node.textContent?.trim()||parent.closest('.nv-sr,.q-sr,[aria-hidden="true"]')||!parent.getClientRects().length||getComputedStyle(parent).visibility==='hidden')continue;
     const range=document.createRange();range.selectNodeContents(node);for(const rect of range.getClientRects())if(rect.width&&(rect.left<left-1||rect.right>right+1))overflow.push({tag:parent.tagName,left:rect.left-left,right:rect.right-right});
    }
    return overflow;
   }))).flat();
   expect(clippedDayText).toEqual([]);const timeLink=viewShift();await timeLink.focus();await timeLink.scrollIntoViewIfNeeded();
   expect(await timeLink.evaluate((el:HTMLElement)=>{const rect=el.getBoundingClientRect(),nav=document.querySelector('.mobile-nav')!.getBoundingClientRect();return rect.height>=44&&rect.width>=44&&rect.bottom<=nav.top+1;})).toBe(true);
   await shot('home-320-dark-request-text200');record('Home at 320px with a verified 32px root (200%) keeps every visible shift-card text range inside its content edges and View shift clear of navigation');
   // The corporate kit sets its type in px (the boards' sizes), so a larger root no longer scales the More title; the page
   // still has to reflow without clipping or overflow at the enlarged root.
   await load('/app/more');await page.evaluate(()=>{document.documentElement.style.fontSize='200%';window.dispatchEvent(new Event('resize'));});await page.waitForFunction(()=>getComputedStyle(document.documentElement).fontSize==='32px'&&document.documentElement.dataset.textStep==='200');expect(await page.getByRole('heading',{name:'More',exact:true}).evaluate((el:HTMLElement)=>el.scrollWidth<=el.clientWidth+1&&el.getBoundingClientRect().width>0)).toBe(true);
   expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true);const clippedMore=await page.locator('.c-more .c-row__main').evaluateAll((elements:HTMLElement[])=>elements.flatMap(el=>{const box=el.getBoundingClientRect(),walker=document.createTreeWalker(el,NodeFilter.SHOW_TEXT),failures:string[]=[];for(let node=walker.nextNode();node;node=walker.nextNode()){if(!node.textContent?.trim()||node.parentElement?.closest('.nv-sr,.q-sr,[aria-hidden="true"]'))continue;const range=document.createRange();range.selectNodeContents(node);for(const rect of range.getClientRects())if(rect.left<box.left-1||rect.right>box.right+1)failures.push(node.textContent??'');}return failures;}));expect(clippedMore).toEqual([]);await clearance();await shot('more-320-dark-request-text200');record('More at a verified 200% root keeps its title whole, row labels within their columns and its last control clear of navigation');
   await page.evaluate(()=>document.documentElement.style.fontSize='100%');await page.setViewportSize({width:1440,height:1000});await load('/app');await ready();expect(await page.getByRole('heading',{name:'Welcome back, Alex',exact:true,level:1}).count()).toBe(1);expect(await page.locator('.mobile-nav').isVisible()).toBe(false);expect(await page.locator('nav[aria-label="Primary navigation"]').isVisible()).toBe(true);await viewShift().waitFor();await shot('home-desktop');record('Desktop shows the same corporate Home beside the sidebar; the phone tab bar is hidden');
   await load('/app/schedule?week='+f.week);expect(await page.locator('.mobile-nav').isVisible()).toBe(false);expect(await page.locator('nav[aria-label="Primary navigation"]').isVisible()).toBe(true);expect(await page.locator('.c-esched:visible [aria-label="Week"]').count()).toBe(1);await shot('schedule-desktop');record('Desktop Schedule shows the corporate week card beside the sidebar; the phone tab bar is hidden');
   await page.setViewportSize({width:390,height:844});await load('/app');await ready();expect(await homeShift().innerText()).toContain('Main Office');await viewShift().waitFor();await page.evaluate(()=>window.dispatchEvent(new Event('offline')));await page.locator('[data-home-state="paused"]').waitFor();await privateHomeCleared('offline');record('Background/offline release clears private Home facts');
   await page.evaluate(()=>window.dispatchEvent(new Event('online')));await ready();expect(await homeShift().innerText()).toContain('Main Office');await viewShift().waitFor();

   if(engine==='chromium'){
    await load('/app/schedule?week='+pastWeek+'&day='+addDays(pastWeek,1));expect(await page.locator('.c-esched:visible').innerText()).toMatch(/10:00\sPM/);expect(await page.locator('.c-esched:visible').innerText()).toMatch(/6:00\sAM/);
    await page.locator('.c-esched:visible #my-agenda .c-row').filter({hasText:/10:00\sPM/}).click();await page.getByRole('dialog').waitFor();const expectedEnd=new Intl.DateTimeFormat('en-US',{timeZone:'UTC',weekday:'short',month:'short',day:'numeric'}).format(new Date(addDays(pastWeek,2)+'T12:00:00Z'));expect((await page.getByRole('dialog').innerText()).replace(/\s+/g,' ')).toContain('ends '+expectedEnd);expect(await page.getByRole('dialog').getByRole('link',{name:/^Swap with/}).count()).toBe(0);await shot('schedule-past-overnight');await page.getByRole('dialog').getByRole('button',{name:'Done',exact:true}).click();await page.getByRole('dialog').waitFor({state:'hidden'});record('Own published past overnight shift preserves end-day meaning without future-only swap controls');
    await load('/app/schedule?week='+f.week+'&day='+f.targetDate+'&shift='+f.targetId);expect(await page.getByRole('dialog').count()).toBe(0);expect(await page.locator('.c-esched:visible').innerText()).not.toContain('West Office');record('Foreign shift deep link cannot open another employee assignment');await load('/app');await ready();
    // Transport interruptions exercise the actual controller; no source rows are fabricated.
    let releaseHome!:()=>void;
    const homeGate=new Promise<void>(resolve=>{releaseHome=resolve;});
    await context.route('**/api/employee/home',async(route:{continue():Promise<void>})=>{await homeGate;await route.continue();});
    await page.reload();await page.locator('[data-home-state="loading"]:visible').waitFor();
    expect(await page.locator('.c-ehome:visible').innerText()).not.toContain('Main Office');await shot('home-loading');
    releaseHome();await ready();await context.unroute('**/api/employee/home');record('Loading withholds own shift facts until actual Home read completes');
    for(const theme of ['light','dark']){
     // 'dark' is a dark request; Release 1 renders it light, so the retry must keep its light contrast.
     await page.emulateMedia({colorScheme:theme as 'light'|'dark'});await page.evaluate((choice:string)=>{localStorage.setItem('nv-theme',choice);(window as Window&{__nvApplyTheme?:()=>void}).__nvApplyTheme?.();},theme);
     let failedHome!:()=>void;const failureObserved=new Promise<void>(resolve=>{failedHome=resolve;});expectedTransportFailure=true;
     await context.route('**/api/employee/home',async(route:{abort(reason?:string):Promise<void>})=>{await route.abort('failed');failedHome();});
     await page.reload();await failureObserved;await page.locator('[data-home-state="unavailable"]:visible').waitFor();
     const retry=page.getByRole('button',{name:'Try again to load Home',exact:true});await retry.waitFor();await page.waitForFunction(()=>[...document.querySelectorAll<HTMLButtonElement>('[data-home-refresh]')].some(el=>!el.disabled&&el.getBoundingClientRect().width>0));
     expect(await page.locator('.c-ehome:visible').innerText()).not.toContain('Main Office');const retryContrast=await retry.evaluate(measureRenderedContrast);expect(retryContrast.ratio).toBeGreaterThanOrEqual(4.5);controlContrast.push({engine,theme,width:390,control:'Home retry',ratio:retryContrast.ratio});const target=await retry.boundingBox();expect(target&&target.height>=43.5&&target.width>=43.5).toBe(true);await shot('home-network-error-'+theme);
     await context.unroute('**/api/employee/home');await retry.click();await ready();expect(await homeShift().innerText()).toContain('Main Office');expectedTransportFailure=false;record(theme+' failed Home transport renders a visible contrasted retry and recovers actual data');
    }
    await q("INSERT INTO time_off_requests(id,employee_id,start_date,end_date,status) SELECT 'em-mobile-cap-'||n,$1,'2030-12-01','2030-12-01','PENDING' FROM generate_series(1,101)n",[actor]);
    await page.reload();await page.locator('[data-home-state="partial"]:visible').waitFor();
    expect(await page.locator('.c-ehome:visible').innerText()).toContain('Partly shown — more records are available');expect(await homeShift().innerText()).toContain('Main Office');await shot('home-partial-source-cap');
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
    await context.unroute('**/app/schedule?**');await page.getByRole('button',{name:'Retry confirmation',exact:true}).click();await confirmedWeek().waitFor();
    expect((await q('SELECT employee_id FROM schedule_acknowledgements WHERE employee_id=$1 AND week_start=$2',[actor,f.week])).length).toBe(1);expectedTransportFailure=false;record('Lost committed response preserves original operation and retry recovers one canonical receipt');

    await notificationGate.mutate(async()=>{await q("UPDATE shifts SET end_time='21:00' WHERE id='em-own-split'");await publishScheduleWithRevision({locationId:'loc-1',weekStart:f.week,managerId:'QAOWNER'},app.database.executor);},15000);
    await load('/app/schedule?week='+f.week+'&day='+f.sourceDate);await page.getByRole('button',{name:'Confirm schedule',exact:true}).waitFor();
    expect(await confirmedWeek().count()).toBe(0);await shot('schedule-republished');
    await notificationGate.mutate(async()=>{await q('DELETE FROM shifts WHERE id=$1 OR id=$2',[f.sourceId,'em-own-split']);await publishScheduleWithRevision({locationId:'loc-1',weekStart:f.week,managerId:'QAOWNER'},app.database.executor);},15000);
    await load('/app/schedule?week='+f.week);await page.getByRole('button',{name:'Confirm schedule',exact:true}).waitFor();
    expect(await page.locator('.c-esched:visible').innerText()).toContain('No assignments remain this week');await shot('schedule-empty-removal');
    await page.getByRole('button',{name:'Confirm schedule',exact:true}).click();await confirmedWeek().waitFor();record('Republished changed and removed own assignments invalidate the old confirmation and preserve exact empty-week review');
    await notificationGate.mutate(async()=>{await q("DELETE FROM shifts WHERE id='em-own-today'");await publishScheduleWithRevision({locationId:'loc-1',weekStart:week,managerId:'QAOWNER'},app.database.executor);},15000);
    await load('/app');await ready();await homeShift().getByText('No upcoming shift. New shifts show here once they’re published.',{exact:true}).waitFor();expect(await viewShift().count()).toBe(0);expect(await page.locator('.mobile-nav').getByRole('link',{name:'Time',exact:true}).getAttribute('href')).toBe('/app/my-time');await shot('home-no-upcoming-shift');record('Real no-upcoming-shift Home says so and keeps recorded time one tap away on the Time tab');
    await q("INSERT INTO shifts(id,schedule_id,employee_id,date,start_time,end_time,position_id) VALUES('em-own-today','em-now-0',$1,$2,'00:00','24:00','qa-pos')",[actor,today]);await publishScheduleWithRevision({locationId:'loc-1',weekStart:week,managerId:'QAOWNER'},app.database.executor);
    await q("INSERT INTO shifts(id,schedule_id,employee_id,date,start_time,end_time,position_id,is_designated_lead) VALUES($1,'qa-EMP1-schedule-0',$2,$3,'08:00','16:00','qa-pos',true),('em-own-split','qa-EMP1-schedule-0',$2,$3,'17:00','20:00','qa-pos',false)",[f.sourceId,actor,f.sourceDate]);await publishScheduleWithRevision({locationId:'loc-1',weekStart:f.week,managerId:'QAOWNER'},app.database.executor);

    await page.setViewportSize({width:320,height:844});await page.goto(app.url+'/app/profile#employee-calendar-title');await page.waitForURL(app.url+'/app/profile/calendar');await page.locator('.em-calendar[data-calendar-state]:visible').waitFor();
    for(const scale of [125,150,200]){
     await page.evaluate((n:number)=>{document.documentElement.style.fontSize=n+'%';window.dispatchEvent(new Event('resize'));},scale);
     await page.waitForFunction((n:number)=>document.documentElement.getAttribute('data-text-step')===String(n),scale);
     expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true);
     const collisions=await page.locator('.mobile-nav a span').evaluateAll((els:HTMLElement[])=>els.flatMap((el,index)=>{const a=el.getBoundingClientRect();return els.slice(index+1).filter(other=>{const b=other.getBoundingClientRect();return a.left<b.right&&a.right>b.left&&a.top<b.bottom&&a.bottom>b.top;}).map(other=>el.textContent+' / '+other.textContent);}));expect(collisions).toEqual([]);
    }
    await shot('calendar-320-text200');await page.evaluate(()=>{document.documentElement.style.fontSize='100%';window.dispatchEvent(new Event('resize'));});record('The older calendar link opens the Add to calendar page; 125/150/200 percent text keeps it readable with navigation');
    await load('/app');await ready();expect(await homeShift().innerText()).toContain('Main Office');
    authorityLoss=true;await q("UPDATE workspaces SET active=false WHERE id='workspace-fuel'");await page.evaluate(()=>window.dispatchEvent(new Event('storage')));await page.locator('[data-home-state="unauthorized"]:visible,[data-home-state="unavailable"]:visible').waitFor();await privateHomeCleared('workspace-inactive');await Promise.all(responseChecks);
    await q("UPDATE workspaces SET active=true WHERE id='workspace-fuel'");await load('/app');await ready();authorityLoss=false;record('Current workspace deactivation clears own facts and restoration requires a fresh authorized read');
   }
   authorityLoss=true;await q('DELETE FROM employee_sessions WHERE employee_id=$1',[actor]);await page.evaluate(()=>window.dispatchEvent(new Event('storage')));await page.locator('[data-home-state="unauthorized"],[data-home-state="unavailable"]').waitFor();await privateHomeCleared('session-revoked');
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
  for(const engine of ['chromium','webkit','firefox']){let mutation=false;for(const event of fixtureEvents.filter(row=>row.engine===engine)){if(event.event==='mutation-start'){expect(event.active).toBe(0);mutation=true;}if(event.event==='read-start')expect(mutation).toBe(false);if(event.event==='mutation-end')mutation=false;}}
  await Promise.all(responseChecks);for(const entry of consoleMessages.filter(entry=>entry.type==='error')){const hydration=/hydration|didn.t match|server.rendered|Invalid/.test(entry.text);const transport=entry.expectedTransportFailure&&/Failed to load resource.*(?:ERR_FAILED|Load failed)|Failed to fetch|NetworkError|Load failed/.test(entry.text);const match=entry.text.match(/status of (401|403|503)/);const denied=entry.authorityLoss&&match&&refusals.some(r=>r.engine===entry.engine&&r.status===Number(match[1])&&!r.privateDataPresent&&['unauthorized','unavailable'].includes(r.state));const notificationDenied=expectedNotificationRefusal(entry,app.url,notificationRefusals);if(hydration||(!transport&&!denied&&!notificationDenied))errors.push(entry.engine+': console '+entry.text);}expect(errors).toEqual([]);
 }catch(error){await failureScreenshot?.().catch(()=>{});throw error;}
 finally{await browser?.close();await app.close();await writeFile(evidence+'/results.json',JSON.stringify({checks,errors,captures,consoleMessages,refusals,notificationRefusals,fixtureEvents,controlContrast,stripLimits,ownedApp:app.root},null,2));}
});
