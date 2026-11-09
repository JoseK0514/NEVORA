import { describe, expect, it, vi } from 'vitest';
vi.mock('server-only', () => ({}));
import { INSTALLER_CATALOG_EXCLUSIVE_FENCE_SQL } from './catalog-fence.server';
import { compilePortalOriginalSourceInvalidation, isPortalOriginalSourceInvalidationComponent } from './portal-original-source-invalidation.server';

// Fictional ordinary source observations only. No native fact, credential,
// installer approval, TenantProof, protected writer or private issuer is mocked.
const input = () => ({ format: 'PORTAL_ORIGINAL_SOURCE_INVALIDATION_INPUT_V1',
  kind: 'SUBJECT_AUTHORIZATION', databaseOid: '42', installerRole: 'fictional_installer', installerRoleOid: '43',
  phase: 'EXPANDED_LEGACY', fenceGeneration: '0', captureManifestSha256: null,
  workspaceId: ' workspace-é ', workspaceIncarnation: '9007199254740993',
  lockEmployeeIds:['employee-a','employee-b'],
  subjects: [{ employeeId: 'employee-a', authorizationVersion: '9007199254740993', portalAccessVersion: '7' },
    { employeeId: 'employee-b', authorizationVersion: '8', portalAccessVersion: '9' }] });
