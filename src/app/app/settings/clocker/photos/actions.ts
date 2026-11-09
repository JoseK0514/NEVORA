'use server';

import { requireRoles } from '@/lib/auth/permissions';
import { requireSessionMutationProof } from '@/lib/auth/session';
import { headers } from 'next/headers';
import { clockerOriginFailure, clockerSecurity } from '@/lib/clocker/setup.server';
import { getClockerPhotoSettingsRuntime } from '@/lib/clocker/photo-server/runtime.server';
import { ClockerPhotoError } from '@/lib/clocker/photo-server/contracts';
import type { PhotoPolicyUpdate, PhotoNoticeProfileUpdate } from '@/lib/clocker/photo-server/contracts';
import type { PhotoSettingsActionResult, PhotoNoticeActionResult, PhotoActionError } from '@/lib/clocker/photo-server/settings-types';

const unavailable = (): PhotoActionError => ({ state: 'unavailable',
  message: 'Photo settings could not be confirmed. Reload settings before trying again.' });
function failed(error: unknown): PhotoActionError {
  if (error instanceof ClockerPhotoError && error.code !== 'UNAVAILABLE') return { state: 'rejected', code: error.code, message: error.message };
  return unavailable();
}
export async function readClockerPhotoNoticeAction(): Promise<PhotoNoticeActionResult> {
  await requireRoles(['OWNER']);
  const session = await requireSessionMutationProof();
  if (session.employee.role !== 'OWNER') return { state: 'rejected', code: 'AUTH_REQUIRED', message: 'Only an active Owner may manage photo settings.' };
  try {
    const runtime = getClockerPhotoSettingsRuntime();
    if (!runtime || !runtime.settingsTransport.enabled) return unavailable();
    const proof = await runtime.portalProof(session);
    return { state: 'available', settings: await runtime.settingsTransport.service.managementNoticeSettings(proof) };
  } catch (error) { return failed(error); }
}
export async function saveClockerPhotoNoticeAction(input: PhotoNoticeProfileUpdate): Promise<PhotoNoticeActionResult> {
  await requireRoles(['OWNER']);
  const session = await requireSessionMutationProof();
  if (session.employee.role !== 'OWNER') return { state: 'rejected', code: 'AUTH_REQUIRED', message: 'Only an active Owner may manage photo settings.' };
  const originError = clockerOriginFailure(await headers(), clockerSecurity());
  if (originError) return { state: 'rejected', message: originError.error, code: 'ORIGIN_REJECTED' };
  try {
    const runtime = getClockerPhotoSettingsRuntime();
    if (!runtime || !runtime.settingsTransport.enabled) return unavailable();
    const proof = await runtime.portalProof(session);
    return { state: 'available', settings: await runtime.settingsTransport.service.saveNoticeProfile(proof, input) };
  } catch (error) { return failed(error); }
}
export async function readClockerPhotoPolicyAction(): Promise<PhotoSettingsActionResult> {
  await requireRoles(['OWNER']);
  const session = await requireSessionMutationProof();
  if (session.employee.role !== 'OWNER') return { state: 'rejected', code: 'AUTH_REQUIRED', message: 'Only an active Owner may manage photo settings.' };
  try {
    const runtime = getClockerPhotoSettingsRuntime();
    if (!runtime || !runtime.settingsTransport.enabled) return unavailable();
    const proof = await runtime.portalProof(session);
    return { state: 'available', policy: await runtime.settingsTransport.service.managementPolicy(proof) };
  } catch (error) { return failed(error); }
}
export async function saveClockerPhotoPolicyAction(input: PhotoPolicyUpdate): Promise<PhotoSettingsActionResult> {
  await requireRoles(['OWNER']);
  const session = await requireSessionMutationProof();
  if (session.employee.role !== 'OWNER') return { state: 'rejected', code: 'AUTH_REQUIRED', message: 'Only an active Owner may manage photo settings.' };
  const originError = clockerOriginFailure(await headers(), clockerSecurity());
  if (originError) return { state: 'rejected', message: originError.error, code: 'ORIGIN_REJECTED' };
  try {
    const runtime = getClockerPhotoSettingsRuntime();
    if (!runtime || !runtime.settingsTransport.enabled) return unavailable();
    const proof = await runtime.portalProof(session);
    return { state: 'available', policy: await runtime.settingsTransport.service.savePolicy(proof, input) };
  } catch (error) { return failed(error); }
}
