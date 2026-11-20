import 'server-only';
import type {SqlExecutor, SqlStatement} from '../../notifications/types';
import type {ClockerIdentityProof} from '../pin-identity.server';
import {PHOTO_MAX_BYTES, type PhotoCommand} from '../photo-server/contracts';
import {decodePunchJpeg} from '../photo-server/decode';
import type {PhotoManagementProof} from '../photo-server/service';
import type {PhotoAuthorityBinder} from '../photo-server/sql-repository';
import type {PhotoPlatformBinding} from '../photo-server/platform-lifecycle';
import {FaceVerificationError, type FaceEmployeeCommand, type FaceEnrollment, type FaceOwnerCommand, type FacePolicy} from './contracts';
import {openFaceBytes, sealFaceBytes} from './crypto.server';
import {faceAlertId, faceAlertReferenceSql} from './alerts.server';

type OwnerValue = FacePolicy | FaceEnrollment | Uint8Array | null;
type FaceScope = Pick<PhotoPlatformBinding, 'workspaceId' | 'projectId' | 'branchId'>;

export class ClockerFaceVerification {
  constructor(private readonly executor: SqlExecutor, private readonly authority: PhotoAuthorityBinder,
    private readonly scope: FaceScope, private readonly key: Buffer) {}

  private async perform<T>(guards: ReturnType<PhotoAuthorityBinder['punch']>, actor: string, operation: string,
    employee: string | null, revision?: number, enabled?: boolean, notice?: number, reference?: string): Promise<T> {
    const statement: SqlStatement = {
      text: 'SELECT clocker_face_account($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) AS value',
      values: [this.scope.workspaceId, actor, this.scope.projectId, this.scope.branchId,
        operation, employee, revision ?? null, enabled ?? null, notice ?? null, reference ?? null],
    };
    try {
      if (!guards.before.length || !guards.after.length) throw new FaceVerificationError('ACCESS_DENIED');
      const rows = await this.executor.transaction([...guards.before, statement, ...guards.after]);
      const result = rows[guards.before.length]?.[0] as {value: T} | undefined;
      if (!result || !Object.hasOwn(result, 'value')) throw new FaceVerificationError('UNAVAILABLE');
      await this.executor.transaction([...guards.before, ...guards.after]);
      return result.value;
    } catch (error) {
      if (error instanceof FaceVerificationError) throw error;
      const message = error instanceof Error ? error.message : '';
      if (message.includes('clocker_face_CONFLICT')) throw new FaceVerificationError('CONFLICT');
      if (message.includes('clocker_face_ACCESS_DENIED') || /AUTH_REQUIRED|IDENTITY_INVALID/.test(message)) throw new FaceVerificationError('ACCESS_DENIED');
      throw new FaceVerificationError('UNAVAILABLE');
    }
  }

  async owner(proof: PhotoManagementProof, command: FaceOwnerCommand): Promise<OwnerValue> {
    if (proof.workspaceId !== this.scope.workspaceId || proof.ownerAccess?.proof.employee.role !== 'OWNER') throw new FaceVerificationError('ACCESS_DENIED');
    const {operation} = command;
    const guard = this.authority.management(proof, operation === 'policy' || operation === 'enrollment' || operation === 'view' ? 'read' : 'settings');
    if (command.operation === 'view') {
      const result = await this.perform<{revision: number; ciphertext: string} | null>(guard, proof.employeeId, operation, command.employeeId);
      if (!result) return null;
      const current = await this.executor.transaction([...guard.before, {
        text: `SELECT 1 FROM clocker_face_enrollments e JOIN clocker_face_platform f USING(workspace_id)
          WHERE e.workspace_id=$1 AND e.employee_id=$2 AND e.revision=$3 AND e.notice_version=f.notice_version
            AND e.state IN ('captured','active') AND e.expires_at>clock_timestamp() AND f.project_id=$4 AND f.branch_id=$5`,
        values: [proof.workspaceId, command.employeeId, result.revision, this.scope.projectId, this.scope.branchId],
      }, ...guard.after]);
      return current[guard.before.length]?.length
        ? openFaceBytes(this.key, result.ciphertext, {workspaceId: proof.workspaceId,
          employeeId: command.employeeId, revision: result.revision, purpose: 'reference'}, PHOTO_MAX_BYTES)
        : null;
    }
    return this.perform<FacePolicy | FaceEnrollment>(guard, proof.employeeId, operation,
      'employeeId' in command ? command.employeeId : null,
      'expectedVersion' in command ? command.expectedVersion : undefined,
      'enabled' in command ? command.enabled : undefined);
  }

