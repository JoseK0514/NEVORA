import {createHmac} from 'node:crypto';
import {CommerceError,parseEmail} from './model';
export type WorkspaceEnrollment={workspaceId:string;environment:'test'|'development'|'production';incarnation:string;origin:string;providerProjectId:string;manifestHash:string;verifiedEmail:string;businessName:string;ownerEmployeeId:string;instanceSecret:string;workerSecret:string;provisionedAt:string};
export function workspaceInstanceSecret(key:string,identity:{workspaceId:string;environment:string;incarnation:string}):string{
 if(!/^[A-Za-z0-9_-]{43}$/.test(key)||Buffer.from(key,'base64url').length!==32||!/^[1-9]\d{0,17}$/.test(identity.incarnation)||!/^[-a-f0-9]{36}$/i.test(identity.workspaceId)||!['test','development','production'].includes(identity.environment))throw new CommerceError('enrollment_configuration_invalid',503);
 return createHmac('sha256',Buffer.from(key,'base64url')).update(JSON.stringify(['nevora-commerce-instance-v1',identity.environment,identity.workspaceId,identity.incarnation])).digest('base64url');
}
export function enrollmentIdentity(input:WorkspaceEnrollment,key:Buffer){
 const u=new URL(input.origin),time=new Date(input.provisionedAt);
 if(!/^[-a-f0-9]{36}$/i.test(input.workspaceId)||!['test','development','production'].includes(input.environment)||!/^[1-9]\d{0,17}$/.test(input.incarnation)||u.origin!==input.origin||u.protocol!=='https:'||!/^[-a-z0-9]{1,100}$/.test(input.providerProjectId)||!/^[a-f0-9]{64}$/.test(input.manifestHash)||parseEmail(input.verifiedEmail)!==input.verifiedEmail||!input.businessName.trim()||input.businessName.length>160||!input.ownerEmployeeId||input.ownerEmployeeId.length>100||!Number.isFinite(time.getTime())||time.getTime()>Date.now()+60000||!/^[A-Za-z0-9_-]{43}$/.test(input.instanceSecret)||!/^[A-Za-z0-9_-]{43}$/.test(input.workerSecret)||input.workerSecret===input.instanceSecret)throw new CommerceError('enrollment_identity_invalid',503);
 return createHmac('sha256',key).update(JSON.stringify([input.workspaceId,input.environment,input.incarnation,input.origin,input.providerProjectId,input.manifestHash,input.verifiedEmail,input.businessName,input.ownerEmployeeId,input.instanceSecret,input.workerSecret,time.toISOString()])).digest('hex');
}
