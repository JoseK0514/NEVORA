import {claimInvitation} from '@/lib/auth/invitations/claim.server';
import {correctionBoundary,correctionJson,readCorrectionJson} from '@/lib/time-corrections/http.server';
export async function POST(request:Request):Promise<Response>{
 const boundary=correctionBoundary(request,true,'x-nevora-activation');
 if(boundary)return correctionJson({state:'invalid'},boundary);
 let proof:string,password:string;
 try{
  const body=await readCorrectionJson(request);
  if(!body||typeof body!=='object'||Array.isArray(body)||Object.keys(body).sort().join(',')!=='password,proof')return correctionJson({state:'invalid'},400);
  const fields=body as Record<string,unknown>;
  if(typeof fields.proof!=='string'||typeof fields.password!=='string')return correctionJson({state:'invalid'},400);
  proof=fields.proof;password=fields.password;
 }catch{return correctionJson({state:'invalid'},400);}
 try{
  const result=await claimInvitation(proof,password,undefined,request.signal);
  return correctionJson(result,result.state==='activated'?200:result.state==='invalid'?400:503);
 }catch{return correctionJson({state:'unavailable'},503);}
}
