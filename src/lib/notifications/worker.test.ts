import { afterEach, expect, it, vi } from 'vitest';
import { DEFAULT_NOTIFICATION_POLICY, retryDecision } from './policy';
import { fixture } from './worker.test-support';
vi.mock('@/lib/db', () => ({ getDb: vi.fn() }));
const time = Date.parse('2030-01-01T16:00:00Z');
async function moduleUnderTest() { const m = await import('./worker').catch(() => ({})); expect(m).toHaveProperty('runDispatch'); return m as typeof import('./worker'); }
afterEach(() => vi.useRealTimers());
it('reads legacy subscription material through the previous key after activating a new write key',async()=>{
 const {deps}=fixture();Object.assign(deps.config,{subscriptionEncryptionKey:Buffer.alloc(32,47).toString('base64url'),subscriptionEncryptionKeyId:'new-key',subscriptionPreviousEncryptionKey:Buffer.alloc(32,3).toString('base64url'),subscriptionPreviousEncryptionKeyId:'old-key',subscriptionLegacyEncryptionKeyId:'old-key'});
 const m=await moduleUnderTest();expect(await m.runDispatch({mode:'all',deps})).toMatchObject({accepted:1,failed:0});
});
it('provider_acceptance_is_not_acknowledgement', async () => { const m = await moduleUnderTest(); const { deps, claims } = fixture(); expect(await m.runDispatch({ mode: 'all', deps })).toMatchObject({ accepted: 1, failed: 0 }); expect(deps.deliveries.finish).toHaveBeenCalledWith(claims[0], { state: 'provider_accepted' }); expect(deps.executor.transaction).not.toHaveBeenCalled(); });
it('invalid_subscription_is_cleaned', async () => { const m = await moduleUnderTest(); const { deps, claims } = fixture(); vi.mocked(deps.sender.send).mockResolvedValue({ kind: 'invalid_subscription' }); await m.runDispatch({ mode: 'all', deps }); expect(deps.subscriptions.invalidate).toHaveBeenCalledWith(claims[0].subscriptionId, claims[0].generation); });
it('one_failed_device_does_not_block_another', async () => { const m = await moduleUnderTest(); const { deps } = fixture(2); vi.mocked(deps.sender.send).mockResolvedValueOnce({ kind: 'retry', errorClass: 'transport_error' }); expect(await m.runDispatch({ mode: 'retry', deps })).toMatchObject({ accepted: 1, retried: 1 }); expect(deps.deliveries.claim).toHaveBeenCalledWith(expect.objectContaining({ mode: 'retry', limit: 10, leaseSeconds: 120 })); });
it.each(['resolved', 'access', 'owner', 'generation', 'environment', 'expiry', 'seed', 'session'])('revalidates %s after claim', async (reason) => { const m = await moduleUnderTest(); const { deps, intent, subscriptions } = fixture(); if (reason === 'resolved')
    vi.mocked(deps.state.check).mockResolvedValue({ deliverable: false, reason: 'resolved', effectiveVersion: 'APPROVED', expiresAt: intent.expiresAt }); if (reason === 'access')
    vi.mocked(deps.state.recipientAccess).mockResolvedValue(null); if (reason === 'owner')
    subscriptions[0].employeeId = 'other'; if (reason === 'generation')
    subscriptions[0].generation = 'new'; if (reason === 'environment')
    subscriptions[0].environment = 'production'; if (reason === 'expiry')
    intent.expiresAt = new Date(time).toISOString(); if (reason === 'seed')
    intent.purpose = 'SUMMARY'; if (reason === 'session')
    vi.mocked(deps.subscriptions.listActive).mockResolvedValue([]); await m.runDispatch({ mode: 'retry', deps }); expect(deps.sender.send).not.toHaveBeenCalled(); });
