// UNUSED LOCAL-ONLY source preparation. This continues root's separately
// authenticated fixture/installer/Node-source custody; it authenticates none of
// those from caller JSON. No production transport, cookie, PortalProof or grants.
import 'server-only';
import { readFileSync, realpathSync, lstatSync } from 'node:fs';
import { join } from 'node:path';
import { Socket } from 'node:net';
import { createHash, randomBytes } from 'node:crypto';
import { types as nodeTypes } from 'node:util';
import { Client } from 'pg';
import { Temporal } from '@js-temporal/polyfill';
import { normalizeWorkspaceLocator, normalizeEmployeeNumber } from '../tenancy/identity';
import { decodeTypedMigrationWireValue } from '../tenancy/migrations/typed-wire';
import { validateWorkspaceIncarnation } from '../tenancy/runtime/workspace-incarnation';
import { RUNTIME_CATALOG_SHARED_FENCE_SQL } from '../tenancy/runtime/catalog-fence.server';
import { verifyPassword } from './password';

declare const witnessBrand: unique symbol;
export type OwnedLocalPortalVerifierWitness = Readonly<{ [witnessBrand]: true }>;
export type PortalLocalSessionReceipt = Readonly<{
  workspaceId: string; employeeId: string; createdAt: string; expiresAt: string;
  workspaceIncarnation: string; portalAccessVersion: string; mustChangePassword: boolean;
}>;
export type PortalLocalSessionOutcome = Readonly<{
  status: 'COMMITTED_LOCAL_SESSION_NOT_PORTAL_PROOF'; receipt: PortalLocalSessionReceipt; bearer: string;
}> | Readonly<{ status: 'DENY' | 'UNAVAILABLE' | 'OUTCOME_UNKNOWN' }>;
export type OwnedLocalPortalVerifierEvidence = Readonly<{
  format: 'OWNED_LOCAL_PORTAL_VERIFIER_ENROLLMENT_V1'; clusterRoot: string; leaseSha256: string;
  invocation: string; database: string; databaseOid: string; marker: string;
  verifierRole: string; verifierRoleOid: string; writerOwner: string; writerOwnerOid: string;
}>;
const DENY = Object.freeze({ status: 'DENY' as const });
const UNAVAILABLE = Object.freeze({ status: 'UNAVAILABLE' as const });
const UNKNOWN = Object.freeze({ status: 'OUTCOME_UNKNOWN' as const });
const SHA = /^[a-f0-9]{64}$/;
const ROUTINE_CONTRACTS = [{"name":"capture_portal_verifier_native_profile","argumentTypes":"26 26","returnType":"3802","securityDefiner":"false","language":"sql","writerOwned":false,"bodySha256":"9bc2087376c043e256f3f6171d8e2b6ab3052aba4b41e59ab6fb4e01859c6d0f"},{"name":"assert_original_portal_verifier_service","argumentTypes":"","returnType":"2278","securityDefiner":"false","language":"plpgsql","writerOwned":true,"bodySha256":"b868adeac0eba4eec6811c3ccd7aa494aa2760404b71657d092aadc5c2970b1e"},{"name":"acquire_portal_login_source","argumentTypes":"25 25","returnType":"3802","securityDefiner":"true","language":"plpgsql","writerOwned":true,"bodySha256":"7359566d0a582b88c5313914ceeb725c369dd7f9deda3b8d647f854afacfd03a"},{"name":"insert_portal_reviewed_session","argumentTypes":"25 25 25 3802","returnType":"3802","securityDefiner":"true","language":"plpgsql","writerOwned":true,"bodySha256":"18e025645d09827644fd5500971700c61925ef412876d1a1d725698065e6626f"}] as const;
const PROFILE_SELECT_SQL = "\nWITH selected_relations AS (\n  SELECT c.*,n.nspname FROM pg_catalog.pg_class AS c\n  JOIN pg_catalog.pg_namespace AS n ON n.oid=c.relnamespace\n  WHERE (n.nspname,c.relname) IN (\n    ('pg_catalog','pg_settings'),('public','workspaces'),('public','employees'),('public','employee_credentials'),('public','employee_sessions'),\n    ('nevora_tenancy','employee_login_identity'),('nevora_tenancy','workspace_locator'),\n    ('nevora_tenancy','workspace_incarnation_counter'),('nevora_tenancy','portal_authority'),\n    ('nevora_tenancy','portal_session_issuance'),('nevora_tenancy','portal_verifier_service_binding'),\n    ('nevora_tenancy','runtime_role_binding'),('nevora_tenancy','owned_table_contract'),\n    ('nevora_tenancy','expansion_protocol'))\n), selected_functions AS (\n  SELECT p.*,n.nspname FROM pg_catalog.pg_proc AS p\n  JOIN pg_catalog.pg_namespace AS n ON n.oid=p.pronamespace\n  WHERE n.nspname='nevora_tenancy' AND p.proname IN (\n    'capture_portal_verifier_native_profile','assert_original_portal_verifier_service',\n    'acquire_portal_login_source','insert_portal_reviewed_session',\n    'source_write_fence','source_identity_guard','guard_portal_session_issuance',\n    'guard_portal_authority','guard_workspace_incarnation_counter','guard_workspace_locator',\n    'guard_employee_login_identity')\n), all_acl AS (\n  SELECT 'DATABASE'::pg_catalog.text AS class,d.oid,0 AS subobject,a.* FROM pg_catalog.pg_database d\n    CROSS JOIN LATERAL pg_catalog.aclexplode(COALESCE(d.datacl,pg_catalog.acldefault('d',d.datdba))) a\n  UNION ALL SELECT 'SCHEMA',n.oid,0,a.* FROM pg_catalog.pg_namespace n\n    CROSS JOIN LATERAL pg_catalog.aclexplode(COALESCE(n.nspacl,pg_catalog.acldefault('n',n.nspowner))) a\n  UNION ALL SELECT 'RELATION',c.oid,0,a.* FROM pg_catalog.pg_class c\n    CROSS JOIN LATERAL pg_catalog.aclexplode(COALESCE(c.relacl,pg_catalog.acldefault(CASE WHEN c.relkind='S' THEN 's'::pg_catalog.\"char\" ELSE 'r'::pg_catalog.\"char\" END,c.relowner))) a\n  UNION ALL SELECT 'COLUMN',c.oid,col.attnum,a.* FROM pg_catalog.pg_attribute col JOIN pg_catalog.pg_class c ON c.oid=col.attrelid\n    CROSS JOIN LATERAL pg_catalog.aclexplode(col.attacl) a WHERE col.attnum>0 AND NOT col.attisdropped\n  UNION ALL SELECT 'FUNCTION',p.oid,0,a.* FROM pg_catalog.pg_proc p\n    CROSS JOIN LATERAL pg_catalog.aclexplode(COALESCE(p.proacl,pg_catalog.acldefault('f',p.proowner))) a\n  UNION ALL SELECT 'TYPE',t.oid,0,a.* FROM pg_catalog.pg_type t CROSS JOIN LATERAL pg_catalog.aclexplode(COALESCE(t.typacl,pg_catalog.acldefault('T',t.typowner))) a\n  UNION ALL SELECT 'LANGUAGE',l.oid,0,a.* FROM pg_catalog.pg_language l CROSS JOIN LATERAL pg_catalog.aclexplode(COALESCE(l.lanacl,pg_catalog.acldefault('l',l.lanowner))) a\n  UNION ALL SELECT 'TABLESPACE',t.oid,0,a.* FROM pg_catalog.pg_tablespace t CROSS JOIN LATERAL pg_catalog.aclexplode(COALESCE(t.spcacl,pg_catalog.acldefault('t',t.spcowner))) a\n  UNION ALL SELECT 'FDW',f.oid,0,a.* FROM pg_catalog.pg_foreign_data_wrapper f CROSS JOIN LATERAL pg_catalog.aclexplode(COALESCE(f.fdwacl,pg_catalog.acldefault('F',f.fdwowner))) a\n  UNION ALL SELECT 'SERVER',s.oid,0,a.* FROM pg_catalog.pg_foreign_server s CROSS JOIN LATERAL pg_catalog.aclexplode(COALESCE(s.srvacl,pg_catalog.acldefault('S',s.srvowner))) a\n  UNION ALL SELECT 'DEFAULT_ACL',d.oid,0,a.* FROM pg_catalog.pg_default_acl d CROSS JOIN LATERAL pg_catalog.aclexplode(d.defaclacl) a\n  UNION ALL SELECT 'PARAMETER',p.oid,0,a.* FROM pg_catalog.pg_parameter_acl p CROSS JOIN LATERAL pg_catalog.aclexplode(p.paracl) a\n  UNION ALL SELECT 'LARGE_OBJECT',l.oid,0,a.* FROM pg_catalog.pg_largeobject_metadata l\n    CROSS JOIN LATERAL pg_catalog.aclexplode(COALESCE(l.lomacl,pg_catalog.acldefault('L',l.lomowner))) a\n)\nSELECT pg_catalog.jsonb_build_object(\n  'databaseOid',(SELECT oid::pg_catalog.text FROM pg_catalog.pg_database WHERE datname=pg_catalog.current_database()),\n  'serverVersion',pg_catalog.current_setting('server_version_num'),\n  'roles',(SELECT COALESCE(pg_catalog.jsonb_agg(pg_catalog.to_jsonb(r) ORDER BY r.oid),'[]'::pg_catalog.jsonb)\n    FROM pg_catalog.pg_roles r WHERE r.oid IN ($1::pg_catalog.oid,$2::pg_catalog.oid)),\n  'schemas',(SELECT COALESCE(pg_catalog.jsonb_agg(pg_catalog.to_jsonb(n) ORDER BY n.oid),'[]'::pg_catalog.jsonb) FROM pg_catalog.pg_namespace n WHERE n.nspname IN('public','nevora_tenancy')),\n  'memberships',(SELECT COALESCE(pg_catalog.jsonb_agg(pg_catalog.to_jsonb(m) ORDER BY m.roleid,m.member,m.grantor),'[]'::pg_catalog.jsonb)\n    FROM pg_catalog.pg_auth_members m WHERE m.roleid IN ($1::pg_catalog.oid,$2::pg_catalog.oid) OR m.member IN ($1::pg_catalog.oid,$2::pg_catalog.oid) OR m.grantor IN ($1::pg_catalog.oid,$2::pg_catalog.oid)),\n  'ownership',(SELECT COALESCE(pg_catalog.jsonb_agg(pg_catalog.to_jsonb(s) ORDER BY s.dbid,s.classid,s.objid,s.objsubid),'[]'::pg_catalog.jsonb)\n    FROM pg_catalog.pg_shdepend s WHERE s.refclassid='pg_catalog.pg_authid'::pg_catalog.regclass AND s.refobjid IN ($1::pg_catalog.oid,$2::pg_catalog.oid) AND s.deptype='o'),\n  'relations',(SELECT COALESCE(pg_catalog.jsonb_agg(pg_catalog.jsonb_build_object('oid',c.oid::pg_catalog.text,'schema',c.nspname,'name',c.relname,'ownerOid',c.relowner::pg_catalog.text,'kind',c.relkind,'persistence',c.relpersistence,'rowTypeOid',c.reltype::pg_catalog.text,'accessMethodOid',c.relam::pg_catalog.text,'tablespaceOid',c.reltablespace::pg_catalog.text,'acl',c.relacl,'options',c.reloptions,'rlsEnabled',c.relrowsecurity,'rlsForced',c.relforcerowsecurity,'replicaIdentity',c.relreplident,'isPartition',c.relispartition,'partitionBound',c.relpartbound::pg_catalog.text) ORDER BY c.nspname COLLATE pg_catalog.\"C\",c.relname COLLATE pg_catalog.\"C\"),'[]'::pg_catalog.jsonb) FROM selected_relations c),\n  'columns',(SELECT COALESCE(pg_catalog.jsonb_agg(pg_catalog.to_jsonb(a) ORDER BY a.attrelid,a.attnum),'[]'::pg_catalog.jsonb) FROM pg_catalog.pg_attribute a JOIN selected_relations c ON c.oid=a.attrelid WHERE a.attnum>0 AND NOT a.attisdropped),\n  'defaults',(SELECT COALESCE(pg_catalog.jsonb_agg(pg_catalog.to_jsonb(d) ORDER BY d.adrelid,d.adnum),'[]'::pg_catalog.jsonb) FROM pg_catalog.pg_attrdef d JOIN selected_relations c ON c.oid=d.adrelid),\n  'constraints',(SELECT COALESCE(pg_catalog.jsonb_agg(pg_catalog.to_jsonb(k) ORDER BY k.conrelid,k.oid),'[]'::pg_catalog.jsonb) FROM pg_catalog.pg_constraint k JOIN selected_relations c ON c.oid=k.conrelid),\n  'indexes',(SELECT COALESCE(pg_catalog.jsonb_agg(pg_catalog.to_jsonb(i) ORDER BY i.indrelid,i.indexrelid),'[]'::pg_catalog.jsonb) FROM pg_catalog.pg_index i JOIN selected_relations c ON c.oid=i.indrelid),\n  'triggers',(SELECT COALESCE(pg_catalog.jsonb_agg(pg_catalog.to_jsonb(t) ORDER BY t.tgrelid,t.oid),'[]'::pg_catalog.jsonb) FROM pg_catalog.pg_trigger t JOIN selected_relations c ON c.oid=t.tgrelid),\n  'policies',(SELECT COALESCE(pg_catalog.jsonb_agg(pg_catalog.jsonb_build_object('native',pg_catalog.to_jsonb(p),'using',pg_catalog.pg_get_expr(p.polqual,p.polrelid,false),'withCheck',pg_catalog.pg_get_expr(p.polwithcheck,p.polrelid,false)) ORDER BY p.polrelid,p.polname COLLATE pg_catalog.\"C\"),'[]'::pg_catalog.jsonb) FROM pg_catalog.pg_policy p JOIN selected_relations c ON c.oid=p.polrelid),\n  'settingsDefinition',pg_catalog.pg_get_viewdef('pg_catalog.pg_settings'::pg_catalog.regclass,false),\n  'rules',(SELECT COALESCE(pg_catalog.jsonb_agg(pg_catalog.to_jsonb(w) ORDER BY w.ev_class,w.oid),'[]'::pg_catalog.jsonb) FROM pg_catalog.pg_rewrite w JOIN selected_relations c ON c.oid=w.ev_class),\n  'functions',(SELECT COALESCE(pg_catalog.jsonb_agg(pg_catalog.jsonb_build_object('native',pg_catalog.to_jsonb(p),'definition',pg_catalog.pg_get_functiondef(p.oid)) ORDER BY p.proname COLLATE pg_catalog.\"C\",p.oid),'[]'::pg_catalog.jsonb) FROM selected_functions p),\n  'dependencies',(SELECT COALESCE(pg_catalog.jsonb_agg(pg_catalog.to_jsonb(d) ORDER BY d.classid,d.objid,d.objsubid,d.refclassid,d.refobjid,d.refobjsubid,d.deptype),'[]'::pg_catalog.jsonb) FROM pg_catalog.pg_depend d WHERE d.classid='pg_catalog.pg_proc'::pg_catalog.regclass AND d.objid IN (SELECT oid FROM selected_functions)),\n  'acl',(SELECT COALESCE(pg_catalog.jsonb_agg(pg_catalog.to_jsonb(a) ORDER BY a.class COLLATE pg_catalog.\"C\",a.oid,a.subobject,a.grantee,a.grantor,a.privilege_type COLLATE pg_catalog.\"C\"),'[]'::pg_catalog.jsonb) FROM all_acl a WHERE a.grantee IN (0,$1::pg_catalog.oid,$2::pg_catalog.oid)),\n  'initialPrivileges',(SELECT COALESCE(pg_catalog.jsonb_agg(pg_catalog.to_jsonb(i) ORDER BY i.classoid,i.objoid,i.objsubid),'[]'::pg_catalog.jsonb) FROM pg_catalog.pg_init_privs i)\n);\n";

