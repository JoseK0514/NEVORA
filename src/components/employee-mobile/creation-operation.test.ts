import {expect,it} from 'vitest';
import {EmployeeCreationOperation} from './creation-operation';
it('locks one original creation payload and reconciles it before resend; stale handlers cannot submit or recover',async()=>{
 const operation=new EmployeeCreationOperation(()=> '11111111-1111-4111-8111-111111111111');const sent:Record<string,FormDataEntryValue>[]=[];let allowed=true;
 const data=new FormData();data.set('kind','SUBMIT_CALLOUT');data.set('reasonNote','Original private note');
 await operation.submit(data,async f=>{sent.push(Object.fromEntries(f));throw Error('Lost response');},()=>allowed);
 data.set('reasonNote','Changed');await operation.submit(data,async()=>{throw Error('Must not send');},()=>true);expect(sent).toHaveLength(1);
 allowed=false;await operation.retry(async()=>null,async()=>{throw Error('Must not retry');},()=>allowed);expect(operation.state.uncertain).toBe(true);
 allowed=true;await operation.retry(async()=>null,async f=>{sent.push(Object.fromEntries(f));return {status:'pending',operationId:'11111111-1111-4111-8111-111111111111',requestId:'own',revision:1};},()=>allowed);
 expect(sent[1]).toEqual(sent[0]);expect(operation.state.uncertain).toBe(false);
 await operation.submit(data,async()=>{throw Error('No second creation after success');},()=>true);expect(sent).toHaveLength(2);
});
