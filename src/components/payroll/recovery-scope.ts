import 'server-only';
import { createHash } from 'node:crypto';

export function payrollRecoveryScope(workspaceId: string, employeeId: string) {
  return createHash('sha256').update(JSON.stringify(['nevora-payroll-recovery', workspaceId, employeeId])).digest('hex');
}