const SOURCE_SHA = '5d7ec8a2abb6cbe0f2aaf879a0e532841cdffa3cf6a29a5e55c050dc0ddc0ff5';
const nativeQuery = Client.prototype.query;
const nativeStatus = Client.prototype.getTransactionStatus;
const textTypes = Object.freeze({ getTypeParser: () => (value: string) => value });
const failures = new WeakMap<object, 'DENY' | 'UNAVAILABLE'>();
class LocalFailure extends Error {
  constructor(status: 'DENY' | 'UNAVAILABLE') { super(status); failures.set(this, status); Object.freeze(this); }
}
function fail(status: 'DENY' | 'UNAVAILABLE' = 'DENY'): never { throw new LocalFailure(status); }
const sha = (value: string) => createHash('sha256').update(value, 'utf8').digest('hex');
function own(object: object, key: string): unknown {
  const property = Object.getOwnPropertyDescriptor(object, key);
  if (!property || !Object.hasOwn(property, 'value')) return fail();
  return property.value;
}
function closed(value: unknown, keys: readonly string[]): Record<string, unknown> {
  if (!value || typeof value !== 'object' || nodeTypes.isProxy(value) || Array.isArray(value)) return fail();
  const prototype = Object.getPrototypeOf(value);
  if (prototype !== null && prototype !== Object.prototype) return fail();
  const descriptors = Object.getOwnPropertyDescriptors(value), names = Reflect.ownKeys(descriptors);
  if (names.length !== keys.length || names.some(key => typeof key !== 'string' || !keys.includes(key))) return fail();
  const detached: Record<string, unknown> = Object.create(null);
  for (const key of keys) {
    const property = Object.hasOwn(descriptors, key) ? descriptors[key] : undefined;
    if (!property || !Object.hasOwn(property, 'value') || !property.enumerable) return fail();
    Object.defineProperty(detached, key, { enumerable: true, value: property.value });
  }
  return Object.freeze(detached);
}
function dense(value: unknown): unknown[] {
  if (!value || typeof value !== 'object' || nodeTypes.isProxy(value) || !Array.isArray(value) || Object.getPrototypeOf(value) !== Array.prototype) return fail();
  const length = own(value, 'length');
  if (typeof length !== 'number' || !Number.isSafeInteger(length) || length < 0 || Reflect.ownKeys(value).length !== length + 1) return fail();
  return Array.from({ length }, (_, index) => own(value, String(index)));
}
function text(value: unknown): string {
  const wire = decodeTypedMigrationWireValue('text', value);
  if (wire.status !== 'DECODED' || wire.value.kind !== 'SCALAR') return fail();
  return wire.value.wire.text;
}
function id(value: unknown): string { const result = text(value); return result.length ? result : fail(); }
function oid(value: unknown): string {
  const result = id(value); return /^[1-9][0-9]*$/.test(result) && BigInt(result) <= BigInt('4294967295') ? result : fail();
}
function positive(value: unknown): string {
  const result = validateWorkspaceIncarnation(value); return result.status === 'VALID' ? result.value : fail();
}
function timestamp(value: unknown): string {
  const result = text(value);
  if (!/^\d{4}-\d{2}-\d{2}[ T]\d{2}:\d{2}:\d{2}(?:\.\d{1,6})?(?:Z|[+-]\d{2}(?::\d{2})?)$/.test(result)) return fail();
  if (result.slice(11,13) > '23' || result.slice(14,16) > '59' || result.slice(17,19) > '59') return fail();
  try { Temporal.Instant.from(result.replace(' ', 'T').replace(/([+-]\d{2})$/, '$1:00')); } catch { return fail(); }
  return result; // preserve source text, timezone and microseconds exactly
}
function boolean(value: unknown): boolean { return typeof value === 'boolean' ? value : fail(); }
function input(value: unknown) {
  const data = closed(value, ['workspaceLocator', 'employeeNumber', 'password']);
  const locator = normalizeWorkspaceLocator(data.workspaceLocator);
  const employeeNumber = normalizeEmployeeNumber(text(data.employeeNumber));
  // Password is never a SQL parameter. Preserve the existing password policy,
  // including supported Unicode/NUL characters; only missing/nonstring denies.
  if (!locator || !employeeNumber || typeof data.password !== 'string' || !data.password.length) return fail();
  return Object.freeze({ workspaceLocator: locator, normalizedNumber: employeeNumber, password: data.password });
}
function evidence(value: unknown): OwnedLocalPortalVerifierEvidence {
  const data = closed(value, ['format','clusterRoot','leaseSha256','invocation','database','databaseOid','marker','verifierRole','verifierRoleOid','writerOwner','writerOwnerOid']);
  if (data.format !== 'OWNED_LOCAL_PORTAL_VERIFIER_ENROLLMENT_V1' || typeof data.leaseSha256 !== 'string' || !SHA.test(data.leaseSha256) || typeof data.invocation !== 'string' || !text(data.invocation).length) return fail();
  for (const key of ['clusterRoot','database','marker','verifierRole','writerOwner']) id(data[key]);
  for (const key of ['databaseOid','verifierRoleOid','writerOwnerOid']) oid(data[key]);
  if (data.verifierRole === data.writerOwner || data.verifierRoleOid === data.writerOwnerOid) return fail();
  return data as unknown as OwnedLocalPortalVerifierEvidence;
}
type LedgerEntry = Readonly<{
  format: string; invocation: string; database: string; databaseOid: string; marker: string;
  verifierRole: string; verifierRoleOid: string; writerOwner: string; writerOwnerOid: string;
  installerRoleOid: string; verifierSourceSha256: string; verifierSourceText: string;
  routineOids: Readonly<Record<string, string>>; nativeProfileCapsuleText: string;
}>;
type State = {
  client: Client; evidence: OwnedLocalPortalVerifierEvidence; entry: LedgerEntry;
  leaseBytes: string; leaseInode: number; pid: number; pidStart: string; port: number;
  backend: readonly string[]; busy: boolean; invalid: boolean;
};
const issued = new WeakMap<object, State>();
const registered = new WeakMap<Client, State>();
function lease(binding: OwnedLocalPortalVerifierEvidence) {
  const root = realpathSync(binding.clusterRoot), data = join(root, 'data'), path = join(root, 'ownership.json');
  if (root !== binding.clusterRoot || realpathSync(data) !== data || realpathSync(path) !== path) return fail();
  const directory = lstatSync(root), file = lstatSync(path);
  if (!directory.isDirectory() || directory.isSymbolicLink() || !file.isFile() || file.isSymbolicLink() || file.nlink !== 1 || (file.mode & 0o777) !== 0o600 || !process.getuid || directory.uid !== process.getuid() || file.uid !== process.getuid()) return fail();
  const bytes = readFileSync(path, 'utf8'); if (sha(bytes) !== binding.leaseSha256) return fail();
  const parsed: unknown = JSON.parse(bytes);
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return fail();
  const value = parsed as Record<string, unknown>;
  if (value.root !== root || value.data !== data || value.closed !== false || value.scope !== 'OWNED_LOCAL_F10' || value.invocation !== binding.invocation || typeof value.authorizationReference !== 'string' || (!value.authorizationReference.startsWith('F-DEV-COMPLETE-001:') || !value.authorizationReference.endsWith(':'+binding.invocation)) || value.marker !== 'f10-owned:'+binding.invocation || typeof value.systemIdentifier !== 'string' || !/^[1-9][0-9]*$/.test(value.systemIdentifier)) return fail();
  if (typeof value.port !== 'number' || !Number.isInteger(value.port) || value.port < 1024 || value.port > 65535 || typeof value.pid !== 'number' || !Number.isSafeInteger(value.pid) || value.pid < 1 || typeof value.pidStart !== 'string' || !/^[1-9][0-9]*$/.test(value.pidStart)) return fail();
  const pid = readFileSync(join(data, 'postmaster.pid'), 'utf8').split('\n');
  if (pid[0] !== String(value.pid) || realpathSync(pid[1]) !== data || pid[2] !== value.pidStart || pid[3] !== String(value.port)) return fail();
  process.kill(value.pid, 0); // existence only; retained native start/port also checked
  const entries = dense(value.portalVerifierInstallations).map(raw => {
    const entry = closed(raw, ['format','invocation','database','databaseOid','marker','verifierRole','verifierRoleOid','writerOwner','writerOwnerOid','installerRoleOid','verifierSourceSha256','verifierSourceText','routineOids','nativeProfileCapsuleText']);
    const routines = closed(entry.routineOids, ROUTINE_CONTRACTS.map(item => item.name));
    for (const contract of ROUTINE_CONTRACTS) oid(routines[contract.name]);
    for (const key of ['databaseOid','verifierRoleOid','writerOwnerOid','installerRoleOid']) oid(entry[key]);
    for (const key of ['database','marker','verifierRole','writerOwner','invocation','verifierSourceSha256','verifierSourceText','nativeProfileCapsuleText']) id(entry[key]);
    if (entry.format !== 'OWNED_LOCAL_PORTAL_VERIFIER_ENROLLMENT_V1') return fail();
    return Object.freeze({ ...entry, routineOids: routines }) as unknown as LedgerEntry;
  });
  const matches = entries.filter(entry => entry.database === binding.database);
  if (matches.length !== 1) return fail();
  const entry = matches[0];
  for (const key of ['invocation','database','databaseOid','marker','verifierRole','verifierRoleOid','writerOwner','writerOwnerOid'] as const) if (entry[key] !== binding[key]) return fail();
  if (entry.verifierSourceSha256 !== SOURCE_SHA || sha(entry.verifierSourceText) !== SOURCE_SHA || entry.verifierRoleOid === entry.writerOwnerOid || entry.verifierRole === entry.writerOwner) return fail();
  const capsule: unknown = JSON.parse(entry.nativeProfileCapsuleText);
  if (!capsule || typeof capsule !== 'object' || Array.isArray(capsule)) return fail();
  if (binding.database === value.database) {
    if (typeof value.databaseOid !== 'number' || !Number.isInteger(value.databaseOid) || value.databaseOid < 1 || value.databaseOid > 4294967295 || binding.databaseOid !== value.databaseOid.toFixed(0) || binding.marker !== value.marker) return fail();
  } else {
    // Child identity comes from independently retained controller custody, never
    // database-name/marker prefix inference or an arbitrary caller capsule.
    const children = dense(value.portalVerifierChildren).map(raw => {
      const child = closed(raw, ['database','databaseOid','marker','roles','closed']);
      id(child.database); oid(child.databaseOid); id(child.marker);
      if (typeof child.closed !== 'boolean') return fail();
      const roles = dense(child.roles).map(rawRole => {
        const role = closed(rawRole, ['name','oid']); id(role.name); oid(role.oid);
        return role;
      });
      return { child, roles };
    }).filter(record => record.child.database === binding.database);
    if (children.length !== 1) return fail();
    const { child, roles } = children[0];
    if (child.databaseOid !== binding.databaseOid || child.marker !== binding.marker || child.closed !== false || roles.length !== 2) return fail();
    for (const [name, roleOid] of [[binding.verifierRole,binding.verifierRoleOid],[binding.writerOwner,binding.writerOwnerOid]]) {
      if (roles.filter(role => role.name === name && role.oid === roleOid).length !== 1) return fail();
    }
  }
  return { entry, bytes, inode: file.ino, pid: value.pid, pidStart: value.pidStart, port: value.port };
}
function client(value: unknown, state: Pick<State, 'evidence' | 'port'>, expected: 'I' | 'T'): Client {
  if (!value || typeof value !== 'object' || nodeTypes.isProxy(value) || Object.getPrototypeOf(value) !== Client.prototype || Client.prototype.query !== nativeQuery || Client.prototype.getTransactionStatus !== nativeStatus) return fail();
  const object = value as Client;
  if (own(object, 'host') !== '127.0.0.1' || own(object, 'port') !== state.port || own(object, 'database') !== state.evidence.database || own(object, 'user') !== state.evidence.verifierRole || own(object, 'ssl') !== false || own(object, 'pipeline') !== false || own(object, '_txStatus') !== expected || own(object, '_activeQuery') !== null || own(object, '_connected') !== true || own(object, '_connecting') !== false || own(object, '_ending') !== false || own(object, 'readyForQuery') !== true || dense(own(object, '_queryQueue')).length || dense(own(object, '_sentQueryQueue')).length || own(object, '_queryable') !== true || own(object, '_ended') !== false || own(object, '_connectionError') !== false) return fail();
  const connection = own(object, 'connection');
  if (!connection || typeof connection !== 'object' || nodeTypes.isProxy(connection)) return fail();
  const stream = own(connection, 'stream');
  if (!stream || typeof stream !== 'object' || nodeTypes.isProxy(stream) || Object.getPrototypeOf(stream) !== Socket.prototype) return fail();
  const socket = stream as Socket;
  if (socket.destroyed || socket.remoteAddress !== '127.0.0.1' || socket.localAddress !== '127.0.0.1' || socket.remotePort !== state.port || Reflect.apply(nativeStatus, object, []) !== expected) return fail();
  return object;
}
async function query(actual: Client, sql: string, values: readonly unknown[] = []) {
  const value: unknown = await Reflect.apply(nativeQuery, actual, [{ text: sql, values: [...values], rowMode: 'array', types: textTypes }]);
  if (!value || typeof value !== 'object' || nodeTypes.isProxy(value)) return fail('UNAVAILABLE');
  const rows = dense(own(value, 'rows')).map(row => dense(row));
  if (rows.some(row => row.some(item => item !== null && typeof item !== 'string'))) return fail('UNAVAILABLE');
  return { rows: rows as (string | null)[][], command: own(value, 'command') };
}
function scalar(result: { rows: (string | null)[][] }): string {
  if (result.rows.length !== 1 || result.rows[0].length !== 1 || typeof result.rows[0][0] !== 'string') return fail('UNAVAILABLE');
  return result.rows[0][0];
}
const IDENTITY_SQL = `/* LOCAL_PORTAL_VERIFIER_IDENTITY */ SELECT pg_catalog.current_database()::pg_catalog.text,
 (SELECT oid::text FROM pg_catalog.pg_database WHERE datname OPERATOR(pg_catalog.=) pg_catalog.current_database()),
 pg_catalog.shobj_description((SELECT oid FROM pg_catalog.pg_database WHERE datname OPERATOR(pg_catalog.=) pg_catalog.current_database()),'pg_database'),
 session_user::text,current_user::text,(SELECT usesysid::text FROM pg_catalog.pg_stat_activity WHERE pid OPERATOR(pg_catalog.=) pg_catalog.pg_backend_pid()),
 SYSTEM_USER::text,pg_catalog.current_setting('role'),pg_catalog.current_setting('server_version_num'),
 pg_catalog.current_setting('server_encoding'),pg_catalog.current_setting('session_replication_role'),pg_catalog.current_setting('search_path'),
 pg_catalog.host(pg_catalog.inet_server_addr()),pg_catalog.inet_server_port()::text,
 pg_catalog.floor(extract(epoch FROM pg_catalog.pg_postmaster_start_time()))::bigint::text,
 pg_catalog.pg_backend_pid()::text,(SELECT backend_start::text FROM pg_catalog.pg_stat_activity WHERE pid OPERATOR(pg_catalog.=) pg_catalog.pg_backend_pid()),
 pg_catalog.current_setting('transaction_isolation'),pg_catalog.current_setting('row_security'),pg_catalog.current_setting('DateStyle');`;
