import 'server-only';
import { createHmac, timingSafeEqual } from 'node:crypto';
import type { SqlExecutor } from '../notifications/types';
import { authenticateClockerDevice, ClockerDeviceError } from './devices.server';
import { readClockerIdentity, type ClockerIdentityProof } from './pin-identity.server';
import { readPinKey } from './pin-crypto.server';
import { ClockerPinError } from './pin-authority.server';
import { pinCookieName } from './pin-transport.server';
import { clockerCookieNames, clockerOriginFailure, type ClockerCookieStore, type ClockerSecurity } from './setup.server';
import { executeClockerPunch, readClockerPunchState, reconcileClockerPunch } from './punches.server';
import { ClockerPunchError, parsePunchCommand, type PunchCommand } from './punch-command';

type Input = { operation:'state' } | { operation:'execute'; context:string; command:PunchCommand }
 | { operation:'reconcile'; context:string; commandId:string };
function invalid():never { throw new ClockerPunchError('INVALID'); }
async function readInput(request:Request):Promise<Input> {
 const reader=request.body?.getReader();if(!reader)return invalid();
 const decoder=new TextDecoder('utf-8',{fatal:true});let bytes=0,text='';
 try {
  while(true){const chunk=await reader.read();if(chunk.done)break;bytes+=chunk.value.byteLength;
   if(bytes>4096){await reader.cancel();return invalid();}text+=decoder.decode(chunk.value,{stream:true});}
  text+=decoder.decode();
 }finally{reader.releaseLock();}
 const value:unknown=JSON.parse(text);
 if(!value||typeof value!=='object'||Array.isArray(value))return invalid();
 const row=value as Record<string,unknown>,keys=Object.keys(row);
 if(row.operation==='state'&&keys.length===1)return {operation:'state'};
 if(typeof row.context!=='string'||!/^[a-f0-9]{64}$/.test(row.context))return invalid();
 if(row.operation==='execute'&&keys.length===3&&keys.includes('command'))return {operation:'execute',context:row.context,command:parsePunchCommand(row.command)};
 if(row.operation==='reconcile'&&keys.length===3&&keys.includes('commandId')){
  const cmd=parsePunchCommand({commandId:row.commandId,action:'CLOCK_IN',expectedRevision:0,expectedEntryId:null,expectedEntryVersion:null,expectedBreakId:null,expectedBreakVersion:null});
  return {operation:'reconcile',context:row.context,commandId:cmd.commandId};
 }
 return invalid();
}
/** Non-authorizing screen binding. Neither value is a cookie, credential or identity proof. */
function binding(proof:ClockerIdentityProof,key:Buffer,sessionBound:boolean):string {
 return createHmac('sha256',key).update(JSON.stringify([
  'nevora-punch-screen-v1',sessionBound?'verification':'recovery-subject',proof.device.workspaceId,
  proof.device.deviceId,proof.device.credentialHash,proof.device.credentialVersion,proof.employeeId,
  ...(sessionBound?[proof.tokenHash]:[]),
 ])).digest('hex');
}
function json(body:object,status=200){return Response.json(body,{status,headers:{
 'Cache-Control':'no-store, private','Referrer-Policy':'no-referrer','X-Content-Type-Options':'nosniff',
}});}
function failure(error:unknown):Response {
 if(error instanceof ClockerPinError&&['FORBIDDEN','IDENTITY_INVALID'].includes(error.code))error=new ClockerPunchError('UNAUTHORIZED');
 if(error instanceof ClockerDeviceError&&error.code==='DEVICE_INVALID')error=new ClockerPunchError('UNAUTHORIZED');
 const known=error instanceof ClockerPunchError?error:new ClockerPunchError('UNAVAILABLE');
 const status=known.code==='UNAUTHORIZED'?401:known.code==='INVALID'?400:known.code==='UNAVAILABLE'?503:409;
 return json({state:'error',code:known.code,error:known.message},status);
}
export async function handleClockerPunch(request:Request,locationKey:string,deps:{
 cookies:ClockerCookieStore;executor:SqlExecutor;security:ClockerSecurity;key?:Buffer;enabled:boolean;
}):Promise<Response> {
 const origin=clockerOriginFailure(request.headers,deps.security);
 if(origin)return json({state:'error',code:'ORIGIN',error:origin.error},origin.status);
 if(request.method!=='POST'||request.headers.get('x-nevora-clocker')!=='1'||
  request.headers.get('content-type')?.split(';')[0].trim().toLowerCase()!=='application/json'){
  return json({state:'error',code:'ORIGIN',error:'Open Clocker directly on this site.'},403);
 }
 if(typeof locationKey!=='string'||locationKey.length>64||!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(locationKey))return failure(new ClockerPunchError('INVALID'));
 let input:Input;try{input=await readInput(request);}catch{return failure(new ClockerPunchError('INVALID'));}
 if(!deps.enabled)return json({state:'error',code:'DISABLED',error:'Timekeeping has not been enabled in this environment.'},503);
 try {
  const credential=deps.cookies.get(clockerCookieNames(deps.security.production).device)?.value??'';
  const device=await authenticateClockerDevice({credential,locationKey},deps.executor);
  if(!device)throw new ClockerPunchError('UNAUTHORIZED');
  const key=deps.key??readPinKey();
  const identity=await readClockerIdentity(device.proof,deps.cookies.get(pinCookieName(deps.security.production))?.value??'',key,deps.executor);
  if(!identity)throw new ClockerPunchError('UNAUTHORIZED');
  const context=binding(identity.proof,key,true);
  if(input.operation==='state') {
   const clock=await readClockerPunchState(identity.proof,deps.executor);
   return json({state:'ready',context,subject:binding(identity.proof,key,false),firstName:identity.firstName,
    expiresAt:identity.expiresAt,locationId:device.proof.locationId,clock});
  }
  // A different tab may have verified a different person since this screen loaded.
  if(!timingSafeEqual(Buffer.from(context,'hex'),Buffer.from(input.context,'hex')))throw new ClockerPunchError('UNAUTHORIZED');
  const receipt=input.operation==='execute'
   ?await executeClockerPunch(identity.proof,input.command,deps.executor)
   :await reconcileClockerPunch(identity.proof,input.commandId,deps.executor);
  return receipt?json({state:'recorded',receipt}):json({state:'not_found'});
 }catch(error){return failure(error);}
}
