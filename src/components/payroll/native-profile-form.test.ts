import { describe, expect, it } from 'vitest';
import { input } from '@/lib/payroll/native/fixtures.test-support';
import { parsePlainSetupCommand } from '@/lib/payroll/native/setup';
import * as form from './native-profile-form';
import { readNativeProfiles } from './native-profile-api';

const values = (fields: Record<string, string | string[]>) => { const f = new FormData(); for (const [k,v] of Object.entries(fields)) for (const item of Array.isArray(v) ? v : [v]) f.append(k,item); return f; };
const payFields = () => values({ hourlyRate: '12.50', rateStartsOn: '2026-01-01', personal: 'INDIVIDUAL_FULL', fullDependents: '1', halfDependents: '', deductionAllowances: '0', extraWithholding: '' });
describe('plain setup field conversion', () => {
  it('turns ordinary pay answers into a command the server accepts, with nothing to attest or fingerprint', () => {
    const pay = form.payFromForm(payFields());
    expect(pay).toEqual({ hourlyRateMinor: '1250', rateStartsOn: '2026-01-01', withholding: { personal: 'INDIVIDUAL_FULL', fullDependents: 1, halfDependents: 0, deductionAllowances: 0, veteran: false, extraWithholdingMinor: '0' }, mealReductionAgreement: false });
    expect(JSON.stringify(pay)).not.toMatch(/evidence|attest|sha|fingerprint|reference/i);
    expect(parsePlainSetupCommand({ action: 'SAVE_EMPLOYEE_PAY_SETUP', operationId: '18d8e87c-9765-4dbd-9f4b-691b045c8b73', expectedRevision: 0, employeeId: 'E1', pay, opening: { taxYear: 2026, expectedRevision: 0, totals: form.openingFromPlainForm(values({ yearStart: 'FRESH' })) } })).toMatchObject({ pay: { hourlyRateMinor: '1250' } });
  });
  it('keeps fractional hourly rates exactly and explains a bad rate in plain words', () => {
    expect(form.hourlyRateMinor('25.001234')).toBe('2500.1234');
    expect(form.hourlyRateDollars('2500.1234')).toBe('25.001234');
    expect(() => form.hourlyRateMinor('twelve')).toThrow('Enter the hourly rate in dollars, like 12.50.');
  });
  it('records the written 30-minute meal agreement switch', () => {
    const f = payFields(); f.set('mealReductionAgreement', 'on');
    expect(form.payFromForm(f).mealReductionAgreement).toBe(true);
  });
  it('defaults to starting fresh and reads mid-year totals as plain amounts', () => {
    expect(form.openingFromPlainForm(values({}))).toEqual({ kind: 'FRESH' });
    expect(form.openingFromPlainForm(values({ yearStart: 'MID_YEAR', ytdGross: '10,000.00', ytdSocialSecurity: '620', ytdMedicare: '145', ytdIncomeTax: '400', ytdSinot: '30' }))).toEqual({ kind: 'MID_YEAR', grossMinor: '1000000', withheld: { socialSecurityMinor: '62000', medicareMinor: '14500', prIncomeTaxMinor: '40000', sinotMinor: '3000' }, employerPaid: { socialSecurityMinor: '0', medicareMinor: '0', sinotMinor: '0', futaMinor: '0', prUiMinor: '0', cfseMinor: '0' } });
    expect(() => form.openingFromPlainForm(values({ yearStart: 'MID_YEAR' }))).toThrow(/gross pay so far/);
  });
  it('builds company defaults once: workweek confirmation, programs, break pay and the Owner switch', () => {
    const f = values({ workweekConfirmed: 'on', 'program.FUTA': 'YES', 'program.FUTA.rate': '0.6', 'program.PR_UI': 'YES', 'program.PR_UI.rate': '3.4', 'program.CFSE': 'NO', 'break.REST': 'PAID_REST', 'break.MEAL': 'UNPAID_RELIEVED_MEAL' });
    expect(form.companyDefaultsFromForm(f, ['REST', 'MEAL'])).toEqual({ workweek: 'STATUTORY_MONDAY_0001', employerPrograms: [{ code: 'FUTA', applies: true, basisPoints: 60 }, { code: 'PR_UI', applies: true, basisPoints: 340 }, { code: 'CFSE', applies: false, basisPoints: null }], breakPay: [{ typeId: 'REST', treatment: 'PAID_REST' }, { typeId: 'MEAL', treatment: 'UNPAID_RELIEVED_MEAL' }], includeOwners: false });
    f.delete('workweekConfirmed'); expect(() => form.companyDefaultsFromForm(f, [])).toThrow('Confirm the workweek to continue.');
    expect(form.percentText(340)).toBe('3.4'); expect(form.percentText(60)).toBe('0.6');
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