const ROLES_SQL = `SELECT oid::text,rolname::text,rolcanlogin::text,rolsuper::text,rolbypassrls::text,rolcreaterole::text,rolcreatedb::text,rolreplication::text,rolinherit::text
 FROM pg_catalog.pg_roles WHERE oid IN ($1::oid,$2::oid) ORDER BY oid;`;
const MEMBERSHIPS_SQL = `SELECT count(*)::text FROM pg_catalog.pg_auth_members WHERE roleid IN($1::oid,$2::oid) OR member IN($1::oid,$2::oid) OR grantor IN($1::oid,$2::oid);`;
const ROUTINES_SQL = `SELECT p.proname::text,p.oid::text,p.proowner::text,p.proargtypes::text,p.prorettype::text,p.prosecdef::text,l.lanname::text,
 p.provolatile::text,p.proparallel::text,p.proretset::text,p.proisstrict::text,p.proleakproof::text,p.prosupport::oid::text,p.provariadic::text,
 pg_catalog.array_to_json(p.proconfig)::text,pg_catalog.encode(pg_catalog.sha256(pg_catalog.convert_to(p.prosrc,'UTF8')),'hex')
 FROM pg_catalog.pg_proc p JOIN pg_catalog.pg_namespace n ON n.oid=p.pronamespace JOIN pg_catalog.pg_language l ON l.oid=p.prolang
 WHERE n.nspname='nevora_tenancy' AND p.proname IN('capture_portal_verifier_native_profile','assert_original_portal_verifier_service','acquire_portal_login_source','insert_portal_reviewed_session') ORDER BY p.proname;`;
