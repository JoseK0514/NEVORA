import 'server-only';
import { randomUUID } from 'node:crypto';
import type { SqlExecutor, SqlStatement } from '../notifications/types';
import type { Workspace } from '../domain';
import { workspaceReadGuard } from '../data/workspaces';
import { clockerDeviceWriteGuards, type ClockerDeviceWriteProof } from './devices.server';
import { statement as s, pinBatch, pinKeyGuard } from './pin-authority.server';
export type PinReservation = { attemptId: string; windows: { scope: string; scopeId: string; failureWindow: string }[] };
const lock = (workspaceId:string) => s("SELECT pg_advisory_xact_lock(hashtextextended('clocker-pin-budget:'||$1::text,0))",[workspaceId]);
/** Atomically spend workspace/device rate and failure budgets before expensive hash
 * work. Even a limited attempt invalidates the prior tablet identity/latest attempt;
 * only a confirmed verification releases failure credit in the captured window. */
export async function reservePinAttempt(device:ClockerDeviceWriteProof,workspace:Workspace,key:Buffer,executor:SqlExecutor):Promise<PinReservation|null>{
 const attemptId=randomUUID();
 const rows=await pinBatch(executor,[
  ...workspaceReadGuard(workspace),...clockerDeviceWriteGuards(device),pinKeyGuard(workspace.id,key),lock(workspace.id),
  s("INSERT INTO clocker_pin_limits(scope,scope_id) VALUES('WORKSPACE',$1),('DEVICE',$2) ON CONFLICT DO NOTHING",[workspace.id,device.deviceId]),
  s(`UPDATE clocker_pin_limits SET
    failures=CASE WHEN failure_window<=clock_timestamp()-interval '5 minutes' THEN 0 ELSE failures END,
    failure_window=CASE WHEN failure_window<=clock_timestamp()-interval '5 minutes' THEN clock_timestamp() ELSE failure_window END,
    attempts=CASE WHEN attempt_window<=clock_timestamp()-interval '1 minute' THEN 0 ELSE attempts END,
    attempt_window=CASE WHEN attempt_window<=clock_timestamp()-interval '1 minute' THEN clock_timestamp() ELSE attempt_window END
    WHERE (scope='WORKSPACE' AND scope_id=$1) OR (scope='DEVICE' AND scope_id=$2)`,[workspace.id,device.deviceId]),
  // A new verification intent invalidates an earlier employee on this tablet.
  s('DELETE FROM clocker_pin_sessions WHERE device_id=$1',[device.deviceId]),
  s("UPDATE clocker_pin_limits SET latest_attempt=$2 WHERE scope='DEVICE' AND scope_id=$1",[device.deviceId,attemptId]),
  s(`UPDATE clocker_pin_limits SET failures=failures+1,attempts=attempts+1
    WHERE ((scope='WORKSPACE' AND scope_id=$1) OR (scope='DEVICE' AND scope_id=$2))
    AND NOT EXISTS(SELECT 1 FROM clocker_pin_limits x
      WHERE (x.scope='WORKSPACE' AND x.scope_id=$1 AND (x.failures>=20 OR x.attempts>=240))
       OR (x.scope='DEVICE' AND x.scope_id=$2 AND (x.failures>=5 OR x.attempts>=60)))
    RETURNING scope,scope_id AS "scopeId",failure_window::text AS "failureWindow"`,[workspace.id,device.deviceId]),
 ]);
 const windows=rows.at(-1) as PinReservation['windows'];
 return windows.length===2 ? {attemptId,windows} : null;
}
/** Only a confirmed successful check releases its own reservation in the same window. */
export function releasePinReservation(workspaceId:string,reservation:PinReservation):SqlStatement[]{
 return [lock(workspaceId),...reservation.windows.map(row=>s(`UPDATE clocker_pin_limits SET failures=GREATEST(0,failures-1)
   WHERE scope=$1 AND scope_id=$2 AND failure_window::text=$3`,[row.scope,row.scopeId,row.failureWindow]))];
}
