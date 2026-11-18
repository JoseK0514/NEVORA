import {accessTargetHeights} from "./access-target-geometry";
import {it,expect} from '@rstest/core';
import {createRequire} from 'node:module';
import {resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
import {mkdir,writeFile} from 'node:fs/promises';
import {randomUUID} from 'node:crypto';
import {createOwnedNextApp} from './owned-next-app';
import {createOwnedSmtp} from './owned-smtp';
import {seedOwnedApp,TEST_PASSWORD} from './owned-app-fixture';
import {measureRenderedContrast} from '../../../scripts/browser-contrast.mjs';
import {hashPassword} from '../../lib/auth/password';

it('integrates frozen mobile Access with real sessions, activation, recovery and protected Owner permissions',async()=>{
 const evidence=process.env.NEVORA_MOBILE_ACCESS_EVIDENCE;
 if(!evidence)throw Error('Select external NEVORA_MOBILE_ACCESS_EVIDENCE');
 await mkdir(evidence,{recursive:true});
 const runtime=createRequire(process.env.NEVORA_PLAYWRIGHT_RUNTIME_PACKAGE??resolve('tools/ci-browser-runtime/package.json'))('playwright');
 const smtp=await createOwnedSmtp();
 const app=await createOwnedNextApp(evidence,{mobileAccessEnabled:true,mobileSupportEnabled:true,recoverySmtpPort:smtp.port,invitationSmtpPort:smtp.port,pinDevTypeReferences:true}).catch(async error=>{await smtp.close();throw error;});
 const guideContrast:unknown[]=[];
 const profileNavigation:{engine:string;actor:string;elapsedMs:number;state:string;path:string}[]=[];
 const checks:string[]=[],errors:string[]=[],windowExceptions:string[]=[],frameworkDiagnostics:unknown[]=[],browsers:{close():Promise<void>}[]=[];
 const {observeDocumentNavigation,observeWindowExceptions}=await import(pathToFileURL(resolve('scripts/browser-navigation-diagnostic.mjs')).href);
 const {projectFrameworkNativeDiagnostic}=await import(pathToFileURL(resolve('scripts/role-redirect-diagnostic.mjs')).href);
 const secrets:string[]=[TEST_PASSWORD];
 const clean=(text:string)=>secrets.reduce((s,token)=>s.replaceAll(token,'[REDACTED]'),text);
 const q=(text:string,values:unknown[]=[])=>app.database.executor.query({text,values});
 const origin=app.url;
 let complete=false,step='startup';
 try{
  await q("INSERT INTO employees(id,first_name,last_name,email,phone,role,primary_location_id) VALUES('MA-MANAGER','Fixture','Manager','manager@example.invalid','2025550100','MANAGER','loc-1')");
  for(const engine of ['chromium','webkit','firefox'])await q('INSERT INTO employees(id,first_name,last_name,email,phone,role,primary_location_id) VALUES($1,$2,$3,$4,$5,$6,$7)',[`MA-${engine}`,'Fixture','Employee',`${engine}@example.invalid`,'2025550101','EMPLOYEE','loc-1']);
  await q('INSERT INTO employee_credentials(employee_id,password_hash,must_change_password) VALUES($1,$2,false)',['MA-MANAGER',await hashPassword(TEST_PASSWORD)]);
  await seedOwnedApp(app.database.executor);
  for(const engine of ['chromium','webkit','firefox']){
   const browser=await runtime[engine].launch({headless:true});browsers.push(browser);
   // A real thrown exception with the same native-looking name/message must still reach the independent window channel.
   const control=await browser.newContext(),samples:string[]=[],controlErrors:Error[]=[];await observeWindowExceptions(control,(_page:unknown,kind:string)=>samples.push(kind));
   const probe=await control.newPage();probe.on('pageerror',(e:Error)=>controlErrors.push(e));await probe.goto('about:blank');
   await probe.evaluate((message:string)=>{setTimeout(()=>{const e=new Error(message);e.name='Fetch API cannot load http';throw e;},0);setTimeout(()=>{void Promise.reject(new Error('Owned mobile rejection control'));},0);},'/'+new URL(origin).host+'/__nextjs_original-stack-frames due to access control checks.');
   await expect.poll(()=>samples.filter(kind=>kind==='error').length).toBe(1);await expect.poll(()=>samples.filter(kind=>kind==='unhandledrejection').length).toBe(1);await expect.poll(()=>controlErrors.length).toBe(2);
   expect(projectFrameworkNativeDiagnostic(controlErrors.find(e=>e.name==='Fetch API cannot load http'),origin,'MOBILE')).not.toBeNull();await control.close();
   const watch=(target:{on:(event:string,listener:(error:Error)=>void)=>unknown})=>{const navigation=observeDocumentNavigation(target,()=>origin);target.on('pageerror',(e:Error)=>{const diagnostic=engine==='webkit'&&navigation.pending()?projectFrameworkNativeDiagnostic(e,origin,'MOBILE'):null;if(diagnostic)frameworkDiagnostics.push({engine,step,navigation:navigation.snapshot(),...diagnostic});else errors.push(engine+': '+step+': '+clean(e.name+' '+e.message));});};
   const context=await browser.newContext({viewport:{width:390,height:844},reducedMotion:'reduce',serviceWorkers:'block'});
   await context.route('**/*',async(route:{request():{url():string};abort(reason?:string):Promise<void>;continue():Promise<void>})=>{
    const url=new URL(route.request().url());if(['http:','https:'].includes(url.protocol)&&url.origin!==origin)await route.abort('blockedbyclient');else await route.continue();
   });
   await observeWindowExceptions(context,(_page:unknown,kind:string)=>windowExceptions.push(engine+': '+step+': '+kind));
   const page=await context.newPage();page.setDefaultTimeout(15000);watch(page);
   await page.goto(origin+'/welcome');await page.locator('#mobile-access-page').waitFor();expect(await page.locator('h1').innerText()).toContain('Brighter work');
   for(const width of [320,390,430]){
    await page.setViewportSize({width,height:844});
    for(const lang of ['en','es']){
     await context.addCookies([{name:'nv-lang',value:lang,url:origin}]);
     for(const path of ['/welcome','/login','/forgot-access','/reset-access','/activate','/access-help','/access-help/email','/access-help/invitation','/access-help/support','/access-help/owner-contact']){
      expect((await page.goto(origin+path))?.status()).toBe(200);await page.locator('#mobile-access-page').waitFor();
      expect(await page.locator('#mobile-access-page').getAttribute('lang')).toBe(lang);
      expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),engine+path+width+lang).toBe(true);
      if(engine==='chromium'&&width===390){await page.addStyleTag({content:'nextjs-portal{display:none}'});await page.screenshot({path:evidence+'/'+lang+path.replaceAll('/','-')+'.png',fullPage:false});}
      await page.addStyleTag({content:'html{font-size:200%}'});
      expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),engine+path+width+lang+' enlarged').toBe(true);
     }
    }
   }
   checks.push(engine+': mobile EN/ES,320/390/430,normal/200% layouts');
   await page.setViewportSize({width:390,height:844});await context.addCookies([{name:'nv-lang',value:'en',url:origin}]);
   step=engine+': keyboard and control geometry';await page.goto(origin+'/login');if(engine==='webkit')await page.locator('.ma-skip').focus();else await page.keyboard.press('Tab');await page.keyboard.press('Enter');expect(await page.locator('#access-content').evaluate((e:HTMLElement)=>e===document.activeElement)).toBe(true);
   const field=await page.locator('#login-employee-id').boundingBox(),button=await page.locator('.q-auth__form .q-btn').boundingBox();if(!field||!button)throw Error('Control geometry unavailable');expect(Math.abs(field.width-button.width),'Sign-in action matches field width').toBeLessThanOrEqual(1);
   const eye=await page.locator('.q-in__eye').boundingBox(),password=await page.locator('#login-password').boundingBox();if(!eye||!password)throw Error('Password geometry unavailable');expect(Math.abs((eye.y+eye.height/2)-(password.y+password.height/2)),'Password visibility control is vertically centered with reduced motion').toBeLessThanOrEqual(1);
   for(const selector of ['.q-auth__form .q-btn','#login-employee-id','#login-password','.ma-language']){const target=page.locator(selector);await target.scrollIntoViewIfNeeded();expect((await target.evaluateAll(accessTargetHeights))[0],selector+' actual hit target').toBeGreaterThanOrEqual(44);}
   step=engine+': locale and assistance';await page.goto(origin+'/forgot-access');await page.locator('#recovery-employee-id').fill('MA-'+engine);await page.locator('#recovery-email').fill(engine+'@example.invalid');
   await page.locator('.ma-language').click();await expect.poll(()=>page.locator('#mobile-access-page').getAttribute('lang')).toBe('es');
   expect(await page.locator('#recovery-employee-id').inputValue()).toBe('MA-'+engine);expect(await page.locator('#recovery-email').inputValue()).toBe(engine+'@example.invalid');
   await page.locator('.ma-footer-help').click();await page.locator('main a[href*="/access-help/support"]').click();await page.waitForURL((url:URL)=>url.pathname==='/access-help/support');await page.locator('.ma-back[href="/access-help?from=recover"]').click();await page.waitForURL(origin+'/access-help?from=recover');await page.locator('.ma-back[href="/forgot-access"]').waitFor();expect(await page.locator('.ma-back').getAttribute('href')).toBe('/forgot-access');await page.locator('.ma-back').click();await page.waitForURL('**/forgot-access');expect(new URL(page.url()).pathname).toBe('/forgot-access');await page.locator('#recovery-employee-id').waitFor();await page.waitForLoadState('networkidle');
   // Follow the real Help links after contextual Back; a new document navigation can race a pending SPA commit.
   await page.locator('.ma-footer-help').click();await page.locator('main a[href*="/access-help/support"]').click();await page.locator('#access-message').waitFor({state:'attached'});await page.evaluate(()=>Object.defineProperty(navigator,'clipboard',{configurable:true,value:{writeText:async()=>{throw Error('fixture denial');}}}));await page.locator('.ma-draft button').click();await expect.poll(()=>page.locator('#access-message').evaluate((e:HTMLTextAreaElement)=>e.selectionEnd-e.selectionStart)).toBe((await page.locator('#access-message').inputValue()).length);
   const mail=new URL(await page.locator('.ma-draft a').getAttribute('href'));expect(mail.protocol).toBe('mailto:');expect(mail.pathname).toBe('support@thevelani.com');expect([...mail.searchParams.keys()]).toEqual(['subject','body']);
   checks.push(engine+': locale drafts, contextual Back, manual-copy fallback and fixed mail recipient');
   await context.addCookies([{name:'nv-lang',value:'en',url:origin}]);
   async function login(id:string,password=TEST_PASSWORD,target=page){
    step=engine+': sign-in for '+id;await target.goto(origin+'/login');await target.locator('#login-employee-id').fill(id);await target.locator('#login-password').fill(password);await target.locator('button[type="submit"]').click();await target.waitForURL('**/app',{timeout:45000});
    // Both fixtures predate the owned adoption migration, which grants the existing Manager company scope.
    // Owner Home is the corporate page (.c-home) since Oct 30; a Manager keeps the earlier management Home.
    step=engine+': authorized management Home for '+id;await target.locator('.c-home, .premium-home').first().waitFor();
   }
   step=engine+': invitation and activation';await login('QAOWNER');
   const headers={'Origin':origin,'x-nevora-company-access':'1','x-nevora-actor':'QAOWNER'};
   const status=await context.request.get(origin+'/api/company-access/invitations/MA-'+engine,{headers});expect(status.status()).toBe(200);const current=await status.json();expect(current.state).toBe('ready');
   const response=await context.request.post(origin+'/api/company-access/invitations/MA-'+engine,{headers,data:{action:'ISSUE',operationId:randomUUID(),expectedEmployeeVersion:current.employeeVersion,expectedInvitationRevision:current.invitationRevision}});expect(response.status()).toBe(200);
   const captured=smtp.messages.find((m:{recipient:string})=>m.recipient.includes(engine+'@example.invalid'));expect(Boolean(captured)).toBe(true);
   const body=captured!.body.replace(/=\r?\n/g,'').replace(/=3D/g,'=');const proof=/#proof=([A-Za-z0-9_-]{43})/.exec(body)?.[1];if(!proof)throw Error('Owned invitation proof missing');secrets.push(proof);
   const employee=await browser.newContext({viewport:{width:390,height:844},reducedMotion:'reduce',serviceWorkers:'block'});await employee.addCookies([{name:'nv-lang',value:'es',url:origin}]);await observeWindowExceptions(employee,(_page:unknown,kind:string)=>windowExceptions.push(engine+': '+step+': '+kind));const join=await employee.newPage();join.setDefaultTimeout(20000);watch(join);
   async function openOwnProfile(actor:'Employee'|'Manager'){
    const started=Date.now(),previousStep=step;let state='opening More';
    try{
     step=engine+': '+actor+' More navigation';
     /* Release 1: an Employee opens More from the header avatar (its tab bar has no More); a Manager still has the More tab. */await join.locator('.mobile-nav:visible a[href="/app/more"], a.c-top-avatar[href="/app/more"]:visible').first().click();await join.waitForURL('**/app/more');
     /* Owner premium: More opens Profile from one row (the person's name) for every role. */const profile=join.locator('main a[href="/app/profile"]:visible');await profile.waitFor();expect(await profile.count()).toBe(1);
     state='More ready';profileNavigation.push({engine,actor,elapsedMs:Date.now()-started,state,path:new URL(join.url()).pathname});
     step=engine+': '+actor+' Profile navigation';await profile.click();
     await join.waitForURL('**/app/profile');/* Release 1 (board E-Profile): an Employee's Sign out lives on More, so Profile is ready at its Display card; Owner premium A9: a Manager's Sign out also lives once, on More, so a Manager's Profile is ready at its details list. */if(actor==='Employee')await join.locator('#b-profile-display').waitFor();else{await join.locator('#profile-details-list').waitFor();expect(await join.getByRole('button',{name:'Sign out',exact:true}).count()).toBe(0);}
     state='Profile ready';profileNavigation.push({engine,actor,elapsedMs:Date.now()-started,state,path:new URL(join.url()).pathname});step=previousStep;
    }catch(error){profileNavigation.push({engine,actor,elapsedMs:Date.now()-started,state:'failed after '+state,path:new URL(join.url()).pathname});throw error;}
   }
   step=engine+': activation fragment and retained responsive fields';await join.goto(origin+'/activate#proof='+proof);await join.locator('#activation-password').waitFor();await expect.poll(()=>new URL(join.url()).hash).toBe('');
   expect(await join.locator('main').innerText()).not.toMatch(/Invitation verified|invitación verificada/i);
   await join.locator('#activation-password').fill(TEST_PASSWORD);await join.locator('#activation-confirm-password').fill(TEST_PASSWORD);
   await join.locator('.ma-language').click();await expect.poll(()=>join.locator('#mobile-access-page').getAttribute('lang')).toBe('en');expect(await join.locator('#activation-password').inputValue()).toBe(TEST_PASSWORD);
   await join.setViewportSize({width:1440,height:900});await join.locator('#activation-password-hint').waitFor();expect(await join.locator('#activation-password-hint').innerText()).toContain('15');expect(await join.locator('h1').innerText()).toBe('Set up your account');expect(await join.locator('#activation-password').inputValue()).toBe(TEST_PASSWORD);expect(await join.locator('form').count()).toBe(1);
   await join.setViewportSize({width:390,height:844});await expect.poll(()=>join.locator('.ma-passwords').count()).toBe(1);expect(await join.locator('#activation-confirm-password').inputValue()).toBe(TEST_PASSWORD);
   await join.locator('.ma-language').click();await expect.poll(()=>join.locator('#mobile-access-page').getAttribute('lang')).toBe('es');
   await join.locator('button[type="submit"]').click();await join.locator('#activation-employee-id').waitFor();expect(await join.locator('#activation-employee-id').inputValue()).toBe('MA-'+engine);
   await join.locator('a[href*="activated=1"]').click();expect(await join.locator('#login-employee-id').inputValue()).toBe('MA-'+engine);await join.locator('#login-password').fill(TEST_PASSWORD);await join.locator('button[type="submit"]').click();await join.waitForURL('**/app',{timeout:45000});await join.locator('.ma-onboarding:visible summary').waitFor();await join.locator('.ma-onboarding:visible summary').click();expect(await join.locator('.ma-guide-list a[href="/app/schedule"]').count()).toBe(1);step=engine+': authenticated first Employee Home guide';await join.locator('[data-employee-mobile-active="true"]').waitFor();/* Release 1: the corporate Employee Home (board C-Employee); the Quick guide stays anchored below the next-shift card. */await join.locator('#b-home-shift:visible').waitFor();const placement=await join.evaluate(()=>({guide:[...document.querySelectorAll('.ma-onboarding')].find(el=>el.getClientRects().length)!.getBoundingClientRect().top,day:document.querySelector('#b-home-shift')!.getBoundingClientRect().bottom}));expect(placement.guide).toBeGreaterThan(placement.day);await join.locator('.ma-onboarding:visible').scrollIntoViewIfNeeded();/* Measure settled paint: wait until no ancestor of the guide is still fading in. */await join.waitForFunction(()=>{for(let node:Element|null=[...document.querySelectorAll('.ma-onboarding')].find(el=>el.getClientRects().length)??null;node;node=node.parentElement){const style=getComputedStyle(node);if(style.opacity!=='1'||style.filter!=='none'||style.mixBlendMode!=='normal')return false;}return true;},undefined,{timeout:10000});/* Release 1 is light only: an Employee has no Appearance choice (board E-Profile) and the corporate Home has no dark tokens, so the guide is measured in light. */for(const theme of ['light']){await join.evaluate((theme:string)=>{localStorage.setItem('nv-theme',theme);document.documentElement.dataset.theme=theme;(window as Window&{__nvApplyTheme?:()=>void}).__nvApplyTheme?.();},theme);expect(await join.locator('html').getAttribute('data-theme')).toBe(theme);for(const label of await join.locator('.ma-onboarding :is(summary,h2,b,small,p):visible').all()){const sample=await label.evaluate(measureRenderedContrast);guideContrast.push({engine,theme,label:(await label.innerText()).trim(),ratio:sample.ratio});expect(sample.ratio).toBeGreaterThanOrEqual(4.5);}await join.screenshot({path:evidence+'/'+engine+'-first-guide-'+theme+'.png',fullPage:false,style:'nextjs-portal {visibility:hidden;}'});}await join.evaluate(()=>{localStorage.setItem('nv-theme','light');document.documentElement.dataset.theme='light';(window as Window&{__nvApplyTheme?:()=>void}).__nvApplyTheme?.();});await join.waitForLoadState('networkidle');await join.addStyleTag({content:'nextjs-portal{display:none}'});await join.evaluate(()=>scrollTo(0,0));await join.screenshot({path:evidence+'/'+engine+'-first-home.png',fullPage:false});
   expect((await employee.request.post(origin+'/api/company-access/invitations/MA-'+engine,{headers:{Origin:origin,'x-nevora-company-access':'1','x-nevora-actor':'MA-'+engine},data:{action:'ISSUE'}})).status()).toBe(403);
   const badReset=await employee.request.post(origin+'/api/auth/reset-access',{headers:{Origin:origin,'x-nevora-recovery':'1'},data:{proof:'K7M4PQ8R2T',password:TEST_PASSWORD}});expect(badReset.status()).toBe(400);
   checks.push(engine+': real Owner-issued local email → activation → confirmed ID → ordinary sign-in → real Employee Home; employee issuance denied; short proof rejected');
   step=engine+': recovery and reset';await join.goto(origin+'/forgot-access');await join.locator('#recovery-id-help').waitFor();await join.locator('#recovery-employee-id').fill('MA-'+engine);await join.locator('#recovery-email').fill(engine+'@example.invalid');await join.locator('button[type="submit"]').click();await join.locator('.ma-receipt').waitFor();
   await join.locator('details').filter({has:join.locator('button')}).locator('summary').click();await join.getByRole('button',{name:'Revisar tus datos',exact:true}).click();await join.locator('#recovery-email').waitFor();expect(await join.locator('#recovery-email').inputValue()).toBe(engine+'@example.invalid');
   await join.locator('#recovery-employee-id').fill('CORRECTED-ID');expect(await join.locator('#recovery-email').inputValue()).toBe('');
   await join.locator('#recovery-email').fill('corrected@example.invalid');await join.locator('button[type="submit"]').click();await join.locator('.ma-receipt').waitFor();
   const resetMail=smtp.messages.find((m:{recipient:string;body:string})=>m.recipient.includes(engine+'@example.invalid')&&m.body.includes('/reset-access'));if(!resetMail)throw Error('Owned recovery mail missing');
   const resetProof=/#proof=([A-Za-z0-9_-]{43})/.exec(resetMail.body.replace(/=\r?\n/g,'').replace(/=3D/g,'='))?.[1];if(!resetProof)throw Error('Owned recovery proof missing');secrets.push(resetProof);
   await join.goto(origin+'/reset-access');await join.locator('.ma-passwords').waitFor();await join.locator('#reset-proof').fill('A'.repeat(43));await join.locator('#reset-password').fill(TEST_PASSWORD);await join.locator('#reset-confirm-password').fill(TEST_PASSWORD+'different');await join.locator('button[type="submit"]').click();await expect.poll(()=>join.locator('#reset-error').innerText()).toContain('Revisa tus contraseñas');expect(await join.locator('#reset-error').evaluate((e:HTMLElement)=>e===document.activeElement)).toBe(true);
   await join.locator('#reset-confirm-password').fill(TEST_PASSWORD);await join.locator('button[type="submit"]').click();await expect.poll(()=>join.locator('#reset-error').innerText()).toContain('Este código no se puede usar');
   await join.goto(origin+'/reset-access#proof='+resetProof);await join.locator('.ma-passwords').waitFor();await expect.poll(()=>join.locator('#reset-proof').inputValue().then((value:string)=>value.length)).toBe(43);expect(new URL(join.url()).hash).toBe('');
   const nextPassword=' Fictional-reset-'+engine+'! ';secrets.push(nextPassword);await join.locator('#reset-password').fill(nextPassword);await join.locator('#reset-confirm-password').fill(nextPassword);
   await join.setViewportSize({width:1440,height:900});await expect.poll(()=>join.locator('.ma-passwords').count()).toBe(0);expect((await join.locator('#reset-proof').inputValue()).length).toBe(43);expect(await join.locator('#reset-password').inputValue()).toBe(nextPassword);
   await join.setViewportSize({width:390,height:844});await expect.poll(()=>join.locator('.ma-passwords').count()).toBe(1);await join.locator('.ma-language').click();await expect.poll(()=>join.locator('#mobile-access-page').getAttribute('lang')).toBe('en');expect((await join.locator('#reset-proof').inputValue()).length).toBe(43);
   await join.locator('button[type="submit"]').click();await expect.poll(()=>join.locator('h1').innerText()).toBe('Password updated');
   const protectedRead=await employee.request.get(origin+'/app',{maxRedirects:0});expect([303,307,308]).toContain(protectedRead.status());expect(protectedRead.headers().location).toMatch(/^\/login/);
   expect((await employee.request.post(origin+'/api/auth/reset-access',{headers:{Origin:origin,'x-nevora-recovery':'1'},data:{proof:resetProof,password:nextPassword}})).status()).toBe(400);
   await join.locator('a.q-btn[href="/login"]').click();await join.locator('#login-employee-id').fill('MA-'+engine);await join.locator('#login-password').fill(nextPassword);await join.locator('button[type="submit"]').click();await join.waitForURL('**/app',{timeout:45000});
   checks.push(engine+': real recovery mail, editable receipt, identity correction, full-proof locale/resize custody, atomic reset/session revocation/single use and new-password sign-in');
   step=engine+': logout and account switch';await openOwnProfile('Employee');await join.locator('.b-back[href="/app/more"]:visible').click();await join.waitForURL('**/app/more');await join.getByRole('button',{name:'Sign out',exact:true}).click();await join.waitForURL('**/login');expect(await join.locator('#login-employee-id').inputValue()).toBe('');
   await join.locator('#login-employee-id').fill('MA-MANAGER');await join.locator('#login-password').fill(TEST_PASSWORD);await join.locator('button[type="submit"]').click();await join.waitForURL('**/app',{timeout:45000});expect(await join.locator('.ma-onboarding').count()).toBe(0);/* Manager Home polls its reads, so the network may never idle on a slow runner; wait for the loaded page and its heading instead. */await join.waitForLoadState('load');await join.locator('main h1').first().waitFor();expect(await join.locator('.ma-onboarding').count()).toBe(0);
   await openOwnProfile('Manager');await join.locator('.q-nav__l[href="/app/more"]:visible, .c-nav__back[href="/app/more"]:visible').first().click();await join.waitForURL('**/app/more');await join.getByRole('button',{name:'Sign out',exact:true}).click();await join.waitForURL('**/login');expect(await join.locator('#login-employee-id').inputValue()).toBe('');await join.locator('#login-employee-id').fill('MA-'+engine);await join.locator('#login-password').fill(nextPassword);await join.locator('button[type="submit"]').click();await join.waitForURL('**/app',{timeout:45000});/* Upscale M7: the Quick guide shows only in the session right after activation; a returning Employee's Home has none (its "Coming up" takes the place). */await join.locator('[data-home-state="ready"],[data-home-state="partial"]').waitFor({state:'attached'});await join.locator('#b-home-shift:visible').waitFor();expect(await join.locator('.c-ehome:visible').count()).toBe(1);expect(await join.locator('.ma-onboarding').count()).toBe(0);expect(await join.locator('.ma-onboarding-intro').count()).toBe(0);
   checks.push(engine+': real logout clears ID; different-role sign-in has no Employee guide; the Quick guide and activation intro do not return after account switch');
   await employee.close();
   // Keep the Owner setup session isolated from this independent Manager permission check.
   const managerContext=await browser.newContext({viewport:{width:390,height:844},reducedMotion:'reduce',serviceWorkers:'block'});
   try{
    await observeWindowExceptions(managerContext,(_page:unknown,kind:string)=>windowExceptions.push(engine+': '+step+': '+kind));
    const managerPage=await managerContext.newPage();managerPage.setDefaultTimeout(15000);watch(managerPage);
    await login('MA-MANAGER',TEST_PASSWORD,managerPage);
    expect((await managerContext.request.post(origin+'/api/company-access/invitations/MA-'+engine,{headers:{Origin:origin,'x-nevora-company-access':'1','x-nevora-actor':'MA-MANAGER'},data:{action:'ISSUE'}})).status()).toBe(403);
   }finally{await managerContext.close();}
   checks.push(engine+': Manager cannot issue invitations');
   await context.close();
  }
  expect(windowExceptions).toEqual([]);expect(errors).toEqual([]);complete=true;
 }catch(error){throw new Error(step+': '+clean(error instanceof Error?error.message:String(error)));}finally{
  for(const browser of browsers)await browser.close();let closed=false;try{await app.close();closed=true;}finally{await smtp.close();
  await writeFile(evidence+'/mobile-access-results.json',JSON.stringify({complete:complete&&closed,scope:'Real Next/server actions, invocation-owned PostgreSQL and loopback SMTP only; no real email/native clipboard/production service used.',checks,errors,windowExceptions,frameworkDiagnostics,guideContrast,profileNavigation},null,2));}
 }
});

