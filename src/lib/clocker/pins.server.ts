import 'server-only';
import { randomBytes, randomUUID } from 'node:crypto';
import type { SqlExecutor } from '../notifications/types';
import { neonNotificationExecutor } from '../data/notification-transactions';
import { getWorkspace, workspaceReadGuard } from '../data/workspaces';
import { clockerDeviceWriteGuards, type ClockerDeviceWriteProof, type ClockerOwnerProof } from './devices.server';
import { hashClockerPin, verifyClockerPin, burnUnknownPin, validatePin, pinFingerprint, pinKeyIdentity } from './pin-crypto.server';
import { pinBatch, pinActorGuards, pinActorAssertion, pinKeyGuard, ClockerPinError, assertPin, statement as s } from './pin-authority.server';
import { reservePinAttempt, releasePinReservation } from './pin-limits.server';
import { pinSessionHash } from './pin-identity.server';
export { readClockerIdentity, clearClockerIdentity, clockerIdentityWriteGuards } from './pin-identity.server';
export { ClockerPinError } from './pin-authority.server';
export type EmployeePinView = { employeeId:string; configured:boolean; version:number };
const metadata=(employeeId:string)=>s(`SELECT e.id AS "employeeId",p.employee_id IS NOT NULL AS configured,
  COALESCE(p.version,0) AS version FROM employees e LEFT JOIN employee_clocker_pins p ON p.employee_id=e.id WHERE e.id=$1`,[employeeId]);
