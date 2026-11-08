import {Pool} from 'pg';
import {databaseTarget} from './config';
import {CommerceStore} from './store';
import {workspaceInstanceSecret} from './workspace-enrollment';
export function readEnrollmentRuntime(env:Readonly<Record<string,string|undefined>>){
 if(env.NEVORA_ONBOARDING_COMMERCE_ENABLED!=='true')return null;
 const key=env.NEVORA_COMMERCE_BINDING_KEY??'',catalogKey=Buffer.from(env.NEVORA_COMMERCE_ENCRYPTION_KEY??'','base64');
 workspaceInstanceSecret(key,{workspaceId:'11111111-1111-4111-8111-111111111111',environment:'test',incarnation:'1'});
 if(catalogKey.length!==32||[env.NEVORA_SIGNUP_SESSION_SECRET,env.NEVORA_WORKSPACE_TOKEN_SECRET,env.NEVORA_ONBOARDING_TOKEN_ENCRYPTION_KEY,key].some(v=>v&&Buffer.from(v,'base64url').equals(catalogKey))||[env.NEVORA_SIGNUP_SESSION_SECRET,env.NEVORA_WORKSPACE_TOKEN_SECRET,env.NEVORA_ONBOARDING_TOKEN_ENCRYPTION_KEY].includes(key))throw Error('enrollment_key_separation_required');
 const databaseUrl=databaseTarget(env.NEVORA_COMMERCE_ENROLLMENT_DATABASE_URL??'',env.NEVORA_COMMERCE_ENVIRONMENT??'');
 const u=new URL(databaseUrl);if(!/^nv_commerce_enroll_[a-f0-9]{24}$/.test(decodeURIComponent(u.username)))throw Error('enrollment_principal_required');
 for(const value of [env.NEVORA_CONTROL_DATABASE_URL,env.NEVORA_PROVISIONER_CONTROL_DATABASE_URL,env.DATABASE_URL])if(value){const v=new URL(value);if(u.hostname===v.hostname&&(u.pathname===v.pathname||u.username===v.username))throw Error('enrollment_catalog_must_be_separate');}
 return {key,catalogKey,databaseUrl};
}
export function enrollmentRuntime(config:NonNullable<ReturnType<typeof readEnrollmentRuntime>>){
 const pool=new Pool({connectionString:config.databaseUrl,max:2,connectionTimeoutMillis:10000,idleTimeoutMillis:1000});pool.on('error',()=>{});
 const store=new CommerceStore(pool,config.catalogKey,'onboarding');
 return {port:{key:config.key,enroll:store.enrollWorkspace.bind(store)},close:()=>pool.end()};
}
