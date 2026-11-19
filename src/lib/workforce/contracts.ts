import { isValidIsoDate } from '../date-utils';
import { workforcePermissionValues, type WorkforcePermission } from './permissions';

export type WorkforceCommand =
  | { kind: 'PERMISSION'; operationId: string; employeeId: string; locationId: string; permission: WorkforcePermission; granted: boolean; expectedRevision: number }
  | { kind: 'PLANNING_CALENDAR'; operationId: string; startsOn: number; expectedRevision: number }
  | { kind: 'PTO_POLICY'; operationId: string; code: string; label: string; enabled: boolean; fullDayMinutes: number;
      earnedMinutesPer100Hours: number; carryoverCapMinutes: number; expectedRevision: number }
  | { kind: 'PTO_POST'; operationId: string; employeeId: string; policyCode: string; expectedPolicyRevision: number;
      effectiveDate: string; entryKind: 'OPENING' | 'EARNED' | 'CARRYOVER' | 'ADJUSTMENT'; quantity: number; sourceReference: string | null; note: string };

export type WorkforceReceipt = { kind: WorkforceCommand['kind']; operationId: string; revision?: number;
  policyId?: string; entryId?: string; minutes?: number; balanceMinutes?: number };

export const isWorkforceId = (value: unknown): value is string =>
  typeof value === 'string' && value.length > 0 && value.length <= 200
  && value.trim() === value && !/[\p{Cc}\p{Cf}]/u.test(value);

export const isWorkforceUuid = (value: unknown): value is string =>
  typeof value === 'string' && /^[a-f0-9]{8}-(?:[a-f0-9]{4}-){3}[a-f0-9]{12}$/i.test(value);

const integer = (value: unknown, min: number, max: number): value is number =>
  typeof value === 'number' && Number.isSafeInteger(value) && value >= min && value <= max;

const policyCode = (value: unknown): value is string => typeof value === 'string' && /^[A-Z][A-Z0-9_]{0,31}$/.test(value);
const description = (value: unknown, length: number): value is string =>
  typeof value === 'string' && value.trim().length > 0 && value.length <= length && !/[\p{Cc}\p{Cf}]/u.test(value);

export function parseWorkforceCommand(input: unknown): WorkforceCommand | null {
  if (typeof input !== 'object' || !input || Array.isArray(input)) return null;
  const v = input as Record<string, unknown>;
  if (!isWorkforceUuid(v.operationId)) return null;
  const operationId = v.operationId.toLowerCase();
  const exact = (...keys: string[]) => Object.keys(v).length === keys.length + 2 && keys.every(key => Object.hasOwn(v, key));
  const expected = v.expectedRevision;
  switch (v.kind) {
    case 'PERMISSION':
      return exact('employeeId','locationId','permission','granted','expectedRevision')
        && isWorkforceId(v.employeeId) && isWorkforceId(v.locationId)
        && workforcePermissionValues.includes(v.permission as WorkforcePermission) && typeof v.granted === 'boolean'
        && integer(expected, 0, 2147483646)
        ? { kind:v.kind, operationId, employeeId:v.employeeId, locationId:v.locationId,
          permission:v.permission as WorkforcePermission, granted:v.granted, expectedRevision:expected } : null;
    case 'PLANNING_CALENDAR':
      return exact('startsOn','expectedRevision') && integer(v.startsOn, 0, 6) && integer(expected, 0, 2147483646)
        ? { kind:v.kind, operationId, startsOn:v.startsOn, expectedRevision:expected } : null;
    case 'PTO_POLICY':
      return exact('code','label','enabled','fullDayMinutes','earnedMinutesPer100Hours','carryoverCapMinutes','expectedRevision')
        && policyCode(v.code) && description(v.label, 80) && typeof v.enabled === 'boolean'
        && integer(v.fullDayMinutes, 1, 1440) && integer(v.earnedMinutesPer100Hours, 0, 6000)
        && integer(v.carryoverCapMinutes, 0, 525600) && integer(expected, 0, 2147483646)
        ? { kind:v.kind, operationId, code:v.code, label:v.label.trim(), enabled:v.enabled, fullDayMinutes:v.fullDayMinutes,
          earnedMinutesPer100Hours:v.earnedMinutesPer100Hours, carryoverCapMinutes:v.carryoverCapMinutes, expectedRevision:expected } : null;
    case 'PTO_POST': {
      const entryKind = v.entryKind;
      const supported = entryKind === 'OPENING' || entryKind === 'EARNED' || entryKind === 'CARRYOVER' || entryKind === 'ADJUSTMENT';
      const quantity = v.quantity;
      return supported && exact('employeeId','policyCode','expectedPolicyRevision','effectiveDate','entryKind','quantity','sourceReference','note')
        && isWorkforceId(v.employeeId) && policyCode(v.policyCode) && integer(v.expectedPolicyRevision, 1, 2147483647)
        && typeof v.effectiveDate === 'string' && isValidIsoDate(v.effectiveDate) && v.effectiveDate >= '1900-01-01'
        && integer(quantity, entryKind === 'ADJUSTMENT' ? -525600 : 0, 525600)
        && (entryKind !== 'EARNED' || quantity > 0) && (entryKind !== 'ADJUSTMENT' || quantity !== 0)
        && (entryKind !== 'CARRYOVER' || quantity === 0 && v.effectiveDate.endsWith('-01-01'))
        && (entryKind === 'EARNED' ? isWorkforceId(v.sourceReference) : v.sourceReference === null)
        && description(v.note, 500)
        ? { kind:v.kind, operationId, employeeId:v.employeeId, policyCode:v.policyCode, expectedPolicyRevision:v.expectedPolicyRevision,
          effectiveDate:v.effectiveDate, entryKind, quantity, sourceReference:v.sourceReference as string | null, note:v.note.trim() } : null;
    }
    default: return null;
  }
}
