import {afterEach,expect,it,vi} from 'vitest';
import {parseBillingSnapshot,type BillingSnapshot} from './billing-snapshot';
import {createPrivateSnapshotController,type PrivatePanelState} from '../private-snapshot-client';
const value=()=>({state:'restricted',operational:false,trialEndsAt:'2026-11-12T12:00:00.000Z',paidThrough:null,graceEndsAt:null,plan:'small',employeeLimit:15,activeEmployees:4,reason:'trial_ended',billing:true,export:true,observedAt:new Date().toISOString(),validForMs:15000});
afterEach(()=>vi.useRealTimers());
it('decodes only a bounded private company billing snapshot and strips unreviewed financial identity',()=>{const parsed=parseBillingSnapshot({...value(),stripeCustomerId:'must-not-disclose',instanceSecret:'must-not-disclose'});expect(parsed.state).toBe('ready');expect(JSON.stringify(parsed)).not.toContain('must-not-disclose');});
it.each([0,-1,15001,Infinity,NaN,0.5,'15000',null,undefined])('rejects an invalid disclosure lifetime %s',validForMs=>{expect(()=>parseBillingSnapshot({...value(),validForMs})).toThrow();});
it.each([null,undefined,'tomorrow','2026-11-12T12:00:00+00:00'])('rejects missing or noncanonical server observation %s',observedAt=>{expect(()=>parseBillingSnapshot({...value(),observedAt})).toThrow();});
it('retires the actual private DTO after current authority denial and fences a late old response after pause',async()=>{
 vi.useFakeTimers({toFake:['setTimeout','clearTimeout','Date','performance']});let release!:(value:unknown)=>void,calls=0;
 const states:PrivatePanelState<BillingSnapshot>[]=[],pending=new Promise(done=>{release=done;});
 const controller=createPrivateSnapshotController<BillingSnapshot>(state=>states.push(state),async()=>++calls===1?value():pending,parseBillingSnapshot,reason=>({state:'unavailable',reason}));
 try{controller.start();await vi.advanceTimersByTimeAsync(10500);expect(calls).toBe(2);controller.pause();const count=states.length;release(value());await vi.advanceTimersByTimeAsync(0);expect(states).toHaveLength(count);expect(states.at(-1)?.snapshot).toBeNull();}finally{controller.stop();}
 const denied:PrivatePanelState<BillingSnapshot>[]=[],live=createPrivateSnapshotController<BillingSnapshot>(state=>denied.push(state),async()=>({state:'unavailable',reason:'access_denied'}),v=>v as BillingSnapshot,reason=>({state:'unavailable',reason}));
 try{live.start();await vi.advanceTimersByTimeAsync(0);expect(denied.at(-1)?.snapshot).toEqual({state:'unavailable',reason:'access_denied'});await vi.advanceTimersByTimeAsync(60000);expect(denied.at(-1)?.snapshot).toEqual({state:'unavailable',reason:'access_denied'});}finally{live.stop();}
});
