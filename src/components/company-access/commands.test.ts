import {expect,it} from '@rstest/core';
import {coreCommandFromForm,createCommandFromForm,readInvitationStatus,readInvitationResult,readScopeResult,readEmployeeResult,readOperationalNavigation} from './commands';
const operationId='d56eb98d-27d9-49c0-a214-937c596929ed';
const employee={id:'E1',firstName:'A',lastName:'B',phone:'7875550100',email:'a@example.invalid',role:'EMPLOYEE' as const,active:true,primaryLocationId:'L1',eligibleLocationIds:['L1'],positionIds:[],updatedAt:'2026-10-14 12:00:00+00'};
const context={employeeId:'E1',employeeUpdatedAt:employee.updatedAt,role:employee.role,active:true,roleGeneration:'7',scopeRevision:2,scopeState:'UNASSIGNED' as const,scope:null};
function fields(role='EMPLOYEE'){const f=new FormData();for(const[k,v]of Object.entries({id:'E2',firstName:'Ana',lastName:'Rivera',phone:'7875550101',email:'',role,active:'true',primaryLocationId:'L1'}))f.set(k,v);f.append('eligibleLocationIds','L2');f.append('positionIds','P1');return f;}
it('builds one atomic Owner promotion with the original employee/scope versions and deliberate locations',()=>{expect(coreCommandFromForm(fields('MANAGER'),employee,context,'OWNER',{mode:'LOCATIONS',locationIds:['L2']},operationId)).toEqual({operationId,employeeId:'E1',expectedEmployeeUpdatedAt:'2026-10-14 12:00:00+00',profile:{firstName:'Ana',lastName:'Rivera',phone:'787-555-0101',email:null,role:'MANAGER',primaryLocationId:'L1',active:true},managerTransitionScope:{expectedScopeRevision:2,expectedRoleGeneration:'7',scope:{mode:'LOCATIONS',locationIds:['L2']}}});});
it('refuses an Owner promotion with no explicit scope rather than deriving authority from eligibility',()=>{expect(()=>coreCommandFromForm(fields('MANAGER'),employee,context,'OWNER',null,operationId)).toThrow(/management access/i);expect(()=>coreCommandFromForm(fields('MANAGER'),employee,context,'OWNER',{mode:'LOCATIONS',locationIds:[]},operationId)).toThrow(/location/i);});
it('does not grant scope for a Manager-created promotion',()=>{expect(coreCommandFromForm(fields('MANAGER'),employee,null,'MANAGER',null,operationId).managerTransitionScope).toBeUndefined();});
it('preserves existing Manager scope by omitting it from an ordinary profile edit',()=>{const before={...employee,role:'MANAGER' as const};expect(coreCommandFromForm(fields('MANAGER'),before,{...context,role:'MANAGER',scopeState:'ASSIGNED',scope:{mode:'COMPANY',locationIds:[]}},'OWNER',{mode:'LOCATIONS',locationIds:['L2']},operationId).managerTransitionScope).toBeUndefined();});
it('requires deliberate scope on reactivation even if an old Manager grant existed',()=>{expect(()=>coreCommandFromForm(fields('MANAGER'),{...employee,role:'MANAGER',active:false},{...context,role:'MANAGER',active:false},'OWNER',null,operationId)).toThrow(/management access/i);});
it('creates employee facts separately from an explicit initial Manager grant',()=>{const c=createCommandFromForm(fields('MANAGER'),'OWNER',{mode:'COMPANY',locationIds:[]},operationId);expect(c.initialManagerScope).toEqual({mode:'COMPANY',locationIds:[]});expect(c.employee.eligibleLocationIds).toEqual(['L2']);expect(c.employee.email).toBeNull();expect(c).not.toHaveProperty('actorId');expect(c).not.toHaveProperty('workspaceId');});
it('keeps a Manager-created Manager unassigned without an implicit company grant',()=>{expect(createCommandFromForm(fields('MANAGER'),'MANAGER',null,operationId)).not.toHaveProperty('initialManagerScope');});
const status={state:'ready',employeeId:'E1',employeeVersion:'v1',eligibility:'INVITABLE',registeredEmailMasked:'a***@example.invalid',invitationRevision:0,invitation:null,delivery:'UNAVAILABLE',deliveryAvailable:false,allowedCommands:[],retryAfterMs:null};
it('preserves a typed delivery capability and rejects ambiguous capability values',()=>{
 expect(readInvitationStatus(status,'E1')).toMatchObject({deliveryAvailable:false,allowedCommands:[]});
 expect(readInvitationStatus({...status,deliveryAvailable:true,allowedCommands:['ISSUE']},'E1')).toMatchObject({deliveryAvailable:true,allowedCommands:['ISSUE']});
 for(const deliveryAvailable of [undefined,'true',1,null])expect(()=>readInvitationStatus({...status,deliveryAvailable},'E1')).toThrow();
});
it('does not treat a wrong-target or malformed invitation response as current status',()=>{expect(()=>readInvitationStatus({...status,employeeId:'E2'},'E1')).toThrow();expect(()=>readInvitationStatus({...status,allowedCommands:['OWNER']},'E1')).toThrow();expect(readInvitationStatus(status,'E1')).toMatchObject({state:'ready',invitation:null,delivery:'UNAVAILABLE'});});
it('rejects a saved invitation receipt for a different operation or target',()=>{const v={state:'saved',receipt:{operationId,employeeId:'E1',action:'ISSUE',invitationId:'I1',revision:1,committedAt:'2026-10-14T12:00:00Z',expiresAt:'2026-10-15T12:00:00Z',delivery:'PROVIDER_ACCEPTED'}};expect(readInvitationResult(v,operationId,'E1')).toMatchObject({state:'saved'});expect(()=>readInvitationResult(v,'other','E1')).toThrow();expect(()=>readInvitationResult(v,operationId,'other')).toThrow();});
it('rejects malformed scope and employee receipts instead of displaying success',()=>{expect(()=>readScopeResult({state:'saved',receipt:{operationId,employeeId:'E1',scope:{mode:'LOCATIONS',locationIds:[]}}},operationId,'E1')).toThrow();expect(()=>readEmployeeResult({state:'saved',receipt:{operationId,employeeId:'E1',updatedAt:'v'}},operationId)).toThrow();});
const authority={state:'ready',employeeId:'M1',role:'MANAGER',source:'LEGACY_ADOPTION',scope:{mode:'COMPANY',locationIds:[]},scopeRevision:1,authority:'fictional',locations:[],observedAt:'2026-10-14T12:00:00Z',validForMs:15000};
it.each([0,15001,Infinity,'15000',NaN])('does not accept an invalid navigation lifetime',validForMs=>{expect(()=>readOperationalNavigation({...authority,validForMs})).toThrow();});
it('preserves an authorized Company location catalog without imposing selected-scope limits',()=>{const locations=Array.from({length:101},(_,i)=>({id:'L'+i,name:'Workplace '+i,shortName:'Place '+i}));const result=readOperationalNavigation({...authority,locations});expect(result.state==='ready'&&result.locations).toEqual(locations);});
// Employment dates (migration 0068): optional, informational, and never a lifecycle change.
function withDates(values:{hireDate?:string;terminationDate?:string;birthDate?:string},role='EMPLOYEE'){const f=fields(role);f.set('hireDate',values.hireDate??'');f.set('terminationDate',values.terminationDate??'');f.set('birthDate',values.birthDate??'');return f;}
it('sends all three dates from the edit sheet, blanks as null, and keeps the account status as it was',()=>{
 const c=coreCommandFromForm(withDates({hireDate:'2015-03-02',terminationDate:'2026-06-30'}),employee,null,'MANAGER',null,operationId);
 expect(c.employmentDates).toEqual({hireDate:'2015-03-02',terminationDate:'2026-06-30',birthDate:null});
 // A termination date is a record only: the command still carries the active status the form was opened with.
 expect(c.profile.active).toBe(true);expect(c.managerTransitionScope).toBeUndefined();
 expect(coreCommandFromForm(withDates({}),employee,null,'OWNER',null,operationId).employmentDates).toEqual({hireDate:null,terminationDate:null,birthDate:null});
});
it('leaves stored dates alone when the form has no date fields (Deactivate and Reactivate)',()=>{
 expect(coreCommandFromForm(fields(),employee,null,'OWNER',null,operationId)).not.toHaveProperty('employmentDates');
});
it('refuses impossible dates and a termination before the hire date before sending',()=>{
 expect(()=>coreCommandFromForm(withDates({birthDate:'2026-02-30'}),employee,null,'OWNER',null,operationId)).toThrow(/real dates/);
 expect(()=>coreCommandFromForm(withDates({hireDate:'2020-05-10',terminationDate:'2020-05-09'}),employee,null,'OWNER',null,operationId)).toThrow(/before the hire date/);
});
it('adds dates to a new employee only when one is entered',()=>{
 expect(createCommandFromForm(withDates({}),'OWNER',null,operationId)).not.toHaveProperty('employmentDates');
 expect(createCommandFromForm(fields(),'OWNER',null,operationId)).not.toHaveProperty('employmentDates');
 expect(createCommandFromForm(withDates({hireDate:'2017-01-26',birthDate:'2001-07-04'}),'MANAGER',null,operationId).employmentDates).toEqual({hireDate:'2017-01-26',terminationDate:null,birthDate:'2001-07-04'});
});

it('keeps an unchanged legacy phone in an edit and rejects a different incomplete number',()=>{
 const before={...employee,phone:'555-0126'}, form=fields();
 form.set('phone',before.phone);
 expect(coreCommandFromForm(form,before,null,'OWNER',null,operationId).profile.phone).toBe(before.phone);
 form.set('phone','555-0127');
 expect(()=>coreCommandFromForm(form,before,null,'OWNER',null,operationId)).toThrow(/valid contact phone/);
});