function compiled(value: unknown = input()) {
  const result = compilePortalOriginalSourceInvalidation(value);
  if (result.status !== 'COMPILED_COMPONENT_NOT_AUTHORITY') throw Error(result.code);
  return result.component;
}
describe('unused original-source invalidation component (pure compilation only)', () => {
  it('uses the genuine fixed exclusive plan first and retains the whole native lock order', () => {
    const c = compiled();
    expect(c.isolationLevel).toBe('ReadCommitted');
    expect(c.prefix[1].text).toBe('SET LOCAL search_path = pg_catalog, public, nevora_tenancy');
    expect(c.prefix[0]).toBe(INSTALLER_CATALOG_EXCLUSIVE_FENCE_SQL);
    expect(c.prefix.map(p => p.tag)).toEqual([
      undefined, 'SOURCE_SQL_CONTEXT', 'ORIGINAL_INSTALLER_IDENTITY', 'CONTROL_TABLE_LOCKS', 'PROTOCOL_HOLD', 'CONTRACT_HOLD',
      'CONTROL_BASELINE', 'WORKSPACE_HOLD', 'EMPLOYEE_SET_HOLD', 'CREDENTIAL_SET_HOLD',
      'COUNTER_HOLD', 'PORTAL_SET_HOLD', 'SUBJECT_BASELINE', 'ADVANCE_SUBJECT_VERSIONS',
    ]);
    expect(c.prefix.slice(7, 12).map(p => p.text).join('\n')).toContain('FOR UPDATE');
    expect(c.prefix[8].text).toContain("pg_catalog.convert_to(e.id,'UTF8')");
    expect(c.verification).toBe('COMPOSITION_ONLY_NOT_WRITER_DATABASE_OR_TENANT_AUTHORITY');
  });
  it('preserves exact text and above-JS-safe native-int8 input in parameters without arithmetic', () => {
    const c = compiled();
    expect(c.workspaceId).toBe(' workspace-é ');
    expect(c.prefix.find(p => p.tag === 'COUNTER_HOLD')?.values).toEqual([' workspace-é ']);
    expect(c.prefix.find(p => p.tag === 'SUBJECT_BASELINE')?.values).toEqual([
      ' workspace-é ', '9007199254740993', ['employee-a','employee-b'],
      ['9007199254740993','8'], ['7','9'],
    ]);
    expect(c.prefix.find(p => p.tag === 'ADVANCE_SUBJECT_VERSIONS')?.text).toContain('p.authorization_version OPERATOR(pg_catalog.+) 1::pg_catalog.int8');
    expect(c.prefix.find(p => p.tag === 'ADVANCE_SUBJECT_VERSIONS')?.text).not.toContain('SET portal_access_version');
  });
  it('access invalidation advances both existing generations without states/provenance/grant defaults', () => {
    const c = compiled({ ...input(), kind: 'SUBJECT_ACCESS' });
    const sql = c.prefix.find(p => p.tag === 'ADVANCE_SUBJECT_VERSIONS')!.text;
    expect(sql).toContain('portal_access_version=p.portal_access_version OPERATOR(pg_catalog.+) 1::pg_catalog.int8');
    expect(sql).not.toMatch(/portal_state\s*=|proof_provenance\s*=|provenance_reference\s*=|capability_policy_revision\s*=/);
  });
  it('control invalidation only advances exact protocol generation, never repairs/replaces a source rule', () => {
    const c = compiled({ ...input(), kind: 'CONTROL_GENERATION', phase: 'FENCED',
      captureManifestSha256: 'a'.repeat(64), workspaceId: null, workspaceIncarnation: null, lockEmployeeIds:[], subjects: [] });
    expect(c.prefix.find(p => p.tag === 'PROTOCOL_HOLD')?.text).toContain('FOR UPDATE');
    expect(c.prefix.at(-1)?.tag).toBe('ADVANCE_CONTROL_GENERATION');
    expect(c.prefix.at(-1)?.text).toContain('fence_generation=p.fence_generation OPERATOR(pg_catalog.+) 1::pg_catalog.int8');
    expect(c.prefix.map(p => p.text).join('\n')).not.toMatch(/UPDATE\s+nevora_tenancy\.owned_table_contract|SET\s+(phase|backfill_actor|capture_manifest_sha256)/);
    expect(c.prefix.some(p => p.tag === 'WORKSPACE_HOLD')).toBe(false);
  });
  it('never compiles an ordinary FENCED source mutation bypass', () => {
    expect(compilePortalOriginalSourceInvalidation({ ...input(), phase: 'FENCED', captureManifestSha256: 'a'.repeat(64) }))
      .toEqual({ status:'BLOCKED', code:'FENCED_SOURCE_MUTATION_BLOCKED' });
  });
  it('requires exact four original contract rows and protocol source pins before and after subject changes', () => {
    const c = compiled(), before = c.prefix.find(p => p.tag === 'CONTROL_BASELINE')!.text;
    for (const table of ['workspaces','employees','locations','employee_location_eligibility']) expect(before).toContain("'"+table+"'");
    expect(before).toContain('7c628e374f03c9025b2c0cfd3568be033f07238d');
    expect(before).toContain('5143825e2447b3883eb1551d0b4a82ce283b4c845896d28c3312fbecce95c681');
    expect(c.suffix.map(p=>p.tag)).toEqual(['CONTROL_BASELINE','SUBJECT_ADVANCE_POSTCONDITION','CURRENT_CONTROL_OBSERVATION_NOT_AUTHORITY','ORIGINAL_INSTALLER_IDENTITY']);
    expect(c.atomicCompositionRequirement).toBe('PREFIX_THEN_REVIEWED_FINITE_ORIGINAL_MUTATION_THEN_SUFFIX_IN_ONE_OWNING_TRANSACTION');
  });
  it.each(['0','-0','-1','01',' 1','1 ','1e2','9223372036854775808'])('blocks invalid positive generation %s', v => {
    expect(compilePortalOriginalSourceInvalidation({ ...input(), workspaceIncarnation:v })).toEqual({status:'BLOCKED',code:'INVALID_SOURCE_INVALIDATION_INPUT'});
  });
  it('blocks only generations it must advance at the actual native int8 maximum', () => {
    const v='9223372036854775807';
    expect(compilePortalOriginalSourceInvalidation({...input(),lockEmployeeIds:['a'],subjects:[{employeeId:'a',authorizationVersion:v,portalAccessVersion:'1'}]}))
      .toEqual({status:'BLOCKED',code:'SOURCE_GENERATION_EXHAUSTED'});
    expect(compilePortalOriginalSourceInvalidation({...input(),kind:'SUBJECT_ACCESS',lockEmployeeIds:['a'],subjects:[{employeeId:'a',authorizationVersion:'1',portalAccessVersion:v}]}))
      .toEqual({status:'BLOCKED',code:'SOURCE_GENERATION_EXHAUSTED'});
    expect(compilePortalOriginalSourceInvalidation({...input(),lockEmployeeIds:['a'],subjects:[{employeeId:'a',authorizationVersion:'1',portalAccessVersion:v}]}).status)
      .toBe('COMPILED_COMPONENT_NOT_AUTHORITY');
  });
  it('binds zero control generation without rounding and fails closed at native exhaustion', () => {
    const root={...input(),kind:'CONTROL_GENERATION',workspaceId:null,workspaceIncarnation:null,lockEmployeeIds:[],subjects:[]};
    for(const fenceGeneration of ['0','9007199254740993','9223372036854775806'])
      expect(compiled({...root,fenceGeneration}).prefix.at(-1)?.values[1]).toBe(fenceGeneration);
    expect(compilePortalOriginalSourceInvalidation({...root,fenceGeneration:'9223372036854775807'}))
      .toEqual({status:'BLOCKED',code:'SOURCE_GENERATION_EXHAUSTED'});
    for(const fenceGeneration of ['-0','-1','00',' 0','9223372036854775808'])
      expect(compilePortalOriginalSourceInvalidation({...root,fenceGeneration}).status).toBe('BLOCKED');
  });
  it('requires closed original identity/protocol metadata and does not arm backfill', () => {
    for(const update of [{backfillActor:'fictional_installer'},{phase:'RUNTIME_READY'},
      {databaseOid:'4294967296'},{installerRoleOid:'0'},{captureManifestSha256:'a'.repeat(64)},
      {kind:'SOURCE_ROW_REPLACE'},{captureManifestSha256:''}])
      expect(compilePortalOriginalSourceInvalidation({...input(),...update}).status).toBe('BLOCKED');
    const c=compiled();
    expect(c.prefix[2].text).toContain('a.usesysid');
    expect(c.prefix[2].text).toContain('current_user=session_user');
    expect(c.prefix[2].text).toContain("pg_catalog.current_setting('role')='none'");
    expect(c.suffix.find(p=>p.tag==='CURRENT_CONTROL_OBSERVATION_NOT_AUTHORITY')?.text)
      .toContain('FROM nevora_tenancy.owned_table_contract AS c');
  });
  it('allows exact empty/native text identities, rejects invalid UTF8/NUL instead of normalizing', () => {
    expect(compiled({...input(),workspaceId:'',lockEmployeeIds:[''],subjects:[{employeeId:'',authorizationVersion:'1',portalAccessVersion:'1'}]}).workspaceId).toBe('');
    for (const workspaceId of ['a\0b','\uD800']) expect(compilePortalOriginalSourceInvalidation({...input(),workspaceId}).status).toBe('BLOCKED');
  });
  it('blocks unknown, duplicate, unordered, sparse and malformed subject occurrence sets', () => {
    const a=input();
    const variants=[{...a,unexpected:true},{...a,subjects:[]},{...a,subjects:[a.subjects[0],a.subjects[0]]},
      {...a,subjects:[a.subjects[1],a.subjects[0]]},{...a,subjects:[null]},
      {...a,subjects:[{...a.subjects[0],unknown:true}]},{...a,subjects:new Array(2)}];
    for (const v of variants) expect(compilePortalOriginalSourceInvalidation(v).status).toBe('BLOCKED');
  });
  it('prelocks a complete separate actor/subject set without advancing unrelated actor versions', () => {
    const c=compiled({...input(),lockEmployeeIds:['actor','employee-a','employee-b']});
    expect(c.prefix.find(p=>p.tag==='EMPLOYEE_SET_HOLD')?.values[1]).toEqual(['actor','employee-a','employee-b']);
    expect(c.prefix.find(p=>p.tag==='CREDENTIAL_SET_HOLD')?.values[0]).toEqual(['actor','employee-a','employee-b']);
    expect(c.prefix.find(p=>p.tag==='PORTAL_SET_HOLD')?.values[1]).toEqual(['actor','employee-a','employee-b']);
    expect(c.prefix.find(p=>p.tag==='ADVANCE_SUBJECT_VERSIONS')?.values[2]).toEqual(['employee-a','employee-b']);
    for(const lockEmployeeIds of [[],['employee-a'],['employee-b','employee-a'],['employee-a','employee-a']])
      expect(compilePortalOriginalSourceInvalidation({...input(),lockEmployeeIds}).status).toBe('BLOCKED');
  });
  it('blocks proxy/accessor/cycle inputs without executing supplied code', () => {
    let hits=0; const hostile=new Proxy({}, {get(){hits++;throw Error('trap');},ownKeys(){hits++;throw Error('trap');}});
    const getter={...input()};Object.defineProperty(getter,'workspaceId',{get(){hits++;throw Error('getter');},enumerable:true});
    const revoked=Proxy.revocable({},{});revoked.revoke();
    const cycle={...input(),subjects:[] as unknown[]};cycle.subjects.push(cycle);
    for (const v of [hostile,getter,revoked.proxy,cycle]) expect(compilePortalOriginalSourceInvalidation(v).status).toBe('BLOCKED');
    expect(hits).toBe(0);
  });
  it('detaches/freeze exact parameters and brands only genuine local compiled identity', () => {
    const source=input(), c=compiled(source);
    source.subjects[0].authorizationVersion='1';source.workspaceId='other';
    expect(c.prefix.find(p=>p.tag==='SUBJECT_BASELINE')?.values[3]).toEqual(['9007199254740993','8']);
    expect(Object.isFrozen(c)).toBe(true);expect(Object.isFrozen(c.prefix)).toBe(true);
    expect(Object.isFrozen(c.prefix.find(p=>p.tag==='SUBJECT_BASELINE')?.values[3])).toBe(true);
    expect(isPortalOriginalSourceInvalidationComponent(c)).toBe(true);
    expect(isPortalOriginalSourceInvalidationComponent({...c})).toBe(false);
    expect(isPortalOriginalSourceInvalidationComponent(JSON.parse(JSON.stringify(c)))).toBe(false);
    const p=Proxy.revocable(c,{});p.revoke();expect(isPortalOriginalSourceInvalidationComponent(p.proxy)).toBe(false);
  });
  it('retains rollback/concurrency/unknown-COMMIT obligations instead of claiming effects or retry authority', () => {
    const c=compiled();
    expect(c.remainingGates).toContain('GENUINE_CONTROLLED_WRITER_ADMISSION_AND_EXACT_PRIVILEGES');
    expect(c.remainingGates).toContain('CURRENT_READER_CONTROL_DATA_GENERATION_JOIN');
    expect(c.remainingGates).toContain('ATOMIC_COMPOSITION_AND_ORIGINAL_PLAN_UNKNOWN_COMMIT_RECONCILIATION');
    expect(c.suffix.find(p=>p.tag==='SUBJECT_ADVANCE_POSTCONDITION')?.text).toContain('source_generation_advance_mismatch');
    expect(c.prefix.map(p=>p.text).join('\n')).not.toMatch(/COMMIT|ROLLBACK|BEGIN\s|GRANT\s|DISABLE|BYPASSRLS|set_config/);
  });
});
