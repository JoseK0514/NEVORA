import { expect, it, vi } from 'vitest';
import type { SqlExecutor, DeliveryClaim } from '../notifications/types';
async function setup(rows: unknown[][] = [[],[]]) {
  const module = await import('./push-deliveries').catch(() => ({}));
  expect(module).toHaveProperty('sqlDeliveryRepository');
  const executor = { query:vi.fn().mockResolvedValue([]), transaction:vi.fn().mockResolvedValue(rows) } as unknown as SqlExecutor;
  return { executor, repository:(module as typeof import('./push-deliveries')).sqlDeliveryRepository('test',executor) };
}
it('historical_notifications_are_not_replayed', async () => {
  const {repository,executor} = await setup(); await repository.materialize(['intent-1']);
  const statement = vi.mocked(executor.transaction).mock.calls[0][0][0];
  expect(statement.text).toMatch(/push_state = 'pending'/);
  expect(statement.text).toMatch(/n\.purpose <> 'EVENT' OR s\.consent_at <= n\.created_at/);
  expect(statement.text).toMatch(/n\.purpose <> 'SUMMARY' OR n\.source_kind = 'MANAGER_SUMMARY'/);
  expect(statement.text).toMatch(/no_active_subscription/);
  expect(statement.text).toMatch(/ON CONFLICT \(notification_id, subscription_id, generation\) DO NOTHING/);
  expect(statement.text).toMatch(/n\.due_at <= now\(\)/);
});
it('interrupted_claims_are_reclaimed_under_database_time_and_skip_locked', async () => {
  const {repository,executor} = await setup();
  expect(await repository.claim({now:new Date('2030-10-01'),limit:10,leaseSeconds:120,mode:'all'})).toEqual([]);
  const batch = vi.mocked(executor.transaction).mock.calls[0][0];
  const statement = batch.at(-1)!;
  expect(statement.text).toMatch(/FOR UPDATE OF d SKIP LOCKED/);
  expect(statement.text).toMatch(/lease_expires_at <= now\(\)/);
  expect(statement.text).toMatch(/attempt_count = d\.attempt_count \+ 1/);
  expect(statement.text).toMatch(/SELECT c\.id AS delivery_id, c\.notification_id/);
  expect(statement.values).not.toContain('2030-10-01T00:00:00.000Z');
  expect(statement.values).toContain(120);
  expect(batch[0].text).toMatch(/'expired'/);
  expect(batch[0].text).toMatch(/attempt_count >= 5/);
});
it('stale_lease_cannot_finish', async () => {
  const {repository,executor} = await setup();
  const claim = {deliveryId:'delivery-1',generation:'old-generation',leaseToken:'old-token'} as DeliveryClaim;
  expect(await repository.finish(claim,{state:'provider_accepted'})).toBe(false);
  const statement = vi.mocked(executor.query).mock.calls[0][0];
  expect(statement.values.slice(0,3)).toEqual(['delivery-1','old-generation','old-token']);
  expect(statement.text).toMatch(/lease_token = \$3/);
  expect(statement.text).toMatch(/generation = \$2/);
  expect(statement.text).toMatch(/lease_expires_at > now\(\)/);
  expect(statement.text).toMatch(/push_subscriptions/);
});
it('release_and_generation_cancellation_fence_superseded_work', async () => {
  const {repository,executor} = await setup();
  const claim = {deliveryId:'delivery-1',generation:'generation-1',leaseToken:'token'} as DeliveryClaim;
  expect(await repository.release(claim)).toBe(false);
  const release = vi.mocked(executor.query).mock.calls[0][0];
  expect(release.text).toMatch(/lease_token = \$3/);
  expect(release.text).toMatch(/generation = \$2/);
  await repository.cancelForGeneration('install-hash','generation-1');
  expect(vi.mocked(executor.query).mock.calls[1][0].values).toEqual(['install-hash','generation-1','test']);
});
it('invalid_claim_parameters_and_retry_without_time_are_rejected', async () => {
  const {repository,executor} = await setup();
  await expect(repository.claim({now:new Date(),limit:0,leaseSeconds:120,mode:'all'})).rejects.toThrow();
  await expect(repository.claim({now:new Date(),limit:10,leaseSeconds:900,mode:'all'})).rejects.toThrow();
  await expect(repository.finish({} as DeliveryClaim,{state:'retry_pending'})).rejects.toThrow();
  expect(executor.query).not.toHaveBeenCalled(); expect(executor.transaction).not.toHaveBeenCalled();
});

