'use server';
import { requireRoles } from '@/lib/auth/permissions';
import { requireSessionMutationProof } from '@/lib/auth/session';
import { headers } from 'next/headers';
import { clockerOriginFailure, clockerSecurity } from '@/lib/clocker/setup.server';
import { getClockerPhotoSettingsRuntime } from '@/lib/clocker/photo-server/runtime.server';
import { ClockerPhotoError, type PhotoReference, type PhotoReviewQuery } from '@/lib/clocker/photo-server/contracts';
import type { PhotoActionError, PhotoReviewListActionResult, PhotoReviewDetailActionResult, PhotoReviewRemoveActionResult } from '@/lib/clocker/photo-server/settings-types';

const unavailable = (): PhotoActionError => ({ state: 'unavailable', message: 'The punch photo result could not be confirmed. Reload its protected review before continuing.' });
function failed(error: unknown): PhotoActionError {
  return error instanceof ClockerPhotoError && error.code !== 'UNAVAILABLE'
    ? { state: 'rejected', code: error.code, message: error.message } : unavailable();
}
export async function listClockerPunchPhotosAction(query: PhotoReviewQuery): Promise<PhotoReviewListActionResult> {
  await requireRoles(['OWNER']);
  const session = await requireSessionMutationProof();
  if (session.employee.role !== 'OWNER') return { state: 'rejected', code: 'AUTH_REQUIRED', message: 'Only an active Owner may review punch photos.' };
  try {
    const runtime = getClockerPhotoSettingsRuntime();
    if (!runtime || !runtime.settingsTransport.enabled) return unavailable();
    const proof = await runtime.portalProof(session);
    return { state: 'available', page: await runtime.settingsTransport.service.listPhotos(proof, query) };
  } catch (error) { return failed(error); }
}
export async function readClockerPunchPhotoDetailAction(reference: PhotoReference): Promise<PhotoReviewDetailActionResult> {
  await requireRoles(['OWNER']);
  const session = await requireSessionMutationProof();
  if (session.employee.role !== 'OWNER') return { state: 'rejected', code: 'AUTH_REQUIRED', message: 'Only an active Owner may review punch photos.' };
  try {
    const runtime = getClockerPhotoSettingsRuntime();
    if (!runtime || !runtime.settingsTransport.enabled) return unavailable();
    const proof = await runtime.portalProof(session);
    return { state: 'available', record: await runtime.settingsTransport.service.photoDetail(proof, reference) };
  } catch (error) { return failed(error); }
}
export async function removeClockerPunchPhotoAction(reference: PhotoReference): Promise<PhotoReviewRemoveActionResult> {
  await requireRoles(['OWNER']);
  const session = await requireSessionMutationProof();
  if (session.employee.role !== 'OWNER') return { state: 'rejected', code: 'AUTH_REQUIRED', message: 'Only an active Owner may remove punch photos.' };
  const originError = clockerOriginFailure(await headers(), clockerSecurity());
  if (originError) return { state: 'rejected', message: originError.error, code: 'ORIGIN_REJECTED' };
  try {
    const runtime = getClockerPhotoSettingsRuntime();
    if (!runtime || !runtime.settingsTransport.enabled) return unavailable();
    const proof = await runtime.portalProof(session);
    return { state: 'available', result: await runtime.settingsTransport.service.removePhoto(proof, reference) };
  } catch (error) { return failed(error); }
}
