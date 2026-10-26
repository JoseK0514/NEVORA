import {it,expect} from 'vitest';
import {parseCurrentTimecards,parseTimecardReceipt} from './client';
import type {TimecardCommand} from './service';
const command:TimecardCommand={operationId:'123e4567-e89b-42d3-a456-426614174000',employeeId:'E1',startDate:'2026-09-21',endDate:'2026-09-27',expectedRevision:3,expectedSourceHash:'a'.repeat(32),action:'APPROVE'};
it('D8 only accepts the submitted action/operation and next revision as a terminal timecard receipt',()=>{
 const receipt={status:'approved',operationId:command.operationId,revision:4};expect(parseTimecardReceipt(receipt,command,200)).toEqual(receipt);
 for(const wrong of [{...receipt,operationId:'123e4567-e89b-42d3-a456-426614174001'},{...receipt,revision:3},{...receipt,revision:5},{...receipt,status:'finalized'},{...receipt,extra:true}])expect(()=>parseTimecardReceipt(wrong,command,200)).toThrow();
 expect(()=>parseTimecardReceipt(receipt,command,503)).toThrow();expect(()=>parseTimecardReceipt({status:'blocked',reason:'invented'},command,409)).toThrow();
});
it('D8 retains an uncertain command only on its own bound outcome receipt',()=>{const receipt={status:'outcome-unknown',operationId:command.operationId};expect(parseTimecardReceipt(receipt,command,503)).toEqual(receipt);expect(()=>parseTimecardReceipt({...receipt,operationId:'other'},command,503)).toThrow();expect(parseTimecardReceipt({status:'conflict'},command,409)).toEqual({status:'conflict'});});
it('D8 rejects unconfirmed, expired, excessive or absent current-read lifetimes',()=>{const ready={state:'ready',observedAt:'2026-10-07T12:00:00Z',validForMs:10000,cards:[]};expect(parseCurrentTimecards(ready,command).validForMs).toBe(10000);for(const validForMs of [undefined,0,-1,45001,Infinity,'10000'])expect(()=>parseCurrentTimecards({...ready,validForMs},command)).toThrow();expect(()=>parseCurrentTimecards({...ready,state:'unavailable'},command)).toThrow();});
it('B-12: location-scope refusals are known blocked receipts',()=>{
 for(const reason of ['outside_scope','company_required'])expect(parseTimecardReceipt({status:'blocked',reason},command,409)).toEqual({status:'blocked',reason});
 expect(()=>parseTimecardReceipt({status:'blocked',reason:'outside_scope'},command,200)).toThrow();
});
