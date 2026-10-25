import {createHash} from 'node:crypto';
import {describe,expect,it,vi} from 'vitest';
import type {SqlExecutor,SqlStatement} from '../notifications/types';
import type {SessionMutationProof} from '../shift-changes/types';
import {neutralProfile} from './model';
import {stableExportJson} from './json';
import {createPayrollExport,readExportProfiles,saveExportProfile,type ExportCommand} from './service';

const proof:SessionMutationProof={employee:{id:'M',role:'MANAGER',firstName:'Fictional',lastName:'Manager',primaryLocationId:'L'},sessionTokenHash:'a'.repeat(64)};
const profileId='11111111-1111-4111-8111-111111111111';
const operationId='22222222-2222-4222-8222-222222222222';
const finalizationId='33333333-3333-4333-8333-333333333333';
const period={startDate:'2026-09-21',endDate:'2026-09-27'};
const command:ExportCommand={...period,operationId,profileId,profileRevision:1,cards:[{employeeId:'E',revision:1,sourceHash:'a'.repeat(32),finalizationOperationId:finalizationId}]};
const source={...period,employeeId:'E',employeeName:'Fictional Employee',timeZone:'America/Puerto_Rico',pendingCorrections:0,corrections:[],entries:[{
 id:'T',locationId:'L',locationName:'Fictional location',positionId:null,positionName:null,sourceKind:'RECORDED',adjustmentId:null,recordedVersion:1,
 startAt:'2026-09-22T12:00:00Z',endAt:'2026-09-22T13:30:00Z',rawStartAt:'2026-09-22T12:00:00Z',rawEndAt:'2026-09-22T13:30:00Z',breaks:[],
}]};
const card={source,sourceHash:'a'.repeat(32),revision:1,state:'FINALIZED',history:[{operationId:finalizationId,revision:1,action:'FINALIZE',occurredAt:'2026-09-28T12:00:00Z',actorName:'Fictional Manager',note:null,sourceHash:'a'.repeat(32),snapshot:source}]};
const workspace={id:'W',name:'Fictional Company',timeZone:'America/Puerto_Rico',active:true,createdAt:'2026-01-01T00:00:00Z',updatedAt:'2026-01-01T00:00:00Z'};
const digest=(value:unknown)=>createHash('sha256').update(stableExportJson(value)).digest('hex');

