export function publicBillingApiOrigin(value:unknown):string|null{
 if(typeof value!=='string')return null;
 try{const u=new URL(value);if(u.origin!==value||u.username||u.password)return null;
  return u.protocol==='https:'&&/^br-[a-z0-9-]+-commerceapi\.compute\.c-15\.us-east-1\.aws\.neon\.tech$/.test(u.hostname)||u.protocol==='http:'&&['127.0.0.1','localhost'].includes(u.hostname)&&!!u.port?u.origin:null;
 }catch{return null;}
}
/** Public endpoint selection only; this module never reads credential values. */
export function centralBillingApiOrigin(env:Readonly<Record<string,string|undefined>>):string|null{
 if(env.NEVORA_COMMERCE_ENABLED!=='true')return null;
 const origin=publicBillingApiOrigin(env.NEVORA_COMMERCE_API_ORIGIN);if(!origin)return null;
 if(env.NODE_ENV!=='production'&&env.NEVORA_COMMERCE_ENVIRONMENT==='development'&&origin.startsWith('http:'))return origin;
 const branch=env.NEVORA_NEON_BRANCH_ID;
 return env.NEVORA_COMMERCE_ENVIRONMENT==='staging'&&env.NEVORA_WORKSPACE_MODE==='isolated'&&env.NEVORA_ONBOARDING_ENVIRONMENT==='test'&&/^br-[a-z0-9-]+$/.test(branch??'')&&origin===`https://${branch}-commerceapi.compute.c-15.us-east-1.aws.neon.tech`?origin:null;
}
