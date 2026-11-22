import { randomUUID } from 'node:crypto';
import { addDays } from '../../src/lib/date-utils';
import { executeCommunicationCommand, previewCommunicationAudience } from '../../src/lib/communications/service.server';
import { executeScheduleCopy } from '../../src/lib/data/schedule-copy';
import type { SqlExecutor } from '../../src/lib/notifications/types';
import type { SessionMutationProof } from '../../src/lib/shift-changes/types';
import { seedPayrollFixture } from '../../src/test/integration/payroll-fixture';

export async function seedCollabPageData(executor: SqlExecutor, owner: SessionMutationProof, week: string) {
  const draft = {
    type: 'LOCATION_ANNOUNCEMENT' as const,
    scope: { kind: 'LOCATION' as const, locationId: 'loc-1' },
    title: 'Fictional shift update',
    body: 'Check the published test schedule.',
    acknowledgement: 'REQUIRED' as const,
    expiresAt: null,
  };
  const audience = await previewCommunicationAudience(owner, draft, executor);
  if (audience.state !== 'ready') throw Error('The fictional update audience could not be built.');
  const published = await executeCommunicationCommand(owner, {
    kind: 'PUBLISH', operationId: randomUUID(), authority: audience.authority, draft,
    audienceFingerprint: audience.fingerprint,
  }, executor);
  if (published.status !== 'committed') throw Error('The fictional update could not be published.');

  const copyWeek = addDays(week, 7);
  const copy = await executeScheduleCopy(owner, {
    kind: 'PREVIOUS_WEEK', operationId: randomUUID(), weekStart: copyWeek,
  }, executor);
  if (!copy.rows.some(row => row.status === 'COMMITTED')) throw Error('The fictional schedule could not be copied.');

  // The app receives its own copy of this flag. The payroll fixture also calls
  // the service directly in the launcher process.
  const priorPayroll = process.env.NEVORA_PAYROLL_ENABLED;
  process.env.NEVORA_PAYROLL_ENABLED = 'true';
  try {
    const payroll = await seedPayrollFixture(executor, { automaticPublish: false });
    if (!payroll.runId) throw Error('The fictional payroll run could not be prepared.');
    return { updateId: published.id, copyId: copy.operationId, copyWeek, payrollRunId: payroll.runId };
  } finally {
    if (priorPayroll === undefined) delete process.env.NEVORA_PAYROLL_ENABLED;
    else process.env.NEVORA_PAYROLL_ENABLED = priorPayroll;
  }
}
