import {describe,expect,it} from 'vitest';
import {parseRegistrationCommand,parseWorkspaceCommand,parseOnboardingCommand,parseOnboardingSnapshot,safeOnboardingDestination,onboardingHttpStatus} from './contracts';
import setupFixture from './fixtures/v1/setup-state.json';
import {commandResults} from './fixtures/v1/command-results';
import registrationStates from './fixtures/v1/registration-states.json';

const operationId='59f60420-ec96-455a-9292-0b1a416509e9';
const registration={schemaVersion:1,operationId,email:' Owner@Example.invalid ',locale:'en',termsVersion:'terms-1',privacyVersion:'privacy-1'};
const workspace={schemaVersion:1,operationId,expectedVersion:'1',payload:{businessName:'Example Company',timeZone:'America/Puerto_Rico',requestedSlug:'example-company',initialLocation:{name:'Main',shortName:'Main',key:'main'},ownerProfile:{id:'owner-1',firstName:'Owner',lastName:'Example',phone:'7875550101'}}};

describe('registration command boundary',()=>{
 it('preserves the delivery email spelling while trimming it',()=>expect(parseRegistrationCommand(registration)?.email).toBe('Owner@Example.invalid'));
 it.each(['role','workspaceId','databaseUrl','returnTo','password'])('refuses caller-supplied %s',key=>expect(parseRegistrationCommand({...registration,[key]:'forged'})).toBeNull());
 it.each(['bad','',operationId+'0'])('refuses malformed operation IDs: %s',id=>expect(parseRegistrationCommand({...registration,operationId:id})).toBeNull());
 it.each([0,2,'1',null])('refuses unsupported schema version %s',schemaVersion=>expect(parseRegistrationCommand({...registration,schemaVersion})).toBeNull());
 it.each(['','a@b','a b@example.invalid','a\r\n@example.invalid'])('refuses unusable email: %s',email=>expect(parseRegistrationCommand({...registration,email})).toBeNull());
 it('requires explicit policy versions and a supported locale',()=>{expect(parseRegistrationCommand({...registration,termsVersion:''})).toBeNull();expect(parseRegistrationCommand({...registration,privacyVersion:''})).toBeNull();expect(parseRegistrationCommand({...registration,locale:'fr'})).toBeNull();});
});

describe('business creation boundary',()=>{
 it('normalizes the initial Owner ID and validated phone using current rules',()=>{const x=parseWorkspaceCommand(workspace);expect(x?.payload.ownerProfile.id).toBe('OWNER-1');expect(x?.payload.ownerProfile.phone).toBe('787-555-0101');});
 it.each(['OWNER','MANAGER'])('cannot choose the bootstrap role %s',role=>expect(parseWorkspaceCommand({...workspace,payload:{...workspace.payload,ownerProfile:{...workspace.payload.ownerProfile,role}}})).toBeNull());
 it('cannot substitute the verified email or a database target',()=>{expect(parseWorkspaceCommand({...workspace,payload:{...workspace.payload,ownerProfile:{...workspace.payload.ownerProfile,email:'other@example.invalid'}}})).toBeNull();expect(parseWorkspaceCommand({...workspace,payload:{...workspace.payload,databaseUrl:'postgres://foreign'}})).toBeNull();});
 it.each(['www','api','admin','signup','two..parts','UPPERCASE','-bad','bad-'])('refuses unsafe or reserved workspace slug %s',requestedSlug=>expect(parseWorkspaceCommand({...workspace,payload:{...workspace.payload,requestedSlug}})).toBeNull());
 it('requires a real timezone and nonempty business/location details',()=>{expect(parseWorkspaceCommand({...workspace,payload:{...workspace.payload,timeZone:'Never/A_Zone'}})).toBeNull();expect(parseWorkspaceCommand({...workspace,payload:{...workspace.payload,businessName:' '}})).toBeNull();expect(parseWorkspaceCommand({...workspace,payload:{...workspace.payload,initialLocation:{...workspace.payload.initialLocation,name:''}}})).toBeNull();});
 it.each(['','-1','01','1.0','9223372036854775808'])('refuses invalid optimistic revision %s',expectedVersion=>expect(parseWorkspaceCommand({...workspace,expectedVersion})).toBeNull());
 it('requires the domain payload parser, without accepting extra envelope authority',()=>{expect(parseOnboardingCommand({...workspace,workspaceId:'forged'},v=>v)).toBeNull();expect(parseOnboardingCommand({...workspace,expectedVersion:'0'},v=>v)?.expectedVersion).toBe('0');});
});

describe('client snapshot and navigation boundaries',()=>{
 it.each(registrationStates)('decodes the $registrationState registration projection without inventing module readiness',value=>{
  const decoded=parseOnboardingSnapshot(value);expect(decoded?.registrationState).toBe(value.registrationState);expect(decoded?.workspace).toBeNull();expect(decoded?.sections).toEqual([]);
 });
 it.each(commandResults)('maps the $name recovery fixture to its actual HTTP outcome',({result,http})=>{
  expect(onboardingHttpStatus(result)).toBe(http);
  if('snapshot' in result)expect(parseOnboardingSnapshot(result.snapshot)).not.toBeNull();
 });
 const snapshot={schemaVersion:1,version:'1',registrationState:'EMAIL_VERIFIED',workspace:null,sections:[],nextStep:null};
 it('decodes an early registration snapshot without fabricating a business',()=>expect(parseOnboardingSnapshot(snapshot)?.workspace).toBeNull());
 it('lets the UI decode a saved business with incomplete and optional modules',()=>{const s=parseOnboardingSnapshot(setupFixture);expect(s?.workspace?.displayName).toBe('Fictional Example Company');expect(s?.nextStep).toBe('SCHEDULING');expect(s?.sections.find(x=>x.id==='PAYROLL')?.state).toBe('OPTIONAL');});
 it('rejects secret-bearing or unrecognized snapshots',()=>{expect(parseOnboardingSnapshot({...snapshot,secretRef:'private'})).toBeNull();expect(parseOnboardingSnapshot({...snapshot,registrationState:'ASSUMED_READY'})).toBeNull();});
 it('rejects duplicate setup steps and malformed action/section states',()=>{const section={id:'BUSINESS',state:'READY',reasonCodes:[],allowedActions:['OPEN']};expect(parseOnboardingSnapshot({...snapshot,sections:[section,section]})).toBeNull();expect(parseOnboardingSnapshot({...snapshot,sections:[{...section,state:'SKIPPED_AS_READY'}]})).toBeNull();});
 it('accepts an allowlisted same-origin destination',()=>expect(safeOnboardingDestination('/app/schedule','https://signup.example.invalid')).toBe('https://signup.example.invalid/app/schedule'));
 it.each(['https://other.invalid/app','//other.invalid/app','javascript:alert(1)','/\\other.invalid','/%2f%2fother.invalid','https://user:pass@signup.example.invalid/app'])('refuses ambiguous or foreign destination %s',value=>expect(safeOnboardingDestination(value,'https://signup.example.invalid')).toBeNull());
});
