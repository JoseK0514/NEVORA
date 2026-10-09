import { describe, expect, it } from 'vitest';
import type { UserRole } from '../domain';
import type { Capability, CapabilityInput } from './types';

// Loading an absent implementation is an ordinary missing-feature assertion in
// the first RED run; expectations below are literal approved-policy outcomes.
const modulePath = './policy';
const implementation: typeof import('./policy') | null = await import(modulePath).catch(() => null);
const evaluate = (value: unknown) => implementation?.evaluateCapability(value);

const managementGrants: Capability[] = [
  'employee.roster.read', 'employee.create', 'employee.role.edit', 'employee.core.edit',
  'employee.eligibility.edit', 'employee.positions.edit', 'employee.deactivate', 'employee.restore',
  'configuration.scheduling.manage', 'schedule.draft.read', 'schedule.readiness.read',
  'schedule.assign', 'schedule.generate', 'schedule.publish', 'schedule.restore', 'request.review',
  'attendance.read', 'correction.review', 'timecard.read', 'timecard.approve', 'timecard.finalize',
  'timecard.reopen', 'report.read', 'report.export', 'payroll.read', 'payroll.export',
  'action-center.read', 'communication.team.author', 'communication.management.author',
  'communication.revise', 'communication.withdraw', 'communication.require-ack',
  'communication.recipient-receipts.read', 'calendar.employee.revoke', 'clocker.pin.support',
  'audit.read', 'catalog.read',
];

function input(role: UserRole = 'MANAGER', capability: Capability = 'employee.roster.read'): CapabilityInput {
  const own = capability.startsWith('self.') || capability.startsWith('profile.self.') ||
    capability === 'management.home.read' || capability === 'management.own-workforce' ||
    capability.startsWith('security.self.') || capability.startsWith('calendar.self.') ||
    capability === 'communication.own-receipt.read' || capability === 'communication.sent-summary.read' ||
    capability === 'audit.self.read' || capability === 'clocker.pin.self';
  return {
    capability, mode: 'READ', phase: 'CURRENT', requestedFields: ['employee.identity'],
    affectedLocationIds: ['loc-a'],
    actor: { id: 'actor-a', workspaceId: 'tenant-a', role, workforceActive: true,
      portalState: 'ENABLED', administrativeScope: { kind: 'LOCATIONS', origin: 'EXPLICIT_GRANT', locationIds: ['loc-a'] },
      effectiveAdministrativeCapabilities: [...managementGrants] },
    workspace: { id: 'tenant-a', active: true },
    authority: { membershipCurrent: true, sessionCurrent: true, grantsCurrent: true, capturedSelfChange: false },
    source: { workspaceId: 'tenant-a', current: true, footprintComplete: true, canonicalAllowed: true,
      permittedFields: ['employee.identity', 'employee.contact', 'communication.body',
        'communication.ownReceipt', 'communication.recipientReceipts', 'calendar.url',
        'audit.metadata', 'secret.password', 'secret.pin', 'secret.bearer', 'verification.attestation'],
      locations: [ { id: 'loc-a', workspaceId: 'tenant-a', active: true },
        { id: 'loc-b', workspaceId: 'tenant-a', active: true },
        { id: 'loc-old', workspaceId: 'tenant-a', active: false } ],
      subject: { id: own ? 'actor-a' : 'other-a', workspaceId: 'tenant-a', role: own ? role : 'EMPLOYEE',
        workforceActive: true, portalState: 'ENABLED', identityVerified: true, locationIds: ['loc-a'] },
      resourceOwnerEmployeeId: own ? 'actor-a' : 'other-a',
      team: { current: true, participant: true, type: 'TODAYS_TEAM', authorEmployeeId: 'actor-a' },
      review: { requiresSecondReviewer: false, previousReviewerId: null },
      ownerChange: { current: true, usableOwnersRemaining: 2 },
    },
    roleGrant: { role: 'EMPLOYEE', administrativeCapabilities: [], administrativeScope: null },
    membershipChange: { nextLocationIds: ['loc-a'] }, batchRoles: ['EMPLOYEE', 'LEAD'],
  };
}

