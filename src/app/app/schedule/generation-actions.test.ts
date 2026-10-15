import { managementProof } from '../../../test/fixtures/management';
import type { UserRole } from '../../../lib/domain';
import { beforeEach, expect, it, vi } from 'vitest';
import { GenerationConflictError, GenerationPermissionError, GenerationScopeError, GenerationTargetNotDraftError } from '../../../lib/data/generation-guards';
const f = vi.hoisted(() => ({ role:'MANAGER', generate:vi.fn(), clear:vi.fn(), revalidate:vi.fn(), publish:vi.fn(), provider:vi.fn() }));
vi.mock('@/lib/auth/session',()=>({requireSession:async()=>managementProof('authenticated-manager',f.role as UserRole).employee,requireSessionMutationProof:async()=>managementProof('authenticated-manager',f.role as UserRole)}));
vi.mock('next/navigation',()=>({redirect:(destination:string)=>{throw Object.assign(new Error('redirect'),{destination});}}));
vi.mock('next/cache',()=>({revalidatePath:f.revalidate}));
vi.mock('@/lib/data/workspaces',()=>({getWorkspace:async()=>({id:'authenticated-workspace',active:true})}));
vi.mock('@/lib/data/employees',()=>({listLocations:async()=>[{id:'north',shortName:'North'}]}));
vi.mock('@/lib/data/positions',()=>({listPositions:async()=>[{id:'cashier',name:'Cashier'}]}));
vi.mock('@/lib/data/schedule-generation',()=>({generateWeekDraft:f.generate}));
vi.mock('@/lib/data/generation-exclusions',()=>({clearGenerationExclusion:f.clear}));
vi.mock('@/lib/data/publication-revisions',()=>({publishScheduleWithRevision:f.publish}));
vi.mock('@/lib/notifications/provider',()=>({send:f.provider}));
vi.mock('@/lib/data/generation-guards',()=>import('../../../lib/data/generation-guards'));
vi.mock('@/lib/auth/permissions',()=>import('../../../lib/auth/permissions'));
vi.mock('@/lib/date-utils',()=>import('../../../lib/date-utils'));
vi.mock('@/lib/scheduling/validate-shift',()=>import('../../../lib/scheduling/validate-shift'));
import { generateWeekAction, clearGenerationExclusionAction } from './generation-actions';
const idle={status:'idle' as const,message:''};
function form(patch:Record<string,string|undefined>={}) {const d=new FormData(); Object.entries({weekStart:'2026-10-05',mode:'BUILD_WEEK',scope:'SELECTED',locationId:'north',...patch}).forEach(([k,v])=>d.set(k,v!));return d;}
function result(patch:Record<string,unknown>={}) {return {status:'COMPLETE',changed:true,weekStart:'2026-10-05',mode:'BUILD_WEEK',locationIds:['north'],summary:{added:2,removed:0,preserved:1,createdSchedules:0,changedScheduleIds:['internal'],coverage:{requiredMinutes:480,coveredMinutes:480,percentage:100,unavailable:false}},gaps:[],explanations:[],warnings:[],excludedLocations:[],metrics:{},...patch};}
beforeEach(()=>{vi.clearAllMocks();f.role='MANAGER';f.generate.mockResolvedValue(result());f.clear.mockResolvedValue({status:'cleared'});});
it.each(['OWNER','MANAGER'])('permits authenticated %s and derives both identities',async role=>{f.role=role;expect((await generateWeekAction(idle,form())).status).toBe('success');expect(f.generate).toHaveBeenCalledWith({proof:managementProof('authenticated-manager',f.role as UserRole),workspaceId:'authenticated-workspace',actorEmployeeId:'authenticated-manager',weekStart:'2026-10-05',mode:'BUILD_WEEK',locationScope:{kind:'SELECTED',locationIds:['north']}});expect(f.revalidate).toHaveBeenCalledWith('/app/schedule');expect(f.publish).not.toHaveBeenCalled();expect(f.provider).not.toHaveBeenCalled();});
it.each(['EMPLOYEE','LEAD'])('rejects %s through the real server role helper',async role=>{f.role=role;await expect(generateWeekAction(idle,form())).rejects.toMatchObject({destination:'/app'});expect(f.generate).not.toHaveBeenCalled();});
it.each([{actorEmployeeId:'forged'},{workspaceId:'forged'},{weekStart:'2026-10-06'},{weekStart:'2026-02-30'},{scope:'UNKNOWN'},{scope:'ALL',locationId:'north'},{locationId:'foreign'},{mode:'PUBLISH'},{maxNodes:'999999'}])('rejects forged or invalid input %j before service',async patch=>{expect((await generateWeekAction(idle,form(patch))).status).toBe('error');expect(f.generate).not.toHaveBeenCalled();});
it('rejects duplicate values and accepts explicit all-location fill',async()=>{const d=form();d.append('mode','FILL_GAPS_ONLY');expect((await generateWeekAction(idle,d)).status).toBe('error');const all=form({mode:'FILL_GAPS_ONLY',scope:'ALL'});all.delete('locationId');await generateWeekAction(idle,all);expect(f.generate).toHaveBeenCalledWith(expect.objectContaining({locationScope:{kind:'ALL'},mode:'FILL_GAPS_ONLY'}));});
it.each([[new GenerationConflictError(),'changed'],[new GenerationScopeError(),'Draft'],[new GenerationPermissionError(),'permission'],[new Error('PRIVATE medical note'),'try again']])('returns safe typed failure %s',async(error,copy)=>{f.generate.mockRejectedValue(error);const state=await generateWeekAction(idle,form());expect(state.status).toBe('error');expect(state.message).toContain(copy);expect(JSON.stringify(state)).not.toContain('PRIVATE');expect(f.revalidate).not.toHaveBeenCalled();});
it('projects actual counts/gaps without source, private reasons or candidate IDs',async()=>{f.generate.mockResolvedValue(result({status:'PARTIAL',source:{phone:'PRIVATE'},gaps:[{locationId:'north',date:'2026-10-05',startTime:'08:00',endTime:'16:00',missingStaff:1,missingLead:true,positions:[{positionId:'cashier',missing:1}]}],explanations:[{code:'TIME_OFF_CONFLICT',distinctEmployeeCount:3,employeeIds:['PRIVATE'],message:'PRIVATE medical reason'}],warnings:[{code:'OUTSIDE_AVAILABILITY',message:'PRIVATE'}],excludedLocations:[{locationId:'north',state:'NEEDS_SETUP',issues:[{message:'PRIVATE'}]}]}));const state=await generateWeekAction(idle,form());expect(state.message).toContain('Partial');expect(state.result?.summary.added).toBe(2);expect(state.result?.gaps[0]).toMatchObject({locationName:'North',missingLead:true,positions:[{name:'Cashier',missing:1}]});expect(JSON.stringify(state)).toContain('3 employees');expect(JSON.stringify(state)).not.toContain('PRIVATE');expect(JSON.stringify(state)).not.toContain('internal');});
it.each([['COMPLETE',false,'No changes'],['INVALID',false,'Needs setup'],['BUDGET_EXHAUSTED',true,'limit'],['PARTIAL',false,'No legal additions']])('distinguishes %s/no-op outcome',async(status,changed,copy)=>{f.generate.mockResolvedValue(result({status,changed,summary:{...result().summary,added:0}}));expect((await generateWeekAction(idle,form())).message).toContain(copy);});
it('clears only the selected exclusion with server identities, then revalidates without generation',async()=>{const d=new FormData();Object.entries({weekStart:'2026-10-05',locationId:'north',exclusionId:'event'}).forEach(([k,v])=>d.set(k,v));expect((await clearGenerationExclusionAction(idle,d)).message).toContain('Automatic fill allowed');expect(f.clear).toHaveBeenCalledWith({proof:managementProof('authenticated-manager',f.role as UserRole),workspaceId:'authenticated-workspace',actorEmployeeId:'authenticated-manager',weekStart:'2026-10-05',locationId:'north',exclusionId:'event'});expect(f.generate).not.toHaveBeenCalled();expect(f.publish).not.toHaveBeenCalled();});
it('repeated clear remains useful and invalid/forged clears write nothing',async()=>{const d=new FormData();Object.entries({weekStart:'2026-10-05',locationId:'north',exclusionId:'event'}).forEach(([k,v])=>d.set(k,v));f.clear.mockResolvedValue({status:'already-cleared'});expect((await clearGenerationExclusionAction(idle,d)).status).toBe('success');d.set('actorEmployeeId','forged');expect((await clearGenerationExclusionAction(idle,d)).status).toBe('error');expect(f.clear).toHaveBeenCalledTimes(1);});

