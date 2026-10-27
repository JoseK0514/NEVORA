import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {randomBytes} from 'node:crypto';
import {homedir} from 'node:os';
import {join,resolve} from 'node:path';
import {mkdir,writeFile} from 'node:fs/promises';
import {createOwnedNextApp} from '../src/test/integration/owned-next-app.ts';
import {seedOwnedApp,TEST_PASSWORD} from '../src/test/integration/owned-app-fixture.ts';
const runtime=createRequire(process.env.NEVORA_PLAYWRIGHT_RUNTIME_PACKAGE??join(homedir(),'.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/package.json'));
const playwright=runtime('playwright');
const evidence=resolve(process.env.PHASE_C_EVIDENCE_DIR??'.omo/evidence/clocker-ipad');await mkdir(evidence,{recursive:true});
let app;const checks=[];
const q=(text,values=[])=>app.database.executor.query({text,values});
async function shot(page,name){await page.evaluate(()=>document.fonts.ready);await page.screenshot({path:join(evidence,name+'.png'),fullPage:true,animations:'disabled'});}
async function idle(page){await page.getByRole('heading',{name:'Enter your PIN',exact:true}).waitFor();await page.waitForFunction(()=>{const i=document.querySelector('input[name=pin]');return i&&!i.matches(':disabled');});}
async function geometry(page,label){const result=await page.evaluate(()=>{const visible=e=>{const r=e.getBoundingClientRect();return r.width>0&&r.height>0;};const controls=[...document.querySelectorAll('main button,main input,main textarea')].filter(visible);return {overflow:document.documentElement.scrollWidth>innerWidth+1,small:controls.filter(e=>e.getBoundingClientRect().height<44).length,font:getComputedStyle(document.querySelector('main')).fontFamily};});assert.equal(result.overflow,false,label+' overflow');assert.equal(result.small,0,label+' touch targets');assert(!result.font.includes('Nevora Clocker'));checks.push(label);}
async function context(browser,viewport={width:1024,height:768}){
 const c=await browser.newContext({viewport,serviceWorkers:'block'});
 await c.route('**/*',r=>new URL(r.request().url()).origin===app.url?r.continue():r.abort());return c;
}
async function goto(page,path){const r=await page.goto(app.url+path,{waitUntil:'networkidle'});assert.equal(r.status(),200,'Working route '+path);}
async function login(c){const p=await c.newPage();await goto(p,'/login');await p.getByLabel('Employee ID',{exact:true}).fill('QAOWNER');await p.getByLabel('Password',{exact:true}).fill(TEST_PASSWORD);
 await Promise.all([p.waitForURL(u=>u.pathname==='/app'),p.getByRole('button',{name:'Sign in',exact:true}).click()]);return p;}
async function savePin(p,id,pin){await goto(p,`/app/employees/${id}/clocker-pin`);await p.getByLabel('New PIN',{exact:true}).fill(pin);await p.getByLabel('Confirm PIN',{exact:true}).fill(pin);const save=p.getByRole('button',{name:'Save',exact:true});assert.equal(await save.getAttribute('form'),'clocker-pin-form');await save.click();await p.getByRole('status').filter({hasText:'PIN saved'}).waitFor();}
async function enroll(owner,p,name){
 await goto(owner,'/app/settings/clocker');await owner.getByLabel('Add device',{exact:true}).click();
 const d=owner.getByRole('dialog');await d.getByLabel('Device name',{exact:true}).fill(name);await d.getByRole('combobox',{name:'Location',exact:true}).selectOption('loc-1');await d.getByRole('button',{name:'Create setup code',exact:true}).click();await d.waitFor({state:'hidden'});
 const displayedSetup=owner.getByRole('textbox',{name:/^Setup code · expires /});assert.equal(await displayedSetup.getAttribute('readonly'),'');const code=await displayedSetup.inputValue();assert(code);
 await goto(p,'/clocker/2');await p.getByRole('heading',{name:'Set up this tablet',exact:true}).waitFor();await p.evaluate(()=>document.fonts.ready);await shot(p,name+'-setup');await p.getByRole('textbox',{name:'Setup code',exact:true}).fill(code);await p.getByRole('button',{name:'Connect tablet',exact:true}).click();await idle(p);
}

try{
 app=await createOwnedNextApp(evidence,{clockerPinKey:randomBytes(32).toString('hex'),clockerPunchEnabled:true,clockerUiV2:true});await seedOwnedApp(app.database.executor);
 await q("INSERT INTO employees(id,first_name,last_name,phone,role,primary_location_id) VALUES('IPAD-A','Avery','QA','555','EMPLOYEE','loc-1');INSERT INTO employee_location_eligibility VALUES('IPAD-A','loc-1')");
 for(const engine of ['chromium','webkit']){
  const browser=await playwright[engine].launch();try{
   const owner=await context(browser,{width:1440,height:1000}),ownerPage=await login(owner);await savePin(ownerPage,'IPAD-A','2468');const tablet=await context(browser),page=await tablet.newPage();page.setDefaultTimeout(20000);const errors=[];page.on('pageerror',error=>errors.push(error.message));
   await enroll(ownerPage,page,engine+' iPad');assert.equal(await page.locator('[data-clocker-v2=true]').count(),1);
   for(const [width,height] of [[768,1024],[1024,768],[1366,1024]]){await page.setViewportSize({width,height});await geometry(page,engine+' '+width+'x'+height);await shot(page,engine+'-pin-'+width);}
   await page.setViewportSize({width:1024,height:768});await page.evaluate(()=>document.documentElement.style.fontSize='200%');await geometry(page,engine+' enlarged text');await page.waitForFunction(()=>document.querySelector('main').dataset.clockerStacked==='true');await shot(page,engine+'-enlarged');await page.evaluate(()=>document.documentElement.style.fontSize='');
   await page.getByRole('button',{name:'Switch language to Spanish',exact:true}).click();await page.getByRole('heading',{name:'Ingresa tu PIN',exact:true}).waitFor();assert.equal(await page.locator('.clocker-es').count(),0);for(const n of '0000')await page.getByRole('button',{name:'Número '+n,exact:true}).click();await page.getByRole('button',{name:'Continuar',exact:true}).click();await page.getByRole('alert').filter({hasText:'PIN no reconocido'}).waitFor();assert.equal(await page.locator('main').getAttribute('lang'),'es');
   for(const n of '2468')await page.getByRole('button',{name:'Número '+n,exact:true}).click();await page.getByRole('button',{name:'Continuar',exact:true}).click();await page.getByRole('heading',{name:'Hola, Avery.',exact:true}).waitFor();await page.getByRole('button',{name:'Marcar entrada',exact:true}).waitFor();await geometry(page,engine+' Spanish verified');await shot(page,engine+'-verified-es');await page.getByRole('button',{name:'Listo',exact:true}).click();await page.getByRole('button',{name:'Cambiar idioma a inglés',exact:true}).click();await idle(page);
   assert.deepEqual(errors,[]);checks.push(engine+' real enrollment, language and PIN outcomes');await tablet.close();await owner.close();
  }finally{await browser.close();}
 }
 await writeFile(join(evidence,'clocker-ipad-results.json'),JSON.stringify({checks,limits:['Owned local Next/PostgreSQL only. Physical iPad acceptance pending.']},null,2));console.log('PASS: '+checks.length+' Clocker iPad presentation checks.');
}finally{if(app)await app.close();}
