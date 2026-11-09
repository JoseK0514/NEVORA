import 'server-only';
import { createHmac } from 'node:crypto';
import type { SqlExecutor } from '../notifications/types';
import { clockerOriginFailure, clockerCookieNames, type ClockerCookieStore, type ClockerSecurity } from './setup.server';
import { authenticateClockerDevice } from './devices.server';
import { readClockerIdentity } from './pin-identity.server';
import { pinCookieName } from './pin-transport.server';
import { readPinKey } from './pin-crypto.server';
import {getClockerPhotoRuntime} from './photo-server/runtime.server';
import { ClockerPunchService } from './punches.server';
import { parseCommandId, parsePunchCommand, ClockerPunchError } from './punch-command';
import type { PunchCommand } from './punch-types';
export type PunchTransportDeps={enabled:boolean;executor:SqlExecutor;key?:Buffer;security:ClockerSecurity;cookies:ClockerCookieStore};
type Input={operation:'state'}|{operation:'receipt';commandId:string;verificationId:string}|{operation:'execute';command:PunchCommand};
async function input(request:Request):Promise<Input>{
 const reader=request.body?.getReader();if(!reader)throw new ClockerPunchError('INVALID_INPUT');
 let text='',size=0;const decoder=new TextDecoder('utf-8',{fatal:true});
 try{
  while(true){const chunk=await reader.read();if(chunk.done)break;size+=chunk.value.byteLength;
   if(size>2048){await reader.cancel();throw new ClockerPunchError('INVALID_INPUT');}text+=decoder.decode(chunk.value,{stream:true});}
  text+=decoder.decode();
 }finally{reader.releaseLock();}
 const value:unknown=JSON.parse(text);
 if(!value||typeof value!=='object'||Array.isArray(value))throw new ClockerPunchError('INVALID_INPUT');
 const data=value as Record<string,unknown>,keys=Object.keys(data);
 if(data.operation==='state'&&keys.length===1)return {operation:'state'};
 if(data.operation==='receipt'&&keys.length===3&&keys.includes('commandId')&&typeof data.verificationId==='string'&&/^[a-f0-9]{64}$/.test(data.verificationId))return {operation:'receipt',commandId:parseCommandId(data.commandId),verificationId:data.verificationId};
 if(data.operation==='execute'&&keys.length===2&&keys.includes('command'))return {operation:'execute',command:parsePunchCommand(data.command)};
 throw new ClockerPunchError('INVALID_INPUT');
}
const json=(body:object,status=200)=>Response.json(body,{status,headers:{
 'Cache-Control':'no-store, private','Referrer-Policy':'no-referrer','X-Content-Type-Options':'nosniff',
}});
function failed(error:unknown){
 const safe=error instanceof ClockerPunchError?error:new ClockerPunchError('UNAVAILABLE');
 const status=safe.code==='INVALID_INPUT'?400:safe.code==='AUTH_REQUIRED'?401:
  ['INTEGRITY','CLOCK_INVALID','UNAVAILABLE'].includes(safe.code)?503:409;
 return json({state:status===503?'unavailable':status===401?'identity_required':'rejected',code:safe.code,error:safe.message},status);
}
export async function handleClockerPunch(request:Request,locationKey:string,deps:PunchTransportDeps):Promise<Response>{
 if(deps.enabled!==true)return json({state:'disabled',error:'Time punches are not enabled in this environment.'},503);
 const origin=clockerOriginFailure(request.headers,deps.security);if(origin)return json({state:'unavailable',error:origin.error},origin.status);
 if(request.method!=='POST'||request.headers.get('x-nevora-clocker')!=='1'||
  request.headers.get('content-type')?.split(';')[0].trim().toLowerCase()!=='application/json')return json({error:'Open Clocker directly on this site.'},403);
 if(locationKey.length>64||!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(locationKey))return failed(new ClockerPunchError('INVALID_INPUT'));
 let data:Input;try{data=await input(request);}catch{return failed(new ClockerPunchError('INVALID_INPUT'));}
 try{
  const credential=deps.cookies.get(clockerCookieNames(deps.security.production).device)?.value??'';
  const device=await authenticateClockerDevice({credential,locationKey},deps.executor);
  if(!device)return json({state:'device_required',error:'Reconnect this tablet before recording time.'},401);
  const key=deps.key??readPinKey();
  const identity=await readClockerIdentity(device.proof,deps.cookies.get(pinCookieName(deps.security.production))?.value??'',key,deps.executor);
  if(!identity)return failed(new ClockerPunchError('AUTH_REQUIRED'));
  const service=new ClockerPunchService(key,deps.executor,{photoEvidence:Boolean(await getClockerPhotoRuntime())});
  if(data.operation==='state'){
   const view=await service.read(identity.proof);
   // Non-authorizing identifier for this employee/device generation only. It
   // survives re-PIN for read-only recovery but is neither a cookie nor a proof.
   const subject=createHmac('sha256',key).update(JSON.stringify(['nevora-punch-recovery-subject-v1',
    device.proof.workspaceId,device.proof.deviceId,device.proof.credentialHash,device.proof.credentialVersion,identity.proof.employeeId])).digest('hex');
   return json({state:'ready',...view,photoCaptureAvailable:Boolean(await getClockerPhotoRuntime()),subject,firstName:identity.firstName,expiresAt:identity.expiresAt,locationId:device.proof.locationId});
  }
  if(data.operation==='execute')return json({state:'committed',receipt:await service.execute(identity.proof,data.command)});
  const receipt=await service.receipt(identity.proof,data.commandId,data.verificationId);
  return receipt?json({state:'committed',receipt}):json({state:'unknown',message:'No committed receipt was observed. Retain the original command ID; do not create a replacement command.'});
 }catch(error){return failed(error);}
}
