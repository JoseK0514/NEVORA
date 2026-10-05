import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {randomBytes} from 'node:crypto';
import {homedir} from 'node:os';
import {join,resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
import {mkdir,readFile,writeFile} from 'node:fs/promises';
import {createOwnedNextApp} from '../src/test/integration/owned-next-app.ts';
import {seedOwnedApp,TEST_PASSWORD} from '../src/test/integration/owned-app-fixture.ts';
const evidence=resolve(process.env.PHASE_C_EVIDENCE_DIR??join(homedir(),'.codex/visualizations/2026/10/05/nevora-punch-integration'));
await mkdir(evidence,{recursive:true});
const runtime=createRequire(join(homedir(),'.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/package.json'));
const pw=await import(pathToFileURL(runtime.resolve('playwright')).href),playwright=pw.default??pw;
const report={checks:[],errors:[],screenshots:[],limits:['Owned loopback PostgreSQL and scratch Next runtime; no hosted or physical-device verification.','Browser plugin not listed; existing Playwright used.']};
const browsers=[];let app,currentPage;
function checked(name){report.checks.push(name);console.log('[C3/C4 browser] PASS '+name);}
const q=(text,values=[])=>app.database.executor.query({text,values});
async function context(browser,viewport={width:1024,height:768}){
 const c=await browser.newContext({viewport,serviceWorkers:'block'});
 await c.route('**/*',r=>new URL(r.request().url()).origin===app.url?r.continue():r.abort());return c;
}
async function goto(page,path){const r=await page.goto(app.url+path,{waitUntil:'networkidle'});assert.equal(r.status(),200,'Working route '+path);}
async function login(c){const p=await c.newPage();await goto(p,'/login');await p.getByLabel('Employee ID',{exact:true}).fill('QAOWNER');await p.getByLabel('Password',{exact:true}).fill(TEST_PASSWORD);
 await Promise.all([p.waitForURL(u=>u.pathname==='/app'),p.getByRole('button',{name:'Sign In',exact:true}).click()]);return p;}
async function savePin(p,id,pin){await goto(p,`/app/employees/${id}/clocker-pin`);await p.getByLabel('New Clocker PIN',{exact:true}).fill(pin);await p.getByLabel('Confirm Clocker PIN',{exact:true}).fill(pin);await p.getByRole('button',{name:/Save PIN|Reset PIN/,exact:true}).click();await p.getByRole('status').filter({hasText:'PIN saved'}).waitFor();}
async function enroll(owner,p,name){
 await goto(owner,'/app/settings/clocker');await owner.getByRole('button',{name:'Add Device',exact:true}).click();
 const d=owner.getByRole('dialog');await d.getByLabel('Device name',{exact:true}).fill(name);await d.getByRole('combobox',{name:'Location',exact:true}).selectOption('loc-1');await d.getByRole('button',{name:'Create Setup Code',exact:true}).click();await d.waitFor({state:'hidden'});
 const code=await owner.getByRole('textbox',{name:'Setup code',exact:true}).inputValue();
 await goto(p,'/clocker/2');await p.getByRole('textbox',{name:'Setup code',exact:true}).fill(code);await p.getByRole('button',{name:'Connect Tablet',exact:true}).click();await idle(p);
}
async function editBreak(owner,name,category,minutes){
 await goto(owner,'/app/settings/breaks');const row=owner.locator('[data-break-type="ui-rest"]');
 await row.getByRole('button',{name:/^Manage /}).click();await owner.getByRole('button',{name:'Edit',exact:true}).click();const d=owner.getByRole('dialog');
 await d.getByLabel('Break name',{exact:true}).fill(name);await d.getByRole('combobox',{name:'Classification',exact:true}).selectOption(category);await d.getByLabel('Reference minutes',{exact:true}).fill(String(minutes));
 await d.getByRole('button',{name:'Save Changes',exact:true}).click();await d.waitFor({state:'hidden'});
}
async function archiveBreak(owner,operation){
 const row=owner.locator('[data-break-type="ui-rest"]');await row.getByRole('button',{name:/^Manage /}).click();await owner.getByRole('button',{name:operation,exact:true}).click();
 const d=owner.getByRole('dialog');await d.getByRole('button',{name:operation+' Break Type',exact:true}).click();await d.waitFor({state:'hidden'});
}
async function idle(p){await p.getByRole('heading',{name:'Enter Your PIN',exact:true}).waitFor();await p.waitForFunction(()=>{const i=document.querySelector('input[name=pin]');return i&&!i.matches(':disabled');});}
async function verify(p,pin='2468'){await idle(p);for(const n of pin)await p.getByRole('button',{name:'Number '+n,exact:true}).click();await p.getByRole('button',{name:'Continue',exact:true}).click();}
async function startBreak(p){await p.getByRole('button',{name:'Start Break',exact:true}).click();await p.getByRole('heading',{name:'Choose a Break',exact:true}).waitFor();await p.getByRole('button',{name:'Start Fixture rest',exact:true}).click();}
async function done(p){await p.getByRole('button',{name:'Done',exact:true}).click();await idle(p);}
async function success(p,action){await p.getByRole('heading',{name:action+' Recorded',exact:true}).waitFor();}
async function count(){return Number((await q('SELECT count(*)::int AS n FROM clocker_command_ledger'))[0].n);}
async function geometry(p,label){const v=await p.evaluate(()=>{
 const visible=e=>{const r=e.getBoundingClientRect(),s=getComputedStyle(e);return r.width>0&&r.height>0&&s.display!=='none'&&s.visibility!=='hidden';};
 const controls=[...document.querySelectorAll('main button,main input,main a.button')].filter(visible);
 return {width:innerWidth,doc:document.documentElement.scrollWidth,small:controls.filter(e=>e.getBoundingClientRect().height<43.5).length,
  outside:controls.filter(e=>{const r=e.getBoundingClientRect();return r.left<-2||r.right>innerWidth+2;}).length};
 });assert(v.doc<=v.width+2,label+' overflow');assert.equal(v.small,0,label+' touch sizes');assert.equal(v.outside,0,label+' clipped controls');checked(label);}
async function shot(p,name){const file=join(evidence,name+'.png');await p.screenshot({path:file,fullPage:true});report.screenshots.push(file);}
try{
 app=await createOwnedNextApp(evidence,{clockerPinKey:randomBytes(32).toString('hex'),clockerPunchEnabled:true});
 for(const name of ['clocker-devices','clocker-pins','clocker-punches','clocker-breaks'])await q(await readFile(`db/phase-c/${name}.sql`,'utf8'));
 await seedOwnedApp(app.database.executor);
 await q("INSERT INTO clocker_break_types(id,workspace_id,name,category,target_minutes,created_by,updated_by) SELECT 'ui-rest',l.workspace_id,'Fixture rest','REST',15,e.id,e.id FROM employees e JOIN locations l ON l.id=e.primary_location_id WHERE e.role='OWNER' ORDER BY e.id LIMIT 1");
 for(const [id,name] of [['PUNCH-A','Avery'],['PUNCH-B','Blair']]){await q("INSERT INTO employees(id,first_name,last_name,phone,role,primary_location_id) VALUES($1,$2,'QA','555','EMPLOYEE','loc-1')",[id,name]);await q("INSERT INTO employee_location_eligibility VALUES($1,'loc-1')",[id]);}
 for(const engine of (process.env.PUNCH_QA_ENGINES?.split(',')??['chromium','webkit'])){
  const browser=await playwright[engine].launch();browsers.push(browser);
  const owner=await context(browser,{width:1440,height:1000}),ownerPage=await login(owner);
  await savePin(ownerPage,'PUNCH-A','2468');await savePin(ownerPage,'PUNCH-B','3579');
  const tablet=await context(browser),t=await tablet.newPage();currentPage=t;t.setDefaultTimeout(15000);
  let stage='active-flow';const errors=[];const capture=(source,e)=>errors.push({source,stage,lastCheck:report.checks.at(-1),message:e.message,stack:e.stack});t.on('pageerror',e=>capture('primary',e));
  await enroll(ownerPage,t,engine+' Clocking Tablet');
  await verify(t);await t.getByRole('button',{name:'Clock In',exact:true}).waitFor();
  assert.equal(await t.getByText('Time punches are not enabled yet.',{exact:true}).count(),0);
  await geometry(t,engine+': actual off-clock view');await shot(t,engine+'-off-clock-1024');
  let executeRequests=0;const watch=r=>{if(r.url().endsWith('/punch')&&r.postDataJSON()?.operation==='execute')executeRequests++;};t.on('request',watch);
  const before=await count();await t.getByRole('button',{name:'Clock In',exact:true}).evaluate(e=>{e.click();e.click();});await success(t,'Clock In');
  assert.equal(executeRequests,1);assert.equal(await count(),before+1);checked(engine+': double click records exactly one real Clock In');await shot(t,engine+'-clock-in-success');
  await done(t);await verify(t);await startBreak(t);await success(t,'Break Start');await done(t);
  await verify(t);await t.getByRole('button',{name:'End Break',exact:true}).waitFor();await shot(t,engine+'-on-break');
  await t.getByRole('button',{name:'End Break',exact:true}).click();await success(t,'Break End');await done(t);
  await verify(t);await t.getByRole('button',{name:'Clock Out',exact:true}).click();await t.getByRole('button',{name:'Keep Working',exact:true}).click();
  assert.equal(await count(),before+3);await t.getByRole('button',{name:'Clock Out',exact:true}).click();await t.getByRole('button',{name:'Confirm Clock Out',exact:true}).click();await success(t,'Clock Out');await done(t);
  assert.equal(await count(),before+4);checked(engine+': all four transitions persist; canceled Clock Out does not write');
  // A lost response must not create a replacement command, even after a page reload.
  await verify(t);await t.getByRole('button',{name:'Clock In',exact:true}).waitFor();let dropped=false;
  await t.route('**/api/clocker/2/punch',async route=>{
   if(!dropped&&route.request().postDataJSON()?.operation==='execute'){dropped=true;const response=await route.fetch();assert.equal(response.status(),200);await route.abort('failed');}
   else await route.continue();
  });
  await t.getByRole('button',{name:'Clock In',exact:true}).click();await t.getByRole('button',{name:'Check Action Status',exact:true}).waitFor();assert(dropped);
  assert.equal(await t.getByRole('button',{name:'Clock In',exact:true}).count(),0);
  const stored=await t.evaluate(()=>sessionStorage.getItem('nevora.clocker.pending.v1:2'));assert(stored);assert(!/Avery|2468|nev_pin_|nev_dev_|tokenHash|firstName|recordedAt/.test(stored));
  await t.unroute('**/api/clocker/2/punch');await t.reload();await idle(t);await verify(t,'3579');
  await t.getByRole('heading',{name:'Previous Action Needs Review',exact:true}).waitFor();assert.equal(await t.getByRole('button',{name:'Check Action Status',exact:true}).count(),0);
  checked(engine+': another employee cannot inspect or replace the pending action');
  await t.getByRole('button',{name:'Return to PIN',exact:true}).click();await verify(t);
  await t.getByRole('button',{name:'Check Action Status',exact:true}).click();await success(t,'Clock In');assert.equal(await count(),before+5);await done(t);
  checked(engine+': lost committed response survives reload and re-PIN without duplicate time');
  // Two real tablets start from the same employee revision. Only one transition can win.
  const second=await context(browser),t2=await second.newPage();t2.setDefaultTimeout(15000);t2.on('pageerror',e=>capture('second-tablet',e));
  await enroll(ownerPage,t2,engine+' Second Tablet');await verify(t);await verify(t2);
  await t.getByRole('button',{name:'Start Break',exact:true}).waitFor();await t2.getByRole('button',{name:'Clock Out',exact:true}).waitFor();
  await startBreak(t);await success(t,'Break Start');
  await t2.getByRole('button',{name:'Clock Out',exact:true}).click();await t2.getByRole('button',{name:'Confirm Clock Out',exact:true}).click();
  await t2.getByRole('button',{name:'Check Action Status',exact:true}).waitFor();await t2.getByRole('button',{name:'Check Action Status',exact:true}).click();
  await t2.getByRole('button',{name:'End Break',exact:true}).waitFor();assert.equal(await count(),before+6);checked(engine+': stale second-tablet action refreshes without silently clocking out');
  await t2.getByRole('button',{name:'Clock Out',exact:true}).click();await t2.getByText('This will also end your current break.',{exact:true}).waitFor();
  await t2.getByRole('button',{name:'Confirm Clock Out',exact:true}).click();await success(t2,'Clock Out');
  const last=(await q("SELECT t.clock_out_at=b.break_end_at AS together FROM time_entries t JOIN break_entries b ON b.time_entry_id=t.id WHERE t.employee_id='PUNCH-A' ORDER BY t.clock_in_at DESC,b.break_start_at DESC LIMIT 1"))[0];assert.equal(last.together,true);
  checked(engine+': Clock Out on break closes both records atomically');await done(t2);stage='second-tablet-intentional-close';await second.close();stage='active-flow';await idle(t);
  // Explicit retry of a never-delivered command retains its original ID and payload.
  await verify(t);await t.getByRole('button',{name:'Clock In',exact:true}).waitFor();let blocked=false;
  await t.route('**/api/clocker/2/punch',async route=>{if(!blocked&&route.request().postDataJSON()?.operation==='execute'){blocked=true;await route.abort('failed');}else await route.continue();});
  await t.getByRole('button',{name:'Clock In',exact:true}).click();await t.getByRole('button',{name:'Check Action Status',exact:true}).waitFor();
  const pending=await t.evaluate(()=>sessionStorage.getItem('nevora.clocker.pending.v1:2'));await t.unroute('**/api/clocker/2/punch');
  await t.getByRole('button',{name:'Check Action Status',exact:true}).click();await t.getByRole('button',{name:'Retry Same Action',exact:true}).waitFor();
  assert.equal(await t.evaluate(()=>sessionStorage.getItem('nevora.clocker.pending.v1:2')),pending);
  await t.getByRole('button',{name:'Retry Same Action',exact:true}).click();await success(t,'Clock In');assert.equal(await count(),before+8);checked(engine+': explicit same-command retry after a failed connection');await done(t);
  // Current verification expiry must block the visible action, not record time.
  await verify(t);await t.getByRole('button',{name:'Start Break',exact:true}).waitFor();
  await q("UPDATE clocker_pin_sessions SET expires_at=clock_timestamp()-interval '1 second'");
  await startBreak(t);await t.getByRole('heading',{name:'Verify Your PIN Again',exact:true}).waitFor();
  assert.equal(await count(),before+8);checked(engine+': expired verification never creates a time record');
  await t.getByRole('button',{name:'Return to PIN',exact:true}).click();await verify(t);await t.getByRole('button',{name:'Check Action Status',exact:true}).click();await t.getByRole('button',{name:'Start Break',exact:true}).waitFor();assert.equal(await t.getByRole('button',{name:'Retry Same Action',exact:true}).count(),0);await startBreak(t);await success(t,'Break Start');await done(t);
  // Responsive controls, keyboard confirmation and clear identity on Escape.
  for(const width of [320,375,390,430,768,1024,1440]){
   await t.setViewportSize({width,height:width<500?844:width===768?1024:900});await verify(t);await t.getByRole('button',{name:'End Break',exact:true}).waitFor();
   await geometry(t,engine+': on-break controls '+width);await t.getByRole('button',{name:'Clock Out',exact:true}).click();await geometry(t,engine+': Clock Out confirmation '+width);
   if([390,1024].includes(width))await shot(t,engine+'-confirm-'+width);
   await t.keyboard.press('Escape');await idle(t);
  }
  // Finish the fixture shift; verify success privacy timer without touching customer data.
  await verify(t);await t.getByRole('button',{name:'Clock Out',exact:true}).click();await t.getByRole('button',{name:'Confirm Clock Out',exact:true}).click();await success(t,'Clock Out');await idle(t);
  assert.equal((await q('SELECT count(*)::int AS n FROM clocker_pin_sessions'))[0].n,0);checked(engine+': confirmation auto-resets and clears server identity');
  const guardStart=await count();
  await verify(t);await t.getByRole('button',{name:'Clock In',exact:true}).waitFor();
  await t.evaluate(()=>{window.__restoreStorage=Storage.prototype.setItem;Storage.prototype.setItem=function(key,value){if(key.startsWith('nevora.clocker.pending.'))throw new DOMException('Test storage denial','SecurityError');return window.__restoreStorage.call(this,key,value);};});
  await t.getByRole('button',{name:'Clock In',exact:true}).click();await t.getByRole('heading',{name:'Browser Storage Needed',exact:true}).waitFor();assert.equal(await count(),guardStart);
  await t.evaluate(()=>{Storage.prototype.setItem=window.__restoreStorage;delete window.__restoreStorage;});
  await t.getByRole('button',{name:'Return to PIN',exact:true}).click();await idle(t);checked(engine+': blocked browser recovery storage prevents the request entirely');
  // A second tab changes the shared HttpOnly cookie. The old screen must not act as that employee.
  await verify(t);await t.getByRole('button',{name:'Clock In',exact:true}).waitFor();
  const tab=await tablet.newPage();await goto(tab,'/clocker/2');await verify(tab,'3579');await tab.getByRole('button',{name:'Clock In',exact:true}).waitFor();
  await t.getByRole('button',{name:'Clock In',exact:true}).click();await t.getByRole('heading',{name:'Verify Your PIN Again',exact:true}).waitFor();assert.equal(await count(),guardStart);
  await done(tab);await t.getByRole('button',{name:'Return to PIN',exact:true}).click();await verify(t);
  await t.getByRole('button',{name:'Check Action Status',exact:true}).click();await t.getByRole('button',{name:'Clock In',exact:true}).waitFor();assert.equal(await t.getByRole('button',{name:'Retry Same Action',exact:true}).count(),0);await t.getByRole('button',{name:'Clock In',exact:true}).click();await success(t,'Clock In');await done(t);
  assert.equal((await q("SELECT count(*)::int AS n FROM time_entries WHERE employee_id='PUNCH-B'"))[0].n,0);
  await verify(t);await t.getByRole('button',{name:'Clock Out',exact:true}).click();await t.getByRole('button',{name:'Confirm Clock Out',exact:true}).click();await success(t,'Clock Out');await done(t);
  await tab.close();checked(engine+': a stale tab cannot clock a newly verified different employee');
  await t.route('**/api/clocker/2/punch',route=>route.request().postDataJSON()?.operation==='state'?route.abort('failed'):route.continue());
  await verify(t);await t.getByRole('heading',{name:'Clock State Unavailable',exact:true}).waitFor();assert.equal(await t.getByRole('button',{name:'Clock In',exact:true}).count(),0);await shot(t,engine+'-unavailable');
  await t.unroute('**/api/clocker/2/punch');await t.getByRole('button',{name:'Try Again',exact:true}).click();await t.getByRole('button',{name:'Clock In',exact:true}).waitFor();await done(t);
  checked(engine+': an unavailable clock read never displays a false off-clock action');
  // C5 and the tablet run through one canonical engine, including real Owner edits.
  const typedStart=await count();await verify(t);await t.getByRole('button',{name:'Clock In',exact:true}).click();await success(t,'Clock In');await done(t);
  await verify(t);
  for(const viewport of [{width:320,height:740},{width:768,height:1024},{width:1024,height:768}]){
   await t.setViewportSize(viewport);await t.getByRole('button',{name:'Start Break',exact:true}).click();await t.getByRole('heading',{name:'Choose a Break',exact:true}).waitFor();
   assert.equal(await count(),typedStart+1,'Opening break choices must not record a break');
   await geometry(t,engine+': explicit break selection '+viewport.width+'x'+viewport.height);
   if(viewport.width===320||viewport.width===1024)await shot(t,engine+'-typed-break-selection-'+viewport.width);
   await t.getByRole('button',{name:'Back',exact:true}).click();
  }
  await t.getByRole('button',{name:'Start Break',exact:true}).click();
  await editBreak(ownerPage,'Meal reference','MEAL',30);
  await t.getByRole('button',{name:'Start Fixture rest',exact:true}).click();await t.getByRole('button',{name:'Check Action Status',exact:true}).waitFor();
  assert.equal(await count(),typedStart+1,'A changed type cannot record from a stale choice');
  await t.getByRole('button',{name:'Check Action Status',exact:true}).click();await t.getByRole('button',{name:'Start Break',exact:true}).click();
  assert.equal(await t.getByRole('button',{name:'Start Fixture rest',exact:true}).count(),0);
  await t.getByRole('button',{name:'Start Meal reference',exact:true}).click();await success(t,'Break Start');await done(t);
  checked(engine+': stale break selection rejects safely, then requires an explicit current type');
  await editBreak(ownerPage,'Future rest','REST',5);await archiveBreak(ownerPage,'Archive');
  await verify(t);await t.getByRole('button',{name:'End Break',exact:true}).waitFor();await t.getByText('Meal reference',{exact:true}).waitFor();
  await t.getByText('Reference: 30 min',{exact:false}).waitFor();assert.equal(await t.getByText('Future rest',{exact:true}).count(),0);
  const captured=(await q("SELECT break_type_snapshot AS settings FROM break_entries b JOIN time_entries t ON t.id=b.time_entry_id WHERE t.employee_id='PUNCH-A' ORDER BY b.break_start_at DESC LIMIT 1"))[0].settings;
  assert.equal(captured.name,'Meal reference');assert.equal(captured.category,'MEAL');assert.equal(captured.targetMinutes,30);
  await shot(t,engine+'-historical-break-settings');await t.getByRole('button',{name:'End Break',exact:true}).click();await success(t,'Break End');await done(t);
  await verify(t);await t.getByText('No break types are configured. Ask your Owner to add one.',{exact:true}).waitFor();
  assert.equal(await t.getByRole('button',{name:'Start Break',exact:true}).count(),0);
  await t.getByRole('button',{name:'Clock Out',exact:true}).click();await t.getByRole('button',{name:'Confirm Clock Out',exact:true}).click();await success(t,'Clock Out');await done(t);
  assert.equal(await count(),typedStart+4);checked(engine+': archived types preserve captured settings, allow End Break and never invent a new type');
  await archiveBreak(ownerPage,'Reactivate');await editBreak(ownerPage,'Fixture rest','REST',15);
  const longName='Alexandria'+('x'.repeat(65));await q("UPDATE employees SET first_name=$1,updated_at=clock_timestamp() WHERE id='PUNCH-A'",[longName]);
  await t.setViewportSize({width:320,height:740});await verify(t);await t.getByRole('heading',{name:'Hi, '+longName+'.',exact:true}).waitFor();await geometry(t,engine+': complete long name at 320px');await shot(t,engine+'-long-name-320');
  await t.getByRole('heading',{name:'Hi, '+longName+'.',exact:true}).focus();await t.keyboard.press('Tab');
  const button=t.getByRole('button',{name:'Clock In',exact:true});console.log('[Keyboard diagnostic]',engine,await t.evaluate(()=>({activeTag:document.activeElement?.tagName,activeLabel:document.activeElement?.textContent?.trim().slice(0,100)})));await t.waitForFunction(()=>document.activeElement?.textContent?.trim()==='Clock In',null,{timeout:1500});assert(await button.evaluate(e=>document.activeElement===e));
  const measured=await button.evaluate(e=>{const c=getComputedStyle(e);const luminance=value=>{const rgb=value.match(/[\d.]+/g).slice(0,3).map(Number).map(n=>{const s=n/255;return s<=.04045?s/12.92:((s+.055)/1.055)**2.4;});return .2126*rgb[0]+.7152*rgb[1]+.0722*rgb[2];};const a=luminance(c.color),b=luminance(c.backgroundColor);return {ratio:(Math.max(a,b)+.05)/(Math.min(a,b)+.05),outline:parseFloat(c.outlineWidth),opacity:c.opacity};});
  assert(measured.ratio>=4.5);assert(measured.outline>=2);assert.equal(measured.opacity,'1');checked(engine+': keyboard focus and measured primary-button contrast');
  await done(t);await q("UPDATE employees SET first_name='Avery',updated_at=clock_timestamp() WHERE id='PUNCH-A'");
  assert.deepEqual(errors,[]);checked(engine+': no runtime or hydration errors');await tablet.close();await owner.close();await browser.close();
 }
}catch(error){report.errors.push(String(error.stack??error));if(currentPage&&!currentPage.isClosed())await shot(currentPage,'failure').catch(()=>{});process.exitCode=1;}
finally{for(const b of browsers)await b.close().catch(()=>{});if(app)await app.close().catch(e=>{report.errors.push(String(e));process.exitCode=1;});await writeFile(join(evidence,'report.json'),JSON.stringify(report,null,2));console.log(JSON.stringify({checks:report.checks.length,errors:report.errors,evidence},null,2));}
