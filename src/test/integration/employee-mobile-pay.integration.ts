import {it,expect} from 'vitest';
import {createRequire} from 'node:module';
import {mkdir,readFile,writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {createHash,randomUUID} from 'node:crypto';
import {PDFDocument} from 'pdf-lib';
import {createOwnedNextApp} from './owned-next-app';
import {seedOwnedApp,seedOwnedScenario,TEST_PASSWORD} from './owned-app-fixture';
import {AUTH_COPY} from '../../lib/auth-copy';
import {newRun} from '../../lib/payroll/service';
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
 // Fictional published statements, shaped exactly like the publication rows the payroll worker writes.
 const publish=async(employee:string,label:string,period:{startDate:string;endDate:string},payday:string,correctionOf:string|null=null)=>{
  const runId=randomUUID(),id=randomUUID(),doc=await PDFDocument.create();doc.addPage().drawText('Fictional statement '+label);
  const bytes=Buffer.from(await doc.save()),digest=createHash('sha256').update(bytes).digest('hex');
  await q("INSERT INTO payroll_runs(workspace_id,id,start_date,end_date,correction_of) VALUES('workspace-fuel',$1,$2,$3,$4)",[runId,period.startDate,period.endDate,correctionOf]);
  await q("INSERT INTO payroll_run_revisions(workspace_id,run_id,revision,payload) VALUES('workspace-fuel',$1,1,$2::jsonb)",[runId,JSON.stringify({...newRun(runId,period,payday,correctionOf),status:'APPROVED'})]);
  await q("INSERT INTO payroll_documents(workspace_id,id,run_id,employee_id,kind,filename,sha256,content,payload) VALUES('workspace-fuel',$1,$2,$3,'EMPLOYEE_STATEMENT',$4,$5,$6,$7::jsonb)",[id,runId,employee,`statement-${label}.pdf`,digest,bytes,JSON.stringify({period,payday,coverage:{complete:true,locationIds:['loc-1']}})]);
  await q("INSERT INTO payroll_publications(workspace_id,run_id) VALUES('workspace-fuel',$1)",[runId]);
  return {runId,id,bytes};
 };
 let browser:{close():Promise<void>}|undefined,failed:(()=>Promise<void>)|undefined;
 try{
  await seedOwnedApp(app.database.executor);
  for(const [index,engine] of ['chromium','webkit','firefox'].entries()){
   const f=await seedOwnedScenario(app.database.executor,'PAYM'+index,index),[actor,emptyActor,manager]=f.actors;
   await q("UPDATE employees SET role=$2 WHERE id=$1",[actor,index===1?'LEAD':'EMPLOYEE']);await q("UPDATE employees SET role='EMPLOYEE' WHERE id=$1",[emptyActor]);
   const year=2040+index,old=await publish(actor,`old-${engine}`,{startDate:`${year}-01-01`,endDate:`${year}-01-14`},`${year}-01-19`);
   const original=await publish(actor,`original-${engine}`,{startDate:`${year}-01-15`,endDate:`${year}-01-28`},`${year}-02-02`);
   const correction=await publish(actor,`correction-${engine}`,{startDate:`${year}-01-15`,endDate:`${year}-01-28`},`${year}-02-02`,original.runId);
   const peer=await publish(manager,`peer-${engine}`,{startDate:`${year}-01-15`,endDate:`${year}-01-28`},`${year}-02-02`);
   const tampered=await publish(actor,`tampered-${engine}`,{startDate:`${year-1}-12-01`,endDate:`${year-1}-12-14`},`${year-1}-12-19`);
   await q("UPDATE payroll_documents SET content=$2 WHERE id=$1",[tampered.id,Buffer.from('%PDF-1.7 altered after publication')]);
   const activeBrowser=await runtime[engine].launch({headless:true});browser=activeBrowser;
   const context=await activeBrowser.newContext({viewport:{width:390,height:844},reducedMotion:'reduce',serviceWorkers:'block',acceptDownloads:true}),page=await context.newPage();
   page.setDefaultTimeout(15000);page.setDefaultNavigationTimeout(30000);
   let stage='login',expectedFailure=false;
   page.on('console',(message:{type():string;text():string})=>{if(['error','warning'].includes(message.type()))messages.push({engine,type:message.type(),text:message.text(),expected:expectedFailure,stage});});
   page.on('pageerror',(error:Error)=>messages.push({engine,type:'pageerror',text:error.message,expected:false,stage}));
   await context.route('**/*',async(route:Route)=>{const url=new URL(route.request().url());if(['http:','https:'].includes(url.protocol)&&url.origin!==new URL(app.url).origin){await route.abort();return;}await route.continue();});
   const record=(name:string)=>checks.push({engine,name});
   const shot=async(name:string)=>{const file=engine+'-'+name+'.png';await page.screenshot({path:evidence+'/'+file,style:'nextjs-portal {visibility:hidden;}',caret:'initial'});captures.push(file);};
   failed=async()=>{await shot('failure');await writeFile(evidence+'/'+engine+'-failure.html',await page.locator('body').innerHTML());};
   const focused=(selector:string)=>page.locator(selector).evaluate((el:HTMLElement)=>document.activeElement===el);
   const state=(kind:string)=>page.locator(`.em-pay[data-pay-state="${kind}"]`).waitFor();
   const login=async(target:typeof page,id:string)=>{await target.getByLabel(AUTH_COPY.en.employeeId,{exact:true}).fill(id);await target.getByLabel(AUTH_COPY.en.password,{exact:true}).fill(TEST_PASSWORD);await target.getByRole('button',{name:AUTH_COPY.en.signIn,exact:true}).click();await target.waitForURL(app.url+'/app');};

   await page.goto(app.url+'/login');await login(page,actor);
   stage='open-from-more';await page.locator('.mobile-nav-link[href="/app/more"]:visible').click();await page.waitForURL(app.url+'/app/more');
   await page.locator('a[href="/app/my-pay"]:visible').first().click();await page.waitForURL(app.url+'/app/my-pay');await state('ready');
   const body=await page.locator('.em-pay').innerText();
   expect(body).toContain('Latest statement');expect(body).toContain(`Payday February 2, ${year}`);expect(body).toContain('Correction');expect(body).toContain('This corrects your earlier statement for the same period.');
   expect(body).toContain('Earlier statements');expect(body).toContain('Replaced');expect(body).not.toMatch(/\$|deposit|net pay/i);
   expect(await page.locator(`a[href="/api/payroll/documents/${correction.id}/view"]`).count()).toBe(1);
   const html=await page.locator('.em-pay').innerHTML();expect(html).not.toContain(peer.id);
   record('More opens teal Pay: own published statements, correction first, replaced original labelled, no figures, no peer document');

   stage='correction-link';await page.locator(`#pay-statement-${original.id}`).click();await page.getByRole('link',{name:'Go to the corrected statement',exact:true}).click();
   await expect.poll(()=>focused('#pay-latest-title')).toBe(true);
   record('Replaced statement explains itself and moves focus to its correction');

   stage='view';const viewed=context.waitForEvent('response',(response:{url():string})=>response.url().endsWith(`/api/payroll/documents/${correction.id}/view`));
   const popup=context.waitForEvent('page');await page.locator(`#pay-view-latest-${correction.id}`).click();
   const response=await viewed,tab=await popup;expect(response.status()).toBe(200);
   const headers=await response.allHeaders();expect(headers['content-type']).toBe('application/pdf');expect(headers['cache-control']).toBe('no-store, private');expect(headers['content-disposition']).toBe(`inline; filename="statement-correction-${engine}.pdf"`);
   expect(createHash('sha256').update(correction.bytes).digest('hex')).toBe(headers['x-content-sha256']);
   await tab.close();await page.bringToFront();await expect.poll(()=>focused(`#pay-view-latest-${correction.id}`)).toBe(true);
   record('View opens the verified PDF in a new tab (never cached) and focus stays on its control after returning');

   stage='download';const download=page.waitForEvent('download');await page.locator(`#pay-download-latest-${correction.id}`).click();const file=await download;
   expect(file.suggestedFilename()).toBe(`statement-correction-${engine}.pdf`);const saved=evidence+'/'+engine+'-downloaded.pdf';await file.saveAs(saved);
   expect(createHash('sha256').update(await readFile(saved)).digest('hex')).toBe(createHash('sha256').update(correction.bytes).digest('hex'));
   expect(page.url()).toBe(app.url+'/app/my-pay');
   record('Download delivers the exact published bytes without leaving Pay');

   stage='matrix';
   for(const theme of ['light','dark'])for(const width of [320,390,430]){
    await page.emulateMedia({colorScheme:theme as 'light'|'dark'});await page.setViewportSize({width,height:844});await expect.poll(()=>page.locator('html').getAttribute('data-theme')).toBe(theme);
    expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
    for(const [subject,selector] of [['title','.em-pay h1'],['latest','#pay-latest-title'],['period','.em-pay-latest > p'],['chip','.em-pay-chip'],['view','.em-pay-latest .em-request-primary'],['download','.em-pay-latest .em-request-secondary'],['privacy','.em-pay-privacy']] as const){const measured=await page.locator(selector).first().evaluate(measureRenderedContrast);contrasts.push({engine,theme,width,subject,ratio:measured.ratio});expect(measured.ratio,subject).toBeGreaterThanOrEqual(4.5);}
    const small=await page.locator('.em-pay :is(a,button,summary)').evaluateAll((els:HTMLElement[])=>els.filter(el=>el.checkVisibility({visibilityProperty:true,opacityProperty:true})&&!el.closest('p')&&el.getBoundingClientRect().height<43.5).map(el=>el.outerHTML.slice(0,80)));expect(small).toEqual([]);
    expect(await page.locator('.em-pay h1').evaluate((el:HTMLElement)=>getComputedStyle(el).fontSize)).toBe('32px');
    await page.evaluate(()=>scrollTo(0,0));await shot(`pay-${theme}-${width}-top`);await page.evaluate(()=>scrollTo(0,document.body.scrollHeight));await shot(`pay-${theme}-${width}`);
   }
   await page.setViewportSize({width:320,height:844});await page.evaluate(()=>{document.documentElement.style.fontSize='200%';});
   expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
   const last=page.locator('.em-pay-privacy');await last.scrollIntoViewIfNeeded();
   expect(await last.evaluate((el:HTMLElement)=>el.getBoundingClientRect().bottom<=document.querySelector('.mobile-nav')!.getBoundingClientRect().top+1)).toBe(true);
   await shot('pay-text200');await page.evaluate(()=>{document.documentElement.style.fontSize='';});await page.setViewportSize({width:390,height:844});await page.emulateMedia({colorScheme:'light'});
   record('Light/dark at 320/390/430, contrast, 44px targets, token type, 200% text clear of navigation');

   stage='notification-destination';await page.goto(app.url+`/app/my-pay?statement=${original.id}`);await state('ready');
   await expect.poll(()=>focused(`#pay-statement-${original.id}`)).toBe(true);expect(await page.locator(`#pay-statement-${original.id}`).evaluate((el:HTMLElement)=>(el.parentElement as HTMLDetailsElement).open)).toBe(true);
   await expect.poll(()=>page.url()).toBe(app.url+'/app/my-pay');await shot('notification-statement');
   await page.goto(app.url+`/app/my-pay?statement=${peer.id}`);await state('ready');await expect.poll(()=>focused('.em-pay-notice--caution')).toBe(true);
   expect(await page.locator('.em-pay-notice--caution').innerText()).toContain('That statement isn’t available');expect(await page.locator('.em-pay').innerHTML()).not.toContain(peer.id);
   record('A notification opens its exact own statement; a statement that is not own and published is never revealed');

   stage='protected-documents';expectedFailure=true;
   for(const [id,suffix,notice] of [[peer.id,'/view','That statement isn’t available'],[peer.id,'','That statement isn’t available'],[tampered.id,'/view','We couldn’t open that statement'],[randomUUID(),'','That statement isn’t available']] as const){
    await page.goto(app.url+`/api/payroll/documents/${id}${suffix}`);await page.waitForURL(app.url+'/app/my-pay');await state('ready');
    await expect.poll(()=>focused('.em-pay-notice--caution')).toBe(true);expect(await page.locator('.em-pay-notice--caution').innerText()).toContain(notice);
   }
   const scripted=await page.evaluate(async(path:string)=>{const r=await fetch(path,{headers:{'x-nevora-payroll':'1'}});return {status:r.status,type:r.headers.get('content-type')};},`/api/payroll/documents/${peer.id}`);
   expect(scripted.status).toBe(404);expect(scripted.type).toContain('application/json');await shot('document-failed');expectedFailure=false;
   record('Coworker, missing and integrity-failed PDFs return to Pay with calm recovery; scripted reads keep the JSON 404');

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

   stage='empty-and-landscape';
   const touch=engine!=='firefox';const landscape=await activeBrowser.newContext({viewport:{width:844,height:390},hasTouch:touch,...(engine==='chromium'?{isMobile:true}:{}),reducedMotion:'reduce',serviceWorkers:'block'});
   try{
    const other=await landscape.newPage();await other.goto(app.url+'/login');await login(other,emptyActor);await other.goto(app.url+'/app/my-pay');
    const metrics=await other.evaluate(()=>({coarse:matchMedia('(pointer: coarse)').matches,landscape:matchMedia('(orientation: landscape)').matches,touchPoints:navigator.maxTouchPoints,width:innerWidth,height:innerHeight}));media.push({engine,...metrics});
    if(metrics.coarse){await other.locator('.em-pay[data-pay-state="empty"]').waitFor();expect(await other.locator('.em-pay').innerText()).toContain('No published statements yet');expect(await other.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
     const shotFile=engine+'-landscape-empty.png';await other.screenshot({path:evidence+'/'+shotFile,style:'nextjs-portal {visibility:hidden;}'});captures.push(shotFile);record('Genuine coarse landscape ('+metrics.touchPoints+' touch points): empty state, no overflow');}
    else{await other.locator('.q-pay').waitFor();expect(await other.locator('.em-pay').count()).toBe(0);record('No coarse pointer: 844px landscape keeps the desktop Pay (recorded, not claimed as mobile)');}
   }finally{await landscape.close();}
   if(engine==='chromium'){
    stage='role-separation';await q("UPDATE employees SET role='MANAGER' WHERE id=$1",[manager]);const managerContext=await activeBrowser.newContext({viewport:{width:390,height:844},serviceWorkers:'block'});
    try{const m=await managerContext.newPage();await m.goto(app.url+'/login');await login(m,manager);await m.goto(app.url+'/app/my-pay');await m.getByRole('heading',{name:'My pay',exact:true}).waitFor();expect(await m.locator('.em-pay').count()).toBe(0);
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
