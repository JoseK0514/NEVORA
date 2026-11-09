import { beforeEach, describe, expect, it, vi } from 'vitest';
import sharp from 'sharp';
import { handleClockerPhoto, handleClockerPhotoReview, handleClockerPhotoSettings, handleClockerPhotoOwnerReview, readBoundedPhotoBody } from './transport';
import { ClockerPhotoService, type ClockerPhotoRepository, type PhotoManagementProof } from './service';
import type { ClockerIdentityProof } from '../pin-identity.server';
import { unconfiguredPhotoPolicy } from './validation';
import type { PhotoStatus } from './contracts';

const command = { commandId: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', verificationId: 'a'.repeat(64) };
const proof = { employeeId: 'fictional-employee', device: { deviceId: 'fictional-device', workspaceId: 'fictional-a', locationId: 'fictional-location', credentialVersion: 1 } } as ClockerIdentityProof;
const management: PhotoManagementProof = { workspaceId: 'fictional-a', employeeId: 'fictional-owner', sessionTokenHash: 'a'.repeat(64) };
const repository: ClockerPhotoRepository = {
  policy: vi.fn(async () => unconfiguredPhotoPolicy()), managementPolicy: vi.fn(async () => unconfiguredPhotoPolicy()),
  savePolicy: vi.fn(async () => unconfiguredPhotoPolicy()),
  status: vi.fn(async (): Promise<PhotoStatus> => ({ commandId: command.commandId, state: 'unknown' })),
  upload: vi.fn(async (): Promise<PhotoStatus> => ({ commandId: command.commandId, state: 'stored' })),
  failure: vi.fn(async (): Promise<PhotoStatus> => ({ commandId: command.commandId, state: 'missing', code: 'CAMERA_DENIED' })),
  readPrivatePhoto: vi.fn(async () => null), cleanupExpired: vi.fn(async () => 0),
  cleanupOrphans: vi.fn(async () => 0),
  punchNoticeContext: vi.fn(async () => ({ companyName: 'Fictional Industry', policy: unconfiguredPhotoPolicy(), profile: { version: 0, assistanceContact: null, assistanceInstructions: null } })),
  managementNoticeContext: vi.fn(async () => ({ companyName: 'Fictional Industry', policy: unconfiguredPhotoPolicy(), profile: { version: 0, assistanceContact: null, assistanceInstructions: null } })),
  saveNoticeProfile: vi.fn(async () => ({ version: 1, assistanceContact: 'Fictional desk', assistanceInstructions: 'Ask the fictional desk.' })),
  listPhotos: vi.fn(async () => ({ records: [], total: 0, nextCursor: null })), photoDetail: vi.fn(async () => null),
  removePhoto: vi.fn(async () => ({ reference: { deviceId: 'fictional-device', commandId: command.commandId }, state: 'unavailable' as const, removedAt: null })),
};
const deps = { enabled: true, security: { portalOrigin: 'https://nevora.example', production: true }, service: new ClockerPhotoService(repository),
  authenticate: vi.fn(async () => proof) };
const notice = { policyVersion: 1, profileVersion: 1, companyName: 'Fictional Industry', retentionDays: 30, assistanceContact: 'Fictional help desk',
  assistanceInstructions: 'Contact the fictional help desk.', cleanupDisclosure: 'Fictional cleanup statement.',
  backupDisclosure: 'Fictional backup statement; expiry is not an immediate erasure promise.' };
const activePolicy = { ...unconfiguredPhotoPolicy(), version: 1, enabled: true };
const ownerDeps = { ...deps, authenticate: vi.fn(async () => management) };
function request(body: object, extra: Record<string, string> = {}) {
  return new Request('https://nevora.example/api/clocker/fictional/photos', { method: 'POST', headers: {
    Origin: 'https://nevora.example', 'x-nevora-clocker': '1', 'Content-Type': 'application/json', ...extra }, body: JSON.stringify(body) });
}
beforeEach(() => { vi.clearAllMocks(); });
describe('bounded authenticated photo transport', () => {
  it('preserves unknown committed-proof status instead of claiming image persistence', async () => {
    const response = await handleClockerPhoto(request({ operation: 'status', command }), 'fictional', deps);
    expect(await response.json()).toEqual({ commandId: command.commandId, state: 'unknown' });
    expect(repository.status).toHaveBeenCalledWith(proof, command);
    expect(response.headers.get('cache-control')).toBe('no-store, private');
  });
  it('uses server proof for every photo operation and never executes a punch', async () => {
    const response = await handleClockerPhoto(request({ operation: 'missing', command: { ...command, code: 'CAMERA_DENIED' } }), 'fictional', deps);
    expect(response.status).toBe(200);
    expect(repository.failure).toHaveBeenCalledWith(proof, { ...command, code: 'CAMERA_DENIED' });
    expect(repository.upload).not.toHaveBeenCalled();
  });
  const badHeaders: Record<string, string>[] = [{ Origin: 'https://attacker.example' }, { 'x-nevora-clocker': '0' }, { 'sec-fetch-site': 'cross-site' }];
  it.each(badHeaders)('rejects CSRF before authority/body operations %j', async extra => {
    const response = await handleClockerPhoto(request({ operation: 'policy' }, extra), 'fictional', deps);
    expect(response.status).toBe(403); expect(deps.authenticate).not.toHaveBeenCalled();
  });
  it('does not authenticate or collect when feature is disabled', async () => {
    expect((await handleClockerPhoto(request({ operation: 'policy' }), 'fictional', { ...deps, enabled: false })).status).toBe(503);
    expect(deps.authenticate).not.toHaveBeenCalled();
  });
  it('rejects client-selected employee on status request', async () => {
    const response = await handleClockerPhoto(request({ operation: 'status', command: { ...command, employeeId: 'another' } }), 'fictional', deps);
    expect(response.status).toBe(400); expect(repository.status).not.toHaveBeenCalled();
  });
  it('rejects oversized JSON while retaining inherited punch-size separation', async () => {
    const response = await handleClockerPhoto(request({ operation: 'policy', padding: 'a'.repeat(2048) }), 'fictional', deps);
    expect(response.status).toBe(400); expect(repository.policy).not.toHaveBeenCalled();
  });
  it('uploads bounded decoded synthetic JPEG privately with original command', async () => {
    vi.mocked(repository.policy).mockResolvedValueOnce(activePolicy);
    const bytes = await sharp({ create: { width: 8, height: 8, channels: 3, background: 'blue' } }).jpeg().toBuffer();
    const response = await handleClockerPhoto(new Request('https://nevora.example/api', { method: 'POST', headers: {
      Origin: 'https://nevora.example', 'x-nevora-clocker': '1', 'Content-Type': 'image/jpeg',
      'x-nevora-photo-command': command.commandId, 'x-nevora-photo-verification': command.verificationId,
      'x-nevora-photo-policy-version': '1', 'x-nevora-photo-profile-version': '1' }, body: bytes }), 'fictional', { ...deps, readNotice: async () => notice });
    expect(response.status).toBe(200);
    const call = vi.mocked(repository.upload).mock.calls[0];
    expect(call[0]).toBe(proof); expect(call[1]).toEqual(command); expect(call[2]).toMatchObject({ width: 8, height: 8, contentType: 'image/jpeg' });
    expect(call[3]).toEqual({ policyVersion: 1, profileVersion: 1 });
    expect(await response.text()).not.toContain('data:image');
  });
  it('returns an effective notice using only trusted current proof and policy', async () => {
    vi.mocked(repository.policy).mockResolvedValueOnce(activePolicy);
    const readNotice = vi.fn(async () => notice);
    const response = await handleClockerPhoto(request({ operation: 'policy' }), 'fictional', { ...deps, readNotice });
    expect(await response.json()).toEqual({ policy: activePolicy, notice });
    expect(readNotice).toHaveBeenCalledWith(proof, activePolicy);
  });
  it('exposes a notice gap without inventing company contact or lifecycle values', async () => {
    const response = await handleClockerPhoto(request({ operation: 'policy' }), 'fictional', deps);
    expect(await response.json()).toEqual({ policy: unconfiguredPhotoPolicy(), notice: null });
  });
  it.each([undefined, async () => ({ ...notice, policyVersion: 99 }), async () => ({ ...notice, backupDisclosure: '' }),
    async () => { throw new Error('secret://company-config'); }])('rejects image upload when effective notice is unavailable', async readNotice => {
    vi.mocked(repository.policy).mockResolvedValueOnce(activePolicy);
    const response = await handleClockerPhoto(new Request('https://nevora.example/api', { method: 'POST', headers: {
      Origin: 'https://nevora.example', 'x-nevora-clocker': '1', 'Content-Type': 'image/jpeg',
      'x-nevora-photo-command': command.commandId, 'x-nevora-photo-verification': command.verificationId,
      'x-nevora-photo-policy-version': '1', 'x-nevora-photo-profile-version': '1' }, body: new Uint8Array([1]) }), 'fictional', { ...deps, readNotice });
    expect(response.status).toBe(503); expect(repository.upload).not.toHaveBeenCalled();
    expect(await response.text()).not.toContain('secret');
  });
  it('preserves original-command assisted exception even with no notice binding', async () => {
    vi.mocked(repository.failure).mockResolvedValueOnce({ commandId: command.commandId, state: 'missing', code: 'PHOTO_ALTERNATIVE' });
    const response = await handleClockerPhoto(request({ operation: 'missing', command: { ...command, code: 'PHOTO_ALTERNATIVE' } }), 'fictional', deps);
    expect(await response.json()).toEqual({ commandId: command.commandId, state: 'missing', code: 'PHOTO_ALTERNATIVE' });
    expect(repository.failure).toHaveBeenCalledWith(proof, { ...command, code: 'PHOTO_ALTERNATIVE' });
    expect(repository.upload).not.toHaveBeenCalled();
  });
  it('does not expose database errors or image content in safe failure response', async () => {
    vi.mocked(repository.status).mockRejectedValueOnce(new Error('secret://db/password image=private'));
    const response = await handleClockerPhoto(request({ operation: 'status', command }), 'fictional', deps);
    expect(response.status).toBe(503); expect(await response.text()).not.toContain('secret');
  });
  it('fails authentication before parsing image', async () => {
    const response = await handleClockerPhoto(request({ operation: 'policy' }), 'fictional', { ...deps, authenticate: async () => null });
    expect(response.status).toBe(401); expect(repository.policy).not.toHaveBeenCalled();
  });
  it('limits cleanup batches at service boundary', async () => {
    const response = await handleClockerPhotoSettings(request({ operation: 'cleanup', limit: 501 }), ownerDeps);
    expect(response.status).toBe(400); expect(repository.cleanupExpired).not.toHaveBeenCalled();
  });
  it('rejects wrong-command image lookup at dedicated path', async () => {
    const response = await handleClockerPhotoReview(request({ operation: 'photo', reference: { deviceId: 'fictional-device', commandId: command.commandId } }), 'fictional', 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', ownerDeps);
    expect(response.status).toBe(400); expect(repository.readPrivatePhoto).not.toHaveBeenCalled();
  });
  it.each(['save', 'cleanup', 'read'])('rejects %s operation at dedicated photo-review path', async operation => {
    const response = await handleClockerPhotoReview(request({ operation, reference: { deviceId: 'fictional-device', commandId: command.commandId } }), 'fictional', command.commandId, ownerDeps);
    expect(response.status).toBe(400); expect(repository.readPrivatePhoto).not.toHaveBeenCalled();
  });
  it('passes exact route location as additional private-photo filter', async () => {
    const response = await handleClockerPhotoReview(request({ operation: 'photo', reference: { deviceId: 'fictional-device', commandId: command.commandId } }), 'fictional', command.commandId, ownerDeps);
    expect(response.status).toBe(404);
    expect(repository.readPrivatePhoto).toHaveBeenCalledWith(management, { deviceId: 'fictional-device', commandId: command.commandId }, 'fictional');
  });
  it('rejects stale uploaded notice profile before decoding or persisting image', async () => {
    vi.mocked(repository.policy).mockResolvedValueOnce(activePolicy);
    const response = await handleClockerPhoto(new Request('https://nevora.example/api', { method: 'POST', headers: {
      Origin: 'https://nevora.example', 'x-nevora-clocker': '1', 'Content-Type': 'image/jpeg',
      'x-nevora-photo-command': command.commandId, 'x-nevora-photo-verification': command.verificationId,
      'x-nevora-photo-policy-version': '1', 'x-nevora-photo-profile-version': '2' }, body: new Uint8Array([1]) }), 'fictional', { ...deps, readNotice: async () => notice });
    expect(response.status).toBe(409); expect(await response.json()).toMatchObject({ code: 'POLICY_CHANGED' });
    expect(repository.upload).not.toHaveBeenCalled();
  });
  it('Owner review lists metadata with protected proof and no public image response', async () => {
    const query = { limit: 20, cursor: null };
    const response = await handleClockerPhotoOwnerReview(request({ operation: 'list', query }), ownerDeps);
    expect(await response.json()).toEqual({ page: { records: [], total: 0, nextCursor: null } });
    expect(repository.listPhotos).toHaveBeenCalledWith(management, query);
    expect(response.headers.get('cache-control')).toBe('no-store, private');
    expect(repository.readPrivatePhoto).not.toHaveBeenCalled();
  });
  it('Owner review removes exact selected reference and shares a bounded cleanup budget', async () => {
    const reference = { deviceId: 'fictional-device', commandId: command.commandId };
    expect((await handleClockerPhotoOwnerReview(request({ operation: 'remove', reference }), ownerDeps)).status).toBe(200);
    expect(repository.removePhoto).toHaveBeenCalledWith(management, reference);
    expect((await handleClockerPhotoOwnerReview(request({ operation: 'cleanup', limit: 3 }), ownerDeps)).status).toBe(200);
    expect(repository.cleanupExpired).toHaveBeenCalledWith(management, 3); expect(repository.cleanupOrphans).toHaveBeenCalledWith(management, 3);
  });
  it('Owner review rejects foreign selectors and origins before private operations', async () => {
    expect((await handleClockerPhotoOwnerReview(request({ operation: 'list', query: { limit: 20, cursor: null, workspaceId: 'another' } }), ownerDeps)).status).toBe(400);
    expect((await handleClockerPhotoOwnerReview(request({ operation: 'list', query: { limit: 20, cursor: null } }, { Origin: 'https://attacker.example' }), ownerDeps)).status).toBe(403);
    expect(repository.listPhotos).not.toHaveBeenCalled(); expect(ownerDeps.authenticate).toHaveBeenCalledTimes(1);
  });
});
it('cancels an oversized streamed body even without truthful Content-Length', async () => {
  const cancel = vi.fn();
  const body = new ReadableStream({ start(controller) { controller.enqueue(new Uint8Array(9)); }, cancel });
  const req = new Request('http://127.0.0.1', { method: 'POST', body, duplex: 'half' } as RequestInit);
  await expect(readBoundedPhotoBody(req, 8)).rejects.toThrow(); expect(cancel).toHaveBeenCalled();
});
it('cancels a stalled stream with a finite deadline', async () => {
  const cancel = vi.fn(); const body = new ReadableStream({ cancel });
  const req = new Request('http://127.0.0.1', { method: 'POST', body, duplex: 'half' } as RequestInit);
  await expect(readBoundedPhotoBody(req, 8, 5)).rejects.toThrow(); expect(cancel).toHaveBeenCalled();
});
