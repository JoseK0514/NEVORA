import {sameProvisionedResource} from '@/lib/onboarding/provisioning/model';
import {Client} from 'pg';
import {freshOnboardingDatabase} from './onboarding-fixture';
import type {ResourceRequest,ResourceIdentity,ProvisionedResource} from '@/lib/onboarding/provisioning/model';
import type {ProvisioningProvider,BootstrapConnector} from '@/lib/onboarding/provisioning/provider';
export class OwnedProvisioningProvider implements ProvisioningProvider{
 createCalls=0;findCalls=0;rejectNextCreate=false;loseNextCreateResponse=false;loseNextBootstrapCommit=false;foreignLookup=false;hideNextLookup=false;failNextLookup=false;onFind:(()=>Promise<void>)|undefined;
 readonly resources=new Map<string,{resource:ProvisionedResource;uri:string;db:Awaited<ReturnType<typeof freshOnboardingDatabase>>;identity:ResourceIdentity}>();
 async create(request:ResourceRequest,identity:ResourceIdentity):Promise<ProvisionedResource>{
  this.createCalls++;if(this.rejectNextCreate){this.rejectNextCreate=false;throw Object.assign(Error('Fictional provider rejected create'),{status:429});}
  const db=await freshOnboardingDatabase(identity.databaseName),admin=new Client({connectionString:db.connectionUrl});await admin.connect();
  try{await admin.query(`CREATE ROLE ${identity.provisionerRole} LOGIN NOSUPERUSER NOCREATEDB CREATEROLE NOINHERIT NOBYPASSRLS NOREPLICATION PASSWORD 'fictional-owned-provisioner-password'`);await admin.query('ALTER DATABASE '+db.name+' OWNER TO '+identity.provisionerRole);}finally{await admin.end();}
  const url=new URL(db.connectionUrl);url.username=identity.provisionerRole;url.password='fictional-owned-provisioner-password';
  const suffix=request.workspaceId.replaceAll('-',''),resource={projectId:'p-'+suffix,branchId:'br-'+suffix,endpointId:'ep-'+suffix,endpointHost:'ep-'+suffix+'.us-east-1.aws.neon.tech',accountRef:request.accountRef,region:request.region,name:identity.name,databaseName:identity.databaseName,provisionerRole:identity.provisionerRole,createdAt:new Date().toISOString()};
  this.resources.set(resource.projectId,{resource,uri:url.href,db,identity});
  if(this.loseNextCreateResponse){this.loseNextCreateResponse=false;throw Error('Fictional create reply lost after resource creation');}return {...resource};
 }
 async find(_request:ResourceRequest,identity:ResourceIdentity):Promise<ProvisionedResource[]>{this.findCalls++;await this.onFind?.();if(this.failNextLookup){this.failNextLookup=false;throw Error('Fictional metadata read unavailable');}if(this.hideNextLookup){this.hideNextLookup=false;return [];}return [...this.resources.values()].filter(x=>x.resource.name===identity.name).map(x=>({...x.resource,...(this.foreignLookup?{accountRef:'foreign-org'}:{})}));}
 async bootstrapCredential(resource:ProvisionedResource):Promise<string>{const x=this.resources.get(resource.projectId);if(!x||!sameProvisionedResource(resource,x.resource))throw Error('Non-owned fake provider target');return x.uri;}
 readonly connect:BootstrapConnector=async(resource,url)=>{
  const x=this.resources.get(resource.projectId);if(!x||x.uri!==url||new URL(url).hostname!=='127.0.0.1')throw Error('Non-owned fake bootstrap target');
  const client=new Client({connectionString:url});await client.connect();const wrapped=new Proxy(client,{get:(target,key)=>{
   if(key==='query')return async(...args:unknown[])=>{const result=await Reflect.apply(target.query,target,args);if(this.loseNextBootstrapCommit&&typeof args[0]==='string'&&args[0].trim()==='COMMIT'){this.loseNextBootstrapCommit=false;throw Error('Fictional commit reply lost');}return result;};return Reflect.get(target,key);
  }});
  return {client:wrapped,close:()=>client.end()};
 };
 async close(){
  for(const x of this.resources.values())await x.db.close();
  if(this.resources.size){const cleanup=await freshOnboardingDatabase();try{for(const x of this.resources.values())for(const role of [x.identity.appRole,x.identity.workerRole,x.identity.provisionerRole])await cleanup.pool.query('DROP ROLE IF EXISTS '+role);}finally{await cleanup.close();}}
 }
}
