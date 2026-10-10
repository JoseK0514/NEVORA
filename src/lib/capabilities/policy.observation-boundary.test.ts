import { describe, expect, it } from 'vitest';
import { evaluateCapability } from './policy';
import type { CapabilityInput } from './types';

// In-process policy observations only. No tenant proof, source freshness,
// deployed permission, F6 integration or database/HTTP isolation assertion.
function input(): CapabilityInput {
  return { capability: 'employee.roster.read', mode: 'READ', phase: 'CURRENT',
    requestedFields: ['employee.identity'], affectedLocationIds: [' location-位置 '],
    actor: { id: 'manager-a', workspaceId: ' tenant-β ', role: 'MANAGER', workforceActive: true,
      portalState: 'ENABLED', administrativeScope: { kind: 'LOCATIONS', origin: 'EXPLICIT_GRANT', locationIds: [' location-位置 '] },
      effectiveAdministrativeCapabilities: ['employee.roster.read'] },
    workspace: { id: ' tenant-β ', active: true },
    authority: { membershipCurrent: true, sessionCurrent: true, grantsCurrent: true, capturedSelfChange: false },
    source: { workspaceId: ' tenant-β ', current: true, footprintComplete: true, canonicalAllowed: true,
      permittedFields: ['employee.identity'], locations: [{ id: ' location-位置 ', workspaceId: ' tenant-β ', active: true }] } };
}
const denied = { allowed: false, reason: 'INVALID_INPUT' };
describe('canonical capability parser inspects inert own observations', () => {
  it('preserves ordinary canonical allowed decisions and exact scoped text', () => {
    const result = evaluateCapability(input());
    expect(result).toMatchObject({ allowed: true, reason: 'POLICY_ALLOWED', capability: 'employee.roster.read' });
    expect(result).toHaveProperty('scope.workspaceId', ' tenant-β ');
    expect(result).toHaveProperty('scope.locationIds', [' location-位置 ']);
  });
  it.each(['input', 'actor', 'authority', 'location', 'scope'])('rejects %s proxy before its metadata traps', target => {
    const value = input(); let calls = 0;
    const wrap = (object: object) => new Proxy(object, {
      getPrototypeOf(object) { calls++; return Reflect.getPrototypeOf(object); },
      ownKeys(object) { calls++; return Reflect.ownKeys(object); },
      getOwnPropertyDescriptor(object, key) { calls++; return Reflect.getOwnPropertyDescriptor(object, key); },
    });
    if (target === 'actor') value.actor = wrap(value.actor) as typeof value.actor;
    if (target === 'authority') value.authority = wrap(value.authority) as typeof value.authority;
    if (target === 'location') value.source.locations[0] = wrap(value.source.locations[0]) as typeof value.source.locations[0];
    if (target === 'scope') value.actor.administrativeScope = wrap(value.actor.administrativeScope!) as typeof value.actor.administrativeScope;
    expect(evaluateCapability(target === 'input' ? wrap(value) : value)).toEqual(denied); expect(calls).toBe(0);
  });
  it.each(['requestedFields', 'affectedLocationIds', 'permittedFields', 'locations', 'grants'])
    ('rejects %s array proxy before length, iteration or metadata reads', target => {
      const value = input(); let calls = 0;
      const list = target === 'permittedFields' ? value.source.permittedFields : target === 'locations' ? value.source.locations :
        target === 'grants' ? value.actor.effectiveAdministrativeCapabilities : value[target as 'requestedFields' | 'affectedLocationIds'];
      const proxy = new Proxy(list, {
        getPrototypeOf(object) { calls++; return Reflect.getPrototypeOf(object); },
        ownKeys(object) { calls++; return Reflect.ownKeys(object); },
        get(object, key, receiver) { if (key === 'length' || key === Symbol.iterator) calls++; return Reflect.get(object, key, receiver); },
      });
      const destination = target === 'permittedFields' || target === 'locations' ? value.source : target === 'grants' ? value.actor : value;
      Object.defineProperty(destination, target === 'grants' ? 'effectiveAdministrativeCapabilities' : target, { value: proxy, enumerable: true });
      expect(evaluateCapability(value)).toEqual(denied); expect(calls).toBe(0);
    });
  it('rejects revoked proxies without throwing', () => {
    const proxy = Proxy.revocable(input(), {}); proxy.revoke(); expect(evaluateCapability(proxy.proxy)).toEqual(denied);
  });
  it.each(['record', 'array-index', 'symbol', 'iterator'])('rejects %s accessor or iterator without calling it', target => {
    const value = input(); let calls = 0;
    if (target === 'record') Object.defineProperty(value.actor, 'id', { enumerable: true, get() { calls++; return 'manager-a'; } });
    if (target === 'array-index') Object.defineProperty(value.requestedFields, '0', { enumerable: true, get() { calls++; return 'employee.identity'; } });
    if (target === 'symbol') Object.defineProperty(value, Symbol('extra'), { enumerable: true, get() { calls++; return true; } });
    if (target === 'iterator') Object.defineProperty(value.requestedFields, Symbol.iterator, { value: function* () { calls++; yield 'employee.identity'; } });
    expect(evaluateCapability(value)).toEqual(denied); expect(calls).toBe(0);
  });
  it('rejects a sparse permitted-field array that borrows a numeric descriptor from Object.prototype', () => {
    const value = input(), list = value.source.permittedFields; delete list[0]; Object.defineProperty(list, 'extra', { value: true });
    const prior = Object.getOwnPropertyDescriptor(Object.prototype, '0'); let result;
    try {
      Object.defineProperty(Object.prototype, '0', { configurable: true, writable: true,
        value: { value: 'employee.identity', enumerable: true } });
      result = evaluateCapability(value);
    } finally { if (prior) Object.defineProperty(Object.prototype, '0', prior); else delete (Object.prototype as Record<string, unknown>)['0']; }
    expect(result).toEqual(denied);
  });
  it('keeps finite recursive input limits and cycle rejection', () => {
    const value = input(); Object.defineProperty(value, 'extra', { value }); expect(evaluateCapability(value)).toEqual(denied);
    const nested = input(); let cursor: Record<string, unknown> = nested as unknown as Record<string, unknown>;
    for (let index = 0; index < 41; index++) { const child = {}; Object.defineProperty(cursor, 'extra', { value: child, enumerable: true }); cursor = child; }
    expect(evaluateCapability(nested)).toEqual(denied);
  });
  it('rejects missing own array indices before consulting an inherited descriptor getter', () => {
    const value = input(), list = value.source.permittedFields; delete list[0]; Object.defineProperty(list, 'extra', { value: true });
    const prior = Object.getOwnPropertyDescriptor(Object.prototype, '0'); let reads = 0; let result;
    try {
      Object.defineProperty(Object.prototype, '0', { configurable: true,
        get() { reads++; return { value: 'employee.identity', enumerable: true }; } });
      result = evaluateCapability(value);
    } finally { if (prior) Object.defineProperty(Object.prototype, '0', prior); else delete (Object.prototype as Record<string, unknown>)['0']; }
    expect(result).toEqual(denied); expect(reads).toBe(0);
  });
  it('rejects an accessor descriptor even when Object.prototype supplies a value field', () => {
    const value = input(); let reads = 0; let result;
    Object.defineProperty(value.actor, 'id', { enumerable: true, get() { reads++; return 'manager-a'; } });
    const prior = Object.getOwnPropertyDescriptor(Object.prototype, 'value');
    try {
      Object.defineProperty(Object.prototype, 'value', { configurable: true, writable: true, value: 'manager-a' });
      result = evaluateCapability(value);
    } finally { if (prior) Object.defineProperty(Object.prototype, 'value', prior); else delete (Object.prototype as Record<string, unknown>).value; }
    expect({ result, reads }).toEqual({ result: denied, reads: 0 });
  });
  it.each(['tenant', 'inactive', 'revoked', 'grant', 'field'])('preserves existing canonical %s denial', target => {
    const value = input();
    const reasons = { tenant: 'TENANT_MISMATCH', inactive: 'AUTHORITY_NOT_CURRENT', revoked: 'AUTHORITY_NOT_CURRENT', grant: 'CAPABILITY_NOT_GRANTED', field: 'FIELD_DENIED' };
    if (target === 'tenant') value.actor.workspaceId = 'foreign';
    if (target === 'inactive') value.actor.workforceActive = false;
    if (target === 'revoked') value.authority.sessionCurrent = false;
    if (target === 'grant') value.actor.effectiveAdministrativeCapabilities = [];
    if (target === 'field') value.source.permittedFields = [];
    expect(evaluateCapability(value)).toEqual({ allowed: false, reason: reasons[target as keyof typeof reasons] });
  });
});
