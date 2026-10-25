"use server";

import { headers } from 'next/headers';
import { requireSessionMutationProof } from '@/lib/auth/session';
import {
  ClockerDeviceError, registerClockerDevice, renameClockerDevice, revokeClockerDevice, rotateClockerDevice,
} from '@/lib/clocker/devices.server';
import { clockerOriginFailure, clockerSecurity } from '../../../../lib/clocker/setup.server';
import { clockerDeviceView, type ClockerOwnerResult } from '../../../../lib/clocker/views';

const invalid: ClockerOwnerResult = { ok: false, error: 'Check the device details and try again.', refresh: false };
function field(form: FormData, name: string): string {
  const values = form.getAll(name);
  if (values.length !== 1 || typeof values[0] !== 'string') throw Error('invalid');
  return values[0];
}

/**
 * Owner/origin-checked device administration with exact per-operation fields.
 * Mutations use expectedVersion; register/rotate exposes the enrollment secret
 * only in the immediate setup result. If a response is uncertain, refresh device
 * state before another mutation rather than blindly replaying registration.
 */
export async function manageClockerDeviceAction(form: FormData): Promise<ClockerOwnerResult> {
  const session = await requireSessionMutationProof();
  if (session.employee.role !== 'OWNER') {
    return { ok: false, error: 'Only an active Owner may manage Clocker devices.', refresh: false };
  }
  const originError = clockerOriginFailure(await headers(), clockerSecurity());
  if (originError) return { ok: false, error: originError.error, refresh: false };
  const proof = { employeeId: session.employee.id, sessionTokenHash: session.sessionTokenHash };
  let operation: string, name = '', locationId = '', deviceId = '', expectedVersion = 0;
  try {
    operation = field(form, 'operation');
    if (!['REGISTER', 'RENAME', 'ROTATE', 'REVOKE'].includes(operation)) return invalid;
    const allowed = operation === 'REGISTER' ? ['operation', 'name', 'locationId']
      : ['operation', 'deviceId', 'expectedVersion', ...(operation === 'RENAME' ? ['name'] : [])];
    if ([...form.keys()].some(key => !allowed.includes(key))) return invalid;
    if (operation === 'REGISTER' || operation === 'RENAME') name = field(form, 'name');
    if (operation === 'REGISTER') locationId = field(form, 'locationId');
    else {
      deviceId = field(form, 'deviceId');
      const version = field(form, 'expectedVersion');
      if (!/^[1-9]\d{0,9}$/.test(version)) return invalid;
      expectedVersion = Number(version);
    }
  } catch { return invalid; }
  try {
    if (operation === 'REGISTER' || operation === 'ROTATE') {
      const result = operation === 'REGISTER'
        ? await registerClockerDevice(proof, { name, locationId })
        : await rotateClockerDevice(proof, { deviceId, expectedVersion });
      const device = clockerDeviceView(result.device);
      if (!device.enrollmentExpiresAt) throw Error('Missing setup expiration');
      return { ok: true, device, setup: { code: result.enrollmentToken, expiresAt: device.enrollmentExpiresAt } };
    }
    const device = operation === 'RENAME'
      ? await renameClockerDevice(proof, { deviceId, expectedVersion, name })
      : await revokeClockerDevice(proof, { deviceId, expectedVersion });
    return { ok: true, device: clockerDeviceView(device) };
  } catch (error) {
    if (error instanceof ClockerDeviceError && error.code !== 'UNAVAILABLE') {
      return { ok: false, error: error.message, refresh: error.code === 'STALE' || error.code === 'OWNER_REQUIRED' };
    }
    // A failed response may follow a committed mutation. Never invite blind replay.
    return { ok: false, error: 'We could not confirm the update. Refresh Devices before trying again.', refresh: true };
  }
}
