import {expect,it,vi} from 'vitest';
import {createPlatformPhotoLifecycle,readPhotoPlatformBinding} from './platform-lifecycle';
const env={NEVORA_ENVIRONMENT:'staging',NEVORA_CLOCKER_PHOTO_RUNTIME:'neon-staging-v1',NEVORA_CLOCKER_PHOTO_PROJECT:'project-test',NEVORA_CLOCKER_PHOTO_BRANCH:'br-test',NEVORA_CLOCKER_PHOTO_WORKSPACE:'company-test'};
it('requires an explicit isolated staging binding and never activates from a photo preference',()=>{
 expect(readPhotoPlatformBinding({})).toBeNull();
 expect(readPhotoPlatformBinding({...env,NEVORA_ENVIRONMENT:'production'})).toBeNull();
 expect(readPhotoPlatformBinding({...env,NEVORA_CLOCKER_PHOTO_BRANCH:''})).toBeNull();
 expect(readPhotoPlatformBinding(env)).toEqual({workspaceId:'company-test',projectId:'project-test',branchId:'br-test'});
});
it('reads only fresh platform attestation for the exact Company and fails closed on missing health',async()=>{
 const query=vi.fn().mockResolvedValue([{cleanup_disclosure:'Verified test cleanup disclosure.',backup_disclosure:'Verified test backup disclosure.'}]);
 const executor={query,transaction:vi.fn()};
 const provider=createPlatformPhotoLifecycle(executor,readPhotoPlatformBinding(env)!);
 expect(await provider({workspaceId:'other',policyVersion:1,retentionDays:7})).toBeNull();expect(query).not.toHaveBeenCalled();
 expect(await provider({workspaceId:'company-test',policyVersion:1,retentionDays:7})).toEqual({cleanupDisclosure:'Verified test cleanup disclosure.',backupDisclosure:'Verified test backup disclosure.'});
 expect(query.mock.calls[0][0].values).toEqual(['company-test','project-test','br-test']);
 query.mockResolvedValue([{cleanup_disclosure:null,backup_disclosure:'Malformed platform record.'}]);expect(await provider({workspaceId:'company-test',policyVersion:1,retentionDays:7})).toBeNull();
 query.mockResolvedValue([]);expect(await provider({workspaceId:'company-test',policyVersion:1,retentionDays:7})).toBeNull();
 query.mockRejectedValue(Error('offline'));expect(await provider({workspaceId:'company-test',policyVersion:1,retentionDays:7})).toBeNull();
});
