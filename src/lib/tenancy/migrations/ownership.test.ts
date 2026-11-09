import { describe, expect, it } from 'vitest';
import { loadPinnedMigrations } from '../inventory/source';
import { getOwnershipRegistry, verifyOwnershipSource, OWNERSHIP_SCHEMA_COMMIT, OWNERSHIP_SCHEMA_TREE, canonicalOwnershipJson } from './ownership';
const repo = process.cwd();
export const migrations = () => loadPinnedMigrations({repo,source:OWNERSHIP_SCHEMA_COMMIT,tree:OWNERSHIP_SCHEMA_TREE}).migrations;
describe('source-bound immutable tenant ownership registry', () => {
 it('rejects changed SQL bytes, duplicate/absent migrations and unexpected source', () => {
  const source=migrations();expect(verifyOwnershipSource(source)).toEqual([]);
  expect(verifyOwnershipSource([{...source[0],text:source[0].text+'\n'},...source.slice(1)]).some(x=>x.code==='SOURCE_DRIFT')).toBe(true);
  expect(verifyOwnershipSource(source.slice(1)).some(x=>x.code==='SOURCE_COVERAGE')).toBe(true);
  expect(verifyOwnershipSource([...source,source[0]]).some(x=>x.code==='DUPLICATE_SOURCE')).toBe(true);
  expect(verifyOwnershipSource([...source,{path:'db/migrations/9999_unknown.sql',text:'CREATE TABLE unknown(id text);'}]).some(x=>x.code==='UNSUPPORTED_SOURCE')).toBe(true);
 });
 it('describes composite original keys, references and exact source evidence rather than guessed identities', () => {
  const r=getOwnershipRegistry(), tables=new Map(r.tables.map(t=>[t.table,t]));
  expect(r.tables).toHaveLength(68);
  expect(tables.get('clocker_command_ledger')?.primaryKey).toEqual(['device_id','command_id']);
  expect(tables.get('payroll_export_profile_revisions')?.primaryKey).toEqual(['workspace_id','profile_id','revision']);
  expect(tables.get('communications')?.references).toContainEqual(expect.objectContaining({columns:['workspace_id','id','head_revision_id'],target:'communication_revisions',targetColumns:['workspace_id','communication_id','id']}));
  expect(tables.get('calendar_subscriptions')?.payloads).toContainEqual(expect.objectContaining({column:'allowed_location_ids',type:'ARRAY'}));
  expect(tables.get('locations')?.source).toEqual({path:'db/migrations/0001_initial.sql',line:3});
 });
 it('never derives employment ownership from mutable primary location or current activity', () => {
  const employee=getOwnershipRegistry().tables.find(t=>t.table==='employees')!;
  expect(employee.anchor).toEqual({kind:'CAPTURED_IMMUTABLE'});
  expect(employee.storage).toBe('DIRECT_IMMUTABLE');
  expect(employee.references).toContainEqual(expect.objectContaining({columns:['primary_location_id'],target:'locations'}));
  expect(employee.mirroredIdentityColumns).not.toContain('active');
 });
 it('binds historical sidecar metadata to the actual primary key and mirrored source identities', () => {
  const t=getOwnershipRegistry().tables.find(t=>t.table==='clocker_pin_events')!;
  expect(t.storage).toBe('TYPED_HISTORICAL_SIDECAR');
  expect(t.sidecar).toBe('clocker_pin_events_tenant_ownership');
  expect(t.mirroredIdentityColumns).toEqual(expect.arrayContaining(['id','employee_id','actor_employee_id']));
  const h=getOwnershipRegistry().tables.find(t=>t.table==='schedule_publication_revision_shifts')!;
  expect(h.references.find(x=>x.columns[0]==='source_shift_id')?.historical).toBe(true);
 });
 it('retains global security fences and explicitly discriminates PIN scopes', () => {
  const r=getOwnershipRegistry();const get=(s:string)=>r.tables.find(t=>t.table===s)!;
  expect(get('password_recovery_limits').storage).toBe('GLOBAL_SECURITY_CONTROL');
  expect(get('clocker_pin_limits').anchor).toEqual({kind:'TYPED_SCOPE',discriminator:'scope',identifier:'scope_id'});
  expect(get('push_subscriptions').globalFences).toEqual(expect.arrayContaining(['installation_hash+environment','active_endpoint_fingerprint+environment']));
  expect(get('clocker_device_credentials').globalFences).toContain('credential_hash');
 });
 it('requires explicit installation provenance for bare-week and calendar high-water rows', () => {
  const r=getOwnershipRegistry();
  for(const table of ['schedule_week_settings','calendar_clock'])expect(r.tables.find(t=>t.table===table)?.anchor).toEqual({kind:'INSTALLATION_PROVENANCE'});
 });
 it('returns detached deterministic contracts without serializing unsupported values', () => {
  const a=getOwnershipRegistry(),b=getOwnershipRegistry();a.tables[0].columns[0].name='mutated';
  expect(b.tables[0].columns[0].name).toBe('id');expect(getOwnershipRegistry().digest).toBe(b.digest);
  expect(()=>canonicalOwnershipJson({bad:undefined})).toThrow('Unsupported migration capture value');
 });
});


