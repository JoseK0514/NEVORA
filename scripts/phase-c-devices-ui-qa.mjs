import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {homedir} from 'node:os';
import {join,resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
import {mkdir,readFile,writeFile} from 'node:fs/promises';
import {createOwnedNextApp} from '../src/test/integration/owned-next-app.ts';
import {seedOwnedApp,TEST_PASSWORD} from '../src/test/integration/owned-app-fixture.ts';
import {hashPassword} from '../src/lib/auth/password.ts';

const evidence=resolve(process.env.PHASE_C_EVIDENCE_DIR??join(homedir(),'.codex/visualizations/2026/10/05/nevora-c1-ui'));
await mkdir(evidence,{recursive:true});
const runtime=createRequire(join(homedir(),'.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/package.json'));
const playwrightModule=await import(pathToFileURL(runtime.resolve('playwright')).href);
const playwright=playwrightModule.default??playwrightModule;
const report={checks:[],errors:[],screenshots:[],limits:['Browser plugin not listed; existing Playwright harness used.','Owned local PostgreSQL and scratch Next runtime; no hosted or physical-iPad verification.']};
let app;
const browsers=[];
function checked(name){report.checks.push(name);console.log(`[C1 browser] PASS ${name}`);}
async function login(context,id='QAOWNER'){
 const page=await context.newPage();await page.goto(app.url+'/login');
 await page.getByLabel('Employee ID',{exact:true}).fill(id);await page.getByLabel('Password',{exact:true}).fill(TEST_PASSWORD);
 await Promise.all([page.waitForURL(url=>url.pathname==='/app'),page.getByRole('button',{name:'Sign In',exact:true}).click()]);
 await page.close();
}
async function newContext(browser,viewport={width:1440,height:1000}){
 const context=await browser.newContext({viewport,serviceWorkers:'block'});
 await context.route('**/*',route=>new URL(route.request().url()).origin===app.url?route.continue():route.abort());
 return context;
}
async function goto(page,path){
 const result=await page.goto(app.url+path,{waitUntil:'networkidle'});
 assert.equal(result.status(),200,`Expected working route ${path}, got ${result.status()}`);
}
async function addDevice(page,name){
 await page.getByRole('button',{name:'Add Device',exact:true}).click();
 const dialog=page.getByRole('dialog');await dialog.getByLabel('Device name',{exact:true}).fill(name);
 await dialog.getByRole('combobox',{name:'Location',exact:true}).selectOption('loc-1');
 await dialog.getByRole('button',{name:'Create Setup Code',exact:true}).click();
 await dialog.waitFor({state:'hidden'});
 return page.getByRole('textbox',{name:'Setup code',exact:true}).inputValue();
}
const row=(page,name)=>page.locator('[data-clocker-device]').filter({has:page.getByRole('heading',{name,exact:true})});
async function action(page,name,button){
 await row(page,name).getByRole('button',{name:`Manage ${name}`,exact:true}).click();
 await page.getByRole('button',{name:button,exact:true}).click();
 return page.getByRole('dialog');
}
async function connect(page,code){
 await page.getByRole('heading',{name:'Set Up This Tablet',exact:true}).waitFor();
 await page.getByRole('textbox',{name:'Setup code',exact:true}).fill(code);
 await page.getByRole('button',{name:'Connect Tablet',exact:true}).click();
 await page.getByRole('heading',{name:'Tablet Connected',exact:true}).waitFor();
}
async function geometry(page,label){
 const result=await page.evaluate(()=>{
  const visible=e=>{const r=e.getBoundingClientRect(),s=getComputedStyle(e);return r.width>0&&r.height>0&&s.visibility!=='hidden'&&s.display!=='none';};
  const controls=[...document.querySelectorAll('button,a.button,input:not([type=hidden]),select,textarea')].filter(visible);
  return {overflow:document.documentElement.scrollWidth>document.documentElement.clientWidth+2,
   small:controls.filter(e=>e.getBoundingClientRect().height<43.5).map(e=>e.outerHTML.slice(0,150)),
   clipped:controls.filter(e=>{const r=e.getBoundingClientRect();return r.left < -2 || r.right>innerWidth+2;}).map(e=>e.outerHTML.slice(0,150))};
 });
 assert.equal(result.overflow,false,`${label}: horizontal overflow`);assert.deepEqual(result.small,[],`${label}: touch target`);assert.deepEqual(result.clipped,[],`${label}: control clipped`);
 checked(label);
}
try{
 app=await createOwnedNextApp(evidence);
 const q=(text,values=[])=>app.database.executor.query({text,values});
 await q(await readFile('db/phase-c/clocker-devices.sql','utf8'));await seedOwnedApp(app.database.executor);
 const passwordHash=await hashPassword(TEST_PASSWORD);
 await q("INSERT INTO employees(id,first_name,last_name,phone,role,primary_location_id) VALUES('C1-MANAGER','Test','Manager','555','MANAGER','loc-1'); INSERT INTO employee_location_eligibility VALUES('C1-MANAGER','loc-1')");
 await q('INSERT INTO employee_credentials(employee_id,password_hash,must_change_password) VALUES($1,$2,false)',['C1-MANAGER',passwordHash]);
 for(let n=0;n<18;n++)await q("INSERT INTO locations(id,workspace_id,clocker_key,name,short_name) VALUES($1,'workspace-fuel',$1,$2,$3)",[`c1-location-${n}`,`Regional Operations Center ${n} — Customer Services and Field Support`,`Region ${n}`]);
 for(const engine of ['chromium','webkit']){
  const browser=await playwright[engine].launch();browsers.push(browser);
  const owner=await newContext(browser);await login(owner);
  const ownerPage=await owner.newPage();ownerPage.setDefaultTimeout(15000);
  const runtimeErrors=[];ownerPage.on('pageerror',error=>runtimeErrors.push(error.message));
  await goto(ownerPage,'/app/settings/clocker');
  await ownerPage.getByRole('heading',{name:'Clocker Devices',exact:true}).waitFor();
  const name=`${engine} Reception tablet`;
  const code=await addDevice(ownerPage,name);assert.match(code,/^nev_enr_[a-f0-9]{64}$/);
  checked(`${engine}: Owner creates one-use setup code through real server action`);
  const tablet=await newContext(browser,{width:1024,height:768});const tabletPage=await tablet.newPage();tabletPage.setDefaultTimeout(15000);
  tabletPage.on('pageerror',error=>runtimeErrors.push(error.message));
  await goto(tabletPage,'/clocker/2');
  await geometry(tabletPage,`${engine}: tablet setup form`);
  const setupImage=join(evidence,`${engine}-tablet-setup.png`);await tabletPage.screenshot({path:setupImage,fullPage:true});report.screenshots.push(setupImage);
  await connect(tabletPage,code);
  assert.equal(await tabletPage.getByRole('button',{name:'Clock In',exact:true}).count(),0,'No demonstration punch should be exposed');
  const cookieMetadata=(await tablet.cookies()).filter(cookie=>cookie.name==='nevora_clocker').map(({httpOnly,sameSite,path})=>({httpOnly,sameSite,path}));
  assert.deepEqual(cookieMetadata,[{httpOnly:true,sameSite:'Strict',path:'/'}]);
  checked(`${engine}: tablet enrollment uses HttpOnly cookie and never enables fake punches`);
  await goto(ownerPage,'/app/settings/clocker'); // Refresh after enrollment advanced the device version.
  const stale=await owner.newPage();await goto(stale,'/app/settings/clocker');
  let dialog=await action(ownerPage,name,'Rename');await dialog.getByLabel('Device name',{exact:true}).fill(name+' renamed');await dialog.getByRole('button',{name:'Save Name',exact:true}).click();await dialog.waitFor({state:'hidden'});
  checked(`${engine}: rename persists and refreshes local optimistic version`);
  dialog=await action(stale,name,'Revoke Access');await dialog.getByRole('button',{name:'Revoke Device',exact:true}).click();
  await dialog.getByRole('alert').filter({hasText:'changed'}).waitFor();
  assert.equal((await q('SELECT active FROM clocker_devices WHERE name=$1',[name+' renamed']))[0].active,true);
  checked(`${engine}: stale Owner view cannot revoke a newer device`);await stale.close();
  dialog=await action(ownerPage,name+' renamed','Revoke Access');await dialog.getByRole('button',{name:'Revoke Device',exact:true}).click();await dialog.waitFor({state:'hidden'});
  await tabletPage.reload();await tabletPage.getByRole('heading',{name:'Set Up This Tablet',exact:true}).waitFor();
  checked(`${engine}: revocation is reflected on the actual tablet`);
  dialog=await action(ownerPage,name+' renamed','Reconnect Tablet');await dialog.getByRole('button',{name:'Create New Code',exact:true}).click();await dialog.waitFor({state:'hidden'});
  const replacementCode=await ownerPage.getByRole('textbox',{name:'Setup code',exact:true}).inputValue();
  await connect(tabletPage,replacementCode);checked(`${engine}: replacement/re-enrollment flow recovers a revoked tablet`);
  // Commit the enrollment but lose its response; the UI must reconcile, not blindly replay.
  const recoveryCode=await addDevice(ownerPage,`${engine} Recovery tablet`);
  const recovery=await newContext(browser,{width:768,height:1024});const recoveryPage=await recovery.newPage();
  await goto(recoveryPage,'/clocker/2');
  let dropped=false;
  await recoveryPage.route('**/api/clocker/2/setup',async route=>{
    if(!dropped&&JSON.parse(route.request().postData()??'{}').step==='redeem'){
      dropped=true;const committed=await route.fetch();assert.equal(committed.status(),200);await route.abort('failed');
    }else await route.continue();
  });
  await recoveryPage.getByRole('textbox',{name:'Setup code',exact:true}).fill(recoveryCode);
  await recoveryPage.getByRole('button',{name:'Connect Tablet',exact:true}).click();
  await recoveryPage.locator('main').getByRole('alert').filter({hasText:'could not confirm'}).waitFor();
  assert(dropped,'the owned enrollment response must have been deliberately lost');
  await recoveryPage.unroute('**/api/clocker/2/setup');
  await recoveryPage.getByRole('button',{name:'Check Setup',exact:true}).click();
  await recoveryPage.getByRole('heading',{name:'Tablet Connected',exact:true}).waitFor();
  checked(`${engine}: browser recovers a lost committed enrollment response`);
  await recoveryPage.route('**/api/clocker/2/setup',route=>route.abort('failed'));
  await recoveryPage.getByRole('button',{name:'Check Connection',exact:true}).click();
  await recoveryPage.locator('main').getByRole('alert').filter({hasText:'could not confirm'}).waitFor();
  assert.equal(await recoveryPage.getByRole('heading',{name:'Tablet Connected',exact:true}).count(),0,'Failed status check must not keep a connected headline');
  await geometry(recoveryPage,`${engine}: tablet recovery screen`);
  const recoveryImage=join(evidence,`${engine}-tablet-recovery.png`);await recoveryPage.screenshot({path:recoveryImage,fullPage:true});report.screenshots.push(recoveryImage);
  await recoveryPage.unroute('**/api/clocker/2/setup');
  await recoveryPage.getByRole('button',{name:'Check Setup',exact:true}).click();
  await recoveryPage.getByRole('heading',{name:'Tablet Connected',exact:true}).waitFor();
  checked(`${engine}: outage is distinct from connected and recovers without reenrollment`);
  await recovery.close();
  // Request-security probes use only this owned application and synthetic records.
  const before=await q('SELECT count(*)::int AS count FROM clocker_device_events');
  const forbidden=await tablet.request.post(app.url+'/api/clocker/2/setup',{headers:{Origin:'https://evil.invalid','X-Nevora-Clocker':'1'},data:{step:'prepare'}});
  assert.equal(forbidden.status(),403);assert.deepEqual(await q('SELECT count(*)::int AS count FROM clocker_device_events'),before);
  checked(`${engine}: real HTTP boundary rejects cross-origin requests`);
  const manager=await newContext(browser);await login(manager,'C1-MANAGER');const managerPage=await manager.newPage();await managerPage.goto(app.url+'/app/settings/clocker');
  assert.notEqual(new URL(managerPage.url()).pathname,'/app/settings/clocker');checked(`${engine}: Manager cannot open Owner device setup`);await manager.close();
  // A same-tablet Owner handoff must revoke that tablet's portal session.
  const handoffCode=await addDevice(ownerPage,`${engine} Dedicated handoff tablet`);
  await goto(ownerPage,'/clocker/2');await connect(ownerPage,handoffCode);
  assert(!(await owner.cookies()).some(cookie=>cookie.name==='fuel_session'));
  await ownerPage.goto(app.url+'/app/settings/clocker');assert.equal(new URL(ownerPage.url()).pathname,'/login');
  checked(`${engine}: successful shared-tablet handoff removes Owner access from that browser`);
  await owner.close();
  const review=await newContext(browser);await login(review);const reviewPage=await review.newPage();
  for(const width of [320,375,390,430,768,1024,1440]){
   await reviewPage.setViewportSize({width,height:width<500?844:1000});await goto(reviewPage,'/app/settings/clocker');
   await geometry(reviewPage,`${engine}: Owner devices ${width}px`);
   await reviewPage.getByRole('button',{name:'Add Device',exact:true}).click();await geometry(reviewPage,`${engine}: device dialog ${width}px`);
   if(width===390){const file=join(evidence,`${engine}-device-dialog-390.png`);await reviewPage.screenshot({path:file,fullPage:true});report.screenshots.push(file);}
   await reviewPage.keyboard.press('Escape');await reviewPage.getByRole('dialog').waitFor({state:'hidden'});
   await reviewPage.waitForFunction(()=>document.activeElement?.textContent?.trim()==='Add Device',null,{timeout:1500});
   assert(await reviewPage.getByRole('button',{name:'Add Device',exact:true}).evaluate(e=>document.activeElement===e),'Dialog must restore focus');
   if([390,1440].includes(width)){const file=join(evidence,`${engine}-devices-${width}.png`);await reviewPage.screenshot({path:file,fullPage:true});report.screenshots.push(file);}
  }
  for(const viewport of [{width:1024,height:768},{width:768,height:1024},{width:320,height:740}]){
   await tabletPage.setViewportSize(viewport);await goto(tabletPage,'/clocker/2');await tabletPage.getByRole('heading',{name:'Tablet Connected',exact:true}).waitFor();
   await geometry(tabletPage,`${engine}: connected tablet ${viewport.width}x${viewport.height}`);
   const file=join(evidence,`${engine}-tablet-${viewport.width}x${viewport.height}.png`);await tabletPage.screenshot({path:file,fullPage:true});report.screenshots.push(file);
  }
  assert.deepEqual(runtimeErrors,[],'No unexpected JavaScript runtime errors');checked(`${engine}: console/runtime health`);
  await review.close();await tablet.close();await browser.close();
 }
}catch(error){report.errors.push(String(error.stack??error));process.exitCode=1;}
finally{
 for(const browser of browsers)await browser.close().catch(()=>{});
 if(app)await app.close().catch(error=>{report.errors.push(String(error));process.exitCode=1;});
 await writeFile(join(evidence,'report.json'),JSON.stringify(report,null,2));
 console.log(JSON.stringify({checks:report.checks.length,errors:report.errors,evidence},null,2));
}
