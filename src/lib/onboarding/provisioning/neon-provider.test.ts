import {it,expect,vi} from 'vitest';
import {NeonProvisioningProvider,readProvisionerPolicy} from './neon-provider.server';
import {resourceIdentity} from './model';
const request={operationId:'170837ce-471d-4c6f-a322-aa73ce9863d6',workspaceId:'270837ce-471d-4c6f-a322-aa73ce9863d6',environment:'test' as const,accountRef:'fictional-org',region:'aws-us-east-1',createdAt:new Date().toISOString()};
const identity=resourceIdentity(request,Buffer.alloc(32,4).toString('base64url'));
const policy={accountRef:'fictional-org',region:'aws-us-east-1',version:'fictional-policy',maxComputeUnits:0.25,suspendSeconds:60,historySeconds:86400,quota:{active_time_seconds:3600,compute_time_seconds:3600,written_data_bytes:104857600,data_transfer_bytes:104857600,logical_size_bytes:104857600}};
function fixture(){const calls:{url:string;init:RequestInit}[]=[];const fetcher=vi.fn(async(input:RequestInfo|URL,init:RequestInit={})=>{
 const url=new URL(String(input));calls.push({url:url.href,init});expect(url.origin).toBe('https://console.neon.tech');expect(init.redirect).toBe('error');
 const path=url.pathname.replace('/api/v2',''),project={id:'fictional-project',name:identity.name,org_id:policy.accountRef,region_id:policy.region,created_at:request.createdAt};
 if(path==='/regions')return Response.json({regions:[{region_id:policy.region}]});
 if(path==='/projects'&&init.method==='POST')return Response.json({project},{status:201});
 if(path==='/projects')return Response.json({projects:[project]});
 if(path==='/projects/fictional-project')return Response.json({project});
 if(path.endsWith('/branches'))return Response.json({branches:[{id:'br-fictional',project_id:project.id,name:'onboarding'}]});
 if(path.endsWith('/endpoints'))return Response.json({endpoints:[{id:'ep-fictional',host:'ep-fictional.us-east-1.aws.neon.tech',project_id:project.id,branch_id:'br-fictional',type:'read_write'}]});
 if(path.endsWith('/databases'))return Response.json({databases:[{name:identity.databaseName,owner_name:identity.provisionerRole,branch_id:'br-fictional'}]});
 if(path.endsWith('/operations'))return Response.json({operations:[{status:'finished'}]});
 if(path.endsWith('/connection_uri'))return Response.json({uri:`postgresql://${identity.provisionerRole}:fictional-secret@ep-fictional.us-east-1.aws.neon.tech/${identity.databaseName}?sslmode=require`});
 throw Error('Unexpected fictional provider endpoint');
 });return {calls,fetcher,provider:new NeonProvisioningProvider({apiKey:'fictional-api-key-never-live',policy,fetch:fetcher})};}