async function assertCurrent(state: State, expected: 'I' | 'T', initial = false) {
  const current = lease(state.evidence);
  if (current.bytes !== state.leaseBytes || current.inode !== state.leaseInode || current.pid !== state.pid || current.pidStart !== state.pidStart || current.port !== state.port) return fail();
  const actual = client(state.client, state, expected);
  const identity = (await query(actual, IDENTITY_SQL)).rows;
  if (identity.length !== 1 || identity[0].length !== 20 || identity[0].some(value => typeof value !== 'string')) return fail();
  const v = identity[0] as string[], e = state.evidence;
  const fixed = [e.database,e.databaseOid,e.marker,e.verifierRole,e.verifierRole,e.verifierRoleOid,'scram-sha-256:'+e.verifierRole,'none','180004','UTF8','origin','pg_catalog','127.0.0.1',String(state.port),state.pidStart];
  if (JSON.stringify(v.slice(0,15)) !== JSON.stringify(fixed) || !/^[1-9][0-9]*$/.test(v[15]) || !v[16] || expected === 'T' && v[17] !== 'read committed' || v[18] !== 'on' || v[19] !== 'ISO, YMD') return fail();
  if (!initial && JSON.stringify(v.slice(15,17)) !== JSON.stringify(state.backend)) return fail();
  const roles = (await query(actual, ROLES_SQL, [e.verifierRoleOid,e.writerOwnerOid])).rows;
  const required = [[e.verifierRoleOid,e.verifierRole,'true','false','false','false','false','false','false'],[e.writerOwnerOid,e.writerOwner,'false','false','false','false','false','false','false']].sort((a,b)=>BigInt(a[0]) < BigInt(b[0]) ? -1 : 1);
  if (JSON.stringify(roles) !== JSON.stringify(required) || scalar(await query(actual,MEMBERSHIPS_SQL,[e.verifierRoleOid,e.writerOwnerOid])) !== '0') return fail();
  const routines = (await query(actual, ROUTINES_SQL)).rows;
  if (routines.length !== ROUTINE_CONTRACTS.length) return fail();
  for (const contract of ROUTINE_CONTRACTS) {
    const found = routines.filter(row => row[0] === contract.name);
    const required = [contract.name,state.entry.routineOids[contract.name],contract.writerOwned ? e.writerOwnerOid : state.entry.installerRoleOid,contract.argumentTypes,contract.returnType,contract.securityDefiner,contract.language,'v','u','false','false','false','0','0','["search_path=pg_catalog"]',contract.bodySha256];
    if (found.length !== 1 || JSON.stringify(found[0]) !== JSON.stringify(required)) return fail();
  }
  // Full structural native profile, not caller-approved data or source authentication.
  if (scalar(await query(actual, PROFILE_SELECT_SQL, [e.verifierRoleOid,e.writerOwnerOid])) !== state.entry.nativeProfileCapsuleText) return fail();
  client(actual, state, expected);
  return Object.freeze(v.slice(15,17));
}
/** LOCAL fixture continuity only. Root independently authenticates lease,
 * installer and executing Node source before calling. No production issuer. */
