import {workerReadRelations,workerInsertRelations,workerUpdateColumns} from './worker-privileges';
// Node-only shared bootstrap primitives. The CLI deliberately uses its existing
// Node loader; web entrypoints never receive a privileged database client.
import {readFile} from 'node:fs/promises';
import {createHash,randomUUID} from 'node:crypto';
import type {ClientBase} from 'pg';
import {BASE_MIGRATIONS,FINAL_MIGRATIONS} from '../../../db/migrations/order';
import {isOperationId,isRevision,parseWorkspaceCommand,registeredEmail,type WorkspacePayload} from '../onboarding/contracts';
export type BootstrapClient=Pick<ClientBase,'query'>;
export type CompanyManifest={base:{file:string;body:string;checksum:string}[];final:{file:string;body:string;checksum:string}[];hash:string};
export function migrationBody(source:string):string{
 const begins=[...source.matchAll(/^BEGIN;\s*$/gm)],commits=[...source.matchAll(/^COMMIT;\s*$/gm)];
 if(begins.length!==commits.length||begins.length>1)throw Error('Unexpected migration transaction boundaries.');
 return source.replace(/^BEGIN;\s*$/m,'').replace(/^COMMIT;\s*$/m,'');
}
export async function canonicalCompanyManifest():Promise<CompanyManifest>{
 const load=async(file:string)=>{const source=await readFile(new URL('../../../db/migrations/'+file,import.meta.url),'utf8');return {file,body:migrationBody(source),checksum:createHash('sha256').update(source).digest('hex')};};
 const base=await Promise.all(BASE_MIGRATIONS.map(load)),final=await Promise.all(FINAL_MIGRATIONS.map(load));
 return {base,final,hash:createHash('sha256').update(JSON.stringify([...base,...final].map(({file,checksum})=>({file,checksum})))).digest('hex')};
}
export async function lockFreshCompany(client:BootstrapClient){
 await client.query("SELECT pg_advisory_xact_lock(hashtextextended('nevora.company.setup',0))");
}
export async function assertEmptyCompanySchema(client:BootstrapClient){
 const existing=await client.query(`SELECT 1 FROM pg_namespace n WHERE n.nspname NOT IN('pg_catalog','information_schema') AND n.nspname NOT LIKE 'pg_toast%' AND n.nspname NOT LIKE 'pg_temp_%'
 AND (EXISTS(SELECT 1 FROM pg_class c WHERE c.relnamespace=n.oid) OR EXISTS(SELECT 1 FROM pg_proc p WHERE p.pronamespace=n.oid) OR EXISTS(SELECT 1 FROM pg_type t WHERE t.typnamespace=n.oid)) LIMIT 1`);
 if(existing.rowCount)throw new BootstrapOccupiedTarget();
}
export async function installCompanyBase(client:BootstrapClient,manifest:CompanyManifest,input:{workspaceId:string;name:string;timeZone:string;locationId:string;locationName:string;locationShortName:string;locationKey:string}){
 await assertEmptyCompanySchema(client);await client.query('SET LOCAL search_path TO public, pg_catalog');
 for(const migration of manifest.base)await client.query(migration.body);
 // These historical seeds were created only in this proven empty transaction.
 await client.query('DELETE FROM location_staffing_settings');await client.query('DELETE FROM locations');await client.query('DELETE FROM workspaces');
 await client.query('INSERT INTO workspaces(id,name,time_zone) VALUES($1,$2,$3)',[input.workspaceId,input.name,input.timeZone]);
 await client.query('INSERT INTO locations(id,workspace_id,clocker_key,name,short_name) VALUES($1,$2,$3,$4,$5)',[input.locationId,input.workspaceId,input.locationKey,input.locationName,input.locationShortName]);
}
export async function insertOwnerProfile(client:BootstrapClient,owner:{id:string;firstName:string;lastName:string;phone:string;email:string|null},primaryLocationId:string,eligibleLocationIds:string[],options:{active:boolean;passwordHash?:string}){
 await client.query(`INSERT INTO employees(id,first_name,last_name,phone,email,role,primary_location_id,active) VALUES($1,$2,$3,$4,$5,'OWNER',$6,$7)`,[owner.id,owner.firstName,owner.lastName,owner.phone,owner.email,primaryLocationId,options.active]);
 await client.query('INSERT INTO employee_location_eligibility(employee_id,location_id) SELECT $1,unnest($2::text[])',[owner.id,eligibleLocationIds]);
 if(options.passwordHash)await client.query('INSERT INTO employee_credentials(employee_id,password_hash,must_change_password) VALUES($1,$2,false)',[owner.id,options.passwordHash]);
}
export async function installCompanyFinal(client:BootstrapClient,manifest:CompanyManifest){for(const migration of manifest.final)await client.query(migration.body);}
export type PendingCompanySpec={operationId:string;workspaceId:string;registrationId:string;environment:'test'|'development'|'production';incarnation:string;providerProjectId:string;resourceName:string;commandHash:string;payload:WorkspacePayload;verifiedEmail:string;databaseName:string;provisionerRole:string;app:{name:string;password:string};worker:{name:string;password:string};commerce?:{origin:string;instanceSecretHash:string;workerSecretHash:string}};
export class BootstrapOccupiedTarget extends Error{constructor(){super('Company setup requires an empty public schema and empty database; existing databases are never reset.');}}
export class BootstrapCommitUnknown extends Error{constructor(){super('Company bootstrap acknowledgement unavailable');}}
function validate(spec:PendingCompanySpec):PendingCompanySpec{
 const parsed=parseWorkspaceCommand({schemaVersion:1,operationId:spec.operationId,expectedVersion:'0',payload:spec.payload});
 const validRole=(role:{name:string;password:string},kind:string)=>new RegExp('^nv_'+kind+'_[a-f0-9]{24}$').test(role.name)&&/^[A-Za-z0-9_-]{43}$/.test(role.password)&&Buffer.from(role.password,'base64url').toString('base64url')===role.password;
 if(!isOperationId(spec.operationId)||!isOperationId(spec.workspaceId)||!isOperationId(spec.registrationId)||!isRevision(spec.incarnation)||spec.incarnation==='0'||!['test','development','production'].includes(spec.environment)||!registeredEmail(spec.verifiedEmail)||!/^nv_app_[a-f0-9]{32}$/.test(spec.databaseName)||!/^nv_provision_[a-f0-9]{24}$/.test(spec.provisionerRole)||!/^nv-[tdp]-[a-f0-9]{32}-[a-f0-9]{16}$/.test(spec.resourceName)||!/^[a-z0-9-]{1,60}$/.test(spec.providerProjectId)||!/^[a-f0-9]{64}$/.test(spec.commandHash)||!validRole(spec.app,'app')||!validRole(spec.worker,'worker')||spec.app.name===spec.worker.name||!parsed)throw Error('Invalid pending company bootstrap');
 if(spec.commerce){const u=new URL(spec.commerce.origin);if(u.origin!==spec.commerce.origin||u.protocol!=='https:'||!/^[a-f0-9]{64}$/.test(spec.commerce.instanceSecretHash)||!/^[a-f0-9]{64}$/.test(spec.commerce.workerSecretHash)||spec.commerce.workerSecretHash===spec.commerce.instanceSecretHash)throw Error('Invalid commerce binding');}
 return {...spec,payload:parsed!.payload};
}
async function runtimeRoles(client:BootstrapClient,spec:PendingCompanySpec){
 for(const [kind,role] of [['APP',spec.app],['WORKER',spec.worker]] as const){
  // Identifier and password encodings were validated above; no customer text is interpolated.
  await client.query(`CREATE ROLE ${role.name} LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOINHERIT NOBYPASSRLS NOREPLICATION PASSWORD '${role.password}'`);
  await client.query('INSERT INTO onboarding_runtime_roles(kind,login_role) VALUES($1,$2)',[kind,role.name]);
 }
 await client.query(`REVOKE CONNECT,TEMPORARY ON DATABASE ${spec.databaseName} FROM PUBLIC; REVOKE CREATE ON SCHEMA public FROM PUBLIC`);
 const business=await client.query<{name:string}>(`SELECT c.relname AS name FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='public' AND c.relkind IN('r','p','v','m','f') AND c.relname NOT IN('onboarding_workspace_identity','onboarding_runtime_roles','onboarding_provision_receipts','onboarding_initial_owner','onboarding_owner_grants','onboarding_owner_activation_receipts','onboarding_restore_receipts','nevora_commerce_installation') ORDER BY c.relname`);
 const quoted=business.rows.map(r=>'"'+r.name.replaceAll('"','""')+'"').join(',');
 for(const role of [spec.app,spec.worker]){
  await client.query(`GRANT CONNECT ON DATABASE ${spec.databaseName} TO ${role.name}; GRANT USAGE ON SCHEMA public TO ${role.name}`);
  if(role===spec.app)await client.query(`GRANT EXECUTE ON FUNCTION onboarding_owner_claim(text,text,bigint,text,uuid,text,text) TO ${role.name}`);
  await client.query(`GRANT SELECT ON nevora_commerce_installation TO ${role.name}`);
  if(role===spec.app)await client.query(`GRANT EXECUTE ON FUNCTION nevora_commerce_apply_capacity(text,text,text,integer) TO ${role.name}`);
  if(role===spec.app&&quoted)await client.query(`GRANT SELECT,INSERT,UPDATE,DELETE ON ${quoted} TO ${role.name}`);
  if(role===spec.app){
   await client.query(`GRANT EXECUTE ON FUNCTION public.nevora_submit_delegated_time_correction(uuid,text,text,text,text,text,text,text,timestamptz,timestamptz,text,text), public.nevora_submit_delegated_time_correction(uuid,text,text,text,text,text,text,text,timestamptz,timestamptz,text,text,uuid,integer) TO ${role.name}`);
   await client.query(`REVOKE UPDATE,DELETE,TRUNCATE ON management_time_closes FROM ${role.name}`);
   await client.query(`GRANT EXECUTE ON FUNCTION nevora_management_close_source(text,text),nevora_management_close(text,text,text,text,text,text,uuid,text,timestamptz,text,text) TO ${role.name}`);
  }
  if(role===spec.worker){
   await client.query(`GRANT SELECT ON ${workerReadRelations.join(',')} TO ${role.name}`);
   await client.query(`GRANT INSERT ON ${workerInsertRelations.join(',')} TO ${role.name}`);
   for(const [table,columns] of Object.entries(workerUpdateColumns))await client.query(`GRANT UPDATE(${columns.join(',')}) ON ${table} TO ${role.name}`);
   await client.query(`GRANT DELETE ON native_push_challenges TO ${role.name}`);
   await client.query(`GRANT UPDATE(onboarding_worker_lock) ON workspaces,employees,locations,positions,employee_sessions,native_push_challenges TO ${role.name}`);
   await client.query(`GRANT EXECUTE ON FUNCTION onboarding_worker_table_lock(text,text) TO ${role.name}`);
  }
  await client.query(`GRANT USAGE,SELECT${role===spec.app?',UPDATE':''} ON ALL SEQUENCES IN SCHEMA public TO ${role.name}; GRANT SELECT ON onboarding_workspace_identity,onboarding_runtime_roles TO ${role.name}; GRANT UPDATE(lock_token) ON onboarding_workspace_identity TO ${role.name}`);
 }
}
/** One fresh database, one inactive initial Owner, no reusable Owner credential.
 * Unknown commit recovers only through the exact immutable company receipt. */
