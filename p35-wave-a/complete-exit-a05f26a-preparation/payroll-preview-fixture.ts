/** Two real published statement periods for the fictional preview lead. */
import { randomUUID } from 'node:crypto';
import type { SqlExecutor } from '/workspace/ready-wave-a/src/lib/notifications/types.ts';
import type { SessionMutationProof } from '/workspace/ready-wave-a/src/lib/shift-changes/types.ts';
import { readTimecards, mutateTimecard } from '/workspace/ready-wave-a/src/lib/timecards/service.ts';
import { readPeriodClose, savePeriodPopulation } from '/workspace/ready-wave-a/src/lib/period-close/service.ts';
import { command, runs } from '/workspace/ready-wave-a/src/lib/payroll/service.ts';
import { workerOnce } from '/workspace/ready-wave-a/src/lib/payroll/worker.ts';
import type { PayrollImport } from '/workspace/ready-wave-a/src/lib/payroll/contracts.ts';
import { seedPayrollFixture } from '/workspace/ready-wave-a/src/test/integration/payroll-fixture.ts';

export async function seedPayrollPreviewFixture(ex: SqlExecutor) {
 const seeded=await seedPayrollFixture(ex);
 // The original fixture deliberately leaves its run unpublished. Preserve that
 // default for integration consumers; only this disposable preview publishes it.
 async function publish(runId:string) {
  const r=(await runs(seeded.proof,ex)).runs.find(r=>r.id===runId)!;
  await command(seeded.proof,{action:'APPROVE',operationId:randomUUID(),runId:r.id,expectedRevision:r.revision,reviewToken:r.reviewToken},ex);
  for(let n=0;n<6;n++) {
   await workerOnce(ex);
   const rows=await ex.query({text:'SELECT run_id FROM payroll_publications WHERE run_id=$1::uuid',values:[runId]});
   if(rows.length)return;
  }
  throw Error('Fictional payroll publication did not complete');
 }
 await publish(seeded.runId);
 await ex.query({text:"UPDATE employees SET role='LEAD',first_name='Robin' WHERE id=$1",values:[seeded.ids.b]});
 const period={startDate:'2026-09-28',endDate:'2026-10-04'};
 const [device]=await ex.query<{id:string}>({text:"SELECT id FROM clocker_devices WHERE name='Fictional payroll clock'",values:[]});
 await ex.query({text:"INSERT INTO time_entries(id,employee_id,location_id,device_id,clock_in_at,clock_out_at,status,version) VALUES($1,$2,'loc-1',$3,'2026-09-29T12:00:00Z','2026-09-29T20:00:00Z','CLOCKED_OUT',1)",values:[randomUUID(),seeded.ids.b,device.id]});
 const cards=await readTimecards(seeded.proof,period,ex);
 if(cards.state!=='ready')throw Error('Fictional lead timecard unavailable');
 const card=cards.cards.find(c=>c.card.employeeId===seeded.ids.b)!;
 for(const [n,action] of (['APPROVE','FINALIZE'] as const).entries()) {
  const result=await mutateTimecard(seeded.proof,{operationId:randomUUID(),employeeId:seeded.ids.b,...period,expectedRevision:card.revision+n,expectedSourceHash:card.sourceHash,action},ex);
  if(result.status!==(action==='APPROVE'?'approved':'finalized'))throw Error('Fictional lead finalization failed');
 }
 const close=await readPeriodClose(seeded.proof,period,ex);
 await savePeriodPopulation(seeded.proof,{operationId:randomUUID(),expectedRevision:0,sourceHash:close.sourceHash,...period,members:close.members.map(e=>({employeeId:e.employeeId,disposition:e.employeeId===seeded.ids.b?'INCLUDE':'ZERO_TIME',reason:'Fictional preview disposition',employmentFacts:'Fictional employment',employmentBasis:'MANAGER_ATTESTED'}))},ex);
 const amounts:PayrollImport={schema:'NEVORA_PAYROLL_IMPORT_V1',currency:'USD',sourceName:'Fictional Accountant',sourceReference:'PREVIEW-2026-10',period,payday:'2026-10-06',rows:close.members.map(e=>({employeeId:e.employeeId,grossMinor:e.employeeId===seeded.ids.b?'100000':'0',netMinor:e.employeeId===seeded.ids.b?'90000':'0',employeeDeductions:e.employeeId===seeded.ids.b?[{code:'D',label:'Fictional deduction',amountMinor:'10000'}]:[],employerContributions:[]}))};
 const prepared=await command(seeded.proof,{action:'PREPARE',operationId:randomUUID(),period,payday:amounts.payday},ex);
 await command(seeded.proof,{action:'IMPORT',operationId:randomUUID(),runId:prepared.runId!,expectedRevision:1,amounts},ex);
 await publish(prepared.runId!);
 const lead:SessionMutationProof={employee:{id:seeded.ids.b,firstName:'Robin',lastName:'Fictional QA',role:'LEAD',primaryLocationId:'loc-1'},sessionTokenHash:'b'.repeat(64)};
 // Verification is performed by the caller under its own real session.
 return {...seeded,lead,secondRunId:prepared.runId!};
}
