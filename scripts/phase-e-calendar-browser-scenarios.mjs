import assert from 'node:assert/strict';
import {join} from 'node:path';
import {readFile,writeFile} from 'node:fs/promises';
import {seedOwnedScenario,TEST_PASSWORD} from '../src/test/integration/owned-app-fixture.ts';
export async function runScenario({app,page,context,engine,width,evidenceDirectory}){
 const checks=[],receipt=join(evidenceDirectory,`calendar-case-${engine}-${width}.json`);
 const step=async(name,run)=>{await writeFile(receipt,JSON.stringify({stage:name,status:'running',checks}));try{await run();checks.push(name);await writeFile(receipt,JSON.stringify({stage:name,status:'passed',checks}));}catch{await writeFile(receipt,JSON.stringify({stage:name,status:'failed',checks}));throw Error('Calendar case failed: '+name);}};
 const panel=page.locator('[data-calendar-setting]');
 const retry=()=>panel.getByRole('button',{name:'Try again to load the calendar link',exact:true});
 const management=()=>panel.locator('details.employee-calendar-management');
 const openManagement=async()=>{if(await management().getAttribute('open')===null)await management().locator('summary').click();};
 const state=async(text)=>{await panel.getByText(text,{exact:true}).waitFor();};
 const noUrl=async()=>assert.equal(await panel.locator('textarea').count(),0);
 let firstUrl,secondUrl,firstBody;
 // This non-secret probe MUST run before any real test capability is issued.
 await step('Pre-issuance sentinel absent from persisted request and Next logs',async()=>{
  const sentinel='A'.repeat(43),endpoint=app.url+'/api/calendar/'+sentinel+'/schedule.ics';
  for(const method of ['GET','HEAD','POST']){const response=await fetch(endpoint,{method,redirect:'manual'});assert.equal(response.status,method==='POST'?405:404);await response.text();}
  await fetch(endpoint+'?probe=1');await fetch(app.url+'/login');await new Promise(resolve=>setTimeout(resolve,150));assert.equal((await readFile(join(app.root,'next.log'),'utf8')).includes(sentinel),false);
 });
 // Other suites deliberately vary the fictional location label. Restore this suite's expected canonical label.
 await app.database.executor.query({text:"UPDATE locations SET short_name='Main Office' WHERE id='loc-1'",values:[]});
 const fixture=await seedOwnedScenario(app.database.executor,'CALENDAR'+engine.toUpperCase()+width,[320,375,390,430,768,1024,1440].indexOf(width)+(engine==='webkit'?7:0));
 const q=(text,values=[])=>app.database.executor.query({text,values});
 await step('Real fictional login and Schedule secondary calendar entry',async()=>{
  await page.goto(app.url+'/login');await page.getByLabel('Employee ID',{exact:true}).fill(fixture.actors[0]);await page.getByLabel('Password',{exact:true}).fill(TEST_PASSWORD);
  await Promise.all([page.waitForURL(url=>url.pathname==='/app'),page.getByRole('button',{name:'Sign In',exact:true}).click()]);await page.waitForLoadState('networkidle');
  await page.goto(app.url+'/app/schedule');await page.getByRole('link',{name:'Add shifts to your calendar',exact:true}).click();await state('No calendar link');
 });
 await step('Deliberate create produces one transient URL and own private GET/HEAD feed',async()=>{
  await panel.getByRole('button',{name:'Create link',exact:true}).click();await panel.getByText('Link created.',{exact:true}).waitFor();firstUrl=await panel.getByLabel('Your private calendar link',{exact:true}).inputValue();assert.equal(new URL(firstUrl).origin,app.url);
  const feed=await page.request.get(firstUrl,{maxRedirects:0,headers:{'If-None-Match':'"fictional-old"'}});assert.equal(feed.status(),200);firstBody=await feed.text();assert.equal((firstBody.match(/BEGIN:VEVENT/g)||[]).length,1);assert.equal(firstBody.includes('LOCATION:Main Office'),true);assert.equal(firstBody.includes(fixture.actors[1]),false);
  for(const key of ['cache-control','referrer-policy'])assert.equal(feed.headers()[key],key==='cache-control'?'no-store, private':'no-referrer');assert.equal(feed.headers()['access-control-allow-origin'],undefined);assert.equal(feed.headers().location,undefined);assert.equal(feed.headers().etag,undefined);
  const head=await page.request.head(firstUrl);assert.equal(head.status(),200);assert.equal(await head.text(),'');
  const stored=JSON.stringify(await q('SELECT * FROM calendar_subscriptions WHERE employee_id=$1',[fixture.actors[0]]))+JSON.stringify(await q('SELECT * FROM calendar_operations WHERE actor_employee_id=$1',[fixture.actors[0]]));assert.equal(stored.includes(firstUrl),false);assert.equal(stored.includes(new URL(firstUrl).pathname.split('/')[3]),false);
 });
 await step('Completed controlled clipboard write shows copied feedback only after completion',async()=>{
  await page.evaluate(()=>Object.defineProperty(navigator,'clipboard',{configurable:true,value:{writeText:()=>new Promise(resolve=>{window.finishFictionalCopy=resolve;})}}));await panel.getByRole('button',{name:'Copy link',exact:true}).click();assert.equal(await panel.getByText('Link copied.',{exact:true}).count(),0);await page.evaluate(()=>window.finishFictionalCopy?.());await panel.getByText('Link copied.',{exact:true}).waitFor();
 });
 await step('Clipboard rejection offers keyboard-accessible manual select without false copied success',async()=>{
  await page.evaluate(()=>Object.defineProperty(navigator,'clipboard',{configurable:true,value:{writeText:async()=>{throw Error('Fictional clipboard unavailable');}}}));await panel.getByRole('button',{name:'Copy link',exact:true}).click();await panel.getByText('Copy was unavailable. Use Select link, then copy it manually.',{exact:true}).waitFor();assert.equal(await panel.getByText('Link copied.',{exact:true}).count(),0);
  await panel.getByRole('button',{name:'Select link',exact:true}).focus();await page.keyboard.press('Enter');assert.equal(await page.evaluate(()=>{const field=document.activeElement;return field instanceof HTMLTextAreaElement&&field.selectionStart===0&&field.selectionEnd===field.value.length;}),true);
 });
 await step('Blur and offline clear the one-time URL and refocus returns only safe active status',async()=>{
  await page.evaluate(()=>window.dispatchEvent(new Event('blur')));await noUrl();await panel.getByText('Calendar settings paused. Return to this window to check the link.',{exact:true}).waitFor();await context.setOffline(true);await page.evaluate(()=>window.dispatchEvent(new Event('offline')));await noUrl();await context.setOffline(false);await page.evaluate(()=>window.dispatchEvent(new Event('online')));await state('Link active');await noUrl();
  assert.equal(await panel.getByText('The link is stored securely and cannot be retrieved. Replace link to create a new URL; the previous link will stop working.',{exact:true}).count(),1);
 });
 await step('Replace revokes old origin requests while event UID and serialized bytes remain stable',async()=>{
  await panel.getByRole('button',{name:'Replace link',exact:true}).click();await panel.getByText('Link created.',{exact:true}).waitFor();secondUrl=await panel.getByLabel('Your private calendar link',{exact:true}).inputValue();assert.equal(firstUrl===secondUrl,false);const old=await page.request.get(firstUrl,{headers:{'If-None-Match':'"fictional-old"'}});assert.equal(old.status(),404);assert.equal(await old.text(),'Calendar unavailable.');const replacement=await page.request.get(secondUrl);assert.equal(replacement.status(),200);assert.equal(await replacement.text(),firstBody);
 });
 await step('Delayed completed clipboard response after hide cannot restore copied notice or private URL',async()=>{
  await page.evaluate(()=>Object.defineProperty(navigator,'clipboard',{configurable:true,value:{writeText:()=>new Promise(resolve=>{window.finishFictionalCopy=resolve;})}}));await panel.getByRole('button',{name:'Copy link',exact:true}).click();await page.evaluate(()=>window.dispatchEvent(new Event('blur')));await page.evaluate(()=>window.finishFictionalCopy?.());await noUrl();assert.equal(await panel.getByText('Link copied.',{exact:true}).count(),0);await page.evaluate(()=>window.dispatchEvent(new Event('focus')));await state('Link active');await noUrl();
 });
 await step('Lost issuance response retries the same committed operation without recovering the raw URL',async()=>{
  let intercepted=false;await page.route('**/api/employee/calendar-subscriptions',async route=>{if(route.request().method()==='POST'&&!intercepted){intercepted=true;const response=await route.fetch(),result=await response.json();assert.equal(result.status,'created');await route.fulfill({status:503,contentType:'application/json',body:JSON.stringify({status:'outcome_unknown',operationId:result.operationId}),headers:{'Cache-Control':'no-store, private'}});}else await route.continue();});
  await panel.getByRole('button',{name:'Replace link',exact:true}).click();await panel.getByText('The result is unknown. Retry the same operation to check it.',{exact:true}).waitFor();await noUrl();assert(await panel.getByRole('button',{name:'Replace link',exact:true}).isDisabled());await openManagement();assert(await panel.getByRole('button',{name:'Revoke link',exact:true}).isDisabled());await retry().click();await panel.getByText('The link is active. Its URL cannot be retrieved; replace the link to create a new one.',{exact:true}).waitFor();await state('Link active');await noUrl();await page.unroute('**/api/employee/calendar-subscriptions');assert.equal((await page.request.get(secondUrl)).status(),404);assert.equal(Number((await q('SELECT count(*)::integer n FROM calendar_subscriptions WHERE employee_id=$1 AND revoked_at IS NULL',[fixture.actors[0]]))[0].n),1);
 });
 await step('Late creation response after hide remains suppressed and replay has no URL',async()=>{
  let intercepted=false;await page.route('**/api/employee/calendar-subscriptions',async route=>{if(route.request().method()==='POST'&&!intercepted){intercepted=true;const response=await route.fetch();assert.equal(response.status(),200);await page.evaluate(()=>window.dispatchEvent(new Event('blur')));await route.fulfill({response});}else await route.continue();});await panel.getByRole('button',{name:'Replace link',exact:true}).click();await panel.getByText('Calendar settings paused. Return to this window to check the link.',{exact:true}).waitFor();await noUrl();await page.unroute('**/api/employee/calendar-subscriptions');await page.evaluate(()=>window.dispatchEvent(new Event('focus')));await state('Link active');await noUrl();await retry().click();await panel.getByText('The link is active. Its URL cannot be retrieved; replace the link to create a new one.',{exact:true}).waitFor();await noUrl();
 });
 await step('Unavailable settings offer retry and real current status recovers',async()=>{
  await page.route('**/api/employee/calendar-subscriptions',route=>route.request().method()==='GET'?route.fulfill({status:503,contentType:'application/json',body:JSON.stringify({state:'unavailable',reason:'fictional_failure'})}):route.continue());await page.evaluate(()=>window.dispatchEvent(new Event('focus')));await panel.getByText('Calendar settings unavailable.',{exact:false}).waitFor();await noUrl();await page.unroute('**/api/employee/calendar-subscriptions');await retry().click();await state('Link active');
 });
 await step('Revocation status, client caveats, responsive keyboard controls and token-free capture',async()=>{
  await openManagement();assert(await management().getByText('Replacing the link stops the previous link and requires you to subscribe again. Revoking this link stops future access; it cannot remove information already copied by a calendar app.',{exact:true}).isVisible());
  await panel.getByRole('button',{name:'Revoke link',exact:true}).focus();await page.keyboard.press('Enter');await state('Link revoked');await noUrl();assert.equal(await management().count(),0);
  for(const [provider,guide] of [['Apple Calendar','Apple subscription guide'],['Google Calendar','Google subscription guide'],['Outlook','Outlook subscription guide']]){const instructions=panel.locator('.employee-calendar-providers details').filter({hasText:provider});assert.equal(await instructions.getAttribute('open'),null);await instructions.locator('summary').click();assert(await instructions.getByRole('link',{name:guide,exact:true}).isVisible());await instructions.locator('summary').click();}
  assert(await panel.getByText('Calendar apps refresh on their own schedule.',{exact:false}).isVisible());assert(await panel.getByText('Creating or copying a link does not confirm a calendar connection.',{exact:false}).isVisible());assert.equal(await panel.getByText('Calendar connected',{exact:true}).count(),0);
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=document.documentElement.clientWidth+1),true);const persisted=await page.evaluate(async()=>({text:JSON.stringify({...localStorage,...sessionStorage}),cached:(await Promise.all((await caches.keys()).map(async key=>(await (await caches.open(key)).keys()).map(r=>r.url)))).flat()}));assert.equal(persisted.text.includes(new URL(firstUrl).pathname.split('/')[3]),false);assert.equal(persisted.cached.some(url=>url.includes('/api/calendar/')),false);
  await page.screenshot({path:join(evidenceDirectory,`calendar-profile-${engine}-${width}.png`),fullPage:true});assert.equal((await readFile(join(app.root,'next.log'),'utf8')).includes(new URL(firstUrl).pathname.split('/')[3]),false);assert.equal((await readFile(join(app.root,'next.log'),'utf8')).includes(new URL(secondUrl).pathname.split('/')[3]),false);
 });
 return {checks};
}
