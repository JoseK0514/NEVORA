export type FacePolicy = {version: number; enabled: boolean; available: boolean; alertsEnabled: boolean};
export type FaceEnrollment = {
  employeeId: string;
  revision: number;
  state: 'none' | 'requested' | 'captured' | 'active' | 'removed' | 'expired';
  expiresAt: string | null;
  canCapture: boolean;
  verificationActive: boolean;
  notice?: {version: number; en: string; es: string; retentionDays: number};
};

export type FaceOwnerCommand =
  | {operation: 'policy'}
  | {operation: 'save'; expectedVersion: number; enabled: boolean}
  | {operation: 'enrollment' | 'view'; employeeId: string}
  | {operation: 'request' | 'approve' | 'remove'; employeeId: string; expectedVersion: number};

export type FaceEmployeeCommand =
  | {operation: 'self'}
  | {operation: 'withdraw'; expectedVersion: number}
  | {operation: 'capture'; expectedVersion: number; noticeVersion: number; bytes: Uint8Array};

export type FaceWorkerOutcome = 'match' | 'mismatch' | 'inconclusive' | 'retry';

export class FaceVerificationError extends Error {
  constructor(readonly code: 'INVALID_INPUT' | 'ACCESS_DENIED' | 'CONFLICT' | 'UNAVAILABLE') {
    super(code);
  }
}

export function faceVersion(value: unknown): value is number {
  return typeof value === 'number' && Number.isSafeInteger(value) && value >= 0 && value < 2147483647;
}

export function faceEmployeeId(value: unknown): value is string {
  return typeof value === 'string' && /^[A-Za-z0-9_.:-]{1,128}$/.test(value);
}

export const FACE_ALERT_TITLE = 'Punch photo needs review';
export const FACE_ALERT_EVENT = 'CLOCKER_FACE_REVIEW';