function allows(value: unknown) { expect(evaluate(value)?.allowed).toBe(true); }
function denies(value: unknown, reason?: string) {
  const decision = evaluate(value);
  expect(decision?.allowed).toBe(false);
  if (reason) expect(decision).toMatchObject({ reason });
  expect(decision).not.toHaveProperty('scope');
}

describe('F6 approved capability role matrix', () => {
  it('implements a state evaluator rather than accepting arbitrary truthy input', () => {
    expect(implementation?.evaluateCapability).toBeTypeOf('function');
    denies(null, 'INVALID_INPUT');
    denies({ allowed: true }, 'INVALID_INPUT');
  });

  const ownerOnly: Capability[] = ['authority.grant', 'workspace.edit', 'workspace.suspend', 'catalog.manage',
    'clocker.device.manage', 'onboarding.finish', 'onboarding.configure',
    'csv.preview', 'csv.commit', 'csv.receipt', 'csv.replay', 'csv.reverse'];
  for (const capability of ownerOnly) for (const role of ['OWNER', 'MANAGER', 'LEAD', 'EMPLOYEE'] as const) {
    it(`${capability}: ${role} follows the approved Owner-only default`, () => {
      const value = input(role, capability);
      if (role === 'OWNER') allows(value); else denies(value, 'ROLE_DENIED');
    });
  }
  const management: Capability[] = [...managementGrants.filter(cap => cap !== 'communication.team.author' && cap !== 'communication.withdraw'),
    'management.home.read', 'management.own-workforce'];
  for (const capability of management) for (const role of ['OWNER', 'MANAGER', 'LEAD', 'EMPLOYEE'] as const) {
    it(`${capability}: ${role} cannot acquire a different role's management path`, () => {
      const value = input(role, capability);
      if (role === 'OWNER' || role === 'MANAGER') allows(value); else denies(value, 'ROLE_DENIED');
    });
  }
  const selfService: Capability[] = ['self.schedule.read', 'self.workforce.manage', 'self.time.read',
    'self.time.request', 'calendar.self.issue', 'calendar.self.rotate', 'calendar.self.revoke',
    'calendar.self.read', 'clocker.pin.self', 'audit.self.read'];
  for (const capability of selfService) for (const role of ['OWNER', 'MANAGER', 'LEAD', 'EMPLOYEE'] as const) {
    it(`${capability}: ${role} preserves Employee/Lead self-service variants`, () => {
      const value = input(role, capability);
      if (role === 'EMPLOYEE' || role === 'LEAD') allows(value); else denies(value, 'ROLE_DENIED');
    });
  }
  for (const capability of ['profile.self.read', 'security.self.manage', 'communication.team.author', 'communication.withdraw',
    'communication.own-receipt.read', 'communication.sent-summary.read'] as const) {
    for (const role of ['OWNER', 'MANAGER', 'LEAD', 'EMPLOYEE'] as const) {
      it(`${capability}: ${role} still needs canonical own/team authorization`, () => allows(input(role, capability)));
    }
  }
});

