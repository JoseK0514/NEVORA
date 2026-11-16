import type {SqlStatement} from '../notifications/types';

/** A review token is a concurrency expectation, never an authorization grant.
 * Hash inside SQL so exact timestamps, provenance/claims and assignment episodes
 * are represented identically on reads and after lock waits. Never expose rows. */
export const shiftReviewSql = `encode(sha256(convert_to(jsonb_build_array('shift-review-v1',to_jsonb(sh),s.location_id,s.week_start,s.status)::text,'UTF8')),'hex')`;
export class ShiftReviewConflictError extends Error {
  readonly code='SHIFT_REVIEW_CONFLICT';
  constructor(){super('This shift changed since you opened it. Keep your draft and reload the current shift before trying again.');}
}
export function requireShiftReview(version:unknown):string {
  if(typeof version!=='string'||!/^[a-f0-9]{64}$/.test(version))throw new ShiftReviewConflictError();
  return version;
}
export function shiftReviewGuards(shiftId:string,version:string):SqlStatement[] {
  return [{text:'SELECT id FROM shifts WHERE id=$1 ORDER BY id FOR UPDATE',values:[shiftId]}, {text:`SELECT (CASE WHEN EXISTS(SELECT 1 FROM shifts sh JOIN schedules s ON s.id=sh.schedule_id WHERE sh.id=$1 AND ${shiftReviewSql}=$2) THEN '1' ELSE 'shift_review_conflict' END)::integer`,values:[shiftId,version]}];
}
export async function withShiftReviewConflict<T>(work:()=>Promise<T>):Promise<T>{
  try{return await work();}catch(error){
    if(error instanceof Error&&'code'in error&&error.code==='22P02'&&error.message.includes('shift_review_conflict'))throw new ShiftReviewConflictError();
    throw error;
  }
}
