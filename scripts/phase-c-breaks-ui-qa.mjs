import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { homedir } from 'node:os';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { createOwnedNextApp } from '../src/test/integration/owned-next-app.ts';
import { seedOwnedApp,assignOwnedManagerCompanyAccess, TEST_PASSWORD } from '../src/test/integration/owned-app-fixture.ts';
import { hashPassword } from '../src/lib/auth/password.ts';
const evidence=resolve(process.env.PHASE_C_EVIDENCE_DIR??join(homedir(),'.codex/visualizations/2026/10/05/nevora-c5-ui'));
await mkdir(evidence,{recursive:true});
const runtime=createRequire(join(homedir(),'.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/package.json'));
const pw=await import(pathToFileURL(runtime.resolve('playwright')).href),playwright=pw.default??pw;
const report={checks:[],errors:[],screenshots:[],limits:['Browser plugin not listed; existing Playwright used.','Owned local PostgreSQL and scratch Next, not hosted Neon or physical iPad.']};
const browsers=[];let app;
const checked=name=>{report.checks.push(name);console.log('[C5 browser] PASS '+name);};
async function context(browser){const c=await browser.newContext({viewport:{width:1440,height:1000},serviceWorkers:'block'});await c.route('**/*',r=>new URL(r.request().url()).origin===app.url?r.continue():r.abort());return c;}
async function goto(page,path){const response=await page.goto(app.url+path,{waitUntil:'networkidle'});assert.equal(response.status(),200,'Working route '+path);}
async function login(c,id='QAOWNER'){const p=await c.newPage();await goto(p,'/login');await p.getByLabel('Employee ID',{exact:true}).fill(id);await p.getByLabel('Password',{exact:true}).fill(TEST_PASSWORD);await Promise.all([p.waitForURL(u=>u.pathname==='/app'),p.getByRole('button',{name:'Sign in',exact:true}).click()]);await p.close();}
async function create(page,name){await page.getByRole('button',{name:'Add break type',exact:true}).click();const d=page.getByRole('dialog');await d.getByLabel('Break name',{exact:true}).fill(name);await d.getByRole('combobox',{name:'Classification',exact:true}).selectOption('REST');await d.getByLabel(/^Reference time/).fill('15');await d.getByRole('button',{name:'Create break type',exact:true}).click();await d.waitFor({state:'hidden'});}
const row=(page,name)=>page.getByRole('button',{name:`Edit ${name}`,exact:true});
async function action(page,name,operation){await row(page,name).click();const dialog=page.getByRole('dialog');if(operation!=='Edit')await dialog.getByRole('button',{name:operation+' break type',exact:true}).click();return dialog;}
async function geometry(page,label){const r=await page.evaluate(()=>{const visible=e=>{const b=e.getBoundingClientRect();return b.width>0&&b.height>0&&getComputedStyle(e).visibility!=='hidden';};const root=document.querySelector('dialog[open]')??document;const controls=[...root.querySelectorAll('button,a.button,input:not([type=hidden]),select')].filter(visible);return {overflow:document.documentElement.scrollWidth>innerWidth+2,small:controls.filter(e=>{const b=e.getBoundingClientRect();if(b.height>=43.5)return false;const x=b.left+b.width/2,y=b.top+b.height/2,hit=point=>{const target=document.elementFromPoint(x,point);return target===e||e.contains(target);};return !hit(y-21.75)||!hit(y+21.75);}).map(e=>e.outerHTML.slice(0,90)),clipped:controls.filter(e=>{const b=e.getBoundingClientRect();return b.left< -2||b.right>innerWidth+2;}).map(e=>e.outerHTML.slice(0,90))};});assert.equal(r.overflow,false,label+' overflow');assert.deepEqual(r.small,[],label+' touch targets');assert.deepEqual(r.clipped,[],label+' clipping');checked(label);}
try{
 app=await createOwnedNextApp(evidence);const q=(text,values=[])=>app.database.executor.query({text,values});
 await seedOwnedApp(app.database.executor);
 await q("INSERT INTO employees(id,first_name,last_name,phone,role,primary_location_id) VALUES('C5-MANAGER','Morgan','QA','555','MANAGER','loc-1')");
 await q('INSERT INTO employee_credentials(employee_id,password_hash,must_change_password) VALUES($1,$2,false)',['C5-MANAGER',await hashPassword(TEST_PASSWORD)]);
 await assignOwnedManagerCompanyAccess(app.database.executor,'C5-MANAGER');
 for(const engine of ['chromium','webkit']){
  const browser=await playwright[engine].launch();browsers.push(browser);const owner=await context(browser);await login(owner);
  const p=await owner.newPage();p.setDefaultTimeout(15000);const errors=[],consoleErrors=[];p.on('pageerror',e=>errors.push(e.message));p.on('console',m=>{if(m.type()==='error')consoleErrors.push(m.text());});
  await goto(p,'/app/settings/breaks');await p.getByRole('heading',{name:'Break types',exact:true}).waitFor();assert((await p.title()).length>0);assert.equal(new URL(p.url()).pathname,'/app/settings/breaks');
  if(engine==='chromium'){const empty=p.getByRole('list',{name:'Configured break types',exact:true});await empty.getByText('No break types yet',{exact:true}).waitFor();assert.equal(await empty.getByText('0 break types',{exact:true}).count(),0,'An empty list shows its empty row, not a 0 count');}
  const name=engine+' Rest break';await create(p,name);await row(p,name).waitFor();checked(engine+': Owner explicitly creates a break type through the real server action');
  assert.equal((await q('SELECT count(*)::int AS n FROM clocker_break_types WHERE name=$1',[name]))[0].n,1);
  const stale=await owner.newPage();await goto(stale,'/app/settings/breaks');
  let d=await action(p,name,'Edit');await d.getByLabel(/^Reference time/).fill('20');await d.getByRole('button',{name:'Save changes',exact:true}).click();await d.waitFor({state:'hidden'});
  await row(p,name).getByText(/^20\s*min$/).waitFor();checked(engine+': edited settings persist with the new version');
  d=await action(stale,name,'Edit');await d.getByLabel(/^Reference time/).fill('25');await d.getByRole('button',{name:'Save changes',exact:true}).click();await d.getByRole('alert').filter({hasText:'changed'}).waitFor();assert(await d.getByLabel('Break name',{exact:true}).isDisabled());assert.equal(await d.getByRole('button',{name:'Save changes',exact:true}).count(),0);assert(await d.getByRole('button',{name:'Reload',exact:true}).isVisible());
  assert.equal((await q('SELECT target_minutes FROM clocker_break_types WHERE name=$1',[name]))[0].target_minutes,20);checked(engine+': stale tab cannot overwrite a newer configuration');await stale.close();
  d=await action(p,name,'Archive');await d.getByRole('heading',{name:'Archive this break type?',exact:true}).waitFor();await d.getByRole('button',{name:'Archive break type',exact:true}).click();await d.waitFor({state:'hidden'});await p.getByRole('list',{name:'Archived break types',exact:true}).getByRole('button',{name:`Edit ${name}`,exact:true}).waitFor();await p.getByRole('list',{name:'Archived break types',exact:true}).getByText(/^Archived \(\d+\)$/).waitFor();assert.equal(await p.getByRole('list',{name:'Configured break types',exact:true}).getByRole('button',{name:`Edit ${name}`,exact:true}).count(),0);assert.equal((await q('SELECT active FROM clocker_break_types WHERE name=$1',[name]))[0].active,false);checked(engine+': archive is confirmed and the record remains visible');
  d=await action(p,name,'Edit');await d.getByLabel(/^Reference time/).fill('21');await d.getByRole('button',{name:'Save changes',exact:true}).click();await d.waitFor({state:'hidden'});assert.equal((await q('SELECT active FROM clocker_break_types WHERE name=$1',[name]))[0].active,false);await p.getByRole('list',{name:'Archived break types',exact:true}).getByRole('button',{name:`Edit ${name}`,exact:true}).waitFor();checked(engine+': editing an archived break preserves its archived state');
  d=await action(p,name,'Reactivate');await d.getByRole('button',{name:'Reactivate break type',exact:true}).click();await d.waitFor({state:'hidden'});await p.getByRole('list',{name:'Configured break types',exact:true}).getByRole('button',{name:`Edit ${name}`,exact:true}).waitFor();assert.equal(await p.getByRole('list',{name:'Archived break types',exact:true}).getByRole('button',{name:`Edit ${name}`,exact:true}).count(),0);assert.equal((await q('SELECT active FROM clocker_break_types WHERE name=$1',[name]))[0].active,true);checked(engine+': reactivation restores the same type rather than duplicating it');
  const longName=engine+' '+('LongBreakName'.repeat(5));await create(p,longName);
  // Commit the Owner save and deliberately lose only its response. No blind duplicate creation.
  const uncertainName=engine+' Recovered break';
  await p.getByRole('button',{name:'Add break type',exact:true}).click();d=p.getByRole('dialog');
  await d.getByLabel('Break name',{exact:true}).fill(uncertainName);await d.getByRole('combobox',{name:'Classification',exact:true}).selectOption('MEAL');
  let dropped=false;
  await p.route('**/app/settings/breaks',async route=>{
   if(!dropped&&route.request().method()==='POST'&&route.request().headers()['next-action']){
    dropped=true;const response=await route.fetch();assert.equal(response.status(),200);await route.abort('failed');
   }else await route.continue();
  });
  const priorConsole=consoleErrors.length;
  await d.getByRole('button',{name:'Create break type',exact:true}).click();await d.getByRole('alert').filter({hasText:'It may not have saved'}).waitFor();
  assert(dropped);assert(await d.getByLabel('Break name',{exact:true}).isDisabled());assert.equal(await d.getByRole('button',{name:'Create break type',exact:true}).count(),0);assert(await d.getByRole('button',{name:'Reload',exact:true}).isVisible());
  const injected=consoleErrors.splice(priorConsole);assert(injected.every(message=>/Failed to load resource|Fetch API cannot load|Load failed|Failed to fetch/.test(message)),'Only the injected network failure is expected');
  await p.unroute('**/app/settings/breaks');await d.getByRole('button',{name:'Reload',exact:true}).click();await row(p,uncertainName).waitFor();
  assert.equal((await q('SELECT count(*)::int AS n FROM clocker_break_types WHERE name=$1',[uncertainName]))[0].n,1);checked(engine+': lost save response requires reload and does not create a duplicate');
  for(const width of [320,375,390,430,768,1024,1440]){
   await p.setViewportSize({width,height:width<500?844:1000});await geometry(p,engine+': catalog '+width);
   if([390,1440].includes(width)){const file=join(evidence,engine+'-breaks-'+width+'.png');await p.screenshot({path:file,fullPage:true});report.screenshots.push(file);}
   await p.getByRole('button',{name:'Add break type',exact:true}).click();await geometry(p,engine+': editor '+width);
   if(width===390){const file=join(evidence,engine+'-break-editor-390.png');await p.screenshot({path:file,fullPage:false});report.screenshots.push(file);}
   await p.keyboard.press('Escape');await p.getByRole('dialog').waitFor({state:'hidden'});await p.waitForFunction(()=>document.activeElement?.tagName==='BUTTON'&&document.activeElement.textContent?.trim()==='Add break type');
  }
  const manager=await context(browser);await login(manager,'C5-MANAGER');const denied=await manager.newPage();await denied.goto(app.url+'/app/settings/breaks');await denied.getByText('Only Owners can open Settings.',{exact:true}).waitFor();assert.equal(await denied.getByRole('heading',{name:'Break types',exact:true}).count(),0);assert.equal(await denied.getByRole('button',{name:'Add break type',exact:true}).count(),0);checked(engine+': Manager cannot enter Owner catalog');await manager.close();
  assert.deepEqual(errors,[]);assert.deepEqual(consoleErrors,[]);checked(engine+': no framework, hydration or console errors');
  await owner.close();await browser.close();
 }
}catch(error){report.errors.push(String(error.stack??error));process.exitCode=1;}
finally{for(const b of browsers)await b.close().catch(()=>{});if(app)await app.close().catch(e=>{report.errors.push(String(e));process.exitCode=1;});await writeFile(join(evidence,'report.json'),JSON.stringify(report,null,2));console.log(JSON.stringify({checks:report.checks.length,errors:report.errors,evidence},null,2));}
