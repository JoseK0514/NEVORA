import {beforeEach,expect,it,vi} from 'vitest';
import {handleClockerPin} from './pin-transport.server';
import {handleClockerSetup} from './setup.server';
import type {ClockerCookieStore} from './setup.server';
import type {SqlExecutor} from '../notifications/types';
const mocks=vi.hoisted(()=>({authenticate:vi.fn(),redeem:vi.fn(),verify:vi.fn()}));
vi.mock('./devices.server',()=>({authenticateClockerDevice:mocks.authenticate,redeemClockerEnrollment:mocks.redeem,clockerCredentialWasIssued:vi.fn(),ClockerDeviceError:class extends Error{constructor(public code:string){super(code);}}}));
vi.mock('./pins.server',()=>({verifyEmployeeClockerPin:mocks.verify,readClockerIdentity:vi.fn(),clearClockerIdentity:vi.fn()}));
vi.mock('../workspace-routing/token-envelope.server',()=>({privateWorkspaceToken:async(_kind:string,value:string)=>value}));
const executor={} as SqlExecutor;
let cookies:Map<string,string>;
let store:ClockerCookieStore;
beforeEach(()=>{vi.resetAllMocks();cookies=new Map();store={get:name=>cookies.has(name)?{value:cookies.get(name)!}:undefined,set:(name,value)=>{cookies.set(name,value);}};});
function request(body:object,headers:Record<string,string>={}){return new Request('http://localhost/api/clocker/2/pin',{method:'POST',headers:{host:'localhost',origin:'http://localhost','x-nevora-clocker':'1','content-type':'application/json',...headers},body:JSON.stringify(body)});}
const pin=(body:object,headers:Record<string,string>={},location='2',security={production:false})=>handleClockerPin(request(body,headers),location,{cookies:store,executor,security,key:Buffer.alloc(32)});
const setup=(body:object,headers:Record<string,string>={},location='2',security={production:false})=>handleClockerSetup(request(body,headers),location,{cookies:store,executor,security,finishPortalSession:async()=>{}});
it.each([
 ['environment',{}, {},'2',{production:true},503,'SETUP_UNAVAILABLE'],
 ['origin',{}, {origin:'https://other.invalid'},'2',{production:false},403,'ORIGIN_REJECTED'],
 ['headers',{}, {'x-nevora-clocker':'0'},'2',{production:false},403,'ORIGIN_REJECTED'],
 ['location',{}, {},'invalid/key',{production:false},400,'LOCATION_INVALID'],
 ['input',{action:'verify',pin:'abc'}, {},'2',{production:false},400,'PIN_INPUT_INVALID'],
] as const)('PIN error %s has a stable code',async(_name,body,headers,location,security,status,code)=>{const response=await pin(body,headers,location,security);expect(response.status).toBe(status);expect(await response.json()).toMatchObject({code,error:expect.any(String)});});
it('keeps missing-device and denied PIN responses private and coded',async()=>{
 mocks.authenticate.mockResolvedValue(null);expect(await (await pin({action:'verify',pin:'0123'})).json()).toMatchObject({state:'device_required',code:'DEVICE_REQUIRED'});
 mocks.authenticate.mockResolvedValue({proof:{}});mocks.verify.mockResolvedValue({state:'denied'});
 expect(await (await pin({action:'verify',pin:'0123'})).json()).toEqual({state:'denied',code:'PIN_DENIED',error:'PIN not recognized for this location. Try again or ask your manager.'});
});
it('returns the actual PIN wait in both body and Retry-After without restoring identity',async()=>{
 cookies.set('nevora_clocker_identity','old-proof');mocks.authenticate.mockResolvedValue({proof:{}});mocks.verify.mockResolvedValue({state:'limited',retryAfterSeconds:47});
 const response=await pin({action:'verify',pin:'0123'});expect(response.status).toBe(429);expect(response.headers.get('Retry-After')).toBe('47');expect(await response.json()).toMatchObject({state:'limited',code:'PIN_LIMITED',retryAfterSeconds:47});expect(cookies.get('nevora_clocker_identity')).toBe('');
});
it('returns only a stable unavailable code and existing safe message on PIN exceptions',async()=>{mocks.authenticate.mockRejectedValue(Error('private SQL'));const response=await pin({action:'verify',pin:'0123'});expect(response.status).toBe(503);expect(await response.json()).toEqual({state:'unavailable',code:'PIN_UNAVAILABLE',error:'PIN verification is unavailable. Check the connection and try again.'});});
it.each([
 ['environment',{}, {},'2',{production:true},503,'SETUP_UNAVAILABLE'],
 ['origin',{}, {origin:'https://other.invalid'},'2',{production:false},403,'ORIGIN_REJECTED'],
 ['headers',{}, {'x-nevora-clocker':'0'},'2',{production:false},403,'ORIGIN_REJECTED'],
 ['location',{}, {},'invalid/key',{production:false},400,'LOCATION_INVALID'],
 ['input',{step:'bad'}, {},'2',{production:false},400,'SETUP_INPUT_INVALID'],
 ['cookie',{step:'redeem',enrollmentToken:'nev_enr_'+'a'.repeat(64)}, {},'2',{production:false},428,'SETUP_COOKIE_REQUIRED'],
] as const)('setup error %s has a stable code',async(_name,body,headers,location,security,status,code)=>{const response=await setup(body,headers,location,security);expect(response.status).toBe(status);expect(await response.json()).toMatchObject({code,error:expect.any(String)});});
it('keeps setup errors coded without revealing enrollment details',async()=>{
 cookies.set('nevora_clocker_setup','nev_dev_'+'a'.repeat(64));mocks.authenticate.mockResolvedValue(null);
 const {ClockerDeviceError}=await import('./devices.server');mocks.redeem.mockRejectedValue(new ClockerDeviceError('ENROLLMENT_INVALID'));
 const rejected=await setup({step:'redeem',enrollmentToken:'nev_enr_'+'b'.repeat(64)});expect(rejected.status).toBe(409);expect(await rejected.json()).toMatchObject({code:'ENROLLMENT_INVALID',error:'This setup code is expired, already used, or for another location. Ask the Owner for a new code.'});
 mocks.authenticate.mockRejectedValue(Error('private SQL'));const unavailable=await setup({step:'status'});expect(unavailable.status).toBe(503);expect(await unavailable.json()).toMatchObject({code:'SETUP_UNCONFIRMED',error:'We could not confirm tablet setup. Check the connection, then choose Check Setup. Do not enter a new code yet.'});
});
