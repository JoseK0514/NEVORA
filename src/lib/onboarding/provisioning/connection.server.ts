import 'server-only';
import {Client} from 'pg';
import type {ProvisionedResource} from './model';
import type {BootstrapConnector} from './provider';
export function checkedBootstrapUri(raw:string,resource:ProvisionedResource):string{
 const u=new URL(raw);if(!['postgres:','postgresql:'].includes(u.protocol)||u.hostname!==resource.endpointHost||!u.hostname.endsWith('.neon.tech')||(u.port!==''&&u.port!=='5432')||decodeURIComponent(u.username)!==resource.provisionerRole||!u.password||decodeURIComponent(u.pathname.slice(1))!==resource.databaseName||u.hash||[...u.searchParams.keys()].some(k=>!['sslmode','channel_binding'].includes(k)))throw Error('Provisioning credential target unavailable');
 u.port='';u.searchParams.set('sslmode','verify-full');return u.href;
}
export function runtimeWorkspaceUri(resource:ProvisionedResource,role:string,password:string):string{
 if(!/^nv_(app|worker)_[a-f0-9]{24}$/.test(role)||!/^[A-Za-z0-9_-]{43}$/.test(password)||!/^[a-z0-9.-]+\.neon\.tech$/.test(resource.endpointHost)||!/^nv_app_[a-f0-9]{32}$/.test(resource.databaseName))throw Error('Runtime credential target unavailable');
 const u=new URL('postgresql://'+resource.endpointHost+'/'+resource.databaseName);u.username=role;u.password=password;u.searchParams.set('sslmode','verify-full');return u.href;
}
export const connectBootstrap:BootstrapConnector=async(resource,raw)=>{
 const client=new Client({connectionString:checkedBootstrapUri(raw,resource),connectionTimeoutMillis:8000,query_timeout:45000,statement_timeout:30000,application_name:'nevora-onboarding-provisioner'});
 try{await client.connect();return {client,close:()=>client.end()};}catch{await client.end().catch(()=>{});throw Error('Provisioning database unavailable');}
};
