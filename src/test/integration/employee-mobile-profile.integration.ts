import {it,expect} from 'vitest';
import {createRequire} from 'node:module';
import {mkdir,writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {createHash} from 'node:crypto';
import {createOwnedNextApp} from './owned-next-app';
import {seedOwnedApp,seedOwnedScenario,TEST_PASSWORD} from './owned-app-fixture';
import {AUTH_COPY,AUTH_LANG_COOKIE,type AuthLang} from '../../lib/auth-copy';
import {INSTALLATION_COOKIE,CLEANUP_COOKIE} from '../../lib/notifications/installation';
import {POLICY_FACTS,SUPPORT_EMAIL} from '../../lib/legal/policies';
import {measureRenderedContrast} from '../../../scripts/browser-contrast.mjs';

type BrowserRequest={url():string;headers():Record<string,string>;method():string};
it('integrates current own Profile, preferences, contextual help and native signout in three engines',async()=>{
 const evidence=process.env.NEVORA_EMPLOYEE_PROFILE_EVIDENCE;if(!evidence)throw Error('Select explicit external profile evidence directory');
 await mkdir(evidence,{recursive:true});
 const runtime=createRequire(process.env.NEVORA_PLAYWRIGHT_RUNTIME_PACKAGE??resolve('tools/ci-browser-runtime/package.json'))('playwright');
 const app=await createOwnedNextApp(evidence),checks:{engine:string;name:string}[]=[],captures:string[]=[],contrasts:{engine:string;theme:string;width:number;subject:string;ratio:number}[]=[],messages:{engine:string;type:string;text:string;expected:boolean;stage:string;url:string}[]=[];
 const q=<T=Record<string,unknown>>(text:string,values:unknown[]=[])=>app.database.executor.query<T>({text,values});
 let browser:{close():Promise<void>}|undefined,failed:(()=>Promise<void>)|undefined;
 try{
  await seedOwnedApp(app.database.executor);
  for(const [index,engine] of ['chromium','webkit','firefox'].entries()){
   const f=await seedOwnedScenario(app.database.executor,'PROF'+index,index),actor=f.actors[0],ownName='Own Profile'+index;
   await q("UPDATE employees SET role=$2,first_name='Own',last_name=$3 WHERE id=$1",[actor,index===1?'LEAD':'EMPLOYEE','Profile'+index]);
   const activeBrowser=await runtime[engine].launch({headless:true});browser=activeBrowser;
   const context=await activeBrowser.newContext({viewport:{width:390,height:844},reducedMotion:'reduce',serviceWorkers:'block'}),page=await context.newPage();
   page.setDefaultTimeout(15000);page.setDefaultNavigationTimeout(30000);
   let stage='login',expectedFailure=false,binding='';
   const pending=new Map<BrowserRequest,{path:string;method:string;stage:string;startedAt:number}>();
   page.on('request',(request:BrowserRequest)=>{const path=new URL(request.url()).pathname;if(path.startsWith('/api/')||path.startsWith('/app'))pending.set(request,{path,method:request.method(),stage,startedAt:Date.now()});if(path==='/api/employee/profile')binding=request.headers()['x-nevora-employee-view']??'';});
   for(const event of ['requestfinished','requestfailed'])page.on(event,(request:BrowserRequest)=>pending.delete(request));
   const idle=()=>expect.poll(()=>pending.size,{timeout:10000}).toBe(0);
   const record=(name:string)=>checks.push({engine,name});
   page.on('console',(message:{type():string;text():string})=>{if(['error','warning'].includes(message.type()))messages.push({engine,type:message.type(),text:message.text(),expected:expectedFailure,stage,url:page.url()});});
   page.on('pageerror',(error:Error)=>messages.push({engine,type:'pageerror',text:error.message,expected:false,stage,url:page.url()}));
   await context.route('**/*',async(route:{request():{url():string};abort():Promise<void>;continue():Promise<void>})=>{const url=new URL(route.request().url());if(['http:','https:'].includes(url.protocol)&&url.origin!==new URL(app.url).origin){await route.abort();return;}await route.continue();});
   const shot=async(name:string)=>{const file=engine+'-'+name+'.png';await page.screenshot({path:evidence+'/'+file,fullPage:true,style:'nextjs-portal {visibility:hidden;}',caret:'initial'});captures.push(file);};
   const viewport=async(name:string)=>{const file=engine+'-'+name+'-viewport.png';await page.screenshot({path:evidence+'/'+file,style:'nextjs-portal {visibility:hidden;}',caret:'initial'});captures.push(file);};
   failed=async()=>{await shot('failure');await writeFile(evidence+'/'+engine+'-failure.html',await page.locator('body').innerHTML());await writeFile(evidence+'/'+engine+'-pending-requests.json',JSON.stringify([...pending.values()],null,2));};
   const ready=()=>page.locator('.em-profile-private[data-profile-state="ready"]').waitFor();
   const login=async(id:string,lang:AuthLang)=>{const copy=AUTH_COPY[lang];await page.getByLabel(copy.employeeId,{exact:true}).fill(id);await page.getByLabel(copy.password,{exact:true}).fill(TEST_PASSWORD);await page.getByRole('button',{name:copy.signIn,exact:true}).click();await page.waitForURL(app.url+'/app');await page.locator('[data-home-state="ready"]:visible,[data-home-state="partial"]:visible').waitFor();await page.locator('.employee-time-badge:visible').waitFor();};
   const openProfile=async()=>{await page.locator('.mobile-nav-link[href="/app/more"]:visible').click();await page.waitForURL(app.url+'/app/more');await page.locator('a[href="/app/profile"]:visible').first().click();await page.waitForURL(app.url+'/app/profile');};
   await page.goto(app.url+'/login');await login(actor,'en');
   // Hold the actual own read, not a fabricated profile or authorization result.
   let releaseRead!:()=>void,readObserved=false;const heldRead=new Promise<void>(resolve=>{releaseRead=resolve;});
   await page.route('**/api/employee/profile',async(route:{fetch():Promise<unknown>;fulfill(options:{response:unknown}):Promise<void>})=>{const response=await route.fetch();readObserved=true;await heldRead;await route.fulfill({response});});
   stage='held-profile-read';await openProfile();await page.locator('.em-profile-private[data-profile-state="loading"]').waitFor();
   expect(await page.locator('.q-profile-e').innerText()).not.toContain(ownName);expect(await page.getByRole('button',{name:'Sign out',exact:true}).isEnabled()).toBe(true);await shot('profile-loading');
   await expect.poll(()=>readObserved,{timeout:10000}).toBe(true);releaseRead();await ready();await idle();await page.unroute('**/api/employee/profile');
   expect(await page.locator('.em-profile-private').innerText()).toContain(ownName);expect(binding).toMatch(/^[a-f0-9]{64}$/);
   const foreign=await page.request.get(app.url+'/api/employee/profile?employeeId='+f.actors[1],{headers:{'X-Nevora-Employee-View':binding}});
   expect(foreign.status()).toBe(400);expect(await foreign.json()).toEqual({state:'unavailable',reason:'access_denied'});
   record('Actual held/current own profile; no static identity while loading; strict no-selector HTTP boundary');await shot('profile-ready');
   stage='profile-private-pause';await page.evaluate(()=>window.dispatchEvent(new Event('offline')));await page.locator('.em-profile-private[data-profile-state="paused"]').waitFor();
   expect(await page.locator('.q-profile-e').innerText()).not.toContain(ownName);expect(await page.locator('.em-profile-private').innerText()).not.toContain('Main Office');expect(await page.getByLabel('Appearance',{exact:true}).isEnabled()).toBe(true);await shot('profile-paused');
   await page.evaluate(()=>window.dispatchEvent(new Event('online')));await ready();expect(await page.locator('.em-profile-private').innerText()).toContain(ownName);
   record('Pause removes own identity/work facts; unrelated preferences/signout remain; resume reads current own facts');
   stage='profile-read-failure';expectedFailure=true;
   await page.route('**/api/employee/profile',async(route:{abort():Promise<void>})=>route.abort());await page.getByRole('button',{name:'Refresh details',exact:true}).click();await page.locator('.em-profile-private[data-profile-state="unavailable"]').waitFor();
   expect(await page.locator('.q-profile-e').innerText()).not.toContain(ownName);expect(await page.getByLabel('Sign-in language',{exact:true}).isEnabled()).toBe(true);expect(await page.locator('.em-profile-account a[href="/app/profile/support"]').count()).toBe(1);await shot('profile-read-unavailable');await idle();
   await page.unroute('**/api/employee/profile');await page.getByRole('button',{name:'Try again',exact:true}).click();await ready();await idle();expectedFailure=false;
   record('Read failure is not empty or stale identity; native recovery preserves unrelated help and preferences');
   stage='profile-matrix';
   for(const theme of ['light','dark'])for(const width of [320,390,430]){
    await page.setViewportSize({width,height:844});await page.getByLabel('Appearance',{exact:true}).selectOption(theme);await expect.poll(()=>page.locator('html').getAttribute('data-theme')).toBe(theme);
    expect(await page.evaluate(()=>localStorage.getItem('nv-theme'))).toBe(theme);
    expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
    for(const [subject,locator] of [['signout',page.getByRole('button',{name:'Sign out',exact:true})],['profile-supporting-copy',page.locator('.em-profile-note')],['preference-label',page.locator('label[for="em-profile-language"]')]] as const){const measured=await locator.evaluate(measureRenderedContrast);contrasts.push({engine,theme,width,subject,ratio:measured.ratio});expect(measured.ratio).toBeGreaterThanOrEqual(4.5);}
    const small=await page.locator('.em-profile :is(a,button,select,summary)').evaluateAll((els:HTMLElement[])=>els.filter(el=>el.checkVisibility({visibilityProperty:true,opacityProperty:true})&&el.getBoundingClientRect().height<43.5).map(el=>el.textContent));expect(small).toEqual([]);
    expect(await page.locator('#profile-settings-title').evaluate((el:HTMLElement)=>getComputedStyle(el).fontSize)).toBe('19px');
    await page.getByLabel('Appearance',{exact:true}).focus();await shot('profile-'+theme+'-'+width);await viewport('profile-'+theme+'-'+width);
   }
   record('Real device theme owner light/dark320/390/430, native controls, sampled contrast, targets, token type and no overflow');
   await page.setViewportSize({width:320,height:844});await page.evaluate(()=>{document.documentElement.style.fontSize='200%';document.documentElement.dataset.textStep='200';});
   expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
   expect(await page.locator('#profile-settings-title').evaluate((el:HTMLElement)=>getComputedStyle(el).fontSize)).toBe('38px');
   await page.getByRole('button',{name:'Sign out',exact:true}).scrollIntoViewIfNeeded();expect(await page.getByRole('button',{name:'Sign out',exact:true}).evaluate((el:HTMLElement)=>el.getBoundingClientRect().bottom<=document.querySelector('.mobile-nav')!.getBoundingClientRect().top+1)).toBe(true);
   await shot('profile-text200');await viewport('profile-text200');
   await page.evaluate(()=>{document.documentElement.style.fontSize='100%';delete document.documentElement.dataset.textStep;});await page.setViewportSize({width:390,height:844});
   await page.getByLabel('Sign-in language',{exact:true}).focus();await page.keyboard.press('Tab');expect(await page.getByLabel('Appearance',{exact:true}).evaluate((el:HTMLElement)=>document.activeElement===el)).toBe(true);
   record('200% text retains enlarged headings/facts and navigation clearance; native Tab reaches the next labelled preference');
   await page.emulateMedia({colorScheme:'dark'});await page.getByLabel('Appearance',{exact:true}).selectOption('system');await expect.poll(()=>page.locator('html').getAttribute('data-theme')).toBe('dark');expect(await page.evaluate(()=>localStorage.getItem('nv-theme'))).toBeNull();
   await page.emulateMedia({colorScheme:'light'});await expect.poll(()=>page.locator('html').getAttribute('data-theme')).toBe('light');await page.getByLabel('Appearance',{exact:true}).selectOption('dark');
   record('System follows this device media setting; explicit choice is device storage, not an employee/workspace preference');
   stage='language-reload';await idle();const reloaded=page.waitForEvent('load');await page.getByLabel('Sign-in language',{exact:true}).selectOption('es');await reloaded;await ready();await idle();
   expect(await page.getByLabel('Sign-in language',{exact:true}).inputValue()).toBe('es');expect(await page.getByLabel('Appearance',{exact:true}).inputValue()).toBe('dark');expect(await page.locator('html').getAttribute('data-theme')).toBe('dark');
   expect((await context.cookies()).find((cookie:{name:string})=>cookie.name===AUTH_LANG_COOKIE)?.value).toBe('es');expect(await page.getByRole('heading',{name:'Profile',exact:true}).count()).toBe(1);await shot('profile-language-device-persistence');
   record('Deliberate sign-in language cookie/reload keeps current profile and device theme; application language remains truthfully scoped');
   stage='contextual-support';await page.locator('.em-profile-account a[href="/app/profile/support"]').click();await page.waitForURL(app.url+'/app/profile/support');await page.getByRole('heading',{name:'Support',exact:true}).waitFor();
   expect(await page.locator('.em-document-body').innerText()).toContain(SUPPORT_EMAIL);expect(await page.locator('.em-document-body').innerText()).toContain(POLICY_FACTS.SUPPORT_RESPONSE_TIME!);await shot('support-context');
   await page.locator('.em-document-links a[href="/app/profile/privacy"]').click();await page.waitForURL(app.url+'/app/profile/privacy');await page.locator('.em-document-section > summary').filter({hasText:'Your workplace'}).click();expect(await page.locator('.em-document-body').innerText()).toContain(POLICY_FACTS.EMPLOYER_DATA_RESPONSIBILITIES!);await shot('privacy-context');
   await page.locator('.em-document-links a[href="/app/profile/terms"]').click();await page.waitForURL(app.url+'/app/profile/terms');await page.getByRole('heading',{name:'Terms of Use',exact:true}).waitFor();await shot('terms-context');
   await page.getByRole('link',{name:'Profile',exact:true}).click();await page.waitForURL(app.url+'/app/profile#profile-terms');await ready();expect(await page.locator('#profile-terms > a').evaluate((el:HTMLElement)=>document.activeElement===el)).toBe(true);
   record('Actual canonical Support/privacy/terms, native disclosures, fixed contextual links and exact Profile return focus; no email sent');
   stage='desktop-isolation';const calendarNode=await page.locator('#employee-calendar-title').elementHandle();await page.setViewportSize({width:1440,height:1000});await page.locator('.q-profile-e .q-who:visible').waitFor();expect(await page.locator('.q-profile-e.em-profile').count()).toBe(0);expect(await page.locator('.q-profile-e .q-who').innerText()).toContain(ownName);expect(await calendarNode!.evaluate((el:HTMLElement)=>el.isConnected)).toBe(true);await shot('profile-desktop-preserved');
   await page.setViewportSize({width:390,height:844});await ready();expect(await calendarNode!.evaluate((el:HTMLElement)=>el.isConnected)).toBe(true);record('Original desktop profile retained; responsive switches do not remount the common Calendar service owner');
   stage='current-session-denial';expectedFailure=true;
   const session=(await context.cookies()).find((cookie:{name:string})=>cookie.name==='fuel_session');expect(session).toBeTruthy();await q('DELETE FROM employee_sessions WHERE token_hash=$1',[createHash('sha256').update(session!.value).digest('hex')]);await page.getByRole('button',{name:'Refresh details',exact:true}).click();await page.locator('.em-profile-private[data-profile-state="denied"]').waitFor();
   expect(await page.locator('.q-profile-e').innerText()).not.toContain(ownName);expect(await page.locator('.em-profile-private a[href="/login"]').count()).toBe(1);expect(await page.getByRole('button',{name:'Sign out',exact:true}).isEnabled()).toBe(true);await shot('profile-current-denial');await idle();expectedFailure=false;
   await page.getByRole('button',{name:'Sign out',exact:true}).click();await page.waitForURL(app.url+'/login');await idle();expect((await context.cookies()).some((cookie:{name:string})=>cookie.name==='fuel_session')).toBe(false);expect(await page.getByRole('button',{name:AUTH_COPY.es.signIn,exact:true}).count()).toBe(1);
   record('Actual session revocation clears identity; native signout removes cookie and shows actual Spanish sign-in copy');
   stage='new-account';await login(f.actors[1],'es');await openProfile();await ready();await idle();
   const [peer]=await q<{name:string}>('SELECT first_name||\' \'||last_name AS name FROM employees WHERE id=$1',[f.actors[1]]);
   expect(await page.locator('.em-profile-private').innerText()).toContain(peer.name);expect(await page.locator('.q-profile-e').innerText()).not.toContain(ownName);expect(await page.getByLabel('Appearance',{exact:true}).inputValue()).toBe('dark');expect(await page.getByLabel('Sign-in language',{exact:true}).inputValue()).toBe('es');await shot('profile-new-account-isolation');record('A genuine different account gets only its own current identity; browser/device preferences retain their intended scope');
   // An unverifiable old enrollment is deliberate failure input, never a cleanup success fixture.
   const opaque='fictional-unverifiable-prior-enrollment-'+engine;await context.addCookies([{name:INSTALLATION_COOKIE,value:opaque,url:app.url,httpOnly:true,sameSite:'Strict'}]);
   const beforeFence=await page.evaluate(()=>localStorage.getItem('fuel-portal-account-fence'));
   expect((await q<{n:number}>('SELECT count(*)::integer AS n FROM employee_sessions WHERE employee_id=$1',[f.actors[1]]))[0].n).toBe(1);
   let releaseLogout!:()=>void,logoutHeld=false;const logoutGate=new Promise<void>(resolve=>{releaseLogout=resolve;});
   const cookieShape=async()=>({cookies:(await context.cookies()).map((cookie:{name:string;path:string;expires:number;httpOnly:boolean})=>({name:cookie.name,path:cookie.path,expires:cookie.expires,httpOnly:cookie.httpOnly}))});
   // Hold native submission before dispatch. Replaying route.fetch's multi-cookie
   // response changes WebKit cookie handling; the real response stays untouched.
   await page.route('**/app/profile*',async(route:{request():BrowserRequest;continue():Promise<void>})=>{if(route.request().method()==='POST'&&route.request().headers()['next-action']){logoutHeld=true;await logoutGate;}await route.continue();});
   stage='signout-intent-and-pending-device-cleanup';await page.getByRole('button',{name:'Sign out',exact:true}).click();await expect.poll(()=>logoutHeld,{timeout:10000}).toBe(true);await page.locator('.q-profile-e').getByRole('status').filter({hasText:'Signing out'}).waitFor();
   expect(await page.locator('.q-profile-e').innerText()).not.toContain(peer.name);expect(await page.locator('.em-profile-private').count()).toBe(0);expect(await page.locator('#employee-calendar-title').count()).toBe(0);expect(await page.evaluate(()=>localStorage.getItem('fuel-portal-account-fence'))).not.toBe(beforeFence);
   expect((await q<{n:number}>('SELECT count(*)::integer AS n FROM employee_sessions WHERE employee_id=$1',[f.actors[1]]))[0].n).toBe(1);await shot('profile-signout-held-native-submission');
   releaseLogout();await page.waitForURL(app.url+'/login');await idle();await page.unroute('**/app/profile*');expect((await q<{n:number}>('SELECT count(*)::integer AS n FROM employee_sessions WHERE employee_id=$1',[f.actors[1]]))[0].n).toBe(0);const cookies=await context.cookies();await writeFile(evidence+'/'+engine+'-logout-completed-cookie-shape.json',JSON.stringify(await cookieShape(),null,2));expect(cookies.some((cookie:{name:string})=>cookie.name==='fuel_session')).toBe(false);const retained=cookies.find((cookie:{name:string})=>cookie.name===CLEANUP_COOKIE);expect(retained?.value).toBe(opaque);expect(retained?.httpOnly).toBe(true);expect(await page.locator('body').innerText()).not.toContain(peer.name);await shot('profile-signout-unresolved-device-proof');
   record('Native signout immediately clears private DOM/services and fences device ownership; real session deleted, cookie removed, opaque unresolved device cleanup retained without a false all-complete claim');
   await idle();await context.close();await browser!.close();browser=undefined;failed=undefined;
  }
  expect(messages.filter(m=>m.type==='pageerror')).toEqual([]);expect(messages.filter(m=>m.type==='error'&&!m.expected)).toEqual([]);
 }catch(error){await failed?.();throw error;}
 finally{await writeFile(evidence+'/results.json',JSON.stringify({checks,captures,contrasts,messages,limits:['Controlled loopback browsers, fictional accounts and no real notifications. Native OS/provider enrollment and verified installation-detach coverage belong to the next capability batch; this run checks no-installation signout and actual unresolved-proof retention. Physical devices/AT/hosted/release remain separate.']},null,2));await browser?.close();await app.close();}
},600000);
