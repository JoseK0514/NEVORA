'use server';
import { headers } from 'next/headers';
import { requireSessionMutationProof } from '@/lib/auth/session';
import { BreakTypeError, saveBreakType } from '@/lib/clocker/break-types.server';
import { validateBreakType, type BreakType } from '../../../../lib/clocker/break-types';
import { clockerOriginFailure, clockerSecurity } from '../../../../lib/clocker/setup.server';
export type BreakTypeResult={ok:true;breakType:BreakType}|{ok:false;error:string;refresh:boolean};
/**
 * Parses one Owner break-type edit with explicit active state and version.
 * targetMinutes is a reference duration, not an automatic punch/end command;
 * unavailable or stale writes require a read before the user tries again.
 */
export async function saveBreakTypeAction(data:FormData):Promise<BreakTypeResult>{
 const forbidden=clockerOriginFailure(await headers(),await clockerSecurity());
 if(forbidden)return {ok:false,error:forbidden.error,refresh:false};
 const proof=await requireSessionMutationProof();
 if(proof.employee.role!=='OWNER')return {ok:false,error:'Only an Owner may manage break types.',refresh:true};
 const fields=['id','expectedVersion','name','category','targetMinutes','active'];
 const invalid:BreakTypeResult={ok:false,error:'Check the break name, classification and reference duration.',refresh:false};
 if([...data.keys()].some(key=>!fields.includes(key))||fields.some(key=>data.getAll(key).length!==1||typeof data.get(key)!=='string'))return invalid;
 const raw=Object.fromEntries(fields.map(key=>[key,data.get(key) as string]));
 if(!/^(0|[1-9][0-9]*)$/.test(raw.expectedVersion)||!(raw.targetMinutes===''||/^[1-9][0-9]*$/.test(raw.targetMinutes))||!['true','false'].includes(raw.active))return invalid;
 const version=Number(raw.expectedVersion);if(!Number.isSafeInteger(version))return invalid;
 let input;
 try{input=validateBreakType({name:raw.name,category:raw.category,targetMinutes:raw.targetMinutes===''?null:Number(raw.targetMinutes),active:raw.active==='true'});}
 catch{return invalid;}
 try{
  const breakType=await saveBreakType({employeeId:proof.employee.id,sessionTokenHash:proof.sessionTokenHash},
   {...input,...(raw.id?{id:raw.id}:{}),expectedVersion:version});
  return {ok:true,breakType};
 }catch(error){
  if(error instanceof BreakTypeError)return {ok:false,error:error.message,refresh:['FORBIDDEN','STALE','UNAVAILABLE'].includes(error.code)};
  return {ok:false,error:'Break changes could not be confirmed. Reload before trying again.',refresh:true};
 }
}
