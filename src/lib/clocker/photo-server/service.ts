import type {pinManagementAccess} from '../pin-authority.server';
import type { ClockerIdentityProof } from '../pin-identity.server';
import type { PhotoCommand, PhotoFailure, PhotoPolicy, PhotoStatus, PhotoPolicyUpdate, PhotoCompanyNoticeSettings, PhotoLifecycleDisclosures,
  PhotoNoticeContext, PhotoNoticeProfile, PhotoNoticeProfileUpdate, PhotoReference, PhotoReviewQuery, PhotoReviewPage, PhotoReviewRecord,
  PhotoRemovalResult, PhotoCleanupResult, PhotoUploadSnapshot } from './contracts';
import { ClockerPhotoError } from './contracts';
import { parsePhotoCommand, parsePhotoFailure, parsePhotoPolicyUpdate, parsePhotoNotice, parsePhotoNoticeProfileUpdate, parsePhotoReference, parsePhotoReviewQuery, parsePhotoUploadSnapshot } from './validation';
import type { ValidatedPhoto } from './jpeg';
import { decodePunchJpeg } from './decode';

/** Created only by the trusted portal/F10 binder, never parsed from a request. */
export type PhotoManagementProof = { workspaceId: string; employeeId: string; sessionTokenHash: string; ownerAccess?:Awaited<ReturnType<typeof pinManagementAccess>> };
export interface ClockerPhotoRepository {
  policy(proof: ClockerIdentityProof): Promise<PhotoPolicy>;
  status(proof: ClockerIdentityProof, command: PhotoCommand): Promise<PhotoStatus>;
  upload(proof: ClockerIdentityProof, command: PhotoCommand, photo: ValidatedPhoto, snapshot: PhotoUploadSnapshot): Promise<PhotoStatus>;
  failure(proof: ClockerIdentityProof, command: PhotoFailure): Promise<PhotoStatus>;
  managementPolicy(proof: PhotoManagementProof): Promise<PhotoPolicy>;
  savePolicy(proof: PhotoManagementProof, update: PhotoPolicyUpdate): Promise<PhotoPolicy>;
  readPrivatePhoto(proof: PhotoManagementProof, reference: { deviceId: string; commandId: string }, locationKey?: string): Promise<Uint8Array | null>;
  cleanupExpired(proof: PhotoManagementProof, limit: number): Promise<number>;
  cleanupOrphans(proof: PhotoManagementProof, limit: number): Promise<number>;
  punchNoticeContext(proof: ClockerIdentityProof): Promise<PhotoNoticeContext>;
  managementNoticeContext(proof: PhotoManagementProof): Promise<PhotoNoticeContext>;
  saveNoticeProfile(proof: PhotoManagementProof, update: PhotoNoticeProfileUpdate): Promise<PhotoNoticeProfile>;
  listPhotos(proof: PhotoManagementProof, query: PhotoReviewQuery): Promise<PhotoReviewPage>;
  photoDetail(proof: PhotoManagementProof, reference: PhotoReference): Promise<PhotoReviewRecord | null>;
  removePhoto(proof: PhotoManagementProof, reference: PhotoReference): Promise<PhotoRemovalResult>;
}
/** Platform-controlled factual lifecycle evidence; absent until actual operator
 * verification/F10 binding. Company notice editing cannot provide this callback. */
export type PhotoLifecycleProvider = (scope: { workspaceId: string; policyVersion: number; retentionDays: number | null }) => Promise<PhotoLifecycleDisclosures | null>;

