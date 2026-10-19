/** Exact864 source-retained cases. Adds no application changes or server writes. */
export function registerScopedCases(h){
 const {register,go,hold,post,pending,check,evidence,until,wait,buttonData,hydrated,action}=h;
 const sizes=[[390,844,100],[320,844,200]],need=(value,label)=>{if(!value)throw Error('Positive fixture prerequisite missing: '+label);};
 const pin=async(page,button,key)=>{await button.evaluate((e,key)=>e.dataset.wbSourceProof=key,key);return page.locator('[data-wb-source-proof="'+key+'"]');};
 register('exit-wb-runs-positive-states',['IS-B33'],async({page,row})=>{
  const read=page.waitForResponse(response=>new URL(response.url()).pathname==='/api/payroll/runs'&&response.request().method()==='GET'&&response.status()===200);await go(page,row,'/app/payroll');const body=await(await read).json();need(body.version==='PAYROLL_API_V1'&&body.capabilities?.canApprove,'authorized Owner Runs response');let button,expected;
  if(row.variant==='retry'){
   const failed=body.jobs.find(job=>job.status==='FAILED');need(failed,'before-listen canonically failed SCHEDULE_CHANGED job');const index=body.jobs.findIndex(job=>job.id===failed.id);button=page.locator('.pw-job').nth(index).getByRole('button',{name:/^Retry /});expected='RETRY_JOB';
  }else{
   const index=body.runs.findIndex(run=>row.variant==='approve'?run.status==='REVIEW_REQUIRED'&&run.reviewToken&&run.rows?.length&&run.totals&&run.exceptions.every(x=>x.startsWith('CORRECTION_REASON:')):run.status==='APPROVED'&&run.documents.some(doc=>doc.kind==='EMPLOYEE_STATEMENT'&&!doc.published));need(index>=0,row.variant+' canonical before-listen eligible run');await page.locator('.pw-run-list > button').nth(index).click();const detail=page.locator('.pw-review-current');
   if(row.variant==='approve'){await detail.getByRole('checkbox',{name:/I reviewed revision/}).check();button=detail.getByRole('button',{name:/^Approve revision/});expected='APPROVE';}
   else{await detail.getByRole('checkbox',{name:'Make the approved statements available to their employees.',exact:true}).check();button=detail.getByRole('button',{name:'Publish employee statements',exact:true});expected='PUBLISH';}
  }
  need(await button.count()===1&&await button.isEnabled(),row.variant+' actual eligible control');button=await pin(page,button,row.variant);const gate=await hold(page,post('/api/payroll/runs'));await pending(page,row,gate,button,row.variant);check(row,gate.entries[0].body?.action===expected,'Original business command identity retained');await gate.release(0);await until(async()=>/interrupted|unconfirmed/i.test(await page.locator('.pw-feedback').innerText()),'Runs failure did not settle');await evidence(page,row,'failed');row.operations=gate.summary();
 },{accounts:['QAOWNER'],sizes:[...sizes,[1440,900,100]],variants:['approve','publish','retry']});
}
