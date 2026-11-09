import 'server-only';
import type {ControlStore} from '../onboarding/control-store.server';
import {runtimeControlStore} from '../onboarding/control-store.server';
import {digestOnboardingProof} from '../onboarding/crypto.server';
import {isClosedRecord,validWorkspaceSlug} from '../onboarding/contracts';
import {onboardingJson,readOnboardingJson} from '../onboarding/http.server';
import {readWorkspaceRoutingConfig,parseWorkspaceOrigin,type WorkspaceRoutingConfig} from './config.server';
/** Public company locator only; reveals no names, membership or credential data. */
export function createWorkspaceDiscoveryHandler(store:ControlStore,config:WorkspaceRoutingConfig,platformOrigin:string){
 const tokenKey=config.tokenKey;
 return async(request:Request):Promise<Response>=>{
  const denied=(status=404)=>onboardingJson({schemaVersion:1,status:'unavailable'},status);
  try{
   if(!tokenKey)return denied(503);
   const url=new URL(request.url),origin=request.headers.get('origin');
   if(request.method!=='POST'||url.origin!==platformOrigin||url.search||request.headers.has('cookie')||(origin!==null&&origin!==platformOrigin)||request.headers.get('sec-fetch-site')==='cross-site'||request.headers.get('x-nevora-workspace')!=='1'||request.headers.get('content-type')?.split(';')[0].trim().toLowerCase()!=='application/json')return denied(403);
   const body=await readOnboardingJson(request,1024);
   if(!isClosedRecord(body,['schemaVersion','slug'])||body.schemaVersion!==1||!validWorkspaceSlug(body.slug))return denied(400);
   const allowed=await store.transaction(async client=>{
    const r=await client.query(`INSERT INTO nevora_onboarding.admission_counters(environment,kind,subject_digest,bucket_start,attempts)
     VALUES($1,'PLATFORM',$2,date_trunc('minute',clock_timestamp()),1)
     ON CONFLICT(environment,kind,subject_digest,bucket_start) DO UPDATE SET attempts=LEAST(121,nevora_onboarding.admission_counters.attempts+1) RETURNING attempts`,[config.environment,digestOnboardingProof('workspace-discovery','global',tokenKey)]);
    return r.rows.length===1&&Number.isInteger(r.rows[0].attempts)&&r.rows[0].attempts<=120;
   });
   if(!allowed)return denied(429);
   const canonical='https://'+body.slug+'.'+config.portalBaseDomain;
   const result=await store.query("SELECT canonical_origin FROM nevora_onboarding.workspace_registry WHERE canonical_origin=$1 AND environment=$2 AND lifecycle='ACTIVE'",[canonical,config.environment]);
   if(result.rows.length!==1||result.rows[0].canonical_origin!==canonical||!parseWorkspaceOrigin(canonical,config))return denied();
   return onboardingJson({schemaVersion:1,status:'ready',origin:canonical});
  }catch{return denied(503);}
 };
}
export async function discoverWorkspace(request:Request):Promise<Response>{
 try{const config=readWorkspaceRoutingConfig(),url=new URL(process.env.NEVORA_SIGNUP_ORIGIN??'');
  if(url.username||url.password||url.pathname!=='/'||url.search||url.hash||url.protocol!=='https:')throw Error();
  return createWorkspaceDiscoveryHandler(runtimeControlStore(config),config,url.origin)(request);
 }catch{return onboardingJson({schemaVersion:1,status:'unavailable'},503);}
}
