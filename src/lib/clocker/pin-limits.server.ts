import 'server-only';
import { randomUUID } from 'node:crypto';
import type { SqlExecutor, SqlStatement } from '../notifications/types';
import type { Workspace } from '../domain';
import { workspaceReadGuard } from '../data/workspaces';
import { clockerDeviceWriteGuards, type ClockerDeviceWriteProof } from './devices.server';
import { statement as s, pinBatch, pinKeyGuard, ClockerPinError, assertPin } from './pin-authority.server';
export type PinReservation = { attemptId: string; windows: { scope: string; scopeId: string; failureWindow: string }[] };
export type PinLimitScope='person'|'device'|'workspace';
export type PinLimit={retryAfterSeconds:number;limitScope:PinLimitScope};
const lock = (workspaceId:string) => s("SELECT pg_advisory_xact_lock(hashtextextended('clocker-pin-budget:'||$1::text,0))",[workspaceId]);
/** Atomically spend workspace/device rate and failure budgets before expensive hash
 * work. Even a limited attempt invalidates the prior tablet identity/latest attempt;
 * only a confirmed verification releases failure credit in the captured window. */
export async function reservePinAttempt(device:ClockerDeviceWriteProof,workspace:Workspace,key:Buffer,executor:SqlExecutor,person?:{identified:boolean;employeeId?:string}):Promise<PinReservation|PinLimit>{
 const attemptId=randomUUID();
 const employeeId=person?.employeeId??null,deviceFailures=person?.identified?20:5;
 const scopes="(scope='WORKSPACE' AND scope_id=$1) OR (scope='DEVICE' AND scope_id=$2) OR (scope='PERSON' AND scope_id=$3)";
 const rows=await pinBatch(executor,[
  ...workspaceReadGuard(workspace),lock(workspace.id),...clockerDeviceWriteGuards(device),pinKeyGuard(workspace.id,key),
  s("INSERT INTO clocker_pin_limits(scope,scope_id) VALUES('WORKSPACE',$1),('DEVICE',$2) ON CONFLICT DO NOTHING",[workspace.id,device.deviceId]),
  // Only a current local employee can allocate a person row. Unknown or revoked
  // IDs still spend the bounded device/workspace budgets without a guard error
  // that would roll that spend back. No submitted ID or guessed PIN is a key.
  s(`INSERT INTO clocker_pin_limits(scope,scope_id) SELECT 'PERSON',e.id
    FROM employees e JOIN locations l ON l.id=e.primary_location_id
    WHERE e.id=$1 AND e.active
    AND (CASE WHEN to_jsonb(e) ? 'workspace_id' THEN to_jsonb(e)->>'workspace_id' ELSE l.workspace_id END)=$2
    ON CONFLICT DO NOTHING`,[employeeId,workspace.id]),
  s(`UPDATE clocker_pin_limits SET
    failures=CASE WHEN failure_window<=clock_timestamp()-interval '5 minutes' THEN 0 ELSE failures END,
    failure_window=CASE WHEN failure_window<=clock_timestamp()-interval '5 minutes' THEN clock_timestamp() ELSE failure_window END,
    attempts=CASE WHEN attempt_window<=clock_timestamp()-interval '1 minute' THEN 0 ELSE attempts END,
    attempt_window=CASE WHEN attempt_window<=clock_timestamp()-interval '1 minute' THEN clock_timestamp() ELSE attempt_window END
    WHERE ${scopes}`,[workspace.id,device.deviceId,employeeId]),
  // A new verification intent invalidates an earlier employee on this tablet.
  s('DELETE FROM clocker_pin_sessions WHERE device_id=$1',[device.deviceId]),
  s("UPDATE clocker_pin_limits SET latest_attempt=$2 WHERE scope='DEVICE' AND scope_id=$1",[device.deviceId,attemptId]),
  s(`UPDATE clocker_pin_limits SET failures=failures+1,attempts=attempts+1
    WHERE (${scopes})
    AND NOT EXISTS(SELECT 1 FROM clocker_pin_limits x
      WHERE (x.scope='WORKSPACE' AND x.scope_id=$1 AND (x.failures>=20 OR x.attempts>=240))
       OR (x.scope='DEVICE' AND x.scope_id=$2 AND (x.failures>=$4 OR x.attempts>=60))
       OR (x.scope='PERSON' AND x.scope_id=$3 AND x.failures>=5))
    RETURNING scope,scope_id AS "scopeId",failure_window::text AS "failureWindow"`,[workspace.id,device.deviceId,employeeId,deviceFailures]),
  // The longest exhausted window is the earliest time both budgets can admit
  // another check. Use the database clock under the same workspace lock; neither
  // application clock skew nor another tablet can change this reservation snapshot.
  s(`WITH observed AS MATERIALIZED (SELECT clock_timestamp() AS instant)
    SELECT GREATEST(1,CEIL(EXTRACT(EPOCH FROM (deadline-observed.instant))))::int AS "retryAfterSeconds",lower(scope) AS "limitScope"
    FROM (
      SELECT scope,failure_window+interval '5 minutes' AS deadline FROM clocker_pin_limits
      WHERE (scope='WORKSPACE' AND scope_id=$1 AND failures>=20)
         OR (scope='DEVICE' AND scope_id=$2 AND failures>=$4)
         OR (scope='PERSON' AND scope_id=$3 AND failures>=5)
      UNION ALL
      SELECT scope,attempt_window+interval '1 minute' AS deadline FROM clocker_pin_limits
      WHERE (scope='WORKSPACE' AND scope_id=$1 AND attempts>=240)
         OR (scope='DEVICE' AND scope_id=$2 AND attempts>=60)
    ) exhausted CROSS JOIN observed
    ORDER BY "retryAfterSeconds" DESC,CASE scope WHEN 'WORKSPACE' THEN 0 WHEN 'DEVICE' THEN 1 ELSE 2 END LIMIT 1`,[workspace.id,device.deviceId,employeeId,deviceFailures]),
 ]);
 const windows=rows.at(-2) as PinReservation['windows'];
 if(windows.length===2||windows.length===3)return {attemptId,windows};
 const limited=rows.at(-1)?.[0] as Partial<PinLimit>|undefined;
 const retryAfterSeconds=limited?.retryAfterSeconds,limitScope=limited?.limitScope;
 if(typeof retryAfterSeconds!=='number'||!Number.isSafeInteger(retryAfterSeconds)||retryAfterSeconds<1)throw new ClockerPinError('UNAVAILABLE');
 if(limitScope!=='person'&&limitScope!=='device'&&limitScope!=='workspace')throw new ClockerPinError('UNAVAILABLE');
 return {retryAfterSeconds,limitScope};
}
/** PIN-only rollout traffic cannot issue a grant for a person locked through
 * identified requests, even if its device/workspace windows reset first. Check
 * after taking the SAME workspace lock as reservations and keep it until commit.
 * A denied legacy guess gets the ordinary denial, never a PIN-bucket oracle. */
export function pinCommitGuards(workspaceId:string,legacyEmployeeId?:string):SqlStatement[]{
 // Match reservation lock order BEFORE locking/writing the device session.
 // Otherwise a reservation can hold the budget lock while waiting for a session
 // write whose successful-credit release is itself waiting for the budget lock.
 return [lock(workspaceId),...(legacyEmployeeId===undefined?[]:[assertPin(`NOT EXISTS(SELECT 1 FROM clocker_pin_limits
   WHERE scope='PERSON' AND scope_id=$1 AND failures>=5
   AND failure_window>clock_timestamp()-interval '5 minutes')`,[legacyEmployeeId],'IDENTITY_INVALID')])];
}
/** Only a confirmed successful check releases its own reservation in the same window. */
export function releasePinReservation(workspaceId:string,reservation:PinReservation):SqlStatement[]{
 return [lock(workspaceId),...reservation.windows.map(row=>s(`UPDATE clocker_pin_limits SET failures=GREATEST(0,failures-1)
   WHERE scope=$1 AND scope_id=$2 AND failure_window::text=$3`,[row.scope,row.scopeId,row.failureWindow]))];
}
