// SOURCE PREPARATION ONLY. UNEXECUTED; root may adopt as a NEW test file.
// Native query source observations do not authorize an installer or PortalProof.
import { describe,it,expect,vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { PORTAL_CONTROLLED_INSTALL_CAPTURE_SQL } from './portal-native-installation-capture.server';
vi.mock('server-only',()=>({}));
const source=()=>readFileSync('src/lib/tenancy/runtime/portal-native-installation-producer.server.ts','utf8');
describe('finite current-source enrollment source contract; no native authority',()=>{
 it('retains the exact native graph prefix before enrollment',()=>{
  const text=PORTAL_CONTROLLED_INSTALL_CAPTURE_SQL.text;
  expect(text.slice(0,text.indexOf('\n, enrollment_relations('))).not.toContain('enrollment_source_');
  expect(text).toContain('PORTAL_STARTUP_NATIVE_GRAPH_OBSERVATION_V1');
 });
 it('uses six public and eleven private relations with fourteen immutable lock columns',()=>{
  const text=PORTAL_CONTROLLED_INSTALL_CAPTURE_SQL.text;
  const rows=text.slice(text.indexOf(', enrollment_relations('),text.indexOf('), enrollment_relation_catalog AS ('));
  expect(rows.match(/\('public',/g)).toHaveLength(6);expect(rows.match(/\('nevora_tenancy',/g)).toHaveLength(11);
  expect(text).toContain('enrollment_relation_catalog)=17');
  expect(text).toContain("c.lock_column=col.observation->>'column')=14");
 });
 it('observes all seven preserved native trigger routes without declaring them new direct roots',()=>{
  const text=PORTAL_CONTROLLED_INSTALL_CAPTURE_SQL.text;
  expect(text).toContain('enrollment_source_route_current)=7');
  expect(text).toContain("('locations','calendar_location_stamp'");
  expect(text).toContain("('employee_location_eligibility','calendar_eligibility_loss'");
  expect(text).toContain("trg.tgenabled='O'");expect(text).toContain('NOT trg.tgisinternal');
  expect(text).toContain('trg.tgqual IS NULL');expect(text).toContain('trg.tgoldtable IS NULL');
 });
 it('binds full original bodies and native owners rather than supplying a safe profile flag',()=>{
  const text=PORTAL_CONTROLLED_INSTALL_CAPTURE_SQL.text;
  expect(text).toContain('p.prosrc COLLATE pg_catalog."C"=expected.body_source COLLATE pg_catalog."C"');
  expect(text).toContain('p.prosecdef=expected.security_definer');
  expect(text).toContain('NOT p.proisstrict AND NOT p.proleakproof');
  expect(text).toContain("'nativeOwner',f.native_owner,'expandedAcl',f.expanded_acl");
 });
 it('retains actual global FKs and nullable staged membership ownership',()=>{
  const text=PORTAL_CONTROLLED_INSTALL_CAPTURE_SQL.text;
  expect(text).toContain("('employee_location_eligibility','workspace_id',25::pg_catalog.oid,false,true)");
  expect(text).toContain("'employees_primary_location_id_fkey'");
  expect(text).toContain("'employee_location_eligibility_employee_id_fkey'");
  expect(text).toContain('co.convalidated=expected.validated');
  expect(text).not.toContain('ALTER TABLE');
 });
 it('requires native default text key semantics, not caller string comparison',()=>{
  const text=PORTAL_CONTROLLED_INSTALL_CAPTURE_SQL.text;
  expect(text).toContain("op.opcname<>'text_ops'");expect(text).toContain('NOT op.opcdefault');
  expect(text).toContain('native_index.indisvalid');expect(text).toContain('native_index.indimmediate');
  expect(text).toContain('backing.reloptions IS NULL');expect(text).toContain('native_index.indcollation[');
 });
 it('admits only the thirteen explicit column privileges and no table privilege',()=>{
  const text=PORTAL_CONTROLLED_INSTALL_CAPTURE_SQL.text;
  expect(text).toContain('enrollment_source_reader_column_current)=13');
  expect(text).toContain("('employees','primary_location_id',true,false)");
  expect(text).toContain("('locations','id',true,true)");
  expect(text).toContain("('employee_location_eligibility','employee_id',true,true)");
  expect(text).toContain("has_table_privilege(selected.owner_oid,c.oid,'SELECT,INSERT,UPDATE,DELETE,TRUNCATE,REFERENCES,TRIGGER,MAINTAIN')");
  expect(text).toContain('acl.grantor<>c.relowner OR acl.is_grantable');
 });
 it('projects no credential payload despite preserving original calendar body source',()=>{
  const text=PORTAL_CONTROLLED_INSTALL_CAPTURE_SQL.text;
  const output=text.slice(text.indexOf('), enrollment_current AS ('));
  expect(text).toContain('NEW.password_hash IS DISTINCT FROM OLD.password_hash');
  expect(output).not.toContain('password_hash');expect(output).not.toContain('SELECT * FROM public.employee_credentials');
  expect(output).not.toContain('authorityCurrent');
 });
 it('keeps the intended seventeen policies and unknown-COMMIT branch',()=>{
  const text=source();expect(text).toContain('index<17');
  expect(text).toContain('assertControlledPortalPrivatePolicyIntentOnCatalog(i.intendedPolicyDefinitionObservation,committedCatalog)');
  expect(text).toContain("if(attemptedCommit)return unavailable('COMMIT_OUTCOME_UNKNOWN')");
 });
 it('holds exact source controls before enrollment and rechecks them before installer COMMIT',()=>{
  const text=source();expect(text).toContain('source_protocol_hold AS MATERIALIZED');
  expect(text).toContain('source_contract_hold AS MATERIALIZED');expect(text).toContain('const heldSourceControls=text(');
  expect(text.indexOf('const heldSourceControls=text(')).toBeLessThan(text.indexOf('await installer.query(ROOT_SOURCE)'));
  const current=text.indexOf('const currentHeldSourceControls=text(');
  const recheck=text.indexOf('one(await installer.query(HELD_SOURCE_CONTROLS_GRANT_RECONCILIATION_SQL,');
  expect(current).toBeGreaterThan(text.indexOf('committedCatalog=text('));
  expect(recheck).toBeGreaterThan(current);
  expect(recheck).toBeLessThan(text.indexOf("attemptedCommit=true;await installer.query('COMMIT')"));
  expect(text).toContain("[heldSourceControls,currentHeldSourceControls,i.readerOwnerOid,i.installerRoleOid,i.readerOwner,i.installerRole,rootOid,body(ROOT_SOURCE,'protected_portal_source_resolver')]),['source_controls_match']).source_controls_match!==true)return deny()");
 });
});
