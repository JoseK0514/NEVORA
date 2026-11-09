import sharp from 'sharp';
import {randomUUID} from 'node:crypto';
import {afterEach,beforeEach,expect,it} from 'vitest';
import {createPunchFixture} from './clocker-punch-fixture';
import {photoFixture} from './clocker-photo-fixture';
import {ClockerPunchService} from '../../lib/clocker/punches.server';
import {createPlatformPhotoLifecycle} from '../../lib/clocker/photo-server/platform-lifecycle';
let f:Awaited<ReturnType<typeof createPunchFixture>>;
beforeEach(async()=>{f=await createPunchFixture({companyAccess:true});});
afterEach(async()=>{await f?.db.dispose();});
async function platform(){
 await f.q(`INSERT INTO clocker_photo_platform_lifecycle(workspace_id,project_id,branch_id,worker_role_name,enabled,cleanup_disclosure,backup_disclosure,attested_until)
 VALUES('workspace-fuel','project-test','br-test',session_user,true,'Verified fictional cleanup.','Verified fictional backup disclosure.',now()+interval '1 day')`);
 return createPlatformPhotoLifecycle(f.db.executor,{workspaceId:'workspace-fuel',projectId:'project-test',branchId:'br-test'});
}
it('platform cleanup is independently scoped, idempotent and preserves exact time receipts',async()=>{
 const {runtime,owner}=await photoFixture(f),proof=(await f.identity()).proof,service=new ClockerPunchService(f.key,f.db.executor,{photoEvidence:true}),view=await service.read(proof);
 const command={commandId:randomUUID(),verificationId:view.verificationId,action:'CLOCK_IN',expected:{revision:0,timeEntryId:null,timeEntryVersion:null,breakEntryId:null,breakEntryVersion:null}};
 const receipt=await service.execute(proof,command),bytes=await sharp({create:{width:64,height:48,channels:3,background:'#567a65'}}).jpeg().toBuffer();
 await runtime.service.upload(proof,{commandId:command.commandId,verificationId:command.verificationId},bytes,'image/jpeg',{policyVersion:1,profileVersion:1});
 await f.q("UPDATE clocker_punch_photos SET expires_at=performed_at+interval '1 millisecond'");
 await expect(f.q("SELECT clocker_photo_platform_cleanup('workspace-fuel','missing')")).rejects.toThrow();
 const provider=await platform(),scope={workspaceId:'workspace-fuel',policyVersion:1,retentionDays:7};
 expect(await provider(scope)).toBeNull();
 const first=await f.q("SELECT clocker_photo_platform_cleanup('workspace-fuel','run-1') AS result");
 expect(first).toEqual([{result:{expired:1,orphanFinalized:0,backlog:false}}]);
 expect(await f.q("SELECT clocker_photo_platform_cleanup('workspace-fuel','run-1') AS result")).toEqual(first);
 expect(await f.q('SELECT count(*)::integer AS n FROM clocker_photo_cleanup_runs')).toEqual([{n:1}]);
 expect(await f.q('SELECT state,jpeg IS NULL AS erased FROM clocker_punch_photos')).toEqual([{state:'expired',erased:true}]);
 expect(await f.q('SELECT result FROM clocker_command_ledger')).toEqual([{result:receipt}]);
 expect(await provider(scope)).toMatchObject({cleanupDisclosure:'Verified fictional cleanup.'});
 expect(await runtime.service.readPrivatePhoto(owner,{deviceId:proof.device.deviceId,commandId:command.commandId})).toBeNull();
 await expect(f.q('DELETE FROM clocker_photo_cleanup_runs')).rejects.toThrow();
});
it('missing, expired, stale or wrong-Company operational evidence cannot make capture ready',async()=>{
 const provider=await platform(),scope={workspaceId:'workspace-fuel',policyVersion:1,retentionDays:7};
 expect(await provider(scope)).toBeNull();
 await f.q("UPDATE clocker_photo_platform_lifecycle SET last_success_at=now()-interval '76 minutes'");expect(await provider(scope)).toBeNull();
 await f.q("UPDATE clocker_photo_platform_lifecycle SET last_success_at=now(),attested_until=now()-interval '1 minute'");expect(await provider(scope)).toBeNull();
 expect(await provider({...scope,workspaceId:'foreign'})).toBeNull();
 await f.q("UPDATE clocker_photo_platform_lifecycle SET worker_role_name='unrelated'");
 await expect(f.q("SELECT clocker_photo_platform_cleanup('workspace-fuel','run-2')")).rejects.toThrow();
});
it('the worker can execute only scoped cleanup while the application cannot attest health or invoke it',async()=>{
 await platform();const suffix=randomUUID().replaceAll('-',''),worker='photo_worker_'+suffix,app='photo_app_'+suffix;
 await f.q(`CREATE ROLE ${worker}; CREATE ROLE ${app}; GRANT USAGE ON SCHEMA public TO ${worker},${app};
  GRANT EXECUTE ON FUNCTION clocker_photo_platform_cleanup(text,text) TO ${worker};
  GRANT SELECT ON clocker_photo_platform_lifecycle TO ${app}`);
 await f.q('UPDATE clocker_photo_platform_lifecycle SET worker_role_name=$1',[worker]);
 const as=(role:string,text:string)=>f.db.executor.transaction([{text:`SET LOCAL SESSION AUTHORIZATION ${role}`,values:[]},{text,values:[]}]);
 await expect(as(app,"SELECT clocker_photo_platform_cleanup('workspace-fuel','app-forged')")).rejects.toThrow(/permission denied/);
 await expect(as(app,"UPDATE clocker_photo_platform_lifecycle SET last_success_at=now()")).rejects.toThrow(/permission denied/);
 await expect(as(worker,'SELECT * FROM clocker_punch_photos')).rejects.toThrow(/permission denied/);
 expect((await as(worker,"SELECT clocker_photo_platform_cleanup('workspace-fuel','worker-real') AS result"))[1]).toEqual([{result:{expired:0,orphanFinalized:0,backlog:false}}]);
});
