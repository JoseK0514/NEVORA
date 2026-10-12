import 'server-only';
import {getSession,requireSessionMutationProof} from './auth/session';
import {employeeViewAuthority,type EmployeeView} from './employee-view-authority.server';
import type {SessionMutationProof} from './shift-changes/types';
import type {EmployeeViewSnapshot} from './employee-view';
const json=(value:object,status=200)=>Response.json(value,{status,headers:{'Cache-Control':'no-store, private','Vary':'Cookie','Referrer-Policy':'no-referrer','X-Content-Type-Options':'nosniff'}});
export function createEmployeeViewGet(kind:EmployeeView,read:(proof:SessionMutationProof)=>Promise<EmployeeViewSnapshot>){
 return createViewGet(kind,read,['EMPLOYEE','LEAD']);
}
/** Only notifications extend to management; employee profile readers stay scoped. */
export function createPortalNotificationViewGet(read:(proof:SessionMutationProof)=>Promise<EmployeeViewSnapshot>){
 return createViewGet('notifications',read,['EMPLOYEE','LEAD','MANAGER','OWNER']);
}
function createViewGet(kind:EmployeeView,read:(proof:SessionMutationProof)=>Promise<EmployeeViewSnapshot>,roles:readonly string[]){
 return async(request:Request):Promise<Response>=>{
  if(new URL(request.url).search)return json({state:'unavailable',reason:'access_denied'},400);
  if(request.headers.get('sec-fetch-site')==='cross-site')return json({state:'unavailable',reason:'access_denied'},403);
  try{
   const session=await getSession();if(!session)return json({state:'unavailable',reason:'access_denied'},401);
   if(!roles.includes(session.role))return json({state:'unavailable',reason:'access_denied'},403);
   const proof=await requireSessionMutationProof();
   if(proof.employee.id!==session.id||proof.employee.role!==session.role||request.headers.get('x-nevora-employee-view')!==employeeViewAuthority(proof,kind))return json({state:'unavailable',reason:'access_denied'},403);
   const result=await read(proof);return json(result,result.state==='ready'?200:result.reason==='access_denied'?403:503);
  }catch{return json({state:'unavailable',reason:'read_failed'},503);}
 };
}

export function createManagementNotificationReadPost(mark:(proof:SessionMutationProof,id:string)=>Promise<boolean>){
 return async(request:Request):Promise<Response>=>{
  const url=new URL(request.url);
  if(url.search||request.headers.get('origin')!==url.origin||request.headers.get('sec-fetch-site')==='cross-site')return json({state:'unavailable',reason:'access_denied'},403);
  try{
   const session=await getSession();if(!session)return json({state:'unavailable',reason:'access_denied'},401);
   if(!['OWNER','MANAGER'].includes(session.role))return json({state:'unavailable',reason:'access_denied'},403);
   const proof=await requireSessionMutationProof();
   if(proof.employee.id!==session.id||proof.employee.role!==session.role||request.headers.get('x-nevora-employee-view')!==employeeViewAuthority(proof,'notifications'))return json({state:'unavailable',reason:'access_denied'},403);
   const value:unknown=await request.json();
   if(!value||typeof value!=='object'||Array.isArray(value)||Object.keys(value).length!==1||!('notificationId' in value)||typeof value.notificationId!=='string'||!value.notificationId||value.notificationId.length>100)return json({state:'unavailable',reason:'invalid_request'},400);
   return await mark(proof,value.notificationId)?json({state:'read'}):json({state:'unavailable',reason:'access_denied'},403);
  }catch{return json({state:'unavailable',reason:'read_failed'},503);}
 };
}
