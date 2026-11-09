/** Explicit fictional clients for legacy behavior tests. Authority regressions
 * call the production API with captured proof, never these fresh-proof adapters. */
import type { SqlExecutor } from '../../lib/notifications/types';
import { neonNotificationExecutor } from '../../lib/data/notification-transactions';
import * as requests from '../../lib/data/requests';
import * as weeks from '../../lib/data/week-settings';
import { fixtureProof } from './shift-change-api';
export async function createTimeOffRequest(input: Omit<Parameters<typeof requests.createTimeOffRequest>[0], 'proof'>, executor: SqlExecutor = neonNotificationExecutor()) {
  return requests.createTimeOffRequest({ ...input, proof: await fixtureProof(executor, input.employeeId) }, executor);
}
export async function replaceWeeklyAvailability(employeeId: string, weekStart: string, windows: Parameters<typeof weeks.replaceWeeklyAvailability>[2], changedDays?: number[]) {
  return weeks.replaceWeeklyAvailability(employeeId, weekStart, windows, changedDays, await fixtureProof(neonNotificationExecutor(), employeeId));
}
