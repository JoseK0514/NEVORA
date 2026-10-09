import { describe, expect, it } from 'vitest';
import { bindLegacyEmployment, employmentNamespaceKey, newEmployeeNumber, normalizeEmployeeNumber, normalizeWorkspaceLocator, preflightEmploymentNamespaces, prepareNewEmployment } from './identity';
import type { NamespaceRow } from './identity';

const row = (workspaceId: string, employeeId: string, employeeNumber: string, active = true, databaseEmailKey: string | null = null): NamespaceRow => ({ workspaceId, employeeId, employeeNumber, normalizedNumber: normalizeEmployeeNumber(employeeNumber), active, databaseEmailKey });

describe('approved F-P01 tenant and employment identity', () => {
  it('canonicalizes the explicit nonsecret workspace code without deriving a tenant from contact data', () => {
    expect(normalizeWorkspaceLocator('  WSP-1A2B  ')).toBe('wsp-1a2b');
    expect(normalizeWorkspaceLocator('a'.repeat(32))).toBe('a'.repeat(32));
    expect(normalizeWorkspaceLocator('ABCDEFGH')).toBe('abcdefgh');
  });
  it.each(['short', 'a'.repeat(33), 'abcdefgh_1', 'álpha123', 'alpha 123', 'company@example.com', 'abcdefgh/other', 'abcdefgh\u0000'])('rejects invalid locator %j', value => {
    expect(normalizeWorkspaceLocator(value)).toBeNull();
  });
  it('rejects non-ASCII code confusables before lowercase conversion and malformed public values', () => {
    expect(normalizeWorkspaceLocator('KAAAAAAA')).toBeNull();
    expect(normalizeWorkspaceLocator({ code:'abcdefgh' })).toBeNull();
    expect(normalizeWorkspaceLocator(null)).toBeNull();
  });
  it('retains the exact existing JS trim/uppercase comparison without Unicode normalization', () => {
    expect(normalizeEmployeeNumber('\u00a0straße-2\u00a0')).toBe('STRASSE-2');
    expect(normalizeEmployeeNumber(' e\u0301 ')).toBe('E\u0301');
    expect(normalizeEmployeeNumber('é')).toBe('É');
    expect(normalizeEmployeeNumber('00002')).toBe('00002');
  });
  it('accepts new 1–128 ASCII number keys only after the existing normalization', () => {
    expect(newEmployeeNumber(' e-02._ ')).toBe('E-02._');
    expect(newEmployeeNumber('2')).toBe('2');
    expect(newEmployeeNumber('a'.repeat(128))).toBe('A'.repeat(128));
  });
  it.each(['', 'A'.repeat(129), '.FIRST', '-FIRST', '_FIRST', 'A B', 'A\u200b', 'É', 'A/B', 'A\nB'])('rejects new number %j without truncating or transliterating', value => {
    expect(newEmployeeNumber(value)).toBeNull();
  });
  it('makes namespace keys unambiguous even for legacy separator characters', () => {
    expect(employmentNamespaceKey('A', 'BC')).not.toBe(employmentNamespaceKey('AB', 'C'));
    expect(employmentNamespaceKey('A|B', 'C')).not.toBe(employmentNamespaceKey('A', 'B|C'));
  });
  it('preserves legacy internal ID and number bytes and never applies new-entry restrictions retrospectively', () => {
    const legacy = bindLegacyEmployment('workspace-A', 'old é 002');
    expect(legacy).toEqual({ workspaceId: 'workspace-A', employeeId: 'old é 002', employeeNumber: 'old é 002', normalizedNumber: 'OLD É 002' });
    expect(Object.isFrozen(legacy)).toBe(true);
    expect(() => bindLegacyEmployment('', '2')).toThrow('identity_binding');
    expect(() => bindLegacyEmployment('A', '')).toThrow('identity_binding');
  });
  it('creates a distinct opaque internal employment even when A/B have the same number/contact', () => {
    const input = { employeeNumber: ' 002 ', email: ' Test@Example.com ', phone: '1 (787) 555-1212' };
    const a = prepareNewEmployment('A', input)!;
    const b = prepareNewEmployment('B', input)!;
    expect(a.employeeId).toMatch(/^[a-f0-9-]{36}$/);
    expect(a.employeeId).not.toBe(b.employeeId);
    expect(a.employeeId).not.toBe('002');
    expect(a).toMatchObject({ workspaceId: 'A', employeeNumber: '002', normalizedNumber: '002', email: 'Test@Example.com', phone: '787-555-1212' });
    expect(Object.isFrozen(a)).toBe(true);
    expect(input.email).toBe(' Test@Example.com ');
    expect(a).not.toHaveProperty('password');
    expect(a).not.toHaveProperty('session');
  });
  it('represents blank optional email as null and retains display case', () => {
    expect(prepareNewEmployment('A', { employeeNumber: '2', email: ' ', phone: '7875551212' })?.email).toBeNull();
    expect(prepareNewEmployment('A', { employeeNumber: '2', email: 'First.Last+tag@Example.com', phone: '7875551212' })?.email).toBe('First.Last+tag@Example.com');
  });
  it.each(['a@@example.com', 'a b@example.com', 'a\u200b@example.com', 'a@example.com\u0000', 'x'.repeat(255)+'@e.com'])('rejects invalid new email %j', email => {
    expect(prepareNewEmployment('A', { employeeNumber: '2', email, phone: '7875551212' })).toBeNull();
  });
  it.each(['787555121', '27875551212', '787555121299'])('retains the existing required NANP phone contract for %j', phone => {
    expect(prepareNewEmployment('A', { employeeNumber: '2', phone })).toBeNull();
  });
  it('rejects missing tenant binding or a new malformed employee number', () => {
    expect(prepareNewEmployment('', { employeeNumber: '2', phone: '7875551212' })).toBeNull();
    expect(prepareNewEmployment('A', { employeeNumber: 'é', phone: '7875551212' })).toBeNull();
  });
});

