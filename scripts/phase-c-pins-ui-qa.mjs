import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {randomBytes} from 'node:crypto';
import {homedir} from 'node:os';
import {join,resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
import {mkdir,readFile,writeFile} from 'node:fs/promises';
import {createOwnedNextApp} from '../src/test/integration/owned-next-app.ts';
import {seedOwnedApp,TEST_PASSWORD} from '../src/test/integration/owned-app-fixture.ts';
const evidence=resolve(process.env.PHASE_C_EVIDENCE_DIR??join(homedir(),'.codex/visualizations/2026/10/05/nevora-c2-ui'));
await mkdir(evidence,{recursive:true});
const runtime=createRequire(join(homedir(),'.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/package.json'));
const pw=await import(pathToFileURL(runtime.resolve('playwright')).href);const playwright=pw.default??pw;
const report={checks:[],errors:[],screenshots:[],limits:['Owned disposable SQL and scratch Next, not hosted/physical iPad.','Browser plugin not listed; existing Playwright runtime used.']};
let app;const browsers=[];
const checked=name=>{report.checks.push(name);console.log('[C2 browser] PASS '+name);};
async function context(browser,viewport={width:1440,height:1000}){
 const c=await browser.newContext({viewport,serviceWorkers:'block'});
 await c.route('**/*',r=>new URL(r.request().url()).origin===app.url?r.continue():r.abort());return c;
}
async function goto(page,path){const r=await page.goto(app.url+path,{waitUntil:'networkidle'});assert.equal(r.status(),200,'Working route '+path);}
async function login(c){const p=await c.newPage();await goto(p,'/login');await p.getByLabel('Employee ID',{exact:true}).fill('QAOWNER');await p.getByLabel('Password',{exact:true}).fill(TEST_PASSWORD);
 await Promise.all([p.waitForURL(u=>u.pathname==='/app'),p.getByRole('button',{name:'Sign in',exact:true}).click()]);await p.close();}
async function geometry(page,name){const r=await page.evaluate(()=>{const controls=[...document.querySelectorAll('button,a.button,input:not([type=hidden]),select')].filter(e=>{const r=e.getBoundingClientRect();return r.width&&r.height;});return {overflow:document.documentElement.scrollWidth>innerWidth+2,small:controls.filter(e=>e.getBoundingClientRect().height<43.5).length};});assert.equal(r.overflow,false);assert.equal(r.small,0);checked(name);}
async function save(page,pin){await page.getByLabel('New PIN',{exact:true}).fill(pin);await page.getByLabel('Confirm PIN',{exact:true}).fill(pin);await page.getByRole('button',{name:'Save',exact:true}).filter({visible:true}).click();await page.getByRole('status').filter({hasText:'PIN saved'}).waitFor();}
async function verify(page,pin){await page.getByLabel('Employee PIN',{exact:true}).fill(pin);await page.getByRole('button',{name:'Continue',exact:true}).click();}
try{
 app=await createOwnedNextApp(evidence,{clockerPinKey:randomBytes(32).toString('hex')});
 const q=(text,values=[])=>app.database.executor.query({text,values});
 await seedOwnedApp(app.database.executor);
 await q("INSERT INTO employees(id,first_name,last_name,phone,role,primary_location_id) VALUES('C2-EMPLOYEE','Avery','QA','555','EMPLOYEE','loc-1'); INSERT INTO employee_location_eligibility VALUES('C2-EMPLOYEE','loc-1')");
 for(const engine of ['chromium','webkit']){
  const browser=await playwright[engine].launch();browsers.push(browser);const owner=await context(browser);await login(owner);
  const p=await owner.newPage();p.setDefaultTimeout(15000);const errors=[];p.on('pageerror',e=>errors.push(e.message));
  await goto(p,'/app/employees/C2-EMPLOYEE/clocker-pin');await save(p,'0246');
  assert.equal(await p.getByLabel('New PIN',{exact:true}).inputValue(),'');
  assert.equal(await p.getByLabel('Confirm PIN',{exact:true}).inputValue(),'');checked(engine+': secure PIN setup clears the inputs');
  await goto(p,'/app/settings/clocker');await p.getByRole('button',{name:'Add device',exact:true}).click();
  const d=p.getByRole('dialog');await d.getByLabel('Device name',{exact:true}).fill(engine+' PIN tablet');await d.getByRole('combobox',{name:'Location',exact:true}).selectOption('loc-1');await d.getByRole('button',{name:'Create setup code',exact:true}).click();await d.waitFor({state:'hidden'});
  const code=await p.getByRole('textbox',{name:'Setup code',exact:true}).inputValue();
  const tablet=await context(browser,{width:1024,height:768});const t=await tablet.newPage();await t.clock.install();t.setDefaultTimeout(15000);t.on('pageerror',e=>errors.push(e.message));
  await goto(t,'/clocker/2');await t.getByRole('textbox',{name:'Setup code',exact:true}).fill(code);await t.getByRole('button',{name:'Connect tablet',exact:true}).click();await t.getByRole('heading',{name:'Enter your PIN',exact:true}).waitFor();
  await verify(t,'9999');await t.locator('main [role=alert]').filter({hasText:'PIN not recognized'}).waitFor();checked(engine+': wrong PIN does not reveal identity');
  await verify(t,'0246');await t.getByRole('heading',{name:'Hi, Avery.',exact:true}).waitFor();
  assert.equal(await t.getByRole('button',{name:'Clock In',exact:true}).count(),0);
  const meta=(await tablet.cookies()).filter(c=>c.name==='nevora_clocker_identity').map(({httpOnly,sameSite})=>({httpOnly,sameSite}));assert.deepEqual(meta,[{httpOnly:true,sameSite:'Strict'}]);
  checked(engine+': actual PIN verification uses protected cookie and exposes no fake punch action');
  await t.getByRole('button',{name:'Done',exact:true}).click();await t.getByRole('heading',{name:'Enter your PIN',exact:true}).waitFor();
  await t.waitForFunction(()=>{const input=document.querySelector('input[name=pin]');return input&&!input.matches(':disabled');});
  assert.equal((await q('SELECT count(*)::int AS n FROM clocker_pin_sessions'))[0].n,0);checked(engine+': Done clears shared-tablet identity');
  await goto(p,'/app/employees/C2-EMPLOYEE/clocker-pin');await save(p,'1357');
  await verify(t,'0246');await t.locator('main [role=alert]').filter({hasText:'PIN not recognized'}).waitFor();
  await verify(t,'1357');await t.getByRole('heading',{name:'Hi, Avery.',exact:true}).waitFor();checked(engine+': reset rejects old PIN and accepts the new one');
  await t.keyboard.press('Escape');await t.getByRole('heading',{name:'Enter your PIN',exact:true}).waitFor();checked(engine+': Escape clears identity');
  await t.waitForFunction(()=>{const input=document.querySelector('input[name=pin]');return input&&!input.matches(':disabled');});
  let dropped=false;
  await t.route('**/api/clocker/2/pin',async route=>{
   if(!dropped&&JSON.parse(route.request().postData()??'{}').action==='verify'){dropped=true;const response=await route.fetch();assert.equal(response.status(),200);await route.abort('failed');}
   else await route.continue();
  });
  await verify(t,'1357');await t.locator('main [role=alert]').waitFor();assert(dropped,'Response-loss injection ran');
  assert(await t.getByLabel('Employee PIN',{exact:true}).isDisabled(),'Ambiguous verification must block blind PIN resubmission');
  await t.unroute('**/api/clocker/2/pin');await t.getByRole('button',{name:'Check Connection',exact:true}).click();
  await t.waitForFunction(()=>{const input=document.querySelector('input[name=pin]');return input&&!input.matches(':disabled');});
  assert.equal((await q('SELECT count(*)::int AS n FROM clocker_pin_sessions'))[0].n,0);
  checked(engine+': lost-response recovery clears ambiguous verification without replaying the PIN');

  // Preserve the complete legal employee name on narrow screens, rather than clipping it.
  const longName='Alexandria'+('x'.repeat(65));
  await q("UPDATE employees SET first_name=$1,updated_at=clock_timestamp() WHERE id='C2-EMPLOYEE'",[longName]);
  await t.setViewportSize({width:320,height:740});await verify(t,'1357');
  await t.getByRole('heading',{name:`Hi, ${longName}.`,exact:true}).waitFor();
  const longNameFile=join(evidence,engine+'-long-name-320.png');
  await t.screenshot({path:longNameFile,fullPage:true});report.screenshots.push(longNameFile);
  await geometry(t,engine+': complete long employee name at 320px');
  await t.getByRole('button',{name:'Done',exact:true}).click();
  await t.waitForFunction(()=>{const input=document.querySelector('input[name=pin]');return input&&!input.matches(':disabled');});
  await q("UPDATE employees SET first_name='Avery',updated_at=clock_timestamp() WHERE id='C2-EMPLOYEE'");

  // Exercise the actual privacy timeout, not a source-text assertion or a mocked reset.
  await verify(t,'1357');await t.getByRole('heading',{name:'Hi, Avery.',exact:true}).waitFor();
  await t.getByRole('heading',{name:'Enter your PIN',exact:true}).waitFor({timeout:35000});
  await t.waitForFunction(()=>{const input=document.querySelector('input[name=pin]');return input&&!input.matches(':disabled');});
  assert.equal((await q('SELECT count(*)::int AS n FROM clocker_pin_sessions'))[0].n,0);
  checked(engine+': thirty-second privacy timeout clears both UI and server identity');
  await verify(t,'1357');await t.getByRole('heading',{name:'Hi, Avery.',exact:true}).waitFor();
  await t.clock.fastForward(31000);
  await t.getByRole('heading',{name:'Enter your PIN',exact:true}).waitFor();
  await t.waitForFunction(()=>{const input=document.querySelector('input[name=pin]');return input&&!input.matches(':disabled');});
  assert.equal((await q('SELECT count(*)::int AS n FROM clocker_pin_sessions'))[0].n,0);
  checked(engine+': automatic privacy timeout clears the display and server identity');
  await verify(t,'1357');await t.getByRole('heading',{name:'Hi, Avery.',exact:true}).waitFor();
  await t.evaluate(()=>window.dispatchEvent(new PageTransitionEvent('pageshow',{persisted:true})));
  await t.getByRole('heading',{name:'Enter your PIN',exact:true}).waitFor({timeout:4000});
  await t.waitForFunction(()=>{const input=document.querySelector('input[name=pin]');return input&&!input.matches(':disabled');});
  assert.equal((await q('SELECT count(*)::int AS n FROM clocker_pin_sessions'))[0].n,0);
  checked(engine+': restored-page event cannot resurrect a prior employee identity');
  await q("UPDATE employees SET first_name=$1,updated_at=clock_timestamp() WHERE id='C2-EMPLOYEE'",['A'.repeat(70)]);
  await t.setViewportSize({width:320,height:740});await verify(t,'1357');await t.getByRole('heading',{name:'Hi, '+'A'.repeat(70)+'.',exact:true}).waitFor();
  await geometry(t,engine+': long employee name at 320px');
  await t.getByRole('button',{name:'Done',exact:true}).click();
  await t.waitForFunction(()=>{const input=document.querySelector('input[name=pin]');return input&&!input.matches(':disabled');});
  await q("UPDATE employees SET first_name='Avery',updated_at=clock_timestamp() WHERE id='C2-EMPLOYEE'");


  for(const width of [320,375,390,430,768,1024,1440]){await p.setViewportSize({width,height:900});await goto(p,'/app/employees/C2-EMPLOYEE/clocker-pin');await geometry(p,engine+': management '+width);
   if([390,1440].includes(width)){const file=join(evidence,engine+'-pin-management-'+width+'.png');await p.screenshot({path:file,fullPage:true});report.screenshots.push(file);}}
  for(const viewport of [{width:1024,height:768},{width:768,height:1024},{width:320,height:740}]){await t.setViewportSize(viewport);await geometry(t,engine+': PIN keypad '+viewport.width+'x'+viewport.height);
   const file=join(evidence,engine+'-pin-tablet-'+viewport.width+'x'+viewport.height+'.png');await t.screenshot({path:file,fullPage:true});report.screenshots.push(file);}
  assert.deepEqual(errors,[]);checked(engine+': no runtime/hydration errors');await tablet.close();await owner.close();await browser.close();
 }
}catch(error){report.errors.push(String(error.stack??error));process.exitCode=1;}
finally{for(const b of browsers)await b.close().catch(()=>{});if(app)await app.close().catch(e=>{report.errors.push(String(e));process.exitCode=1;});await writeFile(join(evidence,'report.json'),JSON.stringify(report,null,2));console.log(JSON.stringify({checks:report.checks.length,errors:report.errors,evidence},null,2));}
