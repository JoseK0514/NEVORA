import { Temporal } from '@js-temporal/polyfill';
import type { CorrectionKind } from './validation';

export type CorrectionStatus = 'PENDING' | 'APPROVED' | 'REJECTED';

export type CorrectionDecision = {
  status:'APPROVED'|'REJECTED';
  decidedAt:string;
  startAt:string;
  endAt:string;
  note:string|null;
};
export type CorrectionContext =
  | {state:'confirmed';sourceKind:'RECORDED'|'ADJUSTMENT';startAt:string;endAt:string;totalDecisions:number;decisions:CorrectionDecision[]}
  | {state:'none'|'unavailable'};
export type CorrectionTarget = {
  kind:'ENTRY_BOUNDARY'|'BREAK_BOUNDARY';
  timeEntryId:string;
  breakEntryId:string|null;
  recordedStartAt:string;
  recordedEndAt:string;
  context:CorrectionContext;
};

export type CorrectionLocation = {
  id: string;
  name: string;
};

export type PublicCorrectionItem = {
  id: string;
  kind: CorrectionKind;
  status: CorrectionStatus;
  revision: number;
  currentAdjustmentId?: string | null;
  createdAt: string;
  locationId: string;
  locationName: string;
  originalStartAt: string | null;
  originalEndAt: string | null;
  proposedStartAt: string;
  proposedEndAt: string;
  breakName: string | null;
  reason: string;
  baseChanged:boolean;
  context:CorrectionContext;
};

export type ManagerCorrectionItem = PublicCorrectionItem & {
  employeeName: string;
  isSelf: boolean;
};

export type EmployeeTimeCorrections =
  | {
      state: 'ready';
      authority?: string;
      observedAt: string;
      timeZone: string;
      totalRequests: number;
      locations: CorrectionLocation[];
      requests: PublicCorrectionItem[];
      targets:CorrectionTarget[];
    }
  | { state: 'unavailable'; reason: 'access_denied' | 'read_failed' | 'schema_missing' | 'source_limit' };

export type ManagerTimeCorrections =
  | {
      state: 'ready';
      authority?: string;
      validForMs: number;
      observedAt: string;
      timeZone: string;
      requests: ManagerCorrectionItem[];
    }
  | { state: 'unavailable'; reason: 'access_denied' | 'read_failed' | 'schema_missing' | 'source_limit' };

const object = (value: unknown): value is Record<string, unknown> =>
  Boolean(value) && typeof value === 'object' && !Array.isArray(value);
const text = (value: unknown, max = 300): value is string =>
  typeof value === 'string' &&
  value === value.trim() &&
  value.length > 0 &&
  value.length <= max &&
  !/[\u0000-\u001f\u007f]/.test(value);
const integer = (value: unknown, min = 0): value is number =>
  typeof value === 'number' && Number.isSafeInteger(value) && value >= min;
const uuid = (value: unknown): value is string =>
  typeof value === 'string' &&
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
const instant = (value: unknown): value is string => {
  if (!text(value, 100)) return false;
  try { Temporal.Instant.from(value); return true; } catch { return false; }
};
const zone=(value:unknown):value is string=>{
  if(!text(value,100))return false;
  try{Temporal.Instant.from('2000-01-01T00:00:00Z').toZonedDateTimeISO(value);return true;}catch{return false;}
};
const interval=(start:unknown,end:unknown)=>instant(start)&&instant(end)&&Temporal.Instant.compare(start,end)<0;

function context(value:unknown):CorrectionContext{
  if(!object(value))throw new Error('Invalid correction context');
  if(value.state==='none'||value.state==='unavailable'){
    if(Object.keys(value).length!==1)throw new Error('Invalid correction context');
    return {state:value.state};
  }
  if(value.state!=='confirmed'||!['RECORDED','ADJUSTMENT'].includes(String(value.sourceKind))||
    !interval(value.startAt,value.endAt)||!integer(value.totalDecisions)||value.totalDecisions>10_000||
    !Array.isArray(value.decisions)||value.decisions.length!==Math.min(value.totalDecisions,5))throw new Error('Invalid correction context');
  let last: string|undefined;
  const decisions=value.decisions.map((entry):CorrectionDecision=>{
    if(!object(entry)||!['APPROVED','REJECTED'].includes(String(entry.status))||!instant(entry.decidedAt)||
      !interval(entry.startAt,entry.endAt)||!(entry.note===null||text(entry.note,500))||
      (last&&Temporal.Instant.compare(last,entry.decidedAt)<0))throw new Error('Invalid correction context');
    last=entry.decidedAt;
    return {status:entry.status as CorrectionDecision['status'],decidedAt:entry.decidedAt,startAt:entry.startAt as string,endAt:entry.endAt as string,note:entry.note};
  });
  return {state:'confirmed',sourceKind:value.sourceKind as 'RECORDED'|'ADJUSTMENT',startAt:value.startAt as string,endAt:value.endAt as string,totalDecisions:value.totalDecisions,decisions};
}

function unavailable(value: Record<string, unknown>) {
  return value.state === 'unavailable' &&
    ['access_denied','read_failed','schema_missing','source_limit'].includes(String(value.reason))
    ? { state: 'unavailable' as const, reason: value.reason as Extract<EmployeeTimeCorrections,{state:'unavailable'}>['reason'] }
    : null;
}