describe('F6 current authority, field and footprint boundaries', () => {
  for (const field of ['membershipCurrent', 'sessionCurrent', 'grantsCurrent'] as const) {
    it(`rejects stale ${field} before returning counts, fields or recovery scope`, () => {
      const value = input(); value.authority[field] = false; denies(value, 'AUTHORITY_NOT_CURRENT');
    });
  }
  for (const phase of ['DISABLED', 'PROOF_PENDING', 'SUSPENDED'] as const) {
    it(`does not derive portal access from ACTIVE employment when ${phase}`, () => {
      const value = input(); value.actor.portalState = phase; denies(value, 'AUTHORITY_NOT_CURRENT');
    });
  }
  it('rejects inactive tenant, employment, stale source and canonical denial even for Owner', () => {
    const inactiveTenant = input('OWNER'); inactiveTenant.workspace.active = false; denies(inactiveTenant);
    const inactiveActor = input('OWNER'); inactiveActor.actor.workforceActive = false; denies(inactiveActor);
    const stale = input('OWNER'); stale.source.current = false; denies(stale, 'SOURCE_NOT_CURRENT');
    const canonical = input('OWNER', 'schedule.publish'); canonical.source.canonicalAllowed = false;
    denies(canonical, 'CANONICAL_DENIED');
  });
  it('rejects foreign actor, source, subject and location with no private denial payload', () => {
    const actor = input('OWNER'); actor.actor.workspaceId = 'tenant-b'; denies(actor, 'TENANT_MISMATCH');
    const source = input('OWNER'); source.source.workspaceId = 'tenant-b'; denies(source, 'TENANT_MISMATCH');
    const subject = input('OWNER'); subject.source.subject!.workspaceId = 'tenant-b'; denies(subject, 'TENANT_MISMATCH');
    const location = input('OWNER'); location.source.locations[0].workspaceId = 'tenant-b'; denies(location, 'TENANT_MISMATCH');
  });
  for (const mode of ['READ', 'MUTATE', 'COUNT', 'EXPORT', 'PREVIEW', 'RECEIPT', 'OPEN', 'RECOVER_OPERATION'] as const) {
    it(`cannot leak outside-M scope through ${mode}`, () => {
      const value = input(); value.mode = mode; value.affectedLocationIds = ['loc-b']; denies(value, 'LOCATION_SCOPE_DENIED');
    });
  }
  it('requires explicit Manager scope and never substitutes primary/eligible location', () => {
    const value = input(); value.actor.administrativeScope = null; denies(value, 'ADMIN_SCOPE_REQUIRED');
  });
  it('preserves explicit legacy ALL_TENANT across two active and retained inactive locations', () => {
    const value = input(); value.actor.administrativeScope = { kind: 'ALL_TENANT', origin: 'LEGACY_COMPATIBILITY' };
    value.affectedLocationIds = ['loc-b']; allows(value);
    value.phase = 'HISTORY'; value.affectedLocationIds = ['loc-old']; allows(value);
    value.phase = 'CURRENT'; denies(value, 'LOCATION_INACTIVE');
  });
  it('allows Owner authorized inactive history but not new/current scheduling or stale E2 scope', () => {
    const value = input('OWNER', 'catalog.read'); value.phase = 'HISTORY';
    value.affectedLocationIds = ['loc-old']; allows(value);
    value.capability = 'schedule.publish'; value.phase = 'CURRENT'; denies(value, 'LOCATION_INACTIVE');
    value.capability = 'communication.own-receipt.read'; value.phase = 'HISTORY'; denies(value, 'LOCATION_INACTIVE');
  });
  it('requires every field, complete source footprint and known unambiguous location identity', () => {
    const field = input(); field.requestedFields = ['employee.contact']; field.source.permittedFields = ['employee.identity'];
    denies(field, 'FIELD_DENIED');
    const incomplete = input(); incomplete.source.footprintComplete = false; denies(incomplete, 'FOOTPRINT_INCOMPLETE');
    const missing = input(); missing.affectedLocationIds = ['unknown']; denies(missing, 'LOCATION_SCOPE_DENIED');
    const ambiguous = input(); ambiguous.source.locations.push({ id: 'loc-a', workspaceId: 'tenant-a', active: true });
    denies(ambiguous, 'INVALID_INPUT');
  });
  for (const field of ['secret.password', 'secret.pin', 'secret.bearer', 'verification.attestation'] as const) {
    it(`never exposes ${field} through a customer capability`, () => {
      const value = input('OWNER', 'audit.read'); value.requestedFields = [field]; denies(value, 'FIELD_DENIED');
    });
  }
  for (const field of ['communication.body', 'communication.recipientReceipts', 'employee.contact'] as const) {
    it(`activity does not silently add ${field} permission`, () => {
      const value = input('OWNER', 'audit.read'); value.requestedFields = [field]; denies(value, 'FIELD_DENIED');
    });
  }
  it('a wider source field list cannot turn Profile/roster/report into another capability family', () => {
    const profile = input('EMPLOYEE', 'profile.self.read'); profile.requestedFields = ['payroll'];
    profile.source.permittedFields = ['payroll']; denies(profile, 'FIELD_DENIED');
    const roster = input('MANAGER', 'employee.roster.read'); roster.requestedFields = ['communication.body'];
    denies(roster, 'FIELD_DENIED');
    const report = input('MANAGER', 'report.read'); report.requestedFields = ['payroll'];
    report.source.permittedFields = ['payroll']; denies(report, 'FIELD_DENIED');
  });
  it('unresolved subject or retained administrative references cannot imply same-tenant ownership', () => {
    const own = input('EMPLOYEE', 'profile.self.read'); own.source.subject!.locationIds = ['foreign-or-missing'];
    denies(own, 'LOCATION_SCOPE_DENIED');
    const manager = input('OWNER', 'employee.core.edit'); manager.source.subject!.role = 'MANAGER';
    manager.source.subject!.administrativeScope = { kind: 'LOCATIONS', origin: 'EXPLICIT_GRANT', locationIds: ['foreign-or-missing'] };
    denies(manager, 'LOCATION_SCOPE_DENIED');
  });
  it('returns only the evaluated locations/fields and does not mutate observations', () => {
    const value = input(); const before = structuredClone(value); const decision = evaluate(value);
    expect(decision).toMatchObject({ allowed: true, scope: { workspaceId: 'tenant-a', locationIds: ['loc-a'], fields: ['employee.identity'], roleVariant: 'MANAGEMENT' } });
    expect(value).toEqual(before);
  });
  it('Manager own-source access uses SELF rather than borrowing administrative location scope', () => {
    const value = input('MANAGER', 'profile.self.read'); value.affectedLocationIds = ['loc-b'];
    value.source.subject!.locationIds = ['loc-b']; allows(value);
    value.capability = 'management.own-workforce'; allows(value);
  });
  it('mismatched role or inactive own-source observation cannot reuse an actor snapshot', () => {
    const value = input('EMPLOYEE', 'self.time.read'); value.source.subject!.role = 'OWNER'; denies(value, 'SOURCE_NOT_CURRENT');
    value.source.subject!.role = 'EMPLOYEE'; value.source.subject!.workforceActive = false; denies(value, 'SOURCE_NOT_CURRENT');
  });
});