describe('lossless canonical ownership captures',()=>{
 it('keeps dense JSON arrays and detached ordinary objects deterministic',()=>{
  expect(canonicalOwnershipJson({z:[null,true,1,'x',{b:2,a:1}],a:[]})).toBe('{"a":[],"z":[null,true,1,"x",{"a":1,"b":2}]}');
 });
 it.each([['one-hole',new Array(1)],['inner-hole',[1,,3]],['deleted-index',(()=>{const v=[1,2];delete v[0];return v;})()]])('rejects sparse %s arrays instead of producing invalid or lossy JSON',(_label,value)=>{
  expect(()=>canonicalOwnershipJson(value)).toThrow('Unsupported migration capture value');
 });
 it('rejects accessor indices without executing their getters',()=>{
  let reads=0;const v:unknown[]=[];Object.defineProperty(v,'0',{get:()=>{reads++;return 1;},enumerable:true});
  expect(()=>canonicalOwnershipJson(v)).toThrow('Unsupported migration capture value');expect(reads).toBe(0);
 });
 it.each([
  ['extra-key',Object.assign([1],{extra:2})],
  ['symbol-key',Object.assign([1],{[Symbol('hidden')]:2})],
  ['hidden-key',Object.defineProperty([1],'hidden',{value:2})],
  ['custom-prototype',Object.setPrototypeOf([1],Object.create(Array.prototype))],
  ['nonenumerable-index',Object.defineProperty([1],'0',{value:1,enumerable:false})],
 ])('rejects non-data %s arrays',(_label,value)=>expect(()=>canonicalOwnershipJson(value)).toThrow('Unsupported migration capture value'));
 it('rejects object accessors, hidden or symbol properties without silently losing or invoking data',()=>{
  let reads=0;const getter={get a(){reads++;return 1;}};
  for(const value of [getter,Object.defineProperty({a:1},'hidden',{value:2}),Object.assign({a:1},{[Symbol('hidden')]:2})])expect(()=>canonicalOwnershipJson(value)).toThrow('Unsupported migration capture value');
  expect(reads).toBe(0);
 });
 it('revalidates a capture after mutation and rejects cycles with the same deterministic error',()=>{
  const v=[1,2];expect(canonicalOwnershipJson(v)).toBe('[1,2]');delete v[1];expect(()=>canonicalOwnershipJson(v)).toThrow('Unsupported migration capture value');
  const circular:unknown[]=[];circular.push(circular);expect(()=>canonicalOwnershipJson(circular)).toThrow('Unsupported migration capture value');
 });
});
