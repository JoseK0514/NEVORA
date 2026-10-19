import {createRequire} from 'node:module';import {readFile,readdir,mkdir,writeFile}from'node:fs/promises';import{join}from'node:path';import{createHash}from'node:crypto';
const require=createRequire('/workspace/nevora-browser-runtime/package.json'),{chromium,webkit}=require('playwright');
const stage=process.argv[2];if(!['before','after'].includes(stage))throw Error('Pass before or after');
const out='/workspace/paused-previews/wave-b-isb31',dest='/workspace/nevora-inspections/p35-wave-b/is-b31-preview-proof';await mkdir(dest+'/crops',{recursive:true});
const ev=(await readdir(out)).filter(x=>x.startsWith('evidence-')).sort().at(-1),access=JSON.parse(await readFile(join(out,ev,'access.json'),'utf8'));const results=process.env.ISB31_CASE?JSON.parse(await readFile(dest+'/'+stage+'.json','utf8')).filter(x=>`${x.engine}/${x.width}/${x.text}/${x.kind}`!==process.env.ISB31_CASE):[];
for(const[engine,type]of Object.entries({chromium,webkit})){
 const browser=await type.launch();try{
 for(const[width,text]of [[390,100],[320,200]])for(const kind of ['staffing','coverage-period','trade-policy','coverage-policy']){
  if(process.env.ISB31_CASE&&`${engine}/${width}/${text}/${kind}`!==process.env.ISB31_CASE)continue;
  const c=await browser.newContext({storageState:join(out,'state/QAOWNER.json'),viewport:{width,height:844},isMobile:true,hasTouch:true,serviceWorkers:'block'});
  let release,seen,counts=0;const held=new Promise(r=>release=r),got=new Promise(r=>seen=r);const requests=[];
  await c.route('**/*',async r=>{const q=r.request(),u=new URL(q.url());if(['http:','https:'].includes(u.protocol)&&u.origin!==access.url)return r.abort();if(!['GET','HEAD','OPTIONS'].includes(q.method())){if(u.pathname==='/app/schedule/settings'){counts++;requests.push({method:q.method(),path:u.pathname,action:q.headers()['next-action']??null,bodySha256:createHash('sha256').update(q.postDataBuffer()??'').digest('hex')});seen();await held;return r.abort();}return r.abort();}return r.continue();});
  const p=await c.newPage();p.setDefaultTimeout(20000);const record={stage,engine,width,text,kind,serverReached:0};let field,form;
  try{
   await p.goto(access.url+'/app/schedule/settings',{waitUntil:'load',timeout:60000});await p.evaluate(()=>document.fonts.ready);await p.waitForTimeout(400);if(text!==100){await p.evaluate(t=>document.documentElement.style.fontSize=t+'%',text);await p.waitForTimeout(300);}
   if(kind==='staffing'){
    form=p.locator('form').filter({has:p.getByRole('button',{name:'Save staffing and hours',exact:true})});
    await form.locator('input[required][type=number]').evaluateAll(es=>{for(const e of es){if(!e.value)e.value='2';}});
    await form.locator('select[required]').evaluateAll(es=>{for(const e of es){if(!e.value){e.value=[...e.options].find(o=>!o.disabled&&o.value)?.value??'';e.dispatchEvent(new Event('change',{bubbles:true}));}}});
    field=form.locator('input[type=number]').first();
   }else if(kind==='coverage-period'){
    await p.locator('.wb-add-period').evaluate(e=>e.open=true);form=p.locator('form.wb-period-form');await form.locator('input[name=startTime]').fill('09:00');await form.locator('input[name=endTime]').fill('17:00');field=form.locator('input[name=startTime]');
   }else{
    await p.locator('details.wb-policy').evaluate(e=>e.open=true);form=p.locator('form').filter({has:p.getByRole('button',{name:kind==='trade-policy'?'Save trade policy':'Save coverage policy',exact:true})});await form.locator('select[name=mode]').selectOption('MANAGER_REVIEW');await form.locator('input[name=submissionAdvanceMinutes]').fill('60');await form.locator('input[name=completionAdvanceMinutes]').fill('30');field=form.locator('input[name=submissionAdvanceMinutes]');
   }
   await form.evaluate((f,kind)=>f.dataset.isb31Proof=kind,kind);form=p.locator('form[data-isb31-proof="'+kind+'"]');field=form.locator('[name="'+await field.getAttribute('name')+'"]').first();
   const snapshot=()=>form.evaluate(f=>({data:[...new FormData(f)].map(([k,v])=>[k,typeof v==='string'?v:'[file]']),controls:[...f.querySelectorAll('fieldset.configuration-fields input,fieldset.configuration-fields select,fieldset.configuration-fields textarea,fieldset.configuration-fields button')].map((e,i)=>({i,name:e.name,type:e.type,disabled:e.disabled,readOnly:'readOnly'in e?e.readOnly:null,value:e.value}))}));
   record.original=await snapshot();await field.focus();record.field=await field.evaluate(e=>({name:e.name,type:e.type,value:e.value}));await field.press('Enter');await Promise.race([got,new Promise((_,rej)=>setTimeout(()=>rej(Error('No intercepted action within 8s')),8000))]);await p.waitForTimeout(350);
   record.pending=await field.evaluate(e=>({active:e===document.activeElement,activeTag:document.activeElement?.tagName,readOnly:e.readOnly,disabled:e.matches(':disabled'),value:e.value,rootSize:getComputedStyle(document.documentElement).fontSize}));
   // A second Enter on the original control and a synthetic same-form submit must hit the existing synchronous guard.
   await p.keyboard.press('Enter');await form.evaluate(f=>f.requestSubmit());await p.waitForTimeout(150);record.whileHeldCount=counts;
   if(record.pending.active){await p.keyboard.press('ArrowUp');await p.keyboard.press('Backspace');}record.pendingValueAfterKeys=await field.inputValue();
   await p.screenshot({path:dest+`/crops/${stage}-${engine}-${width}-t${text}-${kind}-held.png`});release();await form.locator('[aria-busy=true]').count().catch(()=>0);await p.waitForTimeout(800);
   record.failed=await field.evaluate(e=>({active:e===document.activeElement,activeTag:document.activeElement?.tagName,readOnly:e.readOnly,disabled:e.matches(':disabled'),value:e.value}));record.restored=await snapshot();record.requests=requests;record.requestCount=counts;
   record.sameFormData=JSON.stringify(record.original.data)===JSON.stringify(record.restored.data);record.priorDisabledReadonlyRestored=JSON.stringify(record.original.controls.map(({i,name,type,disabled,readOnly})=>({i,name,type,disabled,readOnly})))===JSON.stringify(record.restored.controls.map(({i,name,type,disabled,readOnly})=>({i,name,type,disabled,readOnly})));
   record.pass=stage==='before'?(!record.pending.active&&counts===1):(record.pending.active&&record.pending.readOnly&&!record.pending.disabled&&record.pendingValueAfterKeys===record.field.value&&record.failed.active&&!record.failed.disabled&&counts===1&&record.sameFormData&&record.priorDisabledReadonlyRestored);
   await p.screenshot({path:dest+`/crops/${stage}-${engine}-${width}-t${text}-${kind}-failed.png`});
  }catch(e){record.error=e.stack;record.pass=false;}finally{release?.();await c.close();results.push(record);await writeFile(dest+'/'+stage+'.json',JSON.stringify(results,null,2));console.log(JSON.stringify({stage,engine,width,text,kind,pass:record.pass,pending:record.pending,failed:record.failed,count:counts,error:record.error?.slice(0,100)}));}
 }
 }finally{await browser.close();}
}
console.log(`${stage} ${results.filter(x=>x.pass).length}/${results.length}`);process.exitCode=results.every(x=>x.pass)?0:1;
