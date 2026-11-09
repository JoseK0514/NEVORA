import { describe, expect, it } from 'vitest';
import { decodeTypedMigrationWireValue } from '../migrations/typed-wire';
import { compareWorkspaceIncarnations, validateWorkspaceIncarnation } from './workspace-incarnation';

const INVALID = { status: 'INVALID', code: 'INVALID_WORKSPACE_INCARNATION' } as const;
const accepted = ['1', '2', '9007199254740991', '9007199254740992', '9007199254740993', '9223372036854775806', '9223372036854775807'];
const rejected = ['', '0', '-0', '-1', '-9223372036854775808', '9223372036854775808', '9'.repeat(78), '9'.repeat(10000),
  '01', '0001', '+1', '1.0', '1e0', ' 1', '1 ', '\t1', '1\n', '１', '١', '\u00001', '\ud800', 'Infinity', 'NaN'];

describe('pure positive native-int8 workspace incarnation contract', () => {
  it.each(accepted)('retains accepted exact original decimal %s without numeric conversion', value => {
    expect(validateWorkspaceIncarnation(value)).toEqual({ status: 'VALID', value });
  });
  it.each(rejected.map((value, index) => ({ value, name: index === 7 ? '10000-digit wire' : JSON.stringify(value) })))('rejects nonpositive/noncanonical/out-of-native-range $name', ({ value }) => {
    expect(validateWorkspaceIncarnation(value)).toEqual(INVALID);
  });
  it('refines the existing lossless signed bigint parser without changing its signed or SQL-null contracts', () => {
    for (const value of accepted) {
      const parsed = decodeTypedMigrationWireValue('bigint', value);
      expect(parsed.status).toBe('DECODED');
      if (parsed.status !== 'DECODED' || parsed.value.kind !== 'SCALAR') throw Error('fictional bigint parser fixture');
      expect(parsed.value.wire.text).toBe(value);
      expect(validateWorkspaceIncarnation(value)).toEqual({ status: 'VALID', value: parsed.value.wire.text });
    }
    expect(decodeTypedMigrationWireValue('bigint', '-9223372036854775808').status).toBe('DECODED');
    expect(validateWorkspaceIncarnation('-9223372036854775808')).toEqual(INVALID);
    expect(decodeTypedMigrationWireValue('bigint', '0').status).toBe('DECODED');
    expect(validateWorkspaceIncarnation('0')).toEqual(INVALID);
    expect(decodeTypedMigrationWireValue('bigint', null)).toEqual({ status: 'DECODED', value: { kind: 'SQL_NULL', sourceType: 'bigint', wire: null } });
    expect(validateWorkspaceIncarnation(null)).toEqual(INVALID);
  });
  it.each(accepted)('matches exact validated values %s', value => {
    expect(compareWorkspaceIncarnations(value, value)).toEqual({ status: 'MATCH' });
  });
  it.each([
    ['1', '2'], ['2', '1'], ['9007199254740992', '9007199254740993'],
    ['9007199254740993', '9007199254740992'], ['9223372036854775806', '9223372036854775807'],
    ['9223372036854775807', '9223372036854775806'],
  ])('distinguishes valid exact values %s versus %s above JS safe precision too', (left, right) => {
    expect(compareWorkspaceIncarnations(left, right)).toEqual({ status: 'MISMATCH' });
  });
  it('invalid values never become MATCH or MISMATCH, including matching invalid spellings and either argument order', () => {
    for (const value of rejected) {
      expect(compareWorkspaceIncarnations(value, value)).toEqual(INVALID);
      expect(compareWorkspaceIncarnations(value, '1')).toEqual(INVALID);
      expect(compareWorkspaceIncarnations('1', value)).toEqual(INVALID);
    }
  });
  it('rejects every non-string input, including numeric/bigint and harmless frozen values, without coercion', () => {
    for (const value of [null, undefined, 1, 9007199254740992, BigInt(1), true, false, Symbol('fictional'),
      () => '1', Object.freeze({ value: '1' }), Object.freeze(['1']), Object.freeze(new String('1')), Object.freeze(Object.create(null))]) {
      expect(validateWorkspaceIncarnation(value)).toEqual(INVALID);
      expect(compareWorkspaceIncarnations(value, value)).toEqual(INVALID);
      expect(compareWorkspaceIncarnations(value, '1')).toEqual(INVALID);
      expect(compareWorkspaceIncarnations('1', value)).toEqual(INVALID);
    }
  });
  it('rejects accessors, hostile/revoked proxies and hostile function proxies without executing getters or traps', () => {
    let reads = 0;
    const failure = () => { reads++; throw Error('fictional_private'); };
    const accessor = Object.defineProperties({}, {
      value: { get: failure }, toString: { get: failure }, valueOf: { get: failure }, [Symbol.toPrimitive]: { get: failure },
    });
    const traps = { get: failure, getPrototypeOf: failure, getOwnPropertyDescriptor: failure, ownKeys: failure, has: failure, apply: failure };
    const proxy = new Proxy({}, traps);
    const callable = new Proxy(() => '1', traps);
    const revoked = Proxy.revocable(Object.freeze({ value: '1' }), {}); revoked.revoke();
    for (const value of [accessor, proxy, callable, revoked.proxy]) {
      expect(validateWorkspaceIncarnation(value)).toEqual(INVALID);
      expect(compareWorkspaceIncarnations(value, value)).toEqual(INVALID);
      expect(compareWorkspaceIncarnations(value, '1')).toEqual(INVALID);
      expect(compareWorkspaceIncarnations('1', value)).toEqual(INVALID);
    }
    expect(reads).toBe(0);
  });
  it('returns frozen closed data-only outcomes; copied outcomes never substitute for primitive incarnation inputs', () => {
    const valid = validateWorkspaceIncarnation('1');
    const invalid = validateWorkspaceIncarnation(null);
    const match = compareWorkspaceIncarnations('1', '1');
    const mismatch = compareWorkspaceIncarnations('1', '2');
    for (const result of [valid, invalid, match, mismatch]) {
      expect(Object.isFrozen(result)).toBe(true);
      expect(validateWorkspaceIncarnation(result)).toEqual(INVALID);
      expect(validateWorkspaceIncarnation({ ...result })).toEqual(INVALID);
      expect(compareWorkspaceIncarnations(result, '1')).toEqual(INVALID);
      expect(Reflect.set(result, 'status', 'MISMATCH')).toBe(false);
    }
    expect(Object.keys(valid).sort()).toEqual(['status', 'value']);
    expect(Object.keys(invalid).sort()).toEqual(['code', 'status']);
    expect(Object.keys(match)).toEqual(['status']); expect(Object.keys(mismatch)).toEqual(['status']);
    expect(valid).toEqual({ status: 'VALID', value: '1' });
    expect(match).toEqual({ status: 'MATCH' });
  });
});
