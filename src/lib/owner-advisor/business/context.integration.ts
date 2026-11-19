import { afterEach, beforeEach, expect, it } from '@rstest/core';
import { randomUUID } from 'node:crypto';
import { companyAccessFixture } from '@/test/integration/company-access-fixture';
import { AdvisorStore } from '../store.server';
import { admitOwner } from '../authority.server';
import { emptyMemory } from '../memory';
import { captureWeeklyContext, weeklyContextGuards, weeklyMemoryAdmission } from '../weekly-context.server';
import { captureOwnerInvestigationContext, ownerInvestigationContextGuards, ownerInvestigationMemoryAdmission } from '../owner-investigation-context.server';
let f: Awaited<ReturnType<typeof companyAccessFixture>>;
beforeEach(async () => { f = await companyAccessFixture(); });
afterEach(async () => { await f?.db.dispose(); });
it('preserves the admitted memory projection and exact business-day expiry across the shared extraction', () => {
  const memory = emptyMemory(), at = '2026-11-16T21:00:00.000Z';
  expect(ownerInvestigationMemoryAdmission(memory, at, 'America/Puerto_Rico')).toEqual(weeklyMemoryAdmission(memory, at, 'America/Puerto_Rico'));
  expect(ownerInvestigationMemoryAdmission(memory, at, 'America/Puerto_Rico').validUntil).toBe('2026-11-17T04:00:00.000Z');
});
it('preserves revision guards and legacy weekly sentinel behavior against real SQL', async () => {
  const advisor = new AdvisorStore(f.owner, await admitOwner(f.owner, f.db.executor), f.db.executor), signal = new AbortController().signal;
  const origin = { requestId: randomUUID(), profileRevision: 0, notebookRevision: 0 };
  const shared = await captureOwnerInvestigationContext(advisor, {}, origin, signal), old = await captureWeeklyContext(advisor, {}, origin, signal);
  expect(shared).toEqual(old); expect(ownerInvestigationContextGuards(advisor, shared)).toEqual(weeklyContextGuards(advisor, old));
  await f.q("INSERT INTO owner_advisor_notebooks(workspace_id,owner_id,revision) VALUES('workspace-fuel','owner',1)");
  await expect(captureOwnerInvestigationContext(advisor, {}, origin, signal)).rejects.toMatchObject({ code: 'conflict' });
  await expect(captureWeeklyContext(advisor, {}, origin, signal)).rejects.toMatchObject({ code: 'conflict' });
});