  async alertReference(proof: PhotoManagementProof, id: string, read = false) {
    const notificationId = faceAlertId(id);
    if (!notificationId || proof.workspaceId !== this.scope.workspaceId || proof.ownerAccess?.proof.employee.role !== 'OWNER') return null;
    const guard = this.authority.management(proof, 'read');
    if (!guard.before.length || !guard.after.length) return null;
    const sql = faceAlertReferenceSql(this.scope.workspaceId, proof.employeeId, notificationId, read);
    const rows = await this.executor.transaction([...guard.before, sql, ...guard.after]);
    const reference = rows[guard.before.length]?.[0] as {deviceId: string; commandId: string} | undefined;
    if (!reference) return null;
    await this.executor.transaction([...guard.before, ...guard.after]);
    return reference;
  }

  async skipPunch(proof: ClockerIdentityProof, command: PhotoCommand) {
    if (proof.device.workspaceId !== this.scope.workspaceId) throw new FaceVerificationError('ACCESS_DENIED');
    try {
      const guard = this.authority.punch(proof, command);
      const rows = await this.executor.transaction([...guard.before, {
        text: 'SELECT clocker_face_skip($1,$2,$3,$4::uuid) AS skipped',
        values: [proof.device.workspaceId, proof.employeeId, proof.device.deviceId, command.commandId],
      }, ...guard.after]);
      const result = rows[guard.before.length]?.[0] as {skipped?: boolean} | undefined;
      if (!result?.skipped) throw new FaceVerificationError('CONFLICT');
      return {skipped: true};
    } catch (error) {
      if (error instanceof FaceVerificationError) throw error;
      const message = error instanceof Error ? error.message : '';
      if (/CONTEXT_CHANGED|AUTH_REQUIRED|ACCESS_DENIED|IDENTITY_INVALID/.test(message)) throw new FaceVerificationError('ACCESS_DENIED');
      throw new FaceVerificationError('UNAVAILABLE');
    }
  }

  async employee(proof: ClockerIdentityProof, command: FaceEmployeeCommand): Promise<FaceEnrollment> {
    if (proof.device.workspaceId !== this.scope.workspaceId) throw new FaceVerificationError('ACCESS_DENIED');
    const guard = this.authority.punch(proof);
    if (command.operation !== 'capture') return this.perform(guard, proof.employeeId, command.operation, null,
      'expectedVersion' in command ? command.expectedVersion : undefined);

    // Recheck the notice and enrollment before decoding a reference. The
    // guarded mutation repeats these checks after decoding and encryption.
    const current = await this.perform<FaceEnrollment>(guard, proof.employeeId, 'self', null);
    if (!current.canCapture || command.expectedVersion !== current.revision || command.noticeVersion !== current.notice?.version) {
      throw new FaceVerificationError('CONFLICT');
    }
    let photo: Awaited<ReturnType<typeof decodePunchJpeg>>;
    try {
      photo = await decodePunchJpeg(command.bytes, 'image/jpeg');
    } catch {
      throw new FaceVerificationError('INVALID_INPUT');
    }
    try {
      const reference = sealFaceBytes(this.key, photo.bytes, {workspaceId: proof.device.workspaceId,
        employeeId: proof.employeeId, revision: command.expectedVersion + 1, purpose: 'reference'});
      return await this.perform(guard, proof.employeeId, 'capture', null, command.expectedVersion,
        undefined, command.noticeVersion, reference);
    } finally {
      photo.bytes.fill(0);
    }
  }
}
