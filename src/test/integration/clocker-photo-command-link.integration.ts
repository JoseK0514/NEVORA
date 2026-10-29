import {randomUUID} from 'node:crypto';
import {afterEach,beforeEach,expect,it} from 'vitest';
import {createPunchFixture} from './clocker-punch-fixture';
import {ClockerPunchService} from '../../lib/clocker/punches.server';
import {photoFixture} from './clocker-photo-fixture';
import type {PunchAction} from '../../lib/clocker/punch-types';
let f:Awaited<ReturnType<typeof createPunchFixture>>;
beforeEach(async()=>{f=await createPunchFixture({breaks:true,companyAccess:true});});
afterEach(async()=>{await f?.db.dispose();});
it('atomically links all four exact commands and identical retries without another time record',async()=>{
 const {runtime}=await photoFixture(f),proof=(await f.identity()).proof,service=new ClockerPunchService(f.key,f.db.executor,{photoEvidence:true});
 for(const action of ['CLOCK_IN','START_BREAK','END_BREAK','CLOCK_OUT'] as PunchAction[]){
  const view=await service.read(proof),s=view.snapshot,command={commandId:randomUUID(),verificationId:view.verificationId,action,expected:{revision:s.revision,timeEntryId:s.entry?.id??null,timeEntryVersion:s.entry?.version??null,breakEntryId:s.break?.id??null,breakEntryVersion:s.break?.version??null},...(action==='START_BREAK'?{breakType:{id:f.breakType!.id,version:f.breakType!.version}}:{})};
  const receipt=await service.execute(proof,command);expect(await service.execute(proof,command)).toEqual(receipt);
  expect(await runtime.service.status(proof,{commandId:command.commandId,verificationId:view.verificationId})).toMatchObject({state:'pending',commandId:command.commandId,policyVersion:1,profileVersion:1});
 }
 expect(await f.q('SELECT (SELECT count(*)::int FROM clocker_punch_photos) AS photos,(SELECT count(*)::int FROM clocker_command_ledger) AS commands,(SELECT count(*)::int FROM time_entries) AS entries')).toEqual([{photos:4,commands:4,entries:1}]);
});
it('a failed expectation rolls back the time action and its receipt in the same transaction',async()=>{
 await photoFixture(f);const proof=(await f.identity()).proof,service=new ClockerPunchService(f.key,f.db.executor,{photoEvidence:true}),view=await service.read(proof);
 await f.q("CREATE FUNCTION reject_photo_fixture() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'owned photo expectation failure'; END $$; CREATE TRIGGER reject_photo_fixture BEFORE INSERT ON clocker_punch_photos FOR EACH ROW EXECUTE FUNCTION reject_photo_fixture()");
 await expect(service.execute(proof,{commandId:randomUUID(),verificationId:view.verificationId,action:'CLOCK_IN',expected:{revision:0,timeEntryId:null,timeEntryVersion:null,breakEntryId:null,breakEntryVersion:null}})).rejects.toThrow();
 expect(await f.q('SELECT (SELECT count(*)::int FROM clocker_command_ledger) AS commands,(SELECT count(*)::int FROM time_entries) AS entries')).toEqual([{commands:0,entries:0}]);
});
