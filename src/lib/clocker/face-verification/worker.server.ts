import 'server-only';
import {randomUUID} from 'node:crypto';
import type {SqlExecutor} from '../../notifications/types';
import {PHOTO_MAX_BYTES} from '../photo-server/contracts';
import type {PhotoPlatformBinding} from '../photo-server/platform-lifecycle';
import type {FaceWorkerOutcome} from './contracts';
import {openFaceBytes, sealFaceBytes} from './crypto.server';

export type FaceMatcher = {
  modelVersion: string;
  compare(input: {punch: Buffer; reference: Buffer | null; template: Buffer | null}):
    Promise<{outcome: Exclude<FaceWorkerOutcome, 'retry'>; template?: Buffer}>;
};

type ClaimedFaceCheck = {employeeId: string; revision: number; reference: string; template: string | null; jpeg: string; queueAgeSeconds: number};
const TEMPLATE_MAX_BYTES = 4096;

export async function runClockerFaceWorker(executor: Pick<SqlExecutor, 'query'>, scope: PhotoPlatformBinding, key: Buffer,
  matcher: FaceMatcher, limit = 20) {
  if (!Number.isSafeInteger(limit) || limit < 1 || limit > 50) throw Error('clocker_face_worker_limit');
  const now = performance.now();
  async function job<T>(operation: 'claim' | 'finish' | 'maintenance', lease: string, outcome?: FaceWorkerOutcome, template?: string) {
    const [row] = await executor.query<{value: T | null}>({
      text: 'SELECT clocker_face_worker($1,$2,$3,$4,$5,$6::uuid,$7,$8) AS value',
      values: [scope.workspaceId, scope.projectId, scope.branchId, matcher.modelVersion, operation, lease,
        outcome ?? null, template ?? null],
    });
    if (!row || !Object.hasOwn(row, 'value')) throw Error('clocker_face_worker_unavailable');
    return row.value;
  }
  const maintenance = await job<{purged: number}>('maintenance', randomUUID());
  const counts = {match: 0, mismatch: 0, inconclusive: 0, skipped: 0, retry: 0, failed: 0};
  let maxQueueAgeSeconds = 0;
  for (let index = 0; index < limit && performance.now() - now < 45_000; index++) {
    const lease = randomUUID(), claim = await job<ClaimedFaceCheck>('claim', lease);
    if (!claim) break;
    maxQueueAgeSeconds = Math.max(maxQueueAgeSeconds, claim.queueAgeSeconds);
    const context = {workspaceId: scope.workspaceId, employeeId: claim.employeeId, revision: claim.revision};
    let punch: Buffer | null = null, reference: Buffer | null = null, template: Buffer | null = null, generated: Buffer | undefined;
    let outcome: FaceWorkerOutcome = 'retry', sealed: string | undefined;
    try {
      if (claim.jpeg.length > PHOTO_MAX_BYTES * 2 || claim.jpeg.length % 2 || !/^[0-9a-f]+$/.test(claim.jpeg)) throw Error();
      punch = Buffer.from(claim.jpeg, 'hex');
      if (claim.template) template = openFaceBytes(key, claim.template,
        {...context, purpose: 'template', model: matcher.modelVersion}, TEMPLATE_MAX_BYTES);
      else reference = openFaceBytes(key, claim.reference, {...context, purpose: 'reference'}, PHOTO_MAX_BYTES);
      const result = await matcher.compare({punch, reference, template});
      generated = result.template;
      if (!['match', 'mismatch', 'inconclusive'].includes(result.outcome)) throw Error();
      if (generated && generated.length > 0 && generated.length <= TEMPLATE_MAX_BYTES) {
        sealed = sealFaceBytes(key, generated, {...context, purpose: 'template', model: matcher.modelVersion});
      }
      outcome = result.outcome;
    } catch {
      // Do not retain adapter errors. They can contain input or runtime details.
    } finally {
      punch?.fill(0);
      reference?.fill(0);
      template?.fill(0);
      generated?.fill(0);
    }
    const result = await job<{state: keyof typeof counts}>('finish', lease, outcome, sealed);
    counts[result?.state ?? 'skipped']++;
  }
  return {purged: maintenance?.purged ?? 0, maxQueueAgeSeconds, ...counts};
}
