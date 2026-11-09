import 'server-only';
import {isClosedRecord} from '../onboarding/contracts';
import type {ControlStore} from '../onboarding/control-store.server';
import {WorkspaceRoutingError,parseWorkspaceOrigin,type WorkspaceRoutingConfig} from './config.server';
import {parseWorkspaceRecord,type WorkspaceRecord,type WorkspacePurpose} from './contracts';

declare const bindingBrand:unique symbol;
export type WorkspaceBinding=Readonly<{[bindingBrand]:true}>;
type Facts=Readonly<{record:Readonly<WorkspaceRecord>;store:ControlStore;config:Readonly<WorkspaceRoutingConfig>;purpose:WorkspacePurpose;role:'APP'|'WORKER';secretRef:string;loginRole:string}>;
const bindings=new WeakMap<object,Facts>();
const columns='id::text,canonical_origin,environment,incarnation::text,revision::text,lifecycle,provider_project_id,app_secret_ref::text,app_role_name,worker_secret_ref::text,worker_role_name,registration_id::text';
function permits(record:WorkspaceRecord,purpose:WorkspacePurpose):boolean{return purpose==='BOOTSTRAP'?record.lifecycle==='OWNER_ACTIVATION_REQUIRED':record.lifecycle==='ACTIVE';}
export async function resolveWorkspaceBinding(identity:{origin:string;forwardedHost?:string},store:ControlStore,config:WorkspaceRoutingConfig,purpose:WorkspacePurpose='APP'):Promise<WorkspaceBinding>{
 try{
  if(config.secretScope==='COMMERCE_APP_ONLY'&&purpose!=='APP')throw new WorkspaceRoutingError();
  if(config.secretScope==='WORKER_ONLY'&&purpose!=='WORKER')throw new WorkspaceRoutingError();
  if(!isClosedRecord(identity,['origin'],['forwardedHost'])||!['APP','WORKER','BOOTSTRAP'].includes(purpose))throw new WorkspaceRoutingError();
  const origin=parseWorkspaceOrigin(identity.origin,config);if(!origin)throw new WorkspaceRoutingError();
  if(identity.forwardedHost!==undefined){if(typeof identity.forwardedHost!=='string'||!/^[a-z0-9.-]+(?::[0-9]{1,5})?$/i.test(identity.forwardedHost)||new URL(new URL(origin).protocol+'//'+identity.forwardedHost).host!==new URL(origin).host)throw new WorkspaceRoutingError();}
  const relation=config.secretScope==='WORKER_ONLY'?'nevora_onboarding.worker_workspace_registry':'nevora_onboarding.workspace_registry';
  const rows=await store.query(`SELECT ${columns} FROM ${relation} WHERE canonical_origin=$1 AND environment=$2`,[origin,config.environment]);
  const record=rows.rows.length===1?parseWorkspaceRecord(rows.rows[0]):null;
  if(!record||record.canonicalOrigin!==origin||record.environment!==config.environment||!permits(record,purpose))throw new WorkspaceRoutingError();
  const role=purpose==='WORKER'?'WORKER':'APP',secretRef=role==='WORKER'?record.workerSecretRef:record.appSecretRef,loginRole=role==='WORKER'?record.workerRoleName:record.appRoleName;if(!secretRef||!loginRole)throw new WorkspaceRoutingError();
  const binding=Object.freeze(Object.create(null)) as WorkspaceBinding;bindings.set(binding,Object.freeze({record:Object.freeze(record),store,config:Object.freeze({...config}),purpose,role,secretRef,loginRole}));return binding;
 }catch{throw new WorkspaceRoutingError();}
}
/** Server-only custody read, never a client DTO or an authorization grant. */
export function workspaceBindingFacts(binding:WorkspaceBinding):Facts{const facts=binding&&typeof binding==='object'?bindings.get(binding):undefined;if(!facts)throw new WorkspaceRoutingError();return facts;}
export async function assertWorkspaceBindingCurrent(binding:WorkspaceBinding):Promise<Facts>{
 const facts=workspaceBindingFacts(binding),r=facts.record;
 try{const relation=facts.config.secretScope==='WORKER_ONLY'?'nevora_onboarding.worker_workspace_registry':'nevora_onboarding.workspace_registry';const result=await facts.store.query(`SELECT ${columns} FROM ${relation} WHERE id=$1 AND environment=$2`,[r.id,r.environment]);const current=result.rows.length===1?parseWorkspaceRecord(result.rows[0]):null;
  if(!current||current.revision!==r.revision||current.incarnation!==r.incarnation||current.canonicalOrigin!==r.canonicalOrigin||current.providerProjectId!==r.providerProjectId||!permits(current,facts.purpose)||(facts.role==='APP'?current.appSecretRef!==facts.secretRef||current.appRoleName!==facts.loginRole:current.workerSecretRef!==facts.secretRef||current.workerRoleName!==facts.loginRole))throw new WorkspaceRoutingError();return facts;
 }catch{throw new WorkspaceRoutingError();}
}
