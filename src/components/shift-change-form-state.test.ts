import {expect,it} from 'vitest';
import {ShiftChangeFormState} from './shift-change-form-state';
const op='11111111-1111-4111-8111-111111111111';
it('reconciles a lost committed response without resubmitting or changing identity',async()=>{
 const sent:string[][]=[];const state=new ShiftChangeFormState(()=>op);const f=new FormData();f.set('kind','SUBMIT_CALLOUT');f.set('sourceShiftId','overnight');f.set('reasonCode','OTHER');f.set('reasonNote','Private original note');
 await state.submit(f,async d=>{sent.push([...d].map(([k,v])=>`${k}=${v}`));throw Error('transport');});
 expect(state.result).toEqual({status:'outcome-unknown',operationId:op});expect(state.uncertain).toBe(true);
 await state.retry(async()=>({status:'pending',operationId:op,requestId:'r',revision:1}),async()=>{throw Error('must not resubmit');});
 expect(state.result?.status).toBe('pending');expect(sent).toHaveLength(1);expect(state.uncertain).toBe(false);
});
it('null reconciliation retains exact note, terms, revision and operation on retry',async()=>{
 const copies:[string,FormDataEntryValue][][]=[];const state=new ShiftChangeFormState(()=>op);const f=new FormData();f.set('kind','ACCEPT');f.set('requestId','r');f.set('expectedRevision','7');
 await state.submit(f,async d=>{copies.push([...d]);return {status:'outcome-unknown',operationId:op};});f.set('expectedRevision','8');f.set('kind','DECLINE');
 await state.retry(async()=>null,async d=>{copies.push([...d]);return {status:'pending',operationId:op,requestId:'r',revision:8};});
 expect(copies[0]).toEqual([['kind','ACCEPT'],['requestId','r'],['expectedRevision','7'],['operationId',op]]);expect(copies[1]).toEqual(copies[0]);
});
it('double submit is suppressed while the first operation waits',async()=>{
 let resolve!:(v:{status:'conflict'})=>void;let calls=0;const state=new ShiftChangeFormState(()=>op),f=new FormData();
 const first=state.submit(f,async()=>{calls++;return new Promise(r=>{resolve=r;});});await state.submit(f,async()=>{calls++;return {status:'unavailable'};});expect(calls).toBe(1);resolve({status:'conflict'});await first;expect(state.pending).toBe(false);
});
it('failed reconciliation is still uncertain and does not retry mutation',async()=>{
 const state=new ShiftChangeFormState(()=>op);await state.submit(new FormData(),async()=>{throw Error('offline');});await state.retry(async()=>{throw Error('offline');},async()=>{throw Error('must not dispatch');});expect(state.uncertain).toBe(true);expect(state.result?.status).toBe('outcome-unknown');
});
