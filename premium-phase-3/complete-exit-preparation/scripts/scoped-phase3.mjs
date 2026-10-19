// Browser harness only. Registration is inert until the coordinator runs verify.mjs.
// Uses real read fixtures; all acknowledgement/withdrawal POSTs are held and
// answered here, never continued to the application server.
export function registerScopedCases(h) {
  const {register,go,hold,pending,check,evidence,assertRevealed,until,hydrated,buttonData,wait} = h;
  const sizes = [[390,844,100],[320,844,200]];

  async function firstUpdate(page,row) {
    await go(page,row,'/app/updates');
    const first = page.locator('a.updates-row').first();
    await first.waitFor();
    const href = await first.getAttribute('href');
    if (!href || !/^\/app\/updates\/[^/?#]+$/.test(href)) throw Error('No real seeded update detail link');
    row.fixtureUpdatePath = href;
    await go(page,row,href);
    await page.locator('article[data-update-revision]').waitFor();
    return href;
  }

  async function finish401(page,row,gate,label) {
    const response=page.waitForResponse(r=>new URL(r.url()).pathname===gate.entries[0].path&&r.request().method()==='POST');
    await gate.release(0,401,{});
    const actual=await response;row.mockedCommandStatus=actual.status();
    check(row,actual.status()===401,label+': actual intercepted command response was401');
    const panel=page.locator('main .nv-content > section.nv-card[aria-busy]');
    await until(async()=>await page.locator('article[data-update-revision]').count()===0&&await panel.count()>0&&await panel.getAttribute('aria-busy')!=='true',label+'401 did not settle to an actual update state');
    await wait(200);
    const signIn = panel.locator('a[href="/login"]').first();
    const count=await signIn.count();
    check(row,count===1,label+'401 offers actual Sign in after the confirmed response');
    const state = count?await assertRevealed(page,row,signIn,label+'-401'):await evidence(page,row,label+'-401-missing-signin');
    check(row,/Your session ended/.test(state.text ?? ''),label+'401 preserves ended-session copy');
    check(row,!/Access changed/.test(state.text ?? ''),label+'401 stays distinct from403');
    check(row,await page.locator('article[data-update-revision]').count()===0,label+'401 clears private update content');
    check(row,gate.count===1,label+'401 had exactly one held business command');
    row.operations=gate.summary();
  }

  register('scoped-p3-ack401-focus',['IS-B12','IS-79'],async({page,row})=>{
    await firstUpdate(page,row);
    const review = page.getByRole('checkbox',{name:'I have reviewed this update',exact:true});
    await hydrated(review,'onChange');
    await review.check();
    const gate = await hold(page,r=>r.method()==='POST'&&new URL(r.url()).pathname==='/api/employee/communications');
    const button = page.locator('section[aria-label="Your review status"] button[data-kind="primary"]');
    await pending(page,row,gate,button,'ack');
    check(row,gate.entries[0].body?.kind==='ACKNOWLEDGE','Held employee command is ACKNOWLEDGE');
    await finish401(page,row,gate,'ack');
  },{accounts:['AUDIT-E'],sizes});

  register('scoped-p3-withdraw401-focus',['IS-B12'],async({page,row})=>{
    await firstUpdate(page,row);
    const open = page.getByRole('button',{name:'Withdraw update',exact:true});
    await open.waitFor();
    await hydrated(open,'onClick');
    await open.click();
    const button=page.locator('.wb-confirm button[data-kind="danger"]');
    await button.waitFor();
    await hydrated(button,'onClick');
    const gate = await hold(page,r=>r.method()==='POST'&&new URL(r.url()).pathname==='/api/manager/communications');
    await pending(page,row,gate,button,'withdraw');
    check(row,gate.entries[0].body?.kind==='WITHDRAW','Held manager command is WITHDRAW');
    await finish401(page,row,gate,'withdraw');
  },{accounts:['AUDIT-M'],sizes});

  register('scoped-p3-payroll-settings-read-retry',['IS-B12'],async({page,row})=>{
    let fail=true,reads=0,successfulReads=0;
    await page.route('**/api/payroll/settings',async route=>{
      if(route.request().method()!=='GET')return route.fallback();
      reads++;
      if(fail)return route.fulfill({status:503,contentType:'application/json',body:'{}'});
      successfulReads++;
      return route.fallback();
    });
    await go(page,row,'/app/settings/payroll');
    const retry = page.locator('.pw-state-error').getByRole('button',{name:'Try again',exact:true});
    await retry.waitFor();
    await hydrated(retry,'onClick');
    await evidence(page,row,'read-503');
    fail=false;
    const fresh=page.waitForResponse(r=>new URL(r.url()).pathname==='/api/payroll/settings'&&r.request().method()==='GET');
    await retry.focus();
    await page.keyboard.press('Enter');
    row.recoveryReadStatus=(await fresh).status();
    check(row,row.recoveryReadStatus===200,'Payroll settings retry received an actual successful fresh read');
    const heading = page.getByRole('heading',{name:'Company defaults',exact:true});
    await heading.waitFor();
    await wait(200);
    await assertRevealed(page,row,heading,'ready-after-read-retry');
    check(row,reads>=2&&successfulReads>=1,'Settings retry performs a fresh successful real read',{reads,successfulReads});
    check(row,await page.locator('.pw-state-error').count()===0,'Settings failed-read panel is removed after recovery');
    check(row,await page.getByLabel('Company name on documents',{exact:true}).isVisible(),'Recovered settings contain actual configuration control');
    row.settingsReadCounts={reads,successfulReads};
  },{accounts:['QAOWNER'],sizes});

  register('scoped-p3-updates-list-read-status',['IS-RC-UPDATES-AUTH-01','P3-WR-14'],async({page,row})=>{
    const status=Number(row.variant),mode=row.account==='AUDIT-M'?'manager':'employee';
    let reads=0;const responses=[];
    page.on('response',r=>{if(new URL(r.url()).pathname==='/api/'+mode+'/communications'&&r.request().method()==='GET')responses.push(r.status());});
    await page.route('**/api/'+mode+'/communications',route=>{
      if(route.request().method()!=='GET')return route.fallback();
      reads++;
      return route.fulfill({status,contentType:'application/json',body:'{}'});
    });
    await go(page,row,'/app/updates');
    const title=page.locator('.updates-empty h2');
    const expected=status===401?'Your session ended':status===403?'Access changed':'Couldn’t load updates';
    await until(async()=>responses.length>0&&await title.count()>0&&await page.locator('.updates-inbox').getAttribute('aria-busy')==='false','Updates list did not settle after its actual mocked read');
    check(row,(await title.textContent())===expected,'Updates list renders truthful '+status+' state in '+mode+' mode',{expected,actual:await title.textContent(),responses});
    check(row,reads>0&&responses.includes(status),'Actual browser-local list read status was exercised',{status,mode,reads,responses});
    check(row,await page.locator('a.updates-row').count()===0,'Failed/auth list read exposes no private update rows');
    const counts=await page.locator('.updates-filter-count').allTextContents();
    check(row,counts.every(s=>s==='–'),'Failed/auth list read clears private filter counts',counts);
    if(status===401||status===403){
      const signIn=page.locator('.updates-empty a[href="/login"]');
      const count=await signIn.count();check(row,count===1,'Auth list read offers real Sign in after confirmed HTTP status');
      if(count){check(row,await signIn.getAttribute('data-kind')==='primary','Auth recovery uses primary kit Sign in');check(row,(await signIn.boundingBox())?.height>=51,'Auth recovery has at least52px control height');}
      check(row,await page.locator('.updates-toolbar > button').count()===0,'Auth state hides redundant toolbar Refresh');
      check(row,!await page.getByRole('heading',{name:status===401?'Access changed':'Your session ended',exact:true}).count(),'401 and403 wording stay distinct');
    }else{
      const retry=page.locator('.updates-toolbar').getByRole('button',{name:'Try again',exact:true});
      const count=await retry.count();check(row,count===1,'503 list read offers actual Try again');
      if(count){check(row,await retry.getAttribute('data-kind')==='primary','503 retry uses primary kit role');check(row,await retry.locator('svg').count()>0,'503 retry includes refresh icon');}
      check(row,await page.locator('.updates-empty a[href="/login"]').count()===0,'503 remains a read failure rather than sign-out');
    }
    await evidence(page,row,'read-'+status);
    row.mockedRead={status,mode,reads};
  },{accounts:['AUDIT-E','AUDIT-M'],sizes,variants:['401','403','503']});

  async function atoms(locator){
    return locator.evaluate(e=>{
      const result=[],walker=document.createTreeWalker(e,NodeFilter.SHOW_TEXT);
      for(let node=walker.nextNode();node;node=walker.nextNode()){
        const text=node.textContent??'';
        for(const match of text.matchAll(/\S*\u00a0\S*(?:\u00a0\S*)*/g)){
          const range=document.createRange();range.setStart(node,match.index);range.setEnd(node,match.index+match[0].length);
          const rects=[...range.getClientRects()].filter(r=>r.width&&r.height).map(r=>r.toJSON());
          result.push({text:match[0],rects,lines:[...new Set(rects.map(r=>Math.round(r.top)))]});
        }
      }
      return {text:e.textContent,box:e.getBoundingClientRect().toJSON(),atoms:result};
    });
  }
  function checkAtoms(row,data,label){
    check(row,data.atoms.length>0,label+': real date/time text contains whole tokens',data);
    check(row,data.atoms.every(a=>a.lines.length===1),label+': each whole date/time token stays on one line',data);
  }
  const metadataSizes=[[320,844,200],[1440,900,100]];
  register('scoped-p3-roster-timezone-date',['TC-P3-24','TC-P3-09','TC-P3-30'],async({page,row})=>{
    await go(page,row,'/app/schedule?week='+h.fixtureWeek);
    await page.locator('.mws-result-summary').waitFor();
    const timezone=page.locator(row.width<761?'.mws-timezone-compact':'.mws-timezone-full');
    await timezone.waitFor({state:'visible'});
    const zoneText=await timezone.innerText();
    check(row,/^Times in .+ time(?:\.|$)/.test(zoneText),'Roster uses the shared person-facing business-timezone wording',{zoneText});
    const day=page.locator('.mws-day-navigation > button').nth(1);
    await hydrated(day,'onClick');
    await day.click();
    const summary=page.locator('.mws-result-summary');
    await until(async()=>!/Full week/.test(await summary.innerText()),'Roster did not enter a real selected day');
    checkAtoms(row,await atoms(summary),'Selected roster date');
    await evidence(page,row,'selected-day');
  },{accounts:['AUDIT-M'],sizes:metadataSizes});

  register('scoped-p3-availability-date-values',['TC-P3-09'],async({page,row})=>{
    const next=new Date(h.fixtureWeek+'T12:00:00Z');next.setUTCDate(next.getUTCDate()+7);
    await go(page,row,'/app/availability?week='+next.toISOString().slice(0,10));
    const week=page.locator('.av-week-context strong'),updated=page.locator('.av-submission-detail small');
    await week.waitFor();
    await updated.waitFor(); // Requires the genuine seed-extra weekly submission; never invent one here.
    checkAtoms(row,await atoms(week),'Availability specific-week context');
    checkAtoms(row,await atoms(updated),'Availability Last updated');
    await evidence(page,row,'submitted-week');
  },{accounts:['AUDIT-E'],sizes:metadataSizes});

  register('scoped-p3-inbox-shift-metadata',['P3-WR-11'],async({page,row})=>{
    await go(page,row,'/app/inbox');
    const shiftRow=page.locator('#missed-punches .inbox-row a.nv-row').filter({has:page.locator('span.nv-row__meta > span')}).filter({hasText:/Not clocked in|No clock.in/i}).first();
    await shiftRow.waitFor(); // A real Today no-clock-in row is an explicit prerequisite.
    const meta=shiftRow.locator('.nv-row__meta > span').first();
    check(row,!await meta.evaluate(e=>e.classList.contains('nv-nowrap')),'Inbox real ShiftRow removes the whole-range nowrap wrapper');
    const data=await atoms(meta);
    checkAtoms(row,data,'Inbox ShiftRow individual time');
    const geometry=await meta.evaluate(e=>{
      const row=e.closest('a.nv-row'),text=row.querySelector('.nv-row__text'),limit=text.getBoundingClientRect(),walker=document.createTreeWalker(e,NodeFilter.SHOW_TEXT),rects=[];
      for(let node=walker.nextNode();node;node=walker.nextNode())for(let i=0;i<(node.textContent??'').length;i++){
        if(/\s/.test(node.textContent[i]))continue;
        const range=document.createRange();range.setStart(node,i);range.setEnd(node,i+1);for(const r of range.getClientRects())if(r.width&&r.height)rects.push(r.toJSON());
      }
      return {text:e.textContent,limit:limit.toJSON(),outside:rects.filter(r=>r.left<limit.left-1||r.right>limit.right+1)};
    });
    check(row,geometry.outside.length===0,'Inbox ShiftRow rendered time glyphs remain inside row text column',geometry);
    await evidence(page,row,'real-shift-row');
  },{accounts:['AUDIT-M'],sizes:metadataSizes});

  register('scoped-p3-kit-status',['P3-WR-12'],async({page,row})=>{
    async function status(path,selector,text,label){
      await go(page,row,path);
      await page.getByText(text,{exact:true}).first().waitFor(); // Genuine ready fixture state, regardless of old/new markup.
      const target=page.locator(selector).filter({hasText:text}).first();
      const count=await target.count();check(row,count===1,label+': existing state uses shared kit Status markup');
      if(!count){await evidence(page,row,label+'-non-kit-state');return;}
      const data=await target.evaluate(e=>({text:e.textContent,tone:e.getAttribute('data-tone'),glyphs:e.querySelectorAll('svg[aria-hidden="true"]').length,box:e.getBoundingClientRect().toJSON(),font:getComputedStyle(e).font,fill:getComputedStyle(e).backgroundColor}));
      check(row,data.glyphs===1,label+': shared Status renders exactly one decorative kit glyph',data);
      check(row,data.box.height>=27,label+': shared Status has at least28px height',data);
      check(row,data.box.x>=-1&&data.box.right<=row.width+1,label+': Status stays inside viewport',data);
      await evidence(page,row,label);
    }
    await status('/app','.premium-employee-home .nv-status[data-tone="review"]','Review needed','home-review');
    const offClock=page.locator('.premium-employee-home .nv-status[data-tone="neutral"]').filter({hasText:'Off clock'}).first();
    await page.getByText('Off clock',{exact:true}).first().waitFor();
    check(row,await offClock.count()===1&&await offClock.locator('svg[aria-hidden="true"]').count()===1,'Home Off clock uses the neutral kit glyph');
    await status('/app/updates','.updates-row .nv-status[data-tone="review"]','Review needed','updates-review');
    await status('/app/timecards','.nv-status[data-tone="neutral"]','Draft','timecards-draft');
    await status('/app/my-time','.employee-time-current-heading .nv-status[data-tone="neutral"]','Off clock','mytime-offclock');
  },{accounts:['AUDIT-E'],sizes});

  register('scoped-p3-confirmation-tile',['AL-P3-13'],async({page,row})=>{
    await go(page,row,'/app/schedule?week='+h.fixtureWeek);
    const card=page.locator('.my-schedule-review'),tile=card.locator('.my-review-icon'),copy=card.locator('.my-review-copy');
    await card.waitFor();
    const boxes={card:await card.boundingBox(),tile:await tile.boundingBox(),copy:await copy.boundingBox()};
    check(row,Math.abs(boxes.tile.width-40)<=1&&Math.abs(boxes.tile.height-40)<=1,'Confirmation uses actual40px tile box',boxes);
    check(row,Math.abs(boxes.tile.y-boxes.copy.y)<=1,'Confirmation tile aligns with the start of the copy block',boxes);
    check(row,Math.abs(boxes.copy.x-boxes.card.x-72)<=1,'Confirmation text follows20px inset+40px tile+12px gap',boxes);
    await evidence(page,row,'confirmation-card');
  },{accounts:['AUDIT-E'],sizes});

  register('scoped-p3-availability-landscape-inset',['AL-P3-31'],async({page,row})=>{
    const next=new Date(h.fixtureWeek+'T12:00:00Z');next.setUTCDate(next.getUTCDate()+7);
    await go(page,row,'/app/availability?week='+next.toISOString().slice(0,10));
    const parts=page.locator('.av-week-panel > .av-week-context,.av-week-panel > .av-deadline,.av-week-panel > .av-submission-detail');
    await parts.first().waitFor();
    const data=await parts.evaluateAll(elements=>elements.map(e=>{const s=getComputedStyle(e);return {class:e.className,padding:[s.paddingTop,s.paddingRight,s.paddingBottom,s.paddingLeft].map(parseFloat),box:e.getBoundingClientRect().toJSON()};}));
    check(row,data.length>=2,'Real specific-week context and deadline sections rendered',data);
    for(const part of data)check(row,part.padding.every(n=>Math.abs(n-20)<=.1),'Landscape section keeps20px on all four sides',part);
    await evidence(page,row,'specific-week-landscape');
  },{accounts:['AUDIT-E'],sizes:[[844,390,100],[844,390,200]]});

  register('scoped-p3-placeholder-first-block',['P3-ST-25'],async({page,row})=>{
    // Warm the actual route before the fixture-only, bounded read lock; do not change source timing.
    await go(page,row,'/app/schedule');
    await page.addInitScript(text=>{
      const apply=()=>{if(document.documentElement){document.documentElement.style.fontSize=text+'%';return true;}return false;};
      if(!apply()){const observer=new MutationObserver(()=>{if(apply())observer.disconnect();});observer.observe(document,{childList:true,subtree:true});}
    },row.text);
    const trace=await h.withOwnedReadBarrier({table:'shifts',reason:'P3-ST-25 actual Schedule loading first-block geometry'},async barrier=>{
      let navigation;
      try{
        navigation=page.goto(h.baseUrl+'/app/schedule?week='+h.fixtureWeek,{waitUntil:'load',timeout:60000});
        const skeleton=page.locator('.route-skeleton[data-route="schedule"][data-band]');
        await skeleton.waitFor({state:'visible',timeout:3500});
        const data=await skeleton.evaluate(e=>{const band=e.querySelector('.route-skeleton-band'),first=e.querySelector('.route-skeleton-header + *');return {kind:e.getAttribute('data-band'),band:band.getBoundingClientRect().toJSON(),first:first.getBoundingClientRect().toJSON(),gap:getComputedStyle(e).rowGap,firstMargin:getComputedStyle(first).marginTop,textStep:document.documentElement.dataset.textStep};});
        const expected=row.account==='AUDIT-E'?16:-72;
        check(row,Math.abs(data.first.y-data.band.bottom-expected)<=1,'First visible placeholder starts at the real page overlap/flat offset',{...data,expected});
        await evidence(page,row,'held-loading-first-block');
        return {geometry:data,events:barrier.events};
      }finally{await barrier.release();if(navigation)await navigation;}
    });
    row.ownedReadBarrier=trace;
  },{accounts:['AUDIT-E','AUDIT-M'],sizes});

  register('scoped-p3-recovery-primary',['P3-WR-14'],async({page,row})=>{
    const variants={
      home401:{path:'/app',api:'/api/employee/home',status:401,selector:'.premium-employee-home a[href="/login"]'},
      notifications401:{path:'/app/notifications',api:'/api/employee/notifications',status:401,selector:'main a[href="/login"]'},
      timecards401:{path:'/app/timecards',api:'/api/timecards',status:401,selector:'main a[href="/login"]'},
      timecards503:{path:'/app/timecards',api:'/api/timecards',status:503,selector:'button[aria-label="Try again to load timecards"]'},
      'my-pay503':{path:'/app/my-pay',api:'/api/payroll/statements',status:503,selector:'.pw-state-error button.pw-button'},
    };
    const test=variants[row.variant];let reads=0;const responses=[];
    page.on('response',r=>{if(new URL(r.url()).pathname===test.api)responses.push(r.status());});
    await page.route('**'+test.api,route=>{
      const request=route.request();
      if(test.api==='/api/timecards'){
        let body;try{body=request.postDataJSON();}catch{return route.fallback();}
        if(request.method()!=='POST'||!body||Object.keys(body).length!==2||!('startDate'in body)||!('endDate'in body))return route.fallback();
      }else if(request.method()!=='GET')return route.fallback();
      reads++;return route.fulfill({status:test.status,contentType:'application/json',body:'{}'});
    });
    await go(page,row,test.path);
    await until(async()=>responses.includes(test.status)&&/session|sign in|couldn.t|unavailable|ended|access changed/i.test(await page.locator('main').innerText()),'The actual mocked read did not settle to a visible failure/auth state');
    await wait(200);
    const control=page.locator(test.selector).first(),count=await control.count();
    check(row,count===1,'Settled failure/auth state exposes the intended recovery control',{variant:row.variant,responses});
    if(!count){await evidence(page,row,row.variant+'-missing-recovery');row.mockedRead={status:test.status,path:test.api,reads,responses};return;}
    const data=await buttonData(control);
    check(row,reads>0,'The intended read failure/auth status was browser-local',{variant:row.variant,reads});
    check(row,data.box.height>=51,'Recovery control has at least52px height',data);
    check(row,data.background!=='rgb(255, 255, 255)'&&data.background!=='rgba(0, 0, 0, 0)','Recovery control uses a filled primary surface',data);
    if(test.status===503)check(row,await control.locator('svg').count()>0,'Read retry has its refresh glyph');
    if(row.variant==='home401')check(row,await page.locator('.premium-employee-home a[href="/login"]').count()===1,'Home401 has one primary Sign in without a duplicate compact clock Sign in');
    if(row.variant==='timecards401')check(row,await page.locator('button[aria-label="Refresh timecards"]').count()===0,'Timecards401 hides redundant Refresh');
    await evidence(page,row,row.variant);
    row.mockedRead={status:test.status,path:test.api,reads,responses};
  },{accounts:['AUDIT-E'],sizes,variants:['home401','notifications401','timecards401','timecards503','my-pay503']});
}
