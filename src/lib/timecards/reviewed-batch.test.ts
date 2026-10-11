import {expect,it} from 'vitest';
import {parseTimecardsResponse,type TimecardItem} from './read-model';
import {batchExclusion,reviewTimecards,reviewIsCurrent,runReviewedBatch} from './reviewed-batch';
import type {TimecardCommand} from './service';
const period={startDate:'2026-09-21',endDate:'2026-09-27'};
const ids=['11111111-1111-4111-8111-111111111111','22222222-2222-4222-8222-222222222222'];
function card(employeeId:string,state:TimecardItem['state']='DRAFT'){
 const source={...period,employeeId,employeeName:`Fictional ${employeeId}`,timeZone:'America/Puerto_Rico',pendingCorrections:0,entries:[],corrections:[]};
 return {...parseTimecardsResponse({state:'ready',observedAt:'2026-09-29T12:00:00Z',cards:[{source,sourceHash:'a'.repeat(32),revision:0,state:'DRAFT',history:[]}]},period).cards[0],state};
}
const review=(cards=[card('E1'),card('E2')])=>{let n=0;return reviewTimecards(period,'OWNER',cards,cards.map(c=>c.card.employeeId),'APPROVE',()=>ids[n++]);};
it('freezes only explicitly selected current revisions with stable per-card operation identities',()=>{
 let n=0;const result=reviewTimecards(period,'OWNER',[card('E1'),card('E2')],['E2'],'APPROVE',()=>ids[n++]);
 expect(result.commands).toEqual([{...period,employeeId:'E2',expectedRevision:0,expectedSourceHash:'a'.repeat(32),operationId:ids[0],action:'APPROVE'}]);
 expect(Object.isFrozen(result.commands[0])).toBe(true);
 expect(()=>reviewTimecards(period,'OWNER',[card('E1')],[],'APPROVE',()=>ids[0])).toThrow();
});
it('excludes self, issues, invalid state and requires a matching period',()=>{
 const self=card('OWNER'),issues=card('E1');issues.card.issues=['pending_correction'];
 expect(batchExclusion(self,'OWNER','APPROVE')).toBe('self');expect(batchExclusion(issues,'OWNER','APPROVE')).toBe('issues');
 expect(batchExclusion(card('E1','APPROVED'),'OWNER','APPROVE')).toBe('state');
 expect(batchExclusion(card('E1'),'OWNER','FINALIZE')).toBe('state');
 expect(batchExclusion(card('E1','APPROVED'),'OWNER','FINALIZE')).toBe(null);
 for(const excluded of [self,issues,card('E1','FINALIZED')])expect(()=>reviewTimecards(period,'OWNER',[excluded],[excluded.card.employeeId],'APPROVE',()=>ids[0])).toThrow();
 expect(()=>reviewTimecards({...period,endDate:'2026-09-28'},'OWNER',[card('E1')],['E1'],'APPROVE',()=>ids[0])).toThrow();
});
it('rejects over 100, duplicate, unseen selections and duplicate operation IDs',()=>{
 const cards=Array.from({length:101},(_,i)=>card(`E${i}`));
 expect(()=>reviewTimecards(period,'OWNER',cards,cards.map(c=>c.card.employeeId),'APPROVE',()=>ids[0])).toThrow();
 expect(()=>reviewTimecards(period,'OWNER',[card('E1')],['E1','E1'],'APPROVE',()=>ids[0])).toThrow();
 expect(()=>reviewTimecards(period,'OWNER',[card('E1')],['E2'],'APPROVE',()=>ids[0])).toThrow();
 expect(()=>reviewTimecards(period,'OWNER',[card('E1'),card('E2')],['E1','E2'],'APPROVE',()=>ids[0])).toThrow();
});
it('requires fresh review after revision, hash, state, issue, period or actor drift',()=>{
 const cards=[card('E1'),card('E2')],r=review(cards);
 expect(reviewIsCurrent(r,period,'OWNER',cards)).toBe(true);
 for(const changed of [{...cards[0],revision:1},{...cards[0],sourceHash:'b'.repeat(32)},{...cards[0],state:'FINALIZED' as const},{...cards[0],card:{...cards[0].card,issues:['open_entry'] as const}}])expect(reviewIsCurrent(r,period,'OWNER',[changed as TimecardItem,cards[1]])).toBe(false);
 expect(reviewIsCurrent(r,period,'OTHER',cards)).toBe(false);expect(reviewIsCurrent(r,{...period,endDate:'2026-09-28'},'OWNER',cards)).toBe(false);
});
it('submits sequentially with exact reviewed identities and individual completed outcomes',async()=>{
 const r=review(),sent:TimecardCommand[]=[];let inFlight=false;
 const result=await runReviewedBatch(r,()=>true,async command=>{expect(inFlight).toBe(false);inFlight=true;sent.push(command);await Promise.resolve();inFlight=false;return {httpStatus:200,body:{status:'approved',operationId:command.operationId,revision:1}};});
 expect(sent).toEqual(r.commands);expect(result.map(o=>o.status)).toEqual(['approved','approved']);
});
it.each([{httpStatus:409,body:{status:'conflict'},want:'conflict'},{httpStatus:409,body:{status:'blocked',reason:'unresolved_time'},want:'blocked'},{httpStatus:403,body:null,want:'denied'},{httpStatus:503,body:{status:'unavailable'},want:'unavailable'}])('halts after $want without submitting the remaining cards',async({httpStatus,body,want})=>{
 const r=review(),sent:string[]=[];
 const result=await runReviewedBatch(r,()=>true,async c=>{sent.push(c.employeeId);return {httpStatus,body};});
 expect(sent).toEqual(['E1']);expect(result.map(o=>o.status)).toEqual([want,'not-submitted']);
});
it('preserves the unknown original command for a protected retry without sending unseen remaining commands',async()=>{
 const r=review(),sent:TimecardCommand[]=[];
 const outcomes=await runReviewedBatch(r,()=>true,async c=>{sent.push(c);throw Error('Interrupted transport');});
 expect(outcomes.map(o=>o.status)).toEqual(['outcome-unknown','not-submitted']);expect(outcomes[0].command).toEqual(r.commands[0]);
 const retry={...r,commands:[outcomes[0].command]};
 await runReviewedBatch(retry,()=>true,async c=>{sent.push(c);return {httpStatus:200,body:{status:'approved',operationId:c.operationId,revision:1}};});
 expect(sent.map(c=>c.operationId)).toEqual([ids[0],ids[0]]);
});
it('treats another command receipt as unknown and does not advance',async()=>{
 const r=review();const outcomes=await runReviewedBatch(r,()=>true,async()=>({httpStatus:200,body:{status:'approved',operationId:ids[1],revision:1}}));
 expect(outcomes.map(o=>o.status)).toEqual(['outcome-unknown','not-submitted']);
});
it('stops on expired or navigated source before submitting or between completed cards',async()=>{
 const r=review();let current=false;const sent:string[]=[];
 const send=async(c:TimecardCommand)=>{sent.push(c.employeeId);current=false;return {httpStatus:200,body:{status:'approved',operationId:c.operationId,revision:1}};};
 expect((await runReviewedBatch(r,()=>current,send)).map(o=>o.status)).toEqual(['not-submitted','not-submitted']);expect(sent).toEqual([]);
 current=true;expect((await runReviewedBatch(r,()=>current,send)).map(o=>o.status)).toEqual(['approved','not-submitted']);expect(sent).toEqual(['E1']);
});
it('preserves a completed first card when a later command is unknown and leaves remaining cards unsubmitted',async()=>{
 const uuids=[...ids,'33333333-3333-4333-8333-333333333333'];let n=0;
 const cards=[card('E1'),card('E2'),card('E3')],r=reviewTimecards(period,'OWNER',cards,['E1','E2','E3'],'APPROVE',()=>uuids[n++]);
 const sent:string[]=[];
 const outcomes=await runReviewedBatch(r,()=>true,async c=>{sent.push(c.employeeId);return c.employeeId==='E1'?{httpStatus:200,body:{status:'approved',operationId:c.operationId,revision:1}}:{httpStatus:503,body:{status:'outcome-unknown',operationId:c.operationId}};});
 expect(sent).toEqual(['E1','E2']);expect(outcomes.map(o=>o.status)).toEqual(['approved','outcome-unknown','not-submitted']);expect(outcomes[1].command.operationId).toBe(ids[1]);
});
it('finalizes only the separately reviewed approved revisions without issuing approval commands',async()=>{
 const cards=[{...card('E1','APPROVED'),revision:3}],r=reviewTimecards(period,'OWNER',cards,['E1'],'FINALIZE',()=>ids[0]);
 const outcomes=await runReviewedBatch(r,()=>true,async c=>{expect(c.action).toBe('FINALIZE');expect(c.expectedRevision).toBe(3);return {httpStatus:200,body:{status:'finalized',operationId:ids[0],revision:4}};});
 expect(outcomes.map(o=>o.status)).toEqual(['finalized']);
});
