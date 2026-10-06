import 'server-only';

import { MANAGER_ROLES, requireRoles } from '../auth/permissions';
import { requireSessionMutationProof } from '../auth/session';
import type { AttendanceReview } from '../attendance/read-model';
import { getDb } from '../db';
import { readAttendanceReview } from './attendance-review.server';

/**
 * Manager server boundary: current role and proof both derive from the actual
 * HttpOnly portal cookie. No caller-supplied employee/location/date selects data.
 */
export async function getAttendanceReview(): Promise<AttendanceReview> {
  await requireRoles(MANAGER_ROLES);

  try {
    getDb();
  } catch (error) {
    if (
      error instanceof Error &&
      error.message === 'DATABASE_URL is not configured.'
    ) {
      return { state: 'unavailable', reason: 'not_configured' };
    }
    return { state: 'unavailable', reason: 'read_failed' };
  }

  let proof;
  try {
    proof = await requireSessionMutationProof();
  } catch {
    return { state: 'unavailable', reason: 'access_denied' };
  }

  try {
    return await readAttendanceReview(proof);
  } catch {
    return { state: 'unavailable', reason: 'read_failed' };
  }
}
