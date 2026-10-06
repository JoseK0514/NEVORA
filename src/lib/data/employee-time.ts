import 'server-only';
import { requireSessionMutationProof } from '../auth/session';
import { readEmployeeTime } from './employee-time.server';
import type { EmployeeTime } from '../employee-time';

/** Read-only self-service: no caller-supplied employee identity, no credential output. */
export async function getEmployeeTime(): Promise<EmployeeTime> {
  try {
    const currentSession = await requireSessionMutationProof();
    return await readEmployeeTime(currentSession);
  } catch {
    return { state: 'unavailable', reason: 'read_failed' };
  }
}
