import 'server-only';
import {createHmac,timingSafeEqual} from 'node:crypto';
import type {SqlStatement} from '../../notifications/types';
import {operationalScopeStatements} from '../../company-access/operational-scope.server';
import {workspaceReadGuard} from '../../data/workspaces';
import {managementSessionStatements} from '../../data/management-session';
import {clockerIdentityWriteGuards,type ClockerIdentityProof} from '../pin-identity.server';
import {pinKeyIdentity} from '../pin-crypto.server';
import {ClockerPhotoError,type PhotoCommand} from './contracts';
import type {PhotoManagementProof} from './service';
import type {PhotoAuthorityBinder} from './sql-repository';
const sql=(text:string,values:readonly unknown[]=[]):SqlStatement=>({text,values});
const assertion=(condition:string,values:readonly unknown[])=>sql(`SELECT (CASE WHEN ${condition} THEN '1' ELSE 'clocker_photo_AUTH_REQUIRED' END)::integer`,values);
const scope=(workspaceId:string)=>sql("SELECT set_config('nevora.clocker.photo_workspace',$1,true)",[workspaceId]);
export function createCurrentClockerPhotoAuthority(key?:Buffer):PhotoAuthorityBinder{
 if(key!==undefined&&(!Buffer.isBuffer(key)||key.length!==32))throw new ClockerPhotoError('UNAVAILABLE');const stableKey=key?Buffer.from(key):null;
 return {
  punch(proof:ClockerIdentityProof,command?:PhotoCommand){
   if(!stableKey)throw new ClockerPhotoError('UNAVAILABLE');
   if(!proof?.device||proof.keyIdentity!==pinKeyIdentity(stableKey))throw new ClockerPhotoError('AUTH_REQUIRED');
   if(command){const expected=createHmac('sha256',stableKey).update(JSON.stringify(['nevora-punch-context-v1',proof.device.workspaceId,proof.device.deviceId,proof.device.credentialVersion,proof.employeeId,proof.tokenHash,proof.pinVersion,proof.employeeUpdatedAt])).digest('hex');if(!/^[a-f0-9]{64}$/.test(command.verificationId)||!timingSafeEqual(Buffer.from(expected,'hex'),Buffer.from(command.verificationId,'hex')))throw new ClockerPhotoError('CONTEXT_CHANGED');}
   const resident=assertion(`EXISTS(SELECT 1 FROM employees e JOIN locations home ON home.id=e.primary_location_id WHERE e.id=$1 AND home.workspace_id=$2)`,[proof.employeeId,proof.device.workspaceId]);
   return {before:[...clockerIdentityWriteGuards(proof),resident,scope(proof.device.workspaceId)],after:[...clockerIdentityWriteGuards(proof),resident]};
  },
  management(proof:PhotoManagementProof,operation){
   const access=proof?.ownerAccess;if(!access||access.proof.employee.role!=='OWNER'||access.proof.employee.id!==proof.employeeId||access.proof.sessionTokenHash!==proof.sessionTokenHash||access.workspace.id!==proof.workspaceId)throw new ClockerPhotoError('AUTH_REQUIRED');
   const guards=()=>[...workspaceReadGuard(access.workspace),...managementSessionStatements(access.proof,proof.employeeId,['OWNER']),...operationalScopeStatements(access.proof,access.workspace,{kind:'COMPANY'},access.authority)];
   return {before:[...(operation==='settings'?[sql('SELECT id FROM workspaces WHERE id=$1 FOR UPDATE',[proof.workspaceId])]:[]),...guards(),scope(proof.workspaceId)],after:guards()};
  },
 };
}
