import 'server-only';
import type {Pool,PoolClient} from 'pg';
import {randomUUID} from 'node:crypto';
import type {MonitorCondition,MailResult,NoticeKind} from './monitor';
const validRole=(role:string)=>/^nv_ops_monitor_[a-f0-9]{24}$/.test(role);
/** Effective privileges include PUBLIC grants; never rewrite shared defaults
 * here. Both setup and each observation require this same current evidence. */
export async function assertMonitorPrincipal(client:PoolClient,role:string){
 if(!validRole(role))throw Error('monitor_principal_invalid');
 try{
  const r=(await client.query(`SELECT p.rolcanlogin,p.rolsuper,p.rolcreatedb,p.rolcreaterole,p.rolinherit,p.rolreplication,p.rolbypassrls,
   EXISTS(SELECT 1 FROM pg_auth_members m WHERE m.member=p.oid) memberships,
   has_database_privilege(p.oid,current_database(),'CREATE,TEMPORARY') database_create_temp,
   EXISTS(SELECT 1 FROM pg_namespace n WHERE has_schema_privilege(p.oid,n.oid,'CREATE')) schema_create,
   EXISTS(SELECT 1 FROM pg_proc f JOIN pg_namespace n ON n.oid=f.pronamespace WHERE f.prosecdef AND n.nspname NOT IN('pg_catalog','information_schema') AND n.nspname NOT LIKE 'pg_%' AND has_function_privilege(p.oid,f.oid,'EXECUTE')) callable_definer,
   (EXISTS(SELECT 1 FROM pg_class c WHERE c.relowner=p.oid) OR EXISTS(SELECT 1 FROM pg_namespace n WHERE n.nspowner=p.oid) OR EXISTS(SELECT 1 FROM pg_proc f WHERE f.proowner=p.oid) OR EXISTS(SELECT 1 FROM pg_database d WHERE d.datdba=p.oid)) owns_objects,
   EXISTS(SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname NOT IN('pg_catalog','information_schema') AND n.nspname NOT LIKE 'pg_%' AND c.relkind IN('r','p','v','m','f') AND
    CASE WHEN n.nspname='nevora_operations' AND c.relname IN('monitor_state','monitor_notices','monitor_attempts')
     THEN has_table_privilege(p.oid,c.oid,'DELETE,TRUNCATE,REFERENCES,TRIGGER') OR has_any_column_privilege(p.oid,c.oid,'REFERENCES')
     ELSE has_table_privilege(p.oid,c.oid,'SELECT,INSERT,UPDATE,DELETE,TRUNCATE,REFERENCES,TRIGGER') OR has_any_column_privilege(p.oid,c.oid,'SELECT,INSERT,UPDATE,REFERENCES') END) extra_access
   FROM pg_roles p WHERE p.rolname=$1`,[role])).rows;
  if(r.length!==1||r[0].rolcanlogin!==true||['rolsuper','rolcreatedb','rolcreaterole','rolinherit','rolreplication','rolbypassrls','memberships','owns_objects','extra_access','database_create_temp','schema_create','callable_definer'].some(k=>r[0][k]!==false))throw Error();
 }catch{throw Error('monitor_principal_invalid');}
}
/** Setup only. No role/password creation or implicit PUBLIC privilege changes. */
export async function configureMonitorPrincipal(admin:PoolClient,role:string){
 await admin.query('BEGIN');
 try{
  await assertMonitorPrincipal(admin,role);
  await admin.query(`GRANT USAGE ON SCHEMA nevora_operations TO "${role}"; GRANT SELECT,INSERT,UPDATE ON nevora_operations.monitor_state,nevora_operations.monitor_notices,nevora_operations.monitor_attempts TO "${role}"`);await admin.query('COMMIT');
 }catch{await admin.query('ROLLBACK').catch(()=>{});throw Error('monitor_principal_invalid');}
}
/** Session ownership serializes observers through the bounded external send.
 * The durable sending intent precedes SMTP; a lost process is marked unknown,
 * never automatically resent. Only provable non-acceptance gets <=3 attempts. */
