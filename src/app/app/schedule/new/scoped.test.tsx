import {beforeEach,expect,it,rs} from '@rstest/core';
import {createElement,type ComponentProps} from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
const m=rs.hoisted(()=>({saveAvailability:'available',role:'MANAGER',read:rs.fn(),global:rs.fn(),places:[{id:'loc-2',name:'Managed West',shortName:'West'}] as {id:string;name:string;shortName:string}[]}));
rs.mock('next/link',()=>({default:({children,...props}:ComponentProps<'a'>)=>createElement('a',props,children)}));
rs.mock('@/lib/auth/permissions',()=>({MANAGER_ROLES:['OWNER','MANAGER'],requireRoles:async()=>{if(!['OWNER','MANAGER'].includes(m.role))throw Error('forbidden');return {id:'M1',role:m.role};}}));
rs.mock('@/lib/auth/session',()=>({requireSessionMutationProof:async()=>({employee:{id:'M1',role:m.role},sessionTokenHash:'a'.repeat(64)})}));
rs.mock('@/lib/company-access/operational-scope.server',()=>({readOperationalAuthority:async()=>({state:'ready',authority:'fixture',observedAt:'2026-10-15T00:00:00Z',validForMs:15000,scope:{mode:'LOCATIONS',locationIds:m.places.map(p=>p.id)},locations:m.places}),withOperationalCompany:async()=>{m.global();throw Error('Unexpected Company read');}}));
rs.mock('@/lib/company-access/operational-read.server',()=>({readOperationalShiftEditor:m.read}));
rs.mock('@/lib/data/employees',()=>({listEmployees:()=>{m.global();throw Error('Unexpected global employee read');},listLocations:()=>{m.global();throw Error('Unexpected global location read');}}));
rs.mock('@/lib/data/positions',()=>({listPositions:()=>{m.global();throw Error('Unexpected global positions read');}}));
rs.mock('@/lib/data/coverage-repair.server',()=>({readCoverageRepairSelection:()=>{throw Error('Unexpected repair read');},decodeCoverageRepairReview:()=>null}));
rs.mock('@/lib/data/workspaces',()=>({getWorkspace:async()=>({id:'fixture',timeZone:'America/Puerto_Rico'})}));
rs.mock('@/app/app/schedule/actions',()=>({createShiftAction:rs.fn()}));
rs.mock('@/components/company-access/scoped-read-frame',()=>({ScopedReadFrame:({children,unavailable}:{children?:React.ReactNode;unavailable?:React.ReactNode})=>children??unavailable??null}));
import Page from './page';
const people:Record<string,{id:string;name:string;positionIds:string[]}[]>={'loc-2':[{id:'LOCAL',name:'Local Worker',positionIds:['P1']}],'loc-3':[{id:'EAST',name:'East Worker',positionIds:['P1']}]};
beforeEach(()=>{m.role='MANAGER';m.saveAvailability='available';m.places=[{id:'loc-2',name:'Managed West',shortName:'West'}];m.global.mockReset();m.read.mockReset().mockImplementation(async(_proof:unknown,query:{weekStart:string;locationId:string})=>!m.places.some(p=>p.id===query.locationId)?{state:'unavailable',reason:'access_denied'}:{state:'ready',authority:'fixture',observedAt:'2026-10-15T00:00:00Z',validForMs:15000,coverage:{kind:'LOCATIONS',locationIds:[query.locationId]},data:{weekStart:query.weekStart,locationId:query.locationId,shift:null,employeeOptions:people[query.locationId]??[],positionOptions:[{id:'P1',name:'Authorized position'}],sourceVersion:'read-version',saveAvailability:m.saveAvailability}});});
const read=(query:Record<string,string>={})=>Page({searchParams:Promise.resolve({week:'2026-10-12',...query})}).then(renderToStaticMarkup);

it('opens the Owner’s Add shift sheet at a Manager’s one place, with no separate location step',async()=>{
 const html=await read();
 expect(html).not.toContain('Choose a location');
 expect(html).toContain('<h1 class="c-shift__title">Add shift</h1>');
 // The place is shown fixed (the read-only look, no reason line) and posted as the scoped form posted it.
 expect(html).toMatch(/<input id="create-shift-form-location" class="c-in c-shift__fixed" readOnly="" tabindex="-1" value="West"\/>/);
 expect(html).not.toContain('A shift keeps its location');
 expect(html).toContain('<input type="hidden" name="locationId" value="loc-2"/>');
 expect(html).toContain('<input type="hidden" name="weekStart" value="2026-10-12"/>');
 expect(html).toContain('Local Worker');expect(html).toContain('Save shift');
 expect(m.read).toHaveBeenCalledTimes(1);expect(m.read.mock.calls[0][1]).toEqual({weekStart:'2026-10-12',locationId:'loc-2'});
 expect(m.global).not.toHaveBeenCalled();
});

