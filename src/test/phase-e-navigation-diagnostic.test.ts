import {EventEmitter} from 'node:events';
import {resolve} from 'node:path';
import {expect,it,rs} from '@rstest/core';
const {observeBrowserCell}=await import(resolve('scripts/phase-e-browser-qa.mjs'));

async function fixture({verified=true,reloadVerified=false,sameUrl=false,engine='webkit',phase='scenario',pending=true,host='127.0.0.1:43210',path='/api/notifications',notificationOnly=false,requireWitness=false,routerReads=false}={}){
 let currentUrl='http://127.0.0.1:43210/app';
 const errors:unknown[]=[],execution={suite:'home',engine,width:390,status:'failed',navigationDiagnostics:[]},frame={url:()=>currentUrl};
 const binding=rs.fn();
 const context=Object.assign(new EventEmitter(),{exposeBinding:rs.fn(async(_name:string,fn:unknown)=>{binding.mockImplementation(fn as (...args:unknown[])=>unknown);}),addInitScript:rs.fn(async()=>{})});
 const page=Object.assign(new EventEmitter(),{url:()=>currentUrl,mainFrame:()=>frame});
 const cell=observeBrowserCell(execution,errors,{navigationDiagnosticVerified:verified,reloadDiagnosticVerified:reloadVerified,...(notificationOnly?{navigationReadKinds:['notification-read']}:{ }),requireNotificationGetWitness:requireWitness,routerReadsDuringNavigation:routerReads});await cell.observeContext(context,'primary');context.emit('page',page);cell.setPhase(phase);
 const destination=sameUrl?currentUrl:'http://127.0.0.1:43210/app/schedule';
 const request={isNavigationRequest:()=>true,resourceType:()=> 'document',method:()=> 'GET',frame:()=>frame,url:()=>destination};
 if(pending)page.emit('request',request);
 const error={name:'Fetch API cannot load http',message:'/'+host+path+' due to access control checks.'};
 // A real commit follows its navigation response (the tracker needs it to tell a commit from a source history update).
 const commit=(url=request.url(),navigation:unknown=request)=>{page.emit('response',{request:()=>navigation,status:()=>200});currentUrl=url;page.emit('framenavigated',frame);};
 const historyChange=(url:string)=>{currentUrl=url;page.emit('framenavigated',frame);};
 return {cell,context,page,errors,execution,error,frame,request,binding,commit,historyChange};
}
it('records the reproduced native refusal only during a pending owned document navigation',async()=>{
 const f=await fixture();f.page.emit('pageerror',f.error);f.cell.assertClean();
 expect(f.errors).toHaveLength(0);expect(f.execution.navigationDiagnostics).toHaveLength(1);expect(f.cell.isNavigationDiagnostic(f.error)).toBe(true);
 expect(f.execution.navigationDiagnostics[0]).toMatchObject({type:'navigation-fetch-diagnostic',diagnostic:{resourceKind:'notification-read'},pendingMainFrameNavigation:true});
 expect(JSON.stringify(f.execution.navigationDiagnostics)).not.toMatch(/PRIVATE|127\.0\.0\.1|43210|token=|https?:/);
 expect(f.context.exposeBinding).toHaveBeenCalledOnce();expect(f.context.addInitScript).toHaveBeenCalledOnce();
});
it.each([
 {verified:false},{engine:'chromium'},{pending:false},{phase:'context-close'},
 {host:'fictional.invalid'},{host:'127.0.0.1:43211'},{path:'/__nextjs_original-stack-frames'},{path:'/api/manager/communications'},{path:'/PRIVATE_ACTOR_TOKEN'},
 {path:'/api/employee/profile'},{path:'/app/api/push/status'},
 {path:'/api/manager/action-center?intent=PRIVATE_ACTOR_TOKEN'},{path:'/api/manager/unknown'},{path:'/api/manager/time-corrections'},
 {host:'PRIVATE_ACTOR_TOKEN@127.0.0.1:43210'},{path:'/api/notifications?token=PRIVATE_ACTOR_TOKEN'},{path:'/api/employee/home#PRIVATE_ACTOR_TOKEN'},{path:'/api/employee/requests?token=PRIVATE_ACTOR_TOKEN'},{path:'/api/employee/calendar-subscriptions?token=PRIVATE_ACTOR_TOKEN'},
])('keeps an unproven or live-document event fatal: %j',async options=>{
 const f=await fixture(options);f.page.emit('pageerror',f.error);expect(()=>f.cell.assertClean()).toThrow();expect(f.execution.navigationDiagnostics).toHaveLength(0);
});
it.each(['/api/employee/home','/api/employee/my-time','/api/employee/requests','/api/employee/calendar-subscriptions'])('recognizes only the observed static own-read path %s',async path=>{
 const f=await fixture({path});f.page.emit('pageerror',f.error);f.cell.assertClean();expect(f.execution.navigationDiagnostics).toHaveLength(1);
});
it.each(['/api/manager/today','/api/manager/action-center','/api/manager/clock-monitor'])('recognizes a proven exact Manager read path only before navigation commits: %s',async path=>{
 const f=await fixture({path});f.page.emit('pageerror',f.error);f.cell.assertClean();expect(f.execution.navigationDiagnostics).toHaveLength(1);
 f.commit();f.page.emit('pageerror',{...f.error});expect(()=>f.cell.assertClean()).toThrow();
 const unproven=await fixture({path,verified:false});unproven.page.emit('pageerror',unproven.error);expect(()=>unproven.cell.assertClean()).toThrow();
});
it('retires the classification boundary at document commit',async()=>{
 const f=await fixture();f.commit();f.page.emit('pageerror',f.error);expect(()=>f.cell.assertClean()).toThrow();expect(f.errors[0]).toMatchObject({pendingMainFrameNavigation:false,documentNavigation:{phase:'committed',ageMs:expect.any(Number)}});
});
it('records completion timing without permitting post-navigation errors',async()=>{
 const f=await fixture();f.commit();f.page.emit('domcontentloaded');f.page.emit('pageerror',f.error);
 expect(()=>f.cell.assertClean()).toThrow();expect(f.errors[0]).toMatchObject({pendingMainFrameNavigation:false,documentNavigation:{phase:'dom-ready',ageMs:expect.any(Number)}});
});
it('retires the classification boundary when the navigation fails',async()=>{
 const f=await fixture();f.page.emit('requestfailed',f.request);f.page.emit('pageerror',f.error);expect(()=>f.cell.assertClean()).toThrow();expect(f.errors[0]).toMatchObject({documentNavigation:{phase:'failed'}});
});
it('source-document history cannot commit a different pending destination',async()=>{
 const f=await fixture();f.page.emit('framenavigated',f.frame);f.page.emit('pageerror',f.error);f.cell.assertClean();
 expect(f.execution.navigationDiagnostics).toHaveLength(1);
 f.commit();f.page.emit('pageerror',{...f.error});expect(()=>f.cell.assertClean()).toThrow();
});
it('a finished navigation request cannot leave stale native-diagnostic eligibility',async()=>{
 const f=await fixture();f.page.emit('requestfinished',f.request);f.page.emit('pageerror',f.error);expect(()=>f.cell.assertClean()).toThrow();
});
it('same-URL navigation ambiguity stays fatal',async()=>{
 const f=await fixture({pending:false});f.page.emit('request',{...f.request,url:f.page.url});f.page.emit('pageerror',f.error);expect(()=>f.cell.assertClean()).toThrow();
});
it.each([true,false])('requires independently proven reload behavior for an exact pending notification read (other navigation verified=%s)',async verified=>{
 const f=await fixture({sameUrl:true,reloadVerified:true,verified});f.page.emit('pageerror',f.error);f.cell.assertClean();
 expect(f.execution.navigationDiagnostics).toHaveLength(1);expect(f.execution.navigationDiagnostics[0]).toMatchObject({documentNavigation:{phase:'reload-requested'}});
});
it.each(['frame','response','failed','finished'])('ends reload eligibility at the first %s boundary, including an unfinished streaming replacement',async boundary=>{
 const f=await fixture({sameUrl:true,reloadVerified:true});f.page.emit('pageerror',f.error);f.cell.assertClean();
 if(boundary==='frame')f.page.emit('framenavigated',f.frame);
 else if(boundary==='response')f.page.emit('response',{request:()=>f.request,status:()=>200});
 else f.page.emit(boundary==='failed'?'requestfailed':'requestfinished',f.request);
 f.page.emit('pageerror',{...f.error});expect(()=>f.cell.assertClean()).toThrow();expect(f.execution.navigationDiagnostics).toHaveLength(1);
});
it('a same-URL source history event makes reload attribution unproven instead of claiming a document commit',async()=>{
 const f=await fixture({sameUrl:true,reloadVerified:true});f.page.emit('framenavigated',f.frame);f.page.emit('pageerror',f.error);
 expect(()=>f.cell.assertClean()).toThrow();expect(f.errors[0]).toMatchObject({documentNavigation:{phase:'reload-boundary'}});
});
it.each(['error','unhandledrejection'])('a genuine reload-window %s remains fatal even with the exact native error shape',async kind=>{
 const f=await fixture({sameUrl:true,reloadVerified:true,verified:false});f.page.emit('pageerror',f.error);f.binding({page:f.page},kind);
 expect(()=>f.cell.assertClean()).toThrow();expect(f.errors).toContainEqual(expect.objectContaining({type:'window-javascript-error',kind}));
});
it.each(['/api/employee/home','/api/manager/today','/api/manager/action-center','/api/notifications?secret=PRIVATE_ACTOR_TOKEN'])('reload proof never admits an unverified read kind or query: %s',async path=>{
 const f=await fixture({sameUrl:true,reloadVerified:true,path});f.page.emit('pageerror',f.error);expect(()=>f.cell.assertClean()).toThrow();
 expect(f.execution.navigationDiagnostics).toHaveLength(0);expect(JSON.stringify(f.errors)).not.toContain('PRIVATE_ACTOR_TOKEN');
});
it('a navigation flag without a document resource type does not prove a reload',async()=>{
 const f=await fixture({sameUrl:true,reloadVerified:true,pending:false});f.page.emit('request',{...f.request,resourceType:()=> 'fetch'});f.page.emit('pageerror',f.error);expect(()=>f.cell.assertClean()).toThrow();
});
it('GET reload proof never admits a form resubmission',async()=>{
 const f=await fixture({sameUrl:true,reloadVerified:true,pending:false});f.page.emit('request',{...f.request,method:()=> 'POST'});f.page.emit('pageerror',f.error);expect(()=>f.cell.assertClean()).toThrow();
});
it.each([302,403,503])('a known notification HTTP %s during reload remains fatal',async status=>{
 const f=await fixture({sameUrl:true,reloadVerified:true});const request={url:()=> 'http://127.0.0.1:43210/api/notifications',method:()=> 'GET'};
 f.page.emit('response',{request:()=>request,status:()=>status});f.page.emit('pageerror',f.error);expect(()=>f.cell.assertClean()).toThrow();expect(f.execution.navigationDiagnostics).toHaveLength(0);
});
it('a known failed notification transport during reload remains fatal',async()=>{
 const f=await fixture({sameUrl:true,reloadVerified:true});f.page.emit('requestfailed',{url:()=> 'http://127.0.0.1:43210/api/notifications',method:()=> 'GET'});f.page.emit('pageerror',f.error);expect(()=>f.cell.assertClean()).toThrow();
});
it('reload proof never grants different-URL navigation proof',async()=>{
 const f=await fixture({sameUrl:false,reloadVerified:true,verified:false});f.page.emit('pageerror',f.error);expect(()=>f.cell.assertClean()).toThrow();
});
it('an uncorrelated main-frame destination stays fatal',async()=>{
 const f=await fixture();f.commit('http://127.0.0.1:43210/app/calendar');f.page.emit('pageerror',f.error);expect(()=>f.cell.assertClean()).toThrow();
});
it('a superseded or redirected request cannot close the latest request boundary',async()=>{
 const f=await fixture(),next={...f.request,url:()=> 'http://127.0.0.1:43210/app/calendar'};f.page.emit('request',next);
 f.page.emit('requestfailed',f.request);f.page.emit('requestfinished',f.request);f.page.emit('pageerror',f.error);f.cell.assertClean();
 f.commit(next.url(),next);f.page.emit('pageerror',{...f.error});expect(()=>f.cell.assertClean()).toThrow();
});
it('never creates a boundary for a subframe or foreign document',async()=>{
 for(const other of [true,false]){const f=await fixture({pending:false});f.page.emit('request',{isNavigationRequest:()=>true,frame:()=>other?{}:f.frame,url:()=>other?'http://127.0.0.1:43210/app':'https://fictional.invalid/app'});f.page.emit('pageerror',f.error);expect(()=>f.cell.assertClean()).toThrow();}
});
it.each(['error','unhandledrejection'])('keeps an actual %s fatal even when its error spoofs the native diagnostic',async kind=>{
 const f=await fixture();f.page.emit('pageerror',f.error);f.binding({page:f.page},kind);expect(()=>f.cell.assertClean()).toThrow();
 expect(f.errors).toContainEqual(expect.objectContaining({type:'window-javascript-error',kind}));
});
it('keeps a genuine application TypeError fatal during navigation',async()=>{
 const f=await fixture();f.page.emit('pageerror',new TypeError('Load failed PRIVATE_ACTOR_TOKEN'));expect(()=>f.cell.assertClean()).toThrow();expect(JSON.stringify(f.errors)).not.toContain('PRIVATE');
});
it('rejects native-shaped messages with an extra suffix',async()=>{
 const f=await fixture();f.error.message+=' PRIVATE_ACTOR_TOKEN';f.page.emit('pageerror',f.error);expect(()=>f.cell.assertClean()).toThrow();expect(JSON.stringify(f.errors)).not.toContain('PRIVATE');
});

