import {beforeEach,describe,expect,it,vi} from 'vitest';

/** Inspection B13-B18 (Oct 25): malformed input is 400, anonymous 401, a refusal 403, a missing record 404, and only
 * a server failure is 503; a server failure carries an x-nevora-error-id reference (B10). Fictional data only. */
const m=vi.hoisted(()=>({session:vi.fn(),proof:vi.fn(),periodRead:vi.fn(),periodWrite:vi.fn(),actionCenter:vi.fn(),recovery:vi.fn(),clocker:vi.fn(),
 copy:vi.fn(),profiles:vi.fn(),inbox:vi.fn(),profile:vi.fn(),module:vi.fn(),statements:vi.fn()}));
vi.mock('server-only',()=>({}));
vi.mock('@/lib/auth/session',()=>({getSession:m.session,requireSessionMutationProof:m.proof}));
vi.mock('@/lib/period-close/service',()=>({readPeriodClose:m.periodRead,savePeriodPopulation:m.periodWrite,preparePeriodManifest:m.periodWrite,recordPeriodHandoff:m.periodWrite}));
vi.mock('@/lib/action-center/service',()=>({readActionCenter:m.actionCenter}));
vi.mock('@/lib/auth/recovery.server',()=>({issueAssistedRecovery:m.recovery}));
vi.mock('@/lib/clocker/recovery-review.server',()=>({readClockerRecoveryReview:m.clocker}));
vi.mock('@/lib/data/schedule-copy',()=>({executeScheduleCopy:m.copy,parseCopyCommand:(v:unknown)=>v,readScheduleCopyCommand:vi.fn()}));
vi.mock('@/lib/payroll-export/service',()=>({readExportProfiles:m.profiles,saveExportProfile:vi.fn()}));
vi.mock('@/lib/data/inbox-count.server',()=>({readInboxCount:m.inbox}));
vi.mock('@/lib/data/management-profile.server',()=>({readManagementProfile:m.profile}));
vi.mock('@/lib/workspace-presentation/current.server',()=>({moduleState:m.module,moduleEnabled:async()=>(await m.module())==='on'}));
vi.mock('@/lib/payroll/access',()=>({statements:m.statements}));
import {OperationalAuthorizationError} from '@/lib/company-access/operational-scope.server';
import {POST as periodClose} from './period-close/route';
import {POST as actionCenter} from './manager/action-center/route';
import {POST as accountRecovery} from './manager/account-recovery/route';
import {POST as clockerRecovery} from './manager/clocker-recovery/route';
import {POST as scheduleCopy} from './schedule-copy/route';
import {GET as exportProfiles} from './payroll-export/profiles/route';
import {GET as inboxCount} from './manager/inbox-count/route';
import {GET as managementProfile} from './management/profile/route';
import {GET as statements} from './payroll/statements/route';

const origin='https://qa.example';
const owner={id:'fictional-owner',role:'OWNER',firstName:'Fictional',lastName:'Owner'};
const proof={employee:{id:'fictional-owner',role:'OWNER'},sessionTokenHash:'a'.repeat(64)};
const post=(path:string,marker:string,body:string)=>new Request(origin+path,{method:'POST',body,headers:{'sec-fetch-site':'same-origin',[marker]:'1','content-type':'application/json',origin,'x-nevora-actor':owner.id}});
const get=(path:string,headers:Record<string,string>={})=>new Request(origin+path,{headers:{'sec-fetch-site':'same-origin',...headers}});
const sentinel=(word:string)=>Object.assign(new Error(`invalid input syntax for type integer: "${word}"`),{code:'22P02'});
beforeEach(()=>{
 for(const f of Object.values(m))f.mockReset();
 m.session.mockResolvedValue(owner);m.proof.mockResolvedValue(proof);m.module.mockResolvedValue('on');
 vi.spyOn(console,'error').mockImplementation(()=>{});
});

describe('period close (B13)',()=>{
 it.each(['{','null','[]','"text"'])('a malformed or non-object body %s is 400 invalid, never "outcome unconfirmed"',async body=>{
  const response=await periodClose(post('/api/period-close','x-nevora-period-close',body));
  expect(response.status).toBe(400);expect(await response.json()).toEqual({state:'invalid'});
 });
 it('an unknown action is 400',async()=>{
  expect((await periodClose(post('/api/period-close','x-nevora-period-close','{"action":null}'))).status).toBe(400);
 });
 it('a READ refused for scope is 403 access_denied',async()=>{
  m.periodRead.mockRejectedValue(new OperationalAuthorizationError());
  let response=await periodClose(post('/api/period-close','x-nevora-period-close','{"action":"READ","command":{}}'));
  expect(response.status).toBe(403);expect(await response.json()).toEqual({state:'unavailable',reason:'access_denied'});
  m.periodRead.mockRejectedValue(sentinel('operational_authorization'));
  response=await periodClose(post('/api/period-close','x-nevora-period-close','{"action":"READ","command":{}}'));
  expect(response.status).toBe(403);
 });
 it('a READ outage is 503 with a reference and without "retry the original operation"',async()=>{
  m.periodRead.mockRejectedValue(Object.assign(new Error('fictional timeout'),{code:'57014'}));
  const response=await periodClose(post('/api/period-close','x-nevora-period-close','{"action":"READ","command":{}}'));
  expect(response.status).toBe(503);expect(response.headers.get('x-nevora-error-id')).toMatch(/^[0-9a-f-]{36}$/);
  expect(JSON.stringify(await response.json())).not.toContain('Outcome unconfirmed');
 });
 it('a write refused at admission is 403; a refusal that may follow a commit stays "outcome unconfirmed"',async()=>{
  m.periodWrite.mockRejectedValue(new OperationalAuthorizationError());
  expect((await periodClose(post('/api/period-close','x-nevora-period-close','{"action":"POPULATION","command":{}}'))).status).toBe(403);
  m.periodWrite.mockRejectedValue(sentinel('operational_authorization'));
  const response=await periodClose(post('/api/period-close','x-nevora-period-close','{"action":"POPULATION","command":{}}'));
  expect(response.status).toBe(503);expect(await response.json()).toMatchObject({message:'Outcome unconfirmed. Retry the original operation.'});
 });
});

