import {it,expect,vi} from 'vitest';
import {readFileSync} from 'node:fs';
import {ownedIsolatedEnvironment,isolatedTransportAdapter,type OwnedIsolatedRuntime} from './owned-isolated-runtime';
const options=():OwnedIsolatedRuntime=>({environment:'test',controlDatabaseUrl:'postgresql://nv_onboard_aaaaaaaa:fictional@127.0.0.1:54321/nv_onboarding_test_aaaaaaaaaaaaaaaaaaaa',encryptionKey:Buffer.alloc(32,1).toString('base64url'),tokenKey:Buffer.alloc(32,2).toString('base64url'),portalBaseDomain:'portal.example.invalid',origins:['https://alpha.portal.example.invalid'],targets:[{uri:'postgresql://nv_app_aaaaaaaaaaaaaaaaaaaaaaaa:fictional@ep-aaaaaaaa.us-east-1.aws.neon.tech/nv_app_aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa?sslmode=require',connectionUrl:'postgresql://nv_app_aaaaaaaaaaaaaaaaaaaaaaaa:fictional@127.0.0.1:54321/nv_app_aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',name:'nv_app_aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',oid:1234,marker:'nevora-step4-owned:11111111-1111-4111-8111-111111111111'}]});
it('ordinary browser fixtures ignore ambient isolated/provider credentials',()=>{
 vi.stubEnv('NEVORA_OWNED_ISOLATED_TARGETS','ambient');vi.stubEnv('DATABASE_URL','ambient-production');
 try{expect(ownedIsolatedEnvironment()).toEqual({});}finally{vi.unstubAllEnvs();}
});
it('accepts explicit fictional loopback mappings without manufacturing a verified SQL identity',()=>{
 const value=options(),env=ownedIsolatedEnvironment(value);expect(env.NEVORA_WORKSPACE_MODE).toBe('isolated');expect(env.NEVORA_ONBOARDING_ENVIRONMENT).toBe('test');expect(JSON.parse(env.NEVORA_OWNED_ISOLATED_TARGETS)).toEqual(value.targets);expect(env.DATABASE_URL).toBeUndefined();
});
it.each(['live-mode','remote-control','foreign-control','remote-company','foreign-company','different-server','wrong-role','wrong-secret','missing-marker','invalid-oid','real-domain','foreign-origin','duplicate-uri','root-key-reuse'] as const)('rejects an unowned browser-runtime selector: %s',change=>{
 const value=options();
 if(change==='live-mode')Object.assign(value,{environment:'production'});
 if(change==='remote-control')value.controlDatabaseUrl=value.controlDatabaseUrl.replace('127.0.0.1','host.example.invalid');
 if(change==='foreign-control')value.controlDatabaseUrl=value.controlDatabaseUrl.replace('nv_onboarding_test_aaaaaaaaaaaaaaaaaaaa','postgres');
 if(change==='remote-company')value.targets[0].connectionUrl=value.targets[0].connectionUrl.replace('127.0.0.1','host.example.invalid');
 if(change==='foreign-company')value.targets[0].name='existing_customer_database';
 if(change==='different-server')value.targets[0].connectionUrl=value.targets[0].connectionUrl.replace(':54321',':54322');
 if(change==='wrong-role')value.targets[0].connectionUrl=value.targets[0].connectionUrl.replace('nv_app_aaaaaaaaaaaaaaaaaaaaaaaa:','nv_provision_aaaaaaaaaaaaaaaaaaaaaaaa:');
 if(change==='wrong-secret')value.targets[0].connectionUrl=value.targets[0].connectionUrl.replace(':fictional@',':different@');
 if(change==='missing-marker')value.targets[0].marker='';
 if(change==='invalid-oid')value.targets[0].oid=0;
 if(change==='real-domain')value.portalBaseDomain='nevora.team';
 if(change==='foreign-origin')value.origins=['https://alpha.other.example.invalid'];
 if(change==='duplicate-uri')value.targets.push({...value.targets[0]});
 if(change==='root-key-reuse')value.tokenKey=value.encryptionKey;
 expect(()=>ownedIsolatedEnvironment(value)).toThrow();
});
it('changes only the SQL transport import and retains every original routing and authority byte',()=>{
 const original=readFileSync('src/lib/workspace-routing/transport.server.ts','utf8'),derived=isolatedTransportAdapter(original);
 expect(derived.replace("from '../../test/integration/owned-isolated-neon'","from '@neondatabase/serverless'")).toBe(original);
 expect(()=>isolatedTransportAdapter(original.replace("from '@neondatabase/serverless'","from 'unreviewed-driver'"))).toThrow();
});
