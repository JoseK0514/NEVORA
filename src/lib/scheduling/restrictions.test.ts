import {describe,expect,it} from 'vitest';
import {applyRestrictionCommand,emptyRestrictionDocument,parseRestrictionCommand,parseRestrictionDocument,resolveRestrictionDay,RestrictionError} from './restrictions';

const op='11111111-1111-4111-8111-111111111111', requestId='22222222-2222-4222-8222-222222222222', decisionId='33333333-3333-4333-8333-333333333333';
const sunday=[{dayOfWeek:0,startTime:'00:00',endTime:'24:00'}];
const context={actorId:'manager',actorRole:'MANAGER' as const,now:'2030-10-01T12:00:00.000Z',earliestWeek:'2030-10-07'};
const set=()=>({kind:'SET' as const,operationId:op,expectedRevision:0,effectiveWeek:'2030-10-07',unavailable:sunday,reason:'Agreed at onboarding'});

describe('management scheduling restrictions',()=>{
 it('keeps unconfirmed records distinct from an explicit unrestricted agreement',()=>{
  expect(resolveRestrictionDay('2030-10-13',[])).toBeNull();
  const result=applyRestrictionCommand(emptyRestrictionDocument(),{...set(),unavailable:[]},context);
  expect(resolveRestrictionDay('2030-10-13',result.document.versions)?.windows).toEqual([{start:0,end:1440}]);
 });
 it('applies a dated management restriction while retaining the old version',()=>{
  const first=applyRestrictionCommand(emptyRestrictionDocument(),set(),context);
  const second=applyRestrictionCommand(first.document,{...set(),operationId:requestId,expectedRevision:1,effectiveWeek:'2030-10-21',unavailable:[]},context);
  expect(resolveRestrictionDay('2030-10-06',second.document.versions)).toBeNull();
  expect(resolveRestrictionDay('2030-10-13',second.document.versions)?.windows).toEqual([]);
  expect(resolveRestrictionDay('2030-10-27',second.document.versions)?.windows).toEqual([{start:0,end:1440}]);
  expect(second.document.versions[0]).toEqual(first.document.versions[0]);
 });
 it('an employee request changes no approved version until management decides',()=>{
  const first=applyRestrictionCommand(emptyRestrictionDocument(),{...set(),unavailable:[]},context);
  const pending=applyRestrictionCommand(first.document,{...set(),kind:'REQUEST',operationId:requestId,expectedRevision:1},{...context,actorId:'worker',actorRole:'EMPLOYEE'});
  expect(pending.document.versions).toEqual(first.document.versions);
  expect(pending.document.requests[0].status).toBe('PENDING');
  expect(resolveRestrictionDay('2030-10-20',pending.document.versions)?.windows).toEqual([{start:0,end:1440}]);
  const decided=applyRestrictionCommand(pending.document,{kind:'DECIDE',operationId:decisionId,expectedRevision:2,requestId,decision:'APPROVE',effectiveWeek:'2030-10-14',reason:'Approved from the following open week'},context);
  expect(decided.document.requests[0].status).toBe('APPROVED');
  expect(resolveRestrictionDay('2030-10-20',decided.document.versions)?.windows).toEqual([]);
 });
 it('denial records a reason without changing eligibility',()=>{
  const pending=applyRestrictionCommand(emptyRestrictionDocument(),{...set(),kind:'REQUEST',operationId:requestId},{...context,actorId:'worker',actorRole:'LEAD'});
  const result=applyRestrictionCommand(pending.document,{kind:'DECIDE',operationId:decisionId,expectedRevision:1,requestId,decision:'DENY',reason:'Coverage requires the existing agreement'},context);
  expect(result.document.versions).toEqual([]);
  expect(result.document.requests[0]).toMatchObject({status:'DENIED',decision:{actorId:'manager',reason:'Coverage requires the existing agreement'}});
 });
 it.each(['EMPLOYEE','LEAD'] as const)('%s cannot set or approve restrictions',actorRole=>{
  expect(()=>applyRestrictionCommand(emptyRestrictionDocument(),set(),{...context,actorRole})).toThrow(RestrictionError);
 });
 it('management cannot masquerade as an employee request',()=>{
  expect(()=>applyRestrictionCommand(emptyRestrictionDocument(),{...set(),kind:'REQUEST'},context)).toThrow(RestrictionError);
 });
 it('replays the exact same operation without a second version despite the old expected revision',()=>{
  const first=applyRestrictionCommand(emptyRestrictionDocument(),set(),context);
  const retry=applyRestrictionCommand(first.document,set(),context);
  expect(retry.changed).toBe(false);expect(retry.receipt).toEqual(first.receipt);expect(retry.document).toEqual(first.document);
 });
 it('rejects operation-ID reuse with different contents or actor',()=>{
  const first=applyRestrictionCommand(emptyRestrictionDocument(),set(),context);
  expect(()=>applyRestrictionCommand(first.document,{...set(),unavailable:[]},context)).toThrow(RestrictionError);
  expect(()=>applyRestrictionCommand(first.document,set(),{...context,actorId:'other'})).toThrow(RestrictionError);
 });
 it('rejects stale distinct commands',()=>{
  const first=applyRestrictionCommand(emptyRestrictionDocument(),set(),context);
  expect(()=>applyRestrictionCommand(first.document,{...set(),operationId:requestId},context)).toThrow(RestrictionError);
 });
 it('refuses a cutover that would reach any later published or deadline-locked week',()=>{
  expect(()=>applyRestrictionCommand(emptyRestrictionDocument(),set(),{...context,earliestWeek:'2030-11-04'})).toThrow(RestrictionError);
 });
 it('cannot insert an earlier version behind an already approved future version',()=>{
  const first=applyRestrictionCommand(emptyRestrictionDocument(),{...set(),effectiveWeek:'2030-11-04'},context);
  expect(()=>applyRestrictionCommand(first.document,{...set(),operationId:requestId,expectedRevision:1,effectiveWeek:'2030-10-21'},context)).toThrow(RestrictionError);
 });
 it('normalizes overlapping restrictions and leaves the remaining hours eligible',()=>{
  const first=applyRestrictionCommand(emptyRestrictionDocument(),{...set(),unavailable:[{dayOfWeek:1,startTime:'12:00',endTime:'15:00'},{dayOfWeek:1,startTime:'14:00',endTime:'18:00'}]},context);
  expect(resolveRestrictionDay('2030-10-07',first.document.versions)?.windows).toEqual([{start:0,end:720},{start:1080,end:1440}]);
 });
 it.each([
  {effectiveWeek:'2030-10-08'}, {effectiveWeek:'2030-02-30'}, {reason:''}, {expectedRevision:-1},
  {unavailable:[{dayOfWeek:7,startTime:'08:00',endTime:'16:00'}]},
  {unavailable:[{dayOfWeek:1,startTime:'22:00',endTime:'06:00'}]},
  {unavailable:[{dayOfWeek:1,startTime:'24:00',endTime:'24:00'}]}, {approvedBy:'forged'},
 ])('rejects malformed or authority-bearing command fields %j',patch=>{
  expect(()=>parseRestrictionCommand({...set(),...patch})).toThrow(RestrictionError);
 });
 it('fails closed on malformed configured storage rather than treating it as unconfirmed',()=>{
  expect(()=>parseRestrictionDocument({schemaVersion:1,revision:1,versions:[{}],requests:[]})).toThrow(RestrictionError);
  expect(parseRestrictionDocument(null)).toEqual(emptyRestrictionDocument());
 });
 it('allows management to decide pending requests when the request-history admission limit is reached',()=>{
  const pending=applyRestrictionCommand(emptyRestrictionDocument(),{...set(),kind:'REQUEST',operationId:requestId},{...context,actorId:'worker',actorRole:'EMPLOYEE'}).document.requests[0];
  const document={schemaVersion:1 as const,revision:1024,versions:[],requests:Array.from({length:1024},(_,i)=>{
   const id=`aaaaaaaa-aaaa-4aaa-8aaa-${i.toString(16).padStart(12,'0')}`;
   return {...structuredClone(pending),id,operation:{...pending.operation,receipt:{...pending.operation.receipt,operationId:id,id,revision:i+1}}};
  })};
  const result=applyRestrictionCommand(document,{kind:'DECIDE',operationId:decisionId,expectedRevision:1024,requestId:document.requests[0].id,decision:'DENY',reason:'Request reviewed'},context);
  expect(result.document.requests[0].status).toBe('DENIED');expect(result.document.revision).toBe(1025);
 });
});
