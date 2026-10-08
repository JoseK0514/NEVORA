import {beforeEach,expect,it,vi} from 'vitest';
vi.mock('server-only',()=>({}));
const mocks=vi.hoisted(()=>({assignments:vi.fn(),review:vi.fn(),time:vi.fn()}));
vi.mock('./employee-published-assignments.server',()=>({readEmployeePublishedAssignments:mocks.assignments}));
vi.mock('./employee-weekly-review.server',()=>({readEmployeeWeeklyReview:mocks.review}));
vi.mock('./employee-time.server',()=>({readEmployeeTime:mocks.time}));
import type {SqlExecutor,SqlStatement} from '../notifications/types';
import type {SessionMutationProof} from '../shift-changes/types';
const proof:SessionMutationProof={employee:{id:'self',firstName:'Self',lastName:'Test',role:'EMPLOYEE',primaryLocationId:'loc-1'},sessionTokenHash:'b'.repeat(64)};
const at='2030-10-07T12:00:00.000Z';
function executor(options:{fail?:string;changeAuthority?:boolean;priorWeek?:boolean}={}):SqlExecutor{
 let authorities=0;
 const query=async<T>(s:SqlStatement):Promise<T[]>=>{
  if(s.text.includes('FROM workspaces WHERE singleton=true')&&s.text.includes('"timeZone"'))return [{id:'workspace-fuel',name:'Fictional',timeZone:'America/Puerto_Rico',active:true,createdAt:at,updatedAt:at}] as T[];
  if(s.text.includes('home_authority'))return [{observedAt:at,expiresAt:'2030-10-08T12:00:00.000Z',locations:++authorities>1&&options.changeAuthority?['loc-2']:['loc-1']}] as T[];
  if(options.priorWeek&&s.text.includes('home_acknowledgements'))return [{id:'2030-10-07',version:'r2',changedAt:at}] as T[];
  if(options.fail&&s.text.includes(`home_${options.fail}`))throw Error('Raw SQL private detail');
  return [];
 };
 return {query,transaction:async(statements)=>{const output=[];for(const s of statements)output.push(await query(s));return output;}};
}
async function read(ex:SqlExecutor,p=proof){const m=await import('./employee-home.server').catch(()=>null);expect(m?.readEmployeeHome).toBeTypeOf('function');return m!.readEmployeeHome(p,ex);}
beforeEach(()=>{vi.resetAllMocks();mocks.assignments.mockResolvedValue({observedAt:at,timeZone:'America/Puerto_Rico',nextShift:null,currentShift:null,publicationState:'complete'});mocks.time.mockResolvedValue({state:'ready',observedAt:at,validForMs:45000});});
it('protected aggregate exposes six sources and communications is always partial',async()=>{expect(await read(executor())).toMatchObject({state:'partial',allSet:false,snapshot:{sources:{communications:{state:'partial'},timeOff:{state:'complete'},ownTime:{state:'complete'}}}});});
it.each(['acknowledgements','exchanges','timeOff','ownTime'])('each independent %s failure retains authorized schedule and discloses unavailable',async fail=>{const r=await read(executor({fail}));expect(r).toMatchObject({state:'partial',snapshot:{publicationState:'complete',sources:{[fail]:{state:'unavailable'}}}});expect(JSON.stringify(r)).not.toContain('Raw SQL');});
it('final exact eligible-location replacement removes every section',async()=>{expect(await read(executor({changeAuthority:true}))).toEqual({state:'unauthorized',reason:'access_denied'});});
it('invalid or manager proof cannot start a source read',async()=>{const e=executor(),spy=vi.spyOn(e,'transaction');expect(await read(e,{...proof,employee:{...proof.employee,role:'MANAGER'}})).toEqual({state:'unauthorized',reason:'access_denied'});expect(spy).not.toHaveBeenCalled();});

it.each([true,false])('prior-own empty weekly review uses canonical unresolved=%s rather than historical relevance alone',async required=>{
 mocks.review.mockResolvedValue({state:'published',displayedRevisionId:'r2',shifts:[],acknowledgement:{needsAcknowledgement:required},intent:null,publicationChanges:required?[{kind:'REMOVED'}]:[]});
 const r=await read(executor({priorWeek:true}));
 expect(r).toMatchObject({state:'partial',snapshot:{sources:{acknowledgements:required?{state:'unavailable',reason:'review_unavailable'}:{state:'complete'}}}});
 if('snapshot' in r)expect(r.snapshot.attention).toEqual([]);
});
