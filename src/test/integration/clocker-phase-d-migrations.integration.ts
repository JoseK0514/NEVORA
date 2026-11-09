import {readFile} from 'node:fs/promises';
import {randomUUID} from 'node:crypto';
import {it,expect} from 'vitest';
import {createPunchFixture} from './clocker-punch-fixture';
import {ClockerPunchService} from '../../lib/clocker/punches.server';
import {submitTimeCorrection,reviewTimeCorrection} from '../../lib/time-corrections/service';
import {readTimecards} from '../../lib/timecards/service';
it('D8 upgrades the frozen D2 schema without changing actual punches, breaks, receipts, PINs, credentials or approved corrections',async()=>{
 const f=await createPunchFixture({breaks:true,migrationStage:'phase-d2',companyAccess:true});
 try{
  const proof={employee:{id:'c34-owner',role:'OWNER' as const,firstName:'Owner',lastName:'QA',primaryLocationId:'loc-1'},sessionTokenHash:'a'.repeat(64)};
  await f.q("INSERT INTO employee_credentials(employee_id,password_hash) VALUES('c34-a','fictional-existing-hash');INSERT INTO employee_sessions(token_hash,employee_id,expires_at) VALUES(repeat('b',64),'c34-a',clock_timestamp()+interval '1 day')");
  const service=new ClockerPunchService(f.key,f.db.executor),identity=await f.identity();
  for(const action of ['CLOCK_IN','START_BREAK','END_BREAK','CLOCK_OUT'] as const){const view=await service.read(identity.proof),s=view.snapshot;await service.execute(identity.proof,{commandId:randomUUID(),verificationId:view.verificationId,action,expected:{revision:s.revision,timeEntryId:s.entry?.id??null,timeEntryVersion:s.entry?.version??null,breakEntryId:s.break?.id??null,breakEntryVersion:s.break?.version??null},...(action==='START_BREAK'?{breakType:{id:f.breakType!.id,version:f.breakType!.version}}:{})});}
  const employee={...proof,employee:{...proof.employee,id:'c34-a',role:'EMPLOYEE' as const},sessionTokenHash:'b'.repeat(64)};
  const correction=await submitTimeCorrection(employee,{operationId:randomUUID(),kind:'MISSING_ENTRY',locationId:'loc-1',proposedStartAt:'2026-09-28T12:00:00Z',proposedEndAt:'2026-09-28T13:00:00Z',reason:'Fictional preserved D2 adjustment'},f.db.executor);if(correction.status!=='pending')throw Error('Fixture correction');expect((await reviewTimeCorrection(proof,{operationId:randomUUID(),requestId:correction.requestId,expectedRevision:correction.revision,decision:'APPROVE'},f.db.executor)).status).toBe('approved');
  const tables=['employees','employee_credentials','employee_sessions','employee_location_eligibility','employee_clocker_pins','clocker_devices','clocker_device_credentials','time_entries','break_entries','clocker_command_ledger','time_correction_requests','time_correction_adjustments','time_correction_events'];
  const snapshot=async()=>Promise.all(tables.map(table=>f.q(`SELECT to_jsonb(t) AS row FROM ${table} t ORDER BY to_jsonb(t)::text`)));
  const before=await snapshot();
  for(const file of ['0018_timecards.sql','0019_payroll_export_mappings.sql','0020_account_recovery.sql','0021_timecard_reassignment_interlock.sql','0022_timecard_reopen_revision_authority.sql'])await f.q(await readFile('db/migrations/'+file,'utf8'));
  expect(await snapshot()).toEqual(before);
  expect(await f.q('SELECT (SELECT count(*)::int FROM timecard_revisions) AS reviews,(SELECT count(*)::int FROM payroll_export_receipts) AS exports,(SELECT count(*)::int FROM password_recovery_proofs) AS proofs')).toEqual([{reviews:0,exports:0,proofs:0}]);
  const cards=await readTimecards(employee,{startDate:'2026-09-28',endDate:'2026-10-04'},f.db.executor);expect(cards.state).toBe('ready');if(cards.state==='ready'){expect(cards.cards).toHaveLength(1);expect(cards.cards[0].card.recordedNanoseconds).toBe('3600000000000');expect(cards.cards[0].card.entries[0]).toMatchObject({sourceKind:'ADJUSTMENT',rawStartAt:null});}
 }finally{await f.db.dispose();}
});
