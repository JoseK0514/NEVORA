/** External scoped implementation checks. Combined8640247 registration only; never starts a browser. Expected missing fixes are measured negative assertions, never setup-timeout successes.
 * All business writes use the coordinator's held/answered browser gate.
 * Persist command evidence only through gate.summary(), which hashes authority/proof.
 */
export function registerScopedCases(h) {
 const {register,go,hold,post,pending,check,evidence,assertRevealed,until,wait,buttonData,boxDifference,hydrated,action}=h;
 const phone=[[390,844,100],[320,844,200]],sizes=[...phone,[1440,900,100]];
 const need=(condition,message)=>{if(!condition)throw Error('Positive fixture prerequisite missing: '+message);};
 const pin=async(page,button,key)=>{await button.evaluate((e,key)=>{e.dataset.scopedWbAction=key;},key);return page.locator('[data-scoped-wb-action=\"'+key+'\"]');};
 const fieldData=field=>field.evaluate(e=>({focused:document.activeElement===e,disabled:e.matches(':disabled'),readOnly:e.readOnly,value:e.value,tag:e.tagName,type:e.type}));
 async function feedbackVisible(page,row,label){
  const feedback=page.locator('.pw-feedback').filter({visible:true}).first();await feedback.waitFor();
  const state=await evidence(page,row,label),box=await feedback.boundingBox();
  check(row,!!box&&box.y>=state.usable.top-1,label+': progress/recovery starts below measured header',{box,usable:state.usable});
  check(row,!!box&&box.y+box.height<=state.usable.bottom+1,label+': progress/recovery clears measured tab bar',{box,usable:state.usable});
 }
 async function duplicateFromField(page,row,gate,field,form,button,label){
  await wait(100);const during=await fieldData(field),value=during.value,submit=await buttonData(button);
  row.fieldPending=during;row.submitPending=submit;
  check(row,during.focused&&!during.disabled&&during.readOnly,label+': initiating field remains focused, enabled and readonly',during);
  check(row,!submit.disabled&&!submit.fieldsetDisabled&&submit.ariaDisabled==='true',label+': submit stays focusable with aria-disabled',submit);
  await page.keyboard.type('X');check(row,await field.inputValue()===value,label+': pending typing cannot change the captured field');
  await page.keyboard.press('Enter');await form.evaluate(e=>e.requestSubmit());await wait(100);
  check(row,gate.count===1,label+': repeated Enter/requestSubmit sends one command');
  check(row,await field.evaluate(e=>document.activeElement===e),label+': guarded duplicate keeps initiating field focus');
  await evidence(page,row,label+'-field-pending');
 }

 register('scoped-wb-payroll-enter',['IS-B31-PAYROLL'],async({page,row})=>{
  await go(page,row,'/app/settings/payroll');const gate=await hold(page,post('/api/payroll/settings'));
  let field,expected;
  if(row.variant==='company'){field=page.getByLabel('Reason for change',{exact:true});expected='SAVE_SETTINGS';}
  else if(row.variant==='exception'){await page.getByLabel('Employee',{exact:true}).selectOption('AUDIT-E');field=page.getByLabel('Exception reason',{exact:true});expected='SAVE_EXCEPTION';}
  else{await page.getByLabel('Grant recipient',{exact:true}).selectOption('AUDIT-E');field=page.getByLabel('Access change reason',{exact:true});expected='SET_GRANT';}
  await field.waitFor();const form=field.locator('xpath=ancestor::form[1]'),button=form.locator('button[type=submit]').last();await hydrated(form,'onSubmit');
  const reason='Fictional scoped pending-focus inspection';await field.fill(reason);need(await form.evaluate(e=>e.checkValidity()),row.variant+' form valid with initial seeded preferences');
  await field.focus();await evidence(page,row,'before');
  if(row.variant==='access'){
   // Native Enter in textarea edits the draft; do not silently turn it into a command.
   await page.keyboard.press('Enter');await wait(75);check(row,gate.count===0,'Access textarea native Enter does not submit');
   await field.fill(reason);await field.focus();row.activation='requestSubmit with textarea focused';await form.evaluate(e=>e.requestSubmit());
  }else{row.activation='native Enter in reason input';await page.keyboard.press('Enter');}
  await gate.wait(1);check(row,gate.entries[0].body?.action===expected,'Original settings command kind preserved');check(row,gate.entries[0].body?.reason===reason,'Captured original single-line reason preserved');
  await duplicateFromField(page,row,gate,field,form,button,row.variant);
  await button.focus();check(row,await button.evaluate(e=>document.activeElement===e),'User can intentionally focus the pending submit control');
  await gate.release(0,409,{error:'REVIEW_CONFLICT'});await until(async()=>!/^Recording action/.test(await page.locator('.pw-recovery > strong').innerText().catch(()=>'')),'Settings mocked conflict did not settle');await wait(100);
  const settled=await fieldData(field);check(row,!settled.disabled&&!settled.readOnly,'Settled conflict restores original field editing flags',settled);
  check(row,settled.value===reason,'Settled conflict preserves original reason');check(row,await page.evaluate(()=>document.activeElement!==document.body),'Settled conflict does not leave body focus');
  await evidence(page,row,'conflict');row.operations=gate.summary();
 },{accounts:['QAOWNER'],sizes,variants:['company','exception','access']});

 register('scoped-wb-runs-prepare',['IS-B33','IS-B31-PAYROLL'],async({page,row})=>{
  await go(page,row,'/app/payroll');const open=page.getByRole('button',{name:'Prepare a draft',exact:true});await hydrated(open,'onClick');await open.click();
  const form=page.locator('form').filter({has:page.locator('input[name=start]')}),button=form.locator('button[type=submit]');await form.waitFor();await hydrated(form,'onSubmit');
  for(const [name,value]of[['start','2026-11-02'],['end','2026-11-08'],['payday','2026-11-10']])await form.locator('input[name='+name+']').fill(value);
  need(await form.evaluate(e=>e.checkValidity()),'valid fresh draft dates');const gate=await hold(page,post('/api/payroll/runs'));
  if(row.variant==='backlog'){
   const review=page.locator('.pw-backlog-heading button').first();need(await review.count(),'initial fixture returns at least one actual missing period');await review.click();
   const confirmation=page.locator('.pw-backlog-confirm').first(),ack=confirmation.locator('input[type=checkbox]');if(await ack.count())await ack.check();
   const backlog=await pin(page,confirmation.getByRole('button',{name:'Prepare this period',exact:true}),'backlog-prepare');await pending(page,row,gate,backlog,'backlog-prepare');
   check(row,(await buttonData(backlog)).visibleText.includes('Preparing'),'Only initiating backlog button shows Preparing');
   check(row,!(await buttonData(button)).visibleText.includes('Preparing'),'Open unrelated New draft button keeps idle label');
   check(row,gate.entries[0].body?.action==='PREPARE','Backlog retains PREPARE command');
  }else if(row.variant==='enter'){
   const field=form.locator('input[name=payday]');await field.focus();row.before=await buttonData(button);await page.keyboard.press('Enter');await gate.wait(1);
   await duplicateFromField(page,row,gate,field,form,button,'prepare-enter');row.pending=await buttonData(button);const delta=boxDifference(row.before.box,row.pending.box);
   check(row,Object.values(delta??{missing:2}).every(n=>Math.abs(n)<=1),'Prepare Enter pending label preserves geometry within1px',{delta});
   check(row,row.pending.visibleText.includes('Preparing'),'Prepare Enter shows stable pending label');
  }else await pending(page,row,gate,button,'prepare-button');
  const command=gate.entries[0].body;check(row,command?.action==='PREPARE','One original PREPARE command captured');check(row,!('uiOrigin'in(command??{}))&&!('activeTarget'in(command??{})),'UI initiating identity is absent from command payload');
  if(row.variant!=='backlog')check(row,command?.period?.startDate==='2026-11-02'&&command?.period?.endDate==='2026-11-08'&&command?.payday==='2026-11-10','Prepare keeps captured date command');
  await feedbackVisible(page,row,'pending-feedback');await gate.release(0);await until(async()=>await page.locator('.pw-feedback').innerText().then(text=>/interrupted|unconfirmed/i.test(text)),'Prepare interrupted feedback absent');await feedbackVisible(page,row,'interrupted-feedback');
  const retry=page.getByRole('button',{name:'Retry same action',exact:true});await retry.waitFor();await until(()=>retry.isEnabled(),'Original command retry remained disabled');await retry.click();await gate.wait(2);
  check(row,JSON.stringify(gate.entries[1].body)===JSON.stringify(command),'Prepare retry retains entire original command and operation reference');
  if(row.variant==='backlog'){check(row,!(await buttonData(button)).visibleText.includes('Preparing'),'Original backlog retry does not mark unrelated New draft pending');}
  await gate.release(1);row.operations=gate.summary();
 },{accounts:['QAOWNER'],sizes,variants:['button','enter','backlog']});

 register('scoped-wb-runs-approved',['IS-B33'],async({page,row})=>{
  const read=page.waitForResponse(response=>new URL(response.url()).pathname==='/api/payroll/runs'&&response.request().method()==='GET'&&response.status()===200);
  await go(page,row,'/app/payroll');const body=await(await read).json();need(Array.isArray(body.runs),'real authorized Payroll runs response');
  const run=body.runs[0];need(run?.status==='APPROVED'&&Array.isArray(run.rows)&&run.rows.length,'stock fixture selected first run is approved with provider rows');
  const detail=page.locator('.pw-review-current');await detail.waitFor();const disclosure=detail.locator('details.pw-secondary-actions');await disclosure.locator('summary').click();
  const gate=await hold(page,post('/api/payroll/runs'));let button,expected;
  if(row.variant==='payment'){
   button=detail.getByRole('button',{name:'Prepare payment instructions',exact:true});expected='PAYMENT_EXPORT';
  }else{
   await detail.getByRole('button',{name:'Create correction',exact:true}).click();const form=detail.locator('form').filter({has:page.locator('textarea[name=correctionReason]')});await form.waitFor();
   await form.locator('details.pw-import-format summary').click();const amounts={schema:'NEVORA_PAYROLL_IMPORT_V1',currency:'USD',sourceName:'Fictional scoped accountant',sourceReference:'SCOPED-BROWSER-ONLY',period:run.period,payday:run.payday,rows:run.rows.map(r=>({employeeId:r.employeeId,grossMinor:r.grossMinor,netMinor:r.netMinor,employeeDeductions:r.employeeDeductions,employerContributions:r.employerContributions,...(r.earnings?{earnings:r.earnings}:{})}))};
   const json=form.getByLabel('Import JSON',{exact:true});await hydrated(json,'onChange');await json.fill(JSON.stringify(amounts));await form.getByLabel('Correction reason',{exact:true}).fill('Fictional scoped correction, intercepted only');
   button=form.getByRole('button',{name:'Create correction draft',exact:true});expected='CORRECT';
  }
  need(await button.count()===1&&await button.isEnabled(),row.variant+' real fixture grants eligible action');button=await pin(page,button,'approved-'+row.variant);await pending(page,row,gate,button,row.variant);
  check(row,gate.entries[0].body?.action===expected&&gate.entries[0].body?.runId===run.id,'Selected authorized run/action identity preserved');
  await feedbackVisible(page,row,'pending-feedback');await gate.release(0);await until(async()=>/interrupted|unconfirmed/i.test(await page.locator('.pw-feedback').innerText()),'Approved run interrupted feedback absent');await feedbackVisible(page,row,'interrupted-feedback');row.operations=gate.summary();
 },{accounts:['QAOWNER'],sizes,variants:['payment','correction']});

 async function detailAction(page,row,kind){
  await go(page,row,'/app/updates');const href=await page.locator('a.updates-row').first().getAttribute('href');need(href,'owned published update readable to actor');await go(page,row,href);
  if(kind==='ack'){const review=page.getByRole('checkbox',{name:'I have reviewed this update',exact:true});await review.waitFor();await review.check();return page.getByRole('button',{name:'Acknowledge update',exact:true});}
  let withdraw=page.getByRole('button',{name:'Withdraw update',exact:true});need(await withdraw.count()===1,'Owner authored management fixture with canWithdraw');if(await page.locator('.wb-update').count()){await withdraw.click();withdraw=page.locator('.wb-confirm').getByRole('button',{name:'Withdraw update',exact:true});await withdraw.waitFor();}return withdraw;
 }
 async function heldLookup(page,row,status,write){
  await status.waitFor();const settledLocator=status;await status.focus();status=await pin(page,status,'lookup');await status.evaluate(e=>{window.__scopedWbLookup=e;});const before=await buttonData(status),lookup=await hold(page,r=>r.method()==='GET'&&new URL(r.url()).pathname.includes('/communications/operations/'));
  await page.keyboard.press('Enter');await lookup.wait(1);await wait(125);
  const mounted=await status.count()>0;const during=mounted?await buttonData(status):await page.evaluate(()=>({mounted:false,focused:false,disabled:null,ariaDisabled:null,box:null,active:{tag:document.activeElement?.tagName,id:document.activeElement?.id}}));
  row.lookupPending=during;check(row,mounted&&await status.evaluate(e=>e===window.__scopedWbLookup),'Original Check status DOM control stays mounted while lookup held');
  check(row,mounted&&during.focused&&!during.disabled&&during.ariaDisabled==='true','Held Check status retains focus and announces disabled state',during);
  const delta=boxDifference(before.box,during.box);check(row,!!delta&&Object.values(delta).every(n=>Math.abs(n)<=1),'Held Check status geometry stable within1px',{before:before.box,pending:during.box,delta});
  if(mounted){await page.keyboard.press('Enter');await status.click({force:true,timeout:1000,noWaitAfter:true}).catch(()=>{});await wait(75);check(row,lookup.count===1,'Duplicate Check status activation sends one read');}
  else check(row,false,'Pending recovery control remains available for duplicate keyboard activation proof');
  check(row,lookup.entries[0].path.endsWith('/'+write.entries[0].body.operationId),'Lookup binds original retained operation reference');await evidence(page,row,'lookup-held');
  await lookup.release(0,200,{status:'unavailable',reason:'operation_not_found'});await settledLocator.waitFor();await until(async()=>(await settledLocator.getAttribute('aria-disabled'))!=='true','Unknown lookup did not settle');await wait(100);
  check(row,await settledLocator.evaluate(e=>document.activeElement===e),'Unknown lookup completion keeps Check status focus');await evidence(page,row,'lookup-unknown');row.operations=write.summary();row.statusReads=lookup.summary();
 }
 register('scoped-wb-compose-lookup',['IS-B12-LOOKUP'],async({page,row})=>{
  await go(page,row,'/app/updates/compose');await hydrated(page.locator('#communication-title'),'onChange');await page.locator('#communication-title').fill('Fictional scoped update');await page.locator('#communication-body').fill('Fictional browser-only inspection. Publication never reaches the server.');
  await page.route('**/api/manager/communications/preview',route=>route.request().method()==='POST'?route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({state:'ready',count:3,fingerprint:'fictional-scoped-browser-only'})}):route.fallback());
  await page.locator('.wb-compose form.wb-form button[type=submit]').click();const publish=page.locator('.compose-reviewed button[data-kind=primary]');await publish.waitFor();const write=await hold(page,post('/api/manager/communications'));await publish.click();await write.wait(1);await write.release(0);
  await heldLookup(page,row,page.locator('.wb-notice').filter({hasText:'Publication needs a status check'}).getByRole('button',{name:'Check status',exact:true}),write);
 },{accounts:['QAOWNER'],sizes:phone});
 for(const kind of ['ack','withdraw'])register('scoped-wb-detail-'+kind+'-lookup',['IS-B12-LOOKUP'],async({page,row})=>{
  const button=await detailAction(page,row,kind),mode=kind==='ack'?'employee':'manager',write=await hold(page,post('/api/'+mode+'/communications'));await button.focus();await page.keyboard.press('Enter');await write.wait(1);await write.release(0);
  // Initial unknown-result handoff is separate source-integration scope. This case positively focuses the real recovery control before testing lookup retention.
  await heldLookup(page,row,page.locator('.wb-notice').filter({hasText:'Result not yet confirmed'}).getByRole('button',{name:'Check status',exact:true}),write);
 },{accounts:[kind==='ack'?'AUDIT-E':'QAOWNER'],sizes:phone});

 register('scoped-wb-settings-read-retry',['IS-B12'],async({page,row})=>{
  let failed=true;await page.route('**/api/payroll/settings',route=>route.request().method()==='GET'&&failed?route.fulfill({status:503,contentType:'application/json',body:'{}'}):route.fallback());await go(page,row,'/app/settings/payroll');
  const retry=page.getByRole('button',{name:'Try again',exact:true});await retry.waitFor();await retry.focus();failed=false;await page.keyboard.press('Enter');
  const heading=page.locator('#payroll-company-defaults,.payroll-workflow .pw-panel-heading h2').first();await heading.waitFor();await wait(200);check(row,await heading.evaluate(e=>document.activeElement===e),'Successful Settings retry focuses actual ready heading');await assertRevealed(page,row,heading,'ready-retry');
 },{accounts:['QAOWNER'],sizes:phone});
 for(const kind of ['ack','withdraw'])register('scoped-wb-detail-'+kind+'-auth',['IS-B12'],async({page,row})=>{
  const button=await detailAction(page,row,kind),mode=kind==='ack'?'employee':'manager',gate=await hold(page,post('/api/'+mode+'/communications'));await button.focus();await page.keyboard.press('Enter');await gate.wait(1);
  const away=page.locator('.wb-update a.nv-masthead__back').first();if(row.variant==='moved-on')await away.focus();await gate.release(0,401,{});
  const signIn=page.locator('.wb-update .nv-card a[href="/login"]').first();await signIn.waitFor();
  if(row.variant==='moved-on'){await wait(150);check(row,await away.evaluate(e=>document.activeElement===e),'Signed-out action does not steal moved-on focus');await evidence(page,row,'moved-on-401');}
  else{await wait(200);check(row,await signIn.evaluate(e=>document.activeElement===e),'User-initiated401 focuses Sign in');await assertRevealed(page,row,signIn,'focused-401');}
  row.operations=gate.summary();
 },{accounts:[kind==='ack'?'AUDIT-E':'QAOWNER'],sizes:phone,variants:['recover','moved-on']});
 register('scoped-wb-rules-enter',['IS-B31'],async({page,row})=>{
  await go(page,row,'/app/schedule/settings');let form,field;
  if(row.variant==='staffing'){
   form=page.locator('form').filter({has:page.getByRole('button',{name:'Save staffing and hours',exact:true})});
   await form.locator('input[required][type=number]').evaluateAll(fields=>{for(const e of fields)if(!e.value)e.value='2';});
   await form.locator('select[required]').evaluateAll(fields=>{for(const e of fields)if(!e.value){e.value=[...e.options].find(o=>o.value&&!o.disabled)?.value??'';e.dispatchEvent(new Event('change',{bubbles:true}));}});field=form.locator('input[type=number]').first();
  }else if(row.variant==='period'){
   await page.locator('.wb-add-period > summary').click();form=page.locator('form.wb-period-form');await form.locator('input[name=startTime]').fill('09:00');await form.locator('input[name=endTime]').fill('17:00');field=form.locator('input[name=startTime]');
  }else{
   await page.locator('details.wb-policy > summary').click();const label=row.variant==='trade'?'Save trade policy':'Save coverage policy';form=page.locator('form').filter({has:page.getByRole('button',{name:label,exact:true})});await form.locator('select[name=mode]').selectOption('MANAGER_REVIEW');await form.locator('input[name=submissionAdvanceMinutes]').fill('60');await form.locator('input[name=completionAdvanceMinutes]').fill('30');field=form.locator('input[name=submissionAdvanceMinutes]');
  }
  need(await form.evaluate(f=>f.checkValidity()),row.variant+' source form valid');await hydrated(form,'onSubmit');const gate=await hold(page,action);await field.focus();const before=await field.inputValue();await page.keyboard.press('Enter');await gate.wait(1);await wait(200);
  row.pendingField=await field.evaluate(e=>({focused:document.activeElement===e,activeTag:document.activeElement?.tagName,disabled:e.matches(':disabled'),readOnly:e.readOnly,value:e.value}));check(row,row.pendingField.focused&&!row.pendingField.disabled&&row.pendingField.readOnly,'Original Rules field keeps readonly focus while held',row.pendingField);
  await page.keyboard.press('Enter');await form.evaluate(f=>f.requestSubmit());await wait(100);check(row,gate.count===1,'Rules Enter/requestSubmit duplicate guard sends one held action');check(row,await field.inputValue()===before,'Held Rules field retains original captured value');await evidence(page,row,'held');
  await gate.release(0);await until(async()=>(await form.getAttribute('aria-busy'))!=='true','Rules failure did not settle');await wait(100);const after=await field.evaluate(e=>({focused:document.activeElement===e,activeTag:document.activeElement?.tagName,disabled:e.matches(':disabled'),readOnly:e.readOnly,value:e.value}));check(row,after.focused&&!after.disabled,'Settled Rules failure returns original field focus',after);check(row,after.value===before,'Settled Rules failure retains field');await evidence(page,row,'failed');row.operations=gate.summary();
 },{accounts:['QAOWNER'],sizes:phone,variants:['staffing','period','trade','coverage']});

}
