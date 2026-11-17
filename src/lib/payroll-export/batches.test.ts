import {randomUUID} from 'node:crypto';
import {expect,it,vi} from 'vitest';
import {parseExportCommand} from './service';
import type {BreakTreatment} from './paid-time';
import type {Population} from '../period-close/service';

const period={startDate:'2026-09-21',endDate:'2026-10-04'};
function fixture(people=30,breaks=20){
 const cards=Array.from({length:people},(_,i)=>({employeeId:`fictional-${String(i).padStart(2,'0')}-${'é'.repeat(16)}`,revision:2,sourceHash:'a'.repeat(32),finalizationOperationId:randomUUID()}));
 const population:Population={period,operationId:randomUUID(),revision:1,sourceHash:'b'.repeat(64),members:cards.map(c=>({employeeId:c.employeeId,disposition:'INCLUDE',reason:'Fictional reviewed pay period',employmentFacts:'Fictional employment attestation',employmentBasis:'MANAGER_ATTESTED'}))};
 const breakTreatments:BreakTreatment[]=cards.flatMap(c=>Array.from({length:breaks},(_,i)=>({employeeId:c.employeeId,entryId:`entry-${String(i>>1).padStart(2,'0')}-${'x'.repeat(48)}`,breakId:`break-${i}-${'y'.repeat(48)}`,treatment:i%2?'PAID_REST':'UNPAID_RELIEVED_MEAL'})));
 return {planId:randomUUID(),actorId:'fictional-owner',workspaceId:'fictional-company',period,sourceHash:population.sourceHash,population,profileId:null,profileRevision:0,cards,paidTime:{version:1 as const,breakTreatments}};
}

it('packs a realistic 30-person period by encoded bytes and retains every exact employee/break once',async()=>{
 const {planPaidExportBatches}=await import('./batches');const input=fixture(),before=structuredClone(input);
 const plan=await planPaidExportBatches(input);
 expect(plan.version).toBe('NEVORA_PAID_EXPORT_BATCHES_V1');expect(plan.batches.length).toBeGreaterThan(1);
 expect(plan.batches.flatMap(b=>b.command.cards.map(c=>c.employeeId)).sort()).toEqual(input.cards.map(c=>c.employeeId).sort());
 expect(plan.batches.flatMap(b=>b.command.paidTime!.breakTreatments)).toHaveLength(600);
 for(const batch of plan.batches){expect(batch.encodedBytes).toBe(new TextEncoder().encode(batch.body).byteLength);expect(batch.encodedBytes).toBeLessThanOrEqual(65536);expect(parseExportCommand(JSON.parse(batch.body))).toEqual(batch.command);}
 expect(input).toEqual(before);expect(await planPaidExportBatches(input)).toEqual(plan);
 const {paidExportBatchProgress}=await import('./batches');
 expect(await paidExportBatchProgress(plan,[])).toMatchObject({state:'INCOMPLETE',periodComplete:false,completedEmployeeIds:[],pendingEmployeeIds:input.cards.map(c=>c.employeeId).sort()});
 expect(plan.manifestRequest.command.receipts.map(r=>r.operationId)).toEqual(plan.batches.map(b=>b.command.operationId));
});

it('retains zero/excluded people in population custody and refuses omitted, duplicate or extra selected people',async()=>{
 const {planPaidExportBatches}=await import('./batches');const input=fixture(3,0);
 for(const disposition of ['ZERO_TIME','EXCLUDE'] as const){const v=structuredClone(input);v.population.members[2].disposition=disposition;v.cards.pop();const plan=await planPaidExportBatches(v);expect(plan.population.members).toHaveLength(3);expect(plan.batches.flatMap(b=>b.command.cards)).toHaveLength(2);}
 for(const cards of [input.cards.slice(1),[...input.cards,input.cards[0]],[...input.cards,{...input.cards[0],employeeId:'foreign'}]])await expect(planPaidExportBatches({...input,cards})).rejects.toMatchObject({reason:'POPULATION_COVERAGE_REQUIRED'});
 await expect(planPaidExportBatches({...input,sourceHash:'c'.repeat(64)})).rejects.toMatchObject({reason:'POPULATION_COVERAGE_REQUIRED'});
});

it('never splits one employee or silently drops an oversized employee or foreign break',async()=>{
 const {planPaidExportBatches}=await import('./batches');
 await expect(planPaidExportBatches(fixture(1,500))).rejects.toMatchObject({reason:'EMPLOYEE_EXCEEDS_COMMAND_LIMIT'});
 await expect(planPaidExportBatches(fixture(1,1001))).rejects.toMatchObject({reason:'EMPLOYEE_EXCEEDS_COMMAND_LIMIT'});
 const input=fixture(2,2);input.paidTime.breakTreatments[0].employeeId='foreign';
 await expect(planPaidExportBatches(input)).rejects.toMatchObject({reason:'POPULATION_COVERAGE_REQUIRED'});
});

it('also respects the existing 100-card cap',async()=>{
 const {planPaidExportBatches}=await import('./batches');const plan=await planPaidExportBatches(fixture(250,0));
 expect(plan.batches.map(b=>b.command.cards.length)).toEqual([100,100,50]);
 expect(new Set(plan.batches.map(b=>b.command.operationId)).size).toBe(3);
 expect(plan.manifestRequest.command.operationId).not.toBe(plan.batches[0].command.operationId);
});

it('recovers stored wire bodies after a change in platform collation',async()=>{
 const {planPaidExportBatches,paidExportBatchProgress}=await import('./batches');const input=fixture(3,0),plan=await planPaidExportBatches(input);
 const original=String.prototype.localeCompare,collation=vi.spyOn(String.prototype,'localeCompare').mockImplementation(function(this:string,other:string){return -original.call(this,other);});
 try{await expect(paidExportBatchProgress(plan,[])).resolves.toMatchObject({state:'INCOMPLETE',periodComplete:false});}
 finally{collation.mockRestore();}
});

it('keeps an all-zero roster subject to server manifest acceptance and rejects a corrupted stored body',async()=>{
 const {planPaidExportBatches,paidExportBatchProgress}=await import('./batches');
 const input=fixture(2,0);for(const m of input.population.members)m.disposition='ZERO_TIME';input.cards=[];
 const zero=await planPaidExportBatches(input);
 expect(zero.batches).toEqual([]);expect(zero.population.members).toHaveLength(2);
 expect(await paidExportBatchProgress(zero,[])).toMatchObject({state:'READY_FOR_MANIFEST',periodComplete:false});
 const plan=await planPaidExportBatches(fixture(2,0));plan.batches[0].body+=' ';
 await expect(paidExportBatchProgress(plan,[])).rejects.toMatchObject({reason:'INVALID_BATCH_PLAN'});
});
