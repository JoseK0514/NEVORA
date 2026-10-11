// Finite root-owned fictional native fixture. Never imported by an application handler.
import { Client } from 'pg';
import { createHash, randomBytes } from 'node:crypto';
import { readFileSync, writeFileSync, lstatSync, realpathSync } from 'node:fs';
import { resolve, join } from 'node:path';
import { expect } from 'vitest';
import { hashPassword } from './password';
import { INSTALLER_CATALOG_EXCLUSIVE_FENCE_SQL } from '../tenancy/runtime/catalog-fence.server';

const q = (s:string) => '"'+s.replace(/"/g,'""')+'"';
const lit = (s:string) => "'"+s.replace(/'/g,"''")+"'";
const sha = (s:string|Buffer) => createHash('sha256').update(s).digest('hex');
const source = (p:string) => readFileSync(resolve(p),'utf8');
function one(s:string,re:RegExp) { const m=[...s.matchAll(re)]; expect(m.length).toBe(1); return m[0][0]; }
const initial=source('db/migrations/0001_initial.sql'), expansion=source('db/migrations/0026_tenant_ownership_expand.sql');
const sourcePins = ['db/migrations/0001_initial.sql','db/migrations/0008_workspace_positions.sql','db/migrations/0026_tenant_ownership_expand.sql',
 'src/lib/auth/password.ts','src/lib/tenancy/identity.ts','src/lib/tenancy/runtime/catalog-fence.server.ts',
 ...['employee-login-identity','workspace-locator','workspace-incarnation','portal-authority','portal-session-issuance'].map(p=>'src/lib/tenancy/runtime/'+p+'-storage.sql'),
 'src/lib/tenancy/runtime/control-storage.sql','src/lib/tenancy/runtime/portal-verifier-service.sql',
 'src/lib/auth/portal-credential-session.postgres-fixture.ts'];
type ChildRecord={database:string;databaseOid:string;marker:string;roles:{name:string;oid:string}[];closed:boolean};
type FixtureLease={root:string;data:string;closed:boolean;scope:string;invocation:string;authorizationReference:string;systemIdentifier:string;pid:number;pidStart:string;port:number;credentialFile:string;marker:string;user:string;portalVerifierChildren:ChildRecord[];portalVerifierInstallations:Record<string,unknown>[]};
export type NativeOptions = { state?:'ENABLED'|'DISABLED'|'PROOF_PENDING'|'SUSPENDED'; provenance?:'LEGACY_UNVERIFIED'|'VERIFIED'; inactive?:'workspace'|'employee'; malformedHash?:boolean; mustChangePassword?:boolean; fenced?:boolean; missingBCredential?:boolean; highCounters?:boolean; timezone?:string; kernel?:boolean };
export async function createPortalCredentialSessionNativeFixture(id:string, options:NativeOptions={}) {
 const path=process.env.F_PCS_OWNED_LEASE!,run=process.env.F_PCS_RUN_DIR!,invocation=process.env.F_PCS_ROOT_INVOCATION!;
 expect(path&&run&&invocation).toBeTruthy(); expect(process.env.DATABASE_URL).toBeUndefined(); expect(process.env.FUEL_TEST_DATABASE_URL).toBeUndefined();
 expect(realpathSync(path)).toBe(path); expect(realpathSync(run)).toBe(run);
 const st=lstatSync(path); expect(st.isFile()&&!st.isSymbolicLink()&&st.uid===process.getuid?.()&&(st.mode&0o777)===0o600&&st.nlink===1).toBe(true);
 const lease=JSON.parse(readFileSync(path,'utf8')) as FixtureLease; expect(lease.closed).toBe(false); expect(lease.scope).toBe('OWNED_LOCAL_F10'); expect(lease.invocation).toBe(invocation);
 const manifest=JSON.parse(readFileSync(process.env.F_PCS_SOURCE_MANIFEST!,'utf8'));
 for (const p of sourcePins) expect(sha(readFileSync(resolve(p)))).toBe(manifest.sourceFiles[p]);
 const pid=readFileSync(join(lease.data,'postmaster.pid'),'utf8').split('\n'); expect(Number(pid[0])).toBe(lease.pid); expect(pid[2]).toBe(lease.pidStart); expect(Number(pid[3])).toBe(lease.port); expect(realpathSync(pid[1])).toBe(lease.data);
 const cs=lstatSync(lease.credentialFile); expect(cs.isFile()&&!cs.isSymbolicLink()&&(cs.mode&0o777)===0o600&&cs.uid===process.getuid?.()).toBe(true);
 const password=readFileSync(lease.credentialFile,'utf8');
 const suffix=randomBytes(5).toString('hex'), database='pcs_'+suffix, marker=lease.marker+':'+id+':'+suffix;
 const verifierRole='pcsv_'+suffix, writerOwner='pcso_'+suffix;
 const clients:Client[]=[]; let admin:Client|undefined; let dbOid='',verifierOid='',ownerOid='';
 const connect=async(user:string,db=database) => { const c=new Client({host:'127.0.0.1',port:lease.port,user,password,database:db,connectionTimeoutMillis:3000,statement_timeout:15000});clients.push(c);await c.connect();return c; };
 const maintenance=await connect(lease.user,'postgres');
 const base=(await maintenance.query("SELECT current_setting('data_directory') data,(SELECT system_identifier::text FROM pg_control_system()) system_id")).rows[0];expect(realpathSync(base.data)).toBe(lease.data);expect(base.system_id).toBe(lease.systemIdentifier);
 await maintenance.query('CREATE DATABASE '+q(database)); dbOid=(await maintenance.query('SELECT oid::text oid FROM pg_database WHERE datname=$1',[database])).rows[0].oid;
 await maintenance.query('COMMENT ON DATABASE '+q(database)+' IS '+lit(marker));
 await maintenance.query('REVOKE CREATE,TEMPORARY ON DATABASE '+q(database)+' FROM PUBLIC');
 const updateLease=(body:(v:FixtureLease)=>void)=>{const current=JSON.parse(readFileSync(path,'utf8')) as FixtureLease;expect(current.invocation).toBe(invocation);expect(current.root).toBe(lease.root);expect(current.closed).toBe(false);body(current);writeFileSync(path,JSON.stringify(current,null,2),{mode:0o600});};
 updateLease(v=>v.portalVerifierChildren.push({database,databaseOid:dbOid,marker,roles:[],closed:false}));
 let dropped=false;
 async function cleanup() {
  for(const c of clients.filter(c=>c!==maintenance)){try{await c.query('ROLLBACK');}catch{}await c.end();}
  const native=(await maintenance.query("SELECT oid::text oid,shobj_description(oid,'pg_database') marker FROM pg_database WHERE datname=$1",[database])).rows[0];expect(native).toEqual({oid:dbOid,marker});
  await maintenance.query('DROP DATABASE '+q(database));expect((await maintenance.query('SELECT oid FROM pg_database WHERE oid=$1::oid OR datname=$2',[dbOid,database])).rows).toEqual([]);
  for(const [name,oid] of [[verifierRole,verifierOid],[writerOwner,ownerOid]]) if(oid){expect((await maintenance.query('SELECT oid::text oid FROM pg_roles WHERE rolname=$1',[name])).rows).toEqual([{oid}]);await maintenance.query('DROP ROLE '+q(name));expect((await maintenance.query('SELECT oid FROM pg_roles WHERE oid=$1::oid OR rolname=$2',[oid,name])).rows).toEqual([]);}
  await maintenance.end();dropped=true;
  updateLease(v=>{const child=v.portalVerifierChildren.find(x=>x.database===database&&String(x.databaseOid)===dbOid);expect(child).toBeDefined();expect(child!.marker).toBe(marker);child!.closed=true;});
  writeFileSync(join(run,id+'-'+suffix+'-cleanup.json'),JSON.stringify({id,database,dbOid,marker,roles:[[verifierRole,verifierOid],[writerOwner,ownerOid]],allClientsClosed:true,dropped,claim:'SPARSE_LOCAL_AUTH_NOT_ORIGINAL_SINGLETON_CUTOVER'},null,2),{mode:0o600,flag:'wx'});
 }
 try {
  admin=await connect(lease.user);
  await admin.query('REVOKE CREATE ON SCHEMA public FROM PUBLIC'); await admin.query('CREATE SCHEMA nevora_tenancy'); await admin.query('SET search_path=public,pg_catalog');
  // This declared sparse A/B geometry does not remove any original singleton constraint.
  // Full original schema/cutover remains a separate mandatory gate.
  await admin.query('CREATE TABLE public.workspaces(id text PRIMARY KEY,active boolean NOT NULL DEFAULT true,updated_at timestamptz NOT NULL DEFAULT now())');
  await admin.query('CREATE TABLE public.locations(id text PRIMARY KEY)');
  for(const name of ['employees','employee_credentials','employee_sessions']) await admin.query(one(initial,new RegExp('CREATE TABLE IF NOT EXISTS '+name+' \\([\\s\\S]*?\\n\\);','g')));
  for(const name of ['employee_sessions_employee_idx','employee_sessions_expires_idx']) await admin.query(one(initial,new RegExp('CREATE INDEX IF NOT EXISTS '+name+'[\\s\\S]*?;','g')));
  await admin.query(one(expansion,/ALTER TABLE public\."employees" ADD COLUMN workspace_id text;\nALTER TABLE public\."employees" ADD CONSTRAINT f10_workspace_reference[^\n]*\nALTER TABLE public\."employees" ADD CONSTRAINT f10_tenant_c49de3d265fb[^\n]*/g));
  for(const name of ['expansion_protocol','owned_table_contract']) await admin.query(one(expansion,new RegExp('CREATE TABLE nevora_tenancy\\.'+name+' \\([\\s\\S]*?\\n\\);','g')));
  await admin.query(one(expansion,/INSERT INTO nevora_tenancy\.expansion_protocol\([^\n]*;/g));
  const all=one(expansion,/^INSERT INTO nevora_tenancy\.owned_table_contract VALUES\n[\s\S]*?;$/gm);
  const rows=['employees','workspaces','employee_credentials','employee_sessions'].map(n=>one(all,new RegExp("^\\('"+n+"',[^\\n]*","gm")).replace(/[,;]$/,''));
  await admin.query('INSERT INTO nevora_tenancy.owned_table_contract VALUES\n'+rows.join(',\n')+';');
  await admin.query(one(source('src/lib/tenancy/runtime/control-storage.sql'),/CREATE TABLE nevora_tenancy\.runtime_role_binding \([\s\S]*?\n\);/g));
  const subjects={ A:{workspaceId:' '+suffix+'_A ',employeeId:suffix+'_eA',workspaceLocator:'test-a-'+suffix,employeeNumber:' Same.42 ',normalizedNumber:'SAME.42',password:'fictional-a-'+suffix}, B:{workspaceId:suffix+'_B',employeeId:suffix+'_eB',workspaceLocator:'test-b-'+suffix,employeeNumber:'Same.42',normalizedNumber:'SAME.42',password:'fictional-b-'+suffix} };
  await admin.query('INSERT INTO public.locations(id) VALUES($1)',[suffix+'_loc']);
  for(const [key,v] of Object.entries(subjects)){
   await admin.query('INSERT INTO public.workspaces(id,active) VALUES($1,$2)',[v.workspaceId,!(key==='A'&&options.inactive==='workspace')]);
   await admin.query("INSERT INTO public.employees(id,first_name,last_name,phone,role,primary_location_id,workspace_id,active) VALUES($1,'Fictional','Only','0000000000','EMPLOYEE',$2,$3,$4)",[v.employeeId,suffix+'_loc',v.workspaceId,!(key==='A'&&options.inactive==='employee')]);
   if(!(key==='B'&&options.missingBCredential)) await admin.query('INSERT INTO public.employee_credentials(employee_id,password_hash,must_change_password) VALUES($1,$2,$3)',[v.employeeId,key==='A'&&options.malformedHash?'malformed':await hashPassword(v.password),key==='A'&&(options.mustChangePassword??false)]);
  }
  for(const name of ['source_write_fence','source_identity_guard']) await admin.query(one(expansion,new RegExp('CREATE FUNCTION nevora_tenancy\\.'+name+'\\(\\)[\\s\\S]*?\\$'+(name==='source_write_fence'?'write_fence':'identity_guard')+'\\$;','g')));
  for(const name of ['employees','workspaces','employee_credentials','employee_sessions']) for(const trig of ['f10_write_fence','f10_identity_guard']) await admin.query(one(expansion,new RegExp('^CREATE TRIGGER '+trig+'[^\\n]*ON public\\."'+name+'"[^\\n]*;','gm')));
  await admin.query('REVOKE ALL ON ALL TABLES IN SCHEMA nevora_tenancy FROM PUBLIC');await admin.query('REVOKE ALL ON ALL FUNCTIONS IN SCHEMA nevora_tenancy FROM PUBLIC');
  for(const p of ['employee-login-identity','workspace-locator','workspace-incarnation','portal-authority','portal-session-issuance']) await admin.query(source('src/lib/tenancy/runtime/'+p+'-storage.sql'));
  for(const v of Object.values(subjects)) {
   await admin.query('INSERT INTO nevora_tenancy.employee_login_identity VALUES($1,$2,$3,$4)',[v.employeeId,v.workspaceId,v.employeeNumber,v.normalizedNumber]);
   await admin.query('INSERT INTO nevora_tenancy.workspace_locator VALUES($1,$2)',[v.workspaceId,v.workspaceLocator]);
   const generation=options.highCounters?(v===subjects.A?'9223372036854775807':'9007199254740993'):'1';
   await admin.query('INSERT INTO nevora_tenancy.workspace_incarnation_counter VALUES($1,$2::bigint)',[v.workspaceId,generation]);
   await admin.query('INSERT INTO nevora_tenancy.portal_authority VALUES($1,$2,1,$6::bigint,1,$3,$4,$5)',[v.workspaceId,v.employeeId,options.state??'ENABLED',options.provenance??'LEGACY_UNVERIFIED','ROOT_FICTIONAL_EXPLICIT:'+id,generation]);
  }
  await admin.query(source('src/lib/tenancy/runtime/portal-verifier-service.sql'));
  await admin.query('BEGIN ISOLATION LEVEL READ COMMITTED'); await admin.query(INSTALLER_CATALOG_EXCLUSIVE_FENCE_SQL.text);
  for(const [name,login] of [[verifierRole,true],[writerOwner,false]] as const) await admin.query('CREATE ROLE '+q(name)+' '+(login?'LOGIN':'NOLOGIN')+' NOSUPERUSER NOINHERIT NOCREATEDB NOCREATEROLE NOREPLICATION NOBYPASSRLS');
  await admin.query('ALTER ROLE '+q(verifierRole)+' PASSWORD '+lit(password));
  verifierOid=(await admin.query('SELECT oid::text oid FROM pg_roles WHERE rolname=$1',[verifierRole])).rows[0].oid; ownerOid=(await admin.query('SELECT oid::text oid FROM pg_roles WHERE rolname=$1',[writerOwner])).rows[0].oid;
  updateLease(v=>{const child=v.portalVerifierChildren.find(x=>x.database===database);expect(child).toBeDefined();child!.roles=[{name:verifierRole,oid:verifierOid},{name:writerOwner,oid:ownerOid}];});
  for(const sig of ['assert_original_portal_verifier_service()','acquire_portal_login_source(text,text)','insert_portal_reviewed_session(text,text,text,jsonb)']) await admin.query('ALTER FUNCTION nevora_tenancy.'+sig+' OWNER TO '+q(writerOwner));
  const render=(s:string)=>{for(const [a,b] of Object.entries({'__BOUND_AUTH_OWNER__':writerOwner,'__BOUND_VERIFIER_LOGIN__':verifierRole,'__BOUND_AUTH_OWNER_OID__':ownerOid,'__BOUND_VERIFIER_LOGIN_OID__':verifierOid,'__BOUND_DATABASE_OID__':dbOid}))s=s.replaceAll(a,b);expect(s).not.toMatch(/__BOUND_/);return s;};
  const grants=render(source('src/lib/tenancy/runtime/portal-verifier-private-grants.sql.in')),policies=render(source('src/lib/tenancy/runtime/portal-verifier-private-policies.sql.in'));
  await admin.query('SAVEPOINT compile_intent'); await admin.query(policies);
  const readPolicies=async()=> (await admin!.query("SELECT c.relname,p.polname,p.polcmd,p.polroles,p.polpermissive,pg_get_expr(p.polqual,p.polrelid,false) using_source,pg_get_expr(p.polwithcheck,p.polrelid,false) check_source FROM pg_policy p JOIN pg_class c ON c.oid=p.polrelid WHERE p.polname LIKE 'portal_verifier_%' ORDER BY p.polname")).rows;
  const intended=await readPolicies();expect(intended).toHaveLength(8);await admin.query('ROLLBACK TO SAVEPOINT compile_intent');expect(await readPolicies()).toEqual([]);
  await admin.query(policies);expect(await readPolicies()).toEqual(intended);await admin.query(grants);
  const capsuleText=(await admin.query('SELECT nevora_tenancy.capture_portal_verifier_native_profile($1::oid,$2::oid)::text capsule',[verifierOid,ownerOid])).rows[0].capsule;
  await admin.query('INSERT INTO nevora_tenancy.portal_verifier_service_binding VALUES(true,$1::oid,$2,$3::oid,$4,$5::jsonb)',[verifierOid,verifierRole,ownerOid,writerOwner,capsuleText]);
  expect((await admin.query('SELECT nevora_tenancy.capture_portal_verifier_native_profile($1::oid,$2::oid)::text capsule',[verifierOid,ownerOid])).rows[0].capsule).toBe(capsuleText);
  await admin.query('COMMIT');
  if(options.fenced) await admin.query("UPDATE nevora_tenancy.expansion_protocol SET phase='FENCED' WHERE migration_id=26");
  const verifier=await connect(verifierRole);
  await verifier.query('SET search_path=pg_catalog');await verifier.query("SET DateStyle='ISO,YMD'");if(options.timezone)await verifier.query("SELECT set_config('TimeZone',$1,false)",[options.timezone]);
  const result={id,database,databaseOid:dbOid,marker,verifierRole,verifierRoleOid:verifierOid,writerOwner,writerOwnerOid:ownerOid,admin,verifier,maintenance,subjects,capsuleText,intended,grants,policies,leasePath:path,lease,cleanup,sourcePins:sourcePins.map(p=>({path:p,sha256:sha(readFileSync(resolve(p)))}))};
  writeFileSync(join(run,id+'-'+suffix+'-installation.json'),JSON.stringify({id,database,dbOid,marker,verifierRole,verifierOid,writerOwner,ownerOid,intended,sourcePins:result.sourcePins,capsuleSHA256:sha(capsuleText),claim:'SPARSE_LOCAL_AUTH_NOT_ORIGINAL_SINGLETON_CUTOVER',fictionalExplicitAuthority:true},null,2),{mode:0o600,flag:'wx'});
  return result;
 } catch(error) { try{await cleanup();}catch{writeFileSync(join(run,id+'-'+suffix+'-preserved.json'),JSON.stringify({database,dbOid,marker,verifierRole,verifierOid,writerOwner,ownerOid,cleanup:'FAILED_PRESERVE_EXACT_OWNED'},null,2),{mode:0o600});} throw error; }
}
