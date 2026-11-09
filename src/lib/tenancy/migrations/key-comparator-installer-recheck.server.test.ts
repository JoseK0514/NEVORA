// UNEXECUTED source regression proposal. Root must overlay the two candidates
// plus the genuine root-owned admission module before discovery/TypeScript.
// These tests do not simulate or issue installer admission, genuine plans or SQL.
import {describe,it,expect,vi} from 'vitest';
import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {createHash} from 'node:crypto';
import type {Client} from 'pg';
import {collectTypedKeyComparatorLockedInstallerRecheck,isKeyComparatorCaptureFailure} from './key-comparator-capture.server';
import {assertTypedKeyComparatorsOnLockedInstallerSource,isKeyComparatorRecheckFailure} from './key-comparator-recheck.server';

const source=(name:string)=>readFileSync(resolve('src/lib/tenancy/migrations',name),'utf8');
const sha=(text:string)=>createHash('sha256').update(text,'utf8').digest('hex');
function original(text:string):string{
 return text.replace(/\/\/ CONTROLLED_INSTALLER_IMPORT_ADDITION_BEGIN\n[\s\S]*?\/\/ CONTROLLED_INSTALLER_IMPORT_ADDITION_END\n/,'').replace(/\/\/ CONTROLLED_INSTALLER_(?:COLLECTOR|RECHECK)_ADDITION_BEGIN\n[\s\S]*?\/\/ CONTROLLED_INSTALLER_(?:COLLECTOR|RECHECK)_ADDITION_END\n/,'');
}
const addition=(text:string)=>text.split('// CONTROLLED_INSTALLER_COLLECTOR_ADDITION_BEGIN\n')[1];
describe('fixed local installer comparator source and unissued-input contracts only',()=>{
 it('restores complete original collector and recheck source including SERIALIZABLE/operator APIs',()=>{
  expect(sha(original(source('key-comparator-capture.server.ts')))).toBe('c616cf7d7abfb04138606d1192760b27bdc1aa7450d701e03693522a217a19d1');
  expect(sha(original(source('key-comparator-recheck.server.ts')))).toBe('753a5112a906c1f91d4d64a672f79ebd7a0381e45ee064ba84025e1f9de6f6ef');
 });
 it('requires genuine plan then exact Client witness before client and plan property reads',()=>{
  const text=addition(source('key-comparator-capture.server.ts')).split('export async function collectTypedKeyComparatorLockedInstallerRecheck')[1];
  expect(text.indexOf('if(!isIssuedTypedTenantBackfillPlan(plan))')).toBeLessThan(text.indexOf('isControlledEnrollmentInstallerExecution(witness,client)'));
  expect(text.indexOf('isControlledEnrollmentInstallerExecution(witness,client)')).toBeLessThan(text.indexOf('active.has(client)'));
  expect(text.indexOf('active.has(client)')).toBeLessThan(text.indexOf('plan.manifest'));
 });
 it('reuses all104 native checks without relabelling original snapshot, facts or operator',()=>{
  const text=addition(source('key-comparator-capture.server.ts'));
  expect(text).toContain('for(const c of contracts){const observed=await catalog(client,c);catalogs.push(observed);allRows.push(...await rows(client,c,observed,facts));}');
  expect(text).toContain('before.digest!==facts.currentSchemaDigest||!same(before.catalog,facts.catalog)');
  expect(text).toContain('after.digest!==before.digest||!same(after.catalog,before.catalog)');
  expect(text).not.toContain('deriveCurrentMetadata(');expect(text).not.toContain('identity(client,r,facts)');
  expect(text).not.toMatch(/(?:facts\.snapshot\.id|request\.identity\.role|r\.identity\.role)\s*=/);
 });
 it('requires preheld70 and repeated native identity/admission, never owns effects or a stable batch snapshot',()=>{
  const text=addition(source('key-comparator-capture.server.ts'));
  expect(text).toContain('await sourceLocks(client);');expect(text).toContain('initial=await installerAdmission(client,witness,expectedBinding)');
  const body=text.split('export async function collectTypedKeyComparatorLockedInstallerRecheck')[1];
  expect(body.indexOf('initial=await installerAdmission(client,witness,expectedBinding)')).toBeLessThan(body.indexOf("client.getTransactionStatus()"));
  expect(text).toContain('final=await installerAdmission(client,witness,expectedBinding)');
  expect(text).toContain("['origin','pg_catalog','read committed','off','ISO, YMD','UTC','scram-sha-256:'+admitted.role]");
  expect(text).toContain('r[18]!==admitted.roleOid||r[19]!==admitted.roleOid');
  expect(text).toContain('ONLY_TAGGED_START_END_OBSERVATIONS_NOT_A_STABLE_WHOLE_BATCH_SNAPSHOT');
  expect(text).not.toMatch(/(?:snapshotId|r\[21\])\s*!==\s*(?:facts\.snapshot\.id|initial\.snapshotId|start\.snapshotId)/);
  expect(text).not.toMatch(/\b(?:BEGIN|COMMIT|ROLLBACK|INSERT|UPDATE|DELETE|GRANT|SET ROLE)\b(?=['"])/);
 });
 it('derives actorNULL and exact original manifest solely from the genuine plan',()=>{
  const text=addition(source('key-comparator-capture.server.ts'));
  expect(text).toContain('expected=Object.freeze({actor:null,manifest:plan.digest})');
  expect(text).not.toContain('protocolExpectation(');
  const signature=text.split('export async function collectTypedKeyComparatorLockedInstallerRecheck')[1].split('{')[0];
  expect(signature).not.toMatch(/protocol\??:/);
  const recheck=source('key-comparator-recheck.server.ts').split('// CONTROLLED_INSTALLER_RECHECK_ADDITION_BEGIN\n')[1];
  expect(recheck).toContain('same(current.protocol,{actor:null,manifest:plan.digest})');
  expect(recheck).toContain('same(current.rows,observations.rows)');expect(recheck).toContain('same(current.catalogs,observations.catalogs)');
 });
 it('fails closed on null, fake, clone, accessor and revoked-proxy plans without reading any other input',async()=>{
  const trap=vi.fn(()=>{throw Error('fictional trap');}),hostile=new Proxy({},{get:trap,ownKeys:trap,getPrototypeOf:trap});
  const revoked=Proxy.revocable({},{});revoked.revoke();
  const plans=[null,{},JSON.parse('{"format":"TYPED_TENANT_BACKFILL_PLAN_V1"}'),{get manifest(){return trap();}},revoked.proxy];
  for(const plan of plans){
   let captureError:unknown,recheckError:unknown;
   try{await collectTypedKeyComparatorLockedInstallerRecheck(hostile as Client,hostile as never,hostile as never,plan as never,hostile as never);}catch(error){captureError=error;}
   try{await assertTypedKeyComparatorsOnLockedInstallerSource(hostile as Client,hostile as never,hostile as never,plan as never,hostile as never);}catch(error){recheckError=error;}
   expect(isKeyComparatorCaptureFailure(captureError)).toBe(true);if(isKeyComparatorCaptureFailure(captureError))expect(captureError.code).toBe('KEY_COMPARATOR_INVALID_FACTS');
   expect(isKeyComparatorRecheckFailure(recheckError)).toBe(true);if(isKeyComparatorRecheckFailure(recheckError))expect(recheckError.code).toBe('KEY_RECHECK_SOURCE_DRIFT');
  }
  expect(trap).not.toHaveBeenCalled();
 });
});