it('claim_maps_persisted_intent_and_lease_identity_without_candidate_ids', async () => {
  const {repository} = await setup([[],[{
    delivery_id:'delivery-1',notification_id:'persisted-intent',subscription_id:'subscription-1',generation:'generation-1',
    lease_token:'lease-1',lease_expires_at:'2030-10-01T12:02:00Z',attempt_count:2,
    id:'persisted-intent',employee_id:'employee-1',type:'TIME_OFF_APPROVED',title:'Update',body:'Review portal',action_href:'/app/requests',
    event_key:'key',environment:'test',source_kind:'TIME_OFF',source_id:'request-1',source_version:'v1',effective_version:'v1',
    purpose:'EVENT',urgency:'normal',due_at:'2030-10-01T12:00:00Z',expires_at:'2030-10-02T12:00:00Z',item_keys:[],
  }]]);
  const [claim] = await repository.claim({now:new Date(),limit:1,leaseSeconds:120,mode:'retry'});
  expect(claim).toMatchObject({intentId:'persisted-intent',deliveryId:'delivery-1',subscriptionId:'subscription-1',generation:'generation-1',
    leaseToken:'lease-1',leaseExpiresAt:'2030-10-01T12:02:00.000Z',attemptCount:2,
    intent:{id:'persisted-intent',source:{kind:'TIME_OFF',id:'request-1',version:'v1'},dueAt:'2030-10-01T12:00:00.000Z'}});
});

it('materialization_expires_selected_intents_and_does_nothing_for_empty_batch', async () => {
  const {repository,executor} = await setup();
  await repository.materialize([]); expect(executor.transaction).not.toHaveBeenCalled();
  await repository.materialize(['expired-intent']);
  const batch = vi.mocked(executor.transaction).mock.calls[0][0];
  expect(batch.at(-1)!.text).toMatch(/UPDATE notifications SET push_state = 'expired'/);
  expect(batch.at(-1)!.text).toMatch(/expires_at <= now\(\)/);
});

it('self_test_cannot_fan_out_to_other_account_devices_or_stale_generations', async () => {
  const {repository,executor} = await setup();
  // One account can have many devices. Its TEST intent is scoped to the internal
  // subscription id and ownership generation stored in SourceRef, never just employee_id.
  await repository.materialize(['device-test-intent']);
  await repository.claim({now:new Date(),limit:10,leaseSeconds:120,mode:'all'});
  await repository.finish({deliveryId:'test-delivery',generation:'current-generation',leaseToken:'lease'} as DeliveryClaim,
    {state:'provider_accepted'});
  const materialize = vi.mocked(executor.transaction).mock.calls[0][0][0];
  const claim = vi.mocked(executor.transaction).mock.calls[1][0].at(-1)!;
  const finish = vi.mocked(executor.query).mock.calls[0][0];
  for (const statement of [materialize,claim,finish]) {
    expect(statement.text).toMatch(/n\.purpose <> 'TEST' OR \(n\.source_kind = 'SELF_TEST' AND s\.id = n\.source_id AND s\.generation = n\.source_version\)/);
    expect(statement.text).toMatch(/n\.source_kind <> 'SELF_TEST' OR n\.purpose = 'TEST'/);
  }
});

it('worker_repository_scopes_claims_materialization_and_cleanup_to_its_environment', async () => {
  const {repository,executor} = await setup();
  await repository.materialize(['intent-1']);
  await repository.claim({now:new Date(),limit:10,leaseSeconds:120,mode:'all'});
  await repository.cancelForGeneration('install-hash','generation-1');
  const materialize = vi.mocked(executor.transaction).mock.calls[0][0];
  expect(materialize[0].text).toMatch(/n\.environment = \$2/);
  expect(materialize[0].values).toEqual([['intent-1'],'test']);
  expect(materialize[1].text).toMatch(/environment = \$2/);
  const claim = vi.mocked(executor.transaction).mock.calls[1][0];
  expect(claim[0].text).toMatch(/environment = \$1/);
  expect(claim[0].values).toEqual(['test']);
  expect(claim[1].text).toMatch(/n\.environment = \$4/);
  expect(claim[1].values).toEqual([10,120,'all','test']);
  const cancel = vi.mocked(executor.query).mock.calls[0][0];
  expect(cancel.text).toMatch(/s\.environment = \$3/);
  expect(cancel.values).toEqual(['install-hash','generation-1','test']);
});