it.each([false,true])('a newly scoped observer keeps unproved notification methods fatal (same URL=%s)',async sameUrl=>{
 const f=await fixture({sameUrl,reloadVerified:true,notificationOnly:true,requireWitness:true});
 f.page.emit('pageerror',f.error);expect(()=>f.cell.assertClean()).toThrow();expect(f.execution.navigationDiagnostics).toHaveLength(0);
});
it.each(['/api/employee/home','/api/manager/today','/api/manager/action-center'])('notification-only consumers never expand the distinct-URL exception to %s',async path=>{
 const f=await fixture({path,notificationOnly:true});f.page.emit('pageerror',f.error);
 expect(()=>f.cell.assertClean()).toThrow();expect(f.execution.navigationDiagnostics).toHaveLength(0);
});

// Flaky-test gap (Nov 23, 2026): a Next router read that a hard navigation cancels, opt-in only.
const wait=(ms:number)=>new Promise(resolve=>setTimeout(resolve,ms));
it.each(['/app/schedule?_rsc=1k3x9','/app?_rsc=ab_CD-12','/login?_rsc=z'])('with the opt-in, records a cancelled router read during a pending navigation: %s',async path=>{
 const f=await fixture({path,routerReads:true});f.page.emit('pageerror',f.error);f.cell.assertClean();
 expect(f.execution.navigationDiagnostics).toMatchObject([{type:'navigation-router-read-diagnostic',diagnostic:{resourceKind:'route-read',routerRead:true},pendingMainFrameNavigation:true}]);
 expect(JSON.stringify(f.execution.navigationDiagnostics)).not.toMatch(/_rsc|127\.0\.0\.1|43210/);
});
it.each([
 {routerReads:false,path:'/app/schedule?_rsc=1k3x9'},{routerReads:true,path:'/app/schedule?_rsc=1k3x9',engine:'chromium'},{routerReads:true,path:'/app/schedule?_rsc=1k3x9',verified:false},
 {routerReads:true,path:'/app/schedule?_rsc=1k3x9',pending:false},{routerReads:true,path:'/app/schedule?_rsc=1k3x9',phase:'context-close'},
 {routerReads:true,path:'/app/schedule?_rsc=1k3x9&token=PRIVATE_ACTOR_TOKEN'},{routerReads:true,path:'/app/schedule?token=PRIVATE_ACTOR_TOKEN'},{routerReads:true,path:'/app/schedule?_rsc=bad%20token'},
 {routerReads:true,path:'/app/schedule?_rsc=1k3x9#PRIVATE_ACTOR_TOKEN'},{routerReads:true,path:'/app/unknown?_rsc=1k3x9'},{routerReads:true,path:'/app/schedule?_rsc=1k3x9',host:'127.0.0.1:43211'},
 {routerReads:true,path:'/app/schedule?_rsc=1k3x9',host:'PRIVATE_ACTOR_TOKEN@127.0.0.1:43210'},
])('keeps a router read fatal without every proof: %j',async options=>{
 const f=await fixture(options);f.page.emit('pageerror',f.error);expect(()=>f.cell.assertClean()).toThrow();expect(f.execution.navigationDiagnostics).toHaveLength(0);
 expect(JSON.stringify(f.errors)).not.toContain('PRIVATE_ACTOR_TOKEN');
});
it('pairs one window error with an accepted router read, whichever arrives first',async()=>{
 const before=await fixture({path:'/app/schedule?_rsc=1k3x9',routerReads:true});before.page.emit('pageerror',before.error);await before.binding({page:before.page},'error');
 await wait(1700);before.cell.assertClean();expect(before.execution.navigationDiagnostics.map((d:{type:string})=>d.type)).toEqual(['navigation-router-read-diagnostic','navigation-router-read-window-error']);
 const after=await fixture({path:'/app/schedule?_rsc=1k3x9',routerReads:true});await after.binding({page:after.page},'error');after.page.emit('pageerror',after.error);
 await wait(1700);after.cell.assertClean();expect(after.execution.navigationDiagnostics.map((d:{type:string})=>d.type)).toEqual(['navigation-router-read-diagnostic','navigation-router-read-window-error']);
});
it('keeps a second, unpaired or late window error fatal with the opt-in',async()=>{
 const twice=await fixture({path:'/app/schedule?_rsc=1k3x9',routerReads:true});twice.page.emit('pageerror',twice.error);await twice.binding({page:twice.page},'error');await twice.binding({page:twice.page},'error');
 await wait(1700);expect(()=>twice.cell.assertClean()).toThrow();expect(twice.errors).toEqual([expect.objectContaining({type:'window-javascript-error',kind:'error'})]);
 const alone=await fixture({path:'/app/schedule?_rsc=1k3x9',routerReads:true});await alone.binding({page:alone.page},'error');
 await wait(1700);expect(()=>alone.cell.assertClean()).toThrow();
 const late=await fixture({path:'/app/schedule?_rsc=1k3x9',routerReads:true});late.page.emit('pageerror',late.error);await wait(1700);await late.binding({page:late.page},'error');
 await wait(1700);expect(()=>late.cell.assertClean()).toThrow();
},15000);
it.each(['unhandledrejection'])('never pairs an actual %s with a router read',async kind=>{
 const f=await fixture({path:'/app/schedule?_rsc=1k3x9',routerReads:true});f.page.emit('pageerror',f.error);await f.binding({page:f.page},kind);
 expect(()=>f.cell.assertClean()).toThrow();expect(f.errors).toContainEqual(expect.objectContaining({type:'window-javascript-error',kind}));
});
it('never pairs a window error once the navigation committed',async()=>{
 const f=await fixture({path:'/app/schedule?_rsc=1k3x9',routerReads:true});f.page.emit('pageerror',f.error);f.commit();await f.binding({page:f.page},'error');
 expect(()=>f.cell.assertClean()).toThrow();
});

// Navigation tracker (Nov 23, 2026): a main-frame URL change before the pending navigation's response is the source
// document's own history update, so the navigation stays pending; after the response it is a commit as before.
it('keeps a navigation pending through a source-document URL change before its response',async()=>{
 const f=await fixture({path:'/api/manager/today'});f.historyChange('http://127.0.0.1:43210/app?week=2026-11-30');
 f.page.emit('pageerror',f.error);f.cell.assertClean();expect(f.execution.navigationDiagnostics).toMatchObject([{pendingMainFrameNavigation:true,documentNavigation:{phase:'requested',sourceHistoryEvents:1}}]);
 // The destination's own commit (after its response) still ends the boundary.
 f.commit();f.page.emit('pageerror',{...f.error});expect(()=>f.cell.assertClean()).toThrow();
});
it('a different main-frame URL after the response is still unproven and fatal',async()=>{
 const f=await fixture({path:'/api/manager/today'});f.commit('http://127.0.0.1:43210/app/calendar');f.page.emit('pageerror',f.error);expect(()=>f.cell.assertClean()).toThrow();
});
