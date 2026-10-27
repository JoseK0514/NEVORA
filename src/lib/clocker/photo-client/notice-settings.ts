import type {PhotoCompanyNoticeSettings,PhotoNoticeProfileUpdate} from '../photo-server/contracts';
import {parsePhotoNotice,parsePhotoNoticeProfileUpdate,publicPhotoNoticeProfile,unconfiguredPhotoNoticeProfile} from '../photo-server/validation';
import {readPhotoPolicy} from './session';

export type NoticeSettingsDraft={assistanceContact:string;assistanceInstructions:string};
export function noticeSettingsDraft(settings:Pick<PhotoCompanyNoticeSettings,'profile'>):NoticeSettingsDraft{
 return {assistanceContact:settings.profile.assistanceContact??'',assistanceInstructions:settings.profile.assistanceInstructions??''};
}
export function noticeSettingsUpdate(draft:NoticeSettingsDraft,expectedVersion:number):PhotoNoticeProfileUpdate{
 try{return parsePhotoNoticeProfileUpdate({expectedVersion,assistanceContact:draft.assistanceContact.trim(),assistanceInstructions:draft.assistanceInstructions.replace(/\r?\n/g,' ').trim()});}
 catch{throw Error('Enter your actual assistance contact (up to 200 characters) and instructions (up to 1,000 characters), without placeholders.');}
}
export function readCompanyNoticeSettings(value:unknown):PhotoCompanyNoticeSettings{
 if(!value||typeof value!=='object'||Array.isArray(value))throw Error('Company photo notice settings could not be verified.');
 const raw=value as Record<string,unknown>;
 if(!(raw.companyName===null||typeof raw.companyName==='string'&&raw.companyName.trim().length>0&&raw.companyName.length<=160)||
  !['ready','missing_profile','lifecycle_unverified'].includes(String(raw.readiness)))throw Error('Company photo notice settings could not be verified.');
 const policy=readPhotoPolicy(raw.policy);
 const empty=raw.profile&&typeof raw.profile==='object'&&!Array.isArray(raw.profile)?raw.profile as Record<string,unknown>:null;
 const profile=empty?.version===0&&empty.assistanceContact===null&&empty.assistanceInstructions===null&&Object.keys(empty).length===3
  ?unconfiguredPhotoNoticeProfile():publicPhotoNoticeProfile(raw.profile);
 const notice=parsePhotoNotice(raw.notice,policy,profile.version);
 if(raw.notice!==null&&!notice||(raw.readiness==='ready')!==(notice!==null)||notice&&
  (notice.companyName!==raw.companyName||notice.assistanceContact!==profile.assistanceContact||notice.assistanceInstructions!==profile.assistanceInstructions))throw Error('The effective company photo notice could not be verified.');
 return {companyName:raw.companyName as string|null,policy,profile,notice,readiness:raw.readiness as PhotoCompanyNoticeSettings['readiness']};
}
export function verifySavedNoticeSettings(value:unknown,request:PhotoNoticeProfileUpdate):PhotoCompanyNoticeSettings{
 const settings=readCompanyNoticeSettings(value);
 if(settings.profile.version!==request.expectedVersion+1||settings.profile.assistanceContact!==request.assistanceContact||settings.profile.assistanceInstructions!==request.assistanceInstructions)
  throw Error('The saved assistance settings could not be confirmed. Reload their current values before trying again.');
 return settings;
}
