import { afterAll, beforeAll, describe, it, vi } from 'vitest';
import assert from 'node:assert/strict';
import { Client } from 'pg';
import { createHash, randomBytes } from 'node:crypto';
import { appendFileSync, existsSync, lstatSync, readFileSync, realpathSync, writeFileSync } from 'node:fs';
import { isAbsolute, join, relative, resolve, sep } from 'node:path';
import { isProxy } from 'node:util/types';
import type { SqlExecutor } from '../../lib/notifications/types';
import { verifyCompleteNativeJsonl } from '../evidence/complete-native-jsonl';
import frozenPins from './f1-native-source-pins.json';
import type { F1NativeCallback, F1NativeVectorId } from './f1-canonical-native-callbacks';

// SOURCE PREPARATION ONLY, UNEXECUTED. Future path:
// src/test/integration/f1-canonical-native.postgres.test.ts
// Only root may opt in using its already-created exact fictional lease.
// No database, role, process or client is created at module import.
// No 0026, runtime graph/enrollment, singleton alteration or provider call.
const transport = vi.hoisted(() => ({
  executor: null as SqlExecutor | null,
  db: null as { query(text: string, values?: readonly unknown[]): Promise<unknown[]> } | null,
}));
vi.mock('server-only', () => ({}));
vi.mock('@/lib/db', async importOriginal => {
  const original = await importOriginal<typeof import('../../lib/db')>();
  return { ...original, getDb: () => {
    if (!transport.db) throw Error('F1_TRANSPORT_NOT_ACTIVE');
    return transport.db;
  } };
});
vi.mock('@/lib/data/notification-transactions', async importOriginal => {
  const original = await importOriginal<typeof import('../../lib/data/notification-transactions')>();
  return { ...original, neonNotificationExecutor: () => {
    if (!transport.executor) throw Error('F1_TRANSPORT_NOT_ACTIVE');
    return transport.executor;
  } };
});

