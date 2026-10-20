import 'server-only';
import type {SessionMutationProof} from '../shift-changes/types';
import {assertOperationalAccess,isOperationalAuthorizationError} from '../company-access/operational-scope.server';
import type { SqlExecutor, SqlStatement } from '../notifications/types';
import type { ClockerOwnerProof } from './devices.server';
import { pinKeyIdentity } from './pin-crypto.server';
export type PinErrorCode = 'FORBIDDEN' | 'STALE' | 'PIN_UNAVAILABLE' | 'INVALID' | 'UNAVAILABLE' | 'IDENTITY_INVALID';
const messages: Record<PinErrorCode, string> = {
 FORBIDDEN: 'Your current account cannot manage this employee’s Clocker PIN.',
 STALE: 'The PIN settings changed. Reload before saving a new PIN.',
 PIN_UNAVAILABLE: 'This PIN is unavailable. Choose a different PIN.',
 INVALID: 'Use exactly four digits and current employee details.',
 UNAVAILABLE: 'Clocker PIN security is unavailable. No verification can be confirmed.',
 IDENTITY_INVALID: 'Enter your PIN again on this tablet.',
};
export class ClockerPinError extends Error {
 constructor(public readonly code: PinErrorCode) { super(messages[code]); this.name = 'ClockerPinError'; }
}
export const statement = (text: string, values: readonly unknown[] = []): SqlStatement => ({ text, values });
export function assertPin(condition: string, values: readonly unknown[], code: PinErrorCode): SqlStatement {
 return statement(`SELECT (CASE WHEN ${condition} THEN '1' ELSE 'clocker_pin_${code}' END)::integer`,values);
}
export async function pinBatch(executor: SqlExecutor, statements: SqlStatement[]): Promise<unknown[][]> {
 try { return await executor.transaction(statements); }
 catch(error) {
  if(error instanceof ClockerPinError)throw error;
  if(isOperationalAuthorizationError(error))throw new ClockerPinError('FORBIDDEN');
  const message=error instanceof Error?error.message:'';
  for(const code of Object.keys(messages) as PinErrorCode[])if(message.includes(`clocker_pin_${code}`))throw new ClockerPinError(code);
  if(error && typeof error==='object' && 'code' in error && error.code==='23505' &&
    'constraint' in error && String(error.constraint)==='employee_clocker_pins_workspace_id_lookup_hash_key')throw new ClockerPinError('PIN_UNAVAILABLE');
  throw new ClockerPinError('UNAVAILABLE');
 }
}
export function pinKeyGuard(workspaceId: string, key: Buffer): SqlStatement {
 return assertPin('EXISTS(SELECT 1 FROM clocker_pin_configuration WHERE workspace_id=$1 AND key_identity=$2)',[workspaceId,pinKeyIdentity(key)],'UNAVAILABLE');
}
export function pinActorGuards(proof: ClockerOwnerProof, employeeId: string, workspaceId: string, active: boolean): SqlStatement[] {
 if(!proof || typeof proof.employeeId!=='string' || !/^[a-f0-9]{64}$/.test(proof.sessionTokenHash??''))throw new ClockerPinError('FORBIDDEN');
 if(typeof employeeId!=='string'||!employeeId||employeeId.length>128)throw new ClockerPinError('INVALID');
 return [
  statement('SELECT id FROM employees WHERE id=ANY($1::text[]) ORDER BY id FOR UPDATE',[[...new Set([proof.employeeId,employeeId])].sort()]),
  statement('SELECT token_hash FROM employee_sessions WHERE token_hash=$1 AND employee_id=$2 FOR SHARE',[proof.sessionTokenHash,proof.employeeId]),
  pinActorAssertion(proof,employeeId,workspaceId,active),
 ];
}

/** Recheck after potentially blocking writes: row locks cannot stop wall-clock expiry. */
export function pinActorAssertion(proof:ClockerOwnerProof,employeeId:string,workspaceId:string,active:boolean):SqlStatement {
 return assertPin(`EXISTS(SELECT 1 FROM employees actor JOIN employee_sessions s ON s.employee_id=actor.id
   JOIN employees target ON target.id=$3 JOIN locations l ON l.id=target.primary_location_id
   WHERE actor.id=$1 AND actor.active AND actor.role IN ('OWNER','MANAGER')
   AND s.token_hash=$2 AND s.expires_at>clock_timestamp() AND l.workspace_id=$4
   AND (actor.role='OWNER' OR target.role<>'OWNER') ${active?'AND target.active':''})`,
   [proof.employeeId,proof.sessionTokenHash,employeeId,workspaceId],'FORBIDDEN');
}

/** The legacy Clocker actor proof contains no employee role/details. Obtain the
 * actual current session employee; never fabricate a portal proof from a claimed
 * role or eligibility. This query reads only the actor, before private PIN data. */
export async function pinManagementAccess(actor:ClockerOwnerProof,executor:SqlExecutor){
 if(!actor||typeof actor.employeeId!=='string'||!/^[a-f0-9]{64}$/.test(actor.sessionTokenHash??''))throw new ClockerPinError('FORBIDDEN');
 try{
  const [employee]=await executor.query<SessionMutationProof['employee']>(statement(`SELECT e.id,e.first_name AS "firstName",e.last_name AS "lastName",e.role,e.primary_location_id AS "primaryLocationId"
   FROM employees e JOIN employee_sessions s ON s.employee_id=e.id WHERE e.id=$1 AND e.active AND e.role IN('OWNER','MANAGER') AND s.token_hash=$2 AND s.expires_at>clock_timestamp()`,[actor.employeeId,actor.sessionTokenHash]));
  if(!employee)throw new ClockerPinError('FORBIDDEN');
  const proof:SessionMutationProof={employee,sessionTokenHash:actor.sessionTokenHash};
  return {...await assertOperationalAccess(proof,{kind:'COMPANY'},executor),proof};
 }catch(error){
  if(error instanceof ClockerPinError)throw error;
  throw new ClockerPinError(isOperationalAuthorizationError(error)?'FORBIDDEN':'UNAVAILABLE');
 }
}