export async function readEmployeeClockerPin(proof:ClockerOwnerProof,employeeId:string,executor:SqlExecutor=neonNotificationExecutor()):Promise<EmployeePinView>{
 const workspace=await getWorkspace(executor);
 const result=await pinBatch(executor,[...workspaceReadGuard(workspace),...pinActorGuards(proof,employeeId,workspace.id,false),metadata(employeeId)]);
 const row=result.at(-1)?.[0] as EmployeePinView|undefined;
 if(!row)throw new ClockerPinError('FORBIDDEN');return row;
}
export async function setEmployeeClockerPin(proof:ClockerOwnerProof,input:{employeeId:string;pin:string;expectedVersion:number},key:Buffer,executor:SqlExecutor=neonNotificationExecutor()):Promise<EmployeePinView>{
 try{validatePin(input?.pin);}catch{throw new ClockerPinError('INVALID');}
 if(!Number.isSafeInteger(input.expectedVersion)||input.expectedVersion<0)throw new ClockerPinError('INVALID');
 // Reject unprivileged callers before spending work on the slow hash.
 const current=await readEmployeeClockerPin(proof,input.employeeId,executor);
 if(current.version!==input.expectedVersion)throw new ClockerPinError('STALE');
 const workspace=await getWorkspace(executor);
 const fingerprint=pinFingerprint(input.pin,workspace.id,key);
 const hash=await hashClockerPin(input.pin,workspace.id,input.employeeId,key);
 const result=await pinBatch(executor,[
  ...workspaceReadGuard(workspace),...pinActorGuards(proof,input.employeeId,workspace.id,true),
  s('INSERT INTO clocker_pin_configuration(workspace_id,key_identity) VALUES($1,$2) ON CONFLICT DO NOTHING',[workspace.id,pinKeyIdentity(key)]),
  pinKeyGuard(workspace.id,key),
  assertPin('COALESCE((SELECT version FROM employee_clocker_pins WHERE employee_id=$1),0)=$2',[input.employeeId,input.expectedVersion],'STALE'),
  s(`INSERT INTO employee_clocker_pins(employee_id,workspace_id,lookup_hash,pin_hash,updated_by)
    VALUES($1,$2,$3,$4,$5) ON CONFLICT(employee_id) DO UPDATE SET
    lookup_hash=EXCLUDED.lookup_hash,pin_hash=EXCLUDED.pin_hash,updated_by=EXCLUDED.updated_by,
    updated_at=clock_timestamp(),version=employee_clocker_pins.version+1`,[input.employeeId,workspace.id,fingerprint,hash,proof.employeeId]),
  s('DELETE FROM clocker_pin_sessions WHERE employee_id=$1',[input.employeeId]),
  s('INSERT INTO clocker_pin_events(id,employee_id,actor_employee_id,pin_version) SELECT $1,employee_id,$2,version FROM employee_clocker_pins WHERE employee_id=$3',[randomUUID(),proof.employeeId,input.employeeId]),
  // Roll back the PIN, audit event and identity invalidation if authority expired during a write lock wait.
  pinActorAssertion(proof,input.employeeId,workspace.id,true),
  metadata(input.employeeId),
 ]);
 return result.at(-1)![0] as EmployeePinView;
}
export type PinVerification = {state:'denied'} | {state:'limited';retryAfterSeconds:number} | {state:'verified';token:string;firstName:string;expiresAt:string};
type PinRow={employeeId:string;pinHash:string;version:number;employeeUpdatedAt:string;eligible:boolean};
export async function verifyEmployeeClockerPin(device:ClockerDeviceWriteProof,pin:string,key:Buffer,executor:SqlExecutor=neonNotificationExecutor()):Promise<PinVerification>{
 try{validatePin(pin);}catch{throw new ClockerPinError('INVALID');}
 const workspace=await getWorkspace(executor);
 const fingerprint=pinFingerprint(pin,workspace.id,key);
 const reservation=await reservePinAttempt(device,workspace,key,executor);
 if(!reservation)return {state:'limited',retryAfterSeconds:300};
 const [row]=await executor.query<PinRow>(s(`SELECT p.employee_id AS "employeeId",p.pin_hash AS "pinHash",p.version,
   e.updated_at::text AS "employeeUpdatedAt",e.active AND EXISTS(SELECT 1 FROM employee_location_eligibility
   WHERE employee_id=e.id AND location_id=$3) AS eligible
   FROM employee_clocker_pins p JOIN employees e ON e.id=p.employee_id
   WHERE p.workspace_id=$1 AND p.lookup_hash=$2`,[workspace.id,fingerprint,device.locationId]));
 if(!row){await burnUnknownPin(pin,workspace.id,key);return {state:'denied'};}
 const matches=await verifyClockerPin(pin,workspace.id,row.employeeId,key,row.pinHash);
 if(!matches||!row.eligible)return {state:'denied'};
 const token=`nev_pin_${randomBytes(32).toString('hex')}`;
 try{
  const result=await pinBatch(executor,[
   ...workspaceReadGuard(workspace),
   s('SELECT id FROM employees WHERE id=$1 FOR SHARE',[row.employeeId]),
   s('SELECT employee_id FROM employee_location_eligibility WHERE employee_id=$1 AND location_id=$2 FOR SHARE',[row.employeeId,device.locationId]),
   s('SELECT employee_id FROM employee_clocker_pins WHERE employee_id=$1 FOR SHARE',[row.employeeId]),
   ...clockerDeviceWriteGuards(device),pinKeyGuard(workspace.id,key),
   assertPin(`EXISTS(SELECT 1 FROM employees e JOIN employee_clocker_pins p ON p.employee_id=e.id
     WHERE e.id=$1 AND e.active AND e.updated_at::text=$2 AND p.version=$3 AND p.pin_hash=$4 AND p.workspace_id=$5
     AND EXISTS(SELECT 1 FROM employee_location_eligibility WHERE employee_id=e.id AND location_id=$6))
     AND EXISTS(SELECT 1 FROM clocker_pin_limits WHERE scope='DEVICE' AND scope_id=$7 AND latest_attempt=$8)`,
     [row.employeeId,row.employeeUpdatedAt,row.version,row.pinHash,workspace.id,device.locationId,device.deviceId,reservation.attemptId],'IDENTITY_INVALID'),
   s(`INSERT INTO clocker_pin_sessions(device_id,employee_id,token_hash,pin_version,credential_version,employee_updated_at,expires_at)
     VALUES($1,$2,$3,$4,$5,$6::timestamptz,clock_timestamp()+interval '60 seconds')
     ON CONFLICT(device_id) DO UPDATE SET employee_id=EXCLUDED.employee_id,token_hash=EXCLUDED.token_hash,
     pin_version=EXCLUDED.pin_version,credential_version=EXCLUDED.credential_version,employee_updated_at=EXCLUDED.employee_updated_at,
     expires_at=EXCLUDED.expires_at,created_at=clock_timestamp()`,[device.deviceId,row.employeeId,pinSessionHash(token),row.version,device.credentialVersion,row.employeeUpdatedAt]),
   ...releasePinReservation(workspace.id,reservation),
   s('SELECT e.first_name AS "firstName",ps.expires_at::text AS "expiresAt" FROM clocker_pin_sessions ps JOIN employees e ON e.id=ps.employee_id WHERE ps.device_id=$1 AND ps.token_hash=$2',[device.deviceId,pinSessionHash(token)]),
  ]);
  const verified=result.at(-1)?.[0] as {firstName:string;expiresAt:string}|undefined;
  if(!verified)throw new ClockerPinError('UNAVAILABLE');
  return {state:'verified',token,firstName:verified.firstName,expiresAt:new Date(verified.expiresAt).toISOString()};
 }catch(error){if(error instanceof ClockerPinError&&error.code==='IDENTITY_INVALID')return {state:'denied'};throw error;}
}