describe('complete employment namespace preflight', () => {
  it('allows repeated numbers and case-insensitive email keys in different tenants without linking IDs', () => {
    const result = preflightEmploymentNamespaces([row('A','opaque-A','2',true,'same@example.com'),row('B','opaque-B','2',true,'same@example.com')]);
    expect(result).toEqual({ ready: true, issues: [], legacyExceptions: [] });
  });
  it('blocks an inactive normalized-number collision without reactivation, rename, merge or data mutation', () => {
    const input = [row('A','opaque-active','e-2'),row('A','opaque-inactive',' E-2 ',false)];
    const before = JSON.stringify(input);
    const result = preflightEmploymentNamespaces(input);
    expect(result.ready).toBe(false);
    expect(result.issues).toContainEqual({ code:'NUMBER_COLLISION',workspaceId:'A',employeeIds:['opaque-active','opaque-inactive'] });
    expect(JSON.stringify(input)).toBe(before);
  });
  it('checks optional-email keys captured using the actual database comparison contract, not a guessed locale', () => {
    const result = preflightEmploymentNamespaces([row('A','one','1',true,'existing-db-key'),row('A','two','2',false,'existing-db-key')]);
    expect(result.ready).toBe(false);
    expect(result.issues).toContainEqual({ code:'EMAIL_COLLISION',workspaceId:'A',employeeIds:['one','two'] });
  });
  it('does not treat absent email as a duplicate namespace key', () => {
    expect(preflightEmploymentNamespaces([row('A','one','1'),row('A','two','2')]).ready).toBe(true);
  });
  it('blocks reuse of one internal employment in two tenants', () => {
    const result = preflightEmploymentNamespaces([row('A','same-id','2'),row('B','same-id','3')]);
    expect(result.ready).toBe(false);
    expect(result.issues.some(issue => issue.code === 'GLOBAL_ID_REUSED')).toBe(true);
  });
  it('blocks a stale/silently rewritten normalization key', () => {
    const value = {...row('A','one','straße'),normalizedNumber:'STRAẞE'};
    const result = preflightEmploymentNamespaces([value]);
    expect(result.ready).toBe(false);
    expect(result.issues.some(issue => issue.code === 'NUMBER_KEY_MISMATCH')).toBe(true);
  });
  it('inventories readable legacy exceptions while preserving them and producing deterministic diagnostics', () => {
    const input = [row('B','legacy-id','é-02',false),row('A','two','2'),row('A','one','2')];
    const result = preflightEmploymentNamespaces(input);
    expect(result.legacyExceptions).toEqual([{ workspaceId:'B',employeeId:'legacy-id',employeeNumber:'é-02',normalizedNumber:'É-02' }]);
    expect(preflightEmploymentNamespaces([...input].reverse())).toEqual(result);
    expect(result.issues).toContainEqual({ code:'NUMBER_COLLISION',workspaceId:'A',employeeIds:['one','two'] });
  });
});
