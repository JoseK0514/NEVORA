import {readCommerceConfig} from '../../commerce/config';
import {readStripeConfig} from '../../commerce/stripe-config';
import {readCompanyServiceTransport} from '../../commerce/installation-transport';
import {CommerceError} from '../../commerce/model';
import {hostedEnvironmentBound,readHostedBody} from './handlers';
import type {HostedEnvironment} from './capabilities';
const methods:Readonly<Record<string,string>>={'/health':'GET','/ready':'GET','/v1/plans':'GET','/v1/status':'GET','/internal/access':'GET','/internal/handoff':'POST','/v1/handoff/exchange':'POST','/v1/checkout':'POST','/v1/portal':'POST','/v1/plan-change':'POST','/v1/logout':'POST'};
const legacy=new Set(['/v1/signup','/v1/setup','/v1/login-link','/v1/verify']);
const fail=(code:string,status:number,origin?:string)=>Response.json({error:{code}},{status,headers:{'cache-control':'no-store','x-content-type-options':'nosniff',vary:'Origin',...(origin?{'access-control-allow-origin':origin}:{})}});
export function createCommerceApiHandler(env:HostedEnvironment,serve:(request:Request)=>Promise<Response>){
 return async(request:Request):Promise<Response>=>{
  let browserOrigin:string|undefined;const reject=(code:string,status:number)=>fail(code,status,browserOrigin);
  const url=new URL(request.url),path=url.pathname,method=request.method;
  if(url.search||(!legacy.has(path)&&!methods[path])||(!legacy.has(path)&&method!==methods[path]&&method!=='OPTIONS'))return reject('not_found',404);
  if(!hostedEnvironmentBound(env,'commerceapi')||env.NEVORA_NEON_HOST_ENABLED!=='true'||env.NEVORA_COMMERCE_API_ENABLED!=='true'||env.NEVORA_COMMERCE_PROVISIONING_MODE!=='onboarding')return reject('not_ready',503);
  const expected=`https://${env.NEVORA_NEON_BRANCH_ID}-commerceapi.compute.c-15.us-east-1.aws.neon.tech`;
  const ui='https://signup-staging.nevora.team';
  if(env.NEVORA_COMMERCE_UI_ORIGIN!==ui||(env.NEVORA_COMMERCE_ALLOWED_ORIGINS!==undefined&&env.NEVORA_COMMERCE_ALLOWED_ORIGINS!==ui))return reject('not_ready',503);
  if(url.origin!==expected||env.NEVORA_COMMERCE_ORIGIN!==expected)return reject('origin_denied',403);
  try{
   const config=readCommerceConfig(env);
   if(!readStripeConfig(env,config.environment,'worker')||!readCompanyServiceTransport(env))return reject('not_ready',503);
   const origin=request.headers.get('origin');if(origin&&!config.allowedOrigins.includes(origin))return reject('origin_denied',403);browserOrigin=origin??undefined;
   if(legacy.has(path))return reject('use_onboarding',409);
   if(method==='POST'&&!path.startsWith('/internal/')&&!origin)return reject('origin_required',403);
   const raw=method==='POST'?await readHostedBody(request,16384):undefined;
   const headers=new Headers();for(const name of ['authorization','origin','content-type','idempotency-key','x-nevora-installation']){const value=request.headers.get(name);if(value!==null)headers.set(name,value);}
   return await serve(new Request(request.url,{method,headers,...(raw!==undefined?{body:raw}:{})}));
  }catch(error){if(error instanceof CommerceError&&['body_too_large','request_timeout','invalid_encoding','rate_limited'].includes(error.code))return reject(error.code,error.status);return reject('temporarily_unavailable',503);}
 };
}
