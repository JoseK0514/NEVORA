import 'server-only';
import { createHash, createHmac, timingSafeEqual } from 'node:crypto';
import type { SqlExecutor, SqlStatement } from '../notifications/types';
import { neonNotificationExecutor } from '../data/notification-transactions';
import { getWorkspace, workspaceReadGuard } from '../data/workspaces';
import { clockerIdentityWriteGuards, type ClockerIdentityProof } from './pin-identity.server';
import { pinKeyIdentity } from './pin-crypto.server';
import { ClockerPunchError, parseCommandId, parsePunchCommand, type PunchErrorCode } from './punch-command';
import type { PunchView, PunchReceipt, PunchSnapshot, PunchAction } from './punch-types';
import { prepareScheduleTransaction } from './schedule-source.server';

function normalize(error:unknown):never{
 if(error instanceof ClockerPunchError)throw error;
 const message=error instanceof Error?error.message:'';
 const business: PunchErrorCode[]=['AUTH_REQUIRED','STALE_STATE','COMMAND_REUSED','INVALID_TRANSITION','OTHER_LOCATION','INTEGRITY','CLOCK_INVALID','BREAK_TYPE_CHANGED','SCHEDULE_CHANGED'];
 for(const code of business)if(message.includes('clocker_punch_'+code))throw new ClockerPunchError(code);
 if(message.includes('clocker_pin_IDENTITY_INVALID')||message.includes('clocker_device_denied'))throw new ClockerPunchError('AUTH_REQUIRED');
 // SQL, token hashes, employee metadata and driver errors never cross this boundary.
 throw new ClockerPunchError('UNAVAILABLE');
}
const statement=(text:string,values:readonly unknown[]=[]):SqlStatement=>({text,values});

/** Persisted writer. Every method requires server-derived current PIN/device proof. */
export class ClockerPunchService {
 private readonly key:Buffer;
 constructor(key:Buffer,private readonly executor:SqlExecutor=neonNotificationExecutor()){
  if(!Buffer.isBuffer(key)||key.length!==32)throw new ClockerPunchError('UNAVAILABLE');
  this.key=Buffer.from(key);
 }
 private context(proof:ClockerIdentityProof):string{
  if(!proof?.device||typeof proof.employeeId!=='string'||!/^[a-f0-9]{64}$/.test(proof.tokenHash??'')||
   proof.keyIdentity!==pinKeyIdentity(this.key))throw new ClockerPunchError('AUTH_REQUIRED');
  return createHmac('sha256',this.key).update(JSON.stringify(['nevora-punch-context-v1',
   proof.device.workspaceId,proof.device.deviceId,proof.device.credentialVersion,
   proof.employeeId,proof.tokenHash,proof.pinVersion,proof.employeeUpdatedAt])).digest('hex');
 }
 private async guarded<T>(proof:ClockerIdentityProof,body:SqlStatement,captureCommandId?:string):Promise<T>{
  this.context(proof);
  try{
   const workspace=await getWorkspace(this.executor);
   const capture=captureCommandId?await prepareScheduleTransaction(proof,captureCommandId,workspace,this.executor):null;
   const guards=[...workspaceReadGuard(workspace),...(capture?.locks??[]),
    // Serialize this employee BEFORE taking device/session locks, preventing lock-order inversions.
    statement('SELECT id FROM employees WHERE id=$1 FOR UPDATE',[proof.employeeId]),
    ...clockerIdentityWriteGuards(proof),
   ];
   const results=await this.executor.transaction([
    ...guards,...(capture?.before??[]),body,...(capture?.after??[]),
    // An operation may wait on a deeper time-entry lock. Expiry must roll back all writes.
    ...clockerIdentityWriteGuards(proof),...(capture?.cleanup??[]),
   ]);
   const row=results[guards.length+(capture?.before.length??0)]?.[0] as {value:T}|undefined;
   if(!row||!Object.hasOwn(row,'value'))throw new ClockerPunchError('UNAVAILABLE');
   return row.value;
  }catch(error){return normalize(error);}
 }
 async read(proof:ClockerIdentityProof):Promise<PunchView>{
  const data=await this.guarded<{snapshot:PunchSnapshot;breakTypes:PunchView['breakTypes']}>(proof,statement(`SELECT jsonb_build_object(
   'snapshot',clocker_punch_snapshot($1),'breakTypes',COALESCE((SELECT jsonb_agg(jsonb_build_object('id',id,'version',version,'name',name,
   'category',category,'targetMinutes',target_minutes,'active',active) ORDER BY lower(name),id)
   FROM clocker_break_types WHERE workspace_id=$2 AND active),'[]'::jsonb)) AS value`,[proof.employeeId,proof.device.workspaceId]));
  const {snapshot,breakTypes}=data;
  const atOtherLocation=Boolean(snapshot.entry&&snapshot.entry.locationId!==proof.device.locationId);
  const allowedActions:PunchAction[]=atOtherLocation?[]:!snapshot.entry?['CLOCK_IN']:
   snapshot.entry.status==='ON_BREAK'?['END_BREAK','CLOCK_OUT']:breakTypes.length?['START_BREAK','CLOCK_OUT']:['CLOCK_OUT'];
  return {snapshot,verificationId:this.context(proof),allowedActions,atOtherLocation,breakTypes};
 }
 async execute(proof:ClockerIdentityProof,input:unknown):Promise<PunchReceipt>{
  const command=parsePunchCommand(input),expected=this.context(proof);
  if(!timingSafeEqual(Buffer.from(command.verificationId,'hex'),Buffer.from(expected,'hex')))throw new ClockerPunchError('CONTEXT_CHANGED');
  const requestHash=createHash('sha256').update(JSON.stringify(['nevora-punch-command-v1',proof.employeeId,command])).digest('hex');
  return this.guarded<PunchReceipt>(proof,statement(
   'SELECT clocker_apply_punch($1,$2,$3,$4,$5::uuid,$6,$7::jsonb,$8) AS value',
   [proof.employeeId,proof.device.deviceId,proof.device.locationId,proof.device.credentialVersion,
    command.commandId,command.action,JSON.stringify({...command.expected,...(command.breakType?{breakType:command.breakType}:{})}),requestHash]),
   command.action==='CLOCK_IN'?command.commandId:undefined);
 }
 /** Recovery after fresh PIN verification is read-only and still employee/device scoped.
  * null means no committed receipt was observed, NOT proof that an in-flight request was cancelled. */
 async receipt(proof:ClockerIdentityProof,commandId:string,screenVerification?:string):Promise<PunchReceipt|null>{
  const id=parseCommandId(commandId);
  // The browser must not interpret a receipt lookup performed after another tab
  // switched the shared identity cookie as evidence about its earlier screen.
  if(screenVerification!==undefined&&(!/^[a-f0-9]{64}$/.test(screenVerification)||
    !timingSafeEqual(Buffer.from(screenVerification,'hex'),Buffer.from(this.context(proof),'hex'))))throw new ClockerPunchError('CONTEXT_CHANGED');
  return this.guarded<PunchReceipt|null>(proof,statement(
   'SELECT (SELECT result FROM clocker_command_ledger WHERE device_id=$1 AND employee_id=$2 AND command_id=$3::uuid AND credential_version=$4) AS value',
   [proof.device.deviceId,proof.employeeId,id,proof.device.credentialVersion]));
 }
}
