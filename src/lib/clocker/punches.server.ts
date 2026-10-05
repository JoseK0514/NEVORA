import 'server-only';
import { createHash, randomUUID } from 'node:crypto';
import type { SqlExecutor, SqlStatement } from '../notifications/types';
import { neonNotificationExecutor } from '../data/notification-transactions';
import { getWorkspace, workspaceReadGuard } from '../data/workspaces';
import { clockerIdentityWriteGuards, type ClockerIdentityProof } from './pin-identity.server';
import { ClockerPinError } from './pin-authority.server';
import { ClockerDeviceError } from './devices.server';
import { ClockerPunchError, parsePunchCommand, type PunchState, type PunchReceipt, type PunchCommand, type PunchErrorCode } from './punch-command';
import { sql, iso, stateJson, entryJson, punchTime, checkSql, checkedState, checkExpected, mutations } from './punch-sql.server';
type LedgerRow={employeeId:string;credentialVersion:number;payloadHash:string;receipt:PunchReceipt};
function failure(error:unknown):never{
 if(error instanceof ClockerPunchError)throw error;
 if(error instanceof ClockerPinError&&['FORBIDDEN','IDENTITY_INVALID'].includes(error.code))throw new ClockerPunchError('UNAUTHORIZED');
 if(error instanceof ClockerDeviceError&&error.code==='DEVICE_INVALID')throw new ClockerPunchError('UNAUTHORIZED');
 const message=error instanceof Error?error.message:'';
 if(/clocker_pin_(?:FORBIDDEN|IDENTITY_INVALID)|clocker_device_denied/.test(message))throw new ClockerPunchError('UNAUTHORIZED');
 for(const code of ['INVALID','STALE','TRANSITION','WRONG_LOCATION','COMMAND_REUSED','UNAVAILABLE'] as PunchErrorCode[]){
  if(message.includes('clocker_punch_'+code))throw new ClockerPunchError(code);
 }
 throw new ClockerPunchError('UNAVAILABLE');
}
async function batch(executor:SqlExecutor,statements:SqlStatement[]){
 try{return await executor.transaction(statements);}catch(error){return failure(error);}
}
async function locks(proof:ClockerIdentityProof,executor:SqlExecutor):Promise<SqlStatement[]>{
 const workspace=await getWorkspace(executor);
 if(workspace.id!==proof.device.workspaceId)throw new ClockerPunchError('UNAUTHORIZED');
 return [...workspaceReadGuard(workspace),
  // Acquire the strongest employee lock first, avoiding SHARE-to-UPDATE races.
  sql('SELECT id FROM employees WHERE id=$1 FOR UPDATE',[proof.employeeId]),
  ...clockerIdentityWriteGuards(proof),
  sql('SELECT id FROM time_entries WHERE employee_id=$1 AND clock_out_at IS NULL ORDER BY id FOR UPDATE',[proof.employeeId]),
  sql(`SELECT id FROM break_entries WHERE time_entry_id IN(SELECT id FROM time_entries WHERE employee_id=$1 AND clock_out_at IS NULL) ORDER BY id FOR UPDATE`,[proof.employeeId]),
  // Entry/break locks can wait; recheck expiry after those waits, not before only.
  ...clockerIdentityWriteGuards(proof),
 ];
}
const ledger=(deviceId:string,commandId:string)=>sql(`SELECT employee_id AS "employeeId",credential_version AS "credentialVersion",
 payload_hash AS "payloadHash",result AS receipt FROM clocker_command_ledger WHERE device_id=$1 AND command_id=$2::uuid`,[deviceId,commandId]);
