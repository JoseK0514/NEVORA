import { expect, it } from 'vitest';
async function api() {
  const implementation = await import('./generation-provenance').catch(() => ({}));
  expect(implementation).toHaveProperty('normalizeAssignmentOrigin');
  return implementation as typeof import('./generation-provenance');
}
it('legacy/manual/template/copied assignments default to Manager control and invalid origins fail', async () => {
  const { normalizeAssignmentOrigin } = await api();
  expect(normalizeAssignmentOrigin(undefined)).toBe('MANAGER');
  expect(normalizeAssignmentOrigin(null)).toBe('MANAGER');
  expect(normalizeAssignmentOrigin('MANAGER')).toBe('MANAGER');
  expect(normalizeAssignmentOrigin('GENERATED')).toBe('GENERATED');
  expect(() => normalizeAssignmentOrigin('COPIED')).toThrow();
});
it('every history reference protects a generated assignment', async () => {
  const { isProtectedAssignment } = await api();
  expect(isProtectedAssignment({})).toBe(true);
  expect(isProtectedAssignment({assignmentOrigin:'GENERATED'})).toBe(false);
  for (const field of ['hasExchangeHistory','hasCalloutHistory','hasPublicationHistory']) {
    expect(isProtectedAssignment({assignmentOrigin:'GENERATED',[field]:true})).toBe(true);
  }
});
