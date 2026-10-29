import {it,expect} from 'vitest';
import {createRequire} from 'node:module';
import {mkdir,writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {createOwnedNextApp} from './owned-next-app';
import {seedOwnedApp,seedOwnedScenario,assignOwnedManagerCompanyAccess,TEST_PASSWORD} from './owned-app-fixture';
import {publishScheduleWithRevision} from './management-api';
import {businessDate} from '../../lib/business-time';
import {weekStartFor} from '../../lib/date-utils';

it('keeps real Owner coverage first with matching selection, keyboard return and preserved Manager order',async()=>{
 const evidence=process.env.NEVORA_OWNER_INBOX_EVIDENCE;if(!evidence)throw Error('Select explicit external Owner Inbox evidence');await mkdir(evidence,{recursive:true});
 const runtime=createRequire(process.env.NEVORA_PLAYWRIGHT_RUNTIME_PACKAGE??resolve('tools/ci-browser-runtime/package.json'))('playwright');
 const app=await createOwnedNextApp(evidence),checks:unknown[]=[],captures:string[]=[],errors:string[]=[],messages:unknown[]=[];
 const q=(text:string,values:unknown[]=[])=>app.database.executor.query({text,values});let browser:{close():Promise<void>}|undefined,shotFailure:(()=>Promise<void>)|undefined;
 try{
  await seedOwnedApp(app.database.executor);const f=await seedOwnedScenario(app.database.executor,'OWNERINBOX',0),manager=f.actors[0];
  await q("UPDATE employees SET role='MANAGER' WHERE id=$1",[manager]);await assignOwnedManagerCompanyAccess(app.database.executor,manager);
  const today=businessDate(new Date(),'America/Puerto_Rico'),week=weekStartFor(today);
  for(const [index,locationId]of ['loc-1','loc-2'].entries()){
   const id='owner-inbox-'+index;await q("INSERT INTO schedules(id,location_id,week_start,status,created_by) VALUES($1,$2,$3,'DRAFT','QAOWNER')",[id,locationId,week]);
   if(!index)await q("INSERT INTO shifts(id,schedule_id,employee_id,date,start_time,end_time,position_id) VALUES('owner-inbox-missed',$1,$2,$3,'00:00','24:00','qa-pos')",[id,f.actors[1],today]);
   await publishScheduleWithRevision({locationId,weekStart:week,managerId:'QAOWNER'},app.database.executor);
  }
  for(const engine of ['chromium','webkit','firefox']){
   const active=await runtime[engine].launch({headless:true});browser=active;
   for(const actor of ['QAOWNER',manager]){
    const context=await active.newContext({viewport:{width:1440,height:1000},reducedMotion:'reduce',serviceWorkers:'block'}),page=await context.newPage();page.setDefaultTimeout(15000);
    page.on('pageerror',(e:Error)=>errors.push(engine+': '+e.message));page.on('console',(m:{type():string;text():string})=>{if(['error','warning'].includes(m.type()))messages.push({engine,actor,type:m.type(),text:m.text()});});
    await context.route('**/*',async(route:{request():{url():string};abort():Promise<void>;continue():Promise<void>})=>{const url=new URL(route.request().url());if(['http:','https:'].includes(url.protocol)&&url.origin!==app.url){errors.push('External origin '+url.origin);await route.abort();}else await route.continue();});
    shotFailure=async()=>{await page.screenshot({path:evidence+'/'+engine+'-'+actor+'-failure.png',fullPage:false});};
    await page.goto(app.url+'/login');await page.getByLabel('Employee ID',{exact:true}).fill(actor);await page.getByLabel('Password',{exact:true}).fill(TEST_PASSWORD);await page.getByRole('button',{name:'Sign in',exact:true}).click();await page.waitForURL(app.url+'/app');
    await page.goto(app.url+'/app/inbox');await page.locator('[data-inbox-state="ready"]').waitFor();await page.locator('#missed-punches').waitFor();await page.locator('#inbox-urgent').waitFor();
    const ordered=await page.locator('.inbox-list-column section[id^="inbox-"]').evaluateAll((els:HTMLElement[])=>els.map(el=>el.id));expect(ordered.slice(0,2)).toEqual(actor==='QAOWNER'?['inbox-urgent','inbox-missed']:['inbox-missed','inbox-urgent']);
    const pane=page.locator('.inbox-side-column .inbox-detail');expect(await pane.innerText()).toContain(actor==='QAOWNER'?'This shift still needs people':'QA OWNERINBOX B');checks.push({engine,actor,name:'Actual SQL/session ordering and default detail agree'});
    if(actor==='QAOWNER'){
     const cover=page.locator('#inbox-urgent .inbox-row a').first();await cover.focus();await page.keyboard.press('Enter');await page.locator('#inbox-detail-title').waitFor();expect(await page.locator('#inbox-detail-title').evaluate((el:HTMLElement)=>el===document.activeElement)).toBe(true);await page.keyboard.press('Escape');expect(await cover.evaluate((el:HTMLElement)=>el===document.activeElement)).toBe(true);checks.push({engine,actor,name:'Coverage selection and keyboard Escape return to exact actionable opener'});
     for(const theme of ['light','dark'])for(const width of [320,390,768,844,1024,1280,1440])for(const scale of [100,200]){
      await page.setViewportSize({width,height:width===844?390:1000});await page.evaluate(({theme,scale}:{theme:string;scale:number})=>{document.documentElement.dataset.theme=theme;document.documentElement.style.fontSize=scale+'%';},{theme,scale});
      expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+2),engine+' '+theme+' '+width+' '+scale).toBe(true);
      const filename=evidence+'/'+engine+'-'+theme+'-'+width+'-'+scale+'.png';await page.screenshot({path:filename,fullPage:false});captures.push(filename);
     }
     checks.push({engine,actor,name:'Viewport reflow across 7 widths, both themes,100/200 text; viewport captures only'});
    }
    await context.close();
   }
   await active.close();browser=undefined;
  }
  expect(errors).toEqual([]);
 }catch(error){await shotFailure?.().catch(()=>{});throw error;}finally{await browser?.close();await app.close();await writeFile(evidence+'/results.json',JSON.stringify({checks,captures,errors,messages,scope:'Owned real Owner Inbox ordering and shared Manager compatibility, no policy/decision/provider mutation'},null,2));}
},600000);
