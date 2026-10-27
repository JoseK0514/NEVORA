import {it,expect} from 'vitest';
import {createRequire} from 'node:module';
import {resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
import {mkdir,writeFile} from 'node:fs/promises';
import {randomUUID} from 'node:crypto';
import {createOwnedNextApp} from './owned-next-app';
import {createOwnedSmtp} from './owned-smtp';
import {seedOwnedApp,TEST_PASSWORD} from './owned-app-fixture';
import {hashPassword} from '../../lib/auth/password';

it('integrates frozen mobile Access with real sessions, activation, recovery and protected Owner permissions',async()=>{
 const evidence=process.env.NEVORA_MOBILE_ACCESS_EVIDENCE;
 if(!evidence)throw Error('Select external NEVORA_MOBILE_ACCESS_EVIDENCE');
 await mkdir(evidence,{recursive:true});
 const runtime=createRequire(process.env.NEVORA_PLAYWRIGHT_RUNTIME_PACKAGE??resolve('tools/ci-browser-runtime/package.json'))('playwright');
 const smtp=await createOwnedSmtp();
 const app=await createOwnedNextApp(evidence,{mobileAccessEnabled:true,mobileSupportEnabled:true,recoverySmtpPort:smtp.port,invitationSmtpPort:smtp.port,pinDevTypeReferences:true}).catch(async error=>{await smtp.close();throw error;});
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
      if(engine==='chromium'&&width===390){await page.addStyleTag({content:'nextjs-portal{display:none}'});await page.screenshot({path:evidence+'/'+lang+path.replaceAll('/','-')+'.png',fullPage:true});}
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
   for(const selector of ['.q-auth__form .q-btn','#login-employee-id','#login-password','.ma-language'])expect(await page.locator(selector).evaluate((e:HTMLElement)=>e.getBoundingClientRect().height)).toBeGreaterThanOrEqual(44);
   step=engine+': locale and assistance';await page.goto(origin+'/forgot-access');await page.locator('#recovery-employee-id').fill('MA-'+engine);await page.locator('#recovery-email').fill(engine+'@example.invalid');
   await page.locator('.ma-language').click();await expect.poll(()=>page.locator('#mobile-access-page').getAttribute('lang')).toBe('es');
   expect(await page.locator('#recovery-employee-id').inputValue()).toBe('MA-'+engine);expect(await page.locator('#recovery-email').inputValue()).toBe(engine+'@example.invalid');
   await page.locator('.ma-footer-help').click();await page.locator('main a[href*="/access-help/support"]').click();await page.locator('.ma-back').click();await expect.poll(()=>page.locator('.ma-back').getAttribute('href')).toBe('/forgot-access');await page.locator('.ma-back').click();await page.waitForURL('**/forgot-access');expect(new URL(page.url()).pathname).toBe('/forgot-access');await page.locator('#recovery-employee-id').waitFor();await page.waitForLoadState('networkidle');
   // Follow the real Help links after contextual Back; a new document navigation can race a pending SPA commit.
   await page.locator('.ma-footer-help').click();await page.locator('main a[href*="/access-help/support"]').click();await page.locator('#access-message').waitFor({state:'attached'});await page.evaluate(()=>Object.defineProperty(navigator,'clipboard',{configurable:true,value:{writeText:async()=>{throw Error('fixture denial');}}}));await page.locator('.ma-draft button').click();await expect.poll(()=>page.locator('#access-message').evaluate((e:HTMLTextAreaElement)=>e.selectionEnd-e.selectionStart)).toBe((await page.locator('#access-message').inputValue()).length);
   const mail=new URL(await page.locator('.ma-draft a').getAttribute('href'));expect(mail.protocol).toBe('mailto:');expect(mail.pathname).toBe('support@thevelani.com');expect([...mail.searchParams.keys()]).toEqual(['subject','body']);
   checks.push(engine+': locale drafts, contextual Back, manual-copy fallback and fixed mail recipient');
   await context.addCookies([{name:'nv-lang',value:'en',url:origin}]);
   async function login(id:string,password=TEST_PASSWORD){
    step=engine+': sign-in for '+id;await page.goto(origin+'/login');await page.locator('#login-employee-id').fill(id);await page.locator('#login-password').fill(password);await page.locator('button[type="submit"]').click();await page.waitForURL('**/app',{timeout:45000});
    // The Owner has company access; this Manager has no assigned management scope. Require each actual authorized view.
    step=engine+': authorized management Home for '+id;if(id==='QAOWNER')await page.locator('.premium-home').waitFor();else await page.getByRole('heading',{name:'No access yet',exact:true}).waitFor();
   }
   step=engine+': invitation and activation';await login('QAOWNER');
   const headers={'Origin':origin,'x-nevora-company-access':'1','x-nevora-actor':'QAOWNER'};
   const status=await context.request.get(origin+'/api/company-access/invitations/MA-'+engine,{headers});expect(status.status()).toBe(200);const current=await status.json();expect(current.state).toBe('ready');
   const response=await context.request.post(origin+'/api/company-access/invitations/MA-'+engine,{headers,data:{action:'ISSUE',operationId:randomUUID(),expectedEmployeeVersion:current.employeeVersion,expectedInvitationRevision:current.invitationRevision}});expect(response.status()).toBe(200);
   const captured=smtp.messages.find((m:{recipient:string})=>m.recipient.includes(engine+'@example.invalid'));expect(Boolean(captured)).toBe(true);
   const body=captured!.body.replace(/=\r?\n/g,'').replace(/=3D/g,'=');const proof=/#proof=([A-Za-z0-9_-]{43})/.exec(body)?.[1];if(!proof)throw Error('Owned invitation proof missing');secrets.push(proof);
   const employee=await browser.newContext({viewport:{width:390,height:844},reducedMotion:'reduce',serviceWorkers:'block'});await employee.addCookies([{name:'nv-lang',value:'es',url:origin}]);await observeWindowExceptions(employee,(_page:unknown,kind:string)=>windowExceptions.push(engine+': '+step+': '+kind));const join=await employee.newPage();join.setDefaultTimeout(20000);watch(join);
   await join.goto(origin+'/activate#proof='+proof);await join.locator('#activation-password').waitFor();await expect.poll(()=>new URL(join.url()).hash).toBe('');
   expect(await join.locator('main').innerText()).not.toMatch(/Invitation verified|invitación verificada/i);
   await join.locator('#activation-password').fill(TEST_PASSWORD);await join.locator('#activation-confirm-password').fill(TEST_PASSWORD);
   await join.locator('.ma-language').click();await expect.poll(()=>join.locator('#mobile-access-page').getAttribute('lang')).toBe('en');expect(await join.locator('#activation-password').inputValue()).toBe(TEST_PASSWORD);
   await join.setViewportSize({width:1440,height:900});await expect.poll(()=>join.locator('.q-auth__rules').count()).toBe(1);expect(await join.locator('h1').innerText()).toBe('Activate account');expect(await join.locator('#activation-password').inputValue()).toBe(TEST_PASSWORD);expect(await join.locator('form').count()).toBe(1);
   await join.setViewportSize({width:390,height:844});await expect.poll(()=>join.locator('.ma-passwords').count()).toBe(1);expect(await join.locator('#activation-confirm-password').inputValue()).toBe(TEST_PASSWORD);
   await join.locator('.ma-language').click();await expect.poll(()=>join.locator('#mobile-access-page').getAttribute('lang')).toBe('es');
   await join.locator('button[type="submit"]').click();await join.locator('#activation-employee-id').waitFor();expect(await join.locator('#activation-employee-id').inputValue()).toBe('MA-'+engine);
   await join.locator('a[href*="activated=1"]').click();expect(await join.locator('#login-employee-id').inputValue()).toBe('MA-'+engine);await join.locator('#login-password').fill(TEST_PASSWORD);await join.locator('button[type="submit"]').click();await join.waitForURL('**/app',{timeout:45000});await join.locator('.ma-onboarding summary').waitFor();await join.locator('.ma-onboarding summary').click();expect(await join.locator('.ma-guide-list a[href="/app/schedule"]').count()).toBe(1);await join.waitForLoadState('networkidle');await join.addStyleTag({content:'nextjs-portal{display:none}'});await join.screenshot({path:evidence+'/'+engine+'-first-home.png',fullPage:true});
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
   await join.locator('#reset-confirm-password').fill(TEST_PASSWORD);await join.locator('button[type="submit"]').click();await expect.poll(()=>join.locator('#reset-error').innerText()).toContain('Este código no se puede usar.');
   await join.goto(origin+'/reset-access#proof='+resetProof);await join.locator('.ma-passwords').waitFor();await expect.poll(()=>join.locator('#reset-proof').inputValue().then((value:string)=>value.length)).toBe(43);expect(new URL(join.url()).hash).toBe('');
   const nextPassword=' Fictional-reset-'+engine+'! ';secrets.push(nextPassword);await join.locator('#reset-password').fill(nextPassword);await join.locator('#reset-confirm-password').fill(nextPassword);
   await join.setViewportSize({width:1440,height:900});await expect.poll(()=>join.locator('.ma-passwords').count()).toBe(0);expect((await join.locator('#reset-proof').inputValue()).length).toBe(43);expect(await join.locator('#reset-password').inputValue()).toBe(nextPassword);
   await join.setViewportSize({width:390,height:844});await expect.poll(()=>join.locator('.ma-passwords').count()).toBe(1);await join.locator('.ma-language').click();await expect.poll(()=>join.locator('#mobile-access-page').getAttribute('lang')).toBe('en');expect((await join.locator('#reset-proof').inputValue()).length).toBe(43);
   await join.locator('button[type="submit"]').click();await expect.poll(()=>join.locator('h1').innerText()).toBe('Password updated.');
   const protectedRead=await employee.request.get(origin+'/app',{maxRedirects:0});expect([303,307,308]).toContain(protectedRead.status());expect(protectedRead.headers().location).toMatch(/^\/login/);
   expect((await employee.request.post(origin+'/api/auth/reset-access',{headers:{Origin:origin,'x-nevora-recovery':'1'},data:{proof:resetProof,password:nextPassword}})).status()).toBe(400);
   await join.locator('a[href="/login"]').filter({hasText:'Sign in with new password'}).click();await join.locator('#login-employee-id').fill('MA-'+engine);await join.locator('#login-password').fill(nextPassword);await join.locator('button[type="submit"]').click();await join.waitForURL('**/app',{timeout:45000});
   checks.push(engine+': real recovery mail, editable receipt, identity correction, full-proof locale/resize custody, atomic reset/session revocation/single use and new-password sign-in');
   step=engine+': logout and account switch';await join.waitForLoadState('networkidle');await join.goto(origin+'/app/profile');await join.waitForLoadState('networkidle');await join.locator('.profile-signout-row').click();await join.waitForURL('**/login');expect(await join.locator('#login-employee-id').inputValue()).toBe('');
   await join.locator('#login-employee-id').fill('MA-MANAGER');await join.locator('#login-password').fill(TEST_PASSWORD);await join.locator('button[type="submit"]').click();await join.waitForURL('**/app',{timeout:45000});expect(await join.locator('.ma-onboarding').count()).toBe(0);await join.waitForLoadState('networkidle');
   await join.goto(origin+'/app/profile');await join.getByRole('button',{name:'Sign out',exact:true}).waitFor();await join.waitForLoadState('networkidle');await join.getByRole('button',{name:'Sign out',exact:true}).click();await join.waitForURL('**/login');expect(await join.locator('#login-employee-id').inputValue()).toBe('');await join.locator('#login-employee-id').fill('MA-'+engine);await join.locator('#login-password').fill(nextPassword);await join.locator('button[type="submit"]').click();await join.waitForURL('**/app',{timeout:45000});await join.locator('.ma-onboarding').waitFor();expect(await join.locator('.ma-onboarding-intro').count()).toBe(0);
   checks.push(engine+': real logout clears ID; different-role sign-in has no Employee guide; prior activation intro does not return after account switch');
   await employee.close();
   await login('MA-MANAGER');expect((await context.request.post(origin+'/api/company-access/invitations/MA-'+engine,{headers:{Origin:origin,'x-nevora-company-access':'1','x-nevora-actor':'MA-MANAGER'},data:{action:'ISSUE'}})).status()).toBe(403);
   checks.push(engine+': Manager cannot issue invitations');
   await context.close();
  }
  expect(windowExceptions).toEqual([]);expect(errors).toEqual([]);complete=true;
 }catch(error){throw new Error(step+': '+clean(error instanceof Error?error.message:String(error)));}finally{
  for(const browser of browsers)await browser.close();let closed=false;try{await app.close();closed=true;}finally{await smtp.close();
  await writeFile(evidence+'/mobile-access-results.json',JSON.stringify({complete:complete&&closed,scope:'Real Next/server actions, invocation-owned PostgreSQL and loopback SMTP only; no real email/native clipboard/production service used.',checks,errors,windowExceptions,frameworkDiagnostics},null,2));}
 }
});
