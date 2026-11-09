import 'server-only';
import {getSession,requireSessionMutationProof} from '@/lib/auth/session';
import {correctionBoundary,correctionJson,readCorrectionJson} from '@/lib/time-corrections/http.server';
import {readOperationalAuthority,readOwnerOperationalScope,assignOperationalScope} from './operational-scope.server';
import type {ScopeCommand} from './model';
/** Route protocol for current self authority and Owner scope controls. Actor
 * headers bind write intent to the cookie-derived session; the service still
 * checks current authority and target revisions inside its transactions. */
export async function scopeHttp(request:Request,action:'authority'|'status'|'command',employeeId=''):Promise<Response> {
 const write=action==='command',boundary=correctionBoundary(request,write,'x-nevora-company-access');
 if(boundary)return correctionJson({state:'unavailable',reason:'access_denied'},boundary);
 if(request.method!==(write?'POST':'GET'))return correctionJson({state:'unavailable'},405);
 try {
  const session=await getSession();if(!session)return correctionJson({state:'unavailable',reason:'access_denied'},401);
  if(action!=='authority'&&session.role!=='OWNER')return correctionJson({state:'unavailable',reason:'access_denied'},403);
  const proof=await requireSessionMutationProof();
  if(proof.employee.id!==session.id||proof.employee.role!==session.role||(write&&request.headers.get('x-nevora-actor')!==proof.employee.id))return correctionJson({state:'unavailable',reason:'access_denied'},403);
  if(action==='authority'){
   const result=await readOperationalAuthority(proof);return correctionJson(result,result.state==='ready'?200:503);
  }
  if(action==='status'){
   const result=await readOwnerOperationalScope(proof,employeeId);return correctionJson(result,result.state==='ready'?200:503);
  }
  let value:unknown;
  try {value=await readCorrectionJson(request);}catch{return correctionJson({state:'invalid',fieldErrors:[{field:'scope',message:'Invalid scope command.'}]},400);}
  const result=await assignOperationalScope(proof,employeeId,value as ScopeCommand);
  return correctionJson(result,result.state==='saved'?200:result.state==='conflict'?409:result.state==='invalid'?400:503);
 }catch{return correctionJson({state:'unavailable',reason:'read_failed'},503);}
}