// Business-unit transport/admission I/O only; parsing, projection, custody and CSV stay real.
function fixture(profile:unknown=neutralProfile()){
 const writes:SqlStatement[]=[],queries:SqlStatement[]=[],batches:(readonly SqlStatement[])[]=[];
 const state:{receipt:{hash:string;payload:unknown}|null;unfinalized:boolean}={receipt:null,unfinalized:false};
 const executor:SqlExecutor={
  async query<T>(statement:SqlStatement){
   queries.push(statement);
   if(statement.text.includes('FROM workspaces'))return [workspace] as T[];
   if(statement.text.includes('AS remaining'))return [{remaining:45000}] as T[];
   if(statement.text.includes("to_regclass('native_payroll_ledger')"))return [{available:false}] as T[];
   throw new Error('Unexpected fixture query');
  },
  async transaction(statements){
   batches.push(statements);
   return statements.map(statement=>{
    if(statement.text.includes('SELECT nevora_payroll_profile_command')){
     writes.push(statement);
     return [{result:{id:profileId,revision:1,profile:JSON.parse(String(statement.values[6]))}}];
    }
    if(statement.text.includes('SELECT nevora_payroll_export_command')){
     writes.push(statement);
     const payload=JSON.parse(String(statement.values[6]));
     state.receipt={hash:String(statement.values[3]),payload};
     return [{result:payload}];
    }
    if(statement.text.includes('FROM payroll_export_receipts'))return state.receipt?[state.receipt]:[];
    if(statement.text.includes('FROM nevora_payroll_profile_latest'))return [{id:profileId,revision:1,profile}];
    if(statement.text.includes('nevora_timecard_source'))return [{observedAt:'2026-09-28T12:00:00Z',cards:[{...card,state:state.unfinalized?'APPROVED':'FINALIZED'}]}];
    return [];
   });
  },
 };
 return {executor,writes,queries,batches,state,profile};
}
const invalidProfiles=[
 {label:'array custom format',profile:{...neutralProfile(),format:['CUSTOM_CSV']}},
 {label:'array ADP format and invalid shape',profile:{...neutralProfile(),format:['ADP_RUN_GENERIC_V1']}},
 {label:'array date format',profile:{...neutralProfile(),dateFormat:['US']}},
 ...['REJECT_INEXACT','HALF_UP'].map(precision=>({label:'array '+precision,profile:{...neutralProfile(),hourDecimals:0,precision:[precision],columns:[{header:'Hours',source:'recordedHours'}]}})),
];
describe('NVA-001 real export-service validation boundaries',()=>{
 it.each(invalidProfiles)('rejects $label before saving any profile',async({profile})=>{
  const f=fixture();
  await expect(saveExportProfile(proof,{operationId,id:profileId,expectedRevision:0,profile},f.executor)).rejects.toThrow();
  expect(f.queries).toEqual([]);expect(f.writes).toEqual([]);
 });
 it.each(invalidProfiles)('rejects persisted $label on read without rewriting history',async({profile})=>{
  const before=JSON.stringify(profile),f=fixture(profile);
  await expect(readExportProfiles(proof,f.executor)).rejects.toThrow();
  expect(f.writes).toEqual([]);expect(JSON.stringify(profile)).toBe(before);
 });
 it.each(invalidProfiles)('rejects persisted $label at generation before creating a receipt',async({profile})=>{
  const before=JSON.stringify(profile),f=fixture(profile);
  await expect(createPayrollExport(proof,command,f.executor)).rejects.toThrow();
  expect(f.writes).toEqual([]);expect(f.state.receipt).toBeNull();expect(JSON.stringify(profile)).toBe(before);
 });
 it.each(invalidProfiles)('rejects $label in a hash-valid historical receipt without replacing it',async({profile})=>{
  const f=fixture(),model={version:1,workspaceId:'W',timeZone:'America/Puerto_Rico',period,timeBasis:'RECORDED_ELAPSED_INCLUDING_BREAKS',rows:[{employeeId:'E',employeeName:'Fictional Employee',revision:1,sourceHash:'a'.repeat(32),finalizationOperationId:finalizationId,recordedNanoseconds:'5400000000000',breakNanoseconds:'0',entries:[]}]},csv='historical CSV';
  f.state.receipt={hash:digest(command),payload:{operationId,profileId,profileRevision:1,profile,model,csv,csvSha256:createHash('sha256').update(csv).digest('hex'),canonicalSha256:digest(model)}};
  const before=JSON.stringify(f.state.receipt);
  await expect(createPayrollExport(proof,command,f.executor)).rejects.toThrow();
  expect(f.writes).toEqual([]);expect(JSON.stringify(f.state.receipt)).toBe(before);
 });
 it('saves a scalar profile through the guarded command',async()=>{
  const f=fixture(),result=await saveExportProfile(proof,{operationId,id:profileId,expectedRevision:0,profile:neutralProfile()},f.executor);
  expect(result).toEqual({id:profileId,revision:1,profile:neutralProfile()});
  expect(f.writes).toHaveLength(1);
 });
 it('retains strict rejection and explicit half-up rounding for saved profiles',async()=>{
  const hours={...neutralProfile(),hourDecimals:0,precision:'REJECT_INEXACT' as const,columns:[{header:'Hours',source:'recordedHours' as const}]};
  const strict=fixture(hours);
  await expect(createPayrollExport(proof,command,strict.executor)).rejects.toThrow('exactly');
  expect(strict.writes).toEqual([]);
  const rounded=fixture({...hours,precision:'HALF_UP'});
  const result=await createPayrollExport(proof,command,rounded.executor);
  expect(result.model.rows[0].recordedNanoseconds).toBe('5400000000000');
  expect(result.csv).toBe('\uFEFF"Hours"\r\n"2"\r\n');expect(rounded.writes).toHaveLength(1);
  rounded.state.unfinalized=true;
  expect(await createPayrollExport(proof,command,rounded.executor)).toEqual(result);
  expect(rounded.writes).toHaveLength(1);
 });
 it('preserves finalized source and profile revision custody before writes',async()=>{
  for(const changed of [{...command,profileRevision:2},{...command,cards:[{...command.cards[0],sourceHash:'b'.repeat(32)}]}]){
   const f=fixture();await expect(createPayrollExport(proof,changed,f.executor)).rejects.toThrow('CONFLICT');expect(f.writes).toEqual([]);
  }
  const f=fixture();f.state.unfinalized=true;
  await expect(createPayrollExport(proof,command,f.executor)).rejects.toThrow('finalized');expect(f.writes).toEqual([]);
 });
 it.each(['EMPLOYEE','LEAD'] as const)('denies %s before any profile/export access',async role=>{
  const f=fixture(),actor={...proof,employee:{...proof.employee,role}};
  await expect(readExportProfiles(actor,f.executor)).rejects.toThrow('denied');
  await expect(saveExportProfile(actor,{operationId,id:profileId,expectedRevision:0,profile:neutralProfile()},f.executor)).rejects.toThrow('denied');
  await expect(createPayrollExport(actor,command,f.executor)).rejects.toThrow('denied');
  expect(f.queries).toEqual([]);expect(f.batches).toEqual([]);
 });
 it('denies missing server proof before database access',async()=>{
  const f=fixture();
  await expect(readExportProfiles({...proof,sessionTokenHash:''},f.executor)).rejects.toThrow('authorization');expect(f.queries).toEqual([]);
 });
});

// Current Company/lifecycle/receipt/rollback behavior uses owned real SQL in
// company-access-period-export.integration.ts; retain real guard assembly here.
vi.mock('@/lib/company-access/operational-scope.server',async original=>({...await original<Record<string,unknown>>(),assertOperationalAccess:async()=>({workspace,authority:'a'.repeat(64),scope:{mode:'COMPANY',locationIds:[]}})}));
