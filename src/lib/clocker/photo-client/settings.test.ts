import {expect,it} from 'vitest';
import {unconfiguredPhotoPolicy} from '../photo-server/validation';
import {photoSettingsDraft,photoSettingsUpdate,verifySavedPhotoPolicy} from './settings';

it('selects every punch by default without silently activating photo collection',()=>{
 expect(photoSettingsDraft(unconfiguredPhotoPolicy())).toEqual({enabled:false,events:['CLOCK_IN','START_BREAK','END_BREAK','CLOCK_OUT'],retentionDays:'30'});
});
it('preserves exact current policy version and canonical selected events for saving',()=>{
 expect(photoSettingsUpdate({enabled:true,events:['CLOCK_OUT','CLOCK_IN'],retentionDays:'7'},4))
  .toEqual({expectedVersion:4,enabled:true,events:['CLOCK_IN','CLOCK_OUT'],retentionDays:7,failureBehavior:'ALLOW_WITH_EXCEPTION'});
});
it.each(['','0','31','3.5','NaN','-2'])('requires explicit valid retention before enablement: %s',retentionDays=>{
 expect(()=>photoSettingsUpdate({enabled:true,events:['CLOCK_IN'],retentionDays},1)).toThrow();
});
it('preserves time through the approved fixed exception behavior and requires an event',()=>{
 expect(photoSettingsUpdate({enabled:true,events:['CLOCK_IN'],retentionDays:'7'},0).failureBehavior).toBe('ALLOW_WITH_EXCEPTION');
 expect(()=>photoSettingsUpdate({enabled:true,events:[],retentionDays:'7'},0)).toThrow();
});
it('verifies changed values and next server version before reporting persistence',()=>{
 const request=photoSettingsUpdate({enabled:true,events:['CLOCK_IN'],retentionDays:'7'},0);
 const saved={...unconfiguredPhotoPolicy(),version:1,enabled:true,events:['CLOCK_IN'],retentionDays:7,failureBehavior:'ALLOW_WITH_EXCEPTION'};
 expect(verifySavedPhotoPolicy(saved,request).version).toBe(1);
 expect(()=>verifySavedPhotoPolicy({...saved,version:0},request)).toThrow();
 expect(()=>verifySavedPhotoPolicy({...saved,retentionDays:14},request)).toThrow();
});
it('does not fabricate a legacy persisted retention value while preparing a new approved save',()=>{
 const policy={...unconfiguredPhotoPolicy(),version:2,retentionDays:null,failureBehavior:null};
 const draft=photoSettingsDraft(policy);expect(draft.retentionDays).toBe('');
 expect(photoSettingsUpdate(draft,2)).toMatchObject({enabled:false,retentionDays:null,failureBehavior:'ALLOW_WITH_EXCEPTION',expectedVersion:2});
});
it('canonicalizes a cleared new-company retention field before verifying its actual defaulted save response',()=>{
 const request=photoSettingsUpdate({enabled:false,events:['CLOCK_IN','START_BREAK','END_BREAK','CLOCK_OUT'],retentionDays:''},0);
 expect(request).toMatchObject({expectedVersion:0,retentionDays:30,failureBehavior:'ALLOW_WITH_EXCEPTION'});
 const saved={...unconfiguredPhotoPolicy(),version:1};
 expect(verifySavedPhotoPolicy(saved,request)).toEqual(saved);
});
