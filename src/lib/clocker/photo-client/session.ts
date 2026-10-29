import { parsePunchCommand } from '../punch-command';
import { parseReceiptReply, type PendingPunch } from '../punch-client';
import type { PunchCommand, PunchReceipt } from '../punch-types';
import { PHOTO_ACTIONS, PHOTO_MAX_BYTES, PHOTO_MAX_DIMENSION, PHOTO_UPLOAD_WINDOW_SECONDS,
  type PhotoCommand, type PhotoFailure, type PhotoFailureCode, type PhotoNotice, type PhotoPolicy, type PhotoStatus } from '../photo-server/contracts';
import { parsePhotoNotice } from '../photo-server/validation';
import { CameraError, PunchCamera, type CameraErrorCode, type CapturedPhoto } from './camera';

export type PhotoTransport = {
  upload(command: PhotoCommand, image: Blob, signal: AbortSignal): Promise<unknown>;
  status(command: PhotoCommand, signal: AbortSignal): Promise<unknown>;
  reportMissing(command: PhotoFailure, signal: AbortSignal): Promise<unknown>;
};
export type PhotoBindings = {
  /** The inherited recovery intent must be saved and read back before HTTP. */
  preserveIntent(intent: PendingPunch): void | Promise<void>;
  /** Reassert original identity, policy and notice; supplied by the application. */
  verifyContext?(signal: AbortSignal): Promise<void>;
  /** Execute only this exact original command using the existing punch transport. */
  commitExactPunch(command: PunchCommand, signal: AbortSignal): Promise<unknown>;
  /** retry_allowed may be returned only after inherited state/receipt recovery rules. */
  readExactPunch(command: PunchCommand, signal: AbortSignal): Promise<unknown>;
  transport: PhotoTransport;
};
export type PhotoSessionContext = {
  intent: PendingPunch;
  policy: PhotoPolicy;
  /** Effective current-company notice; missing or stale values disable capture. */
  notice?: PhotoNotice | null;
  proofExpiresAt: string;
  /** Original shared PIN screen deadline; it must not restart for a photo task. */
  screenExpiresAt: string;
  /** Original PIN-screen monotonic deadline in this same document. */
  screenMonotonicExpiresAt?: number;
  /** False unless the environment's applicable photo-collection authority is met. */
  captureAuthorized: boolean;
};
export type PhotoPhase = 'setup_required' | 'ready' | 'camera_starting' | 'camera_live' | 'photo_review' | 'camera_error' |
  'intent_unavailable' | 'punch_sending' | 'punch_unknown' | 'punch_retry_allowed' | 'photo_saving' | 'photo_unknown' |
  'complete' | 'expired' | 'cancelled';
export type PhotoSessionView = {
  phase: PhotoPhase;
  commandId: string;
  action: PunchCommand['action'];
  requiresPhoto: boolean;
  fallbackAllowed: boolean;
  previewUrl: string | null;
  cameraError: CameraErrorCode | null;
  receipt: PunchReceipt | null;
  photoStatus: PhotoStatus | null;
  notice: PhotoNotice | null;
  /** Detached effective policy used for this original command and its notice. */
  policy: PhotoPolicy;
  /** False only when no original punch request has been launched. */
  submissionStarted: boolean;
};
export type PhotoEnvironment = {
  camera: Pick<PunchCamera, 'open' | 'capture' | 'close'>;
  createObjectURL(image: Blob): string;
  revokeObjectURL(url: string): void;
};
const object = (value: unknown): value is Record<string, unknown> => !!value && typeof value === 'object' && !Array.isArray(value);
const stamp = (value: unknown): value is string => typeof value === 'string' && /^\d{4}-\d\d-\d\dT/.test(value) && Number.isFinite(Date.parse(value));