export async function bindOwnedLocalPortalVerifier(value: unknown, retainedEvidence: unknown): Promise<OwnedLocalPortalVerifierWitness | typeof DENY> {
  try {
    const binding = evidence(retainedEvidence); // reject hostile evidence before client reads
    const retained = lease(binding);
    const actual = client(value, { evidence: binding, port: retained.port }, 'I');
    const state: State = { client: actual, evidence: binding, entry: retained.entry, leaseBytes: retained.bytes, leaseInode: retained.inode, pid: retained.pid, pidStart: retained.pidStart, port: retained.port, backend: Object.freeze([]), busy: false, invalid: false };
    state.backend = await assertCurrent(state, 'I', true);
    const previous = registered.get(actual); if (previous) previous.invalid = true;
    const witness = Object.freeze({}); issued.set(witness, state); registered.set(actual, state);
    return witness as OwnedLocalPortalVerifierWitness;
  } catch { return DENY; }
}
const SOURCE_KEYS = ['workspaceId','employeeId','employeeNumber','normalizedNumber','workspaceActive','workspaceVersion','employeeActive','employeeVersion','passwordHash','mustChangePassword','credentialVersion','workspaceIncarnation','authorizationVersion','portalAccessVersion','capabilityPolicyRevision','portalState','proofProvenance','provenanceReference'] as const;
function sources(raw: string, selected: ReturnType<typeof input>) {
  const data = closed(JSON.parse(raw), SOURCE_KEYS);
  for (const key of ['workspaceId','employeeId','provenanceReference']) text(data[key]);
  for (const key of ['employeeNumber','normalizedNumber','passwordHash']) id(data[key]);
  for (const key of ['workspaceVersion','employeeVersion','credentialVersion']) timestamp(data[key]);
  for (const key of ['workspaceIncarnation','authorizationVersion','portalAccessVersion','capabilityPolicyRevision']) positive(data[key]);
  for (const key of ['workspaceActive','employeeActive','mustChangePassword']) boolean(data[key]);
  if (data.normalizedNumber !== selected.normalizedNumber || normalizeEmployeeNumber(data.employeeNumber as string) !== selected.normalizedNumber || !['DISABLED','PROOF_PENDING','ENABLED','SUSPENDED'].includes(text(data.portalState)) || !['UNVERIFIED','LEGACY_UNVERIFIED','VERIFIED'].includes(text(data.proofProvenance))) return fail();
  return data;
}
function receipt(raw: string, source: Record<string, unknown>): PortalLocalSessionReceipt {
  const data = closed(JSON.parse(raw), ['workspaceId','employeeId','createdAt','expiresAt','workspaceIncarnation','portalAccessVersion','mustChangePassword']);
  text(data.workspaceId); text(data.employeeId); const createdAt = timestamp(data.createdAt), expiresAt = timestamp(data.expiresAt);
  const instant = (v: string) => Temporal.Instant.from(v.replace(' ', 'T').replace(/([+-]\d{2})$/, '$1:00'));
  if (Temporal.Instant.compare(instant(expiresAt),instant(createdAt)) <= 0) return fail();
  positive(data.workspaceIncarnation); positive(data.portalAccessVersion); boolean(data.mustChangePassword);
  for (const key of ['workspaceId','employeeId','workspaceIncarnation','portalAccessVersion','mustChangePassword']) if (data[key] !== source[key]) return fail();
  return data as unknown as PortalLocalSessionReceipt;
}
const ACQUIRE_SQL = 'SELECT nevora_tenancy.acquire_portal_login_source($1::pg_catalog.text,$2::pg_catalog.text)::pg_catalog.text';
const INSERT_SQL = 'SELECT nevora_tenancy.insert_portal_reviewed_session($1::pg_catalog.text,$2::pg_catalog.text,$3::pg_catalog.text,$4::pg_catalog.jsonb)::pg_catalog.text';
function classify(error: unknown, writeAttempted: boolean): 'DENY' | 'UNAVAILABLE' {
  if (error && typeof error === 'object' && !nodeTypes.isProxy(error)) {
    const privateFailure = failures.get(error); if (privateFailure) return privateFailure;
    const descriptor = Object.getOwnPropertyDescriptor(error, 'code');
    if (descriptor && Object.hasOwn(descriptor,'value') && (descriptor.value === '42501' || descriptor.value === '55000')) return writeAttempted ? 'UNAVAILABLE' : 'DENY';
  }
  return 'UNAVAILABLE';
}
/** Exactly one owning request, no replay. Input closure precedes witness/client
 * reads. The SQL equality capsule is private retained data, never scrypt proof. */