export async function processMonitorObservation(pool:Pool,role:string,observe:()=>Promise<MonitorCondition>,mailEnabled:boolean,send:(kind:NoticeKind)=>Promise<MailResult>):Promise<{state:'complete'|'idle'}>{
 if(!validRole(role)||typeof observe!=='function')throw Error('monitor_configuration_invalid');
 const client=await pool.connect();let locked=false,inTransaction=false,databaseLost=false;
 // A borrowed pg client can emit an asynchronous socket error while SMTP is in
 // flight and no query promise exists. Keep its durable intent and destroy that
 // connection; do not let EventEmitter turn a recoverable loss into a crash.
 const onConnectionError=()=>{databaseLost=true;};client.on('error',onConnectionError);
 try{
  await assertMonitorPrincipal(client,role);
  const identity=(await client.query('SELECT session_user::text AS role,pg_try_advisory_lock(hashtextextended($1,0)) locked',[role])).rows[0];locked=identity.locked===true;
  if(identity.role!==role)throw Error('monitor_principal_invalid');if(!locked)return {state:'idle'};
  // Sample only after owning the dedicated direct connection. A delayed older
  // HTTP response cannot cross a newer committed observation/recovery.
  let condition:MonitorCondition;try{condition=await observe();}catch{condition='unavailable';}
  if(databaseLost||!['ok','unavailable','invalid','source_mismatch','disabled','unhealthy'].includes(condition))throw Error('monitor_observation_unavailable');
  await client.query('BEGIN');inTransaction=true;
  await client.query("INSERT INTO nevora_operations.monitor_state(scope_key,condition) VALUES($1,'ok') ON CONFLICT DO NOTHING",[role]);
  const previous=(await client.query('SELECT condition,incident_id FROM nevora_operations.monitor_state WHERE scope_key=$1 FOR UPDATE',[role])).rows[0];if(!previous)throw Error();
  const incident=condition!=='ok'&&(previous.condition==='ok'||!previous.incident_id)?randomUUID():previous.incident_id;
  await client.query('UPDATE nevora_operations.monitor_state SET condition=$2,incident_id=$3,updated_at=clock_timestamp() WHERE scope_key=$1',[role,condition,incident]);
  await client.query("UPDATE nevora_operations.monitor_attempts SET status='unknown' WHERE scope_key=$1 AND status='sending'",[role]);
  await client.query("UPDATE nevora_operations.monitor_notices SET status='unknown' WHERE scope_key=$1 AND status='sending'",[role]);
  const kind:NoticeKind=condition==='ok'?'recovery':'outage';
  if(mailEnabled&&incident){
   await client.query(`INSERT INTO nevora_operations.monitor_notices(id,scope_key,incident_id,kind,status)
    SELECT $1,$2,$3,$4,'reserved' WHERE $4='outage' OR EXISTS(SELECT 1 FROM nevora_operations.monitor_notices WHERE scope_key=$2 AND incident_id=$3 AND kind='outage' AND attempts>0)
    ON CONFLICT(scope_key,incident_id,kind) DO NOTHING`,[randomUUID(),role,incident,kind]);
  }
  const notice=mailEnabled&&incident?(await client.query(`SELECT id,attempts FROM nevora_operations.monitor_notices WHERE scope_key=$1 AND incident_id=$2 AND kind=$3 AND status IN('reserved','definite_failure') AND attempts<3 AND next_attempt_at<=clock_timestamp()
   AND (SELECT count(*) FROM nevora_operations.monitor_attempts WHERE scope_key=$1 AND created_at>=date_trunc('day',clock_timestamp() AT TIME ZONE 'UTC') AT TIME ZONE 'UTC')<4 FOR UPDATE`,[role,incident,kind])).rows[0]:null;
  let attempt:string|undefined;
  if(notice){
   attempt=randomUUID();await client.query("UPDATE nevora_operations.monitor_notices SET status='sending',attempts=attempts+1 WHERE id=$1 AND scope_key=$2",[notice.id,role]);
   await client.query("INSERT INTO nevora_operations.monitor_attempts(id,scope_key,notice_id,attempt_number,status) VALUES($1,$2,$3,$4,'sending')",[attempt,role,notice.id,notice.attempts+1]);
  }
  await client.query('COMMIT');inTransaction=false;if(!notice)return {state:'complete'};
  let result:MailResult;try{result=await send(kind);}catch{result='unknown';}
  if(databaseLost)throw Error('monitor_journal_unavailable');
  // An unexpectedly disabled transport after reservation is ambiguous custody,
  // not proof that an earlier SMTP attempt was unaccepted.
  if(!['accepted','definite_failure','unknown'].includes(result))result='unknown';
  await client.query('BEGIN');inTransaction=true;
  await client.query("UPDATE nevora_operations.monitor_attempts SET status=$3 WHERE id=$1 AND scope_key=$2 AND status='sending'",[attempt,role,result]);
  await client.query("UPDATE nevora_operations.monitor_notices SET status=$3,next_attempt_at=clock_timestamp()+interval '15 minutes' WHERE id=$1 AND scope_key=$2 AND status='sending'",[notice.id,role,result]);
  await client.query('COMMIT');inTransaction=false;return {state:'complete'};
 }finally{
  if(inTransaction&&!databaseLost)await client.query('ROLLBACK').catch(()=>{});
  let clean=!databaseLost;if(locked&&!databaseLost)try{clean=(await client.query('SELECT pg_advisory_unlock(hashtextextended($1,0)) unlocked',[role])).rows[0]?.unlocked===true;}catch{clean=false;}
  client.release(!clean||databaseLost);client.removeListener('error',onConnectionError);
 }
}