it('PB-026 and PB-022 enforce new passwords and render bilingual company emails in real browsers',async()=>{
 const evidence=process.env.NEVORA_MOBILE_ACCESS_EVIDENCE;
 if(!evidence)throw Error('Select external NEVORA_MOBILE_ACCESS_EVIDENCE');
 await mkdir(evidence,{recursive:true});
 const runtime=createRequire(process.env.NEVORA_PLAYWRIGHT_RUNTIME_PACKAGE??resolve('tools/ci-browser-runtime/package.json'))('playwright');
 const {readAccountEmailSet,decodeAccountEmail}=await import('./account-email-smtp.test-support');
 const {passwordRejectionMessage}=await import('../../lib/auth/password-requirements');
 const {ACCESS_COPY}=await import('../../components/access-recovery/copy');
 const smtp=await createOwnedSmtp();
 const app=await createOwnedNextApp(evidence,{mobileAccessEnabled:true,recoverySmtpPort:smtp.port,invitationSmtpPort:smtp.port,pinDevTypeReferences:true}).catch(async e=>{await smtp.close();throw e;});
 const origin=app.url,q=<T=Record<string,unknown>>(text:string,values:unknown[]=[])=>app.database.executor.query<T>({text,values});
 const errors:string[]=[],checks:string[]=[],browsers:{close():Promise<void>}[]=[];
 let step='seed',passed=false;
 try{
  await seedOwnedApp(app.database.executor);
  await q("UPDATE workspaces SET name='North Harbor Foods',updated_at=clock_timestamp() WHERE singleton");
  for(const engine of ['chromium','webkit']){
   const id='PB022-'+engine;
   await q("INSERT INTO employees(id,first_name,last_name,email,phone,role,primary_location_id) VALUES($1,'Avery','Fixture',$2,'2025550101','EMPLOYEE','loc-1')",[id,engine+'@example.invalid']);
   const browser=await runtime[engine].launch({headless:true});browsers.push(browser);
   const context=await browser.newContext({viewport:{width:1440,height:1000},reducedMotion:'reduce',serviceWorkers:'block'});
   await context.route('**/*',async(route:{request():{url():string};abort(reason?:string):Promise<void>;continue():Promise<void>})=>{
    const url=new URL(route.request().url());if(['http:','https:'].includes(url.protocol)&&url.origin!==origin)await route.abort();else await route.continue();
   });
   let page=await context.newPage();page.setDefaultTimeout(20000);
   step=engine+' Owner sign-in and invitation';
   await page.goto(origin+'/login');await page.locator('#login-employee-id').fill('QAOWNER');await page.locator('#login-password').fill(TEST_PASSWORD);await page.locator('button[type="submit"]').click();await page.waitForURL('**/app',{timeout:45000});
   const headers={Origin:origin,'x-nevora-company-access':'1','x-nevora-actor':'QAOWNER'};
   const status=await (await context.request.get(origin+'/api/company-access/invitations/'+id,{headers})).json();
   const issue=await context.request.post(origin+'/api/company-access/invitations/'+id,{headers,data:{action:'ISSUE',operationId:randomUUID(),expectedEmployeeVersion:status.employeeVersion,expectedInvitationRevision:status.invitationRevision}});expect(issue.status()).toBe(200);
   const mail=smtp.messages.find((m:{recipient:string})=>m.recipient.includes(engine+'@example.invalid'));if(!mail)throw Error('Owned invitation not captured');
   const proof=/#proof=([A-Za-z0-9_-]{43})/.exec(mail.body.replace(/=\r?\n/g,'').replace(/=3D/g,'='))?.[1];if(!proof)throw Error('Missing owned invitation proof');
   step=engine+' activation policy preflight';const short=await context.request.post(origin+'/api/auth/activate',{headers:{Origin:origin,'x-nevora-activation':'1'},data:{proof,password:'short value'}});expect(short.status()).toBe(400);expect(await short.json()).toEqual({state:'invalid',passwordReason:'too_short'});
   await page.close();await context.clearCookies();page=await context.newPage();page.setDefaultTimeout(20000);page.on('pageerror',(e:Error)=>errors.push(engine+': '+step+': '+e.name+' '+e.message));await context.addCookies([{name:'nv-lang',value:'en',url:origin}]);
   await page.goto(origin+'/activate#proof='+proof);await page.locator('#activation-password').waitFor();expect(new URL(page.url()).hash).toBe('');
   for(const width of [1440,320]){
    await page.setViewportSize({width,height:1000});
    const candidate='a fictional oversized phrase '.repeat(50);
    for(const selector of ['#activation-password','#activation-confirm-password']){await page.locator(selector).focus();await page.locator(selector).press('ControlOrMeta+A');await page.keyboard.insertText(candidate);expect(await page.locator(selector).inputValue()).toBe(candidate);}
    await page.locator('button[type="submit"]').click();await expect.poll(()=>page.locator('#activation-error,#activation-policy-error').innerText()).toBe(passwordRejectionMessage('en','too_long'));
   }
   for(const lang of ['en','es'] as const){
    step=engine+' invitation policy '+lang;await context.addCookies([{name:'nv-lang',value:lang,url:origin}]);await page.goto('about:blank');
    // Reopen in a fresh document: a same-document fragment navigation can race hydration in WebKit.
    await page.goto(origin+'/activate#proof='+proof);await page.locator('#activation-password').fill('qwertyuiopasdfgh');await page.locator('#activation-confirm-password').fill('qwertyuiopasdfgh');await page.locator('button[type="submit"]').click();
    await expect.poll(()=>page.locator('#activation-error,#activation-policy-error').innerText()).toBe(passwordRejectionMessage(lang,'breached'));
    expect(await page.locator('#activation-password').getAttribute('minlength')).toBe('15');
    await page.locator('#activation-confirm-password').fill('different fictional phrase');await page.locator('button[type="submit"]').click();const mismatch=page.locator('#activation-error,#activation-confirm-password-error');await expect.poll(()=>mismatch.count()).toBe(1);expect(await mismatch.innerText()).toBe(ACCESS_COPY[lang].activation.mismatch);expect(await page.locator('#activation-confirm-password').getAttribute('aria-describedby')).toContain(await mismatch.getAttribute('id'));expect(await page.locator('form').innerText()).not.toContain(passwordRejectionMessage(lang,'breached'));
    await page.locator('#activation-confirm-password').fill('qwertyuiopasdfgh');
    await page.setViewportSize({width:lang==='en'?1440:320,height:1000});await page.screenshot({path:evidence+'/'+engine+'-activation-'+lang+'.png',fullPage:true});
   }
   const first='quiet meadows under winter skies';await page.locator('#activation-password').fill(first);await page.locator('#activation-confirm-password').fill(first);await page.locator('button[type="submit"]').click();await page.locator('#activation-employee-id').waitFor();expect(await page.locator('#activation-employee-id').inputValue()).toBe(id);
   step=engine+' reset password policy';
   await context.addCookies([{name:'nv-lang',value:'es',url:origin}]);
   await page.goto(origin+'/forgot-access');await page.locator('#recovery-employee-id').fill(id);await page.locator('#recovery-email').fill(engine+'@example.invalid');await page.locator('button[type="submit"]').click();
   await expect.poll(()=>smtp.messages.filter((m:{recipient:string;body:string})=>m.recipient.includes(engine+'@example.invalid')&&m.body.includes('/reset-access')).length).toBe(1);
   const resetMail=smtp.messages.find((m:{recipient:string;body:string})=>m.recipient.includes(engine+'@example.invalid')&&m.body.includes('/reset-access'))!;
   const resetProof=/#proof=([A-Za-z0-9_-]{43})/.exec(resetMail.body.replace(/=\r?\n/g,'').replace(/=3D/g,'='))?.[1];if(!resetProof)throw Error('Missing owned reset proof');
   await page.goto(origin+'/reset-access#proof='+resetProof);await page.locator('#reset-password').waitFor();
   for(const width of [1440,320]){
    await page.setViewportSize({width,height:1000});const candidate='a fictional oversized phrase '.repeat(50);
    for(const selector of ['#reset-password','#reset-confirm-password']){await page.locator(selector).focus();await page.locator(selector).press('ControlOrMeta+A');await page.keyboard.insertText(candidate);expect(await page.locator(selector).inputValue()).toBe(candidate);}
    await page.locator('button[type="submit"]').click();await expect.poll(()=>page.locator('#reset-error').innerText()).toContain(passwordRejectionMessage('es','too_long'));
   }
   for(const [candidate,reason] of [['NorthHarborFoods2026!','company_name'],['qwertyuiopasdfgh','breached']] as const){
    await page.locator('#reset-password').fill(candidate);await page.locator('#reset-confirm-password').fill(candidate);await page.locator('button[type="submit"]').click();await expect.poll(()=>page.locator('#reset-error').innerText()).toContain(passwordRejectionMessage('es',reason));
    expect(await page.locator('#reset-error').evaluate((el:HTMLElement)=>el===document.activeElement)).toBe(true);
   }
   await page.screenshot({path:evidence+'/'+engine+'-reset-es.png',fullPage:true});
   const next='a distant orchestra carries through the winter valley';await page.locator('#reset-password').fill(next);await page.locator('#reset-confirm-password').fill(next);await page.locator('button[type="submit"]').click();await page.locator('a[href="/login"]').first().waitFor();
   const replay=await context.request.post(origin+'/api/auth/reset-access',{headers:{Origin:origin,'x-nevora-recovery':'1'},data:{proof:resetProof,password:next}});expect(replay.status()).toBe(400);
   await page.goto(origin+'/login');await page.locator('#login-employee-id').fill(id);await page.locator('#login-password').fill(next);await page.locator('button[type="submit"]').click();await page.waitForURL('**/app',{timeout:45000});
   await expect.poll(()=>smtp.messages.filter((m:{recipient:string})=>m.recipient.includes(engine+'@example.invalid')).length).toBe(3);
   const captured=readAccountEmailSet(smtp.messages,engine+'@example.invalid');
   expect(()=>readAccountEmailSet(smtp.messages.filter(m=>!decodeAccountEmail(m.body).text.includes('/login')),engine+'@example.invalid')).toThrow();
   const preview=await context.newPage();let previewHtml='';
   await preview.route(origin+'/__owned-email-preview',async(route:{fulfill(v:{status:number;contentType:string;body:string}):Promise<void>})=>route.fulfill({status:200,contentType:'text/html',body:previewHtml}));
   for(const email of captured){const kind=email.kind;
    expect(email.text).toContain('North Harbor Foods');expect(email.html).toContain('North Harbor Foods');
    if(kind==='reset'){expect(email.text).toContain('15 minutes');expect(email.text).toContain('15 minutos');}
    step=engine+' '+kind+' email';await writeFile(evidence+'/'+engine+'-'+kind+'.html',email.html);await writeFile(evidence+'/'+engine+'-'+kind+'.txt',email.text);
    for(const width of [320,1440]){
     await preview.setViewportSize({width,height:1000});previewHtml=email.html;await preview.goto(origin+'/__owned-email-preview',{waitUntil:'networkidle'});
     expect(await preview.locator('section[lang="en"]').count()).toBe(1);expect(await preview.locator('section[lang="es"]').count()).toBe(1);
     expect(await preview.locator('img[alt="NEVORA"]').evaluate((el:HTMLImageElement)=>el.complete&&el.naturalWidth>0)).toBe(true);
     expect(await preview.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
     await preview.keyboard.press(process.platform==='darwin'&&engine==='webkit'?'Alt+Tab':'Tab');expect(await preview.evaluate(()=>document.activeElement?.tagName)).toBe('A');
     await preview.screenshot({path:evidence+'/'+engine+'-'+kind+'-email-'+width+'.png',fullPage:true});
    }
   }
   checks.push(engine+': real local SMTP invitation/reset, 15 minimum, EN/ES breach reasons with retained proof, company rejection, long phrase acceptance, reset single-use, ordinary sign-in, all three bilingual HTML/text emails at 320/1440px with keyboard links and no overflow');
   await context.close();
  }
  expect(errors).toEqual([]);passed=true;
 }finally{
  for(const browser of browsers)await browser.close().catch(()=>{});
  await writeFile(evidence+'/password-email-report.json',JSON.stringify({passed,step,checks,errors},null,2));
  await app.close();await smtp.close();
 }
},360000);

it('PB-022 long and absent names keep account emails readable on a narrow screen',async()=>{
 const runtime=createRequire(process.env.NEVORA_PLAYWRIGHT_RUNTIME_PACKAGE??resolve('tools/ci-browser-runtime/package.json'))('playwright');
 const {invitationEmail,recoveryEmail,passwordChangedEmail}=await import('../../lib/auth/account-email-copy');
 for(const engine of ['chromium','webkit']){
  const browser=await runtime[engine].launch({headless:true});
  try{
   const page=await browser.newPage({viewport:{width:320,height:900}});await page.route('**/*',(r:{abort():Promise<void>})=>r.abort());
   for(const context of [{companyName:'A'.repeat(160),firstName:'B'.repeat(160)},{companyName:'Fictional Shop',firstName:null}]){
    for(const email of [invitationEmail('https://company.invalid/activate#proof=FICTIONAL','F'.repeat(128),context),recoveryEmail('https://company.invalid/reset-access#proof=FICTIONAL',context),passwordChangedEmail('https://company.invalid',context)]){
     await page.setContent(email.html,{waitUntil:'load'});
     expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
     expect(await page.locator('body').evaluate((el:HTMLElement)=>getComputedStyle(el).fontFamily)).toContain('Arial');
    }
   }
  }finally{await browser.close();}
 }
});
