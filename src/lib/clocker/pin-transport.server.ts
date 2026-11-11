import 'server-only';
import type { SqlExecutor } from '../notifications/types';
import { authenticateClockerDevice } from './devices.server';
import { clockerOriginFailure, clockerCookieNames, type ClockerCookieStore, type ClockerSecurity } from './setup.server';
import { verifyEmployeeClockerPin, readClockerIdentity, clearClockerIdentity } from './pins.server';
import { readPinKey } from './pin-crypto.server';
export const pinCookieName=(production:boolean)=>`${production?'__Host-':''}nevora_clocker_identity`;
type Input={action:'status'}|{action:'clear'}|{action:'verify';pin:string;employeeId?:string};
async function input(request:Request):Promise<Input>{
 const reader=request.body?.getReader();if(!reader)throw Error('input');
 const decoder=new TextDecoder('utf-8',{fatal:true});let text='',size=0;
 try{while(true){const chunk=await reader.read();if(chunk.done)break;size+=chunk.value.byteLength;
   if(size>512){await reader.cancel();throw Error('input');}text+=decoder.decode(chunk.value,{stream:true});}
   text+=decoder.decode();
 }finally{reader.releaseLock();}
 const data:unknown=JSON.parse(text);
 if(!data||typeof data!=='object'||Array.isArray(data))throw Error('input');
 const row=data as Record<string,unknown>;
 if(row.action==='verify'&&typeof row.pin==='string'&&row.pin.length===4&&/^[0-9]{4}$/.test(row.pin)){
  if(Object.keys(row).length===2)return {action:'verify',pin:row.pin};
  // Empty/control-containing/unknown IDs follow the same bounded denial path.
  // Never reinterpret an invalid supplied ID as the legacy PIN-only mode.
  if(Object.keys(row).length===3&&Object.hasOwn(row,'employeeId'))return {action:'verify',pin:row.pin,
   employeeId:typeof row.employeeId==='string'&&row.employeeId.length<=128?row.employeeId:''};
 }
 if((row.action==='status'||row.action==='clear')&&Object.keys(row).length===1)return {action:row.action};
 throw Error('input');
}
const json=(body:object,status=200,retry?:number)=>Response.json(body,{status,headers:{
 'Cache-Control':'no-store, private','Referrer-Policy':'no-referrer','X-Content-Type-Options':'nosniff',
 ...(retry?{'Retry-After':String(retry)}:{}),
}});
export async function handleClockerPin(request:Request,locationKey:string,deps:{
 cookies:ClockerCookieStore;executor:SqlExecutor;security:ClockerSecurity;key?:Buffer;
}):Promise<Response>{
 const originError=clockerOriginFailure(request.headers,deps.security);
 if(originError)return json({code:originError.code,error:originError.error},originError.status);
 if(request.method!=='POST'||request.headers.get('x-nevora-clocker')!=='1'||request.headers.get('content-type')?.split(';')[0].trim().toLowerCase()!=='application/json')return json({code:'ORIGIN_REJECTED',error:'Open Clocker directly on this site.'},403);
 if(locationKey.length>64||!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(locationKey))return json({code:'LOCATION_INVALID',error:'Choose a valid Clocker location.'},400);
 let data:Input;try{data=await input(request);}catch{return json({code:'PIN_INPUT_INVALID',error:'Enter exactly four PIN digits.'},400);}
 const name=pinCookieName(deps.security.production);
 const options=(maxAge:number)=>({httpOnly:true,secure:deps.security.production,sameSite:'strict' as const,path:'/',maxAge});
 try{
  const credential=deps.cookies.get(clockerCookieNames(deps.security.production).device)?.value??'';
  const device=await authenticateClockerDevice({credential,locationKey},deps.executor);
  if(!device)return json({state:'device_required',code:'DEVICE_REQUIRED',error:'Reconnect this tablet before entering an employee PIN.'},401);
  const token=deps.cookies.get(name)?.value??'';
  if(data.action==='clear'){
   await clearClockerIdentity(device.proof,token,deps.executor);deps.cookies.set(name,'',options(0));return json({state:'idle'});
  }
  const key=deps.key??readPinKey();
  if(data.action==='status'){
   const identity=await readClockerIdentity(device.proof,token,key,deps.executor);
   return identity?json({state:'verified',firstName:identity.firstName,expiresAt:identity.expiresAt}):json({state:'idle'});
  }
  // Clear the browser proof on any new PIN attempt; never restore stale identity after denial.
  deps.cookies.set(name,'',options(0));
  const result=await verifyEmployeeClockerPin(device.proof,data.pin,key,deps.executor,data.employeeId);
  if(result.state==='denied')return json({state:'denied',code:'PIN_DENIED',error:'PIN not recognized for this location. Try again or ask your manager.'},401);
  if(result.state==='limited')return json({state:'limited',code:'PIN_LIMITED',error:'Too many attempts. Wait a few minutes before trying again.',retryAfterSeconds:result.retryAfterSeconds,limitScope:result.limitScope},429,result.retryAfterSeconds);
  deps.cookies.set(name,result.token,options(60));
  return json({state:'verified',firstName:result.firstName,expiresAt:result.expiresAt});
 }catch{return json({state:'unavailable',code:'PIN_UNAVAILABLE',error:'PIN verification is unavailable. Check the connection and try again.'},503);}
}