/** No punch writer: a photo failure must never execute or duplicate a time punch. */
export class ClockerPhotoService {
  constructor(private readonly repository: ClockerPhotoRepository, private readonly verifiedLifecycle?: PhotoLifecycleProvider) {}
  policy(proof: ClockerIdentityProof) { return this.repository.policy(proof); }
  status(proof: ClockerIdentityProof, input: unknown) { return this.repository.status(proof, parsePhotoCommand(input)); }
  async upload(proof: ClockerIdentityProof, input: unknown, bytes: unknown, contentType: unknown, inputSnapshot: unknown) {
    const command = parsePhotoCommand(input);
    const snapshot = parsePhotoUploadSnapshot(inputSnapshot);
    const photo = await decodePunchJpeg(bytes, contentType);
    return this.repository.upload(proof, command, photo, snapshot);
  }
  failure(proof: ClockerIdentityProof, input: unknown) { return this.repository.failure(proof, parsePhotoFailure(input)); }
  managementPolicy(proof: PhotoManagementProof) { return this.repository.managementPolicy(proof); }
  savePolicy(proof: PhotoManagementProof, input: unknown) { return this.repository.savePolicy(proof, parsePhotoPolicyUpdate(input)); }
  private async noticeSettings(workspaceId: string, read: () => Promise<PhotoNoticeContext>): Promise<PhotoCompanyNoticeSettings> {
    const context = await read();
    if (!context.companyName || !context.profile.assistanceContact || !context.profile.assistanceInstructions) {
      return { ...context, notice: null, readiness: 'missing_profile' };
    }
    let lifecycle: PhotoLifecycleDisclosures | null = null;
    if (this.verifiedLifecycle) {
      try { lifecycle = await this.verifiedLifecycle({ workspaceId, policyVersion: context.policy.version, retentionDays: context.policy.retentionDays }); }
      catch { lifecycle = null; }
      // Reassert current authority and effective profile/policy after an external
      // trusted lookup. A concurrent change must not publish a stale notice.
      const current = await read();
      if (JSON.stringify(current) !== JSON.stringify(context)) throw new ClockerPhotoError('POLICY_CHANGED');
    }
    const notice = lifecycle ? parsePhotoNotice({ policyVersion: context.policy.version, profileVersion: context.profile.version, companyName: context.companyName,
      retentionDays: context.policy.retentionDays, assistanceContact: context.profile.assistanceContact,
      assistanceInstructions: context.profile.assistanceInstructions, cleanupDisclosure: lifecycle.cleanupDisclosure,
      backupDisclosure: lifecycle.backupDisclosure }, context.policy, context.profile.version) : null;
    return { ...context, notice, readiness: notice ? 'ready' : 'lifecycle_unverified' };
  }
  async punchNotice(proof: ClockerIdentityProof, expectedPolicy: PhotoPolicy) {
    const settings = await this.noticeSettings(proof.device.workspaceId, () => this.repository.punchNoticeContext(proof));
    if (JSON.stringify(settings.policy) !== JSON.stringify(expectedPolicy)) throw new ClockerPhotoError('POLICY_CHANGED');
    return settings.notice;
  }
  managementNoticeSettings(proof: PhotoManagementProof) {
    return this.noticeSettings(proof.workspaceId, () => this.repository.managementNoticeContext(proof));
  }
  async saveNoticeProfile(proof: PhotoManagementProof, input: unknown) {
    await this.repository.saveNoticeProfile(proof, parsePhotoNoticeProfileUpdate(input));
    return this.managementNoticeSettings(proof);
  }
  listPhotos(proof: PhotoManagementProof, input: unknown) { return this.repository.listPhotos(proof, parsePhotoReviewQuery(input)); }
  photoDetail(proof: PhotoManagementProof, input: unknown) { return this.repository.photoDetail(proof, parsePhotoReference(input)); }
  removePhoto(proof: PhotoManagementProof, input: unknown) { return this.repository.removePhoto(proof, parsePhotoReference(input)); }
  async cleanupPhotoEvidence(proof: PhotoManagementProof, limit = 100): Promise<PhotoCleanupResult> {
    if (!Number.isSafeInteger(limit) || limit < 1 || limit > 500) throw new ClockerPhotoError('INVALID_INPUT');
    const expired = await this.repository.cleanupExpired(proof, limit);
    const orphanFinalized = expired < limit ? await this.repository.cleanupOrphans(proof, limit - expired) : 0;
    return { expired, orphanFinalized };
  }
  cleanupExpired(proof: PhotoManagementProof, limit = 100) {
    if (!Number.isSafeInteger(limit) || limit < 1 || limit > 500) throw new ClockerPhotoError('INVALID_INPUT');
    return this.repository.cleanupExpired(proof, limit);
  }
  readPrivatePhoto(proof: PhotoManagementProof, reference: unknown, locationKey?: string) {
    const parsed = parsePhotoReference(reference);
    if (locationKey !== undefined && (locationKey.length > 64 || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(locationKey) || locationKey.endsWith('\n'))) throw new ClockerPhotoError('INVALID_INPUT');
    return this.repository.readPrivatePhoto(proof, parsed, locationKey);
  }
}
