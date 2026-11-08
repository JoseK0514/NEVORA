import {normalizePhoneNumber} from '../phone';
import {validateWorkspaceProfile} from '../workspace/validation';

export const REGISTRATION_STATES=['EMAIL_PENDING','EMAIL_VERIFIED','WORKSPACE_RESERVED','PROVISIONING','OWNER_ACTIVATION_REQUIRED','SETUP_IN_PROGRESS','READY'] as const;
export type RegistrationState=typeof REGISTRATION_STATES[number];
export const STEP_IDS=['BUSINESS','LOCATIONS','POSITIONS','SCHEDULING','PEOPLE','INVITATIONS','TIME_TRACKING','PAYROLL','OPTIONAL_FEATURES'] as const;
export type StepId=typeof STEP_IDS[number];
export const SECTION_STATES=['NOT_STARTED','IN_PROGRESS','READY','OPTIONAL','BLOCKED'] as const;
export type SectionState=typeof SECTION_STATES[number];
export const ONBOARDING_ACTIONS=['OPEN','SAVE','INVITE','RESEND','REVOKE','CHECK_STATUS','ACTIVATE','RETRY'] as const;
export type OnboardingAction=typeof ONBOARDING_ACTIONS[number];
export type ReadinessSection={id:StepId;state:SectionState;reasonCodes:string[];allowedActions:OnboardingAction[]};
export type ReadinessSections=ReadinessSection[];
export type OnboardingSnapshot={schemaVersion:1;version:string;registrationState:RegistrationState;workspace:{id:string;displayName:string;portalUrl:string}|null;sections:ReadinessSections;nextStep:StepId|null};
export type FieldError={field:string;code:string;params?:Record<string,string|number|boolean>};
export type OperationReceipt={operationId:string;commandKind:string;committedAt:string;resultingVersion:string;subjectId?:string};
export type OnboardingResult=
 |{state:'saved';receipt:OperationReceipt;snapshot:OnboardingSnapshot}
 |{state:'pending';operationId:string;stage:string;pollAfterMs:number}
 |{state:'invalid';fieldErrors:FieldError[]}
 |{state:'conflict';reason:'changed_replay'|'version_changed'|'slug_unavailable'|'target_changed';snapshot?:OnboardingSnapshot}
 |{state:'limited';retryAfterMs:number}
 |{state:'unavailable';reasonCode:string}
 |{state:'outcome_unknown';operationId:string};
export type OnboardingCommand<T>={schemaVersion:1;operationId:string;expectedVersion:string;payload:T};
export type RegistrationCommand={schemaVersion:1;operationId:string;email:string;locale:'en'|'es';termsVersion:string;privacyVersion:string};
export type InitialOwnerProfile={id:string;firstName:string;lastName:string;phone:string};
export type WorkspacePayload={businessName:string;timeZone:string;requestedSlug:string;initialLocation:{name:string;shortName:string;key:string};ownerProfile:InitialOwnerProfile};
export type WorkspaceCommand=OnboardingCommand<WorkspacePayload>;

