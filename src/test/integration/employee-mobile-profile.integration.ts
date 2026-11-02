import {it,expect} from 'vitest';
import {createRequire} from 'node:module';
import {mkdir,writeFile,readFile} from 'node:fs/promises';
import {resolve,join} from 'node:path';
import {calendarTrace,installCalendarFetchObservation,pendingReads} from './calendar-request-monitor';
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
 const app=await createOwnedNextApp(evidence,{calendarDiagnostics:true}),checks:{engine:string;name:string}[]=[],captures:string[]=[],contrasts:{engine:string;theme:string;width:number;subject:string;ratio:number}[]=[],messages:{engine:string;type:string;text:string;expected:boolean;stage:string;url:string}[]=[],textScaling:unknown[]=[],signoutHeldText:unknown[]=[],leadTitles:unknown[]=[];
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
   const pending=new Map<BrowserRequest,{path:string;method:string;stage:string;startedAt:number;id?:string;response?:boolean}>();
   const retiredCalendarReads:{id:string;stage:string}[]=[];const finishedCalendarReads=new Set<string>();await installCalendarFetchObservation(page);
   page.on('request',(request:BrowserRequest)=>{const path=new URL(request.url()).pathname;if(path.startsWith('/api/')||path.startsWith('/app'))pending.set(request,{path,method:request.method(),stage,startedAt:Date.now(),id:request.headers()['x-nevora-qa-calendar-read']});if(path==='/api/employee/profile')binding=request.headers()['x-nevora-employee-view']??'';});
   page.on('response',(response:{request():BrowserRequest})=>{const row=pending.get(response.request());if(row)row.response=true;});
   for(const event of ['requestfinished','requestfailed'])page.on(event,(request:BrowserRequest)=>{const row=pending.get(request);if(event==='requestfinished'&&row?.id)finishedCalendarReads.add(row.id);pending.delete(request);});
   const idle=()=>expect.poll(async()=>{
    const aborted=await page.evaluate(()=>(window as Window&{__nevoraAbortedCalendarReads?:string[]}).__nevoraAbortedCalendarReads??[]);
    const trace=calendarTrace(await readFile(join(app.root,'next.log'),'utf8'));
    // Only Firefox has the independently reproduced missing-terminal-event bug.
    const current=pendingReads([...pending.values()],aborted,trace,finishedCalendarReads);
    if(engine==='firefox')for(const [request,row]of pending)if(!current.includes(row)){retiredCalendarReads.push({id:row.id!,stage:row.stage});pending.delete(request);}
    return pending.size;
   },{timeout:10000}).toBe(0);
   const record=(name:string)=>checks.push({engine,name});
   page.on('console',(message:{type():string;text():string})=>{if(['error','warning'].includes(message.type()))messages.push({engine,type:message.type(),text:message.text(),expected:expectedFailure,stage,url:page.url()});});
   page.on('pageerror',(error:Error)=>messages.push({engine,type:'pageerror',text:error.message,expected:false,stage,url:page.url()}));
   await context.route('**/*',async(route:{request():{url():string};abort():Promise<void>;continue():Promise<void>})=>{const url=new URL(route.request().url());if(['http:','https:'].includes(url.protocol)&&url.origin!==new URL(app.url).origin){await route.abort();return;}await route.continue();});
   const shot=async(name:string)=>{const file=engine+'-'+name+'.png';await page.screenshot({path:evidence+'/'+file,fullPage:false,style:'nextjs-portal {visibility:hidden;}',caret:'initial'});captures.push(file);};
   const viewport=async(name:string)=>{const file=engine+'-'+name+'-viewport.png';await page.screenshot({path:evidence+'/'+file,style:'nextjs-portal {visibility:hidden;}',caret:'initial'});captures.push(file);};
   failed=async()=>{await shot('failure');await writeFile(evidence+'/'+engine+'-failure.html',await page.locator('body').innerHTML());await writeFile(evidence+'/'+engine+'-pending-requests.json',JSON.stringify({pending:[...pending.values()],retiredCalendarReads},null,2));await writeFile(evidence+'/'+engine+'-theme-diagnostic.json',JSON.stringify(await page.evaluate(()=>({theme:document.documentElement.dataset.theme,choice:document.documentElement.dataset.themeChoice,stored:localStorage.getItem('nv-theme'),dark:matchMedia('(prefers-color-scheme: dark)').matches,visibility:document.visibilityState})),null,2));};
   // Board E-Profile ("Profile and settings", the same page on every width): Personal info is the private own read,
   // Display holds the sign-in language, Security holds Passkeys/Delete my account. Sign out, Help and legal live on More.
   const priv=page.locator('[data-private-view="profile"]'),root=page.locator('.em-account'),state=(value:string)=>page.locator('[data-private-view="profile"][data-profile-state="'+value+'"]').waitFor();
   const ready=()=>state('ready');
   const lang=(name:'English'|'Español')=>page.getByRole('group',{name:'Language',exact:true}).getByRole('button',{name,exact:true});
   const reread=()=>page.evaluate(()=>window.dispatchEvent(new Event('focus')));
   const homeSettled=()=>page.locator('[data-home-state="ready"][aria-busy="false"]:visible,[data-home-state="partial"][aria-busy="false"]:visible').waitFor();
   const login=async(id:string,lang:AuthLang)=>{const copy=AUTH_COPY[lang];await page.getByLabel(copy.employeeId,{exact:true}).fill(id);await page.getByLabel(copy.password,{exact:true}).fill(TEST_PASSWORD);await page.getByRole('button',{name:copy.signIn,exact:true}).click();await page.waitForURL(app.url+'/app');await homeSettled();};
   // An Employee opens More from the header avatar (board E-More), or Profile's ‹ More; a Lead from the More tab.
   const openMore=async()=>{await page.locator('a.c-top-avatar:visible,.mobile-nav-link[href="/app/more"]:visible,.c-nav__back[href="/app/more"]:visible').first().click();await page.waitForURL(app.url+'/app/more');};
   const openProfile=async()=>{await openMore();await page.locator('a[href="/app/profile"]:visible').first().click();await page.waitForURL(app.url+'/app/profile');};
   const signOutButton=()=>page.locator('form button[type="submit"]:visible').filter({hasText:/^Sign out$/}).first();
   await page.goto(app.url+'/login');await login(actor,'en');
   const noScript=await activeBrowser.newContext({viewport:{width:390,height:844},javaScriptEnabled:false,serviceWorkers:'block',storageState:await context.storageState()});
   try{const initial=await noScript.newPage();await initial.goto(app.url+'/app/profile');await initial.screenshot({path:evidence+'/'+engine+'-profile-before-hydration.png',fullPage:false});await writeFile(evidence+'/'+engine+'-profile-before-hydration.html',await initial.locator('body').innerHTML());expect(await initial.locator('.em-account').count()).toBe(1);expect(await initial.locator('.em-account').innerText()).not.toContain(ownName);expect(await initial.locator('.em-account').innerText()).not.toContain('Main Office');}finally{await noScript.close();}
   await page.bringToFront();await idle();record('Actual server-rendered mobile Profile DOM without hydration excludes the own identity and work facts');
   // Hold the actual own read, not a fabricated profile or authorization result.
   let releaseRead!:()=>void,readObserved=false;const heldRead=new Promise<void>(resolve=>{releaseRead=resolve;});
   await page.route('**/api/employee/profile',async(route:{fetch():Promise<unknown>;fulfill(options:{response:unknown}):Promise<void>})=>{const response=await route.fetch();readObserved=true;await heldRead;await route.fulfill({response});});
   stage='held-profile-read';await openProfile();await state('loading');
   expect(await root.innerText()).not.toContain(ownName);expect(await lang('English').isEnabled()).toBe(true);await shot('profile-loading');
   await expect.poll(()=>readObserved,{timeout:10000}).toBe(true);releaseRead();await ready();await idle();await page.unroute('**/api/employee/profile');
   expect(await priv.innerText()).toContain(ownName);expect(binding).toMatch(/^[a-f0-9]{64}$/);
   const forwardKey=engine==='webkit'&&process.platform==='darwin'?'Alt+Tab':'Tab';
   await page.locator('.em-account .c-nav__back').focus();await page.keyboard.press(forwardKey);expect(await lang('English').evaluate((el:HTMLElement)=>document.activeElement===el)).toBe(true);await page.keyboard.press(forwardKey);expect(await lang('Español').evaluate((el:HTMLElement)=>document.activeElement===el)).toBe(true);
   record('Native '+forwardKey+' order follows the visible More back link, then the language choices (the details refresh on focus; no Refresh control)');
   const foreign=await page.request.get(app.url+'/api/employee/profile?employeeId='+f.actors[1],{headers:{'X-Nevora-Employee-View':binding}});
   expect(foreign.status()).toBe(400);expect(await foreign.json()).toEqual({state:'unavailable',reason:'access_denied'});
   record('Actual held/current own profile; no identity while loading; strict no-selector HTTP boundary');await shot('profile-ready');
   stage='profile-private-pause';await page.evaluate(()=>window.dispatchEvent(new Event('offline')));await state('paused');
   expect(await root.innerText()).not.toContain(ownName);expect(await priv.innerText()).not.toContain('Main Office');expect(await lang('Español').isEnabled()).toBe(true);await shot('profile-paused');
   await page.evaluate(()=>window.dispatchEvent(new Event('online')));await ready();expect(await priv.innerText()).toContain(ownName);
   record('Pause removes own identity/work facts; unrelated preferences remain; resume reads current own facts');
   stage='profile-read-failure';expectedFailure=true;
   await page.route('**/api/employee/profile',async(route:{abort():Promise<void>})=>route.abort());await reread();await state('unavailable');
   expect(await root.innerText()).not.toContain(ownName);expect(await lang('English').isEnabled()).toBe(true);await shot('profile-read-unavailable');await idle();
   await page.unroute('**/api/employee/profile');await priv.getByRole('button',{name:'Try again',exact:true}).click();await ready();await idle();expectedFailure=false;
   record('Read failure is not empty or stale identity; native Try again recovers while preferences stay usable');
   stage='profile-matrix';
   // Release 1 is light only (board E-Profile has no Appearance choice), so the matrix covers widths, not themes.
   for(const width of [320,390,430]){
    const theme='light';await page.setViewportSize({width,height:844});await ready();
    expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
    for(const [subject,locator] of [['delete-account',page.getByRole('link',{name:/Delete my account/})],['language-hint',page.locator('#em-profile-language-hint')],['preference-label',page.locator('#em-profile-language')],['personal-value',priv.locator('.c-row').first()]] as const){const measured=await locator.evaluate(measureRenderedContrast);contrasts.push({engine,theme,width,subject,ratio:measured.ratio});expect(measured.ratio).toBeGreaterThanOrEqual(4.5);}
    const small=await page.locator('.em-account :is(a,button,select,summary)').evaluateAll((els:HTMLElement[])=>els.filter(el=>el.checkVisibility({visibilityProperty:true,opacityProperty:true})&&el.getBoundingClientRect().height<43.5).map(el=>el.textContent));expect(small).toEqual([]);
    expect(await page.locator('#profile-title').evaluate((el:HTMLElement)=>getComputedStyle(el).fontSize)).toBe('17px');
    await lang('English').focus();await shot('profile-'+theme+'-'+width);await viewport('profile-'+theme+'-'+width);
   }
   record('Light 320/390/430: sampled contrast, 44px targets, kit title token and no overflow');
   await page.setViewportSize({width:320,height:844});await page.evaluate(()=>{document.documentElement.style.fontSize='200%';document.documentElement.dataset.textStep='200';});
   expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
   // The corporate kit sizes text in px, so a 200% root size does not enlarge it (reported); nothing may clip or overflow.
   textScaling.push({engine,title:await page.locator('#profile-title').evaluate((el:HTMLElement)=>getComputedStyle(el).fontSize),row:await priv.locator('.c-row__title').first().evaluate((el:HTMLElement)=>getComputedStyle(el).fontSize)});
   const clipped=await page.locator('.em-account :is(.c-row__title,.c-row__detail,.c-card__label,.c-nav__title)').evaluateAll((els:HTMLElement[])=>els.filter(el=>el.checkVisibility({visibilityProperty:true,opacityProperty:true})&&(el.scrollHeight>el.clientHeight+1||el.scrollWidth>el.clientWidth+1)).map(el=>el.textContent));expect(clipped).toEqual([]);
   const last=page.getByRole('link',{name:/Delete my account/});await last.scrollIntoViewIfNeeded();expect(await last.evaluate((el:HTMLElement)=>el.getBoundingClientRect().bottom<=document.querySelector('.mobile-nav')!.getBoundingClientRect().top+1)).toBe(true);
   await shot('profile-text200');await viewport('profile-text200');
   await page.evaluate(()=>{document.documentElement.style.fontSize='100%';delete document.documentElement.dataset.textStep;});await page.setViewportSize({width:390,height:844});
   record('200% text: no clipped rows or titles and the last Profile control clears the tab bar');
   stage='language-reload';await idle();const reloaded=page.waitForEvent('load');await lang('Español').click();await reloaded;await ready();await idle();
   expect(await lang('Español').getAttribute('aria-pressed')).toBe('true');expect(await lang('English').getAttribute('aria-pressed')).toBe('false');
   expect((await context.cookies()).find((cookie:{name:string})=>cookie.name===AUTH_LANG_COOKIE)?.value).toBe('es');const titles=await page.getByRole('heading',{name:'Profile and settings',exact:true}).count();
   // A Lead's shell has no corporate attributes, so a Lead's phone shows both the header title and the large title (reported; Lead is on hold).
   if(index===1){expect(titles).toBeGreaterThanOrEqual(1);leadTitles.push({engine,titles});}else expect(titles).toBe(1);await shot('profile-language-device-persistence');
   record('Deliberate sign-in language cookie/reload keeps current profile; application language remains truthfully scoped');
   stage='contextual-support';await openMore();/* Nov 1 upscale (kit consistency 9): More's Help opens Help inside the app (/app/help, the same Support content), not the public /support page. */expect(await page.locator('a[href="/support"]:visible').count()).toBe(0);await page.locator('a[href="/app/help"]:visible').click();await page.waitForURL(app.url+'/app/help');const helpTitle=page.getByRole('heading',{name:'Help',exact:true,level:1});await helpTitle.first().waitFor();/* As on Profile above: a Lead's shell has no corporate attributes, so a Lead's phone shows the header title and the large title (Lead is on hold). */if(index===1){expect(await helpTitle.count()).toBeGreaterThanOrEqual(1);leadTitles.push({engine,titles:await helpTitle.count()});}else expect(await helpTitle.count()).toBe(1);expect(await page.locator('main .c-nav:visible').getByRole('link',{name:'More',exact:true}).getAttribute('href')).toBe('/app/more');expect(await page.getByRole('link',{name:'Email support, '+SUPPORT_EMAIL,exact:true}).getAttribute('href')).toBe('mailto:'+SUPPORT_EMAIL);
   const documentMatrix=async(name:string)=>{await page.setViewportSize({width:320,height:844});await page.evaluate(()=>{document.documentElement.style.fontSize='200%';});expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);await shot(name+'-text200');await viewport(name+'-text200');await page.evaluate(()=>{document.documentElement.style.fontSize='100%';});await page.setViewportSize({width:390,height:844});};
   await documentMatrix('support');
   expect(await page.locator('main').textContent()).toContain(SUPPORT_EMAIL);expect(await page.locator('main').textContent()).toContain(POLICY_FACTS.SUPPORT_RESPONSE_TIME!);await shot('support-context');
   /* Nov 1 upscale (kit consistency 9): an unknown /app address shows the in-app 404 inside the signed-in shell (tab bar kept, no tab lit) with one way Home. */
   await page.goto(app.url+'/app/no-such-page-fictional');await page.getByRole('heading',{name:'This page doesn’t exist',exact:true,level:1}).waitFor();expect(await page.getByRole('link',{name:'Go to Home',exact:true}).getAttribute('href')).toBe('/app');expect(await page.locator('.mobile-nav').isVisible()).toBe(true);expect(await page.locator('.mobile-nav a[aria-current="page"]').count()).toBe(0);expect(new URL(page.url()).pathname).toBe('/app/no-such-page-fictional');await shot('in-app-not-found');
   await page.goBack();await page.waitForURL(app.url+'/app/help');
   await page.goBack();await page.waitForURL(app.url+'/app/more');await page.locator('a[href="/privacy"]:visible').click();await page.waitForURL(app.url+'/privacy');expect(await page.locator('main').textContent()).toContain(POLICY_FACTS.EMPLOYER_DATA_RESPONSIBILITIES!);await shot('privacy-context');await documentMatrix('privacy');
   await page.goBack();await page.waitForURL(app.url+'/app/more');
   record('Help and legal on More open the in-app Help page (the canonical Support content) and the actual Privacy page; no email sent');
   stage='desktop-isolation';await page.locator('a[href="/app/profile"]:visible').first().click();await page.waitForURL(app.url+'/app/profile');await ready();
   const privateNode=await priv.elementHandle();await page.setViewportSize({width:1440,height:1000});await ready();expect(await privateNode!.evaluate((el:HTMLElement)=>el.isConnected)).toBe(true);expect(await priv.innerText()).toContain(ownName);await shot('profile-desktop-preserved');
   await page.setViewportSize({width:390,height:844});await ready();expect(await privateNode!.evaluate((el:HTMLElement)=>el.isConnected)).toBe(true);record('One Profile on every width; responsive switches do not remount the private read owner');
   stage='current-session-denial';expectedFailure=true;
   const session=(await context.cookies()).find((cookie:{name:string})=>cookie.name==='fuel_session');expect(session).toBeTruthy();await q('DELETE FROM employee_sessions WHERE token_hash=$1',[createHash('sha256').update(session!.value).digest('hex')]);await reread();await state('denied');
   expect(await root.innerText()).not.toContain(ownName);expect(await priv.locator('a[href="/login"]').count()).toBe(1);expect(await lang('English').isEnabled()).toBe(true);await shot('profile-current-denial');await idle();expectedFailure=false;
   await priv.locator('a[href="/login"]').click();await page.waitForURL(app.url+'/login');await idle();expect(await page.getByRole('button',{name:AUTH_COPY.es.signIn,exact:true}).count()).toBe(1);
   record('Actual session revocation clears identity; its Sign in link opens the actual Spanish sign-in copy');
   stage='new-account';await login(f.actors[1],'es');await openProfile();await ready();await idle();
   const [peer]=await q<{name:string}>('SELECT first_name||\' \'||last_name AS name FROM employees WHERE id=$1',[f.actors[1]]);
   expect(await priv.innerText()).toContain(peer.name);expect(await root.innerText()).not.toContain(ownName);expect(await lang('Español').getAttribute('aria-pressed')).toBe('true');await shot('profile-new-account-isolation');record('A genuine different account gets only its own current identity; the device language keeps its intended scope');
   // An unverifiable old enrollment is deliberate failure input, never a cleanup success fixture.
   const opaque='fictional-unverifiable-prior-enrollment-'+engine;await context.addCookies([{name:INSTALLATION_COOKIE,value:opaque,url:app.url,httpOnly:true,sameSite:'Strict'}]);
   expect((await q<{n:number}>('SELECT count(*)::integer AS n FROM employee_sessions WHERE employee_id=$1',[f.actors[1]]))[0].n).toBe(1);
   let releaseLogout!:()=>void,logoutHeld=false;const logoutGate=new Promise<void>(resolve=>{releaseLogout=resolve;});
   const cookieShape=async()=>({cookies:(await context.cookies()).map((cookie:{name:string;path:string;expires:number;httpOnly:boolean})=>({name:cookie.name,path:cookie.path,expires:cookie.expires,httpOnly:cookie.httpOnly}))});
   // Sign out lives on More (board E-More). Hold its native submission before dispatch. Replaying route.fetch's
   // multi-cookie response changes WebKit cookie handling; the real response stays untouched.
   await openMore();const beforeFence=await page.evaluate(()=>localStorage.getItem('fuel-portal-account-fence'));
   const signoutRoute=(url:URL)=>url.pathname==='/app/more';
   await page.route(signoutRoute,async(route:{request():BrowserRequest;continue():Promise<void>})=>{if(route.request().method()==='POST'&&route.request().headers()['next-action']){logoutHeld=true;await logoutGate;}await route.continue();});
   stage='signout-intent-and-pending-device-cleanup';const signOut=signOutButton();await signOut.scrollIntoViewIfNeeded();expect(await signOut.evaluate((el:HTMLElement)=>el.getBoundingClientRect().bottom<=document.querySelector('.mobile-nav')!.getBoundingClientRect().top+1)).toBe(true);
   await signOut.click();await expect.poll(()=>logoutHeld,{timeout:10000}).toBe(true);
   expect(await page.evaluate(()=>localStorage.getItem('fuel-portal-account-fence'))).not.toBe(beforeFence);
   expect((await q<{n:number}>('SELECT count(*)::integer AS n FROM employee_sessions WHERE employee_id=$1',[f.actors[1]]))[0].n).toBe(1);signoutHeldText.push({engine,text:await page.locator('main').innerText()});await shot('profile-signout-held-native-submission');
   releaseLogout();await page.waitForURL(app.url+'/login');await idle();await page.unroute(signoutRoute);expect((await q<{n:number}>('SELECT count(*)::integer AS n FROM employee_sessions WHERE employee_id=$1',[f.actors[1]]))[0].n).toBe(0);const cookies=await context.cookies();await writeFile(evidence+'/'+engine+'-logout-completed-cookie-shape.json',JSON.stringify(await cookieShape(),null,2));expect(cookies.some((cookie:{name:string})=>cookie.name==='fuel_session')).toBe(false);const retained=cookies.find((cookie:{name:string})=>cookie.name===CLEANUP_COOKIE);expect(retained?.value).toBe(opaque);expect(retained?.httpOnly).toBe(true);expect(await page.locator('body').innerText()).not.toContain(peer.name);await shot('profile-signout-unresolved-device-proof');
   record('Native signout on More fences device ownership at once; real session deleted, cookie removed, opaque unresolved device cleanup retained without a false all-complete claim');
   await idle();await writeFile(evidence+'/'+engine+'-calendar-observer.json',JSON.stringify({retiredCalendarReads,trace:calendarTrace(await readFile(join(app.root,'next.log'),'utf8'))},null,2));await context.close();await browser!.close();browser=undefined;failed=undefined;
  }
  expect(messages.filter(m=>m.type==='pageerror')).toEqual([]);expect(messages.filter(m=>m.type==='error'&&!m.expected)).toEqual([]);
 }catch(error){await failed?.();throw error;}
 finally{await writeFile(evidence+'/results.json',JSON.stringify({checks,captures,contrasts,messages,textScaling,signoutHeldText,leadTitles,limits:['Controlled loopback browsers, fictional accounts and no real notifications. Native OS/provider enrollment and verified installation-detach coverage belong to the next capability batch; this run checks no-installation signout and actual unresolved-proof retention. Physical devices/AT/hosted/release remain separate.']},null,2));await browser?.close();await app.close();}
},600000);
