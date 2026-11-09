import { describe, expect, it } from 'vitest';
import * as policy from './policy';
import { CAPABILITIES } from './types';
import type { Capability } from './types';
import type { UserRole } from '../domain';
const { evaluateCapability } = policy;
type RuleObservation = Readonly<{ capability: Capability; roles: readonly UserRole[];
  variant: 'MANAGEMENT' | 'SELF' | 'TEAM' | 'TENANT'; requiresExplicitManagerGrant: boolean; wholeSubject: boolean }>;
function readObservations(): readonly RuleObservation[] {
  const value = (policy as { CANONICAL_PORTAL_CAPABILITY_RULE_OBSERVATIONS?: unknown }).CANONICAL_PORTAL_CAPABILITY_RULE_OBSERVATIONS;
  expect(Array.isArray(value), 'canonical metadata export must exist').toBe(true);
  return value as readonly RuleObservation[];
}

// Canonical role ceiling metadata only, never an installed policy, grant,
// current source/tenant authority, field/location scope or proof.
describe('canonical Portal capability rule observations use the existing policy', () => {
  it('covers the exact vocabulary once in its existing order with closed fields', () => {
    const observations = readObservations();
    expect(observations.map(row => row.capability)).toEqual(CAPABILITIES);
    expect(new Set(observations.map(row => row.capability)).size).toBe(CAPABILITIES.length);
    for (const row of observations) {
      expect(Object.keys(row).sort()).toEqual(['capability', 'requiresExplicitManagerGrant', 'roles', 'variant', 'wholeSubject']);
      expect(Object.isFrozen(row)).toBe(true); expect(Object.isFrozen(row.roles)).toBe(true);
      expect(Object.hasOwn(row, 'authorityCurrent')).toBe(false);
    }
    expect(Object.isFrozen(observations)).toBe(true);
  });
  it.each([
    { capability: 'management.home.read', roles: ['OWNER', 'MANAGER'], variant: 'SELF', grant: false, whole: false },
    { capability: 'profile.self.read', roles: ['OWNER', 'MANAGER', 'EMPLOYEE', 'LEAD'], variant: 'SELF', grant: false, whole: false },
    { capability: 'employee.roster.read', roles: ['OWNER', 'MANAGER'], variant: 'MANAGEMENT', grant: true, whole: false },
    { capability: 'attendance.read', roles: ['OWNER', 'MANAGER'], variant: 'MANAGEMENT', grant: true, whole: true },
    { capability: 'communication.team.author', roles: ['OWNER', 'MANAGER', 'EMPLOYEE', 'LEAD'], variant: 'TEAM', grant: true, whole: false },
    { capability: 'authority.grant', roles: ['OWNER'], variant: 'TENANT', grant: false, whole: false },
    { capability: 'self.schedule.read', roles: ['EMPLOYEE', 'LEAD'], variant: 'SELF', grant: false, whole: false },
    { capability: 'workspace.restore', roles: [], variant: 'TENANT', grant: false, whole: false },
  ])('retains the canonical $capability role, grant and footprint distinctions', ({ capability, roles, variant, grant, whole }) => {
    const observations = readObservations();
    expect(observations.find(row => row.capability === capability)).toEqual({ capability, roles, variant,
      requiresExplicitManagerGrant: grant, wholeSubject: whole });
  });
  it('does not expose mutable private rule arrays or permit changing a metadata cell', () => {
    const observations = readObservations();
    const row = observations.find(row => row.capability === 'authority.grant'); if (!row) throw Error('canonical fixture');
    expect(() => Reflect.apply(Array.prototype.push, row.roles, ['EMPLOYEE'])).toThrow();
    expect(() => Object.defineProperty(row, 'requiresExplicitManagerGrant', { value: true })).toThrow();
    expect(row.roles).toEqual(['OWNER']);
  });
  it('does not turn a cloned or serialized ceiling into operation authority', () => {
    const observations = readObservations();
    const copied = structuredClone(observations); expect(copied).toEqual(observations);
    expect(evaluateCapability(copied)).toEqual({ allowed: false, reason: 'INVALID_INPUT' });
    expect(evaluateCapability(JSON.parse(JSON.stringify(observations)))).toEqual({ allowed: false, reason: 'INVALID_INPUT' });
  });
});
