import { expect, it, vi } from 'vitest';
import { ClockerPhotoService, type ClockerPhotoRepository } from './service';
import { unconfiguredPhotoPolicy } from './validation';

const proof = { workspaceId: 'fictional-workspace', employeeId: 'fictional-owner', sessionTokenHash: 'a'.repeat(64) };
const context = { companyName: 'Fictional Company', policy: { ...unconfiguredPhotoPolicy(), version: 1, enabled: true }, profile: { version: 1, assistanceContact: 'Fictional company desk', assistanceInstructions: 'Ask for assisted punching.' } };
function fixture() {
  const repository = { managementNoticeContext: vi.fn(async () => context), saveNoticeProfile: vi.fn(async () => context.profile), cleanupExpired: vi.fn(async () => 2), cleanupOrphans: vi.fn(async () => 1), listPhotos: vi.fn() } as unknown as ClockerPhotoRepository;
  return { repository, service: new ClockerPhotoService(repository) };
}
it('company-edited assistance cannot certify operational cleanup or backup behavior', async () => {
  const { repository, service } = fixture();
  expect(await service.managementNoticeSettings(proof)).toMatchObject({ readiness: 'lifecycle_unverified', notice: null, profile: context.profile });
  await expect(service.saveNoticeProfile(proof, { expectedVersion: 1, assistanceContact: 'Desk', assistanceInstructions: 'Ask for help.', cleanupDisclosure: 'Invented erasure.' })).rejects.toThrow();
  expect(repository.saveNoticeProfile).not.toHaveBeenCalled();
});
it('an unavailable trusted lifecycle lookup never leaks provider failures or enables capture', async () => {
  const { repository } = fixture();
  const service = new ClockerPhotoService(repository, async () => { throw new Error('secret provider failure'); });
  const result = await service.managementNoticeSettings(proof);
  expect(result).toMatchObject({ readiness: 'lifecycle_unverified', notice: null });
  expect(JSON.stringify(result)).not.toContain('secret'); expect(repository.managementNoticeContext).toHaveBeenCalledTimes(2);
});
it('shares one bounded cleanup budget between expired photos and orphan finalization', async () => {
  const { repository, service } = fixture();
  expect(await service.cleanupPhotoEvidence(proof, 3)).toEqual({ expired: 2, orphanFinalized: 1 });
  expect(repository.cleanupExpired).toHaveBeenCalledWith(proof, 3); expect(repository.cleanupOrphans).toHaveBeenCalledWith(proof, 1);
  vi.mocked(repository.cleanupOrphans).mockClear();
  expect(await service.cleanupPhotoEvidence(proof, 2)).toEqual({ expired: 2, orphanFinalized: 0 });
  expect(repository.cleanupOrphans).not.toHaveBeenCalled();
});
it('rejects unbounded cleanup and injected review selectors before repository access', async () => {
  const { repository, service } = fixture();
  await expect(service.cleanupPhotoEvidence(proof, 501)).rejects.toThrow();
  expect(() => service.listPhotos(proof, { limit: 20, cursor: null, workspaceId: 'other-company' })).toThrow();
  expect(repository.cleanupExpired).not.toHaveBeenCalled(); expect(repository.listPhotos).not.toHaveBeenCalled();
});
