import type { SqlExecutor, SqlStatement } from '../../notifications/types';
import type { ClockerIdentityProof } from '../pin-identity.server';
import { ClockerPhotoError, type PhotoCommand, type PhotoFailure, type PhotoPolicy, type PhotoPolicyUpdate, type PhotoStatus,
  type PhotoNoticeContext, type PhotoNoticeProfile, type PhotoNoticeProfileUpdate, type PhotoReviewQuery, type PhotoReference,
  type PhotoReviewPage, type PhotoReviewRecord, type PhotoRemovalResult, type PhotoUploadSnapshot } from './contracts';
import type { ClockerPhotoRepository, PhotoManagementProof } from './service';
import { publicPhotoPolicy, unconfiguredPhotoPolicy, publicPhotoNoticeProfile, unconfiguredPhotoNoticeProfile } from './validation';
import type { ValidatedPhoto } from './jpeg';

/** Trusted integration contract. Bind both checks to the SAME transaction and
 * current F10 runtime. There is intentionally no legacy DATABASE_URL default. */
export interface PhotoAuthorityBinder {
  punch(proof: ClockerIdentityProof, command?: PhotoCommand): { before: SqlStatement[]; after: SqlStatement[] };
  management(proof: PhotoManagementProof, operation: 'read' | 'settings' | 'cleanup'): { before: SqlStatement[]; after: SqlStatement[] };
}
const sql = (text: string, values: readonly unknown[] = []): SqlStatement => ({ text, values });
const policyProjection = `jsonb_build_object('version',version,'enabled',enabled,'events',events,
 'retentionDays',retention_days,'failureBehavior',failure_behavior)`;
const noticeProjection = `jsonb_build_object('version',version,'assistanceContact',assistance_contact,'assistanceInstructions',assistance_instructions)`;
const reviewProjection = `jsonb_build_object('reference',jsonb_build_object('deviceId',p.device_id,'commandId',p.command_id),
 'employeeName',left(concat_ws(' ',e.first_name,e.last_name),320),'locationName',l.name,'locationKey',l.clocker_key,'timeZone',w.time_zone,
 'action',p.action,'performedAt',p.performed_at,'policyVersion',p.policy_version,'profileVersion',p.notice_profile_version,
 'state',clocker_photo_status_value(p)->>'state','expiresAt',p.expires_at,'removedAt',p.removed_at,
 'hasImage',p.state='stored' AND p.jpeg IS NOT NULL AND p.expires_at>clock_timestamp()) ||
 CASE WHEN p.failure_code IS NULL THEN '{}'::jsonb ELSE jsonb_build_object('code',p.failure_code) END`;
function normalize(error: unknown): never {
  if (error instanceof ClockerPhotoError) throw error;
  const message = error instanceof Error ? error.message : '';
  for (const code of ['INVALID_INPUT', 'AUTH_REQUIRED', 'CONTEXT_CHANGED', 'COMMAND_REUSED', 'POLICY_CHANGED'] as const) {
    if (message.includes(`clocker_photo_${code}`)) throw new ClockerPhotoError(code);
  }
  throw new ClockerPhotoError('UNAVAILABLE');
}

