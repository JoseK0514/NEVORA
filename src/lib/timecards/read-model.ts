import { mealWarningsOf, type MealWarning } from './meal-warnings';
import { projectTimecard, type Period, type Timecard, type TimecardSource } from './project';

export type TimecardHistory = { operationId: string; revision: number; action:'APPROVE'|'FINALIZE'|'REOPEN';
  occurredAt:string; actorName:string; note:string|null; sourceHash:string; snapshot:TimecardSource };
export type TimecardItem = { source:TimecardSource; card:Timecard; sourceHash:string; revision:number;
  state:'DRAFT'|'APPROVED'|'FINALIZED'|'REOPENED'|'NEEDS_REVIEW'; history:TimecardHistory[];
  /** Business P0-3: paid seconds (elapsed minus unpaid breaks) when the server supplies them. Display only. */
  paidSeconds?:number;
  /** Meal-period warnings (no penalty pay) when the server supplies them. Display only. */
  mealWarnings?:MealWarning[] };
export type TimecardProjection = {state:'ready';observedAt:string;period:Period;cards:TimecardItem[]};
export type TimecardsResult = (TimecardProjection & {validForMs:number})|{
  state:'unavailable';reason:'access_denied'|'source_limit'|'read_failed'|'schema_missing'};
const object = (v:unknown):v is Record<string,unknown> => !!v && typeof v === 'object' && !Array.isArray(v);
const uuid = (v:unknown):v is string => typeof v==='string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(v);
const sourceHash = (v:unknown):v is string => typeof v==='string' && /^[a-f0-9]{32}$/.test(v);
const safeText=(v:unknown,max=300):v is string=>typeof v==='string'&&v===v.trim()&&v.length>0&&v.length<=max&&!/[\u0000-\u001f\u007f]/.test(v);

/**
 * Rebuild every card and historical snapshot from validated source, requiring a
 * complete descending revision chain for this period. A partial or mixed-identity
 * response throws rather than presenting incomplete review evidence as ready.
 */
export function parseTimecardsResponse(v:unknown,period:Period):TimecardProjection {
  if(!object(v)||!safeText(v.observedAt,100)||!Array.isArray(v.cards)||v.cards.length>300)throw new Error('Invalid timecards');
  let entries=0,corrections=0;
  const cards=v.cards.map((raw):TimecardItem=>{
    if(!object(raw)||!sourceHash(raw.sourceHash)||!Number.isSafeInteger(raw.revision)||Number(raw.revision)<0||
      !['DRAFT','APPROVED','FINALIZED','REOPENED','NEEDS_REVIEW'].includes(String(raw.state))||!Array.isArray(raw.history)||raw.history.length>100)throw new Error('Invalid card');
    const card=projectTimecard(raw.source,v.observedAt as string);
    if(card.startDate!==period.startDate||card.endDate!==period.endDate)throw new Error('Incorrect period');
    entries+=card.entries.length;corrections+=card.corrections.length;
    if(entries>10000||corrections>10000)throw new Error('Timecard source limit');
    const history=raw.history.map((h):TimecardHistory=>{
      if(!object(h)||!uuid(h.operationId)||!Number.isSafeInteger(h.revision)||Number(h.revision)<1||
        !['APPROVE','FINALIZE','REOPEN'].includes(String(h.action))||!safeText(h.occurredAt,100)||!safeText(h.actorName)||
        !sourceHash(h.sourceHash)||!(h.note===null||safeText(h.note,500)))throw new Error('Invalid history');
      const snapshot=projectTimecard(h.snapshot,h.occurredAt);
      if(snapshot.employeeId!==card.employeeId||snapshot.startDate!==period.startDate||snapshot.endDate!==period.endDate)throw new Error('Incorrect history identity');
      return {operationId:h.operationId,revision:Number(h.revision),action:h.action as TimecardHistory['action'],
        occurredAt:h.occurredAt,actorName:h.actorName,note:h.note,sourceHash:h.sourceHash,snapshot:h.snapshot as TimecardSource};
    });
    if(history.length!==Number(raw.revision)||history.some((h,i)=>h.revision!==Number(raw.revision)-i))throw new Error('Incomplete revision history');
    const paid=raw.paidSeconds;
    if(paid!==undefined&&!(Number.isSafeInteger(paid)&&Number(paid)>=0))throw new Error('Invalid paid time');
    return {source:raw.source as TimecardSource,card,sourceHash:raw.sourceHash,revision:Number(raw.revision),state:raw.state as TimecardItem['state'],history,...(paid===undefined?{}:{paidSeconds:Number(paid)}),...(raw.mealWarnings===undefined?{}:{mealWarnings:mealWarningsOf(raw.mealWarnings)})};
  });
  if(new Set(cards.map(c=>c.card.employeeId)).size!==cards.length)throw new Error('Duplicate timecards');
  return {state:'ready',observedAt:v.observedAt,period,cards};
}

