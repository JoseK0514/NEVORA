import {afterAll,beforeAll,expect,it} from 'vitest';
import {createRequire} from 'node:module';
import {mkdir,writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {randomUUID} from 'node:crypto';
import {createOwnedNextApp} from './owned-next-app';
import {seedOwnedApp,seedOwnedScenario,TEST_PASSWORD} from './owned-app-fixture';
import {fixtureProof} from './shift-change-api';
import {publishScheduleWithRevision} from './management-api';
import {previewCommunicationAudience,executeCommunicationCommand} from '../../lib/communications/service.server';
import {businessDate} from '../../lib/business-time';
import {weekStartFor} from '../../lib/date-utils';
import {saveWorkspacePresentation} from '../../lib/workspace-presentation/service';

const engines=['chromium','webkit','firefox'] as const;
const evidence=process.env.NEVORA_EMPLOYEE_MESSAGES_REVIEW_EVIDENCE;
let app:Awaited<ReturnType<typeof createOwnedNextApp>>;
let runtime:any;
let owner:Awaited<ReturnType<typeof fixtureProof>>;
const actors:string[]=[],checks:unknown[]=[],messages:{engine:string;scenario:string;type:string;text:string;expected:boolean}[]=[],captures:string[]=[];
const q=<T=Record<string,unknown>>(text:string,values:unknown[]=[])=>app.database.executor.query<T>({text,values});
beforeAll(async()=>{
 if(!evidence)throw Error('Choose external NEVORA_EMPLOYEE_MESSAGES_REVIEW_EVIDENCE');
 await mkdir(evidence,{recursive:true});
 runtime=createRequire(process.env.NEVORA_PLAYWRIGHT_RUNTIME_PACKAGE??resolve('tools/ci-browser-runtime/package.json'))('playwright');
 app=await createOwnedNextApp(evidence);
 await seedOwnedApp(app.database.executor);owner=await fixtureProof(app.database.executor,'QAOWNER');
 const today=businessDate(new Date(),'America/Puerto_Rico'),week=weekStartFor(today);
 await q("INSERT INTO schedules(id,location_id,week_start,status,created_by) VALUES('message-review-today','loc-1',$1,'DRAFT','QAOWNER')",[week]);
 for(const [index] of engines.entries()){
  const fixture=await seedOwnedScenario(app.database.executor,'MESSAGEREVIEW'+index,index),actor=fixture.actors[0];actors.push(actor);
  if(index===1)await q("UPDATE employees SET role='LEAD' WHERE id=$1",[actor]);
  await q("INSERT INTO shifts(id,schedule_id,employee_id,date,start_time,end_time,position_id,is_designated_lead) VALUES($1,'message-review-today',$2,$3,'08:00','16:00','qa-pos',true)",['message-review-shift-'+index,actor,today]);
 }
 await publishScheduleWithRevision({locationId:'loc-1',weekStart:week,managerId:'QAOWNER'},app.database.executor);
 for(let i=0;i<3;i++){
  const draft={type:'LOCATION_ANNOUNCEMENT' as const,scope:{kind:'LOCATION' as const,locationId:'loc-1'},title:'Review update '+i,body:'Fictional current reading facts.',acknowledgement:'OPTIONAL' as const,expiresAt:null};
  const audience=await previewCommunicationAudience(owner,draft,app.database.executor);if(audience.state!=='ready')throw Error('Owned review audience unavailable');
  expect((await executeCommunicationCommand(owner,{kind:'PUBLISH',operationId:randomUUID(),authority:audience.authority,draft,audienceFingerprint:audience.fingerprint},app.database.executor)).status).toBe('committed');
 }
});
afterAll(async()=>{try{await app?.close();}finally{if(evidence)await writeFile(evidence+'/results.json',JSON.stringify({checks,messages,captures},null,2));}});

async function withPage(engine:typeof engines[number],scenario:string,run:(page:any,ready:(view:string)=>Promise<void>,shot:(name:string)=>Promise<void>,fault:(value:boolean)=>void)=>Promise<void>){
 const browser=await runtime[engine].launch({headless:true}),context=await browser.newContext({viewport:{width:390,height:844},reducedMotion:'reduce',serviceWorkers:'block'}),page=await context.newPage();
 page.setDefaultTimeout(15000);page.setDefaultNavigationTimeout(30000);let expected=false;
 page.on('pageerror',(error:Error)=>messages.push({engine,scenario,type:'pageerror',text:error.stack??error.message,expected:false}));
 page.on('console',(message:{type():string;text():string})=>{if(['error','warning'].includes(message.type()))messages.push({engine,scenario,type:message.type(),text:message.text(),expected});});
 await context.route('**/*',async(route:any)=>{const url=new URL(route.request().url());if(['http:','https:'].includes(url.protocol)&&url.origin!==new URL(app.url).origin){await route.abort();throw Error('External request blocked: '+url.origin);}await route.continue();});
 const ready=async(view:string)=>{await page.locator('.em-messages:visible[data-messages-state="ready"][data-messages-view="'+view+'"]').waitFor();await page.locator('.em-messages:visible .em-request-footer button:not(:disabled)').waitFor();};
 const shot=async(name:string)=>{const file=engine+'-'+scenario+'-'+name+'.png';await page.screenshot({path:evidence+'/'+file,fullPage:true,caret:'initial',style:'nextjs-portal {visibility:hidden;}'});captures.push(file);};
 try{
  await page.goto(app.url+'/login');await page.getByLabel('Employee ID',{exact:true}).fill(actors[engines.indexOf(engine)]);await page.getByLabel('Password',{exact:true}).fill(TEST_PASSWORD);await page.getByRole('button',{name:'Sign in',exact:true}).click();await page.waitForURL(app.url+'/app');await page.locator('[data-home-state="ready"]:visible,[data-home-state="partial"]:visible').waitFor();await page.locator('.employee-time-badge:visible').waitFor();
  await run(page,ready,shot,value=>{expected=value;});
  expect(messages.filter(row=>row.engine===engine&&row.scenario===scenario&&(row.type==='pageerror'||row.type==='error'&&!(row.expected&&/Failed to (fetch|load resource)|Load failed|NetworkError|status of (401|403)/.test(row.text))))).toEqual([]);
 }catch(error){await shot('failure').catch(()=>{});throw error;}finally{await context.close();await browser.close();}
}

it('CR-2 bounds held notification opens and fences stale results across private refresh and pause',async()=>{
 for(const engine of engines)await withPage(engine,'open-recovery',async(page,ready,shot,fault)=>{
  await page.goto(app.url+'/app/notifications');await ready('notifications');const panel=()=>page.locator('.em-messages:visible');
  for(const mode of ['deadline','pause','refresh'] as const){
   let release:()=>void=()=>{},handled:()=>void=()=>{},first=true;
   const gate=new Promise<void>(resolve=>{release=resolve;}),done=new Promise<void>(resolve=>{handled=resolve;});
   await page.route('**/api/employee/messages/open/*',async(route:any)=>{if(!first){await route.continue();return;}first=false;try{const response=await route.fetch();await gate;await route.fulfill({response});}finally{handled();}});
   fault(true);
   try{
    await panel().locator('.em-message-list a').first().click();await panel().getByText('Opening current details…',{exact:true}).waitFor();
    if(mode==='deadline'){
     await panel().getByText('This notice couldn’t be opened with your current access.',{exact:false}).waitFor();
     expect(await panel().getByText('Opening current details…',{exact:true}).count()).toBe(0);
     release();await done;expect(new URL(page.url()).pathname).toBe('/app/notifications');await shot('deadline');
    }else{
     if(mode==='pause'){await page.evaluate(()=>window.dispatchEvent(new Event('blur')));await page.locator('.em-messages[data-messages-state="paused"]').waitFor();await page.evaluate(()=>window.dispatchEvent(new Event('focus')));}
     else await panel().getByRole('button',{name:'Refresh',exact:true}).click();
     await ready('notifications');expect(await panel().getByText('Opening current details…',{exact:true}).count()).toBe(0);
     await panel().locator('.em-message-list a').nth(1).click();await ready('detail');const target=page.url();
     release();await done;expect(page.url()).toBe(target);await shot(mode+'-new-open');
     await panel().getByRole('link',{name:'Notifications',exact:true}).click();await ready('notifications');
    }
    checks.push({engine,name:'CR-2 '+mode+' cancels opening and fences late navigation'});
   }finally{release();await done;await page.unroute('**/api/employee/messages/open/*');fault(false);}
  }
 });
});

it('UI-COM-001 associates actual invalid fields and restores deliberate review after corrections',async()=>{
 for(const engine of engines)await withPage(engine,'form-and-original',async(page,ready,shot,fault)=>{
  const panel=()=>page.locator('.em-messages:visible');await page.goto(app.url+'/app/updates');await ready('updates');
  await panel().getByRole('link',{name:'Write an update',exact:true}).click();await ready('compose');
  await page.getByLabel('Today’s team location',{exact:true}).selectOption('loc-1');await page.getByLabel('Title',{exact:true}).fill('Valid original '+engine);await page.getByLabel('Message',{exact:true}).fill('Fictional body.');
  const invalid=async(label:string,value:string,name:string)=>{
   const field=page.getByLabel(label,{exact:true});await field.fill(value);await panel().getByRole('button',{name:'Review audience',exact:true}).click();
   expect(await field.getAttribute('aria-invalid')).toBe('true');
   expect(await field.evaluate((el:HTMLElement)=>el===document.activeElement)).toBe(true);
   expect(await field.evaluate((el:HTMLElement)=>(el.getAttribute('aria-describedby')??'').split(/\s+/).some(id=>{const error=document.getElementById(id);return error?.getAttribute('role')==='alert'&&!!error.textContent?.trim();}))).toBe(true);
   expect(await panel().getByRole('button',{name:'Send update',exact:true}).count()).toBe(0);await shot('invalid-'+name);
  };
  await invalid('Title','x'.repeat(121),'title-long');await invalid('Title','   ','title-empty');await page.getByLabel('Title',{exact:true}).fill('Valid original '+engine);
  await invalid('Message','x'.repeat(2001),'body-long');await invalid('Message','Invalid\u202ebody','body-control');await page.getByLabel('Message',{exact:true}).fill('Fictional body.');
  await invalid('Expiry · optional','2000-01-01T12:00','expiry');await page.getByLabel('Expiry · optional',{exact:true}).fill('');
  await panel().getByRole('button',{name:'Review audience',exact:true}).click();await panel().getByRole('button',{name:'Send update',exact:true}).waitFor();checks.push({engine,name:'UI-COM-001 real custom field errors have associations/focus and corrected input reviews successfully'});
 });
});

it('CR-3/CR-1 preserve optional read facts and recover a refused original lookup',async()=>{
 for(const engine of engines)await withPage(engine,'optional-and-original',async(page,ready,shot,fault)=>{
  const panel=()=>page.locator('.em-messages:visible');await page.goto(app.url+'/app/updates');await ready('updates');
  await panel().locator('.em-message-list a').first().click();await ready('detail');const optionalId=new URL(page.url()).pathname.split('/').at(-1)!;
  await panel().getByRole('button',{name:'Mark as read',exact:true}).click();await panel().getByText(/^Read /).waitFor();expect(await panel().getByRole('button',{name:'Acknowledge update',exact:true}).count()).toBe(1);
  expect((await q<{n:number}>('SELECT count(*)::integer AS n FROM communication_receipts WHERE communication_id=$1 AND employee_id=$2',[optionalId,actors[engines.indexOf(engine)]]))[0].n).toBe(0);
  expect((await q<{n:number}>("SELECT count(*)::integer AS n FROM employee_attention_receipts WHERE source_kind='COMMUNICATION' AND source_id=$1 AND employee_id=$2",[optionalId,actors[engines.indexOf(engine)]]))[0].n).toBe(1);
  checks.push({engine,name:'CR-3 OPTIONAL mark-read records own reading without acknowledgement'});
  await panel().getByRole('link',{name:'Updates',exact:true}).click();await ready('updates');await panel().getByRole('link',{name:'Write an update',exact:true}).click();await ready('compose');
  await page.getByLabel('Today’s team location',{exact:true}).selectOption('loc-1');await page.getByLabel('Title',{exact:true}).fill('Valid original '+engine);await page.getByLabel('Message',{exact:true}).fill('Fictional body.');await panel().getByRole('button',{name:'Review audience',exact:true}).click();await panel().getByRole('button',{name:'Send update',exact:true}).waitFor();
  let operationId='',sent=0,lost=false;
  await page.route('**/api/employee/communications',async(route:any)=>{const body=route.request().postDataJSON();sent++;operationId=body.operationId;if(!lost){lost=true;await route.fetch();await route.abort();}else await route.continue();});
  fault(true);await panel().getByRole('button',{name:'Send update',exact:true}).click();await panel().locator('button:enabled').filter({hasText:/^Check submission status$/}).waitFor();await page.unroute('**/api/employee/communications');
  const revision=(await q<{revision:number}>('SELECT revision FROM nevora_workspace_presentation_revisions ORDER BY revision DESC LIMIT 1'))[0]?.revision??0;
  try{
   await saveWorkspacePresentation(owner,{operationId:randomUUID(),expectedRevision:revision,section:'modules',disabled:['updates']},app.database.executor);
   await panel().getByRole('button',{name:'Check submission status',exact:true}).click();await panel().getByText('Updates are turned off for your workspace.',{exact:false}).waitFor();await panel().getByText('The result hasn’t been confirmed.',{exact:false}).waitFor();expect(await panel().getByRole('button',{name:'Check submission status',exact:true}).isDisabled()).toBe(true);await shot('refused-original-lookup');
  }finally{await saveWorkspacePresentation(owner,{operationId:randomUUID(),expectedRevision:revision+1,section:'modules',disabled:[]},app.database.executor);}
  await panel().getByRole('button',{name:'Refresh',exact:true}).click();await ready('compose');await panel().locator('button:enabled').filter({hasText:/^Check submission status$/}).waitFor();await panel().getByRole('button',{name:'Check submission status',exact:true}).click();await panel().getByRole('heading',{name:'Update published',exact:true}).waitFor();expect(sent).toBe(1);
  expect((await q<{n:number}>('SELECT count(*)::integer AS n FROM communication_operations WHERE operation_id=$1 AND actor_employee_id=$2',[operationId,actors[engines.indexOf(engine)]]))[0].n).toBe(1);await shot('original-recovered');fault(false);checks.push({engine,name:'CR-1 real module-refused lookup retains exact committed original for deliberate recovery without another publication'});
 });
});
