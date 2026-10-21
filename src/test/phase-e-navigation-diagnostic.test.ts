import {EventEmitter} from 'node:events';
import {resolve} from 'node:path';
import {expect,it,vi} from 'vitest';
const {observeBrowserCell}=await import(resolve('scripts/phase-e-browser-qa.mjs'));

async function fixture({verified=true,engine='webkit',phase='scenario',pending=true,host='127.0.0.1:43210',path='/api/notifications'}={}){
 const errors:unknown[]=[],execution={suite:'home',engine,width:390,status:'failed',navigationDiagnostics:[]},frame={};
 const binding=vi.fn();
 const context=Object.assign(new EventEmitter(),{exposeBinding:vi.fn(async(_name:string,fn:unknown)=>{binding.mockImplementation(fn as (...args:unknown[])=>unknown);}),addInitScript:vi.fn(async()=>{})});
 const page=Object.assign(new EventEmitter(),{url:()=> 'http://127.0.0.1:43210/app',mainFrame:()=>frame});
 const cell=observeBrowserCell(execution,errors,{navigationDiagnosticVerified:verified});await cell.observeContext(context,'primary');context.emit('page',page);cell.setPhase(phase);
 const request={isNavigationRequest:()=>true,frame:()=>frame,url:()=> 'http://127.0.0.1:43210/app/schedule'};
 if(pending)page.emit('request',request);
 const error={name:'Fetch API cannot load http',message:'/'+host+path+'?token=PRIVATE_ACTOR_TOKEN due to access control checks.'};
 return {cell,context,page,errors,execution,error,frame,request,binding};
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
])('keeps an unproven or live-document event fatal: %j',async options=>{
 const f=await fixture(options);f.page.emit('pageerror',f.error);expect(()=>f.cell.assertClean()).toThrow();expect(f.execution.navigationDiagnostics).toHaveLength(0);
});
it.each(['/api/employee/home','/api/employee/my-time'])('recognizes only the observed static own-read path %s',async path=>{
 const f=await fixture({path});f.page.emit('pageerror',f.error);f.cell.assertClean();expect(f.execution.navigationDiagnostics).toHaveLength(1);
});
it('retires the classification boundary at document commit',async()=>{
 const f=await fixture();f.page.emit('framenavigated',f.frame);f.page.emit('pageerror',f.error);expect(()=>f.cell.assertClean()).toThrow();
});
it('retires the classification boundary when the navigation fails',async()=>{
 const f=await fixture();f.page.emit('requestfailed',f.request);f.page.emit('pageerror',f.error);expect(()=>f.cell.assertClean()).toThrow();
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
