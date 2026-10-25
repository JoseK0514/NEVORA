import 'server-only';
import type {CalendarFeedRead} from './types';
import {serializeCalendar} from './ical';
import {requireSessionMutationProof} from '../auth/session';
import {calendarAuthority,getEmployeeCalendarSubscription,manageEmployeeCalendarSubscription,revokeEmployeeCalendarSubscription,validCalendarCommand} from './service.server';
import {correctionBoundary,readCorrectionJson} from '../time-corrections/http.server';
export const calendarHeaders={'Cache-Control':'no-store, private','Referrer-Policy':'no-referrer','X-Content-Type-Options':'nosniff','X-Frame-Options':'DENY','Content-Security-Policy':"default-src 'none'; frame-ancestors 'none'"};
const json=(body:object,status=200)=>Response.json(body,{status,headers:{...calendarHeaders,Vary:'Cookie'}});
/** HEAD performs the same authorization/read as GET; unknown and revoked capabilities share a private generic 404. */
export function createCalendarFeedHandler(read:(token:string)=>Promise<CalendarFeedRead>){
 return async(request:Request,context:{params:Promise<{token:string}>}):Promise<Response>=>{
  const head=request.method==='HEAD';
  const failure=(status:number)=>new Response(head?null:'Calendar unavailable.',{status,headers:{...calendarHeaders,'Content-Type':'text/plain; charset=utf-8',...(status===405?{Allow:'GET, HEAD'}:{})}});
  if(!['GET','HEAD'].includes(request.method))return failure(405);
  if(new URL(request.url).search)return failure(404);
  try{const {token}=await context.params,result=await read(token);if(result.state!=='ready')return failure(result.state==='unauthorized'?404:503);
   const body=serializeCalendar(result.events);return new Response(head?null:body,{headers:{...calendarHeaders,'Content-Type':'text/calendar; charset=utf-8'}});
  }catch{return failure(503);}
 };
}
export async function employeeCalendarHandler(request:Request):Promise<Response>{
 const write=request.method==='POST';if(!write&&request.method!=='GET')return json({state:'unavailable'},405);
 const boundary=correctionBoundary(request,write,'x-nevora-calendar',4096);if(boundary)return json({state:'unavailable'},boundary);
 try{
  const proof=await requireSessionMutationProof();if(!['EMPLOYEE','LEAD'].includes(proof.employee.role)||request.headers.get('x-nevora-calendar-authority')!==calendarAuthority(proof))return json({state:'unauthorized'},403);
  if(!write){const result=await getEmployeeCalendarSubscription(proof);return json(result,result.state==='unauthorized'?403:result.state==='unavailable'?503:200);}
  let command;try{command=await readCorrectionJson(request,4096);}catch{return json({status:'blocked',reason:'invalid_command'},400);}
  if(!validCalendarCommand(command))return json({status:'blocked',reason:'invalid_command'},400);
  const result=await manageEmployeeCalendarSubscription(proof,command);
  // Next may expose an internal request URL behind a proxy. The POST boundary
  // has already required this exact browser Origin to match the allowed origin.
  if(result.status==='created')return json({...result,url:new URL(result.url,request.headers.get('origin')!).href});
  return json(result,result.status==='conflict'?409:result.status==='blocked'?403:result.status==='unavailable'||result.status==='outcome_unknown'?503:200);
 }catch{return json({state:'unauthorized'},401);}
}
export async function managerCalendarRevokeHandler(request:Request,employeeId:string):Promise<Response>{
 if(request.method!=='POST')return json({status:'blocked',reason:'method'},405);
 const boundary=correctionBoundary(request,true,'x-nevora-calendar',4096);if(boundary)return json({status:'blocked',reason:'request_boundary'},boundary);
 try{const proof=await requireSessionMutationProof();if(!['OWNER','MANAGER'].includes(proof.employee.role)||request.headers.get('x-nevora-calendar-authority')!==calendarAuthority(proof)||!employeeId||employeeId.length>200||/[\u0000-\u001f\u007f]/.test(employeeId))return json({status:'blocked',reason:'access_denied'},403);
  let command;try{command=await readCorrectionJson(request,4096);}catch{return json({status:'blocked',reason:'invalid_command'},400);}
  if(!validCalendarCommand(command)||command.kind!=='REVOKE')return json({status:'blocked',reason:'invalid_command'},400);
  const result=await revokeEmployeeCalendarSubscription(proof,employeeId,command);return json(result,result.status==='revoked'?200:result.status==='conflict'?409:result.status==='blocked'?403:503);
 }catch{return json({status:'blocked',reason:'access_denied'},401);}
}
