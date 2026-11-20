import 'server-only';
import {createCipheriv, createDecipheriv, randomBytes} from 'node:crypto';

type FaceContext = {
  workspaceId: string;
  employeeId: string;
  revision: number;
  purpose: 'reference' | 'template';
  model?: string;
};

function associatedData(context: FaceContext) {
  return Buffer.from(JSON.stringify(['clocker-face-v1', context.workspaceId, context.employeeId,
    context.revision, context.purpose, context.model ?? null]));
}

export function readFaceKey(env: Readonly<Record<string, string | undefined>> = process.env) {
  const value = env.NEVORA_CLOCKER_FACE_KEY;
  if (!value || !/^[A-Za-z0-9_-]{43}$/.test(value)) return null;
  const key = Buffer.from(value, 'base64url');
  return key.length === 32 && key.toString('base64url') === value ? key : null;
}

export function sealFaceBytes(key: Buffer, bytes: Uint8Array, context: FaceContext) {
  const nonce = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', key, nonce);
  cipher.setAAD(associatedData(context));
  const sealed = Buffer.concat([nonce, cipher.update(bytes), cipher.final(), cipher.getAuthTag()]);
  return sealed.toString('base64url');
}

export function openFaceBytes(key: Buffer, value: string, context: FaceContext, maxBytes: number) {
  if (typeof value !== 'string' || value.length > Math.ceil((maxBytes + 28) * 4 / 3)) throw Error('face_data_unavailable');
  const sealed = Buffer.from(value, 'base64url');
  if (sealed.length <= 28 || sealed.length > maxBytes + 28 || sealed.toString('base64url') !== value) throw Error('face_data_unavailable');
  const decipher = createDecipheriv('aes-256-gcm', key, sealed.subarray(0, 12));
  decipher.setAAD(associatedData(context));
  decipher.setAuthTag(sealed.subarray(-16));
  const unverified = decipher.update(sealed.subarray(12, -16));
  try {
    return Buffer.concat([unverified, decipher.final()]);
  } finally {
    unverified.fill(0);
  }
}