function sameReceipt(row:LedgerRow,proof:ClockerIdentityProof,hash:string):PunchReceipt{
 if(row.employeeId!==proof.employeeId||row.credentialVersion!==proof.device.credentialVersion||row.payloadHash!==hash)throw new ClockerPunchError('COMMAND_REUSED');
 if(!row.receipt||!row.receipt.entry||!Number.isInteger(row.receipt.revision))throw new ClockerPunchError('UNAVAILABLE');
 return row.receipt;
}
async function read(proof:ClockerIdentityProof,executor:SqlExecutor,commandId?:string){
 const rows=await batch(executor,[...await locks(proof,executor),
  ...(commandId?[ledger(proof.device.deviceId,commandId)]:[]),
  sql(`SELECT ${stateJson} AS state`,[proof.employeeId]),
 ]);
 return {state:checkedState((rows.at(-1)?.[0] as {state:PunchState}|undefined)?.state as PunchState),
  ledger:commandId?rows.at(-2)?.[0] as LedgerRow|undefined:undefined};
}
export async function readClockerPunchState(proof:ClockerIdentityProof,executor:SqlExecutor=neonNotificationExecutor()):Promise<PunchState>{
 try{return (await read(proof,executor)).state;}catch(error){return failure(error);}
}
export async function reconcileClockerPunch(proof:ClockerIdentityProof,commandId:string,executor:SqlExecutor=neonNotificationExecutor()):Promise<PunchReceipt|null>{
 parsePunchCommand({commandId,action:'CLOCK_IN',expectedRevision:0,expectedEntryId:null,expectedEntryVersion:null,expectedBreakId:null,expectedBreakVersion:null});
 try{
  const rows=await batch(executor,[...await locks(proof,executor),ledger(proof.device.deviceId,commandId)]);
  const row=rows.at(-1)?.[0] as LedgerRow|undefined;
  return row&&row.employeeId===proof.employeeId&&row.credentialVersion===proof.device.credentialVersion?row.receipt:null;
 }catch(error){return failure(error);}
}
/** Only a server-derived identity proof is accepted. No browser actor/time fields. */
export async function executeClockerPunch(proof:ClockerIdentityProof,input:unknown,executor:SqlExecutor=neonNotificationExecutor()):Promise<PunchReceipt>{
 const command=parsePunchCommand(input);
 const hash=createHash('sha256').update('nevora-punch-v1\0').update(JSON.stringify(command)).digest('hex');
 try{
  const initial=await read(proof,executor,command.commandId);
  if(initial.ledger)return sameReceipt(initial.ledger,proof,hash);
  checkExpected(command,initial.state,proof.device.locationId);
  const plan=mutations(command,initial.state,proof.employeeId,proof.device.deviceId,proof.device.locationId,randomUUID(),randomUUID());
  const statements=[...await locks(proof,executor),
   checkSql(`${stateJson}=$2::jsonb`,[proof.employeeId,JSON.stringify(initial.state)],'STALE'),
   ...plan.statements,
   sql(`INSERT INTO clocker_command_ledger(device_id,command_id,employee_id,credential_version,payload_hash,action,revision,time_entry_id,recorded_at,result)
    SELECT $1,$2::uuid,$3,$4,$5,$6,es.revision,t.id,${punchTime},
     jsonb_build_object('commandId',$2::text,'action',$6::text,'revision',es.revision,'recordedAt',${iso(punchTime)},'entry',${entryJson('t')})
    FROM clocker_employee_state es JOIN time_entries t ON t.employee_id=es.employee_id
    WHERE es.employee_id=$3 AND t.id=$7`,[proof.device.deviceId,command.commandId,proof.employeeId,proof.device.credentialVersion,hash,command.action,plan.entryId]),
   checkSql('EXISTS(SELECT 1 FROM clocker_command_ledger WHERE device_id=$1 AND command_id=$2::uuid)',[proof.device.deviceId,command.commandId],'UNAVAILABLE'),
   // The ledger insert or a trigger can wait. Expiry here rolls back ALL writes.
   ...clockerIdentityWriteGuards(proof),
   ledger(proof.device.deviceId,command.commandId),
  ];
  try{
   const result=await batch(executor,statements);
   const row=result.at(-1)?.[0] as LedgerRow|undefined;
   if(!row)throw new ClockerPunchError('UNAVAILABLE');
   return sameReceipt(row,proof,hash);
  }catch(error){
   if(error instanceof ClockerPunchError&&error.code==='STALE'){
    // A concurrent identical command may have won the employee lock. Read its
    // exact saved receipt under CURRENT authority, never create a new command.
    const result=await batch(executor,[...await locks(proof,executor),ledger(proof.device.deviceId,command.commandId)]);
    const row=result.at(-1)?.[0] as LedgerRow|undefined;
    if(row)return sameReceipt(row,proof,hash);
   }
   throw error;
  }
 }catch(error){return failure(error);}
}
export interface ClockerPunchService {
 execute(identity:ClockerIdentityProof,command:PunchCommand):Promise<PunchReceipt>;
}