// Real installed SSR + RSC codecs catch hidden transport fields that ordinary
// function-action browser doubles do not emit. No Next app/session/DB is started.
import { createElement, useActionState } from 'react';
import { renderToReadableStream } from 'react-dom/server';
import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
const installedRequire = createRequire(import.meta.url);
const installedClient = installedRequire('next/dist/compiled/react-server-dom-webpack/client.edge') as {
  createServerReference(id:string):(previous:typeof idle,form:FormData)=>Promise<typeof idle>;
  encodeReply(value:unknown):Promise<string|FormData>;
};
const codecModule:{exports:{decodeReply:(body:string|FormData,manifest:object)=>Promise<[typeof idle,FormData]>;decodeAction:(form:FormData,manifest:object)=>Promise<null|(()=>[typeof idle,FormData])>}} = {exports:{}} as typeof codecModule;
const codecGlobals=Object.create(globalThis) as typeof globalThis & {__next_require__:(id:string)=>unknown};
codecGlobals.__next_require__=()=>({action:(...args:unknown[])=>args});
new Function('require','module','exports','globalThis',readFileSync(installedRequire.resolve('next/dist/compiled/react-server-dom-webpack/cjs/react-server-dom-webpack-server.node.development.js'),'utf8'))(
  (id:string)=>id==='react'?installedRequire('next/dist/compiled/react/cjs/react.react-server.development.js'):installedRequire(id),codecModule,codecModule.exports,codecGlobals,
);
async function installedForm(business:FormData) {
  const reference=installedClient.createServerReference('fictional-action');
  function ActionForm() {
    const [,action]=useActionState(reference,idle);
    return createElement('form',{action},[...business].map(([name,value])=>createElement('input',{key:name,type:'hidden',name,value:String(value)})));
  }
  const html=await new Response(await renderToReadableStream(createElement(ActionForm))).text();
  const data=new FormData();
  for(const input of html.matchAll(/<input\b[^>]*>/g)) {
    const name=/\bname="([^"]+)"/.exec(input[0])?.[1];
    const value=/\bvalue="([^"]*)"/.exec(input[0])?.[1] ?? '';
    if(name) data.append(name,value.replaceAll('&quot;','"').replaceAll('&#x27;',"'").replaceAll('&amp;','&').replaceAll('&lt;','<').replaceAll('&gt;','>'));
  }
  return data;
}
it.each(['BUILD_WEEK','FILL_GAPS_ONLY'])('accepts installed SSR/RSC hydrated %s transport without granting metadata authority',async mode=>{
  const data=await installedForm(form({mode}));
  expect([...data.keys()].filter(k=>k.startsWith('$ACTION_'))).toEqual(['$ACTION_REF_1','$ACTION_1:0','$ACTION_1:1','$ACTION_KEY']);
  const [,decoded]=await codecModule.exports.decodeReply(await installedClient.encodeReply([idle,data]),{});
  expect((await generateWeekAction(idle,decoded)).status).toBe('success');
  expect(f.generate).toHaveBeenCalledWith(expect.objectContaining({actorEmployeeId:'authenticated-manager',workspaceId:'authenticated-workspace',mode}));
  expect(JSON.stringify(f.generate.mock.calls)).not.toContain('$ACTION_');
});
it('installed native generation strips framework fields and retains exact business mode/scope',async()=>{
  const data=await installedForm(form({mode:'FILL_GAPS_ONLY'}));
  const native=await codecModule.exports.decodeAction(data,{'fictional-action':{id:'fictional-module',chunks:[],name:'action'}});
  const [,nativeForm]=native!();
  expect([...nativeForm.keys()]).toEqual(['weekStart','mode','scope','locationId']);
  expect((await generateWeekAction(idle,nativeForm)).status).toBe('success');
  expect(f.generate).toHaveBeenCalledWith(expect.objectContaining({mode:'FILL_GAPS_ONLY',locationScope:{kind:'SELECTED',locationIds:['north']}}));
});
it('accepts installed SSR/RSC metadata on clear without generation and preserves native postback stripping',async()=>{
  const business=new FormData();Object.entries({weekStart:'2026-10-05',locationId:'north',exclusionId:'event'}).forEach(([k,v])=>business.set(k,v));
  const data=await installedForm(business);
  const [,decoded]=await codecModule.exports.decodeReply(await installedClient.encodeReply([idle,data]),{});
  expect((await clearGenerationExclusionAction(idle,decoded)).status).toBe('success');
  expect(f.clear).toHaveBeenCalledWith({proof:managementProof('authenticated-manager',f.role as UserRole),actorEmployeeId:'authenticated-manager',workspaceId:'authenticated-workspace',weekStart:'2026-10-05',locationId:'north',exclusionId:'event'});
  expect(f.generate).not.toHaveBeenCalled();
  const native=await codecModule.exports.decodeAction(data,{'fictional-action':{id:'fictional-module',chunks:[],name:'action'}});
  expect(native).not.toBeNull();
  const [,nativeForm]=native!();
  expect([...nativeForm.keys()]).toEqual(['weekStart','locationId','exclusionId']);
  expect((await clearGenerationExclusionAction(idle,nativeForm)).status).toBe('success');
});
it.each([generateWeekAction,clearGenerationExclusionAction])('ignores reserved metadata but still rejects forged/duplicate/Blob business fields',async action=>{
  const business=action===generateWeekAction?form():new FormData();
  if(action===clearGenerationExclusionAction) Object.entries({weekStart:'2026-10-05',locationId:'north',exclusionId:'event'}).forEach(([k,v])=>business.set(k,v));
  for(const variant of ['unknown','actor','workspace','budget','duplicate','file']) {
    const data=await installedForm(business);
    data.append('$ACTION_untrusted',new Blob(['not business authority']));
    if(variant==='duplicate') data.append('weekStart','2026-10-05');
    else if(variant==='file') data.set('weekStart',new Blob(['2026-10-05']));
    else data.set(({unknown:'ordinaryUnexpected',actor:'actorEmployeeId',workspace:'workspaceId',budget:'maxNodes'} as Record<string,string>)[variant],'forged');
    expect((await action(idle,data)).status).toBe('error');
  }
  expect(f.generate).not.toHaveBeenCalled();expect(f.clear).not.toHaveBeenCalled();
});

