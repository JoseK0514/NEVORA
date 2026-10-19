/** Exact864 source-retained cases. Adds no application changes or server writes. */
export function registerScopedCases(h){
 const {register,go,hold,post,pending,check,evidence,until,wait,buttonData,hydrated,action}=h;
 const sizes=[[390,844,100],[320,844,200]],need=(value,label)=>{if(!value)throw Error('Positive fixture prerequisite missing: '+label);};
 const pin=async(page,button,key)=>{await button.evaluate((e,key)=>e.dataset.wbSourceProof=key,key);return page.locator('[data-wb-source-proof="'+key+'"]');};
 register('exit-wb-rules-enter',['IS-B31'],async({page,row})=>{
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
 },{accounts:['QAOWNER'],sizes,variants:['staffing','period','trade','coverage']});
 register('exit-wb-runs-positive-states',['IS-B33'],async({page,row})=>{
  const read=page.waitForResponse(response=>new URL(response.url()).pathname==='/api/payroll/runs'&&response.request().method()==='GET'&&response.status()===200);await go(page,row,'/app/payroll');const body=await(await read).json();need(body.version==='PAYROLL_API_V1'&&body.capabilities?.canApprove,'authorized Owner Runs response');let button,expected;
  if(row.variant==='retry'){
   const failed=body.jobs.find(job=>job.status==='FAILED');need(failed,'before-listen explicitly fictional FAILED job');const index=body.jobs.findIndex(job=>job.id===failed.id);button=page.locator('.pw-job').nth(index).getByRole('button',{name:/^Retry /});expected='RETRY_JOB';
  }else{
   const index=body.runs.findIndex(run=>row.variant==='approve'?run.status==='REVIEW_REQUIRED'&&run.reviewToken&&run.rows?.length&&run.totals&&run.exceptions.every(x=>x.startsWith('CORRECTION_REASON:')):run.status==='APPROVED'&&run.documents.some(doc=>doc.kind==='EMPLOYEE_STATEMENT'&&!doc.published));need(index>=0,row.variant+' canonical before-listen eligible run');await page.locator('.pw-run-list > button').nth(index).click();const detail=page.locator('.pw-review-current');
   if(row.variant==='approve'){await detail.getByRole('checkbox',{name:/I reviewed revision/}).check();button=detail.getByRole('button',{name:/^Approve revision/});expected='APPROVE';}
   else{await detail.getByRole('checkbox',{name:'Make the approved statements available to their employees.',exact:true}).check();button=detail.getByRole('button',{name:'Publish employee statements',exact:true});expected='PUBLISH';}
  }
  need(await button.count()===1&&await button.isEnabled(),row.variant+' actual eligible control');button=await pin(page,button,row.variant);const gate=await hold(page,post('/api/payroll/runs'));await pending(page,row,gate,button,row.variant);check(row,gate.entries[0].body?.action===expected,'Original business command identity retained');await gate.release(0);await until(async()=>/interrupted|unconfirmed/i.test(await page.locator('.pw-feedback').innerText()),'Runs failure did not settle');await evidence(page,row,'failed');row.operations=gate.summary();
 },{accounts:['QAOWNER'],sizes:[...sizes,[1440,900,100]],variants:['approve','publish','retry']});
}
