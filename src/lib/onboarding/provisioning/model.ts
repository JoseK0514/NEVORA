import {createHmac} from 'node:crypto';
import {isOperationId} from '../contracts';
import {validOnboardingToken} from '../crypto.server';
export type ResourceRequest={operationId:string;workspaceId:string;environment:'test'|'development'|'production';accountRef:string;region:string;createdAt:string};
export type ResourceIdentity={name:string;provisionerRole:string;appRole:string;workerRole:string;databaseName:string};
export type ProvisionedResource={projectId:string;branchId:string;endpointId:string;endpointHost:string;accountRef:string;region:string;name:string;databaseName:string;provisionerRole:string;createdAt:string};
export function resourceIdentity(request:ResourceRequest,key:string):ResourceIdentity{
 if(!validOnboardingToken(key)||!isOperationId(request.workspaceId)||!isOperationId(request.operationId))throw Error('Provisioning identity unavailable');
 const digest=(purpose:string)=>createHmac('sha256',Buffer.from(key,'base64url')).update(JSON.stringify(['nevora-resource-v1',purpose,request.environment,request.workspaceId,request.operationId,request.accountRef,request.region])).digest('hex');
 return {name:'nv-'+request.environment[0]+'-'+request.workspaceId.replaceAll('-','')+'-'+digest('name').slice(0,16),provisionerRole:'nv_provision_'+digest('provisioner').slice(0,24),appRole:'nv_app_'+digest('app').slice(0,24),workerRole:'nv_worker_'+digest('worker').slice(0,24),databaseName:'nv_app_'+request.workspaceId.replaceAll('-','')};
}
export function resourceMatches(resource:ProvisionedResource,request:ResourceRequest,identity:ResourceIdentity,now=Date.now()):boolean{
 const id=(s:unknown)=>typeof s==='string'&&/^[a-z0-9-]{1,60}$/.test(s),created=Date.parse(resource.createdAt),start=Date.parse(request.createdAt);
 return id(resource.projectId)&&id(resource.branchId)&&id(resource.endpointId)&&typeof resource.endpointHost==='string'&&resource.endpointHost.startsWith(resource.endpointId+'.')&&/^[a-z0-9.-]+\.neon\.tech$/.test(resource.endpointHost)&&resource.accountRef===request.accountRef&&resource.region===request.region&&resource.name===identity.name&&resource.databaseName===identity.databaseName&&resource.provisionerRole===identity.provisionerRole&&Number.isFinite(created)&&Number.isFinite(start)&&created>=start-120000&&created<=now+120000;
}
/** Only explicit HTTP rejection proves no successful create acknowledgement.
 * Network errors and 5xx remain unknown; they never authorize another POST. */
export function classifyProviderFailure(error:unknown):'REJECTED'|'UNKNOWN'{
 const status=error&&typeof error==='object'&&'status' in error?error.status:undefined;
 return typeof status==='number'&&[400,401,403,404,409,422,429].includes(status)?'REJECTED':'UNKNOWN';
}
export function sameProvisionedResource(a:ProvisionedResource,b:ProvisionedResource):boolean{
 const fields:readonly (keyof ProvisionedResource)[]=['projectId','branchId','endpointId','endpointHost','accountRef','region','name','databaseName','provisionerRole','createdAt'];
 return !!a&&!!b&&fields.every(key=>typeof a[key]==='string'&&a[key]===b[key]);
}
