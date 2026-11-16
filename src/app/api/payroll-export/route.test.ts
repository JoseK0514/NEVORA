import {beforeEach,describe,expect,it,vi} from 'vitest';
const f=vi.hoisted(()=>({session:{id:'M',role:'MANAGER'} as {id:string;role:string}|null,create:vi.fn()}));
vi.mock('@/lib/auth/session',()=>({getSession:async()=>f.session,requireSessionMutationProof:async()=>({employee:f.session,sessionTokenHash:'a'.repeat(64)})}));
vi.mock('@/lib/payroll-export/service',async()=>{const actual=await vi.importActual<typeof import('@/lib/payroll-export/service')>('@/lib/payroll-export/service');return {...actual,createPayrollExport:f.create};});
import {POST} from './route';
import {decimalHours} from '@/lib/payroll-export/model';
import {PayrollExportReviewError} from '@/lib/payroll-export/errors';
const command={operationId:'11111111-1111-4111-8111-111111111111',profileId:null,profileRevision:0,startDate:'2026-09-21',endDate:'2026-09-27',cards:[{employeeId:'E',revision:2,sourceHash:'a'.repeat(32),finalizationOperationId:'22222222-2222-4222-8222-222222222222'}]};
const request=(body:unknown=command,headers:Record<string,string>={})=>new Request('https://example.test/api/payroll-export',{method:'POST',headers:{origin:'https://example.test','content-type':'application/json','x-nevora-payroll-export':'1','x-nevora-actor':'M',...headers},body:JSON.stringify(body)});
beforeEach(()=>{f.session={id:'M',role:'MANAGER'};f.create.mockReset();f.create.mockResolvedValue({operationId:command.operationId});});
describe('D6 export transport',()=>{
 it('uses current server proof and private no-store response',async()=>{const r=await POST(request());expect(r.status).toBe(200);expect(r.headers.get('cache-control')).toContain('no-store');expect(f.create).toHaveBeenCalledOnce();});
 it.each(['EMPLOYEE','LEAD'])('refuses %s access',async role=>{f.session={id:'M',role};expect((await POST(request())).status).toBe(403);});
 it('refuses a switched identity rather than replaying for a different actor',async()=>{f.session={id:'OTHER',role:'OWNER'};expect((await POST(request())).status).toBe(403);expect(f.create).not.toHaveBeenCalled();});
 it('requires login and same-origin anti-forgery',async()=>{expect((await POST(request(command,{origin:'https://evil.test'}))).status).toBe(403);f.session=null;expect((await POST(request())).status).toBe(401);});
 it('refuses caller-provided totals and unreviewed fields',async()=>{expect((await POST(request({...command,totalHours:100}))).status).toBe(400);});
 it('accepts explicit per-recorded-break paid treatment on the bounded export command',async()=>{
  const paidTime={version:1,breakTreatments:[{employeeId:'E',entryId:'T',breakId:'B',treatment:'UNPAID_RELIEVED_MEAL'}]};
  expect((await POST(request({...command,paidTime}))).status).toBe(200);
  expect(f.create.mock.calls[0]?.[1]).toEqual({...command,paidTime});
 });
 it.each([
  {version:1,breakTreatments:[{employeeId:'E',entryId:'T',breakId:'B',treatment:'UNPAID'}]},
  {version:1,breakTreatments:[{employeeId:'E',entryId:'T',breakId:'B',treatment:'PAID_REST',hours:1}]},
  {version:1,breakTreatments:[{employeeId:'E',entryId:'T',breakId:'B',treatment:'PAID_REST'},{employeeId:'E',entryId:'T',breakId:'B',treatment:'PAID_REST'}]},
 ])('rejects malformed explicit paid treatment %j',async paidTime=>{expect((await POST(request({...command,paidTime}))).status).toBe(400);expect(f.create).not.toHaveBeenCalled();});
 it('reports source revision conflicts without generating a new receipt',async()=>{f.create.mockRejectedValue(new Error('nevora_export_CONFLICT'));expect((await POST(request())).status).toBe(409);});
 it('returns a bounded invalid reason for a known pre-write precision refusal',async()=>{
  let failure;try{decimalHours('60000000000',9,'REJECT_INEXACT');}catch(error){failure=error;}
  expect(failure).toBeInstanceOf(Error);f.create.mockRejectedValue(failure);
  const response=await POST(request());expect(response.status).toBe(400);expect(await response.json()).toEqual({state:'invalid',reason:'INEXACT_HOURS'});
  expect(response.headers.get('cache-control')).toContain('no-store');
 });
 it('keeps unknown post-write failures unavailable without reflecting exception messages',async()=>{
  f.create.mockRejectedValue(Object.assign(new Error('Time cannot be represented exactly: internal/private diagnostic'),{reason:'INEXACT_HOURS'}));
  const response=await POST(request());expect(response.status).toBe(503);expect(await response.json()).toEqual({state:'unavailable'});
 });
 it.each(['LEGACY_MAPPING_REVIEW_REQUIRED','BREAK_CLASSIFICATION_REVIEW_REQUIRED','PAID_TIME_REVIEW_REQUIRED'] as const)('returns deterministic %s as a bounded invalid command',async reason=>{
  f.create.mockRejectedValue(new PayrollExportReviewError(reason));const response=await POST(request());
  expect(response.status).toBe(400);expect(await response.json()).toEqual({state:'invalid',reason});
 });
 it('reports a business duplicate as a private non-retryable artifact conflict',async()=>{f.create.mockRejectedValue(new Error('nevora_export_ALREADY_GENERATED'));const response=await POST(request());expect(response.status).toBe(409);expect(await response.json()).toEqual({state:'already_generated'});expect(response.headers.get('cache-control')).toContain('no-store');});
});
