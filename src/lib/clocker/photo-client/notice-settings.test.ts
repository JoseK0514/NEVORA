import {expect,it} from 'vitest';
import {unconfiguredPhotoPolicy,unconfiguredPhotoNoticeProfile} from '../photo-server/validation';
import {noticeSettingsDraft,noticeSettingsUpdate,readCompanyNoticeSettings,verifySavedNoticeSettings} from './notice-settings';

const policy={...unconfiguredPhotoPolicy(),version:2};
const profile={version:1,assistanceContact:'Fictional Owner desk',assistanceInstructions:'Ask the fictional desk for assistance.'};
const notice={policyVersion:2,profileVersion:1,companyName:'Fictional Example',retentionDays:30,assistanceContact:profile.assistanceContact,
 assistanceInstructions:profile.assistanceInstructions,cleanupDisclosure:'Verified fictional cleanup.',backupDisclosure:'Verified fictional backup treatment.'};
const settings={companyName:'Fictional Example',policy,profile,notice,readiness:'ready' as const};
it('uses actual current company data and leaves unconfigured assistance fields visibly empty',()=>{
 expect(readCompanyNoticeSettings(settings)).toEqual(settings);
 expect(noticeSettingsDraft({profile:unconfiguredPhotoNoticeProfile()})).toEqual({assistanceContact:'',assistanceInstructions:''});
});
it('bounds actual assistance inputs and sends only editable fields with exact CAS version',()=>{
 expect(noticeSettingsUpdate({assistanceContact:' Fictional desk ',assistanceInstructions:'First line\nSecond line'},3))
 .toEqual({expectedVersion:3,assistanceContact:'Fictional desk',assistanceInstructions:'First line Second line'});
});
it.each([
 {assistanceContact:'',assistanceInstructions:'Instructions'},
 {assistanceContact:'[assistance contact]',assistanceInstructions:'Instructions'},
 {assistanceContact:'x'.repeat(201),assistanceInstructions:'Instructions'},
 {assistanceContact:'Desk',assistanceInstructions:'x'.repeat(1001)},
])('rejects missing, placeholder or oversized assistance instead of inventing defaults: %j',draft=>{
 expect(()=>noticeSettingsUpdate(draft,0)).toThrow();
});
it('does not claim lifecycle readiness from a saved assistance profile',()=>{
 const pending={...settings,notice:null,readiness:'lifecycle_unverified' as const};
 expect(readCompanyNoticeSettings(pending).notice).toBeNull();
 expect(()=>readCompanyNoticeSettings({...pending,readiness:'ready'})).toThrow();
});
it('rejects a notice for another company, retention, profile or current policy',()=>{
 for(const delta of [{companyName:'Different Company'},{policyVersion:3},{retentionDays:7},{assistanceContact:'Different desk'}]){
  expect(()=>readCompanyNoticeSettings({...settings,notice:{...notice,...delta}})).toThrow();
 }
});
it('confirms a profile save only from the exact changed values and next version',()=>{
 const request=noticeSettingsUpdate({assistanceContact:profile.assistanceContact,assistanceInstructions:profile.assistanceInstructions},0);
 expect(verifySavedNoticeSettings(settings,request)).toEqual(settings);
 expect(()=>verifySavedNoticeSettings({...settings,profile:{...profile,version:0}},request)).toThrow();
 expect(()=>verifySavedNoticeSettings({...settings,profile:{...profile,assistanceContact:'Other'},notice:null,readiness:'lifecycle_unverified'},request)).toThrow();
});