export async function verifyAndCreatePortalSessionOnOwnedVerifier(witness: unknown, value: unknown): Promise<PortalLocalSessionOutcome> {
  let selected: ReturnType<typeof input>;
  try { selected = input(value); } catch { return DENY; }
  const state = witness && typeof witness === 'object' ? issued.get(witness) : undefined;
  if (!state || state.invalid || state.busy || registered.get(state.client) !== state) return DENY;
  state.busy = true;
  let beginAttempted = false, begun = false, writeAttempted = false, commitAttempted = false;
  try {
    await assertCurrent(state, 'I');
    beginAttempted = true;
    const begin = await query(state.client, 'BEGIN ISOLATION LEVEL READ COMMITTED');
    if (begin.command !== 'BEGIN' || begin.rows.length) return fail('UNAVAILABLE');
    client(state.client, state, 'T'); begun = true;
    // FIRST statement after BEGIN: never await any acquisition before this fence.
    const fence = await query(state.client, RUNTIME_CATALOG_SHARED_FENCE_SQL.text, RUNTIME_CATALOG_SHARED_FENCE_SQL.values);
    if (JSON.stringify(fence.rows) !== '[[""]]') return fail('UNAVAILABLE');
    await assertCurrent(state, 'T');
    const args = [selected.workspaceLocator, selected.normalizedNumber] as const;
    const first = sources(scalar(await query(state.client, ACQUIRE_SQL, args)), selected);
    if (first.workspaceActive !== true || first.employeeActive !== true || first.portalState !== 'ENABLED' || !['LEGACY_UNVERIFIED','VERIFIED'].includes(first.proofProvenance as string) || !(await verifyPassword(selected.password, first.passwordHash as string))) return fail();
    // Same original connection remains owning T while real async scrypt runs.
    client(state.client, state, 'T');
    const bearer = randomBytes(32).toString('base64url');
    const digest = createHash('sha256').update(bearer,'utf8').digest('hex');
    writeAttempted = true; // native INSERT refusal (including original FENCED) is unavailable
    const returned = receipt(scalar(await query(state.client, INSERT_SQL, [...args,digest,JSON.stringify(first)])), first);
    const last = sources(scalar(await query(state.client, ACQUIRE_SQL, args)), selected);
    if (JSON.stringify(last) !== JSON.stringify(first)) return fail();
    // The fixed INSERT root/its retained guard produce the receipt. Verifier
    // has no direct source/LIVE SELECT grant. Native admin QA checks that tuple.
    await assertCurrent(state, 'T');
    commitAttempted = true;
    const commit = await query(state.client, 'COMMIT');
    if (commit.command !== 'COMMIT' || commit.rows.length) return fail('UNAVAILABLE');
    client(state.client, state, 'I');
    // No SQL follows an attempted COMMIT. Receipt/bearer only after its ACK.
    return Object.freeze({ status: 'COMMITTED_LOCAL_SESSION_NOT_PORTAL_PROOF' as const, receipt: returned, bearer });
  } catch (error) {
    if (commitAttempted) { state.invalid = true; return UNKNOWN; }
    if (beginAttempted) {
      try {
        // Unconditional own rollback; pg error promise/status timing is not used
        // as a reason to skip cleanup. A missing ACK is unresolved, not DENY.
        const rollback = await query(state.client, 'ROLLBACK');
        if (rollback.command !== 'ROLLBACK' || rollback.rows.length) return fail('UNAVAILABLE');
        client(state.client, state, 'I');
      } catch { state.invalid = true; return UNKNOWN; }
    } else state.invalid = true;
    if (beginAttempted && !begun) return UNAVAILABLE;
    return classify(error, writeAttempted) === 'DENY' ? DENY : UNAVAILABLE;
  } finally { state.busy = false; }
}