export function readPhotoPolicy(value: unknown): PhotoPolicy {
  if (!object(value) || !Number.isInteger(value.version) || Number(value.version) < 0 || Number(value.version) > 2147483646 ||
    typeof value.enabled !== 'boolean' || !Array.isArray(value.events) || value.events.length > 4 ||
    value.events.some(action => !PHOTO_ACTIONS.includes(action)) || new Set(value.events).size !== value.events.length ||
    !(value.retentionDays === null || Number.isInteger(value.retentionDays) && Number(value.retentionDays) >= 1 && Number(value.retentionDays) <= 30) ||
    !(value.failureBehavior === null || value.failureBehavior === 'ALLOW_WITH_EXCEPTION') ||
    value.captureMaxBytes !== PHOTO_MAX_BYTES || value.captureMaxDimension !== PHOTO_MAX_DIMENSION ||
    value.uploadWindowSeconds !== PHOTO_UPLOAD_WINDOW_SECONDS) throw Error('Photo settings could not be verified.');
  return { version: Number(value.version), enabled: value.enabled, events: [...value.events],
    retentionDays: value.retentionDays as number | null, failureBehavior: value.failureBehavior,
    captureMaxBytes: PHOTO_MAX_BYTES, captureMaxDimension: PHOTO_MAX_DIMENSION, uploadWindowSeconds: PHOTO_UPLOAD_WINDOW_SECONDS };
}
export function readPhotoConfiguration(value:unknown):{policy:PhotoPolicy;notice:PhotoNotice|null} {
  if(!object(value)||!('policy' in value))throw Error('Photo settings could not be verified.');
  const policy=readPhotoPolicy(value.policy);
  return {policy,notice:parsePhotoNotice(value.notice,policy)};
}
export function readPhotoStatus(value: unknown, commandId: string): PhotoStatus {
  if (!object(value) || value.commandId !== commandId || !['not_required','pending','stored','missing','expired','removed','unknown'].includes(String(value.state)) ||
      value.policyVersion !== undefined && (!Number.isInteger(value.policyVersion) || Number(value.policyVersion) < 0) ||
      value.profileVersion !== undefined && (!Number.isInteger(value.profileVersion) || Number(value.profileVersion) < 0) ||
      value.uploadDeadline !== undefined && !stamp(value.uploadDeadline) || value.expiresAt !== undefined && !stamp(value.expiresAt) ||
      value.code !== undefined && !['CAMERA_DENIED','CAMERA_UNAVAILABLE','CAPTURE_FAILED','UPLOAD_FAILED','EMPLOYEE_CHANGED','PHOTO_ALTERNATIVE'].includes(String(value.code)))
    throw Error('The original photo result could not be verified.');
  // Do not retain arbitrary server fields, storage URLs, images or identity data.
  return { commandId, state: value.state as PhotoStatus['state'],
    ...(value.policyVersion !== undefined ? { policyVersion: Number(value.policyVersion) } : {}),
    ...(value.profileVersion !== undefined ? { profileVersion: Number(value.profileVersion) } : {}),
    ...(value.uploadDeadline !== undefined ? { uploadDeadline: value.uploadDeadline as string } : {}),
    ...(value.expiresAt !== undefined ? { expiresAt: value.expiresAt as string } : {}),
    ...(value.code !== undefined ? { code: value.code as PhotoFailureCode } : {}) };
}

