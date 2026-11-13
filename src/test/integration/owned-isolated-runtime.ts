import {Pool} from 'pg';
import {readFile,lstat,realpath} from 'node:fs/promises';
import {join} from 'node:path';
import {request} from 'node:http';
import {financeBridgeEnvironment,readOwnedFinancialClock,type OwnedFinanceBridge} from './owned-isolated-finance';
export type OwnedIsolatedTarget={uri:string;connectionUrl:string;name:string;oid:number;marker:string};
export type OwnedIsolatedRuntime={environment:'test';controlDatabaseUrl:string;encryptionKey:string;tokenKey:string;portalBaseDomain:string;origins:string[];targets:OwnedIsolatedTarget[];finance?:{bridge:OwnedFinanceBridge;bindingKey:string}};
function fail():never{throw Error('Invalid owned isolated browser runtime');}
const key=(value:string)=>/^[A-Za-z0-9_-]{43}$/.test(value)&&Buffer.from(value,'base64url').length===32;
function local(raw:string){const u=new URL(raw);if(!['postgres:','postgresql:'].includes(u.protocol)||u.hostname!=='127.0.0.1'||!u.port||!u.username||!u.password||u.search||u.hash)fail();return u;}
/** Explicit test options only; ambient credentials are never copied. */
export function ownedIsolatedEnvironment(options?:OwnedIsolatedRuntime):Record<string,string>{
 if(!options)return {};
 const c=options,control=local(c.controlDatabaseUrl);
 if(c.environment!=='test'||!/^nv_onboard_[a-f0-9]{8}$/.test(control.username)||!/^\/nv_onboarding_test_[a-f0-9]{20}$/.test(control.pathname)||!key(c.encryptionKey)||!key(c.tokenKey)||c.tokenKey===c.encryptionKey||!/^([a-z0-9-]+\.)*example\.invalid$/.test(c.portalBaseDomain)||c.origins.length!==1||c.targets.length<1||c.targets.length>2)fail();
 for(const value of c.origins){const u=new URL(value);if(u.origin!==value||u.protocol!=='https:'||u.port||u.username||u.password||!u.hostname.endsWith('.'+c.portalBaseDomain)||u.hostname.slice(0,-c.portalBaseDomain.length-1).includes('.'))fail();}
 const seen=new Set<string>();
 for(const target of c.targets){
  const actual=local(target.connectionUrl),uri=new URL(target.uri);
  if(!/^nv_app_[a-f0-9]{32}$/.test(target.name)||actual.pathname!=='/'+target.name||actual.port!==control.port||!/^nv_app_[a-f0-9]{24}$/.test(actual.username)||!Number.isSafeInteger(target.oid)||target.oid<=0||!/^nevora-step4-owned:[a-f0-9-]{36}$/.test(target.marker)||!['postgres:','postgresql:'].includes(uri.protocol)||!/^ep-[a-f0-9]+\.us-east-1\.aws\.neon\.tech$/.test(uri.hostname)||uri.username!==actual.username||uri.password!==actual.password||uri.pathname!==actual.pathname||uri.hash||seen.has(target.uri))fail();
  seen.add(target.uri);
 }
 if(c.finance&&(!key(c.finance.bindingKey)||[c.encryptionKey,c.tokenKey].includes(c.finance.bindingKey)))fail();
 return {NEVORA_WORKSPACE_MODE:'isolated',NEVORA_ONBOARDING_ENVIRONMENT:'test',NEVORA_CONTROL_DATABASE_URL:c.controlDatabaseUrl,NEVORA_ONBOARDING_TOKEN_ENCRYPTION_KEY:c.encryptionKey,NEVORA_WORKSPACE_TOKEN_SECRET:c.tokenKey,NEVORA_PORTAL_BASE_DOMAIN:c.portalBaseDomain,NEVORA_OWNED_ISOLATED_TARGETS:JSON.stringify(c.targets),NEVORA_OWNED_ISOLATED_ORIGINS:JSON.stringify(c.origins),...financeBridgeEnvironment(c.finance?.bridge),...(c.finance?{NEVORA_COMMERCE_BINDING_KEY:c.finance.bindingKey}:{})};
}
/** Check the existing invocation marker and actual SQL identities before any
 * application process launches. This neither provisions nor adopts a database. */
export async function verifyOwnedIsolatedRuntime(options:OwnedIsolatedRuntime){
 ownedIsolatedEnvironment(options);
 const root=process.env.NEVORA_ONBOARDING_TEST_CUSTODY_DIR,marker=process.env.NEVORA_ONBOARDING_TEST_CUSTODY;
 if(!root||!marker||!/^[a-f0-9]{32}$/.test(marker))fail();
 const canonicalRoot=await realpath(root);
 const directory=await lstat(root),owner=await lstat(join(root,'owner'));
 if(!directory.isDirectory()||directory.isSymbolicLink()||directory.uid!==process.getuid?.()||(directory.mode&0o077)!==0||!owner.isFile()||owner.isSymbolicLink()||owner.nlink!==1||owner.uid!==process.getuid?.()||(owner.mode&0o777)!==0o600||await readFile(join(root,'owner'),'utf8')!==marker)fail();
 const control=new Pool({connectionString:options.controlDatabaseUrl,max:1,connectionTimeoutMillis:2000,statement_timeout:2000});
 try{if(await realpath((await control.query('SHOW data_directory')).rows[0].data_directory)!==join(canonicalRoot,'data'))fail();}finally{await control.end();}
 for(const target of options.targets){const pool=new Pool({connectionString:target.connectionUrl,max:1,connectionTimeoutMillis:2000,statement_timeout:2000});
  try{const row=(await pool.query("SELECT current_user role,datname name,oid::int oid,shobj_description(oid,'pg_database') marker FROM pg_database WHERE datname=current_database()")).rows[0];if(row?.name!==target.name||row.oid!==target.oid||row.marker!==target.marker||row.role!==new URL(target.uri).username)fail();}finally{await pool.end();}
 }
 if(options.finance)await readOwnedFinancialClock(options.finance.bridge,options.origins[0]);
}
export function isolatedTransportAdapter(original:string){
 const from="from '@neondatabase/serverless'";
 if(original.split(from).length!==2)fail();
 return original.replace(from,"from '../../test/integration/owned-isolated-neon'");
}
/** Node24 fetch omits an explicit Host override. Probe the owned ingress with
 * the same native HTTP header transport as the fixed browser domain proxy. */
export async function probeOwnedIsolatedRuntime(upstream:string,origin:string,signal?:AbortSignal):Promise<number|null>{
 const url=new URL(upstream),canonical=new URL(origin);
 if(url.origin!==upstream||url.protocol!=='http:'||url.hostname!=='127.0.0.1'||!url.port||canonical.origin!==origin||canonical.protocol!=='https:'||!canonical.hostname.endsWith('.example.invalid'))fail();
 if(signal?.aborted)return null;
 return new Promise(resolve=>{
  const pending=request(upstream+'/login',{method:'GET',agent:false,headers:{host:canonical.host,'x-forwarded-host':canonical.host,'x-forwarded-proto':'https'},signal:signal?AbortSignal.any([signal,AbortSignal.timeout(3000)]):AbortSignal.timeout(3000)},response=>{response.resume();resolve(response.statusCode??null);});
  pending.once('error',()=>resolve(null));pending.end();
 });
}
