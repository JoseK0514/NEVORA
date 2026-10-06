// Server-side semantic metadata. UI modules may import the types only.
import { createHash } from 'node:crypto';
import { weekStartFor } from '../date-utils';
import { businessDateStart, shiftPeriod, timeMinutes, type ShiftPeriodInput } from './periods';

export type GenerationScope = { workspaceId: string; timeZone: string; weekStart: string; locationId: string };
export type StaffingBasis = { requiredStaff: number; positions: { positionId: string; quantity: number }[] };
export type GenerationNeed = {
  kind: 'POSITION' | 'STAFFING' | 'LEAD'; positionId?: string;
  needStart: string; needEnd: string; configuredCapacity: number; staffingBasis?: StaffingBasis;
};
export type GenerationClaim = GenerationNeed & { needKey: string; coveredStart: string; coveredEnd: string; quantity: 1 };
export type GenerationClaims = { version: 1; claims: GenerationClaim[] };
export const MAX_GENERATION_CLAIMS = 256;
export const MAX_GENERATION_CLAIMS_BYTES = 65536;
function fail(): never { throw new Error('Invalid generation claims.'); }
function record(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return fail();
  return value as Record<string, unknown>;
}
function identifier(value: unknown): string {
  if (typeof value !== 'string' || !value.trim() || value.length > 256) return fail();
  return value;
}
function positive(value: unknown): number {
  if (typeof value !== 'number' || !Number.isSafeInteger(value) || value <= 0) return fail();
  return value;
}
export function canonicalCivilMinute(value: unknown): string {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(value)) return fail();
  const minutes = businessDateStart(value.slice(0,10)) + timeMinutes(value.slice(11), true);
  return new Date(minutes * 60000).toISOString().slice(0,16);
}
export function validateGenerationScope(value: GenerationScope): GenerationScope {
  identifier(value.workspaceId); identifier(value.locationId); identifier(value.timeZone);
  new Intl.DateTimeFormat('en', { timeZone: value.timeZone });
  businessDateStart(value.weekStart);
  if (weekStartFor(value.weekStart) !== value.weekStart) return fail();
  return value;
}
function normalizedNeed(value: unknown): GenerationNeed {
  const n = record(value);
  if (!['POSITION','STAFFING','LEAD'].includes(String(n.kind))) return fail();
  const kind = n.kind as GenerationNeed['kind'];
  const needStart = canonicalCivilMinute(n.needStart), needEnd = canonicalCivilMinute(n.needEnd);
  if (needStart >= needEnd) return fail();
  const configuredCapacity = positive(n.configuredCapacity);
  const positionId = kind === 'POSITION' ? identifier(n.positionId) : undefined;
  if (kind !== 'POSITION' && n.positionId != null) return fail();
  let staffingBasis: StaffingBasis | undefined;
  if (kind === 'STAFFING') {
    const b = record(n.staffingBasis);
    if (!Array.isArray(b.positions) || b.positions.length > 256) return fail();
    const positions = b.positions.map(value => {
      const p = record(value); return {positionId:identifier(p.positionId),quantity:positive(p.quantity)};
    }).sort((a,b) => a.positionId < b.positionId ? -1 : a.positionId > b.positionId ? 1 : 0);
    if (new Set(positions.map(p=>p.positionId)).size !== positions.length) return fail();
    staffingBasis = {requiredStaff:positive(b.requiredStaff),positions};
    if (staffingBasis.requiredStaff - positions.reduce((sum,p)=>sum+p.quantity,0) !== configuredCapacity) return fail();
  } else if (n.staffingBasis != null) return fail();
  return {kind,...(positionId ? {positionId} : {}),needStart,needEnd,configuredCapacity,...(staffingBasis ? {staffingBasis} : {})};
}
export function generationNeedKey(scope: GenerationScope, need: GenerationNeed): string {
  validateGenerationScope(scope);
  const n = normalizedNeed(need);
  return 'v1:' + createHash('sha256').update(JSON.stringify([
    1,scope.workspaceId,scope.timeZone,scope.weekStart,scope.locationId,n.kind,n.positionId ?? null,
    n.needStart,n.needEnd,n.configuredCapacity,n.staffingBasis ?? null,
  ])).digest('hex');
}
export function validateGenerationClaims(value: unknown, scope: GenerationScope, parent: ShiftPeriodInput & {positionId?:string|null;isDesignatedLead?:boolean}): GenerationClaims {
  validateGenerationScope(scope);
  if (Buffer.byteLength(JSON.stringify(value) ?? '', 'utf8') > MAX_GENERATION_CLAIMS_BYTES) return fail();
  const envelope = record(value);
  if (envelope.version !== 1 || !Array.isArray(envelope.claims) || !envelope.claims.length || envelope.claims.length > MAX_GENERATION_CLAIMS) return fail();
  const period = shiftPeriod(parent);
  const parentStart = new Date(period.start * 60000).toISOString().slice(0,16), parentEnd = new Date(period.end * 60000).toISOString().slice(0,16);
  const claims = envelope.claims.map(value => {
    const c = record(value), need = normalizedNeed(c);
    if (need.kind === 'POSITION' && need.positionId !== parent.positionId) return fail();
    if (need.kind === 'LEAD' && parent.isDesignatedLead !== true) return fail();
    const needKey = generationNeedKey(scope,need);
    if (c.quantity !== 1 || c.needKey !== needKey) return fail();
    const coveredStart = canonicalCivilMinute(c.coveredStart), coveredEnd = canonicalCivilMinute(c.coveredEnd);
    if (coveredStart >= coveredEnd || coveredStart < need.needStart || coveredEnd > need.needEnd || coveredStart < parentStart || coveredEnd > parentEnd) return fail();
    return {...need,needKey,coveredStart,coveredEnd,quantity:1 as const};
  }).sort((a,b)=> a.needKey < b.needKey ? -1 : a.needKey > b.needKey ? 1 : a.coveredStart < b.coveredStart ? -1 : a.coveredStart > b.coveredStart ? 1 : 0);
  const canonical: GenerationClaim[] = [];
  for (const claim of claims) {
    const previous = canonical.at(-1);
    if (previous?.needKey === claim.needKey) {
      if (previous.coveredEnd > claim.coveredStart) return fail();
      if (previous.coveredEnd === claim.coveredStart) { previous.coveredEnd = claim.coveredEnd; continue; }
    }
    canonical.push(claim);
  }
  const result: GenerationClaims = {version:1,claims:canonical};
  if (Buffer.byteLength(JSON.stringify(result),'utf8') > MAX_GENERATION_CLAIMS_BYTES) return fail();
  return result;
}