it('constructs an explicit empty project request with bounded approved resource policy and no parent or invented idempotency API',async()=>{
 const f=fixture(),r=await f.provider.create(request,identity),post=f.calls.find(c=>c.init.method==='POST')!;expect(r.databaseName).toBe(identity.databaseName);const body=JSON.parse(String(post.init.body));expect(body.project).toMatchObject({name:identity.name,org_id:policy.accountRef,region_id:policy.region,pg_version:17,branch:{name:'onboarding',database_name:identity.databaseName,role_name:identity.provisionerRole},default_endpoint_settings:{autoscaling_limit_min_cu:0.25,autoscaling_limit_max_cu:0.25,suspend_timeout_seconds:60},settings:{quota:policy.quota}});expect(JSON.stringify(body)).not.toMatch(/parent|annotation|idempotency/i);
});
it('resolves exact organization/region/root-branch/endpoint/database custody and returns a strict bootstrap URI',async()=>{
 const f=fixture(),found=await f.provider.find(request,identity);expect(found).toHaveLength(1);const url=new URL(await f.provider.bootstrapCredential(found[0]));expect(url.username).toBe(identity.provisionerRole);expect(url.searchParams.get('sslmode')).toBe('verify-full');
});
it('reconciles a created project when Neon echoes a terminal cursor on the following empty operation and project pages',async()=>{
 const f=fixture(),seen:string[]=[];
 const fetcher:typeof fetch=async(input,init={})=>{const u=new URL(String(input));seen.push(u.pathname+u.search);
  if(u.pathname.endsWith('/operations'))return Response.json({operations:u.searchParams.has('cursor')?[]:[{status:'finished'}],pagination:{cursor:'2026-11-08T23:59:58.173563Z'}});
  if(u.pathname==='/api/v2/projects'&&u.searchParams.has('cursor'))return Response.json({projects:[],pagination:{cursor:'fictional-project'}});
  const response=await f.fetcher(input,init),data=await response.json();if(u.pathname==='/api/v2/projects')data.pagination={cursor:'fictional-project'};return Response.json(data);
 };
 const p=new NeonProvisioningProvider({apiKey:'fictional-api-key-never-live',policy,fetch:fetcher});expect(await p.find(request,identity)).toHaveLength(1);
 expect(seen.filter(p=>p.includes('/operations?'))).toHaveLength(2);expect(seen.filter(p=>p.startsWith('/api/v2/projects?'))).toHaveLength(2);expect(f.calls.some(c=>c.init.method==='POST')).toBe(false);
});
it.each(['running','failed'])('withholds a resource whose later operation page contains a %s operation',async status=>{
 const f=fixture();const fetcher:typeof fetch=async(input,init)=>{const u=new URL(String(input));if(u.pathname.endsWith('/operations'))return Response.json(u.searchParams.has('cursor')?{operations:[{status}]}:{operations:[{status:'finished'}],pagination:{cursor:'page-two'}});return f.fetcher(input,init);};
 await expect(new NeonProvisioningProvider({apiKey:'fictional-api-key-never-live',policy,fetch:fetcher}).find(request,identity)).rejects.toThrow('Provisioning provider unavailable');
});
it('withholds a resource when a full operation page omits its continuation cursor',async()=>{
 const f=fixture(),fetcher:typeof fetch=async(input,init)=>new URL(String(input)).pathname.endsWith('/operations')?Response.json({operations:Array.from({length:1000},()=>({status:'finished'}))}):f.fetcher(input,init);
 await expect(new NeonProvisioningProvider({apiKey:'fictional-api-key-never-live',policy,fetch:fetcher}).find(request,identity)).rejects.toThrow('Provisioning provider unavailable');
});
it('bounds repeated nonempty operation cursors without accepting incomplete history',async()=>{
 const f=fixture();let reads=0;const fetcher:typeof fetch=async(input,init)=>{if(new URL(String(input)).pathname.endsWith('/operations')){reads++;return Response.json({operations:[{status:'finished'}],pagination:{cursor:'repeated'}});}return f.fetcher(input,init);};
 await expect(new NeonProvisioningProvider({apiKey:'fictional-api-key-never-live',policy,fetch:fetcher}).find(request,identity)).rejects.toThrow('Provisioning provider unavailable');expect(reads).toBeLessThanOrEqual(3);
});
it('rejects cross-account requests and an unlimited/absent resource policy without any API call',async()=>{
 const f=fixture();await expect(f.provider.create({...request,accountRef:'foreign-org'},identity)).rejects.toThrow();expect(f.fetcher).not.toHaveBeenCalled();expect(readProvisionerPolicy({})).toBeNull();expect(readProvisionerPolicy({NEVORA_PROVISIONER_RESOURCE_POLICY:JSON.stringify({...policy,quota:{...policy.quota,compute_time_seconds:0}})})).toBeNull();
});
it('sanitizes provider failures and never retries a POST inside the adapter',async()=>{
 const fetcher=vi.fn(async()=>new Response('private provider diagnostics',{status:429,headers:{'retry-after':'120'}}));const p=new NeonProvisioningProvider({apiKey:'fictional-api-key-never-live',policy,fetch:fetcher});await expect(p.find(request,identity)).rejects.toMatchObject({status:429,retryAfterSeconds:120,message:'Provisioning provider unavailable'});expect(fetcher).toHaveBeenCalledTimes(1);
});
it('treats a read failure after an acknowledged project create as unknown creation, even if that read returns429',async()=>{
 const f=fixture();let created=false;const fetcher=vi.fn(async(input:RequestInfo|URL,init:RequestInit={})=>{const url=new URL(String(input));if(created&&url.pathname==='/api/v2/projects/fictional-project')return new Response('private read diagnostics',{status:429,headers:{'retry-after':'120'}});const response=await f.fetcher(input,init);if(init.method==='POST')created=true;return response;});
 const p=new NeonProvisioningProvider({apiKey:'fictional-api-key-never-live',policy,fetch:fetcher});await expect(p.create(request,identity)).rejects.toMatchObject({status:503,retryAfterSeconds:120});expect(fetcher.mock.calls.filter(([,init])=>init?.method==='POST')).toHaveLength(1);
});
it('permits only the pinned endpoint default PostgreSQL port for bootstrap credentials',async()=>{
 const {checkedBootstrapUri}=await import('./connection.server'),f=fixture(),resource=(await f.provider.find(request,identity))[0];
 const raw=`postgresql://${identity.provisionerRole}:fictional-secret@${resource.endpointHost}:5432/${identity.databaseName}?sslmode=require`;
 expect(new URL(checkedBootstrapUri(raw,resource)).port).toBe('');expect(()=>checkedBootstrapUri(raw.replace(':5432/',':4444/'),resource)).toThrow();
});
it('supports an explicitly selected Free provider-default suspension policy without sending an unsupported override or dropping quotas',async()=>{
 const selected={...policy,suspensionMode:'provider_default' as const,suspendSeconds:300,historySeconds:21600};
 expect(readProvisionerPolicy({NEVORA_PROVISIONER_RESOURCE_POLICY:JSON.stringify(selected)})).toMatchObject(selected);
 const f=fixture();let sent:Record<string,unknown>|undefined;
 const fetcher:typeof fetch=async(input,init={})=>{
  const response=await f.fetcher(input,init),data=await response.json(),path=new URL(String(input)).pathname;
  if(init.method==='POST'){sent=JSON.parse(String(init.body)).project;expect((sent!.default_endpoint_settings as object)).not.toHaveProperty('suspend_timeout_seconds');expect(sent!.settings).toEqual({quota:policy.quota});}
  if(path==='/api/v2/projects/fictional-project')Object.assign(data.project,{default_endpoint_settings:{autoscaling_limit_min_cu:0.25,autoscaling_limit_max_cu:0.25,suspend_timeout_seconds:0},history_retention_seconds:21600,settings:{quota:policy.quota}});
  if(path.endsWith('/endpoints'))Object.assign(data.endpoints[0],{autoscaling_limit_min_cu:0.25,autoscaling_limit_max_cu:0.25,suspend_timeout_seconds:0});
  return Response.json(data,{status:response.status});
 };
 const provider=new NeonProvisioningProvider({apiKey:'fictional-api-key-never-live',policy:selected,fetch:fetcher});expect((await provider.create(request,identity)).databaseName).toBe(identity.databaseName);expect(sent).toBeTruthy();
 expect(readProvisionerPolicy({NEVORA_PROVISIONER_RESOURCE_POLICY:JSON.stringify({...selected,maxComputeUnits:1})})).toBeNull();
});