export async function bootstrapPendingCompany(client:BootstrapClient,spec:PendingCompanySpec):Promise<{workspaceId:string;locationId:string;manifestHash:string;commerceProvisionedAt?:string}>{
 spec=validate(spec);const manifest=await canonicalCompanyManifest();let commitAttempted=false;
 await client.query('BEGIN');
 try{
  await lockFreshCompany(client);
  const target=await client.query<{database:string;role:string;session_role:string}>('SELECT current_database() AS database,current_user AS role,session_user AS session_role');
  if(target.rows[0]?.database!==spec.databaseName||target.rows[0]?.role!==spec.provisionerRole||target.rows[0]?.session_role!==spec.provisionerRole)throw Error('Company bootstrap target mismatch');
  const installed=await client.query("SELECT to_regclass('public.onboarding_provision_receipts') AS relation");
  if(installed.rows[0].relation){
   await client.query('SELECT workspace_id FROM onboarding_workspace_identity WHERE singleton ORDER BY workspace_id FOR SHARE');
   await client.query('SELECT id FROM workspaces ORDER BY id FOR NO KEY UPDATE');
   await client.query('SELECT id FROM employees WHERE id=$1 FOR UPDATE',[spec.payload.ownerProfile.id]);
   await client.query('SELECT workspace_id FROM onboarding_initial_owner WHERE workspace_id=$1 FOR UPDATE',[spec.workspaceId]);
   const r=await client.query(`SELECT r.*,l.id AS location_id,a.environment AS anchor_environment,a.incarnation::text AS anchor_incarnation,a.provider_project_id AS anchor_project,a.lifecycle AS anchor_lifecycle,o.state AS owner_state,o.employee_id AS bound_owner_id FROM onboarding_provision_receipts r JOIN onboarding_workspace_identity a ON a.workspace_id=r.workspace_id JOIN onboarding_initial_owner o ON o.workspace_id=r.workspace_id JOIN locations l ON l.workspace_id=r.workspace_id AND l.clocker_key=$2 WHERE r.operation_id=$1`,[spec.operationId,spec.payload.initialLocation.key]);
   const row=r.rows[0];if(r.rows.length!==1||row.workspace_id!==spec.workspaceId||row.registration_id!==spec.registrationId||row.environment!==spec.environment||String(row.incarnation)!==spec.incarnation||row.provider_project_id!==spec.providerProjectId||row.resource_name!==spec.resourceName||row.command_hash!==spec.commandHash||row.manifest_hash!==manifest.hash||row.initial_owner_id!==spec.payload.ownerProfile.id||row.anchor_environment!==spec.environment||row.anchor_incarnation!==spec.incarnation||row.anchor_project!==spec.providerProjectId||row.anchor_lifecycle!=='OWNER_ACTIVATION_REQUIRED'||row.owner_state!=='PENDING'||row.bound_owner_id!==spec.payload.ownerProfile.id)throw Error('Company bootstrap receipt mismatch');
   const owner=await client.query(`SELECT e.id FROM employees e JOIN locations l ON l.id=e.primary_location_id JOIN workspaces w ON w.id=l.workspace_id WHERE e.id=$1 AND e.role='OWNER' AND NOT e.active AND e.email=$2 AND l.workspace_id=$3 AND w.singleton AND w.active AND NOT EXISTS(SELECT 1 FROM employee_credentials WHERE employee_id=e.id)`,[spec.payload.ownerProfile.id,spec.verifiedEmail,spec.workspaceId]);
   if(owner.rowCount!==1)throw Error('Company pending Owner changed');
   const commerceProvisionedAt=await verifyCommerceBinding(client,spec);await client.query('COMMIT');return {workspaceId:spec.workspaceId,locationId:row.location_id,manifestHash:manifest.hash,...(commerceProvisionedAt?{commerceProvisionedAt}:{})};
  }
  const locationId=randomUUID();await installCompanyBase(client,manifest,{workspaceId:spec.workspaceId,name:spec.payload.businessName,timeZone:spec.payload.timeZone,locationId,locationName:spec.payload.initialLocation.name,locationShortName:spec.payload.initialLocation.shortName,locationKey:spec.payload.initialLocation.key});
  await insertOwnerProfile(client,{...spec.payload.ownerProfile,email:spec.verifiedEmail},locationId,[locationId],{active:false});await installCompanyFinal(client,manifest);
  await client.query("INSERT INTO onboarding_workspace_identity(workspace_id,environment,incarnation,provider_project_id,lifecycle) VALUES($1,$2,$3::bigint,$4,'OWNER_ACTIVATION_REQUIRED')",[spec.workspaceId,spec.environment,spec.incarnation,spec.providerProjectId]);
  if(spec.commerce)await client.query('INSERT INTO nevora_commerce_installation(workspace_id,business_id,installation_id,environment,incarnation,canonical_origin,instance_secret_hash,worker_secret_hash) VALUES($1,$1,$1,$2,$3::bigint,$4,$5,$6)',[spec.workspaceId,spec.environment,spec.incarnation,spec.commerce.origin,spec.commerce.instanceSecretHash,spec.commerce.workerSecretHash]);
  await client.query('INSERT INTO onboarding_initial_owner(workspace_id,employee_id,registration_id) VALUES($1,$2,$3)',[spec.workspaceId,spec.payload.ownerProfile.id,spec.registrationId]);
  await client.query('INSERT INTO onboarding_progress(workspace_id) VALUES($1)',[spec.workspaceId]);
  await runtimeRoles(client,spec);
  await client.query('INSERT INTO onboarding_provision_receipts(workspace_id,operation_id,registration_id,environment,incarnation,provider_project_id,resource_name,manifest_hash,command_hash,initial_owner_id) VALUES($1,$2,$3,$4,$5::bigint,$6,$7,$8,$9,$10)',[spec.workspaceId,spec.operationId,spec.registrationId,spec.environment,spec.incarnation,spec.providerProjectId,spec.resourceName,manifest.hash,spec.commandHash,spec.payload.ownerProfile.id]);
  const commerceProvisionedAt=await verifyCommerceBinding(client,spec);commitAttempted=true;await client.query('COMMIT');return {workspaceId:spec.workspaceId,locationId,manifestHash:manifest.hash,...(commerceProvisionedAt?{commerceProvisionedAt}:{})};
 }catch(error){try{await client.query('ROLLBACK');}catch{/* Unknown commit remains unknown. */}if(commitAttempted){const code=error&&typeof error==='object'&&'code'in error?String(error.code):'';if(!/^(23|40)[0-9A-Z]{3}$/.test(code))throw new BootstrapCommitUnknown();}throw error;}
}

async function verifyCommerceBinding(client:BootstrapClient,spec:PendingCompanySpec):Promise<string|undefined>{
 const r=await client.query('SELECT workspace_id,business_id,installation_id,environment,incarnation::text,canonical_origin,instance_secret_hash,worker_secret_hash,provisioned_at FROM nevora_commerce_installation WHERE singleton');
 if(!spec.commerce){if(r.rowCount)throw Error('Company commerce receipt mismatch');return;}
 const row=r.rows[0];if(r.rowCount!==1||row.workspace_id!==spec.workspaceId||row.business_id!==spec.workspaceId||row.installation_id!==spec.workspaceId||row.environment!==spec.environment||row.incarnation!==spec.incarnation||row.canonical_origin!==spec.commerce.origin||row.instance_secret_hash!==spec.commerce.instanceSecretHash||row.worker_secret_hash!==spec.commerce.workerSecretHash)throw Error('Company commerce receipt mismatch');
 return new Date(row.provisioned_at).toISOString();
}
