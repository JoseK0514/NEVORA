import 'server-only';
import {neon,type NeonQueryFunction} from '@neondatabase/serverless';
import {createHash} from 'node:crypto';
import type {SqlExecutor,SqlStatement} from '../notifications/types';
import {openOnboardingValue} from '../onboarding/crypto.server';
import {WorkspaceRoutingError} from './config.server';
import {assertWorkspaceBindingCurrent,workspaceBindingFacts,type WorkspaceBinding} from './resolver.server';

const transports=new Map<string,NeonQueryFunction<false,false>>();
async function driver(binding:WorkspaceBinding):Promise<NeonQueryFunction<false,false>>{
 const f=await assertWorkspaceBindingCurrent(binding),r=f.record;
 if(f.config.secretScope==='COMMERCE_APP_ONLY'&&f.role!=='APP')throw new WorkspaceRoutingError();
 const relation=f.config.secretScope==='COMMERCE_APP_ONLY'?'nevora_onboarding.commerce_app_workspace_secrets':'nevora_onboarding.workspace_secrets';
 const secret=await f.store.query(`SELECT ciphertext,login_role::text FROM ${relation} WHERE id=$1 AND workspace_id=$2 AND environment=$3 AND incarnation=$4::bigint AND role_kind=$5 AND active`,[f.secretRef,r.id,r.environment,r.incarnation,f.role]);
 if(secret.rows.length!==1||secret.rows[0].login_role!==f.loginRole)throw new WorkspaceRoutingError();
 const raw=openOnboardingValue(secret.rows[0].ciphertext,'workspace-secret:'+r.environment+':'+r.id+':'+r.incarnation+':'+f.role+':'+f.secretRef,f.config.encryptionKey);if(!raw)throw new WorkspaceRoutingError();
 try{const url=new URL(raw);if(!['postgres:','postgresql:'].includes(url.protocol)||!url.hostname.endsWith('.neon.tech')||url.hash||decodeURIComponent(url.username)!==f.loginRole||!url.pathname.slice(1)||(r.environment==='production'&&url.searchParams.get('sslmode')!=='verify-full'))throw new WorkspaceRoutingError();}catch{throw new WorkspaceRoutingError();}
 const key=createHash('sha256').update(r.environment+'\0'+r.id+'\0'+r.incarnation+'\0'+f.role+'\0'+f.secretRef+'\0'+raw).digest('hex');const existing=transports.get(key);if(existing)return existing;
 // Bound memory without retaining bindings, request headers or actor/session state.
 if(transports.size>=128)transports.delete(transports.keys().next().value!);
 const sql=neon(raw);transports.set(key,sql);return sql;
}
function guard(binding:WorkspaceBinding):SqlStatement{
 const f=workspaceBindingFacts(binding),r=f.record,lifecycle=f.purpose==='BOOTSTRAP'?'OWNER_ACTIVATION_REQUIRED':'ACTIVE';
 return {text:`SELECT (CASE WHEN EXISTS(SELECT 1 FROM onboarding_workspace_identity a JOIN workspaces w ON w.id=a.workspace_id AND w.singleton AND w.active WHERE a.singleton AND a.workspace_id=$1 AND a.environment=$2 AND a.incarnation=$3::bigint AND a.provider_project_id=$4 AND a.lifecycle=$5) AND EXISTS(SELECT 1 FROM onboarding_runtime_roles b JOIN pg_catalog.pg_roles p ON p.rolname=b.login_role WHERE b.kind=$6 AND b.login_role=$7 AND p.rolname=current_user AND current_user=session_user AND p.rolcanlogin AND NOT p.rolsuper AND NOT p.rolbypassrls AND NOT p.rolcreatedb AND NOT p.rolcreaterole AND NOT p.rolreplication AND NOT p.rolinherit AND NOT EXISTS(SELECT 1 FROM pg_catalog.pg_auth_members m WHERE m.member=p.oid) AND NOT EXISTS(SELECT 1 FROM pg_catalog.pg_namespace n WHERE n.nspowner=p.oid) AND NOT EXISTS(SELECT 1 FROM pg_catalog.pg_class c WHERE c.relowner=p.oid) AND NOT EXISTS(SELECT 1 FROM pg_catalog.pg_proc fn WHERE fn.proowner=p.oid) AND NOT EXISTS(SELECT 1 FROM pg_catalog.pg_database d WHERE d.datdba=p.oid)) THEN '1' ELSE 'onboarding_workspace_binding_denied' END)::integer AS workspace_binding_guard`,values:[r.id,r.environment,r.incarnation,r.providerProjectId,lifecycle,f.role,f.loginRole]};
}
/** A routing binding is not business authority. Original actor/lease/role guards stay in the body. */
export function getWorkspaceDb(binding:WorkspaceBinding):SqlExecutor{
 workspaceBindingFacts(binding);
 const execute=async(statements:readonly SqlStatement[],signal?:AbortSignal)=>{
  signal?.throwIfAborted();if(!statements.length)return [];
  const sql=await driver(binding),g=guard(binding),all=[{text:'SELECT workspace_id FROM onboarding_workspace_identity WHERE singleton ORDER BY workspace_id FOR SHARE',values:[]},g,...statements,g];
  try{const results=await sql.transaction(all.map(s=>sql.query(s.text,[...s.values])),{isolationLevel:'ReadCommitted',...(signal?{fetchOptions:{signal}}:{})});return results.slice(2,2+statements.length);}
  catch(error){if(error instanceof Error&&error.message.includes('onboarding_workspace_binding_denied'))throw new WorkspaceRoutingError();throw error;}
 };
 return {async query<T>(statement:SqlStatement,signal?:AbortSignal){return (await execute([statement],signal))[0] as T[];},async transaction(statements,signal){return execute(statements,signal);}};
}
