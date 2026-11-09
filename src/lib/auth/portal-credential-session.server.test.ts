// UNEXECUTED regression source for the actual future module API. These cases
// verify local closed-input denial/source protocol only, never native custody.
import { describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
vi.mock('server-only', () => ({}));
import { bindOwnedLocalPortalVerifier, verifyAndCreatePortalSessionOnOwnedVerifier } from './portal-credential-session.server';

const ordinary = () => ({ workspaceLocator: ' Fiction-01 ', employeeNumber: ' number ', password: 'fictional-password' });
const source = () => readFileSync(join(process.cwd(),'src/lib/auth/portal-credential-session.server.ts'),'utf8');

describe('local portal verifier closed-input boundary', () => {
  it.each([null,undefined,false,1,'bad',[],{}, {workspaceLocator:'fiction-01',employeeNumber:'NUMBER'},
    {...ordinary(),password:''},{...ordinary(),password:1},{...ordinary(),employeeNumber:null},
    {...ordinary(),employeeNumber:'  '},{...ordinary(),workspaceLocator:'short'},
    {...ordinary(),employeeNumber:'x\u0000y'},{...ordinary(),employeeNumber:'\ud800'},
    {...ordinary(),reviewed:{passwordHash:'fictional'}},{...ordinary(),approved:true},
    {...ordinary(),workspaceId:'forged'},{...ordinary(),employeeId:'forged'}])('malformed request denies before witness/client behavior %s', async request => {
      let traps=0; const witness=new Proxy({}, {get(){traps++;throw new Error('must_not_read');},getPrototypeOf(){traps++;throw new Error('must_not_read');}});
      await expect(verifyAndCreatePortalSessionOnOwnedVerifier(witness,request)).resolves.toEqual({status:'DENY'});
      expect(traps).toBe(0);
  });
  it('request accessor never executes', async () => {
    let reads=0; const request={workspaceLocator:'fiction-01',employeeNumber:'NUMBER'};
    Object.defineProperty(request,'password',{enumerable:true,get(){reads++;throw new Error('must_not_read');}});
    await expect(verifyAndCreatePortalSessionOnOwnedVerifier({},request)).resolves.toEqual({status:'DENY'});
    expect(reads).toBe(0);
  });
  it('proxy and revoked proxy requests are trap free', async () => {
    let traps=0; const proxy=new Proxy(ordinary(),{get(){traps++;throw new Error('must_not_read');},ownKeys(){traps++;throw new Error('must_not_read');},getPrototypeOf(){traps++;throw new Error('must_not_read');}});
    const revoked=Proxy.revocable(ordinary(),{}); revoked.revoke();
    for(const request of [proxy,revoked.proxy]) await expect(verifyAndCreatePortalSessionOnOwnedVerifier({},request)).resolves.toEqual({status:'DENY'});
    expect(traps).toBe(0);
  });
  it('custom prototype/symbol/nonenumerable request does not issue', async () => {
    const custom=Object.assign(Object.create({}),ordinary()), symbol={...ordinary(),[Symbol('extra')]:true}, hidden={...ordinary()};
    Object.defineProperty(hidden,'password',{value:'fictional-password',enumerable:false});
    for(const request of [custom,symbol,hidden]) await expect(verifyAndCreatePortalSessionOnOwnedVerifier({},request)).resolves.toEqual({status:'DENY'});
  });
  it('copied receipts or source JSON cannot become a witness', async () => {
    for(const witness of [{},Object.freeze({}),{status:'COMMITTED_LOCAL_SESSION_NOT_PORTAL_PROOF'},
      {nativeProfileCapsuleText:'{}',approved:true},JSON.parse('{"kind":"PORTAL"}')]) {
      const result=await verifyAndCreatePortalSessionOnOwnedVerifier(witness,ordinary());
      expect(result).toEqual({status:'DENY'}); expect(Object.isFrozen(result)).toBe(true); expect(Object.hasOwn(result,'bearer')).toBe(false);
    }
  });
  it('proxy/revoked witness cannot inherit continuity', async () => {
    let traps=0; const proxy=new Proxy({}, {get(){traps++;throw new Error('must_not_read');}}), revoked=Proxy.revocable({},{}); revoked.revoke();
    for(const witness of [proxy,revoked.proxy]) await expect(verifyAndCreatePortalSessionOnOwnedVerifier(witness,ordinary())).resolves.toEqual({status:'DENY'});
    expect(traps).toBe(0);
  });
  it('hostile evidence rejects before hostile client', async () => {
    let reads=0; const client=new Proxy({}, {get(){reads++;throw new Error('must_not_read');},getPrototypeOf(){reads++;throw new Error('must_not_read');}});
    for(const evidence of [null,{}, {approved:true}, {nativeProfileCapsuleText:'{}'},[]]) await expect(bindOwnedLocalPortalVerifier(client,evidence)).resolves.toEqual({status:'DENY'});
    const evidence=Object.defineProperty({},'format',{enumerable:true,get(){reads++;throw new Error('must_not_read');}});
    await expect(bindOwnedLocalPortalVerifier(client,evidence)).resolves.toEqual({status:'DENY'}); expect(reads).toBe(0);
  });
  it('harmless frozen request needs actual native witness; it is not authority', async () => {
    const request=Object.freeze(ordinary()); await expect(verifyAndCreatePortalSessionOnOwnedVerifier({},request)).resolves.toEqual({status:'DENY'});
    expect(request).toEqual(ordinary());
  });
});

describe('source-bound owning protocol; no database behavior claim', () => {
  it('actual imports use canonical number/locator and real password implementation', () => {
    const actual=source();
    expect(actual).toContain("import { normalizeWorkspaceLocator, normalizeEmployeeNumber } from '../tenancy/identity'");
    expect(actual).toContain("import { verifyPassword } from './password'");
    expect(actual).toContain('await verifyPassword(selected.password, first.passwordHash as string)');
    expect(actual).not.toMatch(/UPPER\(|getDb\(|getTenantRuntimeDb\(|set_config\(/i);
  });
  it('shared first then acquire/scrypt/insert/fresh source/final profile then commit', () => {
    const actual=source(), body=actual.slice(actual.indexOf('export async function verifyAndCreatePortalSessionOnOwnedVerifier'));
    const markers=["query(state.client, 'BEGIN ISOLATION LEVEL READ COMMITTED')",'query(state.client, RUNTIME_CATALOG_SHARED_FENCE_SQL.text',"assertCurrent(state, 'T')",'query(state.client, ACQUIRE_SQL, args)','await verifyPassword','query(state.client, INSERT_SQL','const last = sources',"await assertCurrent(state, 'T');\n    commitAttempted = true", "query(state.client, 'COMMIT')"];
    let at=-1;for(const marker of markers){const next=body.indexOf(marker,at+1);expect(next).toBeGreaterThan(at);at=next;}
    expect(body.indexOf('selected = input(value)')).toBeLessThan(body.indexOf('issued.get(witness)'));
    expect(body.indexOf("client(state.client, state, 'I');",at)).toBeLessThan(body.indexOf("status: 'COMMITTED_LOCAL_SESSION_NOT_PORTAL_PROOF'",at));
  });
  it('uncertain COMMIT has no secondary SQL and failed rollback remains unknown', () => {
    const actual=source(), body=actual.slice(actual.indexOf('export async function verifyAndCreatePortalSessionOnOwnedVerifier'));
    const catchBody=body.slice(body.indexOf('} catch (error)'));
    expect(catchBody).toContain('if (commitAttempted) { state.invalid = true; return UNKNOWN; }');
    expect(catchBody.indexOf('return UNKNOWN')).toBeLessThan(catchBody.indexOf("query(state.client, 'ROLLBACK')"));
    expect(catchBody).toContain('catch { state.invalid = true; return UNKNOWN; }');
    expect(catchBody).toContain('if (beginAttempted) {');
    expect(catchBody).toContain('if (beginAttempted && !begun) return UNAVAILABLE;');
    expect(body).not.toMatch(/retry|cookies\(|resolvePortalProof\(/i);
    expect(body).toContain('return classify(error, writeAttempted)');
  });
  it('private source retention, must-change propagation and no approval callback', () => {
    const actual=source();
    expect(actual).toContain("JSON.stringify(first)"); expect(actual).toContain('JSON.stringify(last) !== JSON.stringify(first)');
    expect(actual).toContain('mustChangePassword: boolean'); expect(actual).not.toMatch(/mustChangePassword\s*!==\s*false|mustChangePassword\s*===\s*false/);
    expect(actual).toContain('const issued = new WeakMap<object, State>()');
    expect(actual).toContain('entry.verifierSourceSha256 !== SOURCE_SHA');
    expect(actual).toContain('scalar(await query(actual, PROFILE_SELECT_SQL');
    expect(actual).not.toMatch(/console\.|process\.env|callback\s*:/);
    expect(actual).not.toContain('const TUPLE_SQL');
    expect(actual).not.toContain('FROM public.employee_sessions');
    expect(actual).toContain("return writeAttempted ? 'UNAVAILABLE' : 'DENY'");
    expect(actual).toContain('writeAttempted = true; // native INSERT refusal');
  });
  it('uses exact retained child custody, original nonce and native text IDs/reference', () => {
    const actual=source();
    expect(actual).toContain('dense(value.portalVerifierChildren)');
    expect(actual).toContain("closed(raw, ['database','databaseOid','marker','roles','closed'])");
    expect(actual).toContain('child.databaseOid !== binding.databaseOid');
    expect(actual).toContain('child.marker !== binding.marker');
    expect(actual).not.toContain("binding.database.startsWith(value.database + '_case_')");
    expect(actual).not.toContain('/^[a-f0-9]{16}$/');
    expect(actual).toContain("for (const key of ['workspaceId','employeeId','provenanceReference']) text(data[key]);");
    expect(actual).toContain('text(data.workspaceId); text(data.employeeId);');
  });
});
// Positive/BEGIN/COMMIT/ROLLBACK transport fault cases require Root/Product's
// genuine current lease+installer+original Client fixture. They are not faked
// here with a public witness constructor, driver mock, approved DTO or VM.