describe('F6 role grants and protected whole-subject actions', () => {
  it('preserves Manager creation and edit of MANAGER within capability/location ceiling', () => {
    const value = input('MANAGER', 'employee.create');
    value.roleGrant = { role: 'MANAGER', administrativeCapabilities: ['schedule.publish'],
      administrativeScope: { kind: 'LOCATIONS', origin: 'EXPLICIT_GRANT', locationIds: ['loc-a'] } };
    allows(value); value.capability = 'employee.role.edit'; value.source.subject!.role = 'MANAGER';
    value.source.subject!.administrativeScope = { kind: 'LOCATIONS', origin: 'EXPLICIT_GRANT', locationIds: ['loc-a'] };
    value.source.subject!.effectiveAdministrativeCapabilities = ['schedule.publish']; allows(value);
    value.roleGrant.administrativeCapabilities = ['csv.commit']; denies(value, 'GRANT_CEILING_DENIED');
    value.roleGrant.administrativeCapabilities = ['schedule.publish'];
    value.roleGrant.administrativeScope = { kind: 'LOCATIONS', origin: 'EXPLICIT_GRANT', locationIds: ['loc-b'] };
    denies(value, 'GRANT_CEILING_DENIED');
  });
  it('cannot promote to Owner, edit an existing Owner or custom-broaden through Manager', () => {
    const ownerGrant = input(); ownerGrant.capability = 'employee.role.edit'; ownerGrant.roleGrant!.role = 'OWNER'; denies(ownerGrant, 'ROLE_DENIED');
    const ownerTarget = input('MANAGER', 'employee.core.edit'); ownerTarget.source.subject!.role = 'OWNER'; denies(ownerTarget, 'ROLE_DENIED');
    denies(input('MANAGER', 'authority.grant'), 'ROLE_DENIED');
  });
  it('rejects Manager removal of existing outside-M administrative grants', () => {
    const value = input('MANAGER', 'employee.role.edit'); value.source.subject!.role = 'MANAGER';
    value.source.subject!.administrativeScope = { kind: 'LOCATIONS', origin: 'EXPLICIT_GRANT', locationIds: ['loc-a', 'loc-b'] };
    value.source.subject!.effectiveAdministrativeCapabilities = ['schedule.publish'];
    value.roleGrant = { role: 'MANAGER', administrativeCapabilities: ['schedule.publish'],
      administrativeScope: { kind: 'LOCATIONS', origin: 'EXPLICIT_GRANT', locationIds: ['loc-a'] } };
    denies(value, 'GRANT_CEILING_DENIED');
  });
  it('Manager core/lifecycle edits cannot modify a Manager whose administrative authority exceeds actor ceiling', () => {
    const value = input('MANAGER', 'employee.core.edit'); value.source.subject!.role = 'MANAGER';
    value.source.subject!.administrativeScope = { kind: 'LOCATIONS', origin: 'EXPLICIT_GRANT', locationIds: ['loc-a', 'loc-b'] };
    value.source.subject!.effectiveAdministrativeCapabilities = ['schedule.publish']; denies(value, 'GRANT_CEILING_DENIED');
    value.source.subject!.administrativeScope = { kind: 'LOCATIONS', origin: 'EXPLICIT_GRANT', locationIds: ['loc-a'] };
    value.source.subject!.effectiveAdministrativeCapabilities = ['csv.commit']; denies(value, 'GRANT_CEILING_DENIED');
    value.source.subject!.effectiveAdministrativeCapabilities = ['schedule.publish']; allows(value);
  });
  it('new grants cannot fabricate migrated legacy ALL_TENANT status', () => {
    const value = input('MANAGER', 'employee.create'); value.actor.administrativeScope = { kind: 'ALL_TENANT', origin: 'LEGACY_COMPATIBILITY' };
    value.roleGrant = { role: 'MANAGER', administrativeCapabilities: ['schedule.publish'], administrativeScope: { kind: 'ALL_TENANT', origin: 'LEGACY_COMPATIBILITY' } };
    denies(value, 'GRANT_CEILING_DENIED'); value.roleGrant.administrativeScope = { kind: 'ALL_TENANT', origin: 'EXPLICIT_GRANT' }; allows(value);
  });
  it('requires explicit target Manager grants/scope, not a guessed role-default set', () => {
    const value = input('MANAGER', 'employee.create'); value.roleGrant = { role: 'MANAGER', administrativeCapabilities: [], administrativeScope: null };
    denies(value, 'ADMIN_SCOPE_REQUIRED');
  });
  for (const capability of ['employee.core.edit', 'employee.deactivate', 'employee.restore', 'employee.positions.edit',
    'timecard.read', 'timecard.approve', 'timecard.finalize', 'timecard.reopen'] as const) {
    it(`${capability} cannot omit outside-M subject/card footprint`, () => {
      const value = input('MANAGER', capability); value.source.subject!.locationIds = ['loc-a', 'loc-b']; denies(value, 'LOCATION_SCOPE_DENIED');
    });
  }
  it('eligibility edits retain outside-M memberships and cannot change them', () => {
    const value = input('MANAGER', 'employee.eligibility.edit'); value.source.subject!.locationIds = ['loc-a', 'loc-b'];
    value.membershipChange = { nextLocationIds: ['loc-a', 'loc-b'] }; allows(value);
    value.membershipChange.nextLocationIds = ['loc-a']; denies(value, 'LOCATION_SCOPE_DENIED');
    value.membershipChange.nextLocationIds = ['loc-a', 'loc-b', 'loc-old']; denies(value, 'LOCATION_SCOPE_DENIED');
  });
  it('Owner promotion needs usable verified same-tenant member and preserves last usable Owner', () => {
    const value = input('OWNER', 'employee.role.edit'); value.roleGrant!.role = 'OWNER'; allows(value);
    value.source.subject!.identityVerified = false; denies(value, 'OWNER_SUCCESSION_DENIED');
    value.source.subject!.identityVerified = true; value.source.subject!.role = 'OWNER'; value.roleGrant!.role = 'MANAGER';
    value.roleGrant!.administrativeScope = { kind: 'LOCATIONS', origin: 'EXPLICIT_GRANT', locationIds: ['loc-a'] };
    value.source.ownerChange!.usableOwnersRemaining = 0; denies(value, 'OWNER_SUCCESSION_DENIED');
    value.capability = 'workspace.suspend'; allows(value);
  });
  it('legitimate Owner self-change requires captured current transaction authority', () => {
    const value = input('OWNER', 'employee.deactivate'); value.source.subject!.id = 'actor-a'; value.source.subject!.role = 'OWNER';
    denies(value, 'SELF_CHANGE_NOT_CAPTURED'); value.authority.capturedSelfChange = true; allows(value);
  });
  for (const capability of ['correction.review', 'timecard.approve', 'timecard.finalize', 'timecard.reopen'] as const) {
    it(`${capability} keeps Owner/Manager self-review exclusion`, () => {
      const value = input('OWNER', capability); value.source.subject!.id = 'actor-a'; denies(value, 'SELF_REVIEW_DENIED');
    });
  }
  it('does not replace required independent second reviewer with a role grant', () => {
    const value = input('OWNER', 'timecard.finalize'); value.source.review = { requiresSecondReviewer: true, previousReviewerId: 'actor-a' };
    denies(value, 'SECOND_REVIEWER_REQUIRED'); value.source.review.previousReviewerId = 'different-reviewer'; allows(value);
  });
  it('requires explicit report/export grant and cannot turn read into ungranted export', () => {
    const value = input('MANAGER', 'report.export'); value.actor.effectiveAdministrativeCapabilities = ['report.read']; denies(value, 'CAPABILITY_NOT_GRANTED');
    value.capability = 'employee.roster.read'; value.mode = 'EXPORT'; denies(value, 'CAPABILITY_NOT_GRANTED');
  });
  it('CSV never grants Manager bulk authority or accepts protected role rows', () => {
    denies(input('MANAGER', 'csv.commit'), 'ROLE_DENIED');
    const value = input('OWNER', 'csv.preview'); value.batchRoles = ['EMPLOYEE', 'MANAGER']; denies(value, 'BULK_ROLE_DENIED');
    value.batchRoles = ['LEAD']; allows(value);
  });
});

