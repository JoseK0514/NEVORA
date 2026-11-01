import {it,expect} from 'vitest';
import {createRequire} from 'node:module';
import {mkdir,readFile,writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {createHash,randomUUID} from 'node:crypto';
import {PDFDocument} from 'pdf-lib';
import {createOwnedNextApp} from './owned-next-app';
import {seedOwnedApp,seedOwnedScenario,TEST_PASSWORD} from './owned-app-fixture';
import {AUTH_COPY} from '../../lib/auth-copy';
import {newRun,saveSettings} from '../../lib/payroll/service';
import {fixtureProof} from './shift-change-api';
import {measureRenderedContrast} from '../../../scripts/browser-contrast.mjs';

type BrowserRequest={url():string;method():string};
type Route={request():BrowserRequest;abort():Promise<void>;continue():Promise<void>};
// Own published Pay statements and protected PDFs on Employee/Lead phones, against the actual Next server and PostgreSQL.
it('shows own published statements, linked corrections and protected PDFs with truthful recovery in three engines',async()=>{
 const evidence=process.env.NEVORA_EMPLOYEE_PAY_EVIDENCE;if(!evidence)throw Error('Select explicit external pay evidence directory');
 await mkdir(evidence,{recursive:true});
 const runtime=createRequire(process.env.NEVORA_PLAYWRIGHT_RUNTIME_PACKAGE??resolve('tools/ci-browser-runtime/package.json'))('playwright');
 const app=await createOwnedNextApp(evidence,{payrollEnabled:true}),checks:{engine:string;name:string}[]=[],captures:string[]=[],contrasts:{engine:string;theme:string;width:number;subject:string;ratio:number}[]=[],messages:{engine:string;type:string;text:string;expected:boolean;stage:string}[]=[],media:Record<string,unknown>[]=[];
 const q=<T=Record<string,unknown>>(text:string,values:unknown[]=[])=>app.database.executor.query<T>({text,values});
 let presentation=0;const modules=async(disabled:string[])=>{await q("SELECT nevora_set_workspace_presentation($1,'workspace-fuel','QAOWNER',$2,$3,$4)",[randomUUID(),presentation,JSON.stringify({version:1,brand:{},modules:{disabled}}),createHash('sha256').update(String(presentation)).digest('hex')]);presentation++;};
 // Fictional published statements, shaped exactly like the publication rows the payroll worker writes: one
 // company run per period (or one correction of it), with one document per person.
 type Period={startDate:string;endDate:string};
 const run=async(period:Period,payday:string,correctionOf:string|null=null)=>{const id=randomUUID();
  await q("INSERT INTO payroll_runs(workspace_id,id,start_date,end_date,correction_of) VALUES('workspace-fuel',$1,$2,$3,$4)",[id,period.startDate,period.endDate,correctionOf]);
  await q("INSERT INTO payroll_run_revisions(workspace_id,run_id,revision,payload) VALUES('workspace-fuel',$1,1,$2::jsonb)",[id,JSON.stringify({...newRun(id,period,payday,correctionOf),status:'APPROVED'})]);
  await q("INSERT INTO payroll_publications(workspace_id,run_id) VALUES('workspace-fuel',$1)",[id]);return {id,period,payday};};
 const statement=async(owner:{id:string;period:Period;payday:string},employee:string,label:string,mismatched=false)=>{
  const id=randomUUID(),doc=await PDFDocument.create();doc.addPage().drawText('Fictional statement '+label);
  const bytes=Buffer.from(await doc.save()),digest=createHash('sha256').update(mismatched?Buffer.concat([bytes,Buffer.from('x')]):bytes).digest('hex');
  await q("INSERT INTO payroll_documents(workspace_id,id,run_id,employee_id,kind,filename,sha256,content,payload) VALUES('workspace-fuel',$1,$2,$3,'EMPLOYEE_STATEMENT',$4,$5,$6,$7::jsonb)",[id,owner.id,employee,`statement-${label}.pdf`,digest,bytes,JSON.stringify({period:owner.period,payday:owner.payday,coverage:{complete:true,locationIds:['loc-1']}})]);
  return {runId:owner.id,id,bytes};
 };
 let browser:{close():Promise<void>}|undefined,failed:(()=>Promise<void>)|undefined;
 try{
  await seedOwnedApp(app.database.executor);
  // The payroll service checks its flag in this test process too; restore it right after the one setup call.
  const flag=process.env.NEVORA_PAYROLL_ENABLED;process.env.NEVORA_PAYROLL_ENABLED='true';
  try{await saveSettings(await fixtureProof(app.database.executor,'QAOWNER'),{action:'SAVE_SETTINGS',operationId:randomUUID(),expectedRevision:0,effectiveFrom:'2026-01-01',reason:'Fictional pay schedule',
   preferences:{companyName:'Northside QA Workforce',language:'en',currency:'USD',schedule:{frequency:'WEEKLY',anchorDate:'2026-09-21',paydayOffsetDays:2},rules:[],automation:{prepare:false,publish:false,reminders:false,reminderLeadDays:[1]},bankProfile:'NEUTRAL_UNVERIFIED'}} as Parameters<typeof saveSettings>[1],app.database.executor);}
  finally{if(flag===undefined)delete process.env.NEVORA_PAYROLL_ENABLED;else process.env.NEVORA_PAYROLL_ENABLED=flag;}
  for(const [index,engine] of ['chromium','webkit','firefox'].entries()){
   const f=await seedOwnedScenario(app.database.executor,'PAYM'+index,index),[actor,emptyActor,manager]=f.actors;
   await q("UPDATE employees SET role=$2 WHERE id=$1",[actor,index===1?'LEAD':'EMPLOYEE']);await q("UPDATE employees SET role='EMPLOYEE' WHERE id=$1",[emptyActor]);
   const year=2040+index,first=await run({startDate:`${year}-01-01`,endDate:`${year}-01-14`},`${year}-01-19`),second=await run({startDate:`${year}-01-15`,endDate:`${year}-01-28`},`${year}-02-02`);
   const fixed=await run(second.period,second.payday,second.id),december=await run({startDate:`${year-1}-12-01`,endDate:`${year-1}-12-14`},`${year-1}-12-19`);
   const old=await statement(first,actor,`old-${engine}`),original=await statement(second,actor,`original-${engine}`),correction=await statement(fixed,actor,`correction-${engine}`);
   // A coworker's statement in the very same run: it must never be named or opened by this person.
   const peer=await statement(second,manager,`peer-${engine}`),tampered=await statement(december,actor,`tampered-${engine}`,true);
   void old;
   // The ledger is immutable, so a stored digest that doesn't match the bytes models storage corruption.
   const activeBrowser=await runtime[engine].launch({headless:true});browser=activeBrowser;
   const context=await activeBrowser.newContext({viewport:{width:390,height:844},reducedMotion:'reduce',serviceWorkers:'block',acceptDownloads:true});
   // Light is the default since PR36; this journey's theme checks follow the device, which is the explicit System choice.
   await context.addInitScript(()=>{try{localStorage.setItem('nv-theme','system');}catch{}});
   const page=await context.newPage();
   page.setDefaultTimeout(15000);page.setDefaultNavigationTimeout(30000);
   let stage='login',expectedFailure=false;
   page.on('console',(message:{type():string;text():string})=>{if(['error','warning'].includes(message.type()))messages.push({engine,type:message.type(),text:message.text(),expected:expectedFailure,stage});});
   page.on('pageerror',(error:Error)=>messages.push({engine,type:'pageerror',text:error.message,expected:false,stage}));
   await context.route('**/*',async(route:Route)=>{const url=new URL(route.request().url());if(['http:','https:'].includes(url.protocol)&&url.origin!==new URL(app.url).origin){await route.abort();return;}await route.continue();});
   const record=(name:string)=>checks.push({engine,name});
   const shot=async(name:string)=>{const file=engine+'-'+name+'.png';await page.screenshot({path:evidence+'/'+file,style:'nextjs-portal {visibility:hidden;}',caret:'initial'});captures.push(file);};
   failed=async()=>{await shot('failure');await writeFile(evidence+'/'+engine+'-failure.html',await page.locator('body').innerHTML());};
   const forwardKey=engine==='webkit'&&process.platform==='darwin'?'Alt+Tab':'Tab';
   const focused=(selector:string)=>page.locator(selector).evaluate((el:HTMLElement)=>document.activeElement===el);
   // Release 1: an Employee's Pay is the corporate kit page (.c-pay) on every width; a Lead keeps the earlier phone Pay (.em-pay).
   const lead=index===1;
   const state=(kind:string)=>page.locator(`${lead?'.em-pay':'.c-pay'}[data-pay-state="${kind}"]`).waitFor();
   const login=async(target:typeof page,id:string)=>{await target.getByLabel(AUTH_COPY.en.employeeId,{exact:true}).fill(id);await target.getByLabel(AUTH_COPY.en.password,{exact:true}).fill(TEST_PASSWORD);await target.getByRole('button',{name:AUTH_COPY.en.signIn,exact:true}).click();await target.waitForURL(app.url+'/app');};

   if(lead){
     await page.goto(app.url+'/login');await login(page,actor);
     stage='open-from-more';/* An Employee reaches More from the header avatar (corporate shell); a Lead from its More tab. */await page.locator('a[href="/app/more"]:visible').first().click();await page.waitForURL(app.url+'/app/more');
     await page.locator('a[href="/app/my-pay"]:visible').first().click();await page.waitForURL(app.url+'/app/my-pay');await state('ready');
     // Month and day are joined by a no-break space on screen (PAY-UI-7); compare words, not spacing.
     const body=(await page.locator('.em-pay').innerText()).replace(/\u00a0/g,' ');
     expect(body).toContain('Latest statement');expect(body).toContain(`Payday February 2, ${year}`);expect(body).toContain('Correction');expect(body).toContain('This corrects your earlier statement for the same period.');
     expect(body).toContain('Earlier statements');expect(body).toContain('Replaced');expect(body).not.toMatch(/\$|deposit|net pay/i);
     expect(body).toContain('Next scheduled payday');expect(body).toContain('From your workplace’s pay schedule');
     expect(await page.locator('#employee-mobile').getAttribute('data-employee-mobile-page')).toBe('pay');await shot('next-payday');
     const nextPay=await page.locator('.em-pay-next').evaluate((el:HTMLElement)=>{const style=getComputedStyle(el);return {border:parseFloat(style.borderTopWidth),background:style.backgroundColor,padding:parseFloat(style.paddingLeft)};});
     expect(nextPay.border).toBe(0);expect(nextPay.background).toBe('rgba(0, 0, 0, 0)');expect(nextPay.padding).toBe(0);
     expect(await page.locator(`a[href="/api/payroll/documents/${correction.id}/view"]`).count()).toBe(1);
     const html=await page.locator('.em-pay').innerHTML();expect(html).not.toContain(peer.id);
     record('More opens teal Pay: own published statements, correction first, replaced original labelled, no figures, no peer document');

     stage='pay-owned-hours';expect(await page.locator('.mobile-header .brand:visible').count()).toBe(1);await page.locator('.em-pay-links').getByRole('link',{name:'My time',exact:true}).click();await page.waitForURL(app.url+'/app/my-time');await page.getByRole('heading',{name:'Hours',exact:true}).waitFor();await page.locator('.em-hours:visible[data-hours-state="ready"]').waitFor();expect(await page.locator('.mobile-header .brand:visible').count()).toBe(index===1?1:0);const payBack=page.locator('.em-request-heading').getByRole('link',{name:'Pay',exact:true});expect(await payBack.getAttribute('href')).toBe('/app/my-pay');await payBack.click();await page.waitForURL(app.url+'/app/my-pay');await state('ready');record('Pay-owned Hours keeps contextual Back to Pay; Employee task chrome and existing Lead chrome remain distinct');

     stage='correction-link';await page.locator(`#pay-statement-${original.id}`).click();await page.getByRole('button',{name:'Use the corrected statement',exact:true}).click();
     await expect.poll(()=>focused('#pay-latest-title')).toBe(true);
     expect(await page.locator(`#pay-view-earlier-${original.id}`).getAttribute('class')).toBe('em-request-secondary');
     record('Replaced statement leads with Use the corrected statement, keeps its own files secondary, and moves focus to the correction');

     stage='view';const viewed=context.waitForEvent('response',(response:{url():string})=>response.url().endsWith(`/api/payroll/documents/${correction.id}/view`));
     // Real keyboard: from the focused statement heading, native Tab reaches View; Enter opens it.
     await page.keyboard.press(forwardKey);expect(await focused(`#pay-view-latest-${correction.id}`)).toBe(true);
     const popup=context.waitForEvent('page');await page.keyboard.press('Enter');
     const response=await viewed,tab=await popup;expect(response.status()).toBe(200);
     const headers=await response.allHeaders();expect(headers['content-type']).toBe('application/pdf');expect(headers['cache-control']).toBe('no-store, private');expect(headers['content-disposition']).toBe(`inline; filename="statement-correction-${engine}.pdf"`);
     expect(createHash('sha256').update(correction.bytes).digest('hex')).toBe(headers['x-content-sha256']);
     await tab.close();await page.bringToFront();await expect.poll(()=>focused(`#pay-view-latest-${correction.id}`)).toBe(true);
     record('Keyboard '+forwardKey+' and Enter open the verified PDF in a new tab (never cached); focus is on View after returning');

     stage='download';const download=page.waitForEvent('download');await page.locator(`#pay-download-latest-${correction.id}`).click();const file=await download;
     expect(file.suggestedFilename()).toBe(`statement-correction-${engine}.pdf`);const saved=evidence+'/'+engine+'-downloaded.pdf';await file.saveAs(saved);
     expect(createHash('sha256').update(await readFile(saved)).digest('hex')).toBe(createHash('sha256').update(correction.bytes).digest('hex'));
     expect(page.url()).toBe(app.url+'/app/my-pay');
     record('Download delivers the exact published bytes without leaving Pay');
     stage='download-fails';expectedFailure=true;await modules(['payStatements']);
     // The list is still on screen; access ended on the server. Download must navigate back, not save a file (PAY-CR-9).
     const savedFile=page.waitForEvent('download',{timeout:5000}).then(()=>true,()=>false);
     await page.locator(`#pay-download-latest-${correction.id}`).click();await page.waitForURL(new RegExp('/app/my-pay\\?document=unavailable$'));
     expect(await savedFile).toBe(false);await page.waitForLoadState('domcontentloaded');await shot('download-after-access-ended');
     await modules([]);await page.goto(app.url+'/app/my-pay');await state('ready');expectedFailure=false;
     record('A Download whose access ended navigates back to Pay instead of saving a file');

     stage='matrix';
     for(const theme of ['light','dark'])for(const width of [320,390,430]){
      await page.emulateMedia({colorScheme:theme as 'light'|'dark'});await page.setViewportSize({width,height:844});await expect.poll(()=>page.locator('html').getAttribute('data-theme')).toBe(theme);
      expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
      for(const [subject,selector] of [['title','.em-pay h1'],['latest','#pay-latest-title'],['period','.em-pay-latest > p'],['chip','.em-pay-chip'],['view','.em-pay-latest .em-request-primary'],['download','.em-pay-latest .em-request-secondary'],['privacy','.em-pay-privacy']] as const){const measured=await page.locator(selector).first().evaluate(measureRenderedContrast);contrasts.push({engine,theme,width,subject,ratio:measured.ratio});expect(measured.ratio,subject).toBeGreaterThanOrEqual(4.5);}
      const small=await page.locator('.em-pay :is(a,button,summary)').evaluateAll((els:HTMLElement[])=>els.filter(el=>el.checkVisibility({visibilityProperty:true,opacityProperty:true})&&!el.closest('p')&&el.getBoundingClientRect().height<43.5).map(el=>el.outerHTML.slice(0,80)));expect(small).toEqual([]);
      expect(await page.locator('.em-pay h1').evaluate((el:HTMLElement)=>getComputedStyle(el).fontSize)).toBe('32px');
      expect(await page.locator('.em-pay-next').evaluate((el:HTMLElement)=>parseFloat(getComputedStyle(el).borderTopWidth))).toBe(0);
      await page.evaluate(()=>scrollTo(0,0));await shot(`pay-${theme}-${width}-top`);await page.evaluate(()=>scrollTo(0,document.body.scrollHeight));await shot(`pay-${theme}-${width}`);
     }
     await page.setViewportSize({width:320,height:844});await page.evaluate(()=>{document.documentElement.style.fontSize='200%';});
     expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
     const last=page.locator('.em-pay-privacy');await last.scrollIntoViewIfNeeded();
     expect(await last.evaluate((el:HTMLElement)=>el.getBoundingClientRect().bottom<=document.querySelector('.mobile-nav')!.getBoundingClientRect().top+1)).toBe(true);
     await page.evaluate(()=>scrollTo(0,0));await shot('pay-text200-top');await page.evaluate(()=>scrollTo(0,document.body.scrollHeight));await shot('pay-text200');await page.evaluate(()=>{document.documentElement.style.fontSize='';});await page.setViewportSize({width:390,height:844});await page.emulateMedia({colorScheme:'light'});
     record('Light/dark at 320/390/430, contrast, 44px targets, token type, 200% text clear of navigation');

     stage='notification-destination';await page.goto(app.url+`/app/my-pay?statement=${original.id}`);await state('ready');
     await expect.poll(()=>focused(`#pay-statement-${original.id}`)).toBe(true);expect(await page.locator(`#pay-statement-${original.id}`).evaluate((el:HTMLElement)=>(el.parentElement as HTMLDetailsElement).open)).toBe(true);
     await expect.poll(()=>page.url()).toBe(app.url+'/app/my-pay');await shot('notification-statement');
     await page.goto(app.url+`/app/my-pay?statement=${peer.id}`);await state('ready');await expect.poll(()=>focused('.em-pay-notice--caution')).toBe(true);
     expect(await page.locator('.em-pay-notice--caution').innerText()).toContain('That statement isn’t available');expect(await page.locator('.em-pay').innerHTML()).not.toContain(peer.id);
     await page.emulateMedia({colorScheme:'dark'});await expect.poll(()=>page.locator('html').getAttribute('data-theme')).toBe('dark');await shot('notification-missing-dark');await page.emulateMedia({colorScheme:'light'});
     record('A notification opens its exact own statement; a statement that is not own and published is never revealed');

     stage='protected-documents';expectedFailure=true;
     for(const [id,suffix,notice] of [[peer.id,'/view','That statement isn’t available'],[peer.id,'','That statement isn’t available'],[tampered.id,'/view','We couldn’t open that statement'],[randomUUID(),'','That statement isn’t available']] as const){
      await page.goto(app.url+`/api/payroll/documents/${id}${suffix}`);await page.waitForURL(new RegExp('/app/my-pay\\?document=(unavailable|failed)$'));await state('ready');
      await expect.poll(()=>page.url()).toBe(app.url+'/app/my-pay');
      await expect.poll(()=>focused('.em-pay-notice--caution')).toBe(true);expect(await page.locator('.em-pay-notice--caution').innerText()).toContain(notice);
      if(id===tampered.id){await shot('document-integrity-failed');await page.emulateMedia({colorScheme:'dark'});await expect.poll(()=>page.locator('html').getAttribute('data-theme')).toBe('dark');await shot('document-integrity-failed-dark');await page.emulateMedia({colorScheme:'light'});}
     }
     const scripted=await page.evaluate(async(path:string)=>{const r=await fetch(path,{headers:{'x-nevora-payroll':'1'}});return {status:r.status,type:r.headers.get('content-type')};},`/api/payroll/documents/${peer.id}`);
     expect(scripted.status).toBe(404);expect(scripted.type).toContain('application/json');await shot('document-unavailable');expectedFailure=false;
     record('Coworker, missing and integrity-failed PDFs return to Pay with calm recovery; scripted reads keep the JSON 404');

     stage='loading-and-error';expectedFailure=true;let releaseRead!:()=>void;const heldRead=new Promise<void>(resolve=>{releaseRead=resolve;});
     await page.route('**/api/payroll/statements',async(route:{fetch():Promise<unknown>;fulfill(o:{response:unknown}):Promise<void>})=>{const response=await route.fetch();await heldRead;await route.fulfill({response});});
     await page.evaluate(()=>{dispatchEvent(new Event('online'));});await state('loading');await shot('loading');releaseRead();await state('ready');await page.unroute('**/api/payroll/statements');
     await page.route('**/api/payroll/statements',(route:{abort():Promise<void>})=>route.abort());await page.evaluate(()=>{dispatchEvent(new Event('online'));});await state('error');
     expect(await page.locator('.em-pay').innerHTML()).not.toContain(correction.id);await shot('error');await page.unroute('**/api/payroll/statements');
     await page.getByRole('button',{name:'Try again',exact:true}).click();await state('ready');expectedFailure=false;
     record('Held read shows loading; a refused read shows a retryable error with no stale statement; Try again recovers');
     stage='module-off';expectedFailure=true;await modules(['payStatements']);
     await page.evaluate(()=>{dispatchEvent(new Event('offline'));});await state('paused');expect(await page.locator('.em-pay').innerHTML()).not.toContain(correction.id);await shot('paused');
     await page.evaluate(()=>{dispatchEvent(new Event('online'));});await state('module-off');expect(await page.locator('.em-pay').innerHTML()).not.toContain('/api/payroll/documents/');await shot('module-off');
     const directOff=await page.evaluate(async(path:string)=>(await fetch(path,{headers:{'x-nevora-payroll':'1'}})).status,`/api/payroll/documents/${correction.id}`);expect(directOff).toBe(404);
     await modules([]);await page.evaluate(()=>{dispatchEvent(new Event('online'));});await state('ready');expectedFailure=false;
     record('Pause and offline hide statements; turning Pay statements off mid-session removes them and their PDF access; turning it on restores');

     stage='session-ended';expectedFailure=true;const cookie=(await context.cookies()).find((c:{name:string})=>c.name==='fuel_session')!;
     await q('DELETE FROM employee_sessions WHERE token_hash=$1',[createHash('sha256').update(cookie.value).digest('hex')]);
     await page.evaluate(()=>{dispatchEvent(new Event('online'));});await state('signed-out');expect(await page.locator('.em-pay a[href="/login?returnTo=%2Fapp%2Fmy-pay"]').count()).toBe(1);
     expect(await page.locator('.em-pay').innerHTML()).not.toContain(correction.id);await shot('signed-out');
     await page.goto(app.url+`/api/payroll/documents/${correction.id}/view`);await page.waitForURL(/\/login/);expect(new URL(page.url()).searchParams.get('returnTo')).toBe('/app/my-pay');
     await page.getByLabel(AUTH_COPY.en.employeeId,{exact:true}).fill(actor);await page.getByLabel(AUTH_COPY.en.password,{exact:true}).fill(TEST_PASSWORD);await page.getByRole('button',{name:AUTH_COPY.en.signIn,exact:true}).click();
     await page.waitForURL(app.url+'/app/my-pay');await state('ready');expectedFailure=false;
     record('An ended session hides statements, offers Sign in, and a PDF link returns to Pay after sign-in');
   }else{
   // Release 1 boards (G-E-Pay, E-PayHistory, E-Paycheck): an Employee's Pay is the kit page on every width. Pay lists Recent
   // pay (newest three) with Pay history for all; each statement opens its own Paycheck page with View PDF and Download PDF.
   const paycheck=(id:string)=>app.url+'/app/my-pay?paycheck='+id;
   await page.goto(app.url+'/login');await login(page,actor);
   stage='open-from-more';/* An Employee reaches More from the header avatar (corporate shell); a Lead from its More tab. */await page.locator('a[href="/app/more"]:visible').first().click();await page.waitForURL(app.url+'/app/more');
   await page.locator('a[href="/app/my-pay"]:visible').first().click();await page.waitForURL(app.url+'/app/my-pay');await state('ready');
   // Month and day are joined by a no-break space on screen (PAY-UI-7); compare words, not spacing.
   const body=(await page.locator('.c-pay').innerText()).replace(/ /g,' ');
   expect(body).toContain('Recent pay');expect(body).toContain('Correction');expect(body).toContain('Replaced');expect(body).not.toMatch(/\$|deposit|net pay/i);
   expect(body).toContain('This pay period');expect(body).toContain('From your workplace’s pay schedule');expect(body).not.toContain('Downloaded files may contain personal pay information.');
   const rows=page.locator('#pay-recent .c-rows > li > a');expect(await rows.count()).toBe(3);
   expect(await rows.first().getAttribute('id')).toBe(`pay-statement-${correction.id}`);expect((await rows.first().getAttribute('aria-label'))!.replace(/ /g,' ')).toContain(`February 2, ${year}, corrected statement`);
   expect(await rows.nth(1).getAttribute('id')).toBe(`pay-statement-${original.id}`);expect(await rows.nth(1).innerText()).toContain('Replaced');
   expect(await page.locator('#employee-mobile').getAttribute('data-employee-mobile-page')).toBe('pay');await shot('next-payday');
   expect(await page.locator(`a[href="/app/my-pay?paycheck=${correction.id}"]`).count()).toBe(1);
   const html=await page.locator('.c-pay').innerHTML();expect(html).not.toContain(peer.id);
   await page.getByRole('link',{name:'See all pay',exact:true}).click();await page.waitForURL(app.url+'/app/my-pay?view=history');await page.locator('.c-pay[data-pay-view="history"][data-pay-state="ready"]').waitFor();expect(await page.locator('.c-pay [id^="pay-statement-"]').count()).toBe(4);expect(await page.locator('.c-pay').innerHTML()).not.toContain(peer.id);await shot('pay-history');await page.locator('.c-pay .c-nav__back').click();await page.waitForURL(app.url+'/app/my-pay');await state('ready');
   record('More opens Pay: own published statements, correction first, replaced original labelled, Pay history lists all four, no figures, no peer document');

   // Release 1: an Employee's Time is its own tab (no Back to Pay); Pay's See your hours opens it.
   stage='pay-owned-hours';expect(await page.locator('.mobile-header .brand:visible').count()).toBe(1);await page.getByRole('link',{name:'See your hours',exact:true}).click();await page.waitForURL(app.url+'/app/my-time');await page.locator('.c-hours:visible[data-hours-state="ready"]').waitFor();await page.getByRole('heading',{name:'Time',exact:true}).waitFor();expect(await page.locator('.mobile-nav a[aria-current="page"]').innerText()).toBe('Time');await page.goBack();await page.waitForURL(app.url+'/app/my-pay');await state('ready');record('Pay’s See your hours opens the Employee Time tab; browser back returns to Pay');

   stage='correction-link';await page.locator(`#pay-statement-${original.id}`).click();await page.waitForURL(paycheck(original.id));await state('ready');
   const originalCard=page.locator('#pay-paycheck');expect(await originalCard.innerText()).toContain('A corrected statement replaced this one.');expect(await originalCard.innerText()).toContain('Replaced');
   const actions=originalCard.locator('.c-rows > li > a');expect(await actions.first().innerText()).toBe('Use the corrected statement');expect(await actions.nth(1).getAttribute('id')).toBe(`pay-view-${original.id}`);expect(await actions.nth(2).getAttribute('id')).toBe(`pay-download-${original.id}`);
   await page.getByRole('link',{name:'Use the corrected statement',exact:true}).click();await page.waitForURL(paycheck(correction.id));
   await expect.poll(()=>focused('#pay-page-title')).toBe(true);expect(await page.locator('#pay-paycheck').innerText()).toContain('This corrects your earlier statement for the same period.');expect(await page.locator('.c-pay').innerText()).toContain('Downloaded files may contain personal pay information.');
   record('A replaced statement leads with Use the corrected statement, keeps its own files after it, and moves focus to the correction’s Paycheck');

   stage='view';const viewed=context.waitForEvent('response',(response:{url():string})=>response.url().endsWith(`/api/payroll/documents/${correction.id}/view`));
   // Real keyboard: from the focused Paycheck title, native Tab reaches View PDF; Enter opens it.
   await page.keyboard.press(forwardKey);expect(await focused(`#pay-view-${correction.id}`)).toBe(true);
   const popup=context.waitForEvent('page');await page.keyboard.press('Enter');
   const response=await viewed,tab=await popup;expect(response.status()).toBe(200);
   const headers=await response.allHeaders();expect(headers['content-type']).toBe('application/pdf');expect(headers['cache-control']).toBe('no-store, private');expect(headers['content-disposition']).toBe(`inline; filename="statement-correction-${engine}.pdf"`);
   expect(createHash('sha256').update(correction.bytes).digest('hex')).toBe(headers['x-content-sha256']);
   await tab.close();await page.bringToFront();await expect.poll(()=>focused(`#pay-view-${correction.id}`)).toBe(true);
   record('Keyboard '+forwardKey+' and Enter open the verified PDF in a new tab (never cached); focus is on View PDF after returning');

   stage='download';const download=page.waitForEvent('download');await page.locator(`#pay-download-${correction.id}`).click();const file=await download;
   expect(file.suggestedFilename()).toBe(`statement-correction-${engine}.pdf`);const saved=evidence+'/'+engine+'-downloaded.pdf';await file.saveAs(saved);
   expect(createHash('sha256').update(await readFile(saved)).digest('hex')).toBe(createHash('sha256').update(correction.bytes).digest('hex'));
   expect(page.url()).toBe(paycheck(correction.id));
   record('Download delivers the exact published bytes without leaving the Paycheck');
   stage='download-fails';expectedFailure=true;await modules(['payStatements']);
   // The Paycheck is still on screen; access ended on the server. Download must navigate back, not save a file (PAY-CR-9).
   const savedFile=page.waitForEvent('download',{timeout:5000}).then(()=>true,()=>false);
   await page.locator(`#pay-download-${correction.id}`).click();await page.waitForURL(new RegExp('/app/my-pay\\?document=unavailable$'));
   expect(await savedFile).toBe(false);await page.waitForLoadState('domcontentloaded');await shot('download-after-access-ended');
   await modules([]);await page.goto(app.url+'/app/my-pay');await state('ready');expectedFailure=false;
   record('A Download whose access ended navigates back to Pay instead of saving a file');

   // Kit tokens: 24px tab title on Pay (round 2 R1 type scale, was 22px), 17px pushed-page title on Paycheck (v5 used 32px); 44px targets.
   stage='matrix';
   const matrix=async(prefix:string,title:string,subjects:readonly (readonly [string,string])[])=>{
    for(const theme of ['light','dark'])for(const width of [320,390,430]){
     await page.emulateMedia({colorScheme:theme as 'light'|'dark'});await page.setViewportSize({width,height:844});await expect.poll(()=>page.locator('html').getAttribute('data-theme')).toBe(theme);
     expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
     for(const [subject,selector] of subjects){const measured=await page.locator(selector).first().evaluate(measureRenderedContrast);contrasts.push({engine,theme,width,subject:prefix+':'+subject,ratio:measured.ratio});expect(measured.ratio,subject).toBeGreaterThanOrEqual(4.5);}
     const small=await page.locator('.c-pay :is(a,button,summary)').evaluateAll((els:HTMLElement[])=>els.filter(el=>el.checkVisibility({visibilityProperty:true,opacityProperty:true})&&!el.closest('p')&&el.getBoundingClientRect().height<43.5).map(el=>el.outerHTML.slice(0,80)));expect(small).toEqual([]);
     expect(await page.locator('.c-pay h1').evaluate((el:HTMLElement)=>getComputedStyle(el).fontSize)).toBe(title);
     await page.evaluate(()=>scrollTo(0,0));await shot(`${prefix}-${theme}-${width}-top`);await page.evaluate(()=>scrollTo(0,document.body.scrollHeight));await shot(`${prefix}-${theme}-${width}`);
    }
    await page.setViewportSize({width:320,height:844});await page.evaluate(()=>{document.documentElement.style.fontSize='200%';});
    expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
    // The page's last control, centred as a person scrolling would (a fixed tab bar can cover an in-view control).
    const last=page.locator('.c-pay a').last();await last.evaluate((el:HTMLElement)=>el.scrollIntoView({block:'center'}));
    expect(await last.evaluate((el:HTMLElement)=>el.getBoundingClientRect().bottom<=document.querySelector('.mobile-nav')!.getBoundingClientRect().top+1)).toBe(true);
    await page.evaluate(()=>scrollTo(0,0));await shot(prefix+'-text200-top');await page.evaluate(()=>scrollTo(0,document.body.scrollHeight));await shot(prefix+'-text200');await page.evaluate(()=>{document.documentElement.style.fontSize='';});await page.setViewportSize({width:390,height:844});await page.emulateMedia({colorScheme:'light'});
   };
   await matrix('pay','24px',[['title','.c-pay h1'],['recent','#pay-recent-label'],['period','#pay-period .c-line3'],['chip','#pay-period .c-pill'],['payday','#pay-recent .c-row__title'],['dates','#pay-recent .c-row__detail'],['pill','#pay-recent .c-pill']]);
   await page.goto(paycheck(correction.id));await state('ready');
   await matrix('paycheck','17px',[['title','.c-pay h1'],['payday','#pay-paycheck .c-big'],['view','#pay-paycheck .c-pay-action'],['privacy','.c-pay > .c-note']]);
   await page.goto(app.url+'/app/my-pay');await state('ready');
   record('Pay and Paycheck light/dark at 320/390/430, contrast, 44px targets, kit type, 200% text clear of navigation');

   stage='notification-destination';await page.goto(app.url+`/app/my-pay?statement=${original.id}`);await state('ready');
   await expect.poll(()=>page.url()).toBe(paycheck(original.id));await expect.poll(()=>focused('#pay-page-title')).toBe(true);expect(await page.locator('#pay-paycheck').innerText()).toContain('A corrected statement replaced this one.');await shot('notification-statement');
   await page.goto(app.url+`/app/my-pay?statement=${peer.id}`);await state('ready');await expect.poll(()=>focused('.c-pay-notice')).toBe(true);
   expect(await page.locator('.c-pay-notice').innerText()).toContain('That statement isn’t available');expect(await page.locator('.c-pay').innerHTML()).not.toContain(peer.id);
   await page.emulateMedia({colorScheme:'dark'});await expect.poll(()=>page.locator('html').getAttribute('data-theme')).toBe('dark');await shot('notification-missing-dark');await page.emulateMedia({colorScheme:'light'});
   record('A notification opens its exact own statement’s Paycheck; a statement that is not own and published is never revealed');

   stage='protected-documents';expectedFailure=true;
   for(const [id,suffix,notice] of [[peer.id,'/view','That statement isn’t available'],[peer.id,'','That statement isn’t available'],[tampered.id,'/view','We couldn’t open that statement'],[randomUUID(),'','That statement isn’t available']] as const){
    await page.goto(app.url+`/api/payroll/documents/${id}${suffix}`);await page.waitForURL(new RegExp('/app/my-pay\\?document=(unavailable|failed)$'));await state('ready');
    await expect.poll(()=>page.url()).toBe(app.url+'/app/my-pay');
    await expect.poll(()=>focused('.c-pay-notice')).toBe(true);expect(await page.locator('.c-pay-notice').innerText()).toContain(notice);
    if(id===tampered.id){await shot('document-integrity-failed');await page.emulateMedia({colorScheme:'dark'});await expect.poll(()=>page.locator('html').getAttribute('data-theme')).toBe('dark');await shot('document-integrity-failed-dark');await page.emulateMedia({colorScheme:'light'});}
   }
   const scripted=await page.evaluate(async(path:string)=>{const r=await fetch(path,{headers:{'x-nevora-payroll':'1'}});return {status:r.status,type:r.headers.get('content-type')};},`/api/payroll/documents/${peer.id}`);
   expect(scripted.status).toBe(404);expect(scripted.type).toContain('application/json');await shot('document-unavailable');expectedFailure=false;
   record('Coworker, missing and integrity-failed PDFs return to Pay with calm recovery; scripted reads keep the JSON 404');

   stage='loading-and-error';expectedFailure=true;let releaseRead!:()=>void;const heldRead=new Promise<void>(resolve=>{releaseRead=resolve;});
   await page.route('**/api/payroll/statements',async(route:{fetch():Promise<unknown>;fulfill(o:{response:unknown}):Promise<void>})=>{const response=await route.fetch();await heldRead;await route.fulfill({response});});
   await page.evaluate(()=>{dispatchEvent(new Event('online'));});await state('loading');await shot('loading');releaseRead();await state('ready');await page.unroute('**/api/payroll/statements');
   await page.route('**/api/payroll/statements',(route:{abort():Promise<void>})=>route.abort());await page.evaluate(()=>{dispatchEvent(new Event('online'));});await state('error');
   expect(await page.locator('.c-pay').innerHTML()).not.toContain(correction.id);await shot('error');await page.unroute('**/api/payroll/statements');
   await page.getByRole('button',{name:'Try again',exact:true}).click();await state('ready');expectedFailure=false;
   record('Held read shows loading; a refused read shows a retryable error with no stale statement; Try again recovers');
   stage='module-off';expectedFailure=true;await modules(['payStatements']);
   await page.evaluate(()=>{dispatchEvent(new Event('offline'));});await state('paused');expect(await page.locator('.c-pay').innerHTML()).not.toContain(correction.id);await shot('paused');
   await page.evaluate(()=>{dispatchEvent(new Event('online'));});await state('module-off');expect(await page.locator('.c-pay').innerHTML()).not.toContain('/api/payroll/documents/');await shot('module-off');
   const directOff=await page.evaluate(async(path:string)=>(await fetch(path,{headers:{'x-nevora-payroll':'1'}})).status,`/api/payroll/documents/${correction.id}`);expect(directOff).toBe(404);
   await modules([]);await page.evaluate(()=>{dispatchEvent(new Event('online'));});await state('ready');expectedFailure=false;
   record('Pause and offline hide statements; turning Pay statements off mid-session removes them and their PDF access; turning it on restores');

   stage='session-ended';expectedFailure=true;const cookie=(await context.cookies()).find((c:{name:string})=>c.name==='fuel_session')!;
   await q('DELETE FROM employee_sessions WHERE token_hash=$1',[createHash('sha256').update(cookie.value).digest('hex')]);
   await page.evaluate(()=>{dispatchEvent(new Event('online'));});await state('signed-out');expect(await page.locator('.c-pay a[href="/login?returnTo=%2Fapp%2Fmy-pay"]').count()).toBe(1);
   expect(await page.locator('.c-pay').innerHTML()).not.toContain(correction.id);await shot('signed-out');
   await page.goto(app.url+`/api/payroll/documents/${correction.id}/view`);await page.waitForURL(/\/login/);expect(new URL(page.url()).searchParams.get('returnTo')).toBe('/app/my-pay');
   await page.getByLabel(AUTH_COPY.en.employeeId,{exact:true}).fill(actor);await page.getByLabel(AUTH_COPY.en.password,{exact:true}).fill(TEST_PASSWORD);await page.getByRole('button',{name:AUTH_COPY.en.signIn,exact:true}).click();
   await page.waitForURL(app.url+'/app/my-pay');await state('ready');expectedFailure=false;
   record('An ended session hides statements, offers Sign in, and a PDF link returns to Pay after sign-in');
   }

   stage='empty-and-landscape';
   const touch=engine!=='firefox';const landscape=await activeBrowser.newContext({viewport:{width:844,height:390},hasTouch:touch,...(engine==='chromium'?{isMobile:true}:{}),reducedMotion:'reduce',serviceWorkers:'block'});
   try{
    const other=await landscape.newPage();await other.goto(app.url+'/login');await login(other,emptyActor);await other.goto(app.url+'/app/my-pay');
    const metrics=await other.evaluate(()=>({coarse:matchMedia('(pointer: coarse)').matches,landscape:matchMedia('(orientation: landscape)').matches,touchPoints:navigator.maxTouchPoints,width:innerWidth,height:innerHeight}));media.push({engine,...metrics});
    if(metrics.coarse){await other.locator('.c-pay[data-pay-state="empty"]').waitFor();expect(await other.locator('#employee-mobile').getAttribute('data-employee-mobile-page')).toBe('pay');expect(await other.locator('.c-pay').innerText()).toContain('No published statements yet');expect(await other.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
     const shotFile=engine+'-landscape-empty.png';await other.screenshot({path:evidence+'/'+shotFile,style:'nextjs-portal {visibility:hidden;}'});captures.push(shotFile);record('Genuine coarse landscape ('+metrics.touchPoints+' touch points): empty state, no overflow');}
    else{await other.locator('.c-pay[data-pay-state="empty"]').waitFor();expect(await other.locator('.q-pay').count()).toBe(0);record('No coarse pointer: 844px landscape shows the same kit Pay page for an Employee (recorded, not claimed as mobile)');}
    await other.setViewportSize({width:390,height:844});await other.locator('.c-pay[data-pay-state="empty"]').waitFor();const portrait=engine+'-empty-portrait.png';await other.screenshot({path:evidence+'/'+portrait,style:'nextjs-portal {visibility:hidden;}'});captures.push(portrait);
   }finally{await landscape.close();}
   if(engine==='chromium'){
    stage='role-separation';await q("UPDATE employees SET role='MANAGER' WHERE id=$1",[manager]);const managerContext=await activeBrowser.newContext({viewport:{width:390,height:844},serviceWorkers:'block'});
    try{const m=await managerContext.newPage();await m.goto(app.url+'/login');await login(m,manager);await m.goto(app.url+'/app/my-pay');await m.getByRole('heading',{name:'My pay',exact:true}).waitFor();await expect.poll(()=>m.locator('.q-page').innerText()).not.toContain('Loading…');expect(await m.locator('.em-pay').count()).toBe(0);expect(await m.locator('.c-pay').count()).toBe(0);
     const shotFile=engine+'-manager-390.png';await m.screenshot({path:evidence+'/'+shotFile,style:'nextjs-portal {visibility:hidden;}'});captures.push(shotFile);}
    finally{await managerContext.close();}
    record('Manager at phone width keeps the incumbent Quiet My pay');
   }
   await context.close();await browser!.close();browser=undefined;failed=undefined;
  }
  expect(messages.filter(m=>m.type==='pageerror')).toEqual([]);expect(messages.filter(m=>m.type==='error'&&!m.expected)).toEqual([]);
 }catch(error){await failed?.();throw error;}
 finally{await writeFile(evidence+'/results.json',JSON.stringify({checks,captures,contrasts,media,messages,limits:['Controlled loopback browsers and fictional statements written in the publication shape; no payroll run, amount or provider was exercised. Native PDF viewers, Files/Downloads, physical devices, screen readers and hosted transport remain separate.']},null,2));await browser?.close();await app.close();}
},900000);
