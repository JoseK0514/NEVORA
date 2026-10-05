import { readFile } from 'node:fs/promises';
import { expect, it } from 'vitest';
import { createPunchFixture } from './clocker-punch-fixture';
import { ClockerPunchService } from '../../lib/clocker/punches.server';
import { randomUUID } from 'node:crypto';
it('upgrades legacy open and closed breaks without inventing classifications or changing recorded timestamps',async()=>{
 const f=await createPunchFixture();
 try{
  await f.q("INSERT INTO time_entries(id,employee_id,location_id,device_id,clock_in_at,status) VALUES('legacy-entry','c34-a','loc-1',$1,'2020-01-01T10:00Z','ON_BREAK')",[f.devices[0].device.id]);
  await f.q("INSERT INTO break_entries(id,time_entry_id,break_start_at,break_end_at) VALUES('legacy-closed','legacy-entry','2020-01-01T11:00Z','2020-01-01T11:15Z'),('legacy-open','legacy-entry','2020-01-01T12:00Z',NULL)");
  const original=await f.q('SELECT * FROM break_entries ORDER BY id');
  await f.q(await readFile('db/phase-c/clocker-breaks.sql','utf8'));
  const upgraded=await f.q('SELECT * FROM break_entries ORDER BY id');
  expect(upgraded.map(({break_type_id:_id,break_type_snapshot:_snapshot,...row})=>row)).toEqual(original);
  expect(upgraded.every(row=>row.break_type_id===null&&row.break_type_snapshot===null)).toBe(true);
  const service=new ClockerPunchService(f.key,f.db.executor),proof=(await f.identity()).proof;
  const view=await service.read(proof),s=view.snapshot;
  expect(view.allowedActions).toEqual(['END_BREAK','CLOCK_OUT']);expect(s.break).toMatchObject({type:null});
  const receipt=await service.execute(proof,{commandId:randomUUID(),action:'CLOCK_OUT',verificationId:view.verificationId,
   expected:{revision:s.revision,timeEntryId:s.entry!.id,timeEntryVersion:s.entry!.version,breakEntryId:s.break!.id,breakEntryVersion:s.break!.version}});
  expect(receipt.breakType).toBeNull();
  expect(await f.q('SELECT clock_out_at=b.break_end_at AS same FROM time_entries t JOIN break_entries b ON b.time_entry_id=t.id WHERE b.id=\'legacy-open\'')).toEqual([{same:true}]);
  expect(await f.q('SELECT * FROM clocker_break_types')).toEqual([]);
 }finally{await f.db.dispose();}
});
