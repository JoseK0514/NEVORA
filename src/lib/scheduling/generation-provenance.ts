import type { AssignmentOrigin } from '../domain';

export function normalizeAssignmentOrigin(value: unknown): AssignmentOrigin {
  if (value == null) return 'MANAGER';
  if (value === 'MANAGER' || value === 'GENERATED') return value;
  throw new Error('Invalid assignment origin.');
}
export function isProtectedAssignment(shift: {
  assignmentOrigin?: AssignmentOrigin | null;
  hasExchangeHistory?: boolean;
  hasCalloutHistory?: boolean;
  hasPublicationHistory?: boolean;
}): boolean {
  return normalizeAssignmentOrigin(shift.assignmentOrigin) === 'MANAGER'
    || Boolean(shift.hasExchangeHistory || shift.hasCalloutHistory || shift.hasPublicationHistory);
}