it('quiet_hours_persist_deferral_without_spending_attempt_or_refreshing_lifetime', async () => { const m = await moduleUnderTest(); const { deps, intent, claims, setNow } = fixture(); setNow(Date.parse('2030-01-02T02:00:00Z')); claims[0].leaseExpiresAt = '2030-01-02T02:02:00Z'; const expires = intent.expiresAt; await m.runDispatch({ mode: 'all', deps }); expect(deps.sender.send).not.toHaveBeenCalled(); expect(deps.deliveries.defer).toHaveBeenCalledWith(claims[0], new Date('2030-01-02T11:00:00Z')); expect(intent.expiresAt).toBe(expires); });
it('stale_completion_token_cannot_report_acceptance', async () => { const m = await moduleUnderTest(); const { deps } = fixture(); vi.mocked(deps.deliveries.finish).mockResolvedValue(false); expect(await m.runDispatch({ mode: 'all', deps })).toMatchObject({ accepted: 0 }); });
it('disabled_flags_and_test_allowlist_fail_closed', async () => { const m = await moduleUnderTest(); for (const flags of [{ featureEnabled: false }, { deliveryEnabled: false }, { testDeliveryEnabled: false }, { testAccountIds: [] }]) {
    const { deps } = fixture();
    Object.assign(deps.config, flags);
    expect(await m.runDispatch({ mode: 'all', deps })).toMatchObject({ disabled: true });
    expect(deps.deliveries.claim).not.toHaveBeenCalled();
} });
it('budget_releases_unattempted_claims_and_bounds_concurrency', async () => { const m = await moduleUnderTest(); const { deps, setNow } = fixture(10); let active = 0, max = 0; vi.mocked(deps.sender.send).mockImplementation(async () => { active++; max = Math.max(active, max); await Promise.resolve(); setNow(time + 12500); active--; return { kind: 'accepted' }; }); await m.runDispatch({ mode: 'all', deps }); expect(max).toBe(2); expect(deps.sender.send).toHaveBeenCalledTimes(2); expect(deps.deliveries.release).toHaveBeenCalledTimes(8); });
it('hung_state_fails_closed_within_invocation_budget', async () => { vi.useFakeTimers(); const m = await moduleUnderTest(); const { deps } = fixture(); vi.mocked(deps.state.check).mockImplementation(() => new Promise(() => { })); const result = m.runDispatch({ mode: 'all', deps }); await vi.advanceTimersByTimeAsync(20000); expect((await result).accepted).toBe(0); expect(deps.sender.send).not.toHaveBeenCalled(); });
it('retry_jitter_is_deterministic_at_most_ten_percent_and_lifetime_is_hard', () => { for (let i = 0; i < 100; i++) {
    const args = { attempt: 1, now: new Date(time), expiresAt: new Date(time + 86400000), result: { kind: 'retry' as const, errorClass: 'transport_error' }, deliveryId: `d-${i}`, policy: DEFAULT_NOTIFICATION_POLICY };
    const retry = retryDecision(args).retryAt!;
    expect(retry.getTime() - time).toBeGreaterThanOrEqual(60000);
    expect(retry.getTime() - time).toBeLessThanOrEqual(66000);
    expect(retryDecision(args).retryAt).toEqual(retry);
    expect(retryDecision({ ...args, expiresAt: new Date(time + 60000) })).toEqual({ terminal: 'expired' });
    expect(retryDecision({ ...args, attempt: 5 })).toEqual({ terminal: 'failed' });
} });
it('quiet_hours_are_rechecked_after_slow_subscription_read', async () => { const m = await moduleUnderTest(); const { deps, claims, subscriptions, setNow } = fixture(); setNow(Date.parse('2030-01-02T00:59:59Z')); claims[0].leaseExpiresAt = '2030-01-02T01:02:00Z'; vi.mocked(deps.subscriptions.listActive).mockImplementation(async () => { setNow(Date.parse('2030-01-02T01:00:00Z')); return subscriptions; }); await m.runDispatch({ mode: 'all', deps }); expect(deps.sender.send).not.toHaveBeenCalled(); expect(deps.deliveries.defer).toHaveBeenCalledWith(claims[0], new Date('2030-01-02T11:00:00Z')); });
it('source_check_expiry_is_persisted_as_expired', async () => { const m = await moduleUnderTest(); const { deps, claims, intent } = fixture(); vi.mocked(deps.state.check).mockResolvedValue({ deliverable: false, reason: 'expired', effectiveVersion: intent.effectiveVersion, expiresAt: intent.expiresAt }); expect(await m.runDispatch({ mode: 'all', deps })).toMatchObject({ expired: 1, cancelled: 0 }); expect(deps.deliveries.finish).toHaveBeenCalledWith(claims[0], { state: 'expired' }); });
it('no_subscription_state_is_reported_from_persistence', async () => { const m = await moduleUnderTest(); const { deps, intent } = fixture(0); vi.mocked(deps.executor.query).mockResolvedValueOnce([{ id: intent.id }]).mockResolvedValueOnce([{ push_state: 'no_active_subscription' }]); expect(await m.runDispatch({ mode: 'new', deps })).toMatchObject({ noSubscription: 1, claimed: 0 }); expect(deps.deliveries.materialize).toHaveBeenCalledWith([intent.id]); expect(deps.sender.send).not.toHaveBeenCalled(); });
it('self_test_is_only_sent_to_its_current_generation_installation', async () => { const m = await moduleUnderTest(); const { deps, intent, subscriptions } = fixture(2); intent.purpose = 'TEST'; intent.type = 'SELF_TEST'; intent.source = { kind: 'SELF_TEST', id: subscriptions[0].id, version: subscriptions[0].generation }; intent.effectiveVersion = subscriptions[0].generation; expect(await m.runDispatch({ mode: 'all', deps })).toMatchObject({ accepted: 1, cancelled: 1 }); expect(deps.sender.send).toHaveBeenCalledTimes(1); });
it('supersession_and_test_allowlist_are_checked_for_every_retry', async () => { const m = await moduleUnderTest(); for (const mutation of ['version', 'allowlist']) {
    const { deps, intent } = fixture();
    if (mutation === 'version')
        vi.mocked(deps.state.findIntent).mockResolvedValue({ ...intent, effectiveVersion: 'other' });
    else
        deps.config.testAccountIds = ['another'];
    await m.runDispatch({ mode: 'retry', deps });
    expect(deps.sender.send).not.toHaveBeenCalled();
} });
it('storage_outage_releases_unattempted_claims_but_ambiguous_acceptance_retains_lease', async () => { const m = await moduleUnderTest(); const before = fixture(); vi.mocked(before.deps.state.check).mockRejectedValue(new Error('private db diagnostic')); await m.runDispatch({ mode: 'retry', deps: before.deps }); expect(before.deps.sender.send).not.toHaveBeenCalled(); expect(before.deps.deliveries.release).toHaveBeenCalledWith(before.claims[0]); const after = fixture(); vi.mocked(after.deps.deliveries.finish).mockRejectedValue(new Error('ambiguous commit')); expect(await m.runDispatch({ mode: 'retry', deps: after.deps })).toMatchObject({ accepted: 0 }); expect(after.deps.deliveries.release).not.toHaveBeenCalled(); });
it('ambiguous_delivery_retries_with_the_same_tag_and_revalidates_resolution', async () => { const m = await moduleUnderTest(); const { deps, claims, intent } = fixture(); vi.mocked(deps.sender.send).mockResolvedValueOnce({ kind: 'retry', errorClass: 'transport_timeout' }); await m.runDispatch({ mode: 'all', deps }); claims[0].attemptCount = 2; claims[0].leaseToken = 'reclaimed'; await m.runDispatch({ mode: 'retry', deps }); const calls = vi.mocked(deps.sender.send).mock.calls; expect(calls[0][0].payload.tag).toBe(calls[1][0].payload.tag); vi.mocked(deps.state.check).mockResolvedValue({ deliverable: false, reason: 'resolved', effectiveVersion: intent.effectiveVersion, expiresAt: intent.expiresAt }); await m.runDispatch({ mode: 'retry', deps }); expect(deps.sender.send).toHaveBeenCalledTimes(2); });
it('two_invocations_only_attempt_the_disjoint_claims_returned_by_repository', async () => { const m = await moduleUnderTest(); const { deps, claims } = fixture(2); let next = 0; vi.mocked(deps.deliveries.claim).mockImplementation(async () => [claims[next++]]); const reports = await Promise.all([m.runDispatch({ mode: 'all', deps }), m.runDispatch({ mode: 'all', deps })]); expect(reports.map(r => r.accepted)).toEqual([1, 1]); expect(vi.mocked(deps.sender.send).mock.calls.map(c => c[0].payload.ownershipGeneration).sort()).toEqual(['generation-0', 'generation-1']); });
it('worker_hung_sender_is_bounded_even_when_injected_transport_ignores_signal', async () => { vi.useFakeTimers(); const m = await moduleUnderTest(); const { deps } = fixture(3); vi.mocked(deps.sender.send).mockImplementation(() => new Promise(() => { })); const result = m.runDispatch({ mode: 'retry', deps }); await vi.advanceTimersByTimeAsync(20000); expect((await result).retried).toBe(3); expect(vi.mocked(deps.sender.send).mock.calls.every(call => call[0].signal.aborted)).toBe(true); });
it('factory_scopes_real_repository_queries_and_transactions_to_invocation_abort', async () => { const m = await moduleUnderTest(); const { deps } = fixture(); const real = m.createWorkerDeps(deps.config); const abort = new AbortController(); const scoped = real.withSignal!(abort.signal); abort.abort(); await expect(scoped.state.findIntent('intent')).rejects.toThrow(); await expect(scoped.deliveries.claim({ now: new Date(), limit: 10, leaseSeconds: 120, mode: 'all' })).rejects.toThrow(); });
it('hung_preflight_cancels_scoped_IO_and_releases_unattempted_lease', async () => { vi.useFakeTimers(); const m = await moduleUnderTest(); const { deps, claims } = fixture(); const signals: AbortSignal[] = []; deps.withSignal = signal => { signals.push(signal); return deps; }; vi.mocked(deps.state.check).mockImplementation(() => new Promise(() => { })); const result = m.runDispatch({ mode: 'all', deps }); await vi.advanceTimersByTimeAsync(20000); await result; expect(signals.length).toBe(2); expect(signals.every(s => s.aborted)).toBe(true); expect(deps.deliveries.release).toHaveBeenCalledWith(claims[0]); expect(deps.sender.send).not.toHaveBeenCalled(); });
it('high_urgency_can_send_at_night_but_never_past_source_lifetime', async () => { const m = await moduleUnderTest(); const { deps, intent, claims, setNow } = fixture(); setNow(Date.parse('2030-01-02T02:00:00Z')); claims[0].leaseExpiresAt = '2030-01-02T02:02:00Z'; intent.urgency = 'high'; expect(await m.runDispatch({ mode: 'retry', deps })).toMatchObject({ accepted: 1 }); const expiry = intent.expiresAt; setNow(Date.parse(expiry)); expect(await m.runDispatch({ mode: 'retry', deps })).toMatchObject({ accepted: 0, expired: 1 }); expect(deps.sender.send).toHaveBeenCalledTimes(1); });
it('retry_after_cannot_extend_persisted_lifetime_and_attempt_five_is_terminal', async () => { const m = await moduleUnderTest(); for (const attempt of [1, 5]) {
    const { deps, claims, intent } = fixture();
    claims[0].attemptCount = attempt;
    intent.expiresAt = new Date(time + 120000).toISOString();
    vi.mocked(deps.sender.send).mockResolvedValue({ kind: 'retry', errorClass: 'provider_throttled', retryAfterSeconds: 3600 });
    expect(await m.runDispatch({ mode: 'retry', deps })).toMatchObject(attempt === 1 ? { expired: 1, retried: 0 } : { failed: 1, retried: 0 });
} });
it('in_flight_attempt_is_aborted_at_source_expiry_before_eight_seconds',async()=>{
    vi.useFakeTimers();vi.setSystemTime(new Date(time));
    const m=await moduleUnderTest();const {deps,intent}=fixture();deps.clock=()=>new Date();intent.expiresAt=new Date(time+2000).toISOString();
    let abortedAt=0;vi.mocked(deps.sender.send).mockImplementation(async input=>{input.signal.addEventListener('abort',()=>{abortedAt=Date.now();});return new Promise(()=>{});});
    const result=m.runDispatch({mode:'retry',deps});await vi.advanceTimersByTimeAsync(8000);
    expect((await result).expired).toBe(1);expect(abortedAt).toBe(time+2000);
});

