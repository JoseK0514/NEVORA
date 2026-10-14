import { describe, expect, it } from 'vitest';
import { parseNativeProfileCommand } from '@/lib/payroll/native/model';
import { input } from '@/lib/payroll/native/fixtures.test-support';
import * as form from './native-profile-form';
import { readNativeProfiles } from './native-profile-api';

const values = (fields: Record<string, string | string[]>) => { const f = new FormData(); for (const [k,v] of Object.entries(fields)) for (const item of Array.isArray(v) ? v : [v]) f.append(k,item); return f; };
const wage = () => values({ deductionsReviewed: 'on', wageId: 'W1', 'wage.W1.from': '2026-01-01T00:00', 'wage.W1.rate': '25.001234', 'wage.W1.locations': ['L1'], 'wage.W1.overtime': 'TIME_AND_HALF', 'wage.W1.scope': 'CONFIRMED', 'wage.W1.attest': 'on', 'wage.W1.evidence': 'Fictional actual wage evidence', policyKind: 'UNKNOWN' });
describe('native form field conversion', () => {
  it('preserves an explicitly bound owner policy on edits and leaves new profiles unselected', () => {
    const i = input(); const previous = { schema: 'NEVORA_NATIVE_CONFIGURATION_V1' as const, employeeId: 'E1', wages: i.wages, tax: null, deductions: [], calculationPolicyReference: 'OWNER_AUTHORIZED_PROVISIONAL_PR_STANDARD_2026_20261014' };
    const edited = form.profileFromForm(wage(), 'E1', previous);
    expect(edited).toMatchObject({ calculationPolicyReference: previous.calculationPolicyReference });
    expect(parseNativeProfileCommand({ operationId: '11111111-1111-4111-8111-111111111111', action: 'SAVE_NATIVE_PROFILE', reason: 'Fictional reviewed edit', expectedRevision: 1, configuration: edited })).toMatchObject({ configuration: { calculationPolicyReference: previous.calculationPolicyReference } });
    expect(form.profileFromForm(wage(), 'E1', null)).not.toHaveProperty('calculationPolicyReference');
  });
  it('saves unknown workweek with both legacy coordinates null and preserves fractional wages exactly', () => {
    const configuration = form.profileFromForm(wage(), 'E1', null);
    expect(configuration.wages[0]).toMatchObject({ hourlyRateMinor: '2500.1234', workweekPolicy: null, workweekAnchorDate: null, workweekStartTime: null, wageCentRounding: 'UNVERIFIED' });
    expect(configuration.tax).toBeNull();
    expect(parseNativeProfileCommand({ operationId: '18d8e87c-9765-4dbd-9f4b-691b045c8b73', action: 'SAVE_NATIVE_PROFILE', expectedRevision: 0, reason: 'Fictional facts only', configuration }).action).toBe('SAVE_NATIVE_PROFILE');
  });
  it('requires explicit factual choices instead of filling empty fields', () => {
    const f=wage(); f.delete('wage.W1.scope'); expect(() => form.profileFromForm(f,'E1',null)).toThrow(/coverage|scope/i);
    f.set('wage.W1.scope','CONFIRMED'); f.delete('wage.W1.attest'); expect(() => form.profileFromForm(f,'E1',null)).toThrow(/attest|confirm/i);
    f.set('wage.W1.attest','on'); f.set('wage.W1.rate','25.0000001'); expect(() => form.profileFromForm(f,'E1',null)).toThrow();
  });
  it('does not turn unknown notice history into the statutory default', () => {
    const f=wage(); f.set('policyKind','STATUTORY_DEFAULT'); f.set('policyId','P1'); f.set('policyFrom','2026-01-01T00:00');
    expect(() => form.profileFromForm(f,'E1',null)).toThrow();
    for(const [k,v] of Object.entries({noticeAbsence:'on',policyEvidence:'Fictional employee notice search',federalMatch:'on',federalEvidence:'Fictional fixed matching week'})) f.set(k,v);
    const c=form.profileFromForm(f,'E1',null); expect(c.wages[0].workweekPolicy).toMatchObject({ boundary:{weekday:1,startTime:'00:01',timeZone:'America/Puerto_Rico'}, origin:{kind:'STATUTORY_DEFAULT',noticeAbsenceConfirmed:true}, federalWorkweek:'SAME_VERIFIED_BOUNDARY' });
    expect(c.wages[0].workweekAnchorDate).toBeNull();
  });
  it('retains preserved legacy coordinates and existing cent evidence rather than silently electing new rules', () => {
    const original=input(); const previous={schema:'NEVORA_NATIVE_CONFIGURATION_V1' as const,employeeId:'E1',wages:original.wages,tax:null,deductions:[]};
    const c=form.profileFromForm(wage(),'E1',previous); expect(c.wages[0].workweekAnchorDate).toBe('2026-01-05'); expect(c.wages[0].wageCentRounding).toBe('HALF_UP'); expect(previous.wages[0].hourlyRateMinor).toBe('2000');
  });
  it('requires explicit separate taxable opening bases and preserves tax-code maps without inferring gross', () => {
    const f=values({year:'2026',gross:'1000.00',net:'900.00',socialSecurity:'800.00',medicare:'950.00',sinot:'600.00',openingEvidence:'Fictional payroll opening',openingFingerprint:'a'.repeat(64),openingAttest:'on',openingLocations:['L1'],deductionsCode:['PR_INCOME_TAX'], 'deductions.PR_INCOME_TAX':'100.00',employerWagesCode:['FUTA'],'employerWages.FUTA':'700.00'});
    const y=form.openingFromForm(f,2); expect(y).toMatchObject({revision:3,grossMinor:'100000',netMinor:'90000',socialSecurityWagesMinor:'80000',medicareWagesMinor:'95000',sinotWagesMinor:'60000',employerWagesMinor:{FUTA:'70000'},deductions:{PR_INCOME_TAX:'10000'}});
    expect(parseNativeProfileCommand({operationId:'18d8e87c-9765-4dbd-9f4b-691b045c8b73',action:'ATTEST_OPENING_YTD',employeeId:'E1',expectedRevision:2,reason:'Fictional opening facts',ytd:y}).action).toBe('ATTEST_OPENING_YTD');
    f.delete('socialSecurity'); expect(()=>form.openingFromForm(f,2)).toThrow();
  });
  it('requires finite explicit Manager scope and permits an explicit full revocation',()=>{
    expect(()=>form.scopeFromForm(values({review:'on'}))).toThrow(/location/i);
    expect(form.scopeFromForm(values({review:'on',approve:'on',scopeLocations:['L1']}))).toEqual({review:true,approve:true,locationIds:['L1']});
    expect(form.scopeFromForm(values({}))).toEqual({review:false,approve:false,locationIds:[]});
  });
  it('rejects malformed private profile envelopes while accepting empty authoritative configuration',()=>{
    const empty={version:'PAYROLL_NATIVE_PROFILES_V1',configurations:[],openingYtd:[],managerScopes:[]}; expect(readNativeProfiles(empty)).toEqual(empty);
    expect(()=>readNativeProfiles({...empty,configurations:[{employeeId:'E1',revision:'1',wages:[]}]})).toThrow();
    expect(()=>readNativeProfiles({...empty,managerScopes:[{employeeId:'M1',revision:1,review:true,approve:true,locationIds:['*'],subjectEmployeeVersion:'v'}]})).toThrow();
  });
});