it('keeps bounded whitelisted setup causes and corrective destinations in authenticated action output',async()=>{
 f.generate.mockResolvedValue(result({excludedLocations:[{locationId:'north',state:'NEEDS_SETUP',issues:[{code:'STAFFING_NOT_CONFIGURED',message:'PRIVATE override',details:{employeeId:'PRIVATE'}},{code:'COVERAGE_NOT_CONFIGURED',message:'PRIVATE'},{code:'NO_ELIGIBLE_EMPLOYEES',message:'PRIVATE'},...Array.from({length:20},()=>({code:'POSITION_REQUIREMENT_INVALID',message:'PRIVATE'})),{code:'PRIVATE_UNKNOWN',message:'PRIVATE'}]}]}));
 const state=await generateWeekAction(idle,form());
 expect(state.result?.setupExceptions).toEqual([{locationName:'North',issues:[{message:'Configure minimum staffing and choose a designated Lead rule.',href:'/app/schedule/settings',label:'Scheduling rules'},{message:'Configure at least one valid coverage period.',href:'/app/schedule/settings',label:'Scheduling rules'},{message:'A coverage position requirement needs an active position and a valid quantity.',href:'/app/schedule/settings',label:'Scheduling rules'},{message:'Assign at least one active employee as eligible for this location.',href:'/app/employees',label:'Employee eligibility'}]}]);
 expect(JSON.stringify(state)).not.toMatch(/PRIVATE|NEEDS_SETUP|STAFFING_NOT_CONFIGURED|employeeId|details/);
});

