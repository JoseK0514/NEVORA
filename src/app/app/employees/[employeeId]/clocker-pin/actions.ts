'use server';
import { headers } from 'next/headers';
import { requireSessionMutationProof } from '@/lib/auth/session';
import { clockerOriginFailure, clockerSecurity } from '../../../../../lib/clocker/setup.server';
import { readPinKey } from '@/lib/clocker/pin-crypto.server';
import { setEmployeeClockerPin, ClockerPinError } from '@/lib/clocker/pins.server';
export type PinActionResult={ok:true;version:number}|{ok:false;error:string;refresh?:boolean};
/**
 * Validates matching four-digit PINs and a concurrency version before calling
 * the protected PIN writer. Manager role admits the form only; the service owns
 * employee/location authority. Return a version, never PIN or cryptographic data.
 */
export async function saveClockerPinAction(data:FormData):Promise<PinActionResult>{
 const forbidden=clockerOriginFailure(await headers(),clockerSecurity());
 if(forbidden)return {ok:false,error:forbidden.error};
 const proof=await requireSessionMutationProof();
 if(!['OWNER','MANAGER'].includes(proof.employee.role))return {ok:false,error:'Only authorized management may set a Clocker PIN.'};
 const fields=['employeeId','pin','confirmPin','expectedVersion'];
 if([...data.keys()].some(name=>!fields.includes(name))||fields.some(name=>data.getAll(name).length!==1||typeof data.get(name)!=='string'))return {ok:false,error:'Check the employee details and try again.'};
 const pin=data.get('pin') as string,confirmation=data.get('confirmPin'),version=data.get('expectedVersion') as string;
 if(pin.length!==4||!/^[0-9]{4}$/.test(pin)||pin!==confirmation||!/^(0|[1-9][0-9]*)$/.test(version))return {ok:false,error:'Enter the same four-digit PIN twice.'};
 const expectedVersion=Number(version);if(!Number.isSafeInteger(expectedVersion))return {ok:false,error:'Reload the employee’s current PIN settings.',refresh:true};
 try{
  const result=await setEmployeeClockerPin({employeeId:proof.employee.id,sessionTokenHash:proof.sessionTokenHash},
   {employeeId:data.get('employeeId') as string,pin,expectedVersion},readPinKey());
  return {ok:true,version:result.version};
 }catch(error){
  if(error instanceof ClockerPinError)return {ok:false,error:error.message,refresh:['STALE','UNAVAILABLE','FORBIDDEN'].includes(error.code)};
  return {ok:false,error:'PIN changes could not be confirmed. Reload the current settings before trying again.',refresh:true};
 }
}
