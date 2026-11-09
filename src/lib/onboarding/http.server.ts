import 'server-only';

export class OnboardingHttpError extends Error{constructor(readonly status:number,readonly code:string){super(code);}}
export function onboardingJson(value:unknown,status=200,extra:HeadersInit={}):Response{const headers=new Headers(extra);headers.set('cache-control','no-store, private');headers.set('pragma','no-cache');headers.set('referrer-policy','no-referrer');headers.set('x-content-type-options','nosniff');headers.set('vary','Cookie, Origin');return Response.json(value,{status,headers});}
export function validateOnboardingWrite(request:Request,origin:string):Response|null{
 if(request.method!=='POST')return onboardingJson({state:'unavailable',reasonCode:'METHOD_NOT_ALLOWED'},405,{allow:'POST'});
 try{if(new URL(request.url).origin!==origin||request.headers.get('origin')!==origin||request.headers.get('sec-fetch-site')==='cross-site')return onboardingJson({state:'unavailable',reasonCode:'ACCESS_DENIED'},403);}catch{return onboardingJson({state:'unavailable',reasonCode:'ACCESS_DENIED'},403);}
 if(request.headers.get('content-type')?.split(';')[0].trim().toLowerCase()!=='application/json')return onboardingJson({state:'invalid',fieldErrors:[{field:'request',code:'JSON_REQUIRED'}]},415);
 return null;
}
export async function readOnboardingJson(request:Request,limit=16384):Promise<unknown>{
 const length=request.headers.get('content-length');if(length&&(!/^[0-9]+$/.test(length)||Number(length)>limit))throw new OnboardingHttpError(413,'BODY_TOO_LARGE');
 if(!request.body)throw new OnboardingHttpError(400,'INVALID_JSON');const reader=request.body.getReader(),decoder=new TextDecoder('utf-8',{fatal:true});let count=0,text='';
 try{for(;;){const r=await reader.read();if(r.done)break;count+=r.value.byteLength;if(count>limit){await reader.cancel();throw new OnboardingHttpError(413,'BODY_TOO_LARGE');}text+=decoder.decode(r.value,{stream:true});}text+=decoder.decode();return JSON.parse(text);}catch(error){if(error instanceof OnboardingHttpError)throw error;throw new OnboardingHttpError(400,'INVALID_JSON');}finally{reader.releaseLock();}
}
export function onboardingHttpFailure(error:unknown):Response{return error instanceof OnboardingHttpError?onboardingJson({state:'invalid',fieldErrors:[{field:'request',code:error.code}]},error.status):onboardingJson({state:'unavailable',reasonCode:'SOURCE_UNAVAILABLE'},503);}
