import {it,expect} from 'vitest';
import {resourceIdentity,resourceMatches,classifyProviderFailure} from './model';
const key=Buffer.alloc(32,4).toString('base64url');
const operation={operationId:'170837ce-471d-4c6f-a322-aa73ce9863d6',workspaceId:'270837ce-471d-4c6f-a322-aa73ce9863d6',environment:'test' as const,accountRef:'fictional-org',region:'aws-us-east-1',createdAt:'2026-11-07T12:00:00.000Z'};
it('uses only generated custody identifiers for provider names and SQL principals',()=>{
 const a=resourceIdentity(operation,key),b=resourceIdentity(operation,key);expect(a).toEqual(b);expect(a.name).toMatch(/^nv-t-[a-f0-9]{32}-[a-f0-9]{16}$/);expect(a.provisionerRole).toMatch(/^nv_provision_[a-f0-9]{24}$/);expect(a.databaseName).toBe('nv_app_270837ce471d4c6fa322aa73ce9863d6');
 expect(resourceIdentity({...operation,workspaceId:'370837ce-471d-4c6f-a322-aa73ce9863d6'},key).name).not.toBe(a.name);
});
it('rejects foreign, ambiguous, wrong-region or older resources during recovery',()=>{
 const identity=resourceIdentity(operation,key),resource={projectId:'fictional-project',branchId:'br-fictional',endpointId:'ep-fictional',endpointHost:'ep-fictional.us-east-1.aws.neon.tech',accountRef:operation.accountRef,region:operation.region,name:identity.name,databaseName:identity.databaseName,provisionerRole:identity.provisionerRole,createdAt:'2026-11-07T12:00:01.000Z'};
 expect(resourceMatches(resource,operation,identity,Date.parse('2026-11-07T12:01:00Z'))).toBe(true);
 for(const patch of [{accountRef:'foreign-org'},{region:'aws-eu-central-1'},{name:'human-company-name'},{endpointHost:'foreign.invalid'},{databaseName:'postgres'},{createdAt:'2026-11-06T00:00:00Z'}])expect(resourceMatches({...resource,...patch},operation,identity,Date.parse('2026-11-07T12:01:00Z'))).toBe(false);
});
it('never treats a timeout/5xx/unknown create as permission to POST again',()=>{
 expect(classifyProviderFailure({status:429})).toBe('REJECTED');expect(classifyProviderFailure({status:503})).toBe('UNKNOWN');expect(classifyProviderFailure(new Error('socket closed'))).toBe('UNKNOWN');
});
