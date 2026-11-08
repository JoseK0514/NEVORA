import 'server-only';
import {isClosedRecord,isOperationId} from '../contracts';
import {checkedBootstrapUri} from './connection.server';
import {sameProvisionedResource,type ResourceRequest,type ResourceIdentity,type ProvisionedResource} from './model';
import type {ProvisioningProvider} from './provider';
export type ProvisionerPolicy={accountRef:string;region:string;version:string;maxComputeUnits:number;suspendSeconds:number;historySeconds:number;quota:{active_time_seconds:number;compute_time_seconds:number;written_data_bytes:number;data_transfer_bytes:number;logical_size_bytes:number}};
const policyFields=['accountRef','region','version','maxComputeUnits','suspendSeconds','historySeconds','quota'],quotaFields=['active_time_seconds','compute_time_seconds','written_data_bytes','data_transfer_bytes','logical_size_bytes'];
function policyValue(value:unknown):ProvisionerPolicy|null{
 if(!isClosedRecord(value,policyFields))return null;
 const quota=value.quota;if(!isClosedRecord(quota,quotaFields))return null;
 if(typeof value.accountRef!=='string'||!/^[a-z0-9-]{1,60}$/.test(value.accountRef)||typeof value.region!=='string'||!/^[a-z0-9-]{1,60}$/.test(value.region)||typeof value.version!=='string'||!/^[A-Za-z0-9._:-]{1,120}$/.test(value.version)||typeof value.maxComputeUnits!=='number'||![0.25,0.5,1].includes(value.maxComputeUnits)||typeof value.suspendSeconds!=='number'||!Number.isInteger(value.suspendSeconds)||value.suspendSeconds<60||value.suspendSeconds>600||typeof value.historySeconds!=='number'||!Number.isInteger(value.historySeconds)||value.historySeconds<1||value.historySeconds>2592000||!quotaFields.every(k=>typeof quota[k]==='number'&&Number.isSafeInteger(quota[k])&&Number(quota[k])>0))return null;
 return Object.freeze({...value,quota:Object.freeze({...quota})}) as ProvisionerPolicy;
}
export function readProvisionerPolicy(env:Readonly<Record<string,string|undefined>>=process.env):ProvisionerPolicy|null{try{return policyValue(JSON.parse(env.NEVORA_PROVISIONER_RESOURCE_POLICY??''));}catch{return null;}}
export class NeonProviderUnavailable extends Error{
 constructor(readonly status:number=503,readonly retryAfterSeconds:number=30){super('Provisioning provider unavailable');}
}
const object=(v:unknown):v is Record<string,unknown>=>!!v&&typeof v==='object'&&!Array.isArray(v);
const id=(v:unknown):v is string=>typeof v==='string'&&/^[a-z0-9-]{1,60}$/.test(v);
function rows(body:Record<string,unknown>,field:string):Record<string,unknown>[] {const value=body[field];if(!Array.isArray(value)||value.length>1000||!value.every(object))throw new NeonProviderUnavailable();return value;}
function cursor(body:Record<string,unknown>):string|null{const p=body.pagination;if(p===undefined)return null;if(!object(p)||!(p.cursor===undefined||p.cursor===null||typeof p.cursor==='string'))throw new NeonProviderUnavailable();return typeof p.cursor==='string'&&p.cursor.length?p.cursor:null;}
async function jsonBody(response:Response):Promise<Record<string,unknown>>{
 const reader=response.body?.getReader();if(!reader)throw new NeonProviderUnavailable();let size=0,text='';const decoder=new TextDecoder('utf-8',{fatal:true});
 try{for(;;){const part=await reader.read();if(part.done)break;size+=part.value.byteLength;if(size>1048576){await reader.cancel();throw new NeonProviderUnavailable();}text+=decoder.decode(part.value,{stream:true});}text+=decoder.decode();const v:unknown=JSON.parse(text);if(!object(v))throw new NeonProviderUnavailable();return v;}catch{throw new NeonProviderUnavailable();}finally{reader.releaseLock();}
}
/** Official REST v2; one create attempt per method call, no hidden retries,
 * redirect, parent branch, caller endpoint or invented idempotency parameter. */
