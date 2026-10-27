import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {homedir} from 'node:os';
import {join,resolve} from 'node:path';
import {mkdir,writeFile} from 'node:fs/promises';
const origin='https://nevora-clocker-staging-qa.vercel.app',location='clocker-staging';
if(process.env.NEVORA_STAGING_ACCEPTANCE!=='fictional-only'||!process.env.CLOCKER_STAGE_BYPASS||!process.env.CLOCKER_STAGE_PASSWORD)throw Error('Explicit isolated staging credentials and fictional-data acknowledgement required.');
const runtime=createRequire(join(homedir(),'.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/package.json'));
const playwright=runtime('playwright'),evidence=resolve('.superpowers/sdd/clocker-staging-20261027/browser');
await mkdir(evidence,{recursive:true});const checks=[],lostCommands=[];
async function context(browser){
 const c=await browser.newContext({viewport:{width:1024,height:768},serviceWorkers:'block'});
 await c.route('**/*',route=>{
  if(new URL(route.request().url()).origin!==origin)return route.abort();
  return route.continue({headers:{...route.request().headers(),'x-vercel-protection-bypass':process.env.CLOCKER_STAGE_BYPASS}});
 });return c;
}
async function go(page,path){const r=await page.goto(origin+path,{waitUntil:'networkidle'});assert.equal(r.status(),200,path);}
async function idle(page){await page.getByRole('heading',{name:'Enter your PIN',exact:true}).waitFor();}
async function photoCheck(portal,page,tablet,verify){
 await go(portal,'/app/settings/clocker/photos');
 await portal.getByLabel('Assistance contact',{exact:true}).fill('Fictional staging Owner desk');await portal.getByLabel('Assistance instructions',{exact:true}).fill('Fictional acceptance testing only. Ask the test Owner for an accessible alternative.');
 await portal.getByRole('button',{name:'Save assistance settings',exact:true}).click();await portal.getByRole('status').filter({hasText:'The current photo notice is prepared'}).waitFor();
 const enabled=portal.getByRole('checkbox',{name:/^Enable punch photos/});await enabled.check();
 for(const name of ['Start break','End break','Clock out'])await portal.getByRole('checkbox',{name,exact:true}).uncheck();
 await portal.getByRole('button',{name:'Save company settings',exact:true}).click();await portal.getByRole('status').filter({hasText:'Company photo settings saved'}).waitFor();
 try{
  await tablet.grantPermissions(['camera'],{origin});await page.reload();await verify();await page.getByRole('button',{name:'Clock In',exact:true}).click();
  await page.getByRole('button',{name:'Open camera',exact:true}).click();await page.getByRole('button',{name:'Take photo',exact:true}).click();await page.getByRole('button',{name:'Use photo & continue',exact:true}).click();
  await page.getByRole('status').filter({hasText:'Your time and punch photo are recorded.'}).waitFor();await page.getByRole('button',{name:'Return to PIN',exact:true}).click();await idle(page);
  checks.push('chromium synthetic camera frame uploaded through actual HTTPS/Sharp decoder and original time action');
  await go(portal,'/app/settings/clocker/photos/review');await portal.getByRole('button',{name:/^Review Alex Rivera/}).first().click();await portal.getByRole('button',{name:'View private photo',exact:true}).click();await portal.locator('img[src^="blob:"]').waitFor();
  await portal.getByRole('button',{name:'Remove photo',exact:true}).click();await portal.getByRole('button',{name:'Confirm photo removal',exact:true}).click();await portal.getByRole('status').filter({hasText:/removed/}).waitFor();checks.push('chromium actual hosted Owner-only private photo read/removal');
 }finally{
  await go(portal,'/app/settings/clocker/photos');await portal.getByRole('checkbox',{name:/^Enable punch photos/}).uncheck();
  for(const name of ['Clock in','Start break','End break','Clock out'])await portal.getByRole('checkbox',{name,exact:true}).check();
  await portal.getByRole('button',{name:'Save company settings',exact:true}).click();await portal.getByRole('status').filter({hasText:'Company photo settings saved'}).waitFor();
 }
 await verify();await page.getByRole('button',{name:'Clock Out',exact:true}).click();await page.getByRole('button',{name:'Confirm Clock Out',exact:true}).click();await page.getByRole('heading',{name:'Clock Out Recorded',exact:true}).waitFor();await page.getByRole('button',{name:'Done',exact:true}).click();await idle(page);checks.push('chromium photo preference restored Off and canonical time remains intact');
}
for(const engine of (process.env.CLOCKER_STAGE_ENGINES??'chromium,webkit').split(',')){
 const photoTest=engine==='chromium'&&process.env.CLOCKER_STAGE_PHOTO_TEST==='true';
 const browser=await playwright[engine].launch(photoTest?{args:['--use-fake-device-for-media-stream','--use-fake-ui-for-media-stream']}:{});let page;
 try{
  const owner=await context(browser),tablet=await context(browser),employee=await context(browser);
  const portal=await owner.newPage();page=await tablet.newPage();
  await go(portal,'/login');await portal.getByLabel('Employee ID',{exact:true}).fill('CLOCKEROWNER');await portal.getByLabel('Password',{exact:true}).fill(process.env.CLOCKER_STAGE_PASSWORD);
  await Promise.all([portal.waitForURL(u=>u.pathname==='/app'),portal.getByRole('button',{name:'Sign in',exact:true}).click()]);checks.push(engine+' real hosted Owner sign-in');
  await go(portal,'/app/employees/CLOCKEREMP1/clocker-pin');await portal.getByLabel('New PIN',{exact:true}).fill('4826');await portal.getByLabel('Confirm PIN',{exact:true}).fill('4826');await portal.getByRole('button',{name:'Save',exact:true}).click();await portal.getByRole('status').filter({hasText:'PIN saved'}).waitFor();checks.push(engine+' Owner sets fictional employee PIN');
  await go(portal,'/app/settings/clocker');await portal.getByLabel('Add device',{exact:true}).click();const dialog=portal.getByRole('dialog');
  await dialog.getByLabel('Device name',{exact:true}).fill(`Staging ${engine} acceptance`);await dialog.getByRole('combobox',{name:'Location',exact:true}).selectOption('135ce64c-9153-4e0d-abc2-933b2098e718');await dialog.getByRole('button',{name:'Create setup code',exact:true}).click();await dialog.waitFor({state:'hidden'});
  const code=await portal.getByRole('textbox',{name:/^Setup code · expires /}).inputValue();assert(code);
  await go(page,'/clocker/'+location);await page.getByRole('textbox',{name:'Setup code',exact:true}).fill(code);await page.getByRole('button',{name:'Connect tablet',exact:true}).click();await idle(page);checks.push(engine+' Owner-created tablet enrollment');
  assert.equal(await page.locator('link[rel=manifest]').getAttribute('href'),'/clocker/'+location+'/manifest.webmanifest');
  const geometry=await page.evaluate(()=>({overflow:document.documentElement.scrollWidth>innerWidth+1,small:[...document.querySelectorAll('main button,main input')].filter(e=>{const r=e.getBoundingClientRect();return r.width>0&&r.height>0&&r.height<44;}).length}));assert.equal(geometry.overflow,false);assert.equal(geometry.small,0);checks.push(engine+' tablet geometry and location-specific launch metadata');
  await page.screenshot({path:join(evidence,engine+'-pin.png'),fullPage:true});
  const verify=async()=>{await page.locator('input[name=pin]').fill('4826');await page.getByRole('button',{name:'Continue',exact:true}).click();await page.getByRole('heading',{name:'Hi, Alex.',exact:true}).waitFor();};
  await verify();await page.getByRole('button',{name:'Clock In',exact:true}).click();await page.getByRole('heading',{name:'Clock In Recorded',exact:true}).waitFor();await page.getByRole('button',{name:'Done',exact:true}).click();await idle(page);checks.push(engine+' canonical Clock In and private-screen exit');
  await verify();await page.getByRole('button',{name:'Clock Out',exact:true}).click();await page.getByRole('button',{name:'Confirm Clock Out',exact:true}).click();await page.getByRole('heading',{name:'Clock Out Recorded',exact:true}).waitFor();await page.getByRole('button',{name:'Done',exact:true}).click();await idle(page);checks.push(engine+' canonical Clock Out confirmation and receipt');
  let lost=false;await page.route('**/api/clocker/'+location+'/punch',async route=>{
   const headers={...route.request().headers(),'x-vercel-protection-bypass':process.env.CLOCKER_STAGE_BYPASS};
   if(!lost&&route.request().method()==='POST'&&route.request().postDataJSON()?.operation==='execute'){
    lost=true;const command=route.request().postDataJSON().command;const response=await route.fetch({headers});assert.equal(response.status(),200);lostCommands.push(command.commandId);await route.abort('failed');
   }else await route.continue({headers});
  });
  await verify();await page.getByRole('button',{name:'Clock In',exact:true}).click();await page.getByRole('button',{name:'Check Action Status',exact:true}).click();await page.getByRole('heading',{name:'Clock In Recorded',exact:true}).waitFor();await page.getByRole('button',{name:'Done',exact:true}).click();await idle(page);await page.unroute('**/api/clocker/'+location+'/punch');
  await verify();await page.getByRole('button',{name:'Clock Out',exact:true}).click();await page.getByRole('button',{name:'Confirm Clock Out',exact:true}).click();await page.getByRole('heading',{name:'Clock Out Recorded',exact:true}).waitFor();await page.getByRole('button',{name:'Done',exact:true}).click();await idle(page);checks.push(engine+' lost committed response reconciles the same original action');
  if(photoTest)await photoCheck(portal,page,tablet,verify);
  const ep=await employee.newPage();await go(ep,'/login');await ep.getByLabel('Employee ID',{exact:true}).fill('CLOCKEREMP2');await ep.getByLabel('Password',{exact:true}).fill(process.env.CLOCKER_STAGE_PASSWORD);await Promise.all([ep.waitForURL(u=>u.pathname==='/app'),ep.getByRole('button',{name:'Sign in',exact:true}).click()]);
  await ep.goto(origin+'/app/settings/clocker');await ep.getByText('Only Owners can open Settings.',{exact:true}).waitFor();assert.equal(await ep.getByLabel('Add device',{exact:true}).count(),0);checks.push(engine+' employee receives the Owner-only denial and no administration controls');
 }catch(error){if(page)await page.screenshot({path:join(evidence,engine+'-failure.png'),fullPage:true}).catch(()=>{});throw error;}
 finally{await browser.close();await writeFile(join(evidence,'checks.json'),JSON.stringify({checks,lostCommands,physicalIpad:'NOT RUN',camera:process.env.CLOCKER_STAGE_PHOTO_TEST==='true'?'Synthetic Chromium device only':'Not tested'},null,2));}
}
console.log(JSON.stringify({checks:checks.length,results:checks,physicalIpad:'NOT RUN'}));