const leasePath = process.env.F_F1_OWNED_LEASE;
const requestedRunDirectory = process.env.F_F1_RUN_DIR;
const completeOptIn = !!leasePath && !!requestedRunDirectory;
const CASE_IDS = ['CR01','CR02','CR03','CR04','TC01','TC02','AT01','SC01','SC02','PB01','PB02','F1GATE'] as const;
const SOURCE_MANIFEST = '/Users/josek0514/Documents/Codex/2026-10-08/files-pasted-by-the-user-nevora/work/f-dev/root/portal-controlled-installation/PRE_NATIVE_015_FINAL_INTENT.json';
const SOURCE_MANIFEST_SHA256 = '3f7148fdfb0b044f4c9dd58ae132b683c55d884b758670afd08436668fb9154a';
const CALLBACK_PATH = 'src/test/integration/f1-canonical-native-callbacks.ts';
const CALLBACK_SHA256 = '96955572d29069a12eca821af84527df6940bb5e962f04f1b8bd047246f05149';
const PINS_PATH = 'src/test/integration/f1-native-source-pins.json';
const PINS_SHA256 = '9fba6ed753fd90f656a7eb03b4ccf0519e4aeaa1c4ca52fd081996e3227d9d48';
const ORIGINAL_TABLES = [
  'availability_exceptions','availability_windows','break_entries','calendar_clock','calendar_operations',
  'calendar_removals','calendar_subscriptions','clocker_break_type_events','clocker_break_types',
  'clocker_command_ledger','clocker_device_credentials','clocker_device_events','clocker_devices',
  'clocker_employee_clock_state','clocker_pin_configuration','clocker_pin_events','clocker_pin_limits',
  'clocker_pin_sessions','communication_lifecycle','communication_operations','communication_receipts',
  'communication_recipients','communication_revisions','communications','coverage_window_position_requirements',
  'employee_attention_operations','employee_attention_receipts','employee_clocker_pins','employee_credentials',
  'employee_location_eligibility','employee_positions','employee_scheduling_settings','employee_sessions',
  'employees','location_coverage_windows','location_staffing_settings','locations','notifications',
  'password_recovery_limits','password_recovery_proofs','payroll_export_profile_revisions','payroll_export_receipts',
  'positions','push_deliveries','push_subscriptions','schedule_acknowledgements','schedule_generation_exclusions',
  'schedule_publication_revision_shifts','schedule_publication_revisions','schedule_template_shifts',
  'schedule_templates','schedule_week_settings','schedules','shift_callouts','shift_change_events',
  'shift_change_operations','shift_change_participation','shift_exchanges','shifts','time_correction_adjustments',
  'time_correction_events','time_correction_requests','time_entries','time_off_requests','timecard_revisions',
  'weekly_availability_submissions','weekly_availability_windows','workspaces',
] as const;
const hash = (value: string | Buffer) => createHash('sha256').update(value).digest('hex');
const quoted = (value: string) => '"' + value.replace(/"/g, '""') + '"';
const literal = (value: string) => "'" + value.replace(/'/g, "''") + "'";
type SourcePin = { path: string; sha256: string; bytes: number };
type Lease = {
  scope: 'OWNED_LOCAL_F10'; closed: false; invocation: string; authorizationReference: string;
  root: string; data: string; credentialFile: string; port: number; pid: number; pidStart: string;
  systemIdentifier: string; database: string; databaseOid: string; marker: string; user: string;
};
type Child = {
  caseId: F1NativeVectorId; name: string; marker: string; createAttempted: boolean;
  createAcknowledged: boolean; oid: string | null; commentAcknowledged: boolean; dropped: boolean;
  client: Client | null; pid: number | null; catalogBefore: string | null; rowsAfter: unknown;
};
type ClientRecord = { label: string; pid: number | null; connected: boolean; closed: boolean };
type CaseRecord = { id: F1NativeVectorId; status: 'STARTED' | 'PASS' | 'FAIL'; phase: string; code?: string };

// Full native definitions/guards are retained, not replaced by booleans or hashes.
// Only mutable physical relation statistics are excluded from identity comparison.
const CATALOG_SQL = [
  "SELECT pg_catalog.jsonb_build_object(",
  "'schemas',COALESCE((SELECT jsonb_agg(to_jsonb(n) ORDER BY n.oid) FROM pg_catalog.pg_namespace n WHERE n.nspname !~ '^pg_' AND n.nspname<>'information_schema'),'[]'::jsonb),",
  "'relations',COALESCE((SELECT jsonb_agg(jsonb_build_object('oid',c.oid::text,'namespace',c.relnamespace::text,'name',c.relname,'kind',c.relkind,'owner',c.relowner::text,'persistence',c.relpersistence,'accessMethod',c.relam::text,'acl',c.relacl,'options',c.reloptions,'rls',c.relrowsecurity,'forceRls',c.relforcerowsecurity,'partition',c.relispartition) ORDER BY c.oid) FROM pg_catalog.pg_class c JOIN pg_catalog.pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname !~ '^pg_' AND n.nspname<>'information_schema'),'[]'::jsonb),",
  "'columns',COALESCE((SELECT jsonb_agg(to_jsonb(a) ORDER BY a.attrelid,a.attnum) FROM pg_catalog.pg_attribute a JOIN pg_catalog.pg_class c ON c.oid=a.attrelid JOIN pg_catalog.pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname !~ '^pg_' AND n.nspname<>'information_schema'),'[]'::jsonb),",
  "'defaults',COALESCE((SELECT jsonb_agg(to_jsonb(d) ORDER BY d.oid) FROM pg_catalog.pg_attrdef d JOIN pg_catalog.pg_class c ON c.oid=d.adrelid JOIN pg_catalog.pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname !~ '^pg_' AND n.nspname<>'information_schema'),'[]'::jsonb),",
  "'constraints',COALESCE((SELECT jsonb_agg(jsonb_build_object('catalog',to_jsonb(k),'definition',pg_catalog.pg_get_constraintdef(k.oid,false)) ORDER BY k.oid) FROM pg_catalog.pg_constraint k JOIN pg_catalog.pg_namespace n ON n.oid=k.connamespace WHERE n.nspname !~ '^pg_' AND n.nspname<>'information_schema'),'[]'::jsonb),",
  "'indexes',COALESCE((SELECT jsonb_agg(to_jsonb(i) ORDER BY i.indexrelid) FROM pg_catalog.pg_index i JOIN pg_catalog.pg_class c ON c.oid=i.indrelid JOIN pg_catalog.pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname !~ '^pg_' AND n.nspname<>'information_schema'),'[]'::jsonb),",
  "'functions',COALESCE((SELECT jsonb_agg(jsonb_build_object('catalog',to_jsonb(p),'definition',pg_catalog.pg_get_functiondef(p.oid)) ORDER BY p.oid) FROM pg_catalog.pg_proc p JOIN pg_catalog.pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname !~ '^pg_' AND n.nspname<>'information_schema'),'[]'::jsonb),",
  "'triggers',COALESCE((SELECT jsonb_agg(jsonb_build_object('catalog',to_jsonb(t),'definition',pg_catalog.pg_get_triggerdef(t.oid,false)) ORDER BY t.oid) FROM pg_catalog.pg_trigger t JOIN pg_catalog.pg_class c ON c.oid=t.tgrelid JOIN pg_catalog.pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname !~ '^pg_' AND n.nspname<>'information_schema'),'[]'::jsonb),",
  "'rules',COALESCE((SELECT jsonb_agg(to_jsonb(r) ORDER BY r.oid) FROM pg_catalog.pg_rewrite r JOIN pg_catalog.pg_class c ON c.oid=r.ev_class JOIN pg_catalog.pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname !~ '^pg_' AND n.nspname<>'information_schema'),'[]'::jsonb),",
  "'policies',COALESCE((SELECT jsonb_agg(to_jsonb(p) ORDER BY p.oid) FROM pg_catalog.pg_policy p JOIN pg_catalog.pg_class c ON c.oid=p.polrelid JOIN pg_catalog.pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname !~ '^pg_' AND n.nspname<>'information_schema'),'[]'::jsonb),",
  "'defaultAcl',COALESCE((SELECT jsonb_agg(to_jsonb(d) ORDER BY d.oid) FROM pg_catalog.pg_default_acl d),'[]'::jsonb)",
  ")::text AS catalog",
].join('\n');

describe.skipIf(!completeOptIn)('ROOT ONLY owned PostgreSQL18.4 F1 canonical reader callbacks', () => {
  let lease: Lease, leaseBytes: string, runDirectory: string, evidencePath: string;
  let admin: Client | null = null, ownerOid: string, baseCatalog: string, baseRoleCatalog: unknown;
  let verified = false, runVerified = false, phase = 'UNOPENED';
  let callbackModule: typeof import('./f1-canonical-native-callbacks');
  const clientRecords = new Map<Client, ClientRecord>(), children: Child[] = [], cases: CaseRecord[] = [];
  const snapshots: unknown[] = [], pending = new Set<Promise<void>>();
  const failures: { phase: string; code: string; caseId?: string }[] = [];
  let activeCase: F1NativeVectorId | null = null;

  function safeCode(error: unknown): string {
    if (!error || typeof error !== 'object' || isProxy(error)) return 'UNCLASSIFIED';
    const code = Object.getOwnPropertyDescriptor(error, 'code');
    if (code && Object.hasOwn(code,'value') && code.value === 'ERR_ASSERTION') return 'ASSERTION';
    if (code && Object.hasOwn(code,'value') && typeof code.value === 'string' && /^[0-9A-Z]{5}$/.test(code.value)) return code.value;
    const name = Object.getOwnPropertyDescriptor(error, 'name');
    if (name && Object.hasOwn(name,'value') && name.value === 'AssertionError') return 'ASSERTION';
    return 'UNCLASSIFIED'; // Never serialize error messages, SQL details, stacks or credential-bearing objects.
  }
  function record(value: unknown) {
    if (!runVerified) return;
    const line = JSON.stringify({ sequence: snapshots.length + 1, data: value });
    const detached = JSON.parse(line) as unknown;
    appendFileSync(evidencePath,line+'\n',{ mode:0o600 });
    snapshots.push(detached); // Own immutable-at-append snapshots; no shared mutable receipt references.
  }
  function failure(error: unknown, at: string, caseId?: string) {
    const observed = { phase: at, code: safeCode(error), ...(caseId ? { caseId } : {}) };
    failures.push(observed);
    let assertionSite:null|{line:number;column:number}=null;
    if(error instanceof Error && safeCode(error)==='ASSERTION'){
      const match=error.stack?.match(/f1-canonical-native-callbacks\.ts:(\d+):(\d+)/);
      if(match)assertionSite={line:Number(match[1]),column:Number(match[2])};
    }
    record({ operation:'FAILURE', ...observed, assertionSite });
  }
  function exactPrivateFile(path: string) {
    assert.ok(isAbsolute(path)); assert.equal(resolve(path),realpathSync(path));
    const info=lstatSync(path); assert.ok(info.isFile()); assert.ok(!info.isSymbolicLink());
    assert.equal(info.uid,process.getuid!()); assert.equal(info.mode&0o777,0o600);
  }
  function exactDirectory(path: string) {
    assert.ok(isAbsolute(path)); assert.equal(resolve(path),realpathSync(path));
    const info=lstatSync(path); assert.ok(info.isDirectory()); assert.ok(!info.isSymbolicLink());
    assert.equal(info.uid,process.getuid!()); assert.equal(info.mode&0o022,0);
  }
  function recheckLease() {
    exactPrivateFile(leasePath!); assert.equal(leasePath,join(lease.root,'ownership.json'));
    assert.equal(readFileSync(leasePath!,'utf8'),leaseBytes);
    exactDirectory(lease.root); exactDirectory(lease.data); assert.equal(lease.data,join(lease.root,'data'));
    exactPrivateFile(lease.credentialFile);
    const within=relative(lease.root,lease.credentialFile);
    assert.ok(within && within!=='..' && !within.startsWith('..'+sep) && !isAbsolute(within));
    const pid=readFileSync(join(lease.data,'postmaster.pid'),'utf8').split('\n');
    assert.equal(pid[0],String(lease.pid)); assert.equal(realpathSync(pid[1]),lease.data);
    assert.equal(pid[2],lease.pidStart); assert.equal(pid[3],String(lease.port));
  }
  function checkSources() {
    assert.equal(hash(readFileSync(SOURCE_MANIFEST)),SOURCE_MANIFEST_SHA256);
    const manifest=JSON.parse(readFileSync(SOURCE_MANIFEST,'utf8')) as { pathCount:number;paths:SourcePin[] };
    assert.equal(manifest.pathCount,1192); assert.equal(manifest.paths.length,1192);
    const overrides=new Map(frozenPins.readerOverlays.map(pin=>[pin.path,pin]));
    for (const pin of manifest.paths) {
      assert.ok(!isAbsolute(pin.path)); assert.ok(!pin.path.split('/').includes('..'));
      const expected=overrides.get(pin.path)??pin, bytes=readFileSync(resolve(pin.path));
      assert.equal(hash(bytes),expected.sha256,pin.path); assert.equal(bytes.length,expected.bytes,pin.path);
    }
    assert.equal(hash(readFileSync(resolve(CALLBACK_PATH))),CALLBACK_SHA256);
    assert.equal(hash(readFileSync(resolve(PINS_PATH))),PINS_SHA256);
    assert.equal(frozenPins.selectedSource.length,55); assert.equal(frozenPins.readerOverlays.length,4);
    assert.equal(frozenPins.originalMigrations.length,25);
    for(const pin of [...frozenPins.selectedSource,...frozenPins.readerOverlays,...frozenPins.originalMigrations]) {
      const bytes=readFileSync(resolve(pin.path)); assert.equal(hash(bytes),pin.sha256,pin.path); assert.equal(bytes.length,pin.bytes,pin.path);
    }
  }
  async function nativeIdentity(client:Client, database:string, oid:string, marker:string) {
    recheckLease();
    const result=await client.query([
      "SELECT pg_catalog.pg_backend_pid() pid,session_user::text login,current_user::text effective,pg_catalog.current_setting('role') role,",
      "(SELECT usesysid::text FROM pg_catalog.pg_stat_activity WHERE pid=pg_catalog.pg_backend_pid()) original_oid,",
      "pg_catalog.current_database() database,d.oid::text database_oid,d.datdba::text database_owner,pg_catalog.shobj_description(d.oid,'pg_database') marker,",
      "pg_catalog.current_setting('data_directory') data,(SELECT system_identifier::text FROM pg_catalog.pg_control_system()) system_id,",
      "pg_catalog.current_setting('server_version_num') version,pg_catalog.current_setting('server_encoding') encoding,",
      "pg_catalog.host(pg_catalog.inet_server_addr()) host,pg_catalog.inet_server_port() port,r.oid::text role_oid,r.rolcanlogin,r.rolsuper,r.rolcreatedb",
      "FROM pg_catalog.pg_database d JOIN pg_catalog.pg_roles r ON r.rolname=session_user WHERE d.datname=pg_catalog.current_database()",
    ].join('\n'));
    assert.equal(result.rows.length,1); const row=result.rows[0];
    record({operation:'NATIVE_IDENTITY_OBSERVATION_BEFORE_ASSERTIONS',phase,database,native:row});
    assert.equal(row.login,lease.user); assert.equal(row.effective,lease.user); assert.equal(row.role,'none');
    assert.equal(row.original_oid,row.role_oid); if(ownerOid) assert.equal(row.role_oid,ownerOid);
    assert.equal(row.database,database); assert.equal(row.database_oid,oid); assert.equal(row.database_owner,row.role_oid);
    assert.equal(row.marker,marker); assert.equal(realpathSync(row.data),lease.data); assert.equal(row.system_id,lease.systemIdentifier);
    assert.equal(row.version,'180004'); assert.equal(row.encoding,'UTF8'); assert.equal(row.host,'127.0.0.1'); assert.equal(row.port,lease.port);
    assert.equal(row.rolcanlogin,true); assert.equal(row.rolsuper,true); assert.equal(row.rolcreatedb,true);
    return row;
  }
  function instrument(client:Client) {
    const original=client.query;
    client.query=(async (...args:unknown[]) => {
      const arg=args[0], text=typeof arg==='string'?arg:(arg as {text?:unknown})?.text;
      assert.equal(typeof text,'string'); assert.ok(!args.some(x=>typeof x==='function'));
      const values=typeof arg==='string'?args[1]:(arg as {values?:unknown})?.values;
      const ordinal=snapshots.length+1;
      record({ operation:'SQL_ATTEMPT', phase, caseId:activeCase, sqlSHA256:hash(text as string),
        parameterCount:Array.isArray(values)?values.length:0, backendPid:clientRecords.get(client)?.pid??null });
      try {
        const result=await Reflect.apply(original,client,args);
        const summaries=(Array.isArray(result)?result:[result]).map(r=>({
          command:r.command??null,rowCount:r.rowCount??null,returnedRows:Array.isArray(r.rows)?r.rows.length:null,
          fields:Array.isArray(r.fields)?r.fields.map((f:{name:string;dataTypeID:number})=>({name:f.name,typeOid:f.dataTypeID})):[],
        }));
        record({ operation:'SQL_ACK', attemptSequence:ordinal, phase, caseId:activeCase, results:summaries,
          immediateClientStatus:client.getTransactionStatus()??null });
        if(activeCase==='CR01'||activeCase==='F1GATE') {
          const groups=Array.isArray(result)?result:[result];
          for(const group of groups)if(group.fields?.some((f:{name:string})=>f.name==='internalCapture'))
            record({operation:'FAILED_CORRECTION_NATIVE_INPUT_DIAGNOSTIC',caseId:activeCase,rows:group.rows});
          for(const group of groups)if(group.fields?.some((f:{name:string})=>f.name==='validForMs'))
            record({operation:'CORRECTION_FINAL_LIFETIME_DIAGNOSTIC',caseId:activeCase,rows:group.rows});
        }
        return result; // Exact native object/rows, without fabricated success or transformed business values.
      } catch(error) {
        record({ operation:'SQL_ERROR',attemptSequence:ordinal,phase,caseId:activeCase,code:safeCode(error),
          immediateClientStatus:client.getTransactionStatus()??null }); throw error;
      }
    }) as Client['query'];
  }
  async function connect(database:string,label:string,child?:Child) {
    recheckLease();
    const password=readFileSync(lease.credentialFile,'utf8');
    assert.ok(password.length>0);
    const client=new Client({host:'127.0.0.1',port:lease.port,user:lease.user,password,database,
      ssl:false,connectionTimeoutMillis:3000});
    clientRecords.set(client,{label,pid:null,connected:false,closed:false});
    if(child)child.client=client; // Bind before awaiting connection; failed setup remains in exact cleanup inventory.
    instrument(client);
    await client.connect(); const entry=clientRecords.get(client)!; entry.connected=true;
    entry.pid=(client as Client&{processID:number}).processID;
    await client.query("SET search_path=pg_catalog; SET DateStyle='ISO, YMD'; SET TimeZone='UTC'; SET log_statement='none'");
    record({operation:'CLIENT_CONNECTED',label,pid:entry.pid,database}); return client;
  }
  async function catalog(client:Client) { return (await client.query(CATALOG_SQL)).rows[0].catalog as string; }
  async function publicRows(client:Client) {
    const output:Record<string,string[]>={};
    for(const name of ORIGINAL_TABLES) output[name]=(await client.query(
      'SELECT pg_catalog.to_jsonb(t)::text wire FROM public.'+quoted(name)+' t ORDER BY pg_catalog.to_jsonb(t)::text COLLATE pg_catalog."C"',
    )).rows.map((row:{wire:string})=>row.wire);
    return output;
  }
  async function rolesCatalog() {
    return (await admin!.query("SELECT pg_catalog.jsonb_build_object('roles',COALESCE((SELECT jsonb_agg(to_jsonb(r) ORDER BY r.oid) FROM pg_catalog.pg_roles r),'[]'::jsonb),'memberships',COALESCE((SELECT jsonb_agg(to_jsonb(m) ORDER BY m.oid) FROM pg_catalog.pg_auth_members m),'[]'::jsonb))::text wire")).rows[0].wire as string;
  }
  async function newChild(caseId:F1NativeVectorId):Promise<Child> {
    assert.ok(verified && admin); recheckLease(); checkSources();
    await nativeIdentity(admin,lease.database,lease.databaseOid,lease.marker);
    const name='f1_'+lease.invocation.slice(3)+'_'+caseId.toLowerCase()+'_'+randomBytes(5).toString('hex');
    const marker=lease.marker+':f1:'+caseId+':'+name;
    assert.ok(Buffer.byteLength(name)<=63);
    assert.equal((await admin.query('SELECT oid FROM pg_catalog.pg_database WHERE datname=$1',[name])).rows.length,0);
    const child:Child={caseId,name,marker,createAttempted:true,createAcknowledged:false,oid:null,
      commentAcknowledged:false,dropped:false,client:null,pid:null,catalogBefore:null,rowsAfter:null};
    children.push(child); record({operation:'CHILD_BEFORE_OWN_CREATE',caseId,name,marker});
    await admin.query('CREATE DATABASE '+quoted(name)); child.createAcknowledged=true;
    const observed=(await admin.query('SELECT oid::text oid,datdba::text owner FROM pg_catalog.pg_database WHERE datname=$1',[name])).rows;
    assert.equal(observed.length,1); assert.equal(observed[0].owner,ownerOid); child.oid=observed[0].oid;
    record({operation:'CHILD_CREATED_OWN_OID',caseId,name,marker,oid:child.oid,ownerOid});
    await admin.query('COMMENT ON DATABASE '+quoted(name)+' IS '+literal(marker)); child.commentAcknowledged=true;
    record({operation:'CHILD_EXACT_OID_MARKED',caseId,name,oid:child.oid,marker});
    const client=await connect(name,'child:'+caseId,child); child.pid=clientRecords.get(client)!.pid;
    record({operation:'CHILD_NATIVE_IDENTITY',caseId,native:await nativeIdentity(client,name,child.oid!,marker)});
    const empty=JSON.parse(await catalog(client)) as {relations:unknown[];functions:unknown[]};
    assert.deepEqual(empty.relations,[]); assert.deepEqual(empty.functions,[]);
    await client.query('SET search_path=public');
    for(const migration of frozenPins.originalMigrations) {
      const bytes=readFileSync(resolve(migration.path)); assert.equal(hash(bytes),migration.sha256);
      assert.equal(client.getTransactionStatus(),'I');
      phase='MIGRATION:'+migration.path; record({operation:'ORIGINAL_MIGRATION_ATTEMPT',caseId,...migration});
      await client.query(bytes.toString('utf8')); assert.equal(client.getTransactionStatus(),'I');
      record({operation:'ORIGINAL_MIGRATION_ACK',caseId,path:migration.path,SHA256:migration.sha256});
    }
    const tables=(await client.query("SELECT c.relname::text name,c.oid::text oid,c.relowner::text owner FROM pg_catalog.pg_class c JOIN pg_catalog.pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='public' AND c.relkind='r' ORDER BY c.relname COLLATE pg_catalog.\"C\"")).rows;
    assert.deepEqual(tables.map((r:{name:string})=>r.name),[...ORIGINAL_TABLES]);
    assert.ok(tables.every((r:{owner:string})=>r.owner===ownerOid));
    assert.equal((await client.query("SELECT oid FROM pg_catalog.pg_namespace WHERE nspname='nevora_tenancy'")).rows.length,0);
    assert.equal((await client.query('SELECT id FROM public.employees')).rows.length,0);
    child.catalogBefore=await catalog(client);
    record({operation:'FULL_25_ORIGINAL_SCHEMA_AND_GUARD_BASELINE',caseId,name,oid:child.oid,tables,
      catalog:child.catalogBefore,originalRows:await publicRows(client),
      limitation:'EXACT_LEGACY_SINGLETON_SOURCE_ONLY_NO_0026_OR_F10_AUTHORITY'});
    return child;
  }
  async function closeClient(client:Client) {
    const entry=clientRecords.get(client)!; if(entry.closed)return;
    await client.end(); entry.closed=true; record({operation:'CLIENT_CLOSED',...entry});
  }
  async function reconcileChild(child:Child) {
    assert.ok(admin && verified); recheckLease();
    await nativeIdentity(admin,lease.database,lease.databaseOid,lease.marker);
    if(child.client && !clientRecords.get(child.client)!.closed) await closeClient(child.client);
    const observed=(await admin.query("SELECT oid::text oid,datdba::text owner,pg_catalog.shobj_description(oid,'pg_database') marker FROM pg_catalog.pg_database WHERE datname=$1",[child.name])).rows;
    if(child.dropped){assert.deepEqual(observed,[]);return;}
    // A missing CREATE/COMMENT acknowledgement does not permit guessing an OID.
    // Root outer recovery must preserve/reconcile unknown identity separately.
    if(!child.createAcknowledged || child.oid===null || !child.commentAcknowledged) {
      assert.deepEqual(observed,[]); child.dropped=true; return;
    }
    assert.deepEqual(observed,[{oid:child.oid,owner:ownerOid,marker:child.marker}]);
    const backends=(await admin.query('SELECT pid,usesysid::text oid FROM pg_catalog.pg_stat_activity WHERE datid=$1::oid',[child.oid])).rows;
    assert.deepEqual(backends,[]); // Never terminate an unknown backend or use FORCE/CASCADE.
    record({operation:'CHILD_BEFORE_EXACT_OWN_DROP',caseId:child.caseId,name:child.name,oid:child.oid,marker:child.marker});
    await admin.query('DROP DATABASE '+quoted(child.name));
    assert.deepEqual((await admin.query('SELECT oid FROM pg_catalog.pg_database WHERE datname=$1 OR oid=$2::oid',[child.name,child.oid])).rows,[]);
    child.dropped=true; record({operation:'CHILD_EXACT_OID_MARKER_DROP_AND_NATIVE_ABSENCE',caseId:child.caseId,name:child.name,oid:child.oid,marker:child.marker});
  }

  beforeAll(async () => {
    phase='SOURCE_AND_LEASE_CUSTODY';
    try {
    for(const name of ['DATABASE_URL','FUEL_TEST_DATABASE_URL','NEVORA_APP_DATABASE_URL','NEVORA_WORKER_DATABASE_URL',
      'PGHOST','PGPORT','PGUSER','PGPASSWORD','PGDATABASE','PGSSLMODE','PGOPTIONS','PGSERVICE','PGSERVICEFILE'])
      assert.equal(process.env[name],undefined,'AMBIENT_CONFIGURATION_FORBIDDEN:'+name);
    assert.ok(isAbsolute(requestedRunDirectory!)); runDirectory=realpathSync(requestedRunDirectory!);
    assert.equal(requestedRunDirectory,runDirectory); exactDirectory(runDirectory);
    evidencePath=join(runDirectory,'f1-canonical-native-operations.jsonl');
    for(const name of ['f1-canonical-native-operations.jsonl','f1-canonical-native-cleanup.json','f1-canonical-native-custody.json'])
      assert.equal(existsSync(join(runDirectory,name)),false);
    writeFileSync(evidencePath,'',{flag:'wx',mode:0o600});runVerified=true;
    checkSources(); exactPrivateFile(leasePath!); leaseBytes=readFileSync(leasePath!,'utf8'); lease=JSON.parse(leaseBytes) as Lease;
    assert.equal(lease.scope,'OWNED_LOCAL_F10');assert.equal(lease.closed,false);assert.match(lease.invocation,/^f1_[a-f0-9]{16}$/);
    assert.equal(lease.marker,'f10-owned:'+lease.invocation);
    assert.equal(lease.authorizationReference,'F-DEV-COMPLETE-001:f1-canonical-reader:'+lease.invocation);
    assert.ok(Number.isSafeInteger(lease.pid)&&lease.pid>1);assert.ok(Number.isSafeInteger(lease.port)&&lease.port>0&&lease.port<65536);
    assert.match(lease.pidStart,/^[1-9][0-9]*$/);assert.match(lease.databaseOid,/^[1-9][0-9]*$/);
    assert.match(lease.systemIdentifier,/^[1-9][0-9]*$/);assert.match(lease.database,/^[a-z][a-z0-9_]{1,62}$/);
    assert.match(lease.user,/^[a-z][a-z0-9_]{1,62}$/);recheckLease();
    callbackModule=await import('./f1-canonical-native-callbacks');
    assert.deepEqual(callbackModule.F1_CANONICAL_NATIVE_CALLBACKS.map(c=>c.id),[...CASE_IDS]);
    callbackModule.assertFrozenF1ReaderSources();
    phase='BASE_NATIVE_CUSTODY';admin=await connect(lease.database,'base-admin');
    const identity=await nativeIdentity(admin,lease.database,lease.databaseOid,lease.marker);ownerOid=identity.role_oid;
    assert.equal(admin.getTransactionStatus(),'I');baseCatalog=await catalog(admin);
    const empty=JSON.parse(baseCatalog) as {relations:unknown[];functions:unknown[]};
    assert.deepEqual(empty.relations,[]);assert.deepEqual(empty.functions,[]);
    baseRoleCatalog=await rolesCatalog();verified=true;
    const custody={sourceManifest:SOURCE_MANIFEST,sourceManifestSHA256:SOURCE_MANIFEST_SHA256,
      callbackSHA256:CALLBACK_SHA256,pinsSHA256:PINS_SHA256,leaseSHA256:hash(leaseBytes),native:identity,
      baseCatalog,baseRoleCatalog,expectedCases:[...CASE_IDS],expectedChildren:12,expectedSuiteClients:13,
      privateCredentialBytesRetained:false,scope:'FICTIONAL_LEGACY_SOURCE_READERS_NOT_F10_TENANT_AUTHORITY'};
    writeFileSync(join(runDirectory,'f1-canonical-native-custody.json'),JSON.stringify(custody,null,2)+'\n',{flag:'wx',mode:0o600});
    record({operation:'BASE_NATIVE_CUSTODY',...custody});
    } catch(error) { failure(error,phase);throw Error('F1_NATIVE_SETUP_FAILED'); }
  },120000);

  for(const id of CASE_IDS) it(id+' frozen canonical callback with original0001–0025 and one real source Client',async () => {
    const attempt=(async () => {
      assert.equal(activeCase,null);activeCase=id;phase='CASE_CREATE';
      const state:CaseRecord={id,status:'STARTED',phase};cases.push(state);
      let child:Child|undefined, failed=false;
      try {
        assert.ok(verified);child=await newChild(id);phase='CALLBACK:'+id;
        const callback:F1NativeCallback=callbackModule.F1_CANONICAL_NATIVE_CALLBACKS.find(c=>c.id===id)!;
        assert.ok(callback);assert.equal(child.client!.getTransactionStatus(),'I');
        transport.executor=callbackModule.actualCaseExecutor(child.client!);
        transport.db=callbackModule.actualSchedulingDbTransport(transport.executor);
        record({operation:'CALLBACK_BEGIN',caseId:id,childOid:child.oid,backendPid:child.pid,
          transport:'actualCaseExecutor_AND_actualSchedulingDbTransport_SAME_REAL_CLIENT'});
        await callback.run({client:child.client!,record:value=>record({operation:'CALLBACK_RECEIPT',caseId:id,value})});
        assert.equal(child.client!.getTransactionStatus(),'I');
        phase='CASE_FINAL_SOURCE';await nativeIdentity(child.client!,child.name,child.oid!,child.marker);
        assert.equal(await catalog(child.client!),child.catalogBefore);
        child.rowsAfter=await publicRows(child.client!);
        record({operation:'CASE_FULL_FINAL_ROWS_AND_UNCHANGED_CATALOG',caseId:id,catalog:child.catalogBefore,rows:child.rowsAfter});
      } catch(error) {
        failed=true;state.status='FAIL';state.phase=phase;state.code=safeCode(error);failure(error,phase,id);
      } finally {
        transport.executor=null;transport.db=null;phase='CASE_RECONCILIATION';
        if(!child)child=children.find(c=>c.caseId===id); // Own pre-recorded partial setup, never rediscover an ambient database.
        if(child?.client && clientRecords.get(child.client)!.connected && !clientRecords.get(child.client)!.closed) {
          try { await child.client.query('ROLLBACK');assert.equal(child.client.getTransactionStatus(),'I');
            record({operation:'OWN_CHILD_UNCONDITIONAL_ROLLBACK_ACK_IDLE',caseId:id,backendPid:child.pid}); }
          catch(error){failed=true;failure(error,phase,id);}
        }
        if(child) try{await reconcileChild(child);}catch(error){failed=true;failure(error,phase,id);}
        state.status=failed?'FAIL':'PASS';state.phase=phase;activeCase=null;
        record({operation:'CASE_FINISHED',...state});
      }
      if(failed)throw Error('F1_NATIVE_CASE_FAILED:'+id);
    })();
    pending.add(attempt);
    try{await attempt;}finally{pending.delete(attempt);}
  // QA-only completion allowance, never an operational latency/TTL/production SLA.
  },120000);

  afterAll(async () => {
    // Reconcile any timed-out callback before touching its exact child/client.
    // Root's outer one-shot operator owns process/deadline recovery if it cannot settle.
    await Promise.allSettled([...pending]);transport.executor=null;transport.db=null;
    phase='FINAL_EXACT_CLEANUP';
    for(const [client,entry] of clientRecords) if(client!==admin&&!entry.closed) {
      if(entry.connected) {
        try{await client.query('ROLLBACK');assert.equal(client.getTransactionStatus(),'I');}catch(error){failure(error,'FINAL_OWN_ROLLBACK');}
      }
      try{await closeClient(client);}catch(error){failure(error,'CLIENT_CLOSE');}
    }
    for(const child of children) {
      try{await reconcileChild(child);}catch(error){failure(error,phase,child.caseId);}
    }
    if(admin) {
      try {
        if(verified) {
          await admin.query('ROLLBACK');assert.equal(admin.getTransactionStatus(),'I');
          await nativeIdentity(admin,lease.database,lease.databaseOid,lease.marker);
          assert.equal(await catalog(admin),baseCatalog);assert.deepEqual(await rolesCatalog(),baseRoleCatalog);
          assert.deepEqual((await admin.query('SELECT oid FROM pg_catalog.pg_database WHERE datname=ANY($1::text[]) OR oid=ANY($2::oid[])',
            [children.map(c=>c.name),children.flatMap(c=>c.oid===null?[]:[c.oid])])).rows,[]);
          const closedPids=[...clientRecords].filter(([c])=>c!==admin).flatMap(([,e])=>e.pid===null?[]:[e.pid]);
          assert.deepEqual((await admin.query('SELECT pid FROM pg_catalog.pg_stat_activity WHERE pid=ANY($1::int4[])',[closedPids])).rows,[]);
          checkSources();recheckLease();
          record({operation:'BASE_ROLE_CATALOG_SOURCE_AND_CHILD_BACKEND_CLOSURE',baseCatalog,baseRoleCatalog,
            expectedChildren:12,createdChildren:children.length,allChildrenDropped:children.every(c=>c.dropped),closedPids});
        }
      }catch(error){failure(error,phase);}
      finally{try{await closeClient(admin);}catch(error){failure(error,'BASE_ADMIN_CLOSE');}}
    }
    if(runVerified) {
      const jsonl=await verifyCompleteNativeJsonl(evidencePath,snapshots,{requireCanonicalLines:true});
      const cleanup={verified,cases,children:children.map(({client,catalogBefore,rowsAfter,...child})=>({
          ...child,fullCatalogAndFinalRowsRetainedInCompleteJSONL:catalogBefore!==null&&rowsAfter!==null,
          suiteClientRecord:client?clientRecords.get(client):null})),
        clients:[...clientRecords.values()],createdClientCount:clientRecords.size,closedClientCount:[...clientRecords.values()].filter(c=>c.closed).length,
        createdChildCount:children.length,expectedCaseCount:12,expectedChildCount:12,expectedSuiteClientCount:13,
        failures,jsonl,cleaned:verified&&children.every(c=>c.dropped)&&[...clientRecords.values()].every(c=>c.closed),
        authority:'FICTIONAL_ORIGINAL_LEGACY_READER_BEHAVIOR_ONLY_NOT_F10_F6_OR_TENANT_PROOF',
        outerRootLeaseCleanup:'ROOT_OPERATOR_MUST_VERIFY_BASE_OID_MARKER_DROP_PID_START_SYSTEM_LISTENER_DATA_DUMMY_CREDENTIAL_ABSENCE',
        limits:['NO_0026_OR_ENROLLMENT','NO_SAME_DATABASE_A_B_POSITIVE','NO_ACTUAL_NEON','NO_CURRENT_F10_PRIVATE_ISSUER','NO_F6_RELEASE']};
      writeFileSync(join(runDirectory,'f1-canonical-native-cleanup.json'),JSON.stringify(cleanup,null,2)+'\n',{flag:'wx',mode:0o600});
      assert.equal(cleanup.closedClientCount,cleanup.createdClientCount);
      if(verified){assert.equal(children.length,12);assert.equal(clientRecords.size,13);assert.deepEqual(cases.map(c=>c.id),[...CASE_IDS]);assert.ok(cleanup.cleaned);}
      assert.equal(failures.length,0,'F1_NATIVE_FAILURES_OR_CLEANUP_UNCONFIRMED');
    }
  },180000);
});