/** Current-schema SQL; each result is fenced again after the transaction returns. */
export class SqlClockerPhotoRepository implements ClockerPhotoRepository {
  constructor(private readonly executor: SqlExecutor, private readonly authority: PhotoAuthorityBinder) {}
  private async guarded<T>(guards: { before: SqlStatement[]; after: SqlStatement[] }, statement: SqlStatement): Promise<T> {
    // An empty adapter is a fail-closed integration error, never implicit authority.
    if (!guards.before.length || !guards.after.length) throw new ClockerPhotoError('AUTH_REQUIRED');
    try {
      const rows = await this.executor.transaction([...guards.before, statement, ...guards.after]);
      const row = rows[guards.before.length]?.[0] as { value: T } | undefined;
      if (!row || !Object.hasOwn(row, 'value')) throw new ClockerPhotoError('UNAVAILABLE');
      await this.executor.transaction([...guards.before,...guards.after]);
      return row.value;
    } catch (error) { return normalize(error); }
  }
  private async readPolicy(guards: { before: SqlStatement[]; after: SqlStatement[] }, workspaceId: string): Promise<PhotoPolicy> {
    const value = await this.guarded<Parameters<typeof publicPhotoPolicy>[0] | null>(guards,
      sql(`SELECT (SELECT ${policyProjection} FROM clocker_photo_policy WHERE workspace_id=$1) AS value`, [workspaceId]));
    return value === null ? unconfiguredPhotoPolicy() : publicPhotoPolicy(value);
  }
  policy(proof: ClockerIdentityProof) { return this.readPolicy(this.authority.punch(proof), proof.device.workspaceId); }
  managementPolicy(proof: PhotoManagementProof) { return this.readPolicy(this.authority.management(proof, 'read'), proof.workspaceId); }
  status(proof: ClockerIdentityProof, command: PhotoCommand): Promise<PhotoStatus> {
    return this.guarded(this.authority.punch(proof, command), sql(`SELECT COALESCE(
      (SELECT clocker_photo_status_value(p) FROM clocker_punch_photos p
       WHERE workspace_id=$1 AND device_id=$2 AND employee_id=$3 AND credential_version=$4 AND command_id=$5::uuid),
      jsonb_build_object('commandId',$5::text,'state','unknown')) AS value`,
      [proof.device.workspaceId, proof.device.deviceId, proof.employeeId, proof.device.credentialVersion, command.commandId]));
  }
  upload(proof: ClockerIdentityProof, command: PhotoCommand, photo: ValidatedPhoto, snapshot: PhotoUploadSnapshot): Promise<PhotoStatus> {
    return this.guarded(this.authority.punch(proof, command), sql('SELECT clocker_photo_upload($1,$2,$3,$4,$5::uuid,decode($6,\'hex\'),$7,$8,$9,$10,$11) AS value',
      [proof.device.workspaceId, proof.device.deviceId, proof.employeeId, proof.device.credentialVersion, command.commandId,
        Buffer.from(photo.bytes).toString('hex'), photo.sha256, photo.width, photo.height, snapshot.policyVersion, snapshot.profileVersion]));
  }
  failure(proof: ClockerIdentityProof, command: PhotoFailure): Promise<PhotoStatus> {
    return this.guarded(this.authority.punch(proof, command), sql('SELECT clocker_photo_missing($1,$2,$3,$4,$5::uuid,$6) AS value',
      [proof.device.workspaceId, proof.device.deviceId, proof.employeeId, proof.device.credentialVersion, command.commandId, command.code]));
  }
  async savePolicy(proof: PhotoManagementProof, update: PhotoPolicyUpdate): Promise<PhotoPolicy> {
    const value = await this.guarded<Parameters<typeof publicPhotoPolicy>[0]>(this.authority.management(proof, 'settings'),
      sql('SELECT clocker_photo_save_policy($1,$2,$3,$4,$5::text[],$6,$7) AS value',
        [proof.workspaceId, proof.employeeId, update.expectedVersion, update.enabled, update.events, update.retentionDays, update.failureBehavior]));
    return publicPhotoPolicy(value);
  }
  private async noticeContext(guards: { before: SqlStatement[]; after: SqlStatement[] }, workspaceId: string): Promise<PhotoNoticeContext> {
    const value = await this.guarded<{companyName: string | null; policy: Parameters<typeof publicPhotoPolicy>[0] | null; profile: unknown}>(guards,
      sql(`SELECT jsonb_build_object('companyName',(SELECT name FROM workspaces WHERE id=$1),
       'policy',(SELECT ${policyProjection} FROM clocker_photo_policy WHERE workspace_id=$1),
       'profile',(SELECT ${noticeProjection} FROM clocker_photo_notice_profiles WHERE workspace_id=$1)) AS value`, [workspaceId]));
    if (!value || (value.companyName !== null && typeof value.companyName !== 'string')) throw new ClockerPhotoError('UNAVAILABLE');
    return { companyName: value.companyName, policy: value.policy === null ? unconfiguredPhotoPolicy() : publicPhotoPolicy(value.policy),
      profile: value.profile === null ? unconfiguredPhotoNoticeProfile() : publicPhotoNoticeProfile(value.profile) };
  }
  punchNoticeContext(proof: ClockerIdentityProof) { return this.noticeContext(this.authority.punch(proof), proof.device.workspaceId); }
  managementNoticeContext(proof: PhotoManagementProof) { return this.noticeContext(this.authority.management(proof, 'read'), proof.workspaceId); }
  async saveNoticeProfile(proof: PhotoManagementProof, update: PhotoNoticeProfileUpdate): Promise<PhotoNoticeProfile> {
    const value = await this.guarded<unknown>(this.authority.management(proof, 'settings'),
      sql('SELECT clocker_photo_save_notice($1,$2,$3,$4,$5) AS value', [proof.workspaceId, proof.employeeId, update.expectedVersion,
        update.assistanceContact, update.assistanceInstructions]));
    return publicPhotoNoticeProfile(value);
  }
  listPhotos(proof: PhotoManagementProof, query: PhotoReviewQuery): Promise<PhotoReviewPage> {
    const cursor = query.cursor;
    return this.guarded(this.authority.management(proof, 'read'), sql(`WITH selected AS (
      SELECT p.* FROM clocker_punch_photos p JOIN employees actor ON actor.id=$2 JOIN locations actor_home ON actor_home.id=actor.primary_location_id AND actor_home.workspace_id=p.workspace_id AND actor.role='OWNER'
      WHERE p.workspace_id=$1 AND p.state<>'not_required' AND ($4::timestamptz IS NULL OR (p.performed_at,p.device_id,p.command_id)<($4::timestamptz,$5::text,$6::uuid))
      ORDER BY p.performed_at DESC,p.device_id DESC,p.command_id DESC LIMIT $3
    ), projected AS (
      SELECT ${reviewProjection} AS value,p.performed_at,p.device_id,p.command_id FROM selected p
      JOIN employees e ON e.id=p.employee_id JOIN locations employee_home ON employee_home.id=e.primary_location_id AND employee_home.workspace_id=p.workspace_id
      JOIN locations l ON l.workspace_id=p.workspace_id AND l.id=p.location_id JOIN workspaces w ON w.id=p.workspace_id
    ), recorded AS (
      INSERT INTO clocker_photo_review_events(workspace_id,actor_employee_id,kind,result_count)
      SELECT $1,$2,'LIST',count(*) FROM projected RETURNING id
    ) SELECT jsonb_build_object('records',COALESCE((SELECT jsonb_agg(value ORDER BY performed_at DESC,device_id DESC,command_id DESC) FROM projected),'[]'::jsonb),
      'total',(SELECT count(*) FROM clocker_punch_photos WHERE workspace_id=$1 AND state<>'not_required'),
      'nextCursor',CASE WHEN (SELECT count(*) FROM projected)=$3 THEN (SELECT jsonb_build_object('performedAt',performed_at,'deviceId',device_id,'commandId',command_id)
        FROM projected ORDER BY performed_at,device_id,command_id LIMIT 1) ELSE NULL END) AS value WHERE EXISTS(SELECT 1 FROM recorded)`,
      [proof.workspaceId, proof.employeeId, query.limit, cursor?.performedAt ?? null, cursor?.deviceId ?? null, cursor?.commandId ?? null]));
  }
  photoDetail(proof: PhotoManagementProof, reference: PhotoReference): Promise<PhotoReviewRecord | null> {
    return this.guarded(this.authority.management(proof, 'read'), sql(`WITH projected AS (
      SELECT ${reviewProjection} AS value FROM clocker_punch_photos p
      JOIN employees actor ON actor.id=$2 JOIN locations actor_home ON actor_home.id=actor.primary_location_id AND actor_home.workspace_id=p.workspace_id AND actor.role='OWNER'
      JOIN employees e ON e.id=p.employee_id JOIN locations employee_home ON employee_home.id=e.primary_location_id AND employee_home.workspace_id=p.workspace_id JOIN locations l ON l.workspace_id=p.workspace_id AND l.id=p.location_id
      JOIN workspaces w ON w.id=p.workspace_id WHERE p.workspace_id=$1 AND p.device_id=$3 AND p.command_id=$4::uuid
    ), recorded AS (
      INSERT INTO clocker_photo_review_events(workspace_id,actor_employee_id,kind,result_count)
      SELECT $1,$2,'DETAIL',count(*) FROM projected RETURNING id
    ) SELECT (SELECT value FROM projected) AS value WHERE EXISTS(SELECT 1 FROM recorded)`,
      [proof.workspaceId, proof.employeeId, reference.deviceId, reference.commandId]));
  }
  removePhoto(proof: PhotoManagementProof, reference: PhotoReference): Promise<PhotoRemovalResult> {
    return this.guarded(this.authority.management(proof, 'read'), sql('SELECT clocker_photo_remove($1,$2,$3,$4::uuid) AS value',
      [proof.workspaceId, proof.employeeId, reference.deviceId, reference.commandId]));
  }
  async readPrivatePhoto(proof: PhotoManagementProof, reference: { deviceId: string; commandId: string }, locationKey?: string): Promise<Uint8Array | null> {
    const value = await this.guarded<string | null>(this.authority.management(proof, 'read'), sql(`WITH permitted AS (
      SELECT p.* FROM clocker_punch_photos p JOIN employees actor ON actor.id=$2 JOIN locations actor_home ON actor_home.id=actor.primary_location_id AND actor_home.workspace_id=p.workspace_id
      JOIN locations location ON location.workspace_id=p.workspace_id AND location.id=p.location_id
      WHERE p.workspace_id=$1 AND p.device_id=$3 AND p.command_id=$4::uuid AND p.state='stored' AND p.expires_at>clock_timestamp()
      AND ($5::text IS NULL OR location.clocker_key=$5)
      AND actor.role='OWNER'
    ), recorded AS (
      INSERT INTO clocker_photo_access_events(workspace_id,actor_employee_id,device_id,command_id,kind)
      SELECT workspace_id,$2,device_id,command_id,'VIEWED' FROM permitted RETURNING command_id
    ) SELECT (SELECT encode(jpeg,'hex') FROM permitted WHERE EXISTS(SELECT 1 FROM recorded)) AS value`,
    [proof.workspaceId, proof.employeeId, reference.deviceId, reference.commandId, locationKey ?? null]));
    if (value === null) return null;
    if (typeof value !== 'string' || value.length > 1_048_576 || value.length % 2 || !/^[a-f0-9]+$/.test(value)) throw new ClockerPhotoError('UNAVAILABLE');
    return new Uint8Array(Buffer.from(value, 'hex'));
  }
  cleanupExpired(proof: PhotoManagementProof, limit: number): Promise<number> {
    return this.guarded(this.authority.management(proof, 'cleanup'), sql(`WITH selected AS (
      SELECT workspace_id,device_id,command_id FROM clocker_punch_photos WHERE workspace_id=$1 AND expires_at<=clock_timestamp()
      AND state NOT IN ('expired','not_required','removed') ORDER BY expires_at,device_id,command_id LIMIT $3 FOR UPDATE SKIP LOCKED
    ), removed AS (
      UPDATE clocker_punch_photos p SET state='expired',jpeg=NULL,sha256=NULL,width=NULL,height=NULL
      FROM selected s WHERE p.workspace_id=s.workspace_id AND p.device_id=s.device_id AND p.command_id=s.command_id RETURNING p.*
    ), recorded AS (
      INSERT INTO clocker_photo_access_events(workspace_id,actor_employee_id,device_id,command_id,kind)
      SELECT workspace_id,$2,device_id,command_id,'RETENTION_REMOVED' FROM removed RETURNING command_id
    ) SELECT count(*)::integer AS value FROM recorded`, [proof.workspaceId, proof.employeeId, limit]));
  }
  cleanupOrphans(proof: PhotoManagementProof, limit: number): Promise<number> {
    return this.guarded(this.authority.management(proof, 'cleanup'), sql(`WITH selected AS (
      SELECT workspace_id,device_id,command_id FROM clocker_punch_photos WHERE workspace_id=$1 AND state='pending'
      AND upload_deadline<=clock_timestamp() AND expires_at>clock_timestamp() ORDER BY upload_deadline,device_id,command_id LIMIT $3 FOR UPDATE SKIP LOCKED
    ), finalized AS (
      UPDATE clocker_punch_photos p SET state='missing',failure_code='UPLOAD_FAILED' FROM selected s
      WHERE p.workspace_id=s.workspace_id AND p.device_id=s.device_id AND p.command_id=s.command_id RETURNING p.*
    ), recorded AS (
      INSERT INTO clocker_photo_access_events(workspace_id,actor_employee_id,device_id,command_id,kind)
      SELECT workspace_id,$2,device_id,command_id,'ORPHAN_FINALIZED' FROM finalized RETURNING command_id
    ) SELECT count(*)::integer AS value FROM recorded`, [proof.workspaceId, proof.employeeId, limit]));
  }
}