function item(value: unknown): PublicCorrectionItem {
  if (!object(value) || !uuid(value.id) ||
      !['ENTRY_BOUNDARY','BREAK_BOUNDARY','MISSING_ENTRY'].includes(String(value.kind)) ||
      !['PENDING','APPROVED','REJECTED'].includes(String(value.status)) ||
      !integer(value.revision, 1) || !instant(value.createdAt) ||
      !text(value.locationId, 200) || !text(value.locationName, 300) ||
      !instant(value.proposedStartAt) || !instant(value.proposedEndAt) ||
      !text(value.reason, 500) || typeof value.baseChanged!=='boolean' ||
      !(value.breakName === null || text(value.breakName, 80)) ||
      !(value.originalStartAt === null || instant(value.originalStartAt)) ||
      !(value.originalEndAt === null || instant(value.originalEndAt))) {
    throw new Error('Invalid correction response');
  }
  if (value.currentAdjustmentId !== undefined && value.currentAdjustmentId !== null &&
      (!uuid(value.currentAdjustmentId) || value.kind !== 'MISSING_ENTRY' || value.status !== 'APPROVED')) {
    throw new Error('Invalid correction response');
  }
  if ((value.originalStartAt === null) !== (value.originalEndAt === null)) {
    throw new Error('Invalid correction response');
  }
  const effective=context(value.context);
  if((value.kind!=='MISSING_ENTRY'&&value.originalStartAt===null)||
    (value.kind!=='MISSING_ENTRY'&&effective.state==='none'))throw new Error('Invalid correction response');
  if (Temporal.Instant.compare(Temporal.Instant.from(value.proposedStartAt), Temporal.Instant.from(value.proposedEndAt)) >= 0) {
    throw new Error('Invalid correction response');
  }
  return {
    id:value.id,
    kind:value.kind as CorrectionKind,
    status:value.status as CorrectionStatus,
    revision:value.revision,
    ...(value.currentAdjustmentId !== undefined ? {currentAdjustmentId:value.currentAdjustmentId as string|null} : {}),
    createdAt:value.createdAt,
    locationId:value.locationId,
    locationName:value.locationName,
    originalStartAt:value.originalStartAt,
    originalEndAt:value.originalEndAt,
    proposedStartAt:value.proposedStartAt,
    proposedEndAt:value.proposedEndAt,
    breakName:value.breakName,
    reason:value.reason,
    baseChanged:value.baseChanged,
    context:effective,
  };
}

export function parseEmployeeTimeCorrections(value: unknown): EmployeeTimeCorrections {
  if (!object(value)) throw new Error('Invalid correction response');
  const failed = unavailable(value);
  if (failed) return failed;
  if (value.state !== 'ready' || !instant(value.observedAt) || !zone(value.timeZone) ||
      !integer(value.totalRequests) || !Array.isArray(value.locations) || value.locations.length > 100 ||
      !Array.isArray(value.requests) || value.requests.length > 50 || value.totalRequests>10_000 || value.totalRequests < value.requests.length ||
      !Array.isArray(value.targets)||value.targets.length>100) {
    throw new Error('Invalid correction response');
  }
  const locations = value.locations.map((entry) => {
    if (!object(entry) || !text(entry.id,200) || !text(entry.name,300)) throw new Error('Invalid correction response');
    return {id:entry.id,name:entry.name};
  });
  if (new Set(locations.map((entry) => entry.id)).size !== locations.length) throw new Error('Invalid correction response');
  const keys=new Set<string>();
  const targets=value.targets.map((entry):CorrectionTarget=>{
    if(!object(entry)||!['ENTRY_BOUNDARY','BREAK_BOUNDARY'].includes(String(entry.kind))||!text(entry.timeEntryId,200)||
      !(entry.breakEntryId===null||text(entry.breakEntryId,200))||
      (entry.kind==='ENTRY_BOUNDARY')!==(entry.breakEntryId===null)||!interval(entry.recordedStartAt,entry.recordedEndAt))throw new Error('Invalid correction target');
    const key=JSON.stringify([entry.timeEntryId,entry.breakEntryId]);
    if(keys.has(key))throw new Error('Invalid correction target');keys.add(key);
    const effective=context(entry.context);
    if(effective.state==='none')throw new Error('Invalid correction target');
    return {kind:entry.kind as CorrectionTarget['kind'],timeEntryId:entry.timeEntryId,breakEntryId:entry.breakEntryId,recordedStartAt:entry.recordedStartAt as string,recordedEndAt:entry.recordedEndAt as string,context:effective};
  });
  return {
    state:'ready',
    ...(typeof value.authority==='string'&&/^[a-f0-9]{64}$/.test(value.authority)?{authority:value.authority}:{}),
    observedAt:value.observedAt,
    timeZone:value.timeZone,
    totalRequests:value.totalRequests,
    locations,
    requests:value.requests.map(item),
    targets,
  };
}

export function parseManagerTimeCorrections(value: unknown): ManagerTimeCorrections {
  if (!object(value)) throw new Error('Invalid correction response');
  const failed = unavailable(value);
  if (failed) return failed;
  if (value.state !== 'ready' || !integer(value.validForMs,1) || value.validForMs>45000 || !instant(value.observedAt) || !zone(value.timeZone) ||
      !Array.isArray(value.requests) || value.requests.length > 100) {
    throw new Error('Invalid correction response');
  }
  const requests = value.requests.map((entry) => {
    if (!object(entry) || !text(entry.employeeName,300) || typeof entry.isSelf !== 'boolean') {
      throw new Error('Invalid correction response');
    }
    return {...item(entry),employeeName:entry.employeeName,isSelf:entry.isSelf};
  });
  return {state:'ready',...(typeof value.authority==='string'&&/^[a-f0-9]{64}$/.test(value.authority)?{authority:value.authority}:{}),validForMs:value.validForMs,observedAt:value.observedAt,timeZone:value.timeZone,requests};
}
