import 'server-only';
import {clockerOriginFailure} from './setup.server';
import {readClockerJson} from './json-body';
import {resolveCurrentClockerIdentity,type CurrentClockerDependencies} from './current-identity.server';
import {requestClockerReview,parseClockerReviewRequest,ClockerReviewError} from './review-requests.server';
const json=(body:object,status=200)=>Response.json(body,{status,headers:{'Cache-Control':'no-store, private','Referrer-Policy':'no-referrer','X-Content-Type-Options':'nosniff'}});
export async function handleClockerReviewRequest(request:Request,location:string,deps:CurrentClockerDependencies){
 const origin=clockerOriginFailure(request.headers,deps.security);if(origin)return json({state:'unavailable'},origin.status);
 if(request.method!=='POST'||request.headers.get('x-nevora-clocker')!=='1'||request.headers.get('content-type')?.split(';')[0].trim().toLowerCase()!=='application/json')return json({state:'unavailable'},403);
 if(location.length>64||!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(location))return json({state:'invalid'},400);
 let input;try{input=parseClockerReviewRequest(await readClockerJson(request,1024));}catch{return json({state:'invalid'},400);}
 try{const identity=await resolveCurrentClockerIdentity(location,deps);if(!identity)return json({state:'identity_required'},401);return json(await requestClockerReview(identity.proof,input,deps.executor));}
 catch(error){const safe=error instanceof ClockerReviewError?error:new ClockerReviewError('UNAVAILABLE');return json({state:'unavailable',error:safe.message},safe.code==='FORBIDDEN'?401:safe.code==='CONFLICT'?409:safe.code==='INVALID'?400:503);}
}
