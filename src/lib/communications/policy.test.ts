import {expect,it} from 'vitest';
import {canAuthorCommunication as allow} from './policy';
const team={type:'TODAYS_TEAM',scope:{kind:'TODAYS_TEAM',locationId:'loc-1',businessDate:'2030-10-07'},title:'Today',body:'Operational',acknowledgement:'OPTIONAL',expiresAt:null};
const assignment={employeeId:'employee',workspaceId:'workspace-fuel',locationId:'loc-1',sourceShiftId:'shift',assignmentEpisodeId:'episode',termsFingerprint:'terms',published:true,released:false,startAt:'2030-10-07T02:00:00Z',endAt:'2030-10-07T06:00:00Z'};
const context={actor:{id:'employee',role:'EMPLOYEE',active:true,workspaceId:'workspace-fuel'},workspaceId:'workspace-fuel',workspaceActive:true,timeZone:'America/Puerto_Rico',observedAt:'2030-10-07T12:00:00Z',location:{id:'loc-1',workspaceId:'workspace-fuel',active:true},assignments:[assignment]};
it('role_type_scope_allow_deny',()=>{
 for(const role of ['OWNER','MANAGER','LEAD','EMPLOYEE'])expect(allow(team,{...context,actor:{...context.actor,role}})).toBe(true);
 for(const role of ['OWNER','MANAGER'])expect(allow({...team,type:'LOCATION_ANNOUNCEMENT',scope:{kind:'LOCATION',locationId:'loc-1'}},{...context,actor:{...context.actor,role},assignments:[]})).toBe(true);
 for(const role of ['LEAD','EMPLOYEE'])expect(allow({...team,type:'LOCATION_ANNOUNCEMENT',scope:{kind:'LOCATION',locationId:'loc-1'}},{...context,actor:{...context.actor,role}})).toBe(false);
 for(const mutation of [{assignments:[]},{assignments:[{...assignment,released:true}]},{assignments:[{...assignment,published:false}]},{assignments:[{...assignment,employeeId:'other'}]},{assignments:[{...assignment,endAt:'2030-10-07T04:00:00Z'}]},{actor:{...context.actor,active:false}},{location:{...context.location,workspaceId:'foreign'}}])expect(allow(team,{...context,...mutation})).toBe(false);
 expect(allow({...team,scope:{...team.scope,businessDate:'2030-10-08'}},context)).toBe(false);
 expect(allow({...team,type:'SHIFT_NOTE'}, {...context,actor:{...context.actor,role:'OWNER'}})).toBe(false);
});
it('required_ack_management_only_non_team',()=>{
 for(const role of ['OWNER','MANAGER','LEAD','EMPLOYEE']){
 const c={...context,actor:{...context.actor,role}};
 expect(allow({...team,acknowledgement:'REQUIRED'},c)).toBe(false);
 for(const type of ['LOCATION_ANNOUNCEMENT','OPERATIONAL_UPDATE'])expect(allow({...team,type,scope:{kind:'LOCATION',locationId:'loc-1'},acknowledgement:'REQUIRED'},c)).toBe(['OWNER','MANAGER'].includes(role));
 expect(allow({...team,type:'SHIFT_NOTE',scope:{kind:'SHIFT',locationId:'loc-1',sourceShiftId:'shift',assignmentEpisodeId:'episode',termsFingerprint:'terms'},acknowledgement:'REQUIRED'},c)).toBe(['OWNER','MANAGER'].includes(role));
 }
});
it('management scope remains workspace wide while missing or stale authority fails closed',()=>{
 const manager={...context,actor:{...context.actor,role:'MANAGER'}};
 const shift={...team,type:'SHIFT_NOTE',scope:{kind:'SHIFT',locationId:'loc-1',sourceShiftId:'shift',assignmentEpisodeId:'episode',termsFingerprint:'terms'}};
 expect(allow(shift,manager)).toBe(true);
 expect(allow({...shift,scope:{...shift.scope,assignmentEpisodeId:'replacement'}},manager)).toBe(false);
 for(const mutation of [{workspaceActive:false},{actor:{...manager.actor,workspaceId:'foreign'}},{actor:{...manager.actor,role:'UNKNOWN'}},{observedAt:'invalid'},{location:{...context.location,active:false}}])expect(allow(team,{...manager,...mutation})).toBe(false);
 expect(allow({...team,expiresAt:'2030-10-07T12:00:00Z'},manager)).toBe(false);
});
