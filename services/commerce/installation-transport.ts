import {createHash,createHmac} from 'node:crypto';
import {CommerceError} from './model';
type Environment=Readonly<Record<string,string|undefined>>;
export function validCompanyServiceKey(value:unknown):value is string{return typeof value==='string'&&/^[A-Za-z0-9_-]{43}$/.test(value)&&Buffer.from(value,'base64url').toString('base64url')===value;}
export function companyServiceSignature(key:string,input:{timestamp:string;method:string;origin:string;path:string;authorization:string;bodySha256:string}){
 if(!validCompanyServiceKey(key)||!/^[a-f0-9]{64}$/.test(input.bodySha256))throw new CommerceError('installation_transport_unavailable',503);
 const sha=(s:string)=>createHash('sha256').update(s).digest('hex');
 return createHmac('sha256',Buffer.from(key,'base64url')).update(JSON.stringify(['nevora-private-commerce-v1',input.timestamp,input.method,input.origin,input.path,sha(input.authorization),input.bodySha256])).digest('base64url');
}
export function readCompanyServiceTransport(env:Environment){
 const origin=env.NEVORA_COMMERCE_COMPANY_GATEWAY_ORIGIN,key=env.NEVORA_COMMERCE_COMPANY_GATEWAY_KEY;
 if(!origin&&!key)return null;
 const branch=env.NEVORA_NEON_BRANCH_ID;
 if(env.NEVORA_COMMERCE_ENVIRONMENT!=='staging'||env.NEVORA_ONBOARDING_ENVIRONMENT!=='test'||env.NEVORA_WORKSPACE_MODE!=='isolated'||!/^br-[a-z0-9-]+$/.test(branch??'')||origin!==`https://${branch}-commerceauthority.compute.c-15.us-east-1.aws.neon.tech`||!validCompanyServiceKey(key))throw new CommerceError('installation_transport_unavailable',503);
 return {origin,key};
}
/** Optional staging transport only. The retained company secret remains the
 * application authority; the additional signature authenticates this hop. */
export function installationFetch(companyOrigin:string,path:string,init:RequestInit,env:Environment=process.env){
 const config=readCompanyServiceTransport(env);if(!config)return fetch(companyOrigin+path,init);
 const method=init.method??'GET',headers=new Headers(init.headers),authorization=headers.get('authorization')??'',body=init.body??'';
 try{
  const company=new URL(companyOrigin);
  if(company.origin!==companyOrigin||company.protocol!=='https:'||!['/api/commerce/facts','/api/commerce/policy','/api/commerce/owner'].includes(path)||method!==(path.endsWith('/facts')?'GET':'POST')||typeof body!=='string'||Buffer.byteLength(body)>2048||!/^Bearer [A-Za-z0-9_-]{43}$/.test(authorization))throw Error();
 }catch{throw new CommerceError('installation_transport_unavailable',503);}
 const timestamp=String(Math.floor(Date.now()/1000)),bodySha256=createHash('sha256').update(body).digest('hex');
 headers.set('x-nevora-company-origin',companyOrigin);
 headers.set('x-nevora-commerce-service-signature','v1.'+timestamp+'.'+bodySha256+'.'+companyServiceSignature(config.key,{timestamp,method,origin:companyOrigin,path,authorization,bodySha256}));
 return fetch(config.origin+path,{...init,headers,redirect:'error',cache:'no-store'});
}
