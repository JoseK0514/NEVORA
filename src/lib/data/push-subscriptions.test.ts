import { expect, it, vi } from 'vitest';
import type { SqlExecutor, OwnedEnrollment } from '../notifications/types';
async function setup(rows: unknown[][] = [[] ,[]]) {
  const implementation = await import('./push-subscriptions').catch(() => ({}));
  expect(implementation).toHaveProperty('sqlSubscriptionRepository');
  const executor = { query:vi.fn().mockResolvedValue([]), transaction:vi.fn().mockResolvedValue(rows) } as unknown as SqlExecutor;
  return { executor, repository:(implementation as typeof import('./push-subscriptions')).sqlSubscriptionRepository(executor) };
}
const enrollment: OwnedEnrollment = { employeeId:'employee-1', installationHash:'install-hash', environment:'test', endpointFingerprint:'fingerprint', encryptedMaterial:'encrypted-fictional-material', sessionHash:'session-hash', generation:'generation-1', expectedGeneration:null, expiresAt:null };
it('enrollment_does_not_fabricate_success_on_ownership_conflict', async () => {
  const {repository,executor} = await setup();
  expect(await repository.enroll(enrollment)).toEqual({state:'conflict'});
  const batch = vi.mocked(executor.transaction).mock.calls[0][0];
  expect(batch[0].text).toMatch(/pg_advisory_xact_lock/);
  expect(batch[1].text).toMatch(/employee_id = EXCLUDED.employee_id/);
  expect(batch[1].text).toMatch(/generation = \$9/);
  expect(batch[1].text).toMatch(/endpoint_fingerprint = EXCLUDED.endpoint_fingerprint OR push_subscriptions.generation <> EXCLUDED.generation/);
  expect(batch[1].text).toMatch(/employee_sessions/);
  expect(batch[1].text).toMatch(/expires_at > now\(\)/);
  expect(batch[1].values).toContain(enrollment.encryptedMaterial);
});
it('detach_is_generation_scoped_and_cancels_deliveries_atomically', async () => {
  const {repository,executor} = await setup([[],[{id:'sub-1',generation:'advanced'}]]);
  expect(await repository.detach({installationHash:'install-hash',environment:'test',generation:'generation-1'})).toEqual({state:'complete'});
  const statement = vi.mocked(executor.transaction).mock.calls[0][0][1];
  expect(statement.text).toMatch(/UPDATE push_subscriptions/);
  expect(statement.text).toMatch(/UPDATE push_deliveries/);
  expect(statement.values.slice(0,3)).toEqual(['install-hash','test','generation-1']);
  expect(statement.text).toMatch(/encrypted_material = NULL/);
});
it('active_consent_survives_session_expiry_but_not_session_deletion', async () => {
  const {repository,executor} = await setup();
  expect(await repository.listActive('employee-1','test')).toEqual([]);
  const statement = vi.mocked(executor.query).mock.calls[0][0];
  expect(statement.text).toMatch(/employee_sessions/);
  expect(statement.text).not.toMatch(/session\.expires_at/);
  expect(statement.text).toMatch(/e.active = true/);
  expect(statement.values).toEqual(['employee-1','test']);
});
it('invalidation_is_expected_generation_scoped_and_receipts_are_idempotent', async () => {
  const {repository,executor} = await setup();
  await repository.invalidate('sub-1','generation-1');
  expect(vi.mocked(executor.transaction).mock.calls[0][0][0].values.slice(0,2)).toEqual(['sub-1','generation-1']);
  expect(await repository.reconcile({installationHash:'install-hash',environment:'test',generation:'generation-1',sessionHash:'session-hash',issuedAt:'2026-10-02T12:00:00Z',expiresAt:'2026-10-03T12:00:00Z'})).toEqual({state:'complete'});
});

it('enrollment_success_returns_only_public_status_and_generation', async () => {
  const {repository} = await setup([[],[{generation:'generation-1'}]]);
  expect(await repository.enroll(enrollment)).toEqual({state:'active',generation:'generation-1'});
});
it('active_subscription_maps_encrypted_storage_and_proofs_only_internally', async () => {
  const {repository,executor} = await setup();
  vi.mocked(executor.query).mockResolvedValueOnce([{
    id:'subscription-1',employee_id:'employee-1',installation_hash:'install-hash',environment:'test',endpoint_fingerprint:'fingerprint',
    encrypted_material:'encrypted-fictional-material',generation:'generation-1',session_hash:'session-hash',status:'active',
    consent_at:new Date('2030-10-01T12:00:00.123Z'),updated_at:'2030-10-01T12:01:00Z',expires_at:null,last_test_at:null,
  }]);
  expect(await repository.listActive('employee-1','test')).toEqual([{
    id:'subscription-1',employeeId:'employee-1',installationHash:'install-hash',environment:'test',endpointFingerprint:'fingerprint',
    encryptedMaterial:'encrypted-fictional-material',generation:'generation-1',sessionHash:'session-hash',status:'active',
    consentAt:'2030-10-01T12:00:00.123Z',updatedAt:'2030-10-01T12:01:00.000Z',expiresAt:null,lastTestAt:null,
  }]);
});
it('cleanup_storage_failures_propagate_instead_of_claiming_complete', async () => {
  const {repository,executor} = await setup();
  vi.mocked(executor.transaction).mockRejectedValueOnce(new Error('storage unavailable'));
  await expect(repository.detach({installationHash:'install-hash',environment:'test',generation:'generation-1'})).rejects.toThrow('storage unavailable');
});

it('installation_lookup_is_environment_scoped_including_tombstones_and_self_test_gate_is_atomic', async () => {
  const executor = { query: vi.fn(async()=>[{id:'subscription',employee_id:'employee',installation_hash:'installation',environment:'test',generation:'generation',endpoint_fingerprint:'fingerprint',session_hash:'session',status:'detached',expires_at:null,last_test_at:null}]), transaction:vi.fn(async()=>[[],[{id:'notification'}]]) } as unknown as SqlExecutor;
  const {sqlSubscriptionRepository}=await import('./push-subscriptions'); const repository=sqlSubscriptionRepository(executor);
  expect(repository).toHaveProperty('findInstallation');
  expect(repository).toHaveProperty('queueSelfTest');
  const record=await repository.findInstallation('installation','test'); expect(record?.status).toBe('detached');
  const lookup=(executor.query as ReturnType<typeof vi.fn>).mock.calls[0][0]; expect(lookup.values).toEqual(['installation','test']);expect(lookup.text).toMatch(/installation_hash = \$1 AND environment = \$2/);
  const {buildSelfTestNotification}=await import('../assistance/notification-events');
  const now=new Date().toISOString();const intent={...buildSelfTestNotification('employee','test'),id:'notification',environment:'test' as const,source:{kind:'SELF_TEST' as const,id:'subscription',version:'generation'},effectiveVersion:'generation',purpose:'TEST' as const,urgency:'normal' as const,dueAt:now,expiresAt:new Date(Date.now()+300000).toISOString()};
  expect(await repository.queueSelfTest({proof:{installationHash:'installation',environment:'test',generation:'generation'},employeeId:'employee',sessionHash:'session',intent})).toBe(true);
  const statements=(executor.transaction as ReturnType<typeof vi.fn>).mock.calls[0][0];const statement=statements[1];expect(statement.text).toContain("last_test_at <= now() - interval '5 minutes'");expect(statement.text).toContain('INSERT INTO notifications');expect(statement.text).toContain("SELECT $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,'pending' FROM allowed");expect(statement.text).toContain('session.expires_at > now()');expect(statement.values).toContain('subscription');
});