describe('malformed input is 400 (B14)',()=>{
 it('action center, account recovery and schedule copy reject a broken body with 400',async()=>{
  expect((await actionCenter(post('/api/manager/action-center','x-nevora-action-center','{'))).status).toBe(400);
  expect((await accountRecovery(post('/api/manager/account-recovery','x-nevora-recovery','{'))).status).toBe(400);
  const copy=await scheduleCopy(post('/api/schedule-copy','x-nevora-schedule-copy','{'));
  expect(copy.status).toBe(400);expect(await copy.json()).toEqual({state:'invalid'});
  expect(m.actionCenter).not.toHaveBeenCalled();expect(m.recovery).not.toHaveBeenCalled();expect(m.copy).not.toHaveBeenCalled();
 });
 it('clocker recovery: anonymous is 401 and a non-UUID command id is 400',async()=>{
  m.session.mockResolvedValue(null);
  expect((await clockerRecovery(post('/api/manager/clocker-recovery','x-nevora-clocker-recovery','{"commandId":"x"}'))).status).toBe(401);
  m.session.mockResolvedValue(owner);
  expect((await clockerRecovery(post('/api/manager/clocker-recovery','x-nevora-clocker-recovery','{"commandId":"x"}'))).status).toBe(400);
  expect(m.clocker).not.toHaveBeenCalled();
 });
});

it('export profiles: a permission refusal is 403, an outage 503 with a reference (B15)',async()=>{
 m.profiles.mockRejectedValue(new Error('payroll_authorization'));
 expect((await exportProfiles(get('/api/payroll-export/profiles',{'x-nevora-payroll-export':'1'}))).status).toBe(403);
 m.profiles.mockRejectedValue(Object.assign(new Error('fictional'),{code:'55P03'}));
 const response=await exportProfiles(get('/api/payroll-export/profiles',{'x-nevora-payroll-export':'1'}));
 expect(response.status).toBe(503);expect(response.headers.get('x-nevora-error-id')).toBeTruthy();
});

it('inbox count reports a failed read as 503, not 200 (B17); the Profile keeps its agreed 200 snapshot',async()=>{
 m.inbox.mockResolvedValue({state:'unavailable'});
 expect((await inboxCount(get('/api/manager/inbox-count'))).status).toBe(503);
 m.inbox.mockRejectedValue(new Error('fictional'));
 const failed=await inboxCount(get('/api/manager/inbox-count'));
 expect(failed.status).toBe(503);expect(failed.headers.get('x-nevora-error-id')).toBeTruthy();
 m.profile.mockResolvedValue({state:'unavailable',reason:'read_failed'});
 expect((await managementProfile(get('/api/management/profile'))).status).toBe(200);
 m.profile.mockRejectedValue(new Error('fictional'));
 expect((await managementProfile(get('/api/management/profile'))).headers.get('x-nevora-error-id')).toBeTruthy();
 m.profile.mockReset().mockResolvedValue({state:'unavailable',reason:'access_denied'});
 expect((await managementProfile(get('/api/management/profile'))).status).toBe(403);
});

describe('pay statements (B12, B18)',()=>{
 const call=()=>statements(get('/api/payroll/statements',{'x-nevora-payroll':'1'}));
 beforeEach(()=>{m.session.mockResolvedValue({...owner,role:'EMPLOYEE'});});
 it('an unreadable setting is 503 SETTINGS_UNAVAILABLE, never 404 "turned off"',async()=>{
  m.module.mockResolvedValue('unknown');
  const response=await call();expect(response.status).toBe(503);expect(await response.json()).toMatchObject({error:'SETTINGS_UNAVAILABLE'});
  m.module.mockResolvedValue('off');
  expect((await call()).status).toBe(404);
 });
 it('a database failure before the handler answers with the JSON contract, not an HTML 500',async()=>{
  m.session.mockRejectedValue(Object.assign(new Error('fictional'),{code:'57014'}));
  const response=await call();
  expect(response.status).toBe(503);expect(response.headers.get('content-type')).toContain('application/json');
 });
});