it('names actual blocked READY targets without forwarding an exception message',async()=>{f.generate.mockRejectedValue(new GenerationTargetNotDraftError(['North','South']));const state=await generateWeekAction(idle,form());expect(state).toMatchObject({status:'error',message:'Automatic scheduling requires Draft targets. Review: North, South.'});expect(f.revalidate).not.toHaveBeenCalled();});
it('uses Owner guidance for inactive configuration without inaccessible Manager links',async()=>{f.generate.mockResolvedValue(result({excludedLocations:[{locationId:'north',state:'INACTIVE',issues:[{code:'LOCATION_INACTIVE',message:'PRIVATE'}]}]}));const state=await generateWeekAction(idle,form());expect(state.result?.setupExceptions).toEqual([{locationName:'North',issues:[{message:'The location is inactive or unavailable. Ask an Owner to review location settings.'}]}]);expect(JSON.stringify(state)).not.toMatch(/PRIVATE|LOCATION_INACTIVE|settings\/locations/);});

// Unit-only admission I/O; current authority and transactional rollback use real
// SQL in company-access-global-scheduling.integration.ts.
vi.mock('@/lib/company-access/operational-scope.server',async original=>({...await original<Record<string,unknown>>(),assertOperationalAccess:async()=>({scope:{mode:'COMPANY',locationIds:[]},workspace:{id:'test-workspace',name:'Fictional',active:true,timeZone:'America/Puerto_Rico',createdAt:'',updatedAt:'2030-01-01 00:00:00.123456+00'}})}));
