import { PHOTO_ACTIONS, type PhotoPolicy, type PhotoPolicyUpdate } from '../photo-server/contracts';
import { readPhotoPolicy } from './session';

export type PhotoSettingsDraft = { enabled:boolean; events:PhotoPolicy['events']; retentionDays:string };
export function photoSettingsDraft(policy:PhotoPolicy):PhotoSettingsDraft {
  return {enabled:policy.enabled,events:[...policy.events],retentionDays:policy.retentionDays===null?'':String(policy.retentionDays)};
}
export function photoSettingsUpdate(draft:PhotoSettingsDraft,expectedVersion:number):PhotoPolicyUpdate {
  const retentionDays=draft.retentionDays===''?expectedVersion===0?30:null:Number(draft.retentionDays);
  if(draft.retentionDays!==''&&(!/^\d+$/.test(draft.retentionDays)||!Number.isInteger(retentionDays)||retentionDays===null||retentionDays<1||retentionDays>30))
    throw Error('Choose a whole number of retention days between 1 and 30.');
  if(draft.enabled&&(!draft.events.length||retentionDays===null))
    throw Error('Choose at least one punch event and a retention period before enabling photos.');
  if(new Set(draft.events).size!==draft.events.length||draft.events.some(action=>!PHOTO_ACTIONS.includes(action)))throw Error('Choose supported punch events.');
  return {expectedVersion,enabled:draft.enabled,events:PHOTO_ACTIONS.filter(action=>draft.events.includes(action)),retentionDays,
    failureBehavior:'ALLOW_WITH_EXCEPTION'};
}
/** A success banner requires the server's new version and exact saved values. */
export function verifySavedPhotoPolicy(value:unknown,requested:PhotoPolicyUpdate):PhotoPolicy {
  const policy=readPhotoPolicy(value);
  if(policy.version!==requested.expectedVersion+1||policy.enabled!==requested.enabled||policy.retentionDays!==requested.retentionDays||
    policy.failureBehavior!==requested.failureBehavior||JSON.stringify(policy.events)!==JSON.stringify(requested.events))
    throw Error('The saved settings could not be confirmed. Reload the current company settings before trying again.');
  return policy;
}
