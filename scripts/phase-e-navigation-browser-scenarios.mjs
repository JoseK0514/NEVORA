import assert from 'node:assert/strict';
import {writeFile} from 'node:fs/promises';
import {join} from 'node:path';
import {Client} from 'pg';
import {seedOwnedScenario,TEST_PASSWORD} from '../src/test/integration/owned-app-fixture.ts';

export async function runScenario({app,context,page,engine,width,evidenceDirectory,axeFile}){
 const checks=[],prefix=`navigation-${engine}-${width}`,headers={};
 const q=(text,values=[])=>app.database.executor.query({text,values});
 page.on('request',request=>{const path=new URL(request.url()).pathname;if(path.startsWith('/api/employee/'))headers[path]=request.headers()['x-nevora-employee-view'];});
 async function login(id){await page.goto(app.url+'/login');await page.getByLabel('Employee ID',{exact:true}).fill(id);await page.getByLabel('Password',{exact:true}).fill(TEST_PASSWORD);await Promise.all([page.waitForURL(u=>u.pathname==='/app'),page.getByRole('button',{name:'Sign In',exact:true}).click()]);}
 async function settle(){await page.waitForLoadState('networkidle');}
 async function nav(href){
  const mobile=await page.locator('.mobile-nav').isVisible();
  const primary=['/app','/app/schedule','/app/my-time'].includes(href);
  if(mobile&&!primary){await page.getByRole('button',{name:'More',exact:true}).click();await page.locator('#employee-more-navigation').waitFor({state:'visible'});}
  const root=mobile?(primary?page.locator('.mobile-nav'):page.locator('#employee-more-navigation')):page.locator('nav[aria-label="Primary navigation"]');
  const destination=root.locator(`a[href="${href}"]`);if(mobile){const rect=await destination.boundingBox();assert(rect);await destination.tap({position:{x:rect.width-8,y:rect.height/2}});}else await destination.click();await page.waitForURL(u=>u.pathname===href);await settle();
  await page.locator('#employee-more-navigation').waitFor({state:'hidden'});assert.equal(await page.locator('#employee-more-navigation').isVisible(),false,`More must close after ${href}`);
 }
 async function ready(kind){await page.waitForFunction(k=>{const e=document.querySelector(`[data-private-view="${k}"]`);return e&&(k==='profile'?e.querySelector('dd'):e.querySelector('.employee-notification-list'));},kind);}
 async function screenshot(name){await page.screenshot({path:join(evidenceDirectory,`${prefix}-${name}.png`),fullPage:true});}
 async function accessibility(name){await page.addScriptTag({path:axeFile});const violations=await page.evaluate(async()=> (await window.axe.run(document,{runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21a','wcag21aa']}})).violations.map(v=>v.id));assert.deepEqual(violations,[],name+' accessibility');checks.push(name+' axe WCAG A/AA');}
 async function bounds(){assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),'document horizontal overflow');const bad=await page.locator('.employee-account-panel a,.employee-account-panel button,.employee-destination-list a').evaluateAll(elements=>elements.filter(e=>{const r=e.getBoundingClientRect();return r.width&& (r.left< -1||r.right>innerWidth+1||r.height<43);}).map(e=>e.textContent));assert.deepEqual(bad,[]);}
 try{
  const label='E'+(engine==='chromium'?'C':'W')+width,scenario=await seedOwnedScenario(app.database.executor,label,0),actor=scenario.actors[0],requestId='e41-'+label,noticeId='notice-'+label;
  await q('DELETE FROM notifications WHERE employee_id=$1',[actor]);
  await q("INSERT INTO time_off_requests(id,employee_id,start_date,end_date,status,reason) VALUES($1,$2,current_date+7,current_date+7,'APPROVED','Fictional private reason')",[requestId,actor]);
  await q("INSERT INTO notifications(id,employee_id,type,title,body,event_key,environment,source_kind,source_id,source_version,effective_version,purpose,due_at,expires_at,urgency,push_state) VALUES($1,$2,'TIME_OFF_DECIDED','STORED PRIVATE TITLE','STORED PRIVATE BODY',$1,'test','TIME_OFF',$3,'APPROVED','APPROVED','EVENT',now()-interval '1 hour',now()+interval '1 day','high','pending')",[noticeId,actor,requestId]);
  const actualRole=[320,1440].includes(width)?'EMPLOYEE':'LEAD';await q('UPDATE employees SET role=$1 WHERE id=$2',[actualRole,actor]);
  await login(actor);await settle();
  assert.equal(await page.evaluate(()=>navigator.maxTouchPoints>0),width<768);assert.equal(await page.evaluate(()=>innerWidth),width);checks.push(`Actual authenticated ${actualRole} role`);checks.push('Required CSS width and mobile touch emulation verified; native taps used on mobile navigation');
  for(const href of ['/app/schedule','/app/my-time','/app']){await nav(href);const current=await page.locator('.mobile-nav').isVisible()?page.locator('.mobile-nav a[aria-current="page"]'):page.locator('nav[aria-label="Primary navigation"] a[aria-current="page"]');assert.equal(await current.getAttribute('href'),href);}
  checks.push('Home_Schedule_MyTime_More_all_routes_reachable through authenticated navigation');
  await nav('/app/requests/hub');await bounds();await screenshot('requests');await accessibility('Requests hub');
  const hub=page.locator('.employee-destination-list');assert.equal(await hub.getByRole('link',{name:/Time Off/}).getAttribute('href'),'/app/requests?tab=my');assert.equal(await hub.getByRole('link',{name:/Shift Requests/}).getAttribute('href'),'/app/exchange?tab=requests');
  for(const [name,path] of [['Time Off','/app/requests'],['Shift Requests','/app/exchange']]){
   await page.locator('.employee-destination-list').getByRole('link',{name:new RegExp(name)}).click();await page.waitForURL(u=>u.pathname===path);await settle();
   if(await page.locator('.mobile-nav').isVisible()){assert(await page.getByRole('button',{name:'More',exact:true}).evaluate(e=>e.classList.contains('active')));await page.getByRole('button',{name:'More',exact:true}).click();assert.equal(await page.locator('#employee-more-navigation a[aria-current="page"]').getAttribute('href'),'/app/requests/hub');await page.keyboard.press('Escape');}
   else assert.equal(await page.locator('nav[aria-label="Primary navigation"] a[aria-current="page"]').getAttribute('href'),'/app/requests/hub');
   await page.goBack();await settle();
  }
  checks.push('Requests_hub_preserves_TimeOff_ShiftRequests canonical URLs, query intent and selected ownership');
  await nav('/app/availability');assert.equal(new URL(page.url()).pathname,'/app/availability');
  if(await page.locator('.mobile-nav').isVisible()){
   const trigger=page.getByRole('button',{name:'More',exact:true}),menu=page.locator('#employee-more-navigation');await trigger.focus();await page.keyboard.press('Enter');await menu.waitFor({state:'visible'});await page.waitForFunction(()=>document.querySelector('#employee-more-navigation')?.contains(document.activeElement));assert(await menu.evaluate(e=>e.contains(document.activeElement)),'Keyboard open moves focus into More');assert.deepEqual(await menu.locator('.employee-more-link').allTextContents(),['Requests','Availability','Notifications','Profile']);await page.keyboard.press('Escape');await menu.waitFor({state:'hidden'});await page.waitForFunction(()=>document.activeElement?.getAttribute('aria-label')==='More');assert(await trigger.evaluate(e=>document.activeElement===e),'Escape restores trigger focus');
   checks.push('More_Escape_restores_focus with native Enter/Escape and explicit link order');
  }else{const link=page.locator('nav[aria-label="Primary navigation"] a[href="/app/profile"]');await link.focus();await page.keyboard.press('Enter');await page.waitForURL(u=>u.pathname==='/app/profile');checks.push('Native keyboard desktop destination navigation');}
  await nav('/app/profile');await ready('profile');assert.equal(await page.locator('#portal-device-settings').count(),0);assert(await page.locator('[data-private-view="profile"]').innerText().then(t=>t.includes('Device notification setup is unavailable')));await bounds();await screenshot('profile');await accessibility('Profile');
  await nav('/app/notifications');await ready('notifications');assert.equal(await page.locator('.employee-notification-list a').count(),1);assert.equal(await page.locator('.employee-notification-list a').getAttribute('href'),'/app/notifications/open?notificationId='+noticeId);assert(!await page.locator('[data-private-view]').innerText().then(t=>t.includes('STORED PRIVATE')));await bounds();await screenshot('inbox');await accessibility('Notifications');
  const before=await q('SELECT is_read FROM notifications WHERE id=$1',[noticeId]);await page.locator('.employee-notification-list a').click();await page.waitForURL(u=>u.pathname==='/app/requests');const opened=new URL(page.url());assert.equal(opened.searchParams.get('requestId'),requestId);assert.equal(opened.searchParams.get('tab'),'my');assert.equal(opened.hash,'#request-'+requestId);assert.deepEqual(await q('SELECT is_read FROM notifications WHERE id=$1',[noticeId]),before);await page.goBack();await ready('notifications');
  checks.push('push_disabled_profile_and_inbox_accessible persisted own source, guarded open preserves request ID/tab and causes no read mutation');
  for(const event of ['blur','pagehide']){await page.evaluate(e=>window.dispatchEvent(new Event(e)),event);assert.equal(await page.locator('.employee-notification-list').count(),0);await page.evaluate(()=>window.dispatchEvent(new Event('focus')));await ready('notifications');}
  await context.setOffline(true);await page.waitForFunction(()=>!document.querySelector('.employee-notification-list'));await context.setOffline(false);await ready('notifications');
  await page.evaluate(()=>{Object.defineProperty(document,'visibilityState',{configurable:true,value:'hidden'});document.dispatchEvent(new Event('visibilitychange'));});assert.equal(await page.locator('.employee-notification-list').count(),0);await page.evaluate(()=>{delete document.visibilityState;document.dispatchEvent(new Event('visibilitychange'));});await ready('notifications');
  checks.push('Bound blur/hide/pagehide handlers and browser offline clear private rows; re-entry obtains current authorization');
  if(width===390){
   const lock=new Client({connectionString:app.database.connectionString});await lock.connect();
   try{await lock.query('BEGIN');await lock.query('LOCK TABLE notifications IN ACCESS EXCLUSIVE MODE');await page.locator('[data-private-view] button').click();await page.getByRole('heading',{name:'Notifications unavailable',exact:true}).waitFor();assert.equal(await page.locator('.employee-notification-list').count(),0);}
   finally{await lock.query('ROLLBACK');await lock.end();}
   await page.getByRole('button',{name:'Retry',exact:true}).click();await ready('notifications');
   await q("INSERT INTO notifications(id,employee_id,type,title,body) VALUES($1,$2,'LEGACY','PRIVATE','PRIVATE')",['legacy-'+label,actor]);await page.locator('[data-private-view] button').click();await page.getByText('Some notifications are unavailable or outside this bounded view. Retry to check current access.',{exact:true}).waitFor();assert.equal(await page.locator('.employee-notification-list a').count(),1);
   await q('DELETE FROM notifications WHERE id=$1',['legacy-'+label]);await q("UPDATE time_off_requests SET status='DENIED' WHERE id=$1",[requestId]);await page.locator('[data-private-view] button').click();await page.getByText('No notifications in this current view.',{exact:true}).waitFor();
   await q("UPDATE time_off_requests SET status='APPROVED' WHERE id=$1",[requestId]);await page.locator('[data-private-view] button').click();await ready('notifications');
   checks.push('Actual PostgreSQL lock timeout renders unavailable+Retry; legacy source renders partial; authorized source exclusion renders empty; recovery reauthorizes');
  }
  await nav('/app/profile');await ready('profile');
  if(width===390){
   const endpoint='/api/employee/profile',binding=headers[endpoint];assert(binding);const get=(path=endpoint,b=binding)=>context.request.get(app.url+path,{headers:{'X-Nevora-Employee-View':b}});
   assert.equal((await get(endpoint+'?employeeId='+scenario.actors[1])).status(),400);assert.equal((await get(endpoint,headers['/api/employee/notifications'])).status(),403);
   const cookies=await context.cookies();await context.clearCookies();assert.equal((await get()).status(),401);await context.addCookies(cookies);
   await q("UPDATE employees SET role='MANAGER' WHERE id=$1",[actor]);assert.equal((await get()).status(),403);await q("UPDATE employees SET role='LEAD' WHERE id=$1",[actor]);
   checks.push('Actual cookie API rejects missing session, cross-view binding, other-employee query and changed management role');
   let release,reached;const gate=new Promise(r=>release=r),seen=new Promise(r=>reached=r);let held=false;
   await context.route('**/api/employee/profile',async route=>{if(held)return route.continue();held=true;const response=await route.fetch();assert.equal(response.status(),200);reached();await gate;await route.fulfill({response});});
   await page.locator('[data-private-view] button').click();await seen;await page.evaluate(()=>window.dispatchEvent(new Event('blur')));release();await page.waitForTimeout(100);assert.equal(await page.locator('.employee-profile-details').count(),0);await context.unroute('**/api/employee/profile');await page.evaluate(()=>window.dispatchEvent(new Event('focus')));await ready('profile');
   checks.push('Delayed real authenticated GET cannot repaint after blur (transport held; no fixture response content)');
   // Actual session replacement through login binds the old mounted view out.
   await login(scenario.actors[1]);assert.equal((await get(endpoint,binding)).status(),403);await login(actor);await nav('/app/profile');await ready('profile');checks.push('Actual account/session replacement rejects former mounted-view binding');
  }
  if(width<768){
   await page.goto(app.url+'/app/requests?tab=new');await settle();const field=page.locator('textarea').first();await field.fill('Fictional long keyboard text '.repeat(20));await field.focus();assert(await field.evaluate(e=>e===document.activeElement));await page.keyboard.press('Tab');assert(await page.evaluate(()=>document.activeElement instanceof HTMLElement&&getComputedStyle(document.activeElement).visibility!=='hidden'));await page.keyboard.press('Shift+Tab');await page.goto(app.url+'/app/profile');await ready('profile');
   checks.push('Native focus, text entry and Tab/Shift+Tab on existing request form; no submission; physical keyboard occlusion remains unverified');
  }
  assert(await page.evaluate(()=>[...Object.values(localStorage),...Object.values(sessionStorage)].every(v=>!v.includes('STORED PRIVATE')&&!v.includes('QA E'))));
  await q("UPDATE employees SET first_name=$1,last_name=$2 WHERE id=$3",['Avery With A Very Long Fictional Display Name','Long Employee Name For Reflow Verification',actor]);await page.reload();await ready('profile');await bounds();
  await page.emulateMedia({reducedMotion:'reduce'});await page.evaluate(()=>{document.documentElement.style.zoom='2';});await bounds();await screenshot('zoom-long-content');await page.evaluate(()=>{document.documentElement.style.zoom='';});await page.emulateMedia({reducedMotion:'no-preference'});
  if(width<768){const clearance=await page.locator('.employee-shell .page-frame').evaluate(e=>parseFloat(getComputedStyle(e).paddingBottom));assert(clearance>=100);}
  checks.push('long_content_safe_area_keyboard: real long identity, 200% CSS zoom/reflow, bounds, reduced-motion and mobile bottom clearance');
  await screenshot('final');
  await writeFile(join(evidenceDirectory,prefix+'.json'),JSON.stringify({engine,width,status:'passed',checks,kind:'actual authenticated owned Next/PostgreSQL; synthetic lifecycle events labeled in checks'},null,2));
  return {checks};
 }catch(error){await screenshot('failure').catch(()=>{});await writeFile(join(evidenceDirectory,prefix+'.json'),JSON.stringify({engine,width,status:'failed',checks,error:String(error)},null,2));throw error;}
}