it('removed-session cleanup obeys the work deadline and does not begin delivery after it', async () => {
    vi.useFakeTimers();
    try {
        const { deps } = fixture();
        deps.subscriptions.cleanupRemovedSessions = vi.fn(() => new Promise<number>(() => {}));
        const { runDispatch } = await moduleUnderTest();
        const operation = runDispatch({ mode: 'all', deps });
        const assertion = expect(operation).rejects.toThrow('worker_budget_exhausted');
        await vi.advanceTimersByTimeAsync(19000);
        await assertion;
        expect(deps.subscriptions.cleanupRemovedSessions).toHaveBeenCalledWith('test', 10);
        expect(deps.deliveries.claim).not.toHaveBeenCalled();
        expect(deps.sender.send).not.toHaveBeenCalled();
    } finally { vi.useRealTimers(); }
});
it.each(['workspace_unavailable', 'workspace_changed'])('P3 a transient %s check waits a minute and tries again instead of cancelling for good', async reason => {
    const m = await moduleUnderTest(); const { deps, claims, intent } = fixture();
    vi.mocked(deps.state.check).mockResolvedValue({ deliverable: false, reason, effectiveVersion: intent.effectiveVersion, expiresAt: intent.expiresAt });
    const report = await m.runDispatch({ mode: 'all', deps });
    expect(deps.sender.send).not.toHaveBeenCalled(); expect(report).toMatchObject({ cancelled: 0 });
    expect(deps.deliveries.defer).toHaveBeenCalledWith(claims[0], new Date(deps.clock().getTime() + m.TRANSIENT_RECHECK_MS));
});
it('P3 a transient check that would land after expiry expires instead of looping', async () => {
    const m = await moduleUnderTest(); const { deps, intent, setNow } = fixture();
    setNow(Date.parse(intent.expiresAt) - 30_000);
    vi.mocked(deps.state.check).mockResolvedValue({ deliverable: false, reason: 'workspace_unavailable', effectiveVersion: intent.effectiveVersion, expiresAt: intent.expiresAt });
    expect(await m.runDispatch({ mode: 'all', deps })).toMatchObject({ expired: 1, cancelled: 0 }); expect(deps.deliveries.defer).not.toHaveBeenCalled();
});
it('P3 a real business reason still cancels', async () => {
    const m = await moduleUnderTest(); const { deps, intent } = fixture();
    vi.mocked(deps.state.check).mockResolvedValue({ deliverable: false, reason: 'request_resolved_or_seed', effectiveVersion: intent.effectiveVersion, expiresAt: intent.expiresAt });
    expect(await m.runDispatch({ mode: 'all', deps })).toMatchObject({ cancelled: 1 }); expect(deps.deliveries.defer).not.toHaveBeenCalled();
});
