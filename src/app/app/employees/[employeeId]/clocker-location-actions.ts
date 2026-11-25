'use server';

import { revalidatePath } from 'next/cache';
import { headers } from 'next/headers';
import { requireSessionMutationProof } from '@/lib/auth/session';
import {
  setClockerLocationAccess, type ClockerLocationAccess,
} from '@/lib/clocker/location-access.server';
import { ClockerPinError } from '@/lib/clocker/pin-authority.server';
import { clockerOriginFailure, clockerSecurity } from '@/lib/clocker/setup.server';

export type ClockerLocationSaveResult = { ok: true; access: ClockerLocationAccess }
  | { ok: false; error: string; refresh: boolean };

export async function saveClockerLocationAccessAction(data: FormData): Promise<ClockerLocationSaveResult> {
  const proof = await requireSessionMutationProof();
  if (proof.employee.role !== 'OWNER') {
    return { ok: false, error: 'Only an Owner may change Clocker location access.', refresh: false };
  }
  const originError = clockerOriginFailure(await headers(), await clockerSecurity());
  if (originError) return { ok: false, error: originError.error, refresh: false };

  const required = ['employeeId', 'mode', 'expectedUpdatedAt'];
  const invalid = { ok: false, error: 'Choose a location access mode and valid active locations.', refresh: false } as const;
  if ([...data.keys()].some(name => !required.includes(name) && name !== 'locationId')
    || required.some(name => data.getAll(name).length !== 1)) return invalid;
  const employeeId = data.get('employeeId'), mode = data.get('mode'), expectedUpdatedAt = data.get('expectedUpdatedAt');
  const locationIds = data.getAll('locationId').filter((value): value is string => typeof value === 'string');
  if (typeof employeeId !== 'string' || typeof expectedUpdatedAt !== 'string'
    || (mode !== 'ASSIGNED' && mode !== 'SELECTED' && mode !== 'ALL')
    || locationIds.length !== data.getAll('locationId').length) return invalid;

  try {
    const access = await setClockerLocationAccess({ employeeId: proof.employee.id, sessionTokenHash: proof.sessionTokenHash },
      { employeeId, mode, locationIds, expectedUpdatedAt });
    try { revalidatePath(`/app/employees/${encodeURIComponent(employeeId)}`); } catch { /* The save has committed. */ }
    return { ok: true, access };
  } catch (error) {
    if (error instanceof ClockerPinError && error.code === 'INVALID') return invalid;
    if (error instanceof ClockerPinError && error.code === 'STALE') {
      return { ok: false, error: 'This employee changed. Reload their profile before saving.', refresh: true };
    }
    return { ok: false, error: 'Clocker location access could not be confirmed. Reload the profile before trying again.', refresh: true };
  }
}