/** Per-person, per-command ephemeral evidence. No storage, logs or automatic retries. */
export class PunchPhotoSession {
  private readonly intent: PendingPunch;
  private readonly policy: PhotoPolicy;
  private readonly env: PhotoEnvironment;
  private readonly deadline: number;
  private readonly monotonicDeadline: number;
  private readonly listeners = new Set<() => void>();
  private deadlineTimer: ReturnType<typeof setTimeout> | null = null;
  private operation: AbortController | null = null;
  private image: CapturedPhoto | null = null;
  private generation = 0;
  private disposed = false;
  private missingCode: PhotoFailureCode | null = null;
  private view: PhotoSessionView;
  constructor(context: PhotoSessionContext, private readonly bindings: PhotoBindings, environment?: PhotoEnvironment) {
    if (!/^[a-f0-9]{64}$/.test(context.intent.subject) || !stamp(context.proofExpiresAt) || !stamp(context.screenExpiresAt)) throw Error('Tablet proof could not be verified.');
    // Parse and freeze a detached original command; caller mutations cannot move the image.
    const command = parsePunchCommand(context.intent.command);
    this.intent = { subject: context.intent.subject, command: {
      ...command, expected: { ...command.expected }, ...(command.breakType ? { breakType: { ...command.breakType } } : {}),
    } };
    Object.freeze(this.intent.command.expected); if (this.intent.command.breakType) Object.freeze(this.intent.command.breakType);
    Object.freeze(this.intent.command); Object.freeze(this.intent);
    this.policy = readPhotoPolicy(context.policy);
    Object.freeze(this.policy.events); Object.freeze(this.policy);
    this.env = environment ?? { camera: new PunchCamera(), createObjectURL: image => URL.createObjectURL(image), revokeObjectURL: url => URL.revokeObjectURL(url) };
    const wallNow=Date.now(),monotonicNow=performance.now();
    if(context.screenMonotonicExpiresAt!==undefined&&!Number.isFinite(context.screenMonotonicExpiresAt))throw Error('Tablet timing could not be verified.');
    const budget=Math.max(0,Math.min(25000,Date.parse(context.proofExpiresAt)-wallNow,Date.parse(context.screenExpiresAt)-wallNow,(context.screenMonotonicExpiresAt??Infinity)-monotonicNow));
    this.deadline=wallNow+budget;this.monotonicDeadline=monotonicNow+budget;
    const requiresPhoto = this.policy.enabled && this.policy.events.includes(command.action);
    const parsedNotice = parsePhotoNotice(context.notice, this.policy);
    const notice = parsedNotice ? Object.freeze(parsedNotice) : null;
    const configured = !requiresPhoto || context.captureAuthorized && this.policy.retentionDays !== null && this.policy.failureBehavior !== null && notice !== null;
    this.view = { phase: this.deadline <= Date.now() ? 'expired' : configured ? 'ready' : 'setup_required', commandId: command.commandId,
      action: command.action, requiresPhoto, fallbackAllowed: requiresPhoto && this.policy.failureBehavior === 'ALLOW_WITH_EXCEPTION',
      previewUrl: null, cameraError: null, receipt: null, photoStatus: null, notice, policy:this.policy, submissionStarted:false };
  }
  getSnapshot = (): PhotoSessionView => this.view;
  subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener);
    if (this.deadlineTimer === null && !this.disposed && !['expired','cancelled','complete'].includes(this.view.phase)) {
      this.deadlineTimer = setTimeout(() => this.expire(), Math.max(0, this.remaining()));
    }
    return () => { this.listeners.delete(listener); };
  };
  private change(patch: Partial<PhotoSessionView>): void {
    this.view = { ...this.view, ...patch }; this.listeners.forEach(listener => listener());
  }
  private remaining():number{return Math.max(0,Math.min(this.deadline-Date.now(),this.monotonicDeadline-performance.now()));}
  private active(allowAlternative = false): boolean {
    if (this.disposed || ['expired','cancelled','complete'].includes(this.view.phase) || this.view.phase === 'setup_required' && !allowAlternative) return false;
    if (this.remaining() <= 0) { this.expire(); return false; } return true;
  }
  private clearImage(): void {
    if (this.view.previewUrl) this.env.revokeObjectURL(this.view.previewUrl);
    this.image = null; this.view = { ...this.view, previewUrl: null };
  }
  private clearResources(): void {
    ++this.generation; this.operation?.abort(); this.operation = null; this.env.camera.close(); this.clearImage();
    if (this.deadlineTimer !== null) clearTimeout(this.deadlineTimer); this.deadlineTimer = null;
  }
  private expire(): void { if (this.disposed || ['complete','cancelled'].includes(this.view.phase)) return; this.clearResources(); this.change({ phase: 'expired' }); }
  cancel(): void { if (this.disposed) return; this.clearResources(); this.change({ phase: 'cancelled' }); }
  dispose(): void { this.disposed = true; this.clearResources(); this.listeners.clear(); }
  private async bounded<T>(work: (signal: AbortSignal) => Promise<T>): Promise<T> {
    const controller = new AbortController(); this.operation = controller;
    let timer!: ReturnType<typeof setTimeout>;
    const stopped = new Promise<never>((_, reject) => {
      controller.signal.addEventListener('abort', () => reject(Error('The current operation needs checking.')), { once: true });
      timer = setTimeout(() => controller.abort(), Math.max(1, Math.min(8000, this.remaining())));
    });
    try { return await Promise.race([work(controller.signal), stopped]); }
    finally { clearTimeout(timer); if (this.operation === controller) this.operation = null; }
  }
  async checkContext(): Promise<boolean> {
    if (!this.active()) return false;
    try { await this.bindings.verifyContext?.(AbortSignal.timeout(Math.max(1,Math.min(5000,this.remaining())))); return this.active(); }
    catch { this.cancel(); return false; }
  }
  async open(video: HTMLVideoElement): Promise<void> {
    if (!this.active() || !this.view.requiresPhoto || !['ready','camera_error','photo_review'].includes(this.view.phase)) return;
    this.clearImage(); const generation = this.generation; this.change({ phase: 'camera_starting', cameraError: null });
    try {
      if (!await this.checkContext() || generation !== this.generation) return;
      await this.bounded(signal => this.env.camera.open(video, signal, Math.min(8000, this.remaining())));
      if (generation === this.generation && await this.checkContext()) this.change({ phase: 'camera_live' });
      else this.env.camera.close();
    } catch (error) {
      if (generation === this.generation && this.active()) this.change({ phase: 'camera_error', cameraError: error instanceof CameraError ? error.code : 'CAMERA_UNAVAILABLE' });
    }
  }
  async capture(): Promise<void> {
    if (!this.active() || this.view.phase !== 'camera_live') return;
    const generation = this.generation; this.change({ phase: 'camera_starting' });
    try {
      if (!await this.checkContext() || generation !== this.generation) return;
      const image = await this.bounded(() => this.env.camera.capture());
      this.env.camera.close();
      if (!await this.checkContext()) return;
      if (generation !== this.generation || !this.active()) return;
      this.image = image; this.change({ phase: 'photo_review', previewUrl: this.env.createObjectURL(image.blob) });
    } catch (error) {
      this.env.camera.close();
      if (generation === this.generation && this.active()) this.change({ phase: 'camera_error', cameraError: error instanceof CameraError ? error.code : 'CAPTURE_FAILED' });
    }
  }
  async submitWithoutPhoto(): Promise<void> {
    if (!this.active(true) || !this.view.fallbackAllowed || !['ready','camera_live','photo_review','camera_error','setup_required'].includes(this.view.phase)) return;
    this.missingCode = this.view.phase === 'camera_error'
      ? this.view.cameraError === 'CAMERA_DENIED' ? 'CAMERA_DENIED' : this.view.cameraError === 'CAPTURE_FAILED' ? 'CAPTURE_FAILED' : 'CAMERA_UNAVAILABLE'
      : 'PHOTO_ALTERNATIVE';
    // Explicit no-camera choice discards a live or captured image before HTTP.
    ++this.generation; this.operation?.abort(); this.operation = null; this.env.camera.close(); this.clearImage();
    await this.sendPunch();
  }
  async submit(): Promise<void> {
    if (!this.active() || !(this.view.phase === 'punch_retry_allowed' || this.view.phase === 'photo_review' && this.image ||
      this.view.phase === 'ready' && !this.view.requiresPhoto || this.view.phase === 'intent_unavailable' && (this.image || this.missingCode || !this.view.requiresPhoto))) return;
    await this.sendPunch();
  }
  private async sendPunch(): Promise<void> {
    const generation = this.generation;
    this.change({phase:'punch_sending'});
    try { await this.bindings.preserveIntent(this.intent); }
    catch { this.change({ phase: 'intent_unavailable' }); return; }
    if (generation !== this.generation || !this.active(true)) return;
    this.change({ phase: 'punch_sending', submissionStarted:true });
    try {
      const reply = await this.bounded(signal => this.bindings.commitExactPunch(this.intent.command, signal));
      if (generation !== this.generation || !this.active()) return;
      const receipt = parseReceiptReply(reply, this.intent.command); this.change({ receipt }); await this.savePhoto();
    } catch {
      if (generation === this.generation && this.active()) this.change({ phase: this.view.receipt ? 'photo_unknown' : 'punch_unknown' });
    }
  }
  async checkPunch(): Promise<void> {
    if (!this.active() || !['punch_unknown','punch_retry_allowed'].includes(this.view.phase)) return;
    const generation = this.generation; this.change({ phase: 'punch_sending' });
    try {
      const reply = await this.bounded(signal => this.bindings.readExactPunch(this.intent.command, signal));
      if (generation !== this.generation || !this.active()) return;
      if (object(reply) && reply.state === 'retry_allowed') { this.change({ phase: 'punch_retry_allowed' }); return; }
      if (object(reply) && reply.state === 'obsolete') { this.expire(); return; }
      const receipt = parseReceiptReply(reply, this.intent.command); this.change({ receipt }); await this.savePhoto();
    } catch { if (generation === this.generation && this.active()) this.change({ phase: 'punch_unknown' }); }
  }
  private metadata(): PhotoCommand { return { commandId: this.intent.command.commandId, verificationId: this.intent.command.verificationId }; }
  private acceptStatus(value: unknown): void {
    const photoStatus = readPhotoStatus(value, this.intent.command.commandId);
    const complete = ['stored','missing','not_required','expired','removed'].includes(photoStatus.state);
    if (complete) this.clearResources();
    this.change({ phase: complete ? 'complete' : 'photo_unknown', photoStatus });
  }
  private async savePhoto(): Promise<void> {
    if (!this.view.receipt || !this.active()) return;
    const generation = this.generation; this.change({ phase: 'photo_saving' });
    try {
      const image = this.image;
      const reply = !this.view.requiresPhoto ? await this.bounded(signal => this.bindings.transport.status(this.metadata(), signal))
        : image ? await this.bounded(signal => this.bindings.transport.upload(this.metadata(), image.blob, signal))
        : this.missingCode ? await this.bounded(signal => this.bindings.transport.reportMissing({ ...this.metadata(), code: this.missingCode! }, signal)) : null;
      if (generation === this.generation && this.active()) this.acceptStatus(reply);
    } catch { if (generation === this.generation && this.active()) this.change({ phase: 'photo_unknown' }); }
  }
  async checkPhoto(): Promise<void> {
    if (!this.active() || this.view.phase !== 'photo_unknown' || !this.view.receipt) return;
    const generation = this.generation; this.change({ phase: 'photo_saving' });
    try {
      const result = await this.bounded(signal => this.bindings.transport.status(this.metadata(), signal));
      if (generation === this.generation && this.active()) this.acceptStatus(result);
    } catch { if (generation === this.generation && this.active()) this.change({ phase: 'photo_unknown' }); }
  }
  async retryPhoto(): Promise<void> {
    if (!this.active() || this.view.phase !== 'photo_unknown' || this.view.photoStatus?.state !== 'pending' || !this.view.receipt || !this.image) return;
    await this.savePhoto();
  }
}
