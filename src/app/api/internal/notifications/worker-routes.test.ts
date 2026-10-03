import { afterEach, expect, it, vi } from 'vitest';
import { fixture } from '../../../../lib/notifications/worker.test-support';
import type { WorkerDeps } from '../../../../lib/notifications/worker';
const state = vi.hoisted(() => ({ deps: undefined as WorkerDeps | undefined, factory: vi.fn() }));
vi.mock('@/lib/db', () => ({ getDb: vi.fn() }));
vi.mock('../../../../lib/notifications/worker', async (importOriginal) => ({ ...await importOriginal<typeof import('../../../../lib/notifications/worker')>(), createWorkerDeps: () => { state.factory(); return state.deps!; } }));
afterEach(() => { vi.unstubAllEnvs(); state.factory.mockClear(); });
async function routes() { return { dispatch: await import('./dispatch/route'), reminders: await import('./reminders/route'), cli: await import('../../../../../scripts/fuel-notification-worker') }; }
const request = (secret = 's'.repeat(32)) => new Request('https://example.test/api/internal/notifications/dispatch', { headers: { Authorization: `Bearer ${secret}` } });
it('http_and_cli_adapters_share_worker', async () => { const { dispatch, cli } = await routes(); vi.stubEnv('NOTIFICATION_WORKER_SECRET', 's'.repeat(32)); const http = fixture(); state.deps = http.deps; const response = await dispatch.GET(request()); const local = fixture(); const cliReport = await cli.runCli(['dispatch'], local.deps); expect(response.status).toBe(200); expect(response.headers.get('cache-control')).toBe('no-store'); expect(await response.json()).toEqual(cliReport); expect(cliReport.accepted).toBe(1); expect(vi.mocked(http.deps.deliveries.finish).mock.calls).toEqual(vi.mocked(local.deps.deliveries.finish).mock.calls); });
it('missing_or_wrong_secrets_deny_both_endpoints_before_dependency_creation', async () => { const { dispatch, reminders } = await routes(); for (const route of [dispatch, reminders]) {
    vi.stubEnv('NOTIFICATION_WORKER_SECRET', '');
    expect((await route.POST(request())).status).toBe(401);
    vi.stubEnv('NOTIFICATION_WORKER_SECRET', 's'.repeat(32));
    expect((await route.GET(request('x'.repeat(32)))).status).toBe(401);
} expect(state.factory).not.toHaveBeenCalled(); });
it('reminder_adapters_share_intent_core_and_never_send_devices', async () => { const { reminders, cli } = await routes(); vi.stubEnv('NOTIFICATION_WORKER_SECRET', 's'.repeat(32)); const http = fixture(); state.deps = http.deps; const response = await reminders.POST(request()); const local = fixture(); expect(await response.json()).toEqual(await cli.runCli(['reminders'], local.deps)); expect(http.deps.sender.send).not.toHaveBeenCalled(); expect(local.deps.sender.send).not.toHaveBeenCalled(); });
it('adapter_failure_is_sanitized_and_cli_rejects_unknown_commands', async () => { const { dispatch, cli } = await routes(); vi.stubEnv('NOTIFICATION_WORKER_SECRET', 's'.repeat(32)); const { deps } = fixture(); state.deps = deps; vi.mocked(deps.executor.query).mockRejectedValue(new Error('private secret diagnostic')); const response = await dispatch.GET(request()); expect(response.status).toBe(503); expect(await response.json()).toEqual({ error: 'worker_unavailable' }); await expect(cli.runCli(['activate'], deps)).rejects.toThrow('Usage:'); });