it('posts the scoped form’s fields to the same action',async()=>{
 const html=await read({locationId:'loc-2'});
 for(const name of ['employeeId','positionId','date','startTime','endTime','isDesignatedLead','notes'])expect(html).toContain(`name="${name}"`);
 expect(html).toContain('<input type="hidden" name="locationId" value="loc-2"/>');
 expect(html).toContain('href="/app/schedule?week=2026-10-12&amp;location=loc-2"');
 expect(m.global).not.toHaveBeenCalled();
});

it('gives a Manager with several places a Location field in the sheet, with people from each place’s scoped read',async()=>{
 m.places=[{id:'loc-2',name:'Managed West',shortName:'West'},{id:'loc-3',name:'Managed East',shortName:'East'}];
 const html=await read();
 expect(m.read.mock.calls.map(call=>call[1].locationId)).toEqual(['loc-2','loc-3']);
 expect(html).toMatch(/<select id="create-shift-form-location"[^>]*name="locationId"[^>]*required/);
 expect(html).toContain('<option value="" disabled="" selected=""></option><option value="loc-2">West</option>');expect(html).not.toContain('Choose a location');expect(html).not.toContain('Choose a time');expect(html).toContain('<option value="" selected="">None</option>');expect(html).toContain('placeholder="Optional"');
 expect(html).toContain('<option value="loc-3">East</option>');
 expect(html).not.toContain('type="hidden" name="locationId"');
 expect(html).toContain('Local Worker');expect(html).toContain('East Worker');
 const chosen=await read({locationId:'loc-3'});
 expect(chosen).toContain('<option value="loc-3" selected="">East</option>');
 // Only the people who work at the chosen place are offered.
 expect(chosen).toContain('East Worker');expect(chosen).not.toContain('Local Worker');
});

it.each(['foreign',''])('forwards an explicit invalid destination to the guarded reader instead of selecting another location: %s',async locationId=>{const html=await read({locationId});expect(html).toContain('<h1>Shift creation</h1>');expect(html).not.toContain('Local Worker');expect(m.read.mock.calls[0][1]).toEqual({weekStart:'2026-10-12',locationId});expect(m.global).not.toHaveBeenCalled();});

it.each([['requires_company','You can’t add shifts here. Ask an Owner.'],['unavailable','West is inactive, so shifts can’t be added.']])('withholds creation controls for %s and says why in one line',async(saveAvailability,why)=>{
 m.saveAvailability=saveAvailability;const html=await read({locationId:'loc-2'});
 expect(html).not.toContain('Save shift');expect(html).not.toContain('name="employeeId"');expect(html).not.toContain('<form');
 expect(html).toContain('<h1 class="c-shift__title">Add shift</h1>');expect(html).toContain(why);
});

it('does not turn forged prefills into a selected employee or qualification',async()=>{const html=await read({locationId:'loc-2',employeeId:'FORGED',positionId:'FORGED',date:'2026-11-01'});expect(html).not.toContain('FORGED');expect(html).toContain('<option value="2026-10-12" selected="">Mon, Oct 12</option>');expect(html).not.toContain('value="2026-11-01"');});

it('keeps a prefilled person and position the scoped read offers',async()=>{const html=await read({locationId:'loc-2',employeeId:'LOCAL',positionId:'P1',date:'2026-10-14'});expect(html).toContain('<option value="LOCAL" selected="">Local Worker</option>');expect(html).toContain('<option value="P1" selected="">Authorized position</option>');expect(html).toContain('href="/app/schedule?week=2026-10-12&amp;location=loc-2&amp;day=2026-10-14#schedule-employee-LOCAL"');});

it('says who to ask when no one works at the place yet',async()=>{people['loc-2']=[];try{const html=await read();expect(html).toContain('No one works at West yet. Ask an Owner to add people.');expect(html).toMatch(/<button type="submit" class="c-btn c-shift__submit" disabled="">/);}finally{people['loc-2']=[{id:'LOCAL',name:'Local Worker',positionIds:['P1']}];}});

it.each(['EMPLOYEE','LEAD'])('denies %s before scoped or global catalog reads',async role=>{m.role=role;await expect(read({locationId:'loc-2'})).rejects.toThrow('forbidden');expect(m.read).not.toHaveBeenCalled();expect(m.global).not.toHaveBeenCalled();});