describe('F6 own/TEAM/communication/calendar privacy', () => {
  for (const capability of ['profile.self.read', 'self.schedule.read', 'self.time.read', 'calendar.self.issue',
    'calendar.self.read', 'communication.own-receipt.read', 'audit.self.read'] as const) {
    it(`${capability} cannot return another person's own-only record`, () => {
      const value = input('EMPLOYEE', capability); value.source.subject!.id = 'coworker';
      value.source.resourceOwnerEmployeeId = 'coworker'; denies(value, 'SELF_SCOPE_DENIED');
    });
  }
  it('Lead/Employee TEAM author and withdrawal need current source participation and own authorship', () => {
    const value = input('LEAD', 'communication.team.author'); value.source.team!.participant = false; denies(value, 'TEAM_SCOPE_DENIED');
    value.source.team!.participant = true; value.capability = 'communication.withdraw'; allows(value);
    value.source.team!.authorEmployeeId = 'other'; denies(value, 'SELF_SCOPE_DENIED');
    value.source.team!.authorEmployeeId = 'actor-a'; value.source.team!.type = 'LOCATION_ANNOUNCEMENT'; denies(value, 'ROLE_DENIED');
  });
  it('own receipt and sent summary cannot reveal named coworker receipts', () => {
    const value = input('EMPLOYEE', 'communication.sent-summary.read'); value.requestedFields = ['communication.recipientReceipts']; denies(value, 'FIELD_DENIED');
    value.capability = 'communication.own-receipt.read'; denies(value, 'FIELD_DENIED');
    value.capability = 'communication.recipient-receipts.read'; denies(value, 'ROLE_DENIED');
  });
  it('sanitized CSV receipts, replay and reversal cannot recover contact payload after cleanup', () => {
    for (const capability of ['csv.receipt', 'csv.replay', 'csv.reverse'] as const) {
      const value = input('OWNER', capability); value.requestedFields = ['csv.contacts']; value.source.permittedFields = ['csv.contacts'];
      denies(value, 'FIELD_DENIED');
    }
  });
  it('management can revoke compromised scoped calendar but never retrieve/issue its URL', () => {
    const value = input('MANAGER', 'calendar.employee.revoke'); allows(value);
    value.requestedFields = ['calendar.url']; denies(value, 'FIELD_DENIED');
    value.capability = 'calendar.self.issue'; denies(value, 'ROLE_DENIED');
    value.capability = 'calendar.employee.revoke'; value.requestedFields = []; value.affectedLocationIds = ['loc-b']; denies(value, 'LOCATION_SCOPE_DENIED');
  });
  it('customer roles cannot obtain a controlled tenant restore or forge another proof kind', () => {
    for (const role of ['OWNER', 'MANAGER', 'LEAD', 'EMPLOYEE'] as const) denies(input(role, 'workspace.restore'), 'CONTROL_PLANE_REQUIRED');
    const value = input(); denies({ ...value, actor: { ...value.actor, role: 'PROVISIONER' } }, 'INVALID_INPUT');
  });
  it('fails closed for unknown capability, bad enums, missing flags and malformed scope', () => {
    const value = input(); denies({ ...value, capability: 'do-everything' }, 'INVALID_INPUT');
    denies({ ...value, capability: { toString: () => 'employee.roster.read' } }, 'INVALID_INPUT');
    denies({ ...value, phase: 'IGNORE_INACTIVE' }, 'INVALID_INPUT');
    denies({ ...value, mode: 'IMPERSONATE' }, 'INVALID_INPUT');
    denies({ ...value, authority: { ...value.authority, sessionCurrent: undefined } }, 'INVALID_INPUT');
    denies({ ...value, actor: { ...value.actor, administrativeScope: { kind: 'ALL_TENANT' } } }, 'INVALID_INPUT');
  });
});

