import {beforeEach,expect,it,vi} from 'vitest';
import {requireSession,requireSessionMutationProof} from '@/lib/auth/session';
import {getDb} from '@/lib/db';
import {getClockMonitor} from './time-clock';
vi.mock('server-only',()=>({}));
vi.mock('@/lib/auth/session',()=>({requireSession:vi.fn(),requireSessionMutationProof:vi.fn()}));
vi.mock('@/lib/auth/permissions',()=>import('../auth/permissions'));
vi.mock('next/navigation',()=>({redirect:(path:string)=>{throw Error(`redirect:${path}`);}}));
vi.mock('@/lib/db',async()=>({...await vi.importActual<typeof import('../db')>('../db'),getDb:vi.fn()}));
const query=vi.fn();let monitorRows:unknown[],failure:unknown;
const row={id:'entry-1',employee_id:'employee-1',employee_name:'Sam Cruz',location_id:'loc-2',location_name:'FUEL – 110',device_id:'device-2',clock_in_at:'2030-10-07T23:00:00Z',status:'CLOCKED_IN',break_start_at:null,open_break_count:0,history_valid:true,schedule_context:null};
const workspace={id:'workspace',name:'Northside',timeZone:'America/Puerto_Rico',active:true,createdAt:'2030-01-01T00:00:00Z',updatedAt:'2030-01-01T00:00:00Z'};
beforeEach(()=>{
 vi.clearAllMocks();monitorRows=[];failure=undefined;
 const employee={id:'owner',firstName:'Alex',lastName:'Rivera',role:'OWNER' as const,primaryLocationId:'loc-1'};
 vi.mocked(requireSession).mockResolvedValue(employee);
 vi.mocked(requireSessionMutationProof).mockResolvedValue({employee,sessionTokenHash:'a'.repeat(64)});
 query.mockImplementation(async(text:string)=>{
  if(text.startsWith('WITH observed')){if(failure)throw failure;return [{snapshot:{observedAt:'2030-10-08T04:00:00Z',expiresAt:'2030-10-09T00:00:00Z',timeZone:workspace.timeZone,rows:monitorRows}}];}
  if(text.startsWith('SELECT id, name, time_zone'))return [workspace];
  return [];
 });
 vi.mocked(getDb).mockReturnValue({query,transaction:(statements:Promise<unknown>[])=>Promise.all(statements)} as unknown as ReturnType<typeof getDb>);
});
it('uses persisted open punches without a current-date or active-employee filter',async()=>{
 monitorRows=[row,{...row,id:'entry-2',employee_id:'employee-2',status:'ON_BREAK',break_start_at:'2030-10-08T03:30:00Z',open_break_count:1}];
 expect(await getClockMonitor()).toMatchObject({state:'ready',employees:[{state:'ON_FLOOR',clockInAt:row.clock_in_at},{state:'ON_BREAK',breakStartAt:'2030-10-08T03:30:00Z'}]});
 const sql=query.mock.calls.find(c=>c[0].startsWith('WITH observed'))![0];
 expect(sql).toContain('WHERE t.clock_out_at IS NULL');expect(sql).not.toMatch(/CURRENT_DATE|e.active/);
 expect(requireSessionMutationProof).toHaveBeenCalledOnce();
});
it('only reports an empty state after a successful empty query',async()=>{expect(await getClockMonitor()).toMatchObject({state:'ready',employees:[]});expect(query.mock.calls.some(c=>c[0].startsWith('WITH observed'))).toBe(true);});
it.each([
 [new Error('DATABASE_URL is not configured.'),'not_configured'],
 [Object.assign(new Error('Missing relation'),{code:'42P01'}),'schema_missing'],
 [new Error('Network error'),'read_failed'],
] as const)('reports unavailable data separately from zero activity',async(error,reason)=>{
 if(reason==='not_configured')vi.mocked(getDb).mockImplementation(()=>{throw error;});else failure=error;
 expect(await getClockMonitor()).toEqual({state:'unavailable',reason});
});
it('fails closed for mismatched break and punch state',async()=>{monitorRows=[{...row,status:'ON_BREAK'}];expect(await getClockMonitor()).toEqual({state:'unavailable',reason:'read_failed'});});
it.each(['EMPLOYEE','LEAD'] as const)('denies %s at the clock repository boundary',async role=>{
 vi.mocked(requireSession).mockResolvedValue({id:'employee-1',firstName:'Sam',lastName:'Cruz',role,primaryLocationId:'loc-1'});
 await expect(getClockMonitor()).rejects.toThrow('redirect:/app');expect(getDb).not.toHaveBeenCalled();expect(requireSessionMutationProof).not.toHaveBeenCalled();
});
it('a session lost while deriving the fresh proof never becomes zero activity',async()=>{vi.mocked(requireSessionMutationProof).mockRejectedValue(Error('redirect:/login'));expect(await getClockMonitor()).toEqual({state:'unavailable',reason:'read_failed'});});
