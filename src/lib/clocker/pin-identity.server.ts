import 'server-only';
import { createHash } from 'node:crypto';
import type { SqlExecutor, SqlStatement } from '../notifications/types';
import { neonNotificationExecutor } from '../data/notification-transactions';
import { clockerDeviceWriteGuards, type ClockerDeviceWriteProof } from './devices.server';
import { assertPin, pinBatch, ClockerPinError, statement as s } from './pin-authority.server';
import { pinKeyIdentity } from './pin-crypto.server';
export type ClockerIdentityProof = {
 device:ClockerDeviceWriteProof; employeeId:string; tokenHash:string; pinVersion:number; employeeUpdatedAt:string; keyIdentity:string;
};
export function pinSessionHash(value: unknown):string|null{
 return typeof value==='string'&&/^nev_pin_[a-f0-9]{64}$/.test(value)
  ? createHash('sha256').update('nevora-clocker-identity-v1\0').update(value).digest('hex'):null;
}
/** Current authority is rechecked AFTER all waits, inside the future punch transaction. */
export function clockerIdentityWriteGuards(proof:ClockerIdentityProof):SqlStatement[]{
 return [
  s('SELECT id FROM workspaces WHERE id=$1 FOR SHARE',[proof.device.workspaceId]),
  s('SELECT id FROM employees WHERE id=$1 FOR SHARE',[proof.employeeId]),
  s('SELECT employee_id FROM employee_location_eligibility WHERE employee_id=$1 AND location_id=$2 FOR SHARE',[proof.employeeId,proof.device.locationId]),
  s('SELECT employee_id FROM employee_clocker_pins WHERE employee_id=$1 FOR SHARE',[proof.employeeId]),
  ...clockerDeviceWriteGuards(proof.device),
  s('SELECT device_id FROM clocker_pin_sessions WHERE device_id=$1 FOR SHARE',[proof.device.deviceId]),
  assertPin(`EXISTS(SELECT 1 FROM clocker_pin_sessions ps JOIN employees e ON e.id=ps.employee_id
    JOIN employee_clocker_pins p ON p.employee_id=e.id
    JOIN clocker_pin_configuration c ON c.workspace_id=p.workspace_id
    WHERE ps.device_id=$1 AND ps.token_hash=$2 AND e.id=$3 AND e.active
    AND ps.credential_version=$4 AND ps.pin_version=$5 AND p.version=$5
    AND ps.employee_updated_at=e.updated_at AND e.updated_at::text=$6
    AND ps.expires_at>clock_timestamp() AND p.workspace_id=$7 AND c.key_identity=$8
    AND EXISTS(SELECT 1 FROM employee_location_eligibility WHERE employee_id=e.id AND location_id=$9))`,
    [proof.device.deviceId,proof.tokenHash,proof.employeeId,proof.device.credentialVersion,proof.pinVersion,
     proof.employeeUpdatedAt,proof.device.workspaceId,proof.keyIdentity,proof.device.locationId],'IDENTITY_INVALID'),
 ];
}
export async function readClockerIdentity(device:ClockerDeviceWriteProof,token:string,key:Buffer,executor:SqlExecutor=neonNotificationExecutor()):Promise<{
 firstName:string; expiresAt:string; proof:ClockerIdentityProof;
}|null>{
 const tokenHash=pinSessionHash(token);if(!tokenHash)return null;
 const [record]=await executor.query<{employeeId:string;pinVersion:number;employeeUpdatedAt:string}>({
  text:`SELECT employee_id AS "employeeId",pin_version AS "pinVersion",employee_updated_at::text AS "employeeUpdatedAt"
    FROM clocker_pin_sessions WHERE device_id=$1 AND token_hash=$2`,values:[device.deviceId,tokenHash],
 });
 if(!record)return null;
 const proof:ClockerIdentityProof={...record,device,tokenHash,keyIdentity:pinKeyIdentity(key)};
 try{
  const result=await pinBatch(executor,[...clockerIdentityWriteGuards(proof),
   s('SELECT e.first_name AS "firstName",ps.expires_at::text AS "expiresAt" FROM clocker_pin_sessions ps JOIN employees e ON e.id=ps.employee_id WHERE ps.device_id=$1',[device.deviceId])]);
  const row=result.at(-1)?.[0] as {firstName:string;expiresAt:string}|undefined;
  return row?{...row,expiresAt:new Date(row.expiresAt).toISOString(),proof}:null;
 }catch(error){
  if(error instanceof ClockerPinError&&['IDENTITY_INVALID','UNAVAILABLE'].includes(error.code)){
   // A current credential may have been revoked during an earlier read. Never return old identity.
   if(error.code==='IDENTITY_INVALID')return null;
   // Re-check device state without returning a proof on failure; SQL outage stays an error.
   const rows=await executor.query({text:`SELECT id FROM clocker_devices WHERE id=$1 AND active AND credential_hash=$2 AND credential_version=$3`,values:[device.deviceId,device.credentialHash,device.credentialVersion]});
   if(!rows.length)return null;
  }
  throw error;
 }
}
export async function clearClockerIdentity(device:ClockerDeviceWriteProof,token:string,executor:SqlExecutor=neonNotificationExecutor()):Promise<void>{
 const hash=pinSessionHash(token);
 await pinBatch(executor,[...clockerDeviceWriteGuards(device),
  s(`UPDATE clocker_pin_limits SET latest_attempt=NULL WHERE scope='DEVICE' AND scope_id=$1
    AND ($2::text IS NULL OR EXISTS(SELECT 1 FROM clocker_pin_sessions WHERE device_id=$1 AND token_hash=$2))`,[device.deviceId,hash]),
  s('DELETE FROM clocker_pin_sessions WHERE device_id=$1 AND ($2::text IS NULL OR token_hash=$2)',[device.deviceId,hash]),
 ]);
}
