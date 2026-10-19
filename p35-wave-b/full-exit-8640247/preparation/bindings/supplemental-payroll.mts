// INITIAL FIXTURE ONLY. Never execute against a listening or previously inspected DB.
// Source canonical operations create real eligible UI states; browser probes still hold every command.
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {readFile} from 'node:fs/promises';
import {join} from 'node:path';
import {readTimecards,mutateTimecard} from '/workspace/exit-wave-b-8640247/src/lib/timecards/service.ts';
import {readPeriodClose,savePeriodPopulation} from '/workspace/exit-wave-b-8640247/src/lib/period-close/service.ts';
import {command,runs,enqueue,settings,saveSettings} from '/workspace/exit-wave-b-8640247/src/lib/payroll/service.ts';
import {claimJob,processJob} from '/workspace/exit-wave-b-8640247/src/lib/payroll/worker.ts';
import {fixtureProof} from '/workspace/exit-wave-b-8640247/src/test/integration/shift-change-api.ts';

export async function seedSupplementalPayrollStates(owned,payroll,fixtureId){
 const {database,identity,root}=owned,ex=database.executor;
 assert.equal(await readFile(join(root,'wave-b-initialization.started'),'utf8'),fixtureId,'Initial fixture ownership mismatch');
 const [db]=await ex.query({text:"SELECT current_database() AS name,shobj_description(oid,'pg_database') AS marker FROM pg_database WHERE datname=current_database()",values:[]});
 assert.equal(db.name,identity.name);assert.equal(db.marker,identity.marker);
 assert.match(db.name,/^nevora_exchange_test_audit_[a-f0-9]{12}$/);assert.ok(db.marker.startsWith('fuel-phase3-disposable:'));
 // All actors/large initial time entries have already been created, so new reviews
 // bind the final initial population and finalized time rather than stale seed snapshots.
 const period=payroll.period,proof=payroll.proof;
 // A real older settings revision plus a canonical replacement creates an actual
 // terminal SCHEDULE_CHANGED worker failure; no status column is forced.
 const baseline=(await runs(proof,ex)).runs.find(run=>run.id===payroll.runId);assert.equal(baseline?.status,'APPROVED');
 const prior=(await settings(proof,ex)).revisions.reduce((a,b)=>a.revision>b.revision?a:b);assert.ok(prior);
 const failedKey='wave-b-initial-stale-prepare:'+fixtureId;
 await ex.query(enqueue(null,'PREPARE',failedKey,{period,payday:baseline.payday,settingsRevision:prior.revision}));
 const [failed]=await ex.query({text:'SELECT id::text FROM payroll_jobs WHERE business_key=$1',values:[failedKey]});assert.ok(failed);
 await saveSettings(proof,{action:'SAVE_SETTINGS',operationId:randomUUID(),expectedRevision:prior.revision,effectiveFrom:prior.effectiveFrom.slice(0,10),reason:'Fictional initial stale-job setup',preferences:prior.preferences},ex);
 let staleProcessed=false;
 for(let attempts=0;attempts<20;attempts++){
  const job=await claimJob(ex);assert.ok(job,'Initial stale-job queue work required');
  try{await processJob(job,ex);}catch{ /* Existing canonical worker records terminal/pending outcome. */ }
  if(job.id===failed.id){staleProcessed=true;break;}
 }
 assert.ok(staleProcessed,'Initial stale preparation must reach canonical worker');
 const [failedRead]=await ex.query({text:'SELECT status,error FROM payroll_jobs WHERE id=$1::uuid',values:[failed.id]});assert.equal(failedRead.status,'FAILED');assert.equal(failedRead.error,'SCHEDULE_CHANGED');

 const cards=await readTimecards(proof,period,ex);assert.equal(cards.state,'ready');
 const finalized=[];
 for(const initial of cards.cards){
  if(initial.card.recordedNanoseconds==='0'||initial.state==='FINALIZED')continue;
  let current=initial;
  for(const action of (current.state==='APPROVED'?['FINALIZE']:['APPROVE','FINALIZE']) as Array<'APPROVE'|'FINALIZE'>){
   const result=await mutateTimecard(proof,{operationId:randomUUID(),employeeId:current.card.employeeId,...period,expectedRevision:current.revision,expectedSourceHash:current.sourceHash,action},ex);
   assert.equal(result.status,action==='APPROVE'?'approved':'finalized','Initial supplemental timecard did not finalize');
   const fresh=await readTimecards(proof,period,ex);assert.equal(fresh.state,'ready');current=fresh.cards.find(item=>item.card.employeeId===initial.card.employeeId);assert.ok(current);
  }
  finalized.push(current.card.employeeId);
 }
 const close=await readPeriodClose(proof,period,ex);
 const population=await savePeriodPopulation(proof,{operationId:randomUUID(),expectedRevision:close.population?.revision??0,sourceHash:close.sourceHash,...period,members:close.members.map(item=>({employeeId:item.employeeId,disposition:item.recordedNanoseconds==='0'?'ZERO_TIME':'INCLUDE',reason:'Fictional initial supplemental review',employmentFacts:'Fictional initial employment attestation',employmentBasis:'MANAGER_ATTESTED'}))},ex);
 assert.ok(population,'Initial supplemental population receipt required');
 const initialRuns=await runs(proof,ex),original=initialRuns.runs.find(run=>run.id===payroll.runId);assert.equal(original?.status,'APPROVED');
 const amounts={schema:'NEVORA_PAYROLL_IMPORT_V1' as const,currency:'USD' as const,sourceName:'Fictional initial accountant',sourceReference:'INITIAL-ONLY-SUPPLEMENTAL',period,payday:original.payday,rows:close.members.map(item=>({employeeId:item.employeeId,grossMinor:item.recordedNanoseconds==='0'?'0':'100000',netMinor:item.recordedNanoseconds==='0'?'0':'100000',employeeDeductions:[],employerContributions:[]}))};
 const corrected=()=>command(proof,{action:'CORRECT',operationId:randomUUID(),runId:original.id,expectedRevision:original.revision,reason:'Fictional initial supplemental review',amounts},ex);
 const pending=await corrected(),unpublished=await corrected();assert.ok(pending.runId&&unpublished.runId&&pending.runId!==unpublished.runId);
 const approvedCandidate=(await runs(proof,ex)).runs.find(run=>run.id===unpublished.runId);assert.equal(approvedCandidate?.status,'REVIEW_REQUIRED');assert.ok(approvedCandidate.reviewToken);
 await command(proof,{action:'APPROVE',operationId:randomUUID(),runId:approvedCandidate.id,expectedRevision:approvedCandidate.revision,reviewToken:approvedCandidate.reviewToken},ex);
 let pdfReady=false;
 for(let attempts=0;attempts<20;attempts++){
  const job=await claimJob(ex);assert.ok(job,'Expected initial PDF queue work');
  assert.ok(!(job.runId===unpublished.runId&&job.kind==='PUBLISH'),'Do not publish the initial unpublished fixture');
  await processJob(job,ex);
  if(job.runId===unpublished.runId&&job.kind==='PDF'){pdfReady=true;break;}
 }
 assert.ok(pdfReady,'Actual initial unpublished employee PDFs must exist');
 const positive=[];
 for(const actor of ['QAOWNER','payroll-qa-owner','payroll-qa-reviewer']){
  const actorProof=await fixtureProof(ex,actor),view=await runs(actorProof,ex),review=view.runs.find(run=>run.id===pending.runId),publish=view.runs.find(run=>run.id===unpublished.runId),job=view.jobs.find(item=>item.id===failed.id);
  assert.equal(review?.status,'REVIEW_REQUIRED');assert.ok(review.reviewToken);assert.ok(review.rows?.length&&review.totals);assert.ok(review.exceptions.every(item=>item.startsWith('CORRECTION_REASON:')),'Initial review must have no blocking input exception');
  assert.equal(publish?.status,'APPROVED');assert.ok(publish.documents.some(doc=>doc.kind==='EMPLOYEE_STATEMENT'&&!doc.published),'Initial publication control must have actual private employee PDF');
  assert.equal(job?.status,'FAILED');assert.ok(view.capabilities.canReview&&view.capabilities.canApprove);
  positive.push({actor,canReview:view.capabilities.canReview,canApprove:view.capabilities.canApprove,reviewRun:review.id,reviewRevision:review.revision,reviewTokenAvailable:true,rows:review.rows.length,unpublishedRun:publish.id,privateEmployeeDocuments:publish.documents.filter(doc=>doc.kind==='EMPLOYEE_STATEMENT'&&!doc.published).length,failedJob:job.id});
 }
 return {initialOnly:true,fixtureId,finalized,reviewRunId:pending.runId,unpublishedRunId:unpublished.runId,failedJobId:failed.id,failedJobStatusFromCanonicalWorker:true,positiveReads:positive,sourceSemantics:'Canonical settings supersession causes real SCHEDULE_CHANGED failure; canonical corrections/approval/PDF provide review/publication controls; all initial-only and no saved browser outcome claim'};
}
