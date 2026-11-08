import 'server-only';
import {validOnboardingToken} from '../onboarding/crypto.server';
import {validWorkspaceSlug} from '../onboarding/contracts';

export type WorkspaceRoutingConfig={environment:'test'|'development'|'production';portalBaseDomain:string;controlDatabaseUrl:string;encryptionKey:string;tokenKey:string};
export class WorkspaceRoutingError extends Error{constructor(){super('Workspace is unavailable');}}
export function workspaceMode(env:Readonly<Record<string,string|undefined>>=process.env):'single_company'|'isolated'{const mode=env.NEVORA_WORKSPACE_MODE??'single_company';if(mode!=='single_company'&&mode!=='isolated')throw new WorkspaceRoutingError();return mode;}
export function readWorkspaceRoutingConfig(env:Readonly<Record<string,string|undefined>>=process.env):WorkspaceRoutingConfig{
 if(workspaceMode(env)!=='isolated')throw new WorkspaceRoutingError();
 const environment=env.NEVORA_ONBOARDING_ENVIRONMENT,portalBaseDomain=env.NEVORA_PORTAL_BASE_DOMAIN,encryptionKey=env.NEVORA_ONBOARDING_TOKEN_ENCRYPTION_KEY,tokenKey=env.NEVORA_WORKSPACE_TOKEN_SECRET;
 if(!['test','development','production'].includes(environment??'')||!portalBaseDomain||!/^([a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z][a-z0-9-]*$/.test(portalBaseDomain)||!validOnboardingToken(encryptionKey)||!validOnboardingToken(tokenKey)||tokenKey===encryptionKey)throw new WorkspaceRoutingError();
 try{const url=new URL(env.NEVORA_CONTROL_DATABASE_URL??'');if(!['postgres:','postgresql:'].includes(url.protocol)||!url.hostname||!url.pathname.slice(1)||['postgres','template0','template1'].includes(url.pathname.slice(1))||url.hash||(environment==='production'&&(url.searchParams.get('sslmode')!=='verify-full'||['localhost','127.0.0.1','[::1]'].includes(url.hostname))))throw new WorkspaceRoutingError();return {environment:environment as WorkspaceRoutingConfig['environment'],portalBaseDomain,controlDatabaseUrl:url.href,encryptionKey,tokenKey};}catch{throw new WorkspaceRoutingError();}
}
export function parseWorkspaceOrigin(value:unknown,config:Pick<WorkspaceRoutingConfig,'portalBaseDomain'|'environment'>):string|null{
 if(typeof value!=='string'||value.length>300||!/^https?:\/\/[a-z0-9.-]+(?::[0-9]{1,5})?\/?$/i.test(value))return null;
 try{const u=new URL(value),suffix='.'+config.portalBaseDomain;if(u.pathname!=='/'||u.search||u.hash||u.username||u.password||!u.hostname.endsWith(suffix))return null;const slug=u.hostname.slice(0,-suffix.length);if(!validWorkspaceSlug(slug))return null;const local=u.hostname.endsWith('.localhost');if(u.protocol!=='https:'&&!(config.environment!=='production'&&local))return null;return u.origin;}catch{return null;}
}
