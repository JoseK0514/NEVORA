'use server';
import { requireRoles } from '@/lib/auth/permissions';
import { requireSessionMutationProof } from '@/lib/auth/session';
import { headers } from 'next/headers';
import { clockerOriginFailure, clockerSecurity } from '@/lib/clocker/setup.server';
import { getClockerPhotoSettingsRuntime } from '@/lib/clocker/photo-server/runtime.server';
import { ClockerPhotoError, type PhotoReference, type PhotoReviewQuery } from '@/lib/clocker/photo-server/contracts';
import type { PhotoActionError, PhotoReviewListActionResult, PhotoReviewDetailActionResult, PhotoReviewRemoveActionResult } from '@/lib/clocker/photo-server/settings-types';
import { readPageLang } from '@/lib/i18n/page-lang.server';
import { serverMessage } from '@/lib/i18n/server-messages';
import { SETTINGS_ACTIONS_COPY } from '../../../actions-copy';

const unavailable = async (): Promise<PhotoActionError> => ({ state: 'unavailable', message: SETTINGS_ACTIONS_COPY[await readPageLang()].reviewUnconfirmed });
async function failed(error: unknown): Promise<PhotoActionError> {
  return error instanceof ClockerPhotoError && error.code !== 'UNAVAILABLE'
    ? { state: 'rejected', code: error.code, message: serverMessage(await readPageLang(), error.message) } : unavailable();
}
export async function listClockerPunchPhotosAction(query: PhotoReviewQuery): Promise<PhotoReviewListActionResult> {
  await requireRoles(['OWNER']);
  const session = await requireSessionMutationProof();
  if (session.employee.role !== 'OWNER') return { state: 'rejected', code: 'AUTH_REQUIRED', message: SETTINGS_ACTIONS_COPY[await readPageLang()].reviewOwnerOnly };
  try {
    const runtime = await getClockerPhotoSettingsRuntime();
    if (!runtime || !runtime.settingsTransport.enabled) return await unavailable();
    const proof = await runtime.portalProof(session);
    return { state: 'available', page: await runtime.settingsTransport.service.listPhotos(proof, query) };
  } catch (error) { return await failed(error); }
}
export async function readClockerPunchPhotoDetailAction(reference: PhotoReference): Promise<PhotoReviewDetailActionResult> {
  await requireRoles(['OWNER']);
  const session = await requireSessionMutationProof();
  if (session.employee.role !== 'OWNER') return { state: 'rejected', code: 'AUTH_REQUIRED', message: SETTINGS_ACTIONS_COPY[await readPageLang()].reviewOwnerOnly };
  try {
    const runtime = await getClockerPhotoSettingsRuntime();
    if (!runtime || !runtime.settingsTransport.enabled) return await unavailable();
    const proof = await runtime.portalProof(session);
    return { state: 'available', record: await runtime.settingsTransport.service.photoDetail(proof, reference) };
  } catch (error) { return await failed(error); }
}
export async function removeClockerPunchPhotoAction(reference: PhotoReference): Promise<PhotoReviewRemoveActionResult> {
  await requireRoles(['OWNER']);
  const session = await requireSessionMutationProof();
  if (session.employee.role !== 'OWNER') return { state: 'rejected', code: 'AUTH_REQUIRED', message: SETTINGS_ACTIONS_COPY[await readPageLang()].removeOwnerOnly };
  const originError = clockerOriginFailure(await headers(), await clockerSecurity());
  if (originError) return { state: 'rejected', message: serverMessage(await readPageLang(), originError.error), code: 'ORIGIN_REJECTED' };
  try {
    const runtime = await getClockerPhotoSettingsRuntime();
    if (!runtime || !runtime.settingsTransport.enabled) return await unavailable();
    const proof = await runtime.portalProof(session);
    return { state: 'available', result: await runtime.settingsTransport.service.removePhoto(proof, reference) };
  } catch (error) { return await failed(error); }
}
