import 'server-only';
import {PHOTO_MAX_BYTES, type PhotoCommand} from '../photo-server/contracts';
import {parsePhotoCommand} from '../photo-server/validation';
import {clockerPhotoRequestPermitted, readBoundedPhotoBody, type PhotoTransportSecurity} from '../photo-server/transport';
import type {ClockerIdentityProof} from '../pin-identity.server';
import type {PhotoManagementProof} from '../photo-server/service';
import {faceEmployeeId, faceVersion, FaceVerificationError, type FaceOwnerCommand} from './contracts';
import type {ClockerFaceVerification} from './service.server';

export const faceResponseHeaders = {'Cache-Control': 'no-store, private', 'Referrer-Policy': 'no-referrer', 'X-Content-Type-Options': 'nosniff'};
export const faceUnavailableResponse = () => Response.json({code: 'UNAVAILABLE'}, {status: 503, headers: faceResponseHeaders});
const mediaType = (request: Request) => request.headers.get('content-type')?.split(';', 1)[0].trim().toLowerCase();

async function readCommand(request: Request) {
  if (mediaType(request) !== 'application/json') throw new FaceVerificationError('INVALID_INPUT');
  try {
    const bytes = await readBoundedPhotoBody(request, 2048);
    const value: unknown = JSON.parse(new TextDecoder('utf-8', {fatal: true}).decode(bytes));
    if (!value || typeof value !== 'object' || Array.isArray(value)) throw Error();
    return value as Record<string, unknown>;
  } catch {
    throw new FaceVerificationError('INVALID_INPUT');
  }
}

function ownerCommand(value: Record<string, unknown>): FaceOwnerCommand {
  const {operation, employeeId, enabled, expectedVersion} = value;
  const fields = Object.keys(value).length;
  if (operation === 'policy' && fields === 1) return {operation};
  if (operation === 'save' && fields === 3 && typeof enabled === 'boolean' && faceVersion(expectedVersion)) return {operation, enabled, expectedVersion};
  if (!faceEmployeeId(employeeId)) throw new FaceVerificationError('INVALID_INPUT');
  if ((operation === 'enrollment' || operation === 'view') && fields === 2) return {operation, employeeId};
  if ((operation === 'request' || operation === 'approve' || operation === 'remove') && fields === 3 && faceVersion(expectedVersion)) {
    return {operation, employeeId, expectedVersion};
  }
  throw new FaceVerificationError('INVALID_INPUT');
}

function failure(error: unknown) {
  const code = error instanceof FaceVerificationError ? error.code : 'UNAVAILABLE';
  const status = {INVALID_INPUT: 400, ACCESS_DENIED: 403, CONFLICT: 409, UNAVAILABLE: 503}[code];
  return Response.json({code}, {status, headers: faceResponseHeaders});
}

export async function handleFaceOwner(request: Request, security: PhotoTransportSecurity, service: ClockerFaceVerification,
  authenticate: () => Promise<PhotoManagementProof | null>) {
  if (!clockerPhotoRequestPermitted(request, security)) return failure(new FaceVerificationError('ACCESS_DENIED'));
  try {
    const proof = await authenticate();
    if (!proof) throw new FaceVerificationError('ACCESS_DENIED');
    const result = await service.owner(proof, ownerCommand(await readCommand(request)));
    if (result instanceof Uint8Array) {
      return new Response(result as BodyInit, {headers: {...faceResponseHeaders, 'Content-Type': 'image/jpeg'}});
    }
    return Response.json(result, {status: result === null ? 404 : 200, headers: faceResponseHeaders});
  } catch (error) {
    return failure(error);
  }
}

export async function handleFaceEmployee(request: Request, security: PhotoTransportSecurity, service: ClockerFaceVerification,
  authenticate: () => Promise<ClockerIdentityProof | null>) {
  if (!clockerPhotoRequestPermitted(request, security)) return failure(new FaceVerificationError('ACCESS_DENIED'));
  try {
    const proof = await authenticate();
    if (!proof) throw new FaceVerificationError('ACCESS_DENIED');
    if (mediaType(request) === 'image/jpeg') {
      const revision = request.headers.get('x-nevora-face-enrollment-version');
      const notice = request.headers.get('x-nevora-face-notice-version');
      if (!revision || !notice || !/^[1-9]\d{0,9}$/.test(revision) || !/^[1-9]\d{0,9}$/.test(notice) ||
        !faceVersion(Number(revision)) || !faceVersion(Number(notice)) || request.headers.get('x-nevora-face-consent') !== '1') {
        throw new FaceVerificationError('INVALID_INPUT');
      }
      let bytes: Uint8Array;
      try { bytes = await readBoundedPhotoBody(request, PHOTO_MAX_BYTES); }
      catch { throw new FaceVerificationError('INVALID_INPUT'); }
      try {
        const result = await service.employee(proof, {operation: 'capture', expectedVersion: Number(revision), noticeVersion: Number(notice), bytes});
        return Response.json(result, {headers: faceResponseHeaders});
      } finally {
        bytes.fill(0);
      }
    }
    const value = await readCommand(request);
    if (value.operation === 'self' && Object.keys(value).length === 1) {
      return Response.json(await service.employee(proof, {operation: 'self'}), {headers: faceResponseHeaders});
    }
    if (value.operation === 'skip' && Object.keys(value).length === 2) {
      let command: PhotoCommand;
      try { command = parsePhotoCommand(value.command); }
      catch { throw new FaceVerificationError('INVALID_INPUT'); }
      return Response.json(await service.skipPunch(proof, command), {headers: faceResponseHeaders});
    }
    if (value.operation === 'withdraw' && Object.keys(value).length === 2 && faceVersion(value.expectedVersion)) {
      return Response.json(await service.employee(proof, {operation: 'withdraw', expectedVersion: value.expectedVersion}), {headers: faceResponseHeaders});
    }
    throw new FaceVerificationError('INVALID_INPUT');
  } catch (error) {
    return failure(error);
  }
}
