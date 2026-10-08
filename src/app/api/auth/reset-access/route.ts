import {correctionBoundary,correctionJson,readCorrectionJson} from '@/lib/time-corrections/http.server';
import {resetPasswordWithProof} from '@/lib/auth/recovery.server';
export const runtime='nodejs';
export const dynamic='force-dynamic';
export async function POST(request:Request){
 const boundary=correctionBoundary(request,true,'x-nevora-recovery');if(boundary)return correctionJson({state:'invalid'},boundary);
 try{
  const body=await readCorrectionJson(request);if(!body||typeof body!=='object'||Array.isArray(body)||Object.keys(body).sort().join(',')!=='password,proof'||!('proof' in body)||!('password' in body)||typeof body.proof!=='string'||typeof body.password!=='string')return correctionJson({state:'invalid'},400);
  const result=await resetPasswordWithProof(body.proof,body.password);return correctionJson(result,result.state==='reset'?200:result.state==='invalid'?400:503);
 }catch{return correctionJson({state:'unavailable'},503);}
}