// Root regression: P02 permits deliberate Owner creation; P03 keeps new portal
// access disabled and reserves usable verified membership for promotion.
describe('proposed Owner creation preserves approved activation and succession boundaries', () => {
  it('allows Owner to create a proposed Owner without inventing an existing subject', () => {
    const value = input('OWNER', 'employee.create');
    value.mode = 'MUTATE'; value.roleGrant!.role = 'OWNER';
    delete value.source.subject;
    allows(value);
  });
  it('allows proposed Owner creation with active workforce and disabled unverified portal access', () => {
    const value = input('OWNER', 'employee.create');
    value.mode = 'MUTATE'; value.roleGrant!.role = 'OWNER';
    value.source.subject!.portalState = 'DISABLED'; value.source.subject!.identityVerified = false;
    allows(value);
  });
  it('continues to reject Manager creating an Owner', () => {
    const value = input('MANAGER', 'employee.create');
    value.roleGrant!.role = 'OWNER'; delete value.source.subject;
    denies(value, 'ROLE_DENIED');
  });
  it('continues to reject promoting an unverified disabled member to usable Owner', () => {
    const value = input('OWNER', 'employee.role.edit');
    value.roleGrant!.role = 'OWNER'; value.source.subject!.portalState = 'DISABLED';
    value.source.subject!.identityVerified = false; denies(value, 'OWNER_SUCCESSION_DENIED');
  });
});