export class NeonProvisioningProvider implements ProvisioningProvider{
 private readonly policy:ProvisionerPolicy;private readonly apiKey:string;private readonly fetcher:typeof fetch;
 constructor(input:{apiKey:string;policy:ProvisionerPolicy;fetch?:typeof fetch}){
  const policy=policyValue(input.policy);if(!policy||typeof input.apiKey!=='string'||input.apiKey.length<16||input.apiKey.length>4096||!/^[\x21-\x7e]+$/.test(input.apiKey))throw new NeonProviderUnavailable();this.policy=policy;this.apiKey=input.apiKey;this.fetcher=input.fetch??fetch;
 }
 private scope(request:ResourceRequest,identity:ResourceIdentity){
  if(!isOperationId(request.workspaceId)||!isOperationId(request.operationId)||request.accountRef!==this.policy.accountRef||request.region!==this.policy.region||!/^nv-[tdp]-[a-f0-9]{32}-[a-f0-9]{16}$/.test(identity.name)||!identity.name.startsWith('nv-'+request.environment[0]+'-'+request.workspaceId.replaceAll('-','')+'-')||identity.databaseName!=='nv_app_'+request.workspaceId.replaceAll('-','')||!/^nv_provision_[a-f0-9]{24}$/.test(identity.provisionerRole))throw new NeonProviderUnavailable();
 }
 private async call(path:string,method:'GET'|'POST'='GET',body?:unknown):Promise<Record<string,unknown>>{
  if(!path.startsWith('/projects')&&path!=='/regions')throw new NeonProviderUnavailable();
  let response:Response;try{response=await this.fetcher('https://console.neon.tech/api/v2'+path,{method,headers:{authorization:'Bearer '+this.apiKey,accept:'application/json',...(body?{'content-type':'application/json'}:{})},...(body?{body:JSON.stringify(body)}:{}),redirect:'error',cache:'no-store',signal:AbortSignal.timeout(10000)});}catch{throw new NeonProviderUnavailable();}
  if(!response.ok){const raw=response.headers.get('retry-after'),retry=raw&&/^\d+$/.test(raw)?Math.max(1,Math.min(900,Number(raw))):30;await response.body?.cancel().catch(()=>{});throw new NeonProviderUnavailable(response.status,retry);}
  return jsonBody(response);
 }
 private async inspect(projectId:string,identity:Pick<ResourceIdentity,'name'|'databaseName'|'provisionerRole'>):Promise<ProvisionedResource>{
  if(!id(projectId))throw new NeonProviderUnavailable();const base='/projects/'+projectId;
  const body=await this.call(base),p=body.project;if(!object(p)||p.id!==projectId||p.org_id!==this.policy.accountRef||p.region_id!==this.policy.region||p.name!==identity.name||typeof p.created_at!=='string')throw new NeonProviderUnavailable();
  const branchRows=rows(await this.call(base+'/branches'),'branches').filter(b=>b.name==='onboarding'&&(b.parent_id===undefined||b.parent_id===null)&&b.project_id===projectId);
  if(branchRows.length!==1||!id(branchRows[0].id))throw new NeonProviderUnavailable();const branchId=branchRows[0].id;
  const endpoints=rows(await this.call(base+'/endpoints'),'endpoints').filter(e=>e.branch_id===branchId&&e.project_id===projectId&&e.type==='read_write');
  if(endpoints.length!==1||!id(endpoints[0].id)||typeof endpoints[0].host!=='string'||!endpoints[0].host.startsWith(endpoints[0].id+'.')||!/^[a-z0-9.-]+\.neon\.tech$/.test(endpoints[0].host))throw new NeonProviderUnavailable();
  const databases=rows(await this.call(base+'/branches/'+branchId+'/databases'),'databases').filter(d=>d.name===identity.databaseName&&d.owner_name===identity.provisionerRole&&d.branch_id===branchId);if(databases.length!==1)throw new NeonProviderUnavailable();
  const operations=await this.call(base+'/operations?limit=1000');if(cursor(operations)||rows(operations,'operations').some(o=>o.status!=='finished'))throw new NeonProviderUnavailable();
  return {projectId,branchId,endpointId:endpoints[0].id,endpointHost:endpoints[0].host,accountRef:this.policy.accountRef,region:this.policy.region,name:identity.name,databaseName:identity.databaseName,provisionerRole:identity.provisionerRole,createdAt:p.created_at};
 }
 async find(request:ResourceRequest,identity:ResourceIdentity):Promise<ProvisionedResource[]>{
  this.scope(request,identity);const found:ProvisionedResource[]=[],seen=new Set<string>();let next:string|null=null;
  for(let page=0;page<3;page++){
   const q=new URLSearchParams({org_id:this.policy.accountRef,search:identity.name,limit:'400',...(next?{cursor:next}:{})}),body=await this.call('/projects?'+q),projects=rows(body,'projects');
   if(body.unavailable_project_ids!==undefined&&(!Array.isArray(body.unavailable_project_ids)||body.unavailable_project_ids.length))throw new NeonProviderUnavailable();
   for(const p of projects){if(p.name!==identity.name)continue;if(!id(p.id)||seen.has(p.id))throw new NeonProviderUnavailable();seen.add(p.id);found.push(await this.inspect(p.id,identity));}
   const after=cursor(body);if(!after){if(projects.length===400)throw new NeonProviderUnavailable();return found;}if(after===next)throw new NeonProviderUnavailable();next=after;
  }
  throw new NeonProviderUnavailable();
 }
 async create(request:ResourceRequest,identity:ResourceIdentity):Promise<ProvisionedResource>{
  this.scope(request,identity);
  // Region/entitlement readiness is an enablement check. Keep this method's
  // first network request the journaled POST, so a preflight read failure can
  // never masquerade as an ambiguous create attempt.
  const p=this.policy,body=await this.call('/projects','POST',{project:{name:identity.name,org_id:p.accountRef,region_id:p.region,pg_version:17,store_passwords:true,branch:{name:'onboarding',role_name:identity.provisionerRole,database_name:identity.databaseName},default_endpoint_settings:{autoscaling_limit_min_cu:p.maxComputeUnits,autoscaling_limit_max_cu:p.maxComputeUnits,suspend_timeout_seconds:p.suspendSeconds},history_retention_seconds:p.historySeconds,settings:{quota:{...p.quota}}}});
  const project=body.project;if(!object(project)||!id(project.id)||project.name!==identity.name||project.org_id!==p.accountRef||project.region_id!==p.region)throw new NeonProviderUnavailable();
  try{return await this.inspect(project.id,identity);}catch(error){throw new NeonProviderUnavailable(503,error instanceof NeonProviderUnavailable?error.retryAfterSeconds:30);}
 }
 async bootstrapCredential(resource:ProvisionedResource):Promise<string>{
  if(resource.accountRef!==this.policy.accountRef||resource.region!==this.policy.region)throw new NeonProviderUnavailable();const fresh=await this.inspect(resource.projectId,resource);if(!sameProvisionedResource(fresh,resource))throw new NeonProviderUnavailable();
  const q=new URLSearchParams({branch_id:resource.branchId,endpoint_id:resource.endpointId,database_name:resource.databaseName,role_name:resource.provisionerRole,pooled:'false'}),body=await this.call('/projects/'+resource.projectId+'/connection_uri?'+q);
  if(typeof body.uri!=='string')throw new NeonProviderUnavailable();try{return checkedBootstrapUri(body.uri,resource);}catch{throw new NeonProviderUnavailable();}
 }
}
