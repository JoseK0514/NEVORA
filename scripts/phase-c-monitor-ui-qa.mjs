import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {randomBytes,randomUUID} from 'node:crypto';
import {homedir} from 'node:os';
import {join,resolve} from 'node:path';
import {mkdir,readFile,writeFile} from 'node:fs/promises';
import {createOwnedNextApp} from '../src/test/integration/owned-next-app.ts';
import {seedOwnedApp,TEST_PASSWORD} from '../src/test/integration/owned-app-fixture.ts';
import {hashPassword} from '../src/lib/auth/password.ts';
const evidence=resolve(process.env.PHASE_C_EVIDENCE_DIR??join(homedir(),'.codex/visualizations/nevora-c7-monitor'));
await mkdir(evidence,{recursive:true});
const runtime=createRequire(join(homedir(),'.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/package.json'));
const pw=runtime('playwright');
const report={checks:[],errors:[],screenshots:[],limits:['Owned local Next/fictional PostgreSQL with substituted transport, not hosted Neon.','Browser plugin not listed; existing Playwright.','Synthetic pagehide/pageshow and visibility events do not certify physical-iPad BFCache.']};
let app;const browsers=[];
const checked=name=>{report.checks.push(name);console.log('[C7 browser] PASS '+name);};
const q=(text,values=[])=>app.database.executor.query({text,values});
const endpoint='/api/manager/clock-monitor';
async function context(browser){const c=await browser.newContext({viewport:{width:1440,height:1000},serviceWorkers:'block'});await c.route('**/*',r=>new URL(r.request().url()).origin===app.url?r.continue():r.abort());return c;}
async function login(c,id='QAOWNER'){
 const p=await c.newPage();p.setDefaultTimeout(15000);p.on('pageerror',e=>report.errors.push(e.message));
 await p.goto(app.url+'/login');await p.getByLabel('Employee ID',{exact:true}).fill(id);await p.getByLabel('Password',{exact:true}).fill(TEST_PASSWORD);
 await Promise.all([p.waitForURL(u=>u.pathname==='/app'),p.getByRole('button',{name:'Sign In',exact:true}).click()]);return p;
}
const card=p=>p.locator('.manager-live-card');
async function refresh(p){await Promise.all([p.waitForResponse(r=>r.url()===app.url+endpoint),card(p).getByRole('button',{name:'Refresh live activity'}).click()]);await p.waitForFunction(()=>{const b=document.querySelector('.manager-live-refresh');return b&&!b.disabled;});}
async function waitPeople(p,count){await p.waitForFunction(n=>document.querySelectorAll('.manager-live-card .manager-floor-row').length===n,count);}
async function shot(p,name){const file=join(evidence,name+'.png');await p.screenshot({path:file,fullPage:true});report.screenshots.push(file);}
async function monitor(c){return c.request.get(app.url+endpoint,{headers:{'X-Nevora-Monitor':'1'}});}
async function punch(t,action){
 const result=await t.evaluate(async action=>{
  const call=async body=>{const r=await fetch('/api/clocker/2/punch',{method:'POST',credentials:'same-origin',cache:'no-store',headers:{'Content-Type':'application/json','X-Nevora-Clocker':'1'},body:JSON.stringify(body)});return {status:r.status,body:await r.json()};};
  const v=await call({operation:'state'});if(v.status!==200)return v;const s=v.body.snapshot;
  return call({operation:'execute',command:{commandId:crypto.randomUUID(),action,verificationId:v.body.verificationId,expected:{revision:s.revision,timeEntryId:s.entry?.id??null,timeEntryVersion:s.entry?.version??null,breakEntryId:s.break?.id??null,breakEntryVersion:s.break?.version??null},...(action==='START_BREAK'?{breakType:{id:v.body.breakTypes[0].id,version:v.body.breakTypes[0].version}}:{})}});
 },action);
 assert.equal(result.status,200,JSON.stringify(result));return result.body.receipt;
}
async function geometry(p,label){
 const result=await p.evaluate(()=>{
  const c=document.querySelector('.manager-live-card'),b=c.getBoundingClientRect();
  const items=[...c.querySelectorAll('button,a,strong,small,.manager-floor-status')].filter(e=>e.getBoundingClientRect().height>0);
  return {overflow:document.documentElement.scrollWidth>innerWidth+2,
   clipped:items.filter(e=>{const r=e.getBoundingClientRect();return r.left<b.left-1||r.right>b.right+1;}).map(e=>e.tagName),
   small:[...c.querySelectorAll('button,a')].filter(e=>e.getBoundingClientRect().height<43.5).map(e=>e.textContent)};
 });
 assert.equal(result.overflow,false,label+' document width');assert.deepEqual(result.clipped,[],label+' clipped content');assert.deepEqual(result.small,[],label+' touch targets');checked(label);
}
try{
 app=await createOwnedNextApp(evidence,{clockerPinKey:randomBytes(32).toString('hex'),clockerPunchEnabled:true});
 await seedOwnedApp(app.database.executor);
 const password=await hashPassword(TEST_PASSWORD);
 for(const [id,first,role] of [['C7-A','Avery','EMPLOYEE'],['C7-B','Blair','LEAD'],['C7-M','Morgan','MANAGER']]){
  await q("INSERT INTO employees(id,first_name,last_name,phone,role,primary_location_id) VALUES($1,$2,'QA','555',$3,'loc-1')",[id,first,role]);
  await q('INSERT INTO employee_credentials(employee_id,password_hash,must_change_password) VALUES($1,$2,false)',[id,password]);
  await q("INSERT INTO employee_location_eligibility VALUES($1,'loc-1')",[id]);
 }
 await q("INSERT INTO clocker_break_types(id,workspace_id,name,category,target_minutes,created_by,updated_by) VALUES('c7-rest','workspace-fuel','Rest break','REST',15,'QAOWNER','QAOWNER')");
 for(const engine of ['chromium','webkit']){
  const browser=await pw[engine].launch();browsers.push(browser);
  const owner=await context(browser),p=await login(owner);
  await card(p).getByText('No one is clocked in right now',{exact:true}).waitFor();checked(engine+': successful empty snapshot, real Owner login');
  const empty=await monitor(owner);assert.equal(empty.status(),200);assert.match(empty.headers()['cache-control'],/no-store/);assert.match(empty.headers().vary,/Cookie/);checked(engine+': uncached private authenticated endpoint');
  for(const id of ['C7-A','C7-B']){const c=await context(browser);await login(c,id);assert.equal((await monitor(c)).status(),403);await c.close();checked(engine+': '+id+' self-service denied');}
  const anonymous=await context(browser);assert.equal((await monitor(anonymous)).status(),401);await anonymous.close();checked(engine+': missing session denied');
  const manager=await context(browser),m=await login(manager,'C7-M');assert.equal((await monitor(manager)).status(),200);await manager.close();checked(engine+': current Manager allowed');
  // A published assignment alone must not imply physical presence.
  const [day]=await q("SELECT (clock_timestamp() AT TIME ZONE 'America/Puerto_Rico')::date::text AS date,date_trunc('week',clock_timestamp() AT TIME ZONE 'America/Puerto_Rico')::date::text AS week");
  const revision='c7-pub-'+engine;
  await q("INSERT INTO schedule_publication_revisions(id,week_start,revision_number,source_type,created_by) VALUES($1,$2,COALESCE((SELECT max(revision_number) FROM schedule_publication_revisions WHERE week_start=$2),0)+1,'PUBLISH','QAOWNER')",[revision,day.week]);
  for(const id of ['C7-A','C7-B'])await q("INSERT INTO schedule_publication_revision_shifts(id,revision_id,source_shift_id,schedule_id,location_id,employee_id,date,start_time,end_time,position_id,position_name) VALUES($1,$2,$3,'c7-schedule','loc-1',$4,$5,'00:00','24:00','qa-pos','Recorded Support')",[revision+':'+id,revision,'shift-'+id,id,day.date]);
  await refresh(p);await card(p).getByText('No one is clocked in right now',{exact:true}).waitFor();checked(engine+': published shifts alone never count as clocked in');
  const pin=engine==='chromium'?'0246':'2468';
  await p.goto(app.url+'/app/employees/C7-A/clocker-pin');await p.locator('#new-clocker-pin').fill(pin);await p.locator('#confirm-clocker-pin').fill(pin);await p.getByRole('button',{name:engine==='chromium'?'Save PIN':'Reset PIN',exact:true}).click();await p.getByRole('status').filter({hasText:'PIN saved'}).waitFor();
  await p.goto(app.url+'/app/settings/clocker');await p.getByRole('button',{name:'Add device',exact:true}).click();
  const dialog=p.getByRole('dialog');await dialog.getByLabel('Device name',{exact:true}).fill(engine+' C7 Tablet');await dialog.getByRole('combobox',{name:'Location',exact:true}).selectOption('loc-1');await dialog.getByRole('button',{name:'Create setup code',exact:true}).click();await dialog.waitFor({state:'hidden'});
  const code=await p.getByRole('textbox',{name:'Setup code',exact:true}).inputValue();
  const tablet=await context(browser),t=await tablet.newPage();t.setDefaultTimeout(15000);t.on('pageerror',e=>report.errors.push(e.message));
  await t.goto(app.url+'/clocker/2');await t.getByRole('textbox',{name:'Setup code',exact:true}).fill(code);await t.getByRole('button',{name:'Connect tablet',exact:true}).click();await t.getByLabel('Employee PIN',{exact:true}).fill(pin);await t.getByRole('button',{name:'Continue',exact:true}).click();await t.getByRole('heading',{name:/^Hi, /}).waitFor();
  await punch(t,'CLOCK_IN');await p.goto(app.url+'/app');await waitPeople(p,1);assert.match(await card(p).innerText(),/Avery QA/);assert(!((await card(p).innerText()).includes('Blair QA')));checked(engine+': real registered-tablet Clock In appears without scheduled-only peer');
  await q("UPDATE positions SET name='Renamed Live Role' WHERE id='qa-pos'");await refresh(p);assert.match(await card(p).innerText(),/Recorded Support/);assert(!((await card(p).innerText()).includes('Renamed Live Role')));checked(engine+': position uses captured history, not renamed catalogue');
  await punch(t,'START_BREAK');if(engine==='webkit')await refresh(p);await card(p).locator('.manager-floor-status').filter({hasText:'On Break'}).waitFor({timeout:45000});assert.match(await card(p).innerText(),/on break/);checked(engine+': real Start Break updates distinct break state');
  // The real tablet privacy timeout runs during the automatic polling wait. Reverify, never extend/bypass its grant.
  await t.goto(app.url+'/clocker/2');await t.getByLabel('Employee PIN',{exact:true}).fill(pin);await t.getByRole('button',{name:'Continue',exact:true}).click();await t.getByRole('heading',{name:/^Hi, /}).waitFor();
  await punch(t,'END_BREAK');await refresh(p);await card(p).locator('.manager-floor-status').filter({hasText:'On Floor'}).waitFor();checked(engine+': real End Break restores On Floor');
  await punch(t,'CLOCK_OUT');await refresh(p);await card(p).getByText('No one is clocked in right now',{exact:true}).waitFor();checked(engine+': real Clock Out removes the employee');await punch(t,'CLOCK_IN');await refresh(p);await waitPeople(p,1);
  await p.goto(app.url+'/app?week=2030-10-07');await waitPeople(p,1);checked(engine+': selected schedule week does not change actual current activity');
  // Long names/location labels exercise actual data, not hard-coded fixture cards.
  await q("UPDATE employees SET first_name=$1,last_name='QA' WHERE id='C7-A'",['Alexandria'.repeat(7)]);
  await q("UPDATE locations SET short_name=$1 WHERE id='loc-1'",['NorthsideOperations'.repeat(3).slice(0,48)]);await refresh(p);
  for(const width of [320,375,390,430,768,1024,1440]){await p.setViewportSize({width,height:1000});await geometry(p,engine+': live card '+width);await shot(p,engine+'-live-'+width);}
  const button=card(p).getByRole('button',{name:'Refresh live activity'});await button.focus();assert.equal(await button.evaluate(e=>document.activeElement===e),true);checked(engine+': keyboard focus on 44px refresh control');
  await q("UPDATE employees SET first_name='Avery' WHERE id='C7-A'; UPDATE locations SET short_name='Main Office' WHERE id='loc-1'");
  await refresh(p);
  // Failure must erase old people, not display zero or retain healthy stale state.
  await q('ALTER TABLE time_entries RENAME COLUMN schedule_context TO c7_unavailable_context');await refresh(p);await card(p).getByText('Live activity unavailable',{exact:true}).waitFor();assert.equal(await card(p).locator('.manager-floor-row,.manager-home-count').count(),0);await shot(p,engine+'-unavailable-1440');
  await q('ALTER TABLE time_entries RENAME COLUMN c7_unavailable_context TO schedule_context');await refresh(p);await waitPeople(p,1);checked(engine+': missing schema clears names/counts and recovers without page reload');
  await owner.setOffline(true);await card(p).getByText('Live updates paused',{exact:true}).waitFor();assert.equal(await card(p).locator('.manager-floor-row').count(),0);await owner.setOffline(false);await waitPeople(p,1);checked(engine+': offline pause removes stale activity, online requires a fresh response');
  await p.evaluate(()=>window.dispatchEvent(new Event('pagehide')));await card(p).getByText('Live updates paused',{exact:true}).waitFor();await p.evaluate(()=>window.dispatchEvent(new PageTransitionEvent('pageshow',{persisted:true})));await waitPeople(p,1);checked(engine+': restored-page lifecycle starts with fresh protected data');
  // Revocation must clear an already rendered live card.
  const cookie=(await owner.cookies()).find(c=>c.name==='fuel_session');assert(cookie);
  await q("DELETE FROM employee_sessions WHERE token_hash=encode(sha256(convert_to($1,'UTF8')),'hex')",[cookie.value]);
  await refresh(p);await card(p).getByText('Sign in again',{exact:true}).waitFor();assert.equal(await card(p).locator('.manager-floor-row,.manager-home-count').count(),0);checked(engine+': revoked session cannot refresh or retain employee activity');
  await owner.close();await tablet.close();await browser.close();
  // Close prior test entry using a bounded fixture operation; never modify any real data.
  await q("UPDATE break_entries SET break_end_at=clock_timestamp() WHERE break_end_at IS NULL; UPDATE time_entries SET clock_out_at=clock_timestamp(),status='CLOCKED_OUT' WHERE clock_out_at IS NULL");
 }
 assert.deepEqual(report.errors,[]);
}catch(error){report.errors.push(String(error.stack??error));process.exitCode=1;}
finally{for(const b of browsers)await b.close().catch(()=>{});if(app)await app.close();await writeFile(join(evidence,'report.json'),JSON.stringify(report,null,2));console.log(JSON.stringify({checks:report.checks.length,errors:report.errors,evidence}));}
