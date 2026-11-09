import { ClockerPhotoError, PHOTO_MAX_BYTES, type PhotoCommand, type PhotoFailure, type PhotoUploadSnapshot } from '../photo-server/contracts';
import type { PhotoTransport } from './session';

export type PhotoFetcher = (input: string, init: RequestInit) => Promise<Response>;
/** Same-origin, private, separate photo endpoint. No identity selectors or public URL. */
export function createClockerPhotoTransport(locationKey: string, request: PhotoFetcher = fetch, snapshot?:PhotoUploadSnapshot|null): PhotoTransport & {
  policy(signal: AbortSignal): Promise<unknown>;
} {
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(locationKey) || locationKey.length > 64 || locationKey.endsWith('\n'))
    throw new ClockerPhotoError('INVALID_INPUT');
  const path = `/api/clocker/${encodeURIComponent(locationKey)}/photos`;
  const uploadSnapshot=snapshot?Object.freeze({...snapshot}):null;
  async function send(body: BodyInit, headers: Record<string,string>, signal: AbortSignal): Promise<unknown> {
    const reply = await request(path, { method: 'POST', credentials: 'same-origin', cache: 'no-store', redirect: 'error',
      headers: { 'X-Nevora-Clocker':'1', ...headers }, body, signal });
    if (!reply.ok) {
      const value: unknown = await reply.json().catch(() => null);
      const code = value && typeof value === 'object' && 'code' in value && typeof value.code === 'string' ? value.code : null;
      throw new ClockerPhotoError(code === 'AUTH_REQUIRED' || code === 'CONTEXT_CHANGED' || code === 'COMMAND_REUSED' ||
        code === 'POLICY_CHANGED' || code === 'INVALID_INPUT' ? code : 'UNAVAILABLE');
    }
    return reply.json();
  }
  const json = (body: object, signal: AbortSignal) => send(JSON.stringify(body), {'Content-Type':'application/json'}, signal);
  return {
    policy: signal => json({operation:'policy'},signal),
    upload: (command: PhotoCommand, image: Blob, signal: AbortSignal) => {
      if (image.type !== 'image/jpeg' || image.size < 1 || image.size > PHOTO_MAX_BYTES) throw new ClockerPhotoError('INVALID_INPUT');
      if(!uploadSnapshot||!Number.isSafeInteger(uploadSnapshot.policyVersion)||uploadSnapshot.policyVersion<0||!Number.isSafeInteger(uploadSnapshot.profileVersion)||uploadSnapshot.profileVersion<1)throw new ClockerPhotoError('UNAVAILABLE');
      return send(image, { 'Content-Type':'image/jpeg','X-Nevora-Photo-Command':command.commandId,
        'X-Nevora-Photo-Verification':command.verificationId,'X-Nevora-Photo-Policy-Version':String(uploadSnapshot.policyVersion),
        'X-Nevora-Photo-Profile-Version':String(uploadSnapshot.profileVersion) },signal);
    },
    status: (command: PhotoCommand, signal: AbortSignal) => json({operation:'status',command},signal),
    reportMissing: (command: PhotoFailure, signal: AbortSignal) => json({operation:'missing',command},signal),
  };
}
