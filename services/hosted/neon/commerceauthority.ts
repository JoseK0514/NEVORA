import {createHash,timingSafeEqual} from 'node:crypto';
import {CommerceError} from '../../commerce/model';
import {companyServiceSignature,validCompanyServiceKey} from '../../commerce/installation-transport';
import {parseWorkspaceOrigin} from '../../../src/lib/workspace-routing/config.server';
import {hostedEnvironmentBound,readHostedBody} from './handlers';
import type {HostedEnvironment} from './capabilities';
const fail=(code:string,status:number)=>Response.json({error:{code}},{status,headers:{'cache-control':'no-store','x-content-type-options':'nosniff'}});
/** A fixed signed hop into the existing company handlers. No caller-selected
 * network request, SQL, cookie, forwarding header or routing bypass exists. */
export function createCompanyAuthorityHandler(env:HostedEnvironment,company:(request:Request)=>Promise<Response>,now:()=>number=Date.now){
 return async(request:Request):Promise<Response>=>{
  const url=new URL(request.url),path=url.pathname,method=request.method;
  if(url.search||!['/api/commerce/facts','/api/commerce/policy','/api/commerce/owner'].includes(path)||method!==(path.endsWith('/facts')?'GET':'POST'))return fail('not_found',404);
  if(!hostedEnvironmentBound(env,'commerceauthority')||env.NEVORA_NEON_HOST_ENABLED!=='true'||env.NEVORA_COMMERCE_ENABLED!=='true'||!env.NEVORA_CONTROL_DATABASE_URL||!validCompanyServiceKey(env.NEVORA_COMMERCE_COMPANY_GATEWAY_KEY))return fail('not_ready',503);
  const expectedOrigin=`https://${env.NEVORA_NEON_BRANCH_ID}-commerceauthority.compute.c-15.us-east-1.aws.neon.tech`;
  if(url.origin!==expectedOrigin)return fail('origin_denied',403);
  const origin=request.headers.get('x-nevora-company-origin')??'',authorization=request.headers.get('authorization')??'',header=request.headers.get('x-nevora-commerce-service-signature')??'';
  const match=header.length<=160?/^v1\.([0-9]{10})\.([a-f0-9]{64})\.([A-Za-z0-9_-]{43})$/.exec(header):null;
  if(!match||!/^Bearer [A-Za-z0-9_-]{43}$/.test(authorization))return fail('unauthorized',401);
  const timestamp=Number(match[1])*1000,age=now()-timestamp;
  if(!Number.isSafeInteger(timestamp)||age>30000||age< -5000)return fail('unauthorized',401);
  try{
   // Authenticate the claimed body digest before waiting on any body bytes.
   const signature=companyServiceSignature(env.NEVORA_COMMERCE_COMPANY_GATEWAY_KEY,{timestamp:match[1],method,origin,path,authorization,bodySha256:match[2]});
   if(!timingSafeEqual(Buffer.from(signature),Buffer.from(match[3])))return fail('unauthorized',401);
   const raw=method==='POST'?await readHostedBody(request,2048):'';
   if(!timingSafeEqual(Buffer.from(createHash('sha256').update(raw).digest('hex')),Buffer.from(match[2])))return fail('unauthorized',401);
   const canonical=parseWorkspaceOrigin(origin,{environment:'test',portalBaseDomain:env.NEVORA_PORTAL_BASE_DOMAIN??''});
   if(!canonical||canonical!==origin)return fail('company_denied',403);
   const headers=new Headers({authorization});if(method==='POST')headers.set('content-type','application/json');
   return await company(new Request(canonical+path,{method,headers,...(method==='POST'?{body:raw}:{})}));
  }catch(error){if(error instanceof CommerceError&&['body_too_large','request_timeout','invalid_encoding'].includes(error.code))return fail(error.code,error.status);return fail('temporarily_unavailable',503);}
 };
}
