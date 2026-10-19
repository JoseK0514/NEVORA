// Inert browser registration. Run only on the owned released Phase3 preview.
import {readFile,readdir} from 'node:fs/promises';
import {join} from 'node:path';
export function registerScopedCases(h){
  const {register,go,check,evidence,until,hydrated,wait}=h;
  register('scoped-p3-entry-fixture-readback',['Phase3 entry/break correction prerequisite'],async({page,row})=>{
    const preview=process.env.PREVIEW_OUT;
    const run=(await readdir(preview)).filter(name=>name.startsWith('evidence-')).sort().at(-1);
    const manifest=JSON.parse(await readFile(join(preview,run,'phase3-entry-initial-fixture.json'),'utf8'));
    if(manifest.checkpoint!==process.env.VERIFY_SHA||!manifest.initializedBeforeListen)throw Error('SETUP GAP: exact initial-only entry fixture receipt is missing');
    const actor=manifest.actors.find(actor=>actor.account===row.account);
    if(!actor?.entryId||!actor.breakId)throw Error('SETUP GAP: actor has no genuine own entry+break receipt');
    row.initialFixture={source:manifest.checkpoint,account:actor.account,entryId:actor.entryId,breakId:actor.breakId};
    const timeReads=[],contextReads=[];
    row.actualReads={timeReads,contextReads};
    page.on('response',async response=>{
      const path=new URL(response.url()).pathname;
      if(response.request().method()!=='GET'||!['/api/employee/my-time','/api/employee/time-corrections'].includes(path))return;
      let value;try{value=await response.json();}catch{}
      if(path==='/api/employee/my-time'){
        const entry=[...(value?.today?.entries??[]),...(value?.recent?.entries??[])].find(entry=>entry.id===actor.entryId);
        timeReads.push({path,status:response.status(),state:value?.state,ownEntryInPayload:!!entry,ownClosedBreakInPayload:!!entry?.breaks?.some(item=>item.id===actor.breakId&&item.endAt)});
      }else{
        const targets=value?.targets?.filter(target=>target.timeEntryId===actor.entryId)??[];
        contextReads.push({path,status:response.status(),state:value?.state,confirmedEntry:targets.some(target=>target.kind==='ENTRY_BOUNDARY'&&target.context?.state==='confirmed'),confirmedBreak:targets.some(target=>target.kind==='BREAK_BOUNDARY'&&target.breakEntryId===actor.breakId&&target.context?.state==='confirmed')});
      }
    });
    await go(page,row,'/app/my-time');
    const formId='employee-entry-correction-'+actor.entryId;
    const trigger=page.locator('button[aria-controls="'+formId+'"]');
    const entry=page.locator('details.employee-time-entry').filter({has:trigger});
    await until(()=>timeReads.length>0,'SETUP GAP: actual My time read response was never observed');
    await wait(200);
    check(row,timeReads.some(read=>read.status===200&&read.state==='ready'&&read.ownEntryInPayload&&read.ownClosedBreakInPayload),'Actual own My time response contains the genuine closed entry and break',timeReads);
    check(row,await entry.count()===1,'Genuine own closed entry is present in the rendered record list');
    if(await entry.count()!==1){await evidence(page,row,'own-entry-missing-after-actual-read');return;}
    await entry.locator(':scope > summary').click();
    check(row,/Completed/.test(await entry.locator(':scope > summary').innerText()),'Genuine own entry is visibly completed');
    check(row,await entry.locator('.employee-time-break').count()>0,'Genuine own closed break is visibly recorded');
    await hydrated(trigger,'onClick');const beforeContext=contextReads.length;await trigger.click();
    const form=page.locator('[id="'+formId+'"]');
    const select=form.getByLabel('What needs correction?',{exact:true});
    const start=form.getByLabel('Start',{exact:true}),end=form.getByLabel('End',{exact:true});
    await until(()=>contextReads.length>beforeContext,'SETUP GAP: fresh own correction context response was never observed');
    await wait(200);
    check(row,contextReads.some(read=>read.status===200&&read.state==='ready'&&read.confirmedEntry&&read.confirmedBreak),'Actual own correction response confirms both genuine targets',contextReads);
    check(row,await start.isEnabled()&&await end.isEnabled(),'Confirmed own entry context enables correction fields');
    check(row,await select.inputValue()==='entry','Entry boundary target is selected from the genuine own entry');
    check(row,!!await start.inputValue()&&!!await end.inputValue(),'Entry boundary fields contain actual recorded times');
    await evidence(page,row,'entry-boundary-ready');
    const breakValue='break:'+actor.breakId;
    check(row,await select.locator('option[value="'+breakValue+'"]').count()===1,'Genuine own break appears as a real correction option');
    if(await select.locator('option[value="'+breakValue+'"]').count()===1){
      const beforeBreakContext=contextReads.length;
      await select.selectOption(breakValue);
      await until(()=>contextReads.length>beforeBreakContext,'SETUP GAP: fresh own break context response was never observed');
      await wait(200);
      check(row,await start.isEnabled()&&await end.isEnabled(),'Confirmed own break context enables correction fields');
      check(row,await select.inputValue()===breakValue,'Break boundary target retains the genuine own break identity');
      check(row,!!await start.inputValue()&&!!await end.inputValue(),'Break boundary fields contain actual recorded times');
      await evidence(page,row,'break-boundary-ready');
    }
    check(row,timeReads.some(read=>read.status===200)&&contextReads.some(read=>read.status===200),'UI readback used actual successful source reads');
  },{accounts:['AUDIT-E','AUDIT-LEAD'],sizes:[[390,844,100],[320,844,200]]});
}
