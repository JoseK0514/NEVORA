import { beforeEach, expect, it, vi } from 'vitest';
import type { SqlStatement, SqlExecutor } from '../../notifications/types';
import type { ClockerIdentityProof } from '../pin-identity.server';
import { SqlClockerPhotoRepository, type PhotoAuthorityBinder } from './sql-repository';
import { unconfiguredPhotoPolicy } from './validation';
const command = { commandId: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', verificationId: 'a'.repeat(64) };
const proof = { employeeId: 'fictional-employee', device: { deviceId: 'fictional-device', workspaceId: 'fictional-a', credentialVersion: 7 } } as ClockerIdentityProof;
const owner = { workspaceId: 'fictional-a', employeeId: 'fictional-owner', sessionTokenHash: 'a'.repeat(64) };
const guards = { before: [{ text: 'current-proof-before', values: [] }], after: [{ text: 'current-proof-after', values: [] }] };
const authority: PhotoAuthorityBinder = { punch: vi.fn(() => guards), management: vi.fn(() => guards) };
let returned: unknown;
let captured: readonly SqlStatement[];
const executor: SqlExecutor = { query: async () => [], transaction: vi.fn(async statements => { if (statements.length === 3) captured = statements; return [[], [{ value: returned }], []]; }) };
const repository = new SqlClockerPhotoRepository(executor, authority);
beforeEach(() => { vi.clearAllMocks(); returned = { commandId: command.commandId, state: 'unknown' }; captured = []; });
it('checks current authority before and after the SAME actual SQL batch', async () => {
  expect(await repository.status(proof, command)).toEqual(returned);
  expect(captured[0]).toEqual(guards.before[0]); expect(captured.at(-1)).toEqual(guards.after[0]);
  expect(captured[1].values).toEqual(['fictional-a', 'fictional-device', 'fictional-employee', 7, command.commandId]);
  expect(authority.punch).toHaveBeenCalledWith(proof, command);
  expect(executor.transaction).toHaveBeenCalledTimes(2);
  expect(vi.mocked(executor.transaction).mock.calls[1][0]).toEqual([...guards.before,...guards.after]);
});
it('fails closed on an empty adapter instead of treating proof as authenticated', async () => {
  const unbound = new SqlClockerPhotoRepository(executor, { punch: () => ({ before: [], after: [] }), management: () => guards });
  await expect(unbound.status(proof, command)).rejects.toThrow('Verify your PIN'); expect(executor.transaction).not.toHaveBeenCalled();
});
it('an unknown response preserves no-commit claim and never writes a punch', async () => {
  vi.mocked(executor.transaction).mockRejectedValueOnce(new Error('secret SQL result lost'));
  await expect(repository.status(proof, command)).rejects.toThrow('result could not be confirmed');
  expect(captured.every(statement => !statement.text.includes('clocker_apply_punch'))).toBe(true);
});
it('retrieves initial defaults without claiming previously persisted policy', async () => {
  returned = null; expect(await repository.policy(proof)).toEqual(unconfiguredPhotoPolicy());
});
it('returns disabled stored NULL preferences unchanged instead of applying new-company defaults', async () => {
  const stored = { version: 6, enabled: false, events: ['CLOCK_OUT'], retentionDays: null, failureBehavior: null };
  returned = stored;
  expect(await repository.managementPolicy(owner)).toMatchObject(stored);
});
it('records an assisted photo exception with the exact proof and original command only', async () => {
  returned = { commandId: command.commandId, state: 'missing', code: 'PHOTO_ALTERNATIVE' };
  expect(await repository.failure(proof, { ...command, code: 'PHOTO_ALTERNATIVE' })).toEqual(returned);
  expect(captured[1].values).toEqual(['fictional-a', 'fictional-device', 'fictional-employee', 7, command.commandId, 'PHOTO_ALTERNATIVE']);
  expect(captured[1].text).toContain('clocker_photo_missing'); expect(captured[1].text).not.toContain('clocker_apply_punch');
});
it('policy saves send trusted workspace/actor and optimistic version to SQL', async () => {
  returned = { version: 3, enabled: true, events: ['CLOCK_OUT'], retentionDays: 7, failureBehavior: 'ALLOW_WITH_EXCEPTION' };
  await repository.savePolicy(owner, { expectedVersion: 2, enabled: true, events: ['CLOCK_OUT'], retentionDays: 7, failureBehavior: 'ALLOW_WITH_EXCEPTION' });
  expect(captured[1].values).toEqual(['fictional-a', 'fictional-owner', 2, true, ['CLOCK_OUT'], 7, 'ALLOW_WITH_EXCEPTION']);
  expect(authority.management).toHaveBeenCalledWith(owner, 'settings');
});
it('private read enforces tenant, nonexpired original command and location with audited access', async () => {
  returned = null; expect(await repository.readPrivatePhoto(owner, { deviceId: 'fictional-device', commandId: command.commandId }, 'fictional')).toBeNull();
  expect(captured[1].text).toContain('p.workspace_id=$1'); expect(captured[1].text).toContain('p.expires_at>clock_timestamp()');
  expect(captured[1].text).toContain('location.clocker_key=$5'); expect(captured[1].text).toContain('clocker_photo_access_events');
  expect(captured[1].text).toContain("actor.role='OWNER'"); expect(captured[1].text).not.toContain("actor.role='MANAGER'");
  expect(captured[1].values).toEqual(['fictional-a', 'fictional-owner', 'fictional-device', command.commandId, 'fictional']);
});
it('cleanup is bounded, company scoped, removes bytes and preserves original ledger', async () => {
  returned = 2; expect(await repository.cleanupExpired(owner, 10)).toBe(2);
  expect(captured[1].text).toContain('FOR UPDATE SKIP LOCKED'); expect(captured[1].text).toContain('jpeg=NULL');
  expect(captured[1].text).not.toContain('DELETE FROM clocker_command_ledger'); expect(captured[1].values).toEqual(['fictional-a', 'fictional-owner', 10]);
});