it.each([37,{unexpected:true}])('rejects a malformed cursor on an empty project page: %j',async bad=>{const provider=new NeonProvisioningProvider({apiKey:'fictional-api-key-never-live',policy,fetch:async()=>Response.json({projects:[],pagination:{cursor:bad}})});await expect(provider.find(request,identity)).rejects.toThrow();});
it('follows a new cursor on an empty project page instead of authorizing a negative lookup',async()=>{const f=fixture();let pages=0;const provider=new NeonProvisioningProvider({apiKey:'fictional-api-key-never-live',policy,fetch:async(input,init)=>{const u=new URL(String(input));if(u.pathname==='/api/v2/projects'){pages++;if(!u.searchParams.has('cursor'))return Response.json({projects:[],pagination:{cursor:'new-page'}});return f.fetcher(input,init);}return f.fetcher(input,init);}});expect(await provider.find(request,identity)).toHaveLength(1);expect(pages).toBe(2);});
it.each([37,'new-operation-page'])('does not skip an empty operations page with an unvalidated continuation: %j',async cursor=>{const f=fixture();const provider=new NeonProvisioningProvider({apiKey:'fictional-api-key-never-live',policy,fetch:async(input,init)=>String(input).includes('/operations')?(new URL(String(input)).searchParams.has('cursor')?Response.json({operations:[{status:'running'}]}):Response.json({operations:[],pagination:{cursor}})):f.fetcher(input,init)});await expect(provider.find(request,identity)).rejects.toThrow();});
