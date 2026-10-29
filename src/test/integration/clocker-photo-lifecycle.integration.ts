import sharp from 'sharp';
import {randomUUID} from 'node:crypto';
import {afterEach,beforeEach,expect,it} from 'vitest';
import {createPunchFixture} from './clocker-punch-fixture';
import {photoFixture} from './clocker-photo-fixture';
import {ClockerPunchService} from '../../lib/clocker/punches.server';
import {handleClockerPhotoOwnerReview} from '../../lib/clocker/photo-server/transport';
let f:Awaited<ReturnType<typeof createPunchFixture>>;
beforeEach(async()=>{f=await createPunchFixture({companyAccess:true});});afterEach(async()=>{await f?.db.dispose();});
async function evidence(){
 const {runtime,owner}=await photoFixture(f),proof=(await f.identity()).proof,service=new ClockerPunchService(f.key,f.db.executor,{photoEvidence:true}),view=await service.read(proof);
 const command={commandId:randomUUID(),verificationId:view.verificationId,action:'CLOCK_IN',expected:{revision:0,timeEntryId:null,timeEntryVersion:null,breakEntryId:null,breakEntryVersion:null}};
 const receipt=await service.execute(proof,command),reference={deviceId:proof.device.deviceId,commandId:command.commandId},metadata={commandId:command.commandId,verificationId:command.verificationId},snapshot={policyVersion:1,profileVersion:1};
 const bytes=await sharp({create:{width:64,height:48,channels:3,background:'#567a65'}}).jpeg().toBuffer();
 return {runtime,owner,proof,receipt,reference,metadata,bytes,snapshot};
}
it('decodes fictional pixels, privately reviews and removes evidence without changing time',async()=>{
 const e=await evidence();expect(await e.runtime.service.upload(e.proof,e.metadata,e.bytes,'image/jpeg',e.snapshot)).toMatchObject({state:'stored'});
 const bytes=await e.runtime.service.readPrivatePhoto(e.owner,e.reference,'2');expect(bytes).toBeInstanceOf(Uint8Array);expect((await sharp(bytes!).metadata()).width).toBe(64);
 expect((await e.runtime.service.listPhotos(e.owner,{limit:20,cursor:null})).records).toHaveLength(1);
 expect(await e.runtime.service.removePhoto(e.owner,e.reference)).toMatchObject({state:'removed'});
 expect(await e.runtime.service.readPrivatePhoto(e.owner,e.reference,'2')).toBeNull();
 expect(await e.runtime.service.upload(e.proof,e.metadata,e.bytes,'image/jpeg',e.snapshot)).toMatchObject({state:'removed'});
 expect(await f.q('SELECT result FROM clocker_command_ledger')).toEqual([{result:e.receipt}]);
 expect(await f.q('SELECT count(*)::int AS n FROM clocker_photo_access_events')).toEqual([{n:2}]);
});
it('a shorter lifetime applies to old evidence and increasing retention never extends it',async()=>{
 const e=await evidence();await e.runtime.service.upload(e.proof,e.metadata,e.bytes,'image/jpeg',e.snapshot);
 const update={enabled:true,events:['CLOCK_IN'],retentionDays:2,failureBehavior:'ALLOW_WITH_EXCEPTION'};
 await e.runtime.service.savePolicy(e.owner,{...update,expectedVersion:1});
 const short=await f.q('SELECT expires_at,expires_at=performed_at+interval \'2 days\' AS shortened FROM clocker_punch_photos');expect(short[0].shortened).toBe(true);
 await e.runtime.service.savePolicy(e.owner,{...update,expectedVersion:2,retentionDays:30});expect(await f.q('SELECT expires_at,expires_at=performed_at+interval \'2 days\' AS shortened FROM clocker_punch_photos')).toEqual(short);
});
it('expired bytes cannot be read or resurrected and bounded cleanup preserves the ledger',async()=>{
 const e=await evidence();await e.runtime.service.upload(e.proof,e.metadata,e.bytes,'image/jpeg',e.snapshot);
 // Owned expiry fixture shortens only expiry; immutable command/time fields and all triggers stay intact.
 await f.q("UPDATE clocker_punch_photos SET expires_at=performed_at+interval '1 millisecond'");
 expect(await e.runtime.service.readPrivatePhoto(e.owner,e.reference)).toBeNull();expect(await e.runtime.service.upload(e.proof,e.metadata,e.bytes,'image/jpeg',e.snapshot)).toMatchObject({state:'expired'});
 expect(await e.runtime.service.cleanupPhotoEvidence(e.owner,1)).toMatchObject({expired:1});expect(await f.q("SELECT state,jpeg IS NULL AS erased FROM clocker_punch_photos")).toEqual([{state:'expired',erased:true}]);expect(await f.q('SELECT result FROM clocker_command_ledger')).toEqual([{result:e.receipt}]);
});
it('Off and notice revisions reject a delayed upload while retaining its original time',async()=>{
 const e=await evidence();await e.runtime.service.saveNoticeProfile(e.owner,{expectedVersion:1,assistanceContact:'Changed fictional contact',assistanceInstructions:'New test instructions.'});
 await expect(e.runtime.service.upload(e.proof,e.metadata,e.bytes,'image/jpeg',e.snapshot)).rejects.toMatchObject({code:'POLICY_CHANGED'});
 await e.runtime.service.savePolicy(e.owner,{expectedVersion:1,enabled:false,events:['CLOCK_IN'],retentionDays:7,failureBehavior:'ALLOW_WITH_EXCEPTION'});
 await expect(e.runtime.service.upload(e.proof,e.metadata,e.bytes,'image/jpeg',e.snapshot)).rejects.toMatchObject({code:'POLICY_CHANGED'});
 expect(await f.q('SELECT result FROM clocker_command_ledger')).toEqual([{result:e.receipt}]);
});
it('another employee, changed PIN and forged company scope cannot access an original photo',async()=>{
 const e=await evidence(),other=(await f.identity(1,'4567')).proof;
 expect(await e.runtime.service.status(other,{...e.metadata,verificationId:(await new ClockerPunchService(f.key,f.db.executor).read(other)).verificationId})).toMatchObject({state:'unknown'});
 await expect(e.runtime.service.readPrivatePhoto({...e.owner,workspaceId:'foreign-company'},e.reference)).rejects.toMatchObject({code:'AUTH_REQUIRED'});
 await f.q("UPDATE employee_clocker_pins SET version=version+1 WHERE employee_id='c34-a'");await expect(e.runtime.service.upload(e.proof,e.metadata,e.bytes,'image/jpeg',e.snapshot)).rejects.toThrow();
 expect(await f.q('SELECT result FROM clocker_command_ledger')).toEqual([{result:e.receipt}]);
});
it('direct Owner review API rejects forged Manager authority and unexpected keys',async()=>{
 const e=await evidence(),security={portalOrigin:'https://fictional.invalid',production:true},request=(body:unknown)=>new Request(security.portalOrigin,{method:'POST',headers:{origin:security.portalOrigin,'X-Nevora-Clocker':'1','Content-Type':'application/json'},body:JSON.stringify(body)});
 const denied=await handleClockerPhotoOwnerReview(request({operation:'list',query:{limit:20,cursor:null}}),{enabled:true,security,service:e.runtime.service,authenticate:async()=>({...e.owner,employeeId:'c34-a'})});expect(denied.status).toBe(401);
 const forged=await handleClockerPhotoOwnerReview(request({operation:'list',query:{limit:20,cursor:null},workspaceId:'foreign-company'}),{enabled:true,security,service:e.runtime.service,authenticate:async()=>e.owner});expect(forged.status).toBe(400);
});
