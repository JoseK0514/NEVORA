import {it,expect} from 'vitest';
import {createRequire} from 'node:module';
import {mkdir,writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {createOwnedNextApp} from './owned-next-app';
import {seedOwnedApp,seedOwnedScenario,TEST_PASSWORD} from './owned-app-fixture';
import {AUTH_COPY} from '../../lib/auth-copy';
import {POLICY_FACTS,SUPPORT_EMAIL} from '../../lib/legal/policies';
import {measureRenderedContrast} from '../../../scripts/browser-contrast.mjs';

type BrowserRequest={url():string;headers():Record<string,string>;method():string};
type Route={request():BrowserRequest;fetch():Promise<unknown>;abort(code?:string):Promise<void>;continue():Promise<void>;fallback():Promise<void>};
// Own account-deletion request on Employee/Lead phones, against the actual Next server and PostgreSQL.
it('requests own account deletion with truthful unknown outcomes and a recoverable reference in three engines',async()=>{
 const evidence=process.env.NEVORA_EMPLOYEE_DELETION_EVIDENCE;if(!evidence)throw Error('Select explicit external deletion evidence directory');
 await mkdir(evidence,{recursive:true});
 const runtime=createRequire(process.env.NEVORA_PLAYWRIGHT_RUNTIME_PACKAGE??resolve('tools/ci-browser-runtime/package.json'))('playwright');
 const app=await createOwnedNextApp(evidence),checks:{engine:string;name:string}[]=[],captures:string[]=[],contrasts:{engine:string;theme:string;width:number;subject:string;ratio:number}[]=[],messages:{engine:string;type:string;text:string;expected:boolean;stage:string}[]=[],media:Record<string,unknown>[]=[];
 const q=<T=Record<string,unknown>>(text:string,values:unknown[]=[])=>app.database.executor.query<T>({text,values});
 let browser:{close():Promise<void>}|undefined,failed:(()=>Promise<void>)|undefined;
 try{
  await seedOwnedApp(app.database.executor);
  for(const [index,engine] of ['chromium','webkit','firefox'].entries()){
   const f=await seedOwnedScenario(app.database.executor,'DELM'+index,index),[actor,landscapeActor,manager]=f.actors;
   await q("UPDATE employees SET role=$2 WHERE id=$1",[actor,index===1?'LEAD':'EMPLOYEE']);await q("UPDATE employees SET role='EMPLOYEE' WHERE id=$1",[landscapeActor]);
   const activeBrowser=await runtime[engine].launch({headless:true});browser=activeBrowser;
   const context=await activeBrowser.newContext({viewport:{width:390,height:844},reducedMotion:'reduce',serviceWorkers:'block'});
   // Light is the default since PR36; this journey's theme checks follow the device, which is the explicit System choice.
   await context.addInitScript(()=>{try{localStorage.setItem('nv-theme','system');}catch{}});
   const page=await context.newPage();
   page.setDefaultTimeout(15000);page.setDefaultNavigationTimeout(30000);
   let stage='login',expectedFailure=false;
   const pending=new Map<BrowserRequest,string>();
   page.on('request',(request:BrowserRequest)=>{const path=new URL(request.url()).pathname;if(path.startsWith('/api/')||path.startsWith('/app'))pending.set(request,stage);});
   for(const event of ['requestfinished','requestfailed'])page.on(event,(request:BrowserRequest)=>pending.delete(request));
   const idle=()=>expect.poll(()=>pending.size,{timeout:10000}).toBe(0);
   const record=(name:string)=>checks.push({engine,name});
   page.on('console',(message:{type():string;text():string})=>{if(['error','warning'].includes(message.type()))messages.push({engine,type:message.type(),text:message.text(),expected:expectedFailure,stage});});
   page.on('pageerror',(error:Error)=>messages.push({engine,type:'pageerror',text:error.message,expected:false,stage}));
   await context.route('**/*',async(route:Route)=>{const url=new URL(route.request().url());if(['http:','https:'].includes(url.protocol)&&url.origin!==new URL(app.url).origin){await route.abort();return;}await route.continue();});
   // Viewport captures only: a full-page capture turns touch emulation off in installed Chromium.
   const shot=async(name:string)=>{const file=engine+'-'+name+'.png';await page.screenshot({path:evidence+'/'+file,style:'nextjs-portal {visibility:hidden;}',caret:'initial'});captures.push(file);};
   failed=async()=>{await shot('failure');await writeFile(evidence+'/'+engine+'-failure.html',await page.locator('body').innerHTML());await writeFile(evidence+'/'+engine+'-pending.json',JSON.stringify([...pending.values()],null,2));};
   const dark=async(name:string)=>{await page.emulateMedia({colorScheme:'dark'});await expect.poll(()=>page.locator('html').getAttribute('data-theme')).toBe('dark');await shot(name+'-dark');await page.emulateMedia({colorScheme:'light'});await expect.poll(()=>page.locator('html').getAttribute('data-theme')).toBe('light');};
   const forwardKey=engine==='webkit'&&process.platform==='darwin'?'Alt+Tab':'Tab';
   const focused=(locator:{evaluate(fn:(el:HTMLElement)=>boolean):Promise<boolean>})=>locator.evaluate((el:HTMLElement)=>document.activeElement===el);
   // Board E-DeleteAccount (Release 1): Employees and Leads get one corporate page on every width; its state is on the page's stack.
   const state=(kind:string)=>page.locator(`.em-delete [data-deletion-state="${kind}"]`).waitFor();
   const own=()=>q<{reference:string;status:string}>("SELECT reference,status FROM account_deletion_requests WHERE employee_id=$1",[actor]);
   const sessions=async(id:string)=>(await q<{n:number}>('SELECT count(*)::int n FROM employee_sessions WHERE employee_id=$1',[id]))[0].n;
   const login=async(target:typeof page,id:string)=>{const copy=AUTH_COPY.en;await target.getByLabel(copy.employeeId,{exact:true}).fill(id);await target.getByLabel(copy.password,{exact:true}).fill(TEST_PASSWORD);await target.getByRole('button',{name:copy.signIn,exact:true}).click();await target.waitForURL(app.url+'/app');};
   const matrix=async(name:string,subjects:[string,string][])=>{
    for(const theme of ['light','dark'])for(const width of [320,390,430]){
     await page.emulateMedia({colorScheme:theme as 'light'|'dark'});await page.setViewportSize({width,height:844});await expect.poll(()=>page.locator('html').getAttribute('data-theme')).toBe(theme);
     expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
     for(const [subject,selector] of subjects){const measured=await page.locator(selector).first().evaluate(measureRenderedContrast);contrasts.push({engine,theme,width,subject,ratio:measured.ratio});expect(measured.ratio,subject).toBeGreaterThanOrEqual(4.5);}
     const small=await page.locator('.em-delete :is(a,button,summary,label.em-delete-check,input:not([type=hidden]):not([type=checkbox]))').evaluateAll((els:HTMLElement[])=>els.filter(el=>el.checkVisibility({visibilityProperty:true,opacityProperty:true})&&!el.closest('p')&&el.getBoundingClientRect().height<43.5).map(el=>el.outerHTML.slice(0,80)));expect(small).toEqual([]);
     /* The kit's pushed-page title token (17px) replaces the v5 32px title on a phone. A Lead's v5 shell also shows the wide title (reported), so the first visible title is measured. */expect(await page.locator('.em-delete h1:visible').first().evaluate((el:HTMLElement)=>getComputedStyle(el).fontSize)).toBe('17px');
     const inset=await page.locator('.em-delete .c-card').evaluateAll((cards:HTMLElement[])=>cards.flatMap(card=>{const box=card.getBoundingClientRect();return [...card.querySelectorAll<HTMLElement>('svg,strong,p,h2,h3,.c-row__title,.em-delete-detail')].filter(el=>{const r=el.getBoundingClientRect();return r.width>0&&(r.left<box.left+15.5||r.right>box.right-15.5);}).map(el=>el.textContent||el.tagName);}));expect(inset).toEqual([]);
     await page.evaluate(()=>scrollTo(0,0));await shot(name+'-'+theme+'-'+width+'-top');await page.evaluate(()=>scrollTo(0,document.body.scrollHeight));await shot(name+'-'+theme+'-'+width);
    }
    await page.setViewportSize({width:320,height:844});await page.evaluate(()=>{document.documentElement.style.fontSize='200%';});
    expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
    /* The page's last action, centred as a person scrolling would (a fixed tab bar can cover an in-view control). */const last=page.locator('.em-delete :is(.em-delete-confirm,form:not(.em-delete-form) button,.c-card a.c-btn)').last();await last.evaluate((el:HTMLElement)=>el.scrollIntoView({block:'center'}));
    expect(await last.evaluate((el:HTMLElement)=>{const nav=document.querySelector<HTMLElement>('.mobile-nav');const limit=nav&&getComputedStyle(nav).display!=='none'?nav.getBoundingClientRect().top:innerHeight;return el.getBoundingClientRect().bottom<=limit+1;})).toBe(true);
    expect(await page.locator('.em-delete-link').evaluateAll((els:HTMLElement[])=>els.filter(el=>getComputedStyle(el).hyphens!=='none').length)).toBe(0);
    await shot(name+'-text200');await page.evaluate(()=>{document.documentElement.style.fontSize='';});await page.setViewportSize({width:390,height:844});await page.emulateMedia({colorScheme:'light'});
   };

   await page.goto(app.url+'/login');await login(page,actor);await idle();
   stage='open-from-profile';/* An Employee reaches More from the header avatar (corporate shell); a Lead from its More tab. */await page.locator('a[href="/app/more"]:visible').first().click();await page.waitForURL(app.url+'/app/more');await page.locator('a[href="/app/profile"]:visible').first().click();await page.waitForURL(app.url+'/app/profile');
   await page.locator('a#profile-account-deletion').click();await page.waitForURL(app.url+'/app/account/delete');await state('idle');await idle();
   const body=await page.locator('.em-delete').innerText();
   for(const text of ['What we delete','keeps','What may be kept','Enter your password to confirm','with your password or a passkey','This can’t be undone.',POLICY_FACTS.DELETION_COMPLETION_PERIOD!])expect(body).toContain(text);
   expect(await page.locator('.em-delete input[name="account"]').inputValue()).toBe(actor);
   expect(body.indexOf('What we delete')).toBeLessThan(body.indexOf('Enter your password to confirm'));
   /* The retention disclosure moved to the What may be kept page (board); its schedule is there. */await page.getByRole('link',{name:'What may be kept',exact:true}).click();await page.waitForURL(app.url+'/app/profile/account-deletion');const kept=page.locator('details.em-document-section').filter({has:page.locator('summary',{hasText:'What may be kept'})});await kept.locator('summary').click();expect(await kept.innerText()).toContain(POLICY_FACTS.RETENTION_SCHEDULE!.slice(0,60));await page.goBack();await page.waitForURL(app.url+'/app/account/delete');await state('idle');
   record('Profile row opens the deletion review: own account, actual consequences, retention disclosure, password last');
   await matrix('review',[['title','.em-delete h1:visible'],['consequence','.em-delete-copy p'],['confirm','.em-delete-confirm'],['back','.em-delete .c-nav__back'],['label','.em-delete .c-field__label'],['undone','.em-delete-form > .c-note']]);
   record('Review light/dark at 320/390/430, sampled contrast, 44px targets, token type, 200% text with actions above navigation');

   /* Board: Keep my account is the page's ‹ Profile back link. */stage='keep-account';await page.locator('.em-delete .c-nav__back').click();await page.waitForURL(app.url+'/app/profile#profile-account-deletion');
   await expect.poll(()=>focused(page.locator('a#profile-account-deletion'))).toBe(true);
   await page.locator('a#profile-account-deletion').click();await page.waitForURL(app.url+'/app/account/delete');await state('idle');
   record('Back to Profile (Keep my account) returns with focus on the exact Delete row');

   stage='validation';await page.locator('.em-delete-confirm').click();
   await page.locator('#deletion-password-error').waitFor();await expect.poll(()=>focused(page.locator('#deletion-password'))).toBe(true);
   expect(await page.locator('#deletion-password').getAttribute('aria-describedby')).toBe('deletion-password-help deletion-password-error');
   const semanticRed=(selector:string)=>page.locator(selector).evaluate((el:HTMLElement)=>{const probe=document.createElement('span');probe.style.color='var(--c-red)';el.parentElement!.append(probe);const red=getComputedStyle(probe).color;probe.remove();return getComputedStyle(el).color===red;});
   expect(await semanticRed('#deletion-password-error')).toBe(true);
   await page.locator('#deletion-password').fill('fictional-wrong-password');await page.keyboard.press('Enter');
   await page.locator('#deletion-understand-error').waitFor();await expect.poll(()=>focused(page.locator('#deletion-understand'))).toBe(true);
   expect(await semanticRed('#deletion-understand-error')).toBe(true);expect(await page.locator('#deletion-password').getAttribute('value')).toBeNull();
   expect(await own()).toEqual([]);await shot('validation');await dark('validation');
   await page.locator('#deletion-password').focus();await page.keyboard.press(forwardKey);
   const eye=page.getByRole('button',{name:'Show password',exact:true});expect(await focused(eye)).toBe(true);expect(await eye.getAttribute('aria-pressed')).toBe('false');await page.keyboard.press('Space');
   expect(await page.locator('#deletion-password').getAttribute('type')).toBe('text');expect(await focused(eye)).toBe(true);expect(await eye.getAttribute('aria-pressed')).toBe('true');await page.keyboard.press('Space');
   expect(await page.locator('#deletion-password').getAttribute('type')).toBe('password');
   await page.keyboard.press(forwardKey);expect(await focused(page.locator('#deletion-understand'))).toBe(true);await page.keyboard.press('Space');expect(await page.locator('#deletion-understand').isChecked()).toBe(true);
   record('Field-linked validation focuses the first problem; native '+forwardKey+' reaches show/hide and the confirmation checkbox');

   stage='resize-owner';await page.setViewportSize({width:1440,height:1000});await page.locator('.em-delete:visible #deletion-password').waitFor();
   expect(await page.locator('.q-deletion').count()).toBe(0);expect(await page.locator('.em-delete h1:visible').first().innerText()).toBe('Delete account');expect(await page.locator('#deletion-password').inputValue()).toBe('fictional-wrong-password');
   await page.setViewportSize({width:390,height:844});await state('idle');expect(await page.locator('#deletion-password').inputValue()).toBe('fictional-wrong-password');expect(await page.locator('#deletion-understand').isChecked()).toBe(true);
   record('Desktop shows the same kit page; one owner keeps the typed password and confirmation across resize');

   stage='wrong-password';await page.locator('.em-delete-confirm').click();await state('wrong_password');await shot('wrong-password');
   await expect.poll(()=>focused(page.locator('#deletion-password'))).toBe(true);expect(await page.locator('#deletion-password-error').innerText()).toBe('That password isn’t right. Try again.');expect(await page.locator('#deletion-password').inputValue()).toBe('');
   expect(await own()).toEqual([]);expect(await sessions(actor)).toBe(1);await idle();
   record('Wrong password: field error, focus returns to the password, nothing saved, still signed in');

   stage='database-rejected';expectedFailure=true;
   await q(`CREATE OR REPLACE FUNCTION fictional_reject_deletion() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'fictional rejection' USING ERRCODE='P0001'; END $$`);
   await q('CREATE TRIGGER fictional_reject_deletion BEFORE INSERT ON account_deletion_requests FOR EACH ROW EXECUTE FUNCTION fictional_reject_deletion()');
   await page.locator('#deletion-password').fill(TEST_PASSWORD);await page.locator('.em-delete-confirm').click();await state('failed');
   await expect.poll(()=>focused(page.locator('.em-delete-outcome.c-callout--red'))).toBe(true);expect(await page.locator('.em-delete-outcome').innerText()).toContain('Nothing was saved and you’re still signed in.');
   expect(await own()).toEqual([]);expect(await sessions(actor)).toBe(1);expect(await page.locator('.em-delete-outcome #deletion-outcome-title').innerText()).toBe('Your request wasn’t sent');await shot('failed');await dark('failed');await idle();
   await q('DROP TRIGGER fictional_reject_deletion ON account_deletion_requests');expectedFailure=false;
   record('A database-rejected request says nothing was saved only because PostgreSQL rolled it back; the session stays');

   stage='lost-reply';expectedFailure=true;let delivered=false,held=false,release!:()=>void;const gate=new Promise<void>(resolve=>{release=resolve;});
   await page.route('**/app/account/delete',async(route:Route)=>{if(route.request().method()==='POST'&&route.request().headers()['next-action']){held=true;await gate;await route.fetch();delivered=true;await route.abort('connectionreset');return;}await route.fallback();});
   // React reset the field after the rejected reply; retrying is a deliberate re-entry.
   expect(await page.locator('#deletion-password').inputValue()).toBe('');await page.locator('#deletion-password').fill(TEST_PASSWORD);
   await page.locator('.em-delete-confirm').click();await expect.poll(()=>held).toBe(true);
   expect(await page.locator('.em-delete-form').getAttribute('aria-busy')).toBe('true');expect(await page.locator('.em-delete-confirm').innerText()).toBe('Sending request…');expect(await page.locator('.em-delete-confirm').isDisabled()).toBe(true);expect(await own()).toEqual([]);await shot('pending');
   release();await state('uncertain');expect(delivered).toBe(true);
   const [saved]=await own();expect(saved).toMatchObject({status:'received'});expect(await sessions(actor)).toBe(0);
   const unknown=await page.locator('.em-delete-outcome').innerText();expect(await page.locator('.em-delete-outcome.c-callout--red').count()).toBe(0);expect(unknown).toContain('We don’t know yet if your request was saved');expect(unknown).toContain('this sends your deletion request now');expect(unknown).not.toContain('Nothing was saved');expect(unknown).not.toContain(saved.reference);
   await expect.poll(()=>focused(page.locator('.em-delete-outcome'))).toBe(true);expect(page.url()).toBe(app.url+'/app/account/delete');
   await shot('uncertain');await dark('uncertain');await page.unroute('**/app/account/delete');await idle();expectedFailure=false;
   record('A reply lost after COMMIT shows an unconfirmed outcome on the same page: no false failure, no invented reference');

   stage='recover';expect(await page.locator('#deletion-password').inputValue()).toBe('');await page.locator('#deletion-password').fill(TEST_PASSWORD);await page.getByRole('button',{name:'Check my request',exact:true}).click();await state('received');
   await expect.poll(()=>focused(page.locator('.em-delete .c-card[aria-labelledby="deletion-done-title"]'))).toBe(true);
   expect(await page.locator('.em-delete-reference-value').innerText()).toBe(saved.reference);expect((await own()).length).toBe(1);
   const receipt=await page.locator('.em-delete').innerText();
   for(const text of ['Your deletion request was received','Changed your mind? Contact support before the request is processed.','Received','You’re signed out everywhere','we’ll email you when it’s done','We’ll never ask for your password'])expect(receipt).toContain(text);
   expect(await page.locator('.em-delete .c-nav__back').count()).toBe(0);expect(await page.locator('#deletion-password').count()).toBe(0);expect(await page.locator('.em-delete h1:visible').first().innerText()).toBe('Deletion requested');
   expect(await page.locator('.mobile-nav').evaluate((el:HTMLElement)=>getComputedStyle(el).display)).toBe('none');
   expect(await page.locator(`a[href="mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent('Account deletion '+saved.reference)}"]`).count()).toBe(1);
   if(engine==='chromium')await context.grantPermissions(['clipboard-read','clipboard-write'],{origin:app.url});
   await page.getByRole('button',{name:'Copy reference',exact:true}).click();await expect.poll(()=>page.locator('.em-delete-copied').innerText()).toMatch(/^(Reference copied\.|Couldn’t copy\. Write the reference down instead\.)$/);
   if(engine==='chromium')expect(await page.evaluate(()=>navigator.clipboard.readText())).toBe(saved.reference);
   record('Check my request recovers the committed reference with a counted password check after every session ended');
   await matrix('receipt',[['title','.em-delete h1:visible'],['status','#deletion-done-title'],['reference','.em-delete-reference-value'],['time','.em-delete-reference-time'],['next','.em-delete-detail'],['done','.em-delete form:not(.em-delete-form) button']]);
   record('Receipt light/dark at 320/390/430, contrast, targets, 200% text with Done above navigation');

   stage='done';await page.getByRole('button',{name:'Done',exact:true}).click();await page.waitForURL(app.url+'/login');await idle();
   expect((await context.cookies()).some((cookie:{name:string})=>cookie.name==='fuel_session')).toBe(false);
   await page.getByLabel(AUTH_COPY.en.employeeId,{exact:true}).fill(actor);await page.getByLabel(AUTH_COPY.en.password,{exact:true}).fill(TEST_PASSWORD);await page.getByRole('button',{name:AUTH_COPY.en.signIn,exact:true}).click();await page.waitForURL(/\/login\?error=deleting/);
   expect(await page.locator('#login-error').innerText()).toBe(AUTH_COPY.en.loginDeleting);expect(await sessions(actor)).toBe(0);await shot('signin-refused');
   record('Done removes the dead cookie; the right password still cannot sign in while the request is open');

   stage='coarse-landscape';
   const touch=engine!=='firefox';const landscape=await activeBrowser.newContext({viewport:{width:844,height:390},hasTouch:touch,...(engine==='chromium'?{isMobile:true}:{}),reducedMotion:'reduce',serviceWorkers:'block'});
   try{
    const other=await landscape.newPage();await other.goto(app.url+'/login');await login(other,landscapeActor);await other.goto(app.url+'/app/account/delete');
    const metrics=await other.evaluate(()=>({coarse:matchMedia('(pointer: coarse)').matches,landscape:matchMedia('(orientation: landscape)').matches,touchPoints:navigator.maxTouchPoints,width:innerWidth,height:innerHeight}));
    media.push({engine,...metrics});
    if(metrics.coarse){
     await other.locator('.em-delete [data-deletion-state="idle"]').waitFor();expect(await other.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
     const small=await other.locator('.em-delete :is(a,button,summary,label.em-delete-check)').evaluateAll((els:HTMLElement[])=>els.filter(el=>el.checkVisibility()&&!el.closest('p')&&el.getBoundingClientRect().height<43.5).length);expect(small).toBe(0);
     const confirm=other.locator('.em-delete-confirm');await confirm.evaluate((el:HTMLElement)=>el.scrollIntoView({block:'center'}));expect(await confirm.evaluate((el:HTMLElement)=>{const nav=document.querySelector('.mobile-nav');return !nav||el.getBoundingClientRect().bottom<=nav.getBoundingClientRect().top+1;})).toBe(true);
     const file=engine+'-landscape-coarse.png';await other.screenshot({path:evidence+'/'+file,style:'nextjs-portal {visibility:hidden;}'});captures.push(file);
     record('Genuine coarse landscape ('+metrics.touchPoints+' touch points): deletion review, targets, no overflow, actions above navigation');
     await q('DELETE FROM employee_sessions WHERE employee_id=$1',[landscapeActor]);
     await other.locator('#deletion-password').fill(TEST_PASSWORD);await other.locator('#deletion-understand').check();await other.locator('.em-delete-confirm').click();
     await other.locator('.em-delete [data-deletion-state="signed_out"]').waitFor();expect(await other.locator('.em-delete').innerText()).toContain('nothing was deleted');expect(await other.locator('a[href="/login"]').count()).toBeGreaterThan(0);
     const ended=engine+'-landscape-signed-out.png';await other.screenshot({path:evidence+'/'+ended,style:'nextjs-portal {visibility:hidden;}'});captures.push(ended);
     record('A session that ended elsewhere: the password check finds no request and says nothing was deleted, with Sign in');
    }else{
     // Without a coarse pointer the 844px landscape is desktop by definition; Employees get the same kit page there (board E-DeleteAccount).
     await other.locator('.em-delete:visible [data-deletion-state="idle"]').waitFor();expect(await other.locator('.q-deletion').count()).toBe(0);
     record('No coarse pointer in this engine: 844px landscape shows the same kit deletion page (recorded, not claimed as mobile)');
    }
    expect(await q("SELECT count(*)::int n FROM account_deletion_requests WHERE employee_id=$1",[landscapeActor])).toEqual([{n:0}]);
   }finally{await landscape.close();}

   if(engine==='chromium'){
    stage='role-separation';await q("UPDATE employees SET role='MANAGER' WHERE id=$1",[manager]);
    const managerContext=await activeBrowser.newContext({viewport:{width:390,height:844},serviceWorkers:'block'});
    try{const m=await managerContext.newPage();await m.goto(app.url+'/login');await login(m,manager);await m.goto(app.url+'/app/account/delete');await m.locator('.q-deletion').waitFor();
     expect(await m.locator('.em-delete').count()).toBe(0);expect(await m.locator('#employee-mobile').count()).toBe(0);const file=engine+'-manager-390.png';await m.screenshot({path:evidence+'/'+file,style:'nextjs-portal {visibility:hidden;}'});captures.push(file);}
    finally{await managerContext.close();}
    record('Manager at phone width keeps the incumbent Quiet page; the kit page is Employee/Lead only');
   }
   await idle();await context.close();await browser!.close();browser=undefined;failed=undefined;
  }
  expect(messages.filter(m=>m.type==='pageerror')).toEqual([]);expect(messages.filter(m=>m.type==='error'&&!m.expected)).toEqual([]);
 }catch(error){await failed?.();throw error;}
 finally{await writeFile(evidence+'/results.json',JSON.stringify({checks,captures,contrasts,media,messages,limits:['Controlled loopback browsers and fictional accounts. Deletion acceptance is the recorded request; later erasure follows docs/compliance/account-deletion-runbook.md and is not exercised. Root 200% text is not OS Dynamic Type. Physical devices, screen readers, hosted transport and release remain separate.']},null,2));await browser?.close();await app.close();}
},900000);
