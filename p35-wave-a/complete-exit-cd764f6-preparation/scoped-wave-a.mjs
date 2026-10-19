/** External, preparation-only scoped regressions. Never submits a business write.
 * Existing verify.mjs cases stay unchanged; coordinator opts into this registry.
 * Coverage requires an externally ownership-verified read barrier. No fake markup.
 */
export function registerScopedCases(h) {
  const {register,go,hold,action,check,evidence,until,wait,hydrated}=h;
  const sizes=[[390,844,100],[320,844,200],[1440,900,100],[844,390,100]];
  const managerAccounts=['QAOWNER','AUDIT-M'];

  async function nameAndDescription(page,row,selector,role,label,description) {
    const control=page.locator(selector);
    await control.waitFor({state:'visible'});
    check(row,await page.getByRole(role,{name:label,exact:true}).count()===1,label+': accessible name is exactly label words');
    const relation=await control.evaluate(e=>{
      const words=s=>(s??'').trim().replace(/\s+/g,' ');
      const resolve=name=>(e.getAttribute(name)??'').trim().split(/\s+/).filter(Boolean).map(id=>({id,count:document.querySelectorAll('[id]').length?Array.from(document.querySelectorAll('[id]')).filter(n=>n.id===id).length:0,text:words(document.getElementById(id)?.textContent)}));
      return{id:e.id,name:e.getAttribute('name'),labelledby:resolve('aria-labelledby'),describedby:resolve('aria-describedby'),required:e.required,disabled:e.disabled,value:e.value,labels:Array.from(e.labels??[]).map(n=>words(n.textContent)),options:e instanceof HTMLSelectElement?Array.from(e.options).map(o=>({value:o.value,label:o.label,selected:o.selected,disabled:o.disabled})):undefined};
    });
    row.fieldProofs??=[];
    const snapshot=typeof control.ariaSnapshot==='function'?await control.ariaSnapshot():null;
    row.fieldProofs.push({label,role,relation,ariaSnapshot:snapshot,descriptionProof:'Actual browser DOM aria-describedby references and referenced text; not a screen-reader session'});
    if(role==='combobox'){
      check(row,relation.labelledby.length===1&&relation.labelledby[0].count===1&&relation.labelledby[0].text===label,label+': unique explicit label reference');
      check(row,relation.options?.filter(o=>o.selected).length===1,label+': one authoritative native selected option',relation.options);
    }
    for(const ref of relation.describedby)check(row,ref.count===1,label+': help reference resolves uniquely',ref);
    const actualDescription=relation.describedby.map(r=>r.text).join(' ');
    if(description!==undefined)check(row,actualDescription===description,label+': description is the help once',{expected:description,actual:actualDescription});
    if(snapshot)check(row,!/Optional/.test(snapshot.split('\n')[0]),label+': Optional omitted from accessible name',{firstLine:snapshot.split('\n')[0]});
    // The original shared label deliberately remains clickable, including its hint.
    if(role==='combobox'){
      const labelWords=control.locator('xpath=ancestor::label[1]').locator('.nevora-field-label');
      await labelWords.click();
      check(row,await control.evaluate(e=>document.activeElement===e),label+': clicking label focuses native select');
      await page.keyboard.press('Escape');
      const hint=control.locator('xpath=ancestor::label[1]').locator('.nevora-field-hint');
      if(await hint.count()){
        await hint.click();
        check(row,await control.evaluate(e=>document.activeElement===e),label+': clicking hint retains native label behavior');
        await page.keyboard.press('Escape');
      }
      const initial=relation.value;
      if(!relation.options.find(o=>o.value===initial)?.disabled)await control.selectOption(initial);
      check(row,await control.inputValue()===initial,label+': current selected value is preserved');
      const after=await control.evaluate(e=>Array.from(e.options).map(o=>({value:o.value,disabled:o.disabled})));
      check(row,JSON.stringify(after)===JSON.stringify(relation.options.map(({value,disabled})=>({value,disabled}))),label+': disabled/inactive option semantics preserved');
    }
    return control;
  }

  register('scoped-wa-new-employee-names',['IS-WA-12'],async({page,row})=>{
    const gate=await hold(page,action);
    await go(page,row,'/app/employees/new');
    await nameAndDescription(page,row,'input[name=id]','textbox','Employee ID','Unique. They use it to sign in.');
    await nameAndDescription(page,row,'input[name=phone]','textbox','Phone','They confirm it when they activate their account.');
    const email=await nameAndDescription(page,row,'input[name=email]','textbox','Email','');
    check(row,await email.evaluate(e=>!e.required),'Email remains optional');
    await nameAndDescription(page,row,'select[name=role]','combobox','Access role','What they can do in the app. Separate from job qualifications.');
    await nameAndDescription(page,row,'select[name=primaryLocationId]','combobox','Primary location','They can always be scheduled here.');
    const primary=page.locator('select[name=primaryLocationId]');
    const choices=await primary.locator('option').evaluateAll(es=>es.filter(e=>e.value&&!e.disabled).map(e=>e.value));
    if(!choices.length)throw Error('Fixture has no active primary location; this is not an admissible positive field case');
    await primary.selectOption(choices[0]);
    check(row,await primary.inputValue()===choices[0],'Native required primary select accepts active option');
    await evidence(page,row,'field-names');
    row.operations=gate.summary();
    check(row,gate.count===0,'Name/description review does not submit employee creation');
  },{accounts:managerAccounts,sizes});

  register('scoped-wa-member-names',['IS-WA-12'],async({page,row})=>{
    const gate=await hold(page,action);
    await go(page,row,'/app/employees/AUDIT-E');
    await nameAndDescription(page,row,'select[name=role]','combobox','Access role','');
    const primary=page.locator('select[name=primaryLocationId]');
    const described=await primary.getAttribute('aria-describedby');
    // Normal AUDIT-E is active at loc-1. A special inactive-location fixture must
    // declare itself rather than make this baseline silently skip its contract.
    check(row,!described,'Baseline employee has active primary location and no reactivation hint');
    await nameAndDescription(page,row,'select[name=primaryLocationId]','combobox','Primary location','');
    const status=await nameAndDescription(page,row,'select[name=active]','combobox','Status','Deactivation signs this employee out immediately. Reactivation requires a fresh sign-in. History is preserved.');
    const initial=await status.inputValue();
    await status.selectOption(initial==='true'?'false':'true');
    check(row,await status.inputValue()!==initial,'Status changes only the native editable draft');
    await status.selectOption(initial);
    await nameAndDescription(page,row,'input[name=email]','textbox','Email','');
    await evidence(page,row,'field-names');
    row.operations=gate.summary();
    check(row,gate.count===0,'Status draft inspection sends no employee update');
  },{accounts:managerAccounts,sizes});

  register('scoped-wa-callout-names',['IS-WA-12'],async({page,row})=>{
    const gate=await hold(page,action);
    await go(page,row,'/app/exchange/callout?shiftId=audit-next-0-1');
    const reason=await nameAndDescription(page,row,'select[name=reasonCode]','combobox','Reason','Choose the closest match.');
    await hydrated(reason,'onChange');
    const details=await nameAndDescription(page,row,'textarea[name=reasonNote]','textbox','More details','Share only what your manager needs to review it.');
    check(row,!await details.evaluate(e=>e.required),'More details begins optional');
    await reason.selectOption('ILLNESS');
    check(row,await reason.inputValue()==='ILLNESS','Controlled reason accepts a real choice');
    await reason.selectOption('OTHER');
    await until(()=>details.evaluate(e=>e.required),'Other reason did not make details required');
    await nameAndDescription(page,row,'textarea[name=reasonNote]','textbox','More details','For Other, add at least 3 characters. Share only what your manager needs.');
    await details.fill('Fictional local draft only');
    check(row,await page.getByRole('textbox',{name:'More details',exact:true}).count()===1,'Character-count update stays outside More details name');
    await reason.selectOption('ILLNESS');
    await until(()=>details.evaluate(e=>!e.required),'Changing away from Other did not restore optional state');
    await nameAndDescription(page,row,'textarea[name=reasonNote]','textbox','More details','Share only what your manager needs to review it.');
    await evidence(page,row,'field-names');
    row.operations=gate.summary();
    check(row,gate.count===0,'Callout label review sends no report');
  },{accounts:['AUDIT-E'],sizes});

  register('scoped-wa-coverage-loading',['ST-WA-1','IS-WA-5'],async({page,context,row})=>{
    const gate=await hold(page,action);
    // Derive date/week from a real existing shift rather than a guessed clock.
    await go(page,row,'/app/schedule/edit?shiftId=audit-next-0-1');
    const date=page.locator('input[name=date]');
    const when=await date.inputValue(),week=await date.getAttribute('min');
    if(!/^\d{4}-\d{2}-\d{2}$/.test(when)||!/^\d{4}-\d{2}-\d{2}$/.test(week??''))throw Error('Existing shift did not supply valid Coverage date/week');
    const path='/app/schedule/coverage?'+new URLSearchParams({week,date:when,locationId:'loc-1',start:'08:00',end:'16:00'});
    row.coverageHref=path;
    if(typeof h.withOwnedReadBarrier!=='function')throw Error('Missing ownership-verified shifts read barrier; real held Coverage loading has not been measured');
    // Compile/load this exact valid route before the short PostgreSQL lock.
    await go(page,row,path);
    await until(()=>page.locator('.wa-coverage').isVisible(),'Warm Coverage did not reach actual ready UI');
    await page.addInitScript(text=>{
      window.__scopedWaLoading=[];
      const capture=()=>{
        if(document.documentElement)document.documentElement.style.fontSize=text+'%';
        const e=document.querySelector('.route-skeleton');
        if(!e)return;const band=e.querySelector('.route-skeleton-band'),r=e.getBoundingClientRect(),s=getComputedStyle(e);
        if(!r.width||!r.height||s.display==='none'||s.visibility==='hidden')return;
        const b=band?.getBoundingClientRect(),item={at:performance.now(),text:e.textContent.trim(),route:e.dataset.route,shape:e.dataset.shape,bandHeight:b?.height,bandDisplay:band?getComputedStyle(band).display:null,bandToken:s.getPropertyValue('--route-band').trim(),textScale:getComputedStyle(document.documentElement).getPropertyValue('--nv-text-scale').trim(),textStep:document.documentElement.dataset.textStep,rootFontSize:getComputedStyle(document.documentElement).fontSize};
        const rows=window.__scopedWaLoading;if(rows.length<40&&JSON.stringify(rows.at(-1)&&{...rows.at(-1),at:0})!==JSON.stringify({...item,at:0}))rows.push(item);
      };
      new MutationObserver(capture).observe(document,{childList:true,subtree:true});
      document.addEventListener('DOMContentLoaded',capture,{once:true});
      const end=performance.now()+8000;const frame=()=>{capture();if(performance.now()<end)requestAnimationFrame(frame);};requestAnimationFrame(frame);
    },row.text);
    await h.withOwnedReadBarrier({table:'shifts',reason:'ST-WA-1 Coverage loading',page,context,row},async barrier=>{
      row.readBarrier=barrier.events;
      let navigationError;
      const navigation=page.reload({waitUntil:'commit',timeout:60000}).catch(error=>{navigationError=error;});
      try{
        await navigation;if(navigationError)throw navigationError;
        // The owned transport has a 5s SQL timeout: never wait20s while holding it.
        const skeleton=page.locator('.route-skeleton');
        await until(()=>skeleton.isVisible(),'Real Coverage loading skeleton did not stream under read barrier',3000);
        if(!barrier.isHeld||barrier.releasedBy)throw Error('Owned read barrier auto-released before loading capture; setup incomplete');
        await page.evaluate(text=>{document.documentElement.style.fontSize=text+'%';},row.text);
        await wait(50);
        if(row.text===200)await until(()=>page.evaluate(()=>{const root=document.documentElement,s=getComputedStyle(root);return Math.abs(parseFloat(s.getPropertyValue('--nv-text-scale'))-2)<.01&&root.dataset.textStep==='200'&&Math.abs(parseFloat(s.fontSize)-32)<.1;}),'TextScaleBridge did not reach actual2/200 before held loading capture; setup incomplete',750);
        if(!barrier.isHeld||barrier.releasedBy)throw Error('Owned read barrier ended before confirmed text-scale loading capture; setup incomplete');
        row.loading=await skeleton.evaluate(e=>{
          const band=e.querySelector('.route-skeleton-band'),s=getComputedStyle(e),bs=band?getComputedStyle(band):null;
          return{path:location.pathname,route:e.dataset.route,shape:e.dataset.shape,busy:e.getAttribute('aria-busy'),role:e.getAttribute('role'),text:e.textContent.trim(),cards:e.querySelectorAll('.route-skeleton-cards>i').length,grid:e.querySelectorAll('.route-skeleton-grid>i').length,band:band?.getBoundingClientRect().toJSON(),bandDisplay:bs?.display,bandToken:s.getPropertyValue('--route-band').trim(),bandGrow:s.getPropertyValue('--route-band-grow').trim(),textScale:s.getPropertyValue('--nv-text-scale').trim(),textStep:document.documentElement.dataset.textStep,rootFontSize:getComputedStyle(document.documentElement).fontSize,coarse:matchMedia('(pointer:coarse)').matches,landscape:matchMedia('(orientation:landscape)').matches,documentWidth:document.documentElement.scrollWidth};
        });
        check(row,row.loading.path==='/app/schedule/coverage','Loading state belongs to actual Coverage route');
        check(row,row.loading.route==='wa-coverage','Actual Coverage loading uses its own route selector',row.loading);
        check(row,row.loading.role==='status'&&row.loading.busy==='true','Coverage loading announces busy status');
        check(row,/Loading coverage…/.test(row.loading.text)&&!/Loading schedule/.test(row.loading.text),'Coverage loading announces its own route');
        check(row,row.loading.shape==='cards'&&row.loading.cards===4&&row.loading.grid===0,'Coverage loading uses cards and no Schedule week grid');
        const landscape=row.width===844&&row.height===390;
        const base=landscape?228:312;
        check(row,row.loading.bandToken===base+'px','Coverage loading selects correct per-width band token',row.loading);
        if(row.width===1440)check(row,row.loading.bandDisplay==='none','Desktop retains hidden mobile loading band',row.loading);
        else if(row.text===100)check(row,Math.abs((row.loading.band?.height??0)-base)<=1,'Actual visible loading band matches measured phone/landscape height',row.loading);
        else check(row,row.loading.bandDisplay!=='none'&&(row.loading.band?.height??0)>=base-1,'Large-text loading band remains visible and honors minimum base height',row.loading);
        if(row.text===200)check(row,Math.abs(parseFloat(row.loading.textScale)-2)<.01&&row.loading.textStep==='200'&&Math.abs(parseFloat(row.loading.rootFontSize)-32)<.1,'200% loading metrics record actual2/200 bridge and32px root font',row.loading);
        if(landscape)check(row,row.loading.coarse&&row.loading.landscape,'Landscape case really has coarse pointer and landscape media conditions');
        if(typeof skeleton.ariaSnapshot==='function')row.loadingAriaSnapshot=await skeleton.ariaSnapshot();
        row.passiveLoading=await page.evaluate(()=>window.__scopedWaLoading??[]);
        check(row,row.passiveLoading.length>0,'Passive observer recorded actual emitted Coverage loading UI',row.passiveLoading);
        await evidence(page,row,'real-held-loading');
        if(!barrier.isHeld||barrier.releasedBy)throw Error('Owned read barrier auto-released before loading evidence finished; setup incomplete');
      }finally{
        // The wrapper must also release on any timeout/error; release is idempotent.
        await barrier.release();
        await navigation;
      }
      if(navigationError)throw navigationError;
    });
    await until(()=>page.locator('.wa-coverage').isVisible(),'Coverage did not resolve after owned read barrier release');
    check(row,new URL(page.url()).pathname==='/app/schedule/coverage','Real Coverage ready route follows loading');
    check(row,await page.locator('.route-skeleton').count()===0,'Loading placeholder is removed after real read');
    await evidence(page,row,'real-ready');
    row.operations=gate.summary();
    check(row,gate.count===0,'Coverage loading review sends no business write');
  },{accounts:managerAccounts,sizes:[[320,844,100],[390,844,100],[320,844,200],[1440,900,100],[844,390,100]]});
}