/** Closed JSON records only; accessors and shaped authority objects are not input data. */
export function isClosedRecord(value:unknown,required:readonly string[],optional:readonly string[]=[]):value is Record<string,unknown>{
 try{
  if(!value||typeof value!=='object'||Array.isArray(value))return false;
  const prototype=Object.getPrototypeOf(value);if(prototype!==Object.prototype&&prototype!==null)return false;
  const keys=Reflect.ownKeys(value);
  return required.every(k=>keys.includes(k))&&keys.every(k=>typeof k==='string'&&(required.includes(k)||optional.includes(k))&&Object.prototype.hasOwnProperty.call(Object.getOwnPropertyDescriptor(value,k),'value'));
 }catch{return false;}
}
export const isOperationId=(value:unknown):value is string=>typeof value==='string'&&/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
export function isRevision(value:unknown):value is string{return typeof value==='string'&&/^(0|[1-9][0-9]{0,18})$/.test(value)&&BigInt(value)<=BigInt('9223372036854775807');}
export function readableText(value:unknown,max:number):value is string{return typeof value==='string'&&value.length>0&&[...value].length<=max&&value===value.trim()&&!/[\p{Cc}\p{Cf}]/u.test(value);}
export function registeredEmail(value:unknown):value is string{return readableText(value,254)&&/^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/.test(value);}
export function parseRegistrationCommand(value:unknown):RegistrationCommand|null{
 if(!isClosedRecord(value,['schemaVersion','operationId','email','locale','termsVersion','privacyVersion'])||value.schemaVersion!==1||!isOperationId(value.operationId)||typeof value.email!=='string'||!['en','es'].includes(String(value.locale))||!readableText(value.termsVersion,100)||!readableText(value.privacyVersion,100))return null;
 const email=value.email.trim();if(!registeredEmail(email))return null;
 return {schemaVersion:1,operationId:value.operationId.toLowerCase(),email,locale:value.locale as 'en'|'es',termsVersion:value.termsVersion,privacyVersion:value.privacyVersion};
}
export function parseOnboardingCommand<T>(value:unknown,parsePayload:(value:unknown)=>T|null):OnboardingCommand<T>|null{
 if(!isClosedRecord(value,['schemaVersion','operationId','expectedVersion','payload'])||value.schemaVersion!==1||!isOperationId(value.operationId)||!isRevision(value.expectedVersion))return null;
 try{const payload=parsePayload(value.payload);return payload===null?null:{schemaVersion:1,operationId:value.operationId.toLowerCase(),expectedVersion:value.expectedVersion,payload};}catch{return null;}
}
const reservedSlugs=new Set(['www','api','admin','signup','app','support','static','assets','mail']);
export function validWorkspaceSlug(value:unknown):value is string{return typeof value==='string'&&value.length<=63&&/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(value)&&!reservedSlugs.has(value);}
function workspacePayload(value:unknown):WorkspacePayload|null{
 if(!isClosedRecord(value,['businessName','timeZone','requestedSlug','initialLocation','ownerProfile'])||!validWorkspaceSlug(value.requestedSlug))return null;
 const location=value.initialLocation,owner=value.ownerProfile;
 if(!isClosedRecord(location,['name','shortName','key'])||!readableText(location.name,160)||!readableText(location.shortName,48)||typeof location.key!=='string'||location.key.length>64||!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(location.key))return null;
 if(!isClosedRecord(owner,['id','firstName','lastName','phone'])||!readableText(owner.id,128)||!readableText(owner.firstName,160)||!readableText(owner.lastName,160)||typeof owner.phone!=='string')return null;
 const id=owner.id.toUpperCase(),phone=normalizePhoneNumber(owner.phone);if(!readableText(id,128)||!phone)return null;
 try{const profile=validateWorkspaceProfile({name:value.businessName,timeZone:value.timeZone});return {businessName:profile.name,timeZone:profile.timeZone,requestedSlug:value.requestedSlug,initialLocation:{name:location.name,shortName:location.shortName,key:location.key},ownerProfile:{id,firstName:owner.firstName,lastName:owner.lastName,phone}};}catch{return null;}
}
export const parseWorkspaceCommand=(value:unknown)=>parseOnboardingCommand(value,workspacePayload);
export function safeOnboardingDestination(value:unknown,origin:string):string|null{
 if(typeof value!=='string'||value.length>2000||/[\u0000-\u0020\\]/.test(value)||/^\/\//.test(value)||/%(?:2f|5c|00|0a|0d)/i.test(value))return null;
 try{const base=new URL(origin),url=new URL(value,base);return ['https:','http:'].includes(url.protocol)&&url.origin===base.origin&&!url.username&&!url.password?url.href:null;}catch{return null;}
}
function member<T extends string>(value:unknown,list:readonly T[]):value is T{return typeof value==='string'&&list.includes(value as T);}
export function parseOnboardingSnapshot(value:unknown):OnboardingSnapshot|null{
 if(!isClosedRecord(value,['schemaVersion','version','registrationState','workspace','sections','nextStep'])||value.schemaVersion!==1||!isRevision(value.version)||!member(value.registrationState,REGISTRATION_STATES)||!(value.nextStep===null||member(value.nextStep,STEP_IDS))||!Array.isArray(value.sections)||value.sections.length>STEP_IDS.length)return null;
 let workspace:OnboardingSnapshot['workspace']=null;
 if(value.workspace!==null){const w=value.workspace;if(!isClosedRecord(w,['id','displayName','portalUrl'])||!isOperationId(w.id)||!readableText(w.displayName,160)||typeof w.portalUrl!=='string')return null;try{const url=new URL(w.portalUrl);if(url.protocol!=='https:'||url.username||url.password||url.search||url.hash||url.pathname!=='/')return null;}catch{return null;}workspace={id:w.id,displayName:w.displayName,portalUrl:w.portalUrl};}
 const sections:ReadinessSections=[];const seen=new Set<string>();
 for(const s of value.sections){if(!isClosedRecord(s,['id','state','reasonCodes','allowedActions'])||!member(s.id,STEP_IDS)||seen.has(s.id)||!member(s.state,SECTION_STATES)||!Array.isArray(s.reasonCodes)||s.reasonCodes.length>30||!s.reasonCodes.every(x=>typeof x==='string'&&/^[A-Z][A-Z0-9_]{0,79}$/.test(x))||!Array.isArray(s.allowedActions)||!s.allowedActions.every(x=>member(x,ONBOARDING_ACTIONS)))return null;seen.add(s.id);sections.push({id:s.id,state:s.state,reasonCodes:[...s.reasonCodes],allowedActions:[...s.allowedActions]});}
 return {schemaVersion:1,version:value.version,registrationState:value.registrationState,workspace,sections,nextStep:value.nextStep};
}
export function onboardingHttpStatus(result:OnboardingResult):number{switch(result.state){case 'saved':return 200;case 'pending':case 'outcome_unknown':return 202;case 'invalid':return 400;case 'conflict':return 409;case 'limited':return 429;case 'unavailable':return result.reasonCode==='AUTH_REQUIRED'?401:result.reasonCode==='ACCESS_DENIED'?403:503;}}
