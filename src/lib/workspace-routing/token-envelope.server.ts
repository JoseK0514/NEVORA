import 'server-only';
import {sealOnboardingValue,openOnboardingValue} from '../onboarding/crypto.server';
import {isClosedRecord} from '../onboarding/contracts';
import {workspaceBindingFacts,type WorkspaceBinding} from './resolver.server';
import {currentWorkspaceBinding} from './context.server';
import {workspaceMode} from './config.server';
export type TokenPurpose='SESSION'|'RECOVERY'|'INVITATION'|'PASSKEY_LOGIN'|'PASSKEY_REGISTER'|'CLOCKER_DEVICE'|'CLOCKER_SETUP'|'CLOCKER_IDENTITY'|'CLOCKER_ENROLLMENT'|'CALENDAR'|'INSTALLATION'|'CLEANUP'|'FILE';
const purposes:readonly string[]=['SESSION','RECOVERY','INVITATION','PASSKEY_LOGIN','PASSKEY_REGISTER','CLOCKER_DEVICE','CLOCKER_SETUP','CLOCKER_IDENTITY','CLOCKER_ENROLLMENT','CALENDAR','INSTALLATION','CLEANUP','FILE'];
function aad(binding:WorkspaceBinding,purpose:TokenPurpose){const {record:r}=workspaceBindingFacts(binding);if(!purposes.includes(purpose))throw Error('Workspace token unavailable');return JSON.stringify(['workspace-token',1,r.environment,r.id,r.incarnation,r.canonicalOrigin,purpose]);}
export function sealWorkspaceToken(binding:WorkspaceBinding,purpose:TokenPurpose,token:string,expiresAt:number,now=Date.now()):string{
 const f=workspaceBindingFacts(binding);
 if(typeof token!=='string'||!token.length||token.length>2048||!Number.isSafeInteger(expiresAt)||expiresAt<=now||expiresAt>now+25*366*86400000)throw Error('Workspace token unavailable');
 return 'nw1_'+sealOnboardingValue(JSON.stringify({token,expiresAt}),aad(binding,purpose),f.config.tokenKey);
}
export function openWorkspaceToken(binding:WorkspaceBinding,purpose:TokenPurpose,value:unknown,now=Date.now()):string|null{
 const f=workspaceBindingFacts(binding);if(typeof value!=='string'||!value.startsWith('nw1_')||value.length>4096)return null;
 const raw=openOnboardingValue(value.slice(4),aad(binding,purpose),f.config.tokenKey);if(!raw)return null;
 try{const p:unknown=JSON.parse(raw);if(!isClosedRecord(p,['token','expiresAt'])||typeof p.token!=='string'||!p.token.length||p.token.length>2048||typeof p.expiresAt!=='number'||!Number.isSafeInteger(p.expiresAt)||p.expiresAt<=now)return null;return p.token;}catch{return null;}
}
export async function publicWorkspaceToken(purpose:TokenPurpose,inner:string,expiresAt:number):Promise<string>{return workspaceMode()==='single_company'?inner:sealWorkspaceToken(await currentWorkspaceBinding(),purpose,inner,expiresAt);}
export async function privateWorkspaceToken(purpose:TokenPurpose,value:unknown):Promise<string|null>{return workspaceMode()==='single_company'?(typeof value==='string'?value:null):openWorkspaceToken(await currentWorkspaceBinding(),purpose,value);}
