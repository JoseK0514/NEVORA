import 'server-only';
import {createRuntime} from '../../../services/commerce/runtime';
import {createCommerce} from '../../../services/commerce/service';
let handle:ReturnType<typeof createCommerce>|undefined;
/** Separate catalog/API principal only. Private provisioner credentials never enter this runtime. */
export async function billingApi(request:Request):Promise<Response>{
 const error=(code:string,status:number)=>Response.json({error:{code}},{status,headers:{'cache-control':'no-store'}});
 if(process.env.NEVORA_COMMERCE_API_ENABLED!=='true')return error('not_enabled',404);
 try{
  const actual=new URL(request.url),origin=process.env.NEVORA_COMMERCE_ORIGIN;
  if(!origin||actual.origin!==origin)return error('origin_denied',403);
  const local=process.env.NEVORA_COMMERCE_ENVIRONMENT==='development'&&['localhost','127.0.0.1'].includes(actual.hostname);
  const ip=local?'127.0.0.1':process.env.VERCEL==='1'?request.headers.get('x-vercel-forwarded-for')?.split(',')[0].trim():undefined;
  if(!ip||ip.length>100||!/^[:.0-9a-f]+$/i.test(ip))return error('ingress_identity_unavailable',503);
  if(!handle){const runtime=createRuntime();handle=createCommerce({store:runtime.store,origin:runtime.config.origin,uiOrigin:runtime.config.uiOrigin,allowedOrigins:runtime.config.allowedOrigins,billing:runtime.billing,signupEnabled:false,provisioningMode:'onboarding',pathPrefix:'/api/billing'});}
  return await handle(request,ip);
 }catch{return error('billing_unavailable',503);}
}
