import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {randomBytes,randomUUID} from 'node:crypto';
import {homedir} from 'node:os';
import {join,resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
import {mkdir,readFile,writeFile} from 'node:fs/promises';
import {createOwnedNextApp} from '../src/test/integration/owned-next-app.ts';
import {seedOwnedApp,TEST_PASSWORD} from '../src/test/integration/owned-app-fixture.ts';
const evidence=resolve(process.env.PHASE_C_EVIDENCE_DIR??join(homedir(),'.codex/visualizations/nevora-c34-http'));
await mkdir(evidence,{recursive:true});
const runtime=createRequire(join(homedir(),'.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/package.json'));
const pw=await import(pathToFileURL(runtime.resolve('playwright')).href);const playwright=pw.default??pw;
const report={checks:[],errors:[],screenshots:[],limits:['Real Next HTTP with owned local PostgreSQL; DB transport substituted in a scratch copy.','Existing Playwright used because Browser plugin is not listed.','API activation is test-only. Tablet punch controls, hosted Neon and physical iPad are not certified.']};
let app;const browsers=[];
const checked=name=>{report.checks.push(name);console.log('[C3/C4 HTTP] PASS '+name);};
async function context(browser){const c=await browser.newContext({viewport:{width:1024,height:768},serviceWorkers:'block'});await c.route('**/*',r=>new URL(r.request().url()).origin===app.url?r.continue():r.abort());return c;}
async function goto(page,path){const response=await page.goto(app.url+path,{waitUntil:'networkidle'});assert.equal(response.status(),200,'Working route '+path);}
async function login(c){const p=await c.newPage();await goto(p,'/login');await p.getByLabel('Employee ID',{exact:true}).fill('QAOWNER');await p.getByLabel('Password',{exact:true}).fill(TEST_PASSWORD);await Promise.all([p.waitForURL(u=>u.pathname==='/app'),p.getByRole('button',{name:'Sign In',exact:true}).click()]);await p.close();}
async function api(page,payload){return page.evaluate(async data=>{
 try{const r=await fetch('/api/clocker/2/punch',{method:'POST',credentials:'same-origin',cache:'no-store',headers:{'Content-Type':'application/json','X-Nevora-Clocker':'1'},body:JSON.stringify(data),signal:AbortSignal.timeout(12000)});
  let body=null;try{body=await r.json();}catch{}return {status:r.status,body,cache:r.headers.get('cache-control')};
 }catch{return {networkError:true};}
},payload);}
async function command(page,action){const result=await api(page,{operation:'state'});assert.equal(result.status,200,'Punch state route');assert.equal(result.body.state,'ready');const v=result.body,s=v.snapshot;
 return {...(action==='START_BREAK'?{breakType:{id:v.breakTypes[0].id,version:v.breakTypes[0].version}}:{}),commandId:randomUUID(),action,verificationId:v.verificationId,expected:{revision:s.revision,timeEntryId:s.entry?.id??null,timeEntryVersion:s.entry?.version??null,breakEntryId:s.break?.id??null,breakEntryVersion:s.break?.version??null}};
}
async function verify(page,pin){await page.getByRole('heading',{name:'Enter your PIN',exact:true}).waitFor();await page.getByLabel('Employee PIN',{exact:true}).fill(pin);await page.getByRole('button',{name:'Continue',exact:true}).click();await page.getByRole('heading',{name:/^Hi, /}).waitFor();}
async function done(page){await page.getByRole('button',{name:'Done',exact:true}).click();await page.waitForFunction(()=>{const input=document.querySelector('input[name=pin]');return input&&!input.matches(':disabled');});}
try{
 app=await createOwnedNextApp(evidence,{clockerPinKey:randomBytes(32).toString('hex'),clockerPunchEnabled:true});
 const q=(text,values=[])=>app.database.executor.query({text,values});
 await seedOwnedApp(app.database.executor);
 for(const engine of ['chromium','webkit']){
  const browser=await playwright[engine].launch();browsers.push(browser);
  const owner=await context(browser);await login(owner);const p=await owner.newPage();p.setDefaultTimeout(15000);
  const runtimeErrors=[];p.on('pageerror',e=>runtimeErrors.push(e.message));
  const idA=`C34-${engine}-A`,idB=`C34-${engine}-B`,pinA=engine==='chromium'?'0246':'2468',pinB=engine==='chromium'?'1357':'3579';
  for(const [id,name,pin] of [[idA,'Avery',pinA],[idB,'Blair',pinB]]){
   await q("INSERT INTO employees(id,first_name,last_name,phone,role,primary_location_id) VALUES($1,$2,'QA','555','EMPLOYEE','loc-1');",[id,name]);
   await q("INSERT INTO employee_location_eligibility VALUES($1,'loc-1')",[id]);
   await goto(p,`/app/employees/${id}/clocker-pin`);await p.locator('#new-clocker-pin').fill(pin);await p.locator('#confirm-clocker-pin').fill(pin);
   await p.getByRole('button',{name:'Save PIN',exact:true}).click();await p.getByRole('status').filter({hasText:'PIN saved'}).waitFor();
  }
  await q("INSERT INTO clocker_break_types(id,workspace_id,name,category,target_minutes,created_by,updated_by) VALUES($1,'workspace-fuel',$2,'REST',15,'QAOWNER','QAOWNER')",['http-rest-'+engine,engine+' rest']);
  await goto(p,'/app/settings/clocker');await p.getByRole('button',{name:'Add device',exact:true}).click();
  const name=engine+' Punch tablet',dialog=p.getByRole('dialog');await dialog.getByLabel('Device name',{exact:true}).fill(name);
  await dialog.getByRole('combobox',{name:'Location',exact:true}).selectOption('loc-1');await dialog.getByRole('button',{name:'Create setup code',exact:true}).click();await dialog.waitFor({state:'hidden'});
  const code=await p.getByRole('textbox',{name:'Setup code',exact:true}).inputValue();
  const tablet=await context(browser),t=await tablet.newPage();t.setDefaultTimeout(15000);t.on('pageerror',e=>runtimeErrors.push(e.message));
  await goto(t,'/clocker/2');await t.getByRole('textbox',{name:'Setup code',exact:true}).fill(code);await t.getByRole('button',{name:'Connect tablet',exact:true}).click();await verify(t,pinA);
  const [clockDate]=await q("SELECT (clock_timestamp() AT TIME ZONE 'America/Puerto_Rico')::date::text AS day,date_trunc('week',clock_timestamp() AT TIME ZONE 'America/Puerto_Rico')::date::text AS week");
  const revision='c6-http-'+engine,position='c6-http-position-'+engine;
  await q("INSERT INTO positions(id,workspace_id,name) VALUES($1,'workspace-fuel',$2)",[position,'Published HTTP '+engine]);
  await q("INSERT INTO schedule_publication_revisions(id,week_start,revision_number,source_type,created_by) VALUES($1,$2,COALESCE((SELECT max(revision_number) FROM schedule_publication_revisions WHERE week_start=$2),0)+1,'PUBLISH','QAOWNER')",[revision,clockDate.week]);
  await q("INSERT INTO schedule_publication_revision_shifts(id,revision_id,source_shift_id,schedule_id,location_id,employee_id,date,start_time,end_time,position_id,position_name) VALUES($1,$2,$3,'http-schedule','loc-1',$4,$5,'00:00','24:00',$6,$7)",[revision+':shift',revision,'http-shift-'+engine,idA,clockDate.day,position,'Published HTTP '+engine]);
  const c=await command(t,'CLOCK_IN');checked(engine+': current PIN/device proof obtains authoritative punch context');
  const duplicate=await Promise.all([api(t,{operation:'execute',command:c}),api(t,{operation:'execute',command:c})]);
  assert.equal(duplicate[0].status,200);assert.equal(duplicate[1].status,200);assert.deepEqual(duplicate[0].body,duplicate[1].body);
  assert.equal((await q('SELECT count(*)::int AS n FROM time_entries WHERE employee_id=$1',[idA]))[0].n,1);checked(engine+': duplicate HTTP submissions commit one Clock In');
  const [captured]=await q('SELECT schedule_context FROM time_entries WHERE employee_id=$1',[idA]);
  assert.equal(captured.schedule_context.status,'MATCHED');assert.equal(captured.schedule_context.match.revisionId,revision);
  assert.equal(captured.schedule_context.match.positionName,'Published HTTP '+engine);
  assert.equal(captured.schedule_context.capturedAt,duplicate[0].body.receipt.performedAt);
  assert(!JSON.stringify(duplicate[0].body).includes(revision),'Detailed schedule metadata stays server-side');
  checked(engine+': native Clock In captures published context atomically without shared-tablet metadata exposure');
  assert.match(duplicate[0].cache,/no-store/);
  let next=await command(t,'START_BREAK');assert.equal((await api(t,{operation:'execute',command:next})).status,200);
  assert.equal((await api(t,{operation:'execute',command:{...next,expected:{...next.expected,revision:999}}})).status,409);checked(engine+': changed payload reuse is rejected');
  const end=await command(t,'END_BREAK'),out=await command(t,'CLOCK_OUT');
  const race=await Promise.all([api(t,{operation:'execute',command:end}),api(t,{operation:'execute',command:out})]);
  assert.deepEqual(race.map(r=>r.status).sort(),[200,409]);
  if((await api(t,{operation:'state'})).body.snapshot.entry)assert.equal((await api(t,{operation:'execute',command:await command(t,'CLOCK_OUT')})).status,200);
  assert.deepEqual(await q('SELECT b.break_end_at IS NOT NULL AS closed FROM break_entries b JOIN time_entries e ON e.id=b.time_entry_id WHERE e.employee_id=$1',[idA]),[{closed:true}]);
  checked(engine+': break/end/out race preserves persisted lifecycle integrity');
  const lost=await command(t,'CLOCK_IN');let dropped=false;
  await t.route('**/api/clocker/2/punch',async route=>{
   if(!dropped&&JSON.parse(route.request().postData()??'{}').operation==='execute'){
    dropped=true;const response=await route.fetch();assert.equal(response.status(),200);await route.abort('failed');
   }else await route.continue();
  });
  const ambiguous=await api(t,{operation:'execute',command:lost});assert.equal(ambiguous.networkError,true);assert(dropped);await t.unroute('**/api/clocker/2/punch');
  const recovered=await api(t,{operation:'receipt',commandId:lost.commandId,verificationId:(await api(t,{operation:'state'})).body.verificationId});assert.equal(recovered.status,200);assert.equal(recovered.body.state,'committed');
  assert.deepEqual((await api(t,{operation:'execute',command:lost})).body,recovered.body);
  assert.equal((await q('SELECT count(*)::int AS n FROM time_entries WHERE employee_id=$1',[idA]))[0].n,2);checked(engine+': lost committed response recovers its receipt without duplicate time');
  await done(t);await verify(t,pinA);
  assert.equal((await api(t,{operation:'execute',command:lost})).body.code,'CONTEXT_CHANGED');
  assert.deepEqual((await api(t,{operation:'receipt',commandId:lost.commandId,verificationId:(await api(t,{operation:'state'})).body.verificationId})).body,recovered.body);checked(engine+': re-verification permits receipt recovery, not blind old-command replay');
  await done(t);await verify(t,pinB);
  assert.equal((await api(t,{operation:'receipt',commandId:lost.commandId,verificationId:(await api(t,{operation:'state'})).body.verificationId})).body.state,'unknown');
  assert.equal((await api(t,{operation:'execute',command:lost})).body.code,'CONTEXT_CHANGED');checked(engine+': next employee cannot inherit prior punches or receipts');
  const forbidden=await tablet.request.post(app.url+'/api/clocker/2/punch',{headers:{Origin:'https://evil.invalid','X-Nevora-Clocker':'1'},data:{operation:'state'}});assert.equal(forbidden.status(),403);checked(engine+': cross-origin request rejected by actual HTTP route');
  await goto(p,'/app/settings/clocker');await p.getByRole('button',{name:`Manage ${name}`,exact:true}).click();await p.getByRole('button',{name:'Revoke access',exact:true}).click();
  await p.getByRole('dialog').getByRole('button',{name:'Revoke device',exact:true}).click();await p.getByRole('dialog').waitFor({state:'hidden'});
  assert.equal((await api(t,{operation:'state'})).status,401);checked(engine+': revoked device loses API access immediately');
  assert.deepEqual(runtimeErrors,[]);checked(engine+': no unexpected runtime or hydration errors');
  await tablet.close();await owner.close();await browser.close();
 }
 await app.close();app=undefined;
 // No opt-in flag: endpoint must stay disabled even before Phase C drafts exist.
 app=await createOwnedNextApp(evidence);
 const response=await fetch(app.url+'/api/clocker/2/punch',{method:'POST',headers:{Origin:app.url,'Content-Type':'application/json','X-Nevora-Clocker':'1'},body:JSON.stringify({operation:'state'})});
 assert.equal(response.status,503);assert.equal((await response.json()).state,'disabled');checked('Default application configuration keeps punch API disabled');
}catch(error){report.errors.push(String(error.stack??error));process.exitCode=1;}
finally{
 for(const browser of browsers)await browser.close().catch(()=>{});
 if(app)await app.close().catch(error=>{report.errors.push(String(error));process.exitCode=1;});
 await writeFile(join(evidence,'report.json'),JSON.stringify(report,null,2));console.log(JSON.stringify({checks:report.checks.length,errors:report.errors,evidence},null,2));
}
