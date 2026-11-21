import {beforeEach,expect,it,rs} from '@rstest/core';
rs.mock('server-only',()=>({}));
const mocks=rs.hoisted(()=>({assignments:rs.fn(),review:rs.fn(),time:rs.fn(),communications:rs.fn()}));
rs.mock('./employee-published-assignments.server',()=>({readEmployeePublishedAssignments:mocks.assignments}));
rs.mock('./employee-weekly-review.server',()=>({readEmployeeWeeklyReview:mocks.review}));
rs.mock('./employee-time.server',()=>({readEmployeeTime:mocks.time}));
rs.mock('../communications/service.server',()=>({listEmployeeCommunications:mocks.communications}));
import type {SqlExecutor,SqlStatement} from '../notifications/types';
import type {SessionMutationProof} from '../shift-changes/types';
const proof:SessionMutationProof={employee:{id:'self',firstName:'Self',lastName:'Test',role:'EMPLOYEE',primaryLocationId:'loc-1'},sessionTokenHash:'b'.repeat(64)};
const at='2030-10-07T12:00:00.000Z';
function executor(options:{fail?:string;changeAuthority?:boolean;priorWeek?:boolean;reviewRows?:{id:string;version:string;changedAt:string}[];timeOff?:{startDate:string;endDate:string}}={}):SqlExecutor{
 let authorities=0;
 const query=async<T>(s:SqlStatement):Promise<T[]>=>{
  if(s.text.includes('FROM workspaces WHERE singleton=true')&&s.text.includes('"timeZone"'))return [{id:'workspace-fuel',name:'Fictional',timeZone:'America/Puerto_Rico',active:true,createdAt:at,updatedAt:at}] as T[];
  if(s.text.includes('home_authority'))return [{observedAt:at,expiresAt:'2030-10-08T12:00:00.000Z',locations:++authorities>1&&options.changeAuthority?['loc-2']:['loc-1']}] as T[];
  if(options.reviewRows&&s.text.includes('home_acknowledgements'))return options.reviewRows as T[];
  if(options.priorWeek&&s.text.includes('home_acknowledgements'))return [{id:'2030-10-07',version:'r2',changedAt:at}] as T[];
  if(options.timeOff&&s.text.includes('home_timeOff'))return [{id:'leave-1',changedAt:at,detail:{id:'leave-1',status:'APPROVED',...options.timeOff}}] as T[];
  if(options.fail&&s.text.includes(`home_${options.fail}`))throw Error('Raw SQL private detail');
  return [];
 };
 return {query,transaction:async(statements)=>{const output=[];for(const s of statements)output.push(await query(s));return output;}};
}
async function read(ex:SqlExecutor,p=proof){const m=await import('./employee-home.server').catch(()=>null);expect(m?.readEmployeeHome).toBeTypeOf('function');return m!.readEmployeeHome(p,ex);}
beforeEach(()=>{rs.resetAllMocks();mocks.assignments.mockResolvedValue({observedAt:at,timeZone:'America/Puerto_Rico',nextShift:null,currentShift:null,publicationState:'complete'});mocks.time.mockResolvedValue({state:'ready',observedAt:at,validForMs:45000});mocks.communications.mockResolvedValue({state:'complete',observedAt:at,items:[],reason:null});});
it('protected aggregate exposes all six complete current sources and zero items is all set',async()=>{expect(await read(executor())).toMatchObject({state:'ready',allSet:true,snapshot:{sources:{communications:{state:'complete'},timeOff:{state:'complete'},ownTime:{state:'complete'}}}});});
it.each([
 ['2030-11-01','2030-11-02','Nov 1–2, 2030'],
 ['2030-11-30','2030-12-06','Nov 30–Dec 6, 2030'],
 ['2030-12-30','2031-01-02','Dec 30, 2030–Jan 2, 2031'],
 ['2030-11-01','2030-11-01','Nov 1, 2030'],
])('Home shows approved time off from %s to %s as %s',async(startDate,endDate,period)=>{
 const result=await read(executor({timeOff:{startDate,endDate}}));
 expect(result).toMatchObject({state:'ready',snapshot:{attention:[{label:`Time off approved · ${period}`,href:'/app/requests?tab=my&requestId=leave-1'}]}});
});
it.each(['acknowledgements','exchanges','timeOff','ownTime'])('each independent %s failure retains authorized schedule and discloses unavailable',async fail=>{const r=await read(executor({fail}));expect(r).toMatchObject({state:'partial',snapshot:{publicationState:'complete',sources:{[fail]:{state:'unavailable'}}}});expect(JSON.stringify(r)).not.toContain('Raw SQL');});
it('final exact eligible-location replacement removes every section',async()=>{expect(await read(executor({changeAuthority:true}))).toEqual({state:'unauthorized',reason:'access_denied'});});
it('invalid or manager proof cannot start a source read',async()=>{const e=executor(),spy=rs.spyOn(e,'transaction');expect(await read(e,{...proof,employee:{...proof.employee,role:'MANAGER'}})).toEqual({state:'unauthorized',reason:'access_denied'});expect(spy).not.toHaveBeenCalled();});

it.each([true,false])('prior-own empty weekly review uses canonical unresolved=%s rather than historical relevance alone',async required=>{
 mocks.review.mockResolvedValue({state:'published',displayedRevisionId:'r2',shifts:[],acknowledgement:{needsAcknowledgement:required},intent:null,publicationChanges:required?[{kind:'REMOVED'}]:[]});
 const r=await read(executor({priorWeek:true}));
 expect(r).toMatchObject({state:required?'partial':'ready',snapshot:{sources:{acknowledgements:required?{state:'partial',reason:'review_unavailable'}:{state:'complete'}}}});
 if('snapshot' in r)expect(r.snapshot.attention).toEqual(required?[expect.objectContaining({href:'/app/schedule?week=2030-10-07',required:true,actionable:false})]:[]);
});
it('retains newer authorized review and explicit empty-week link while honestly partial',async()=>{
 const ex=executor({reviewRows:[{id:'2030-10-07',version:'r2',changedAt:at},{id:'2030-09-30',version:'r1',changedAt:at}]});
 mocks.review.mockImplementation(async(_proof,week)=>({state:'published',displayedRevisionId:week==='2030-10-07'?'r2':'r1',shifts:week==='2030-10-07'?[{id:'own'}]:[],acknowledgement:{needsAcknowledgement:true},intent:week==='2030-10-07'?{operationId:'intent'}:null,publicationChanges:[{kind:'REMOVED'}]}));
 const r=await read(ex);expect(r).toMatchObject({state:'partial',allSet:false,snapshot:{sources:{acknowledgements:{state:'partial',reason:'review_unavailable'}}}});
 if(!('snapshot'in r))throw Error('Missing Home');
 expect(r.snapshot.attention).toEqual(expect.arrayContaining([expect.objectContaining({href:'/app/schedule?week=2030-10-07',required:true,actionable:true}),expect.objectContaining({href:'/app/schedule?week=2030-09-30',required:true,actionable:false})]));
});
it('a week not fully published yet is reported as unpublished, not as an unknown source',async()=>{
 mocks.review.mockResolvedValue({state:'unpublished',displayedRevisionId:'r2',shifts:[{id:'own'}],acknowledgement:{needsAcknowledgement:true},intent:{operationId:'intent'},publicationChanges:[]});
 const r=await read(executor({priorWeek:true}));
 expect(r).toMatchObject({state:'partial',snapshot:{sources:{acknowledgements:{state:'partial',reason:'unpublished'}}}});
});