describe('private configuration shape guards',()=>{
  it('rejects a malformed present workweek or employer record before any form reads it',()=>{
    const i=input(); const c={schema:'NEVORA_NATIVE_CONFIGURATION_V1',employeeId:'E1',wages:i.wages,tax:i.tax,deductions:[],revision:1,actorId:'owner',reason:'Fictional existing facts',createdAt:'2026-10-12T12:00:00Z'};
    const envelope={version:'PAYROLL_NATIVE_PROFILES_V1',configurations:[c],openingYtd:[],managerScopes:[]};
    expect(readNativeProfiles(envelope).configurations[0].wages[0].hourlyRateMinor).toBe('2000');
    Reflect.set(i.wages[0],'workweekPolicy',{version:'PR_WORKWEEK_POLICY_V1'});expect(()=>readNativeProfiles(envelope)).toThrow();
    i.wages[0].workweekPolicy=input().wages[0].workweekPolicy;
    Reflect.set(i.tax!.employerContributions[0],'wagesBeforeMinor',undefined);expect(()=>readNativeProfiles(envelope)).toThrow();
  });
});

it('does not infer that no employee deductions exist from an untouched empty editor',()=>{const f=wage();f.delete('deductionsReviewed');expect(()=>form.profileFromForm(f,'E1',null)).toThrow(/deduction/i);});

import { resolveNativeWorkweek } from '@/lib/payroll/native/workweek-policy';
it.each(['STATUTORY_DEFAULT','EMPLOYER_NOTICE'])('lets a fully evidenced %s replace contradictory hidden legacy coordinates',kind=>{
 const original=input();const previous={schema:'NEVORA_NATIVE_CONFIGURATION_V1' as const,employeeId:'E1',wages:original.wages,tax:null,deductions:[]};const f=wage();
 for(const [k,v] of Object.entries({policyKind:kind,policyId:'P1',policyFrom:'2026-01-01T00:00',noticeAbsence:'on',policyEvidence:'Fictional complete actual notice search',federalMatch:'on',federalEvidence:'Fictional matching federal evidence',policyWeekday:'1',policyClock:'00:01',noticeReference:'Fictional actual employee notice',noticeDelivered:'2025-12-20T00:00',noticeMethod:'WRITTEN_EMPLOYEE',noticeCoverage:'on',noticeKind:'INITIAL'}))f.set(k,v);
 const c=form.profileFromForm(f,'E1',previous);expect(c.wages[0].workweekAnchorDate).toBeNull();expect(c.wages[0].workweekStartTime).toBeNull();expect(c.wages[0].wageCentRounding).toBe('HALF_UP');
 expect(resolveNativeWorkweek('E1',c.wages,{startDate:'2026-10-05',endDate:'2026-10-11'}).policy.boundary.startTime).toBe('00:01');
 expect(previous.wages[0].workweekStartTime).toBe('00:00');expect(previous.wages[0].workweekAnchorDate).toBe('2026-01-05');
});
