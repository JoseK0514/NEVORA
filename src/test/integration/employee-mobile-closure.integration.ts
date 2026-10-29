import {it,expect} from 'vitest';
import {createRequire} from 'node:module';
import {mkdir,writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {randomUUID} from 'node:crypto';
import {createOwnedNextApp} from './owned-next-app';
import {seedOwnedApp,seedOwnedScenario,TEST_PASSWORD} from './owned-app-fixture';
import {seedEmployeeHours} from './employee-hours-fixture';
import {fixtureProof,reviewedFixtureSource} from './shift-change-api';
import {executeShiftChange} from '../../lib/data/shift-changes';
import type {ShiftChangeCommand} from '../../lib/shift-changes/types';
import {publishScheduleWithRevision} from './management-api';
import {addDays,weekStartFor} from '../../lib/date-utils';
import {businessDate} from '../../lib/business-time';
import {measureRenderedContrast} from '../../../scripts/browser-contrast.mjs';

it('keeps authorized Employee tasks usable in actual coarse landscape, both themes and enlarged text',async()=>{
 const evidence=process.env.NEVORA_EMPLOYEE_CLOSURE_EVIDENCE;if(!evidence)throw Error('Choose external Employee closure evidence');await mkdir(evidence,{recursive:true});
 const runtime=createRequire(process.env.NEVORA_PLAYWRIGHT_RUNTIME_PACKAGE??resolve('tools/ci-browser-runtime/package.json'))('playwright');
 const app=await createOwnedNextApp(evidence,{payrollEnabled:true,passkeysEnabled:true,deviceAlertsEnabled:true});
 const q=<T=Record<string,unknown>>(text:string,values:unknown[]=[])=>app.database.executor.query<T>({text,values});
 const results:unknown[]=[],failures:unknown[]=[];let browser:{close():Promise<void>}|undefined;
 try{
  await seedOwnedApp(app.database.executor);
  for(const [index,engine]of ['chromium','webkit','firefox'].entries()){
   const f=await seedOwnedScenario(app.database.executor,'CLOSURE'+index,index),[actor,peer]=f.actors;
   await q("UPDATE employees SET role='EMPLOYEE' WHERE id=ANY($1::text[])",[f.actors]);
   await q('UPDATE shifts SET is_designated_lead=false WHERE id=ANY($1::text[])',[[f.sourceId,f.targetId]]);
   const creation='closure-create-'+index,cover='closure-cover-'+index,report='closure-report-'+index;
   for(const [id,day]of [[creation,0],[cover,4],[report,5]] as const)await q("INSERT INTO shifts(id,schedule_id,employee_id,date,start_time,end_time,position_id) VALUES($1,$2,$3,$4,'08:00','12:00','qa-pos')",[id,'qa-CLOSURE'+index+'-schedule-0',actor,addDays(f.week,day)]);
   for(const locationId of ['loc-1','loc-2'])await publishScheduleWithRevision({locationId,weekStart:f.week,managerId:'QAOWNER'},app.database.executor);
   const command=async(who:string,value:Omit<ShiftChangeCommand,'operationId'>)=>executeShiftChange(await fixtureProof(app.database.executor,who),{...value,operationId:randomUUID()} as ShiftChangeCommand,app.database.executor);
   const offered=await reviewedFixtureSource(app.database.executor,f.targetId),target=await reviewedFixtureSource(app.database.executor,f.sourceId);
   const incoming=await command(peer,{kind:'PROPOSE_SWAP',...offered,targetShiftId:target.sourceShiftId,targetEpisodeId:target.sourceEpisodeId,targetTermsFingerprint:target.sourceTermsFingerprint} as Omit<ShiftChangeCommand,'operationId'>);
   const own=await command(actor,{kind:'OFFER_COVERAGE',...await reviewedFixtureSource(app.database.executor,cover)});
   expect(incoming.status).toBe('pending');expect(own.status).toBe('pending');if(incoming.status!=='pending'||own.status!=='pending')throw Error('Real request fixture failed');
   const records=await seedEmployeeHours(app.database.executor,actor,'CLOSURE'+index);
   const today=businessDate(new Date(),'America/Puerto_Rico'),week=weekStartFor(today);
   let schedules=await q<{id:string}>('SELECT id FROM schedules WHERE location_id=$1 AND week_start=$2',['loc-1',week]);
   if(!schedules.length){const id='closure-today-'+index;await q("INSERT INTO schedules(id,location_id,week_start,status,created_by) VALUES($1,'loc-1',$2,'DRAFT','QAOWNER')",[id,week]);schedules=[{id}];}
   await q("INSERT INTO shifts(id,schedule_id,employee_id,date,start_time,end_time,position_id) VALUES($1,$2,$3,$4,'08:00','16:00','qa-pos')",['closure-live-'+index,schedules[0].id,actor,today]);
   await publishScheduleWithRevision({locationId:'loc-1',weekStart:week,managerId:'QAOWNER'},app.database.executor);
   const active=await runtime[engine].launch({headless:true});browser=active;
   const context=await active.newContext({viewport:{width:667,height:375},hasTouch:true,...(engine==='firefox'?{}:{isMobile:true}),reducedMotion:'reduce',serviceWorkers:'block'}),page=await context.newPage();
   page.setDefaultTimeout(15000);page.setDefaultNavigationTimeout(30000);
   await context.route('**/*',async(route:any)=>{const u=new URL(route.request().url());if(['http:','https:'].includes(u.protocol)&&u.origin!==new URL(app.url).origin)await route.abort();else await route.continue();});
   page.on('pageerror',(error:Error)=>failures.push({engine,path:page.url(),error:error.message,stack:error.stack}));
   await page.goto(app.url+'/login');await page.getByLabel('Employee ID',{exact:true}).fill(actor);await page.getByLabel('Password',{exact:true}).fill(TEST_PASSWORD);await page.getByRole('button',{name:'Sign in',exact:true}).click();await page.waitForURL(app.url+'/app');
   const cases:[string,string,string][]=[
    ['home','/app','[data-home-state="ready"],[data-home-state="partial"]'],
    ['schedule','/app/schedule?week='+f.week,'.q-sched-e'],
    ['requests','/app/requests/hub','.em-requests[data-requests-state="ready"]'],
    ['incoming-response','/app/exchange?tab=foryou&requestId='+incoming.requestId,'.em-exchange[data-exchange-state="ready"]'],
    ['own-request','/app/exchange?tab=requests&requestId='+own.requestId,'.em-exchange[data-exchange-state="ready"]'],
    ['swap-create','/app/exchange/swap?sourceShiftId='+creation,'.em-creation[data-creation-state="ready"]'],
    ['cover-create','/app/exchange/swap?sourceShiftId='+creation+'&mode=cover','.em-creation[data-creation-state="ready"]'],
    ['unable-to-work','/app/exchange/callout?shiftId='+report,'.em-creation[data-creation-state="ready"]'],
    ['time-off-form','/app/requests?tab=new','.em-planning[data-planning-state="ready"]'],
    ['availability','/app/availability','.em-planning[data-planning-state="ready"]'],
    ['hours','/app/my-time','.em-hours[data-hours-state="ready"]'],
    ['timecards','/app/my-time?view=cards','.em-hours[data-hours-state="ready"]'],
    ['correction-form','/app/my-time?view=corrections&edit='+encodeURIComponent('entry:'+records.entryId),'.em-hours[data-hours-state="ready"]'],
    ['missing-time','/app/my-time?view=corrections&edit=new','.em-hours[data-hours-state="ready"]'],
    ['pay','/app/my-pay','.em-pay'],
    ['notifications','/app/notifications','.em-messages[data-messages-state="ready"]'],
    ['updates-compose','/app/updates/compose','.em-messages[data-messages-state="ready"]'],
    ['more','/app/more','.em-more'],
    ['profile','/app/profile','.em-profile-private[data-profile-state="ready"]'],
    ['calendar','/app/profile#employee-calendar-title','.em-calendar'],
    ['passkeys','/app/profile#passkeys-title','.em-passkeys'],
    ['alerts','/app/profile/device-alerts','.em-device'],
    ['deletion','/app/account/delete','.em-delete'],
    ['support','/app/profile/support','main h1'],
    ['privacy','/app/profile/privacy','main h1'],
    ['terms','/app/profile/terms','main h1'],
   ];
   for(const [name,path,ready]of cases){
    // Login already navigated to Home. Let that actual document become ready;
    // an immediate duplicate goto used to tear down its still-hydrating owner.
    try{if(page.url()!==app.url+path)await page.goto(app.url+path);await page.locator(ready+':visible').first().waitFor();}catch(error){failures.push({engine,name,path,stage:'ready',error:String(error)});continue;}
    for(const size of [{width:667,height:375},{width:844,height:390},{width:932,height:430}])for(const theme of ['light','dark'])for(const scale of [100,200]){
     let clearance:unknown;try{
     await page.setViewportSize(size);await page.evaluate(({theme,scale}:any)=>{localStorage.setItem('nv-theme',theme);document.documentElement.dataset.theme=theme;document.documentElement.style.fontSize=scale+'%';document.documentElement.dataset.textStep=String(scale);}, {theme,scale});
     await page.waitForFunction(()=>matchMedia('(pointer: coarse)').matches&&document.querySelector('#employee-mobile')?.getAttribute('data-employee-mobile-active')==='true');
     await page.evaluate(()=>new Promise<void>(ready=>requestAnimationFrame(()=>requestAnimationFrame(()=>ready()))));
     const metrics=await page.evaluate(()=>({coarse:matchMedia('(pointer:coarse)').matches,overflow:Math.max(0,document.documentElement.scrollWidth-innerWidth),teal:getComputedStyle(document.querySelector('#employee-mobile')!).getPropertyValue('--em-teal').trim()}));
     expect(metrics.overflow,name+engine+JSON.stringify(size)+theme+scale).toBeLessThanOrEqual(1);expect(metrics.teal).toBe(theme==='dark'?'#a9e2da':'#0b6e69');
     const actions=page.locator('main :is(button,a,input,select,textarea,summary):visible');
     const small=await actions.evaluateAll((elements:HTMLElement[])=>elements.flatMap(el=>{
      if(el.closest('nextjs-portal')||(el.matches('a')&&getComputedStyle(el).display==='inline'&&el.closest('p,li')))return [];
      const target=el.matches('input[type="checkbox"],input[type="radio"]')?el.closest('label')??el:el;
      const r=target.getBoundingClientRect();return r.height<43.5||r.width<43.5?[{text:el.textContent?.slice(0,60),tag:el.tagName,height:r.height,width:r.width}]:[];
     }));expect(small,name+engine+theme+scale).toEqual([]);
     const samples: number[]=[];
     for(const label of (await page.locator('main :is(h1,h2,label,.em-request-primary,.em-request-secondary,.em-creation-help,.em-planning-help,.em-hours-help):visible').all()).slice(0,6)){
      if(!await label.isEnabled()||!(await label.innerText()).trim())continue;
      const ratio=(await label.evaluate(measureRenderedContrast)).ratio;samples.push(ratio);expect(ratio,name+' contrast '+engine+theme+scale).toBeGreaterThanOrEqual(4.5);
     }
     if(await actions.count()){
      // Test actual reachability: native centering includes the fixed bar, so
      // finish the same extra scroll a person can make. Choose the visual end,
      // since Home deliberately orders its week strip differently in the DOM.
      const index=await actions.evaluateAll((elements:HTMLElement[])=>elements.reduce((best,el,i)=>el.getBoundingClientRect().bottom>elements[best].getBoundingClientRect().bottom?i:best,0));
      const last=actions.nth(index);await last.scrollIntoViewIfNeeded();
      await last.evaluate((el:HTMLElement)=>{const nav=document.querySelector('.mobile-nav');if(nav)window.scrollBy(0,Math.max(0,el.getBoundingClientRect().bottom-nav.getBoundingClientRect().top+16));});
      clearance=await last.evaluate((el:HTMLElement)=>{const bar=document.querySelector('.mobile-nav'),shell=document.querySelector('#employee-mobile')!;return {text:el.textContent?.slice(0,80),targetBottom:el.getBoundingClientRect().bottom,navTop:bar?.getBoundingClientRect().top,navHeight:bar?.getBoundingClientRect().height,padding:getComputedStyle(shell).paddingBottom,reserved:getComputedStyle(shell).getPropertyValue('--em-nav-height'),scrollY,scrollHeight:document.documentElement.scrollHeight,innerHeight,clear:!bar||el.getBoundingClientRect().bottom<=bar.getBoundingClientRect().top+1};});expect((clearance as {clear:boolean}).clear,name+' last action '+engine+scale).toBe(true);
     }
     results.push({engine,name,path,size,theme,scale,contrastSamples:samples,...metrics});
     if(size.width===844&&scale===200)await page.screenshot({path:evidence+'/'+engine+'-'+name+'-'+theme+'-text200.png',fullPage:false,style:'nextjs-portal{visibility:hidden;}'});
     }catch(error){failures.push({engine,name,path,size,theme,scale,error:String(error),clearance});if(size.width===844&&scale===200)await page.screenshot({path:evidence+'/'+engine+'-'+name+'-'+theme+'-failure.png',fullPage:false});}
    }
    console.log('Landscape checked '+engine+' '+name);
    await page.evaluate(()=>{document.documentElement.style.fontSize='100%';document.documentElement.dataset.textStep='100';});
   }
   await context.close();await active.close();browser=undefined;
  }
  expect(failures).toEqual([]);
 }finally{await writeFile(evidence+'/results.json',JSON.stringify({results,failures},null,2));await browser?.close();await app.close();}
},600000);
