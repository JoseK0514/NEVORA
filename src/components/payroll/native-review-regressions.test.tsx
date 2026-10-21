import { expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { input } from '@/lib/payroll/native/fixtures.test-support';
import { fictionalWorkweekPolicy } from '@/lib/payroll/native/workweek-fixtures.test-support';
import { parseNativeProfileCommand } from '@/lib/payroll/native/model';
import { resolveNativeWorkweek } from '@/lib/payroll/native/workweek-policy';
import { profileFromForm } from './native-profile-form';
import { readNativeProfiles } from './native-profile-api';
import { NativeTaxFields } from './native-tax-fields';
import { NativeProfileForm } from './native-profile-editor';
import type { NativeDraft } from './native-payroll-config';
import type { usePayrollOperation } from './use-payroll';

function mixed() {
 const i=input();const old={...fictionalWorkweekPolicy(),id:'OLD',effectiveTo:'2026-06-01T00:00:00-04:00'};const current={...fictionalWorkweekPolicy(),id:'CURRENT',effectiveFrom:'2026-06-01T00:00:00-04:00'};
 return {schema:'NEVORA_NATIVE_CONFIGURATION_V1' as const,employeeId:'E1',tax:null,deductions:[],wages:[{...i.wages[0],id:'W1',effectiveTo:old.effectiveTo,workweekPolicy:old},{...i.wages[0],id:'W2',effectiveFrom:current.effectiveFrom,workweekPolicy:current}]};
}
function fields(previous:ReturnType<typeof mixed>) {
 const f=new FormData();f.set('deductionsReviewed','on');
 for(const w of previous.wages){f.append('wageId',w.id);for(const[k,v]of Object.entries({rate:'20.00',from:w.id==='W1'?'2026-01-01T00:00':'2026-06-01T00:00',to:w.id==='W1'?'2026-06-01T00:00':'',locations:'L1',scope:'CONFIRMED',overtime:'TIME_AND_HALF',attest:'on',evidence:'Fictional unrelated wage reference edit'}))f.set('wage.'+w.id+'.'+k,v);}
 // These are the first policy's otherwise unchanged fields in the reviewed UI.
 for(const[k,v]of Object.entries({policyKind:'EMPLOYER_NOTICE',policyFrom:'2026-01-01T00:00',policyTo:'2026-06-01T00:00',policyWeekday:'1',policyClock:'00:00',noticeReference:'Fictional documented notice',noticeDelivered:'2025-12-01T12:00',noticeMethod:'WRITTEN_EMPLOYEE',noticeKind:'INITIAL',noticeCoverage:'on',federalMatch:'on',federalEvidence:'Fictional documented federal week'}))f.set(k,v);
 return f;
}
it('preserves each historical/current workweek when unrelated multi-period facts are saved',()=>{
 const previous=mixed(), f=fields(previous),after=profileFromForm(f,'E1',previous);
 parseNativeProfileCommand({operationId:'18d8e87c-9765-4dbd-9f4b-691b045c8b73',action:'SAVE_NATIVE_PROFILE',expectedRevision:0,reason:'Fictional unrelated edit',configuration:after});
 expect(after.wages.map(w=>w.workweekPolicy?.id)).toEqual(['OLD','CURRENT']);
 expect(resolveNativeWorkweek('E1',after.wages,{startDate:'2026-10-05',endDate:'2026-10-11'}).policy.id).toBe('CURRENT');
 expect(resolveNativeWorkweek('E1',after.wages,{startDate:'2026-05-04',endDate:'2026-05-10'}).policy.id).toBe('OLD');
 expect(previous.wages[1].workweekPolicy.id).toBe('CURRENT');
});
it('edits only the explicitly scoped wage policy and retains the other interval',()=>{
 const previous=mixed(),f=fields(previous);for(const[k,v]of [...f])if(['policy','notice','federal','previousPolicy'].some(prefix=>k.startsWith(prefix)))f.set('wage.W1.'+k,String(v));
 f.set('wage.W1.federalEvidence','Fictional edited OLD evidence');
 const after=profileFromForm(f,'E1',previous);expect(after.wages[0].workweekPolicy?.federalEvidenceReference).toBe('Fictional edited OLD evidence');expect(after.wages[1].workweekPolicy).toEqual(previous.wages[1].workweekPolicy);
 expect(resolveNativeWorkweek('E1',after.wages,{startDate:'2026-10-05',endDate:'2026-10-11'}).policy.id).toBe('CURRENT');
});
function envelope(){const i=input();return {version:'PAYROLL_NATIVE_PROFILES_V1',configurations:[{schema:'NEVORA_NATIVE_CONFIGURATION_V1',employeeId:'E1',wages:i.wages,tax:i.tax,deductions:[{id:'D1',revision:1,code:'AUTH',label:'Fictional actual authorization',effectiveFrom:'2026-01-01',effectiveTo:null,method:'FIXED',amountMinor:'100',basisPoints:null,capMinor:null,deductedBeforeMinor:'0',authorization:'WRITTEN_POST_TAX',authorizationReference:'Fictional signed',revoked:false,legalBasis:'PR_LAW_17_5_C',complianceReference:'Fictional actual compliance',employerContributionCode:null}],revision:1,actorId:'owner',reason:'Fictional saved facts',createdAt:'2026-10-13T00:00:00Z'}],openingYtd:[],managerScopes:[]};}
const malformed:[string,(e:ReturnType<typeof envelope>)=>void][]=[
 ['certificate amount',e=>e.configurations[0].tax!.certificate.additionalMinor='bad-amount'],
 ['certificate null alternative',e=>Reflect.set(e.configurations[0].tax!.certificate,'additionalMinor',null)],
 ['certificate paired rate',e=>Reflect.set(e.configurations[0].tax!.certificate,'additionalBasisPoints',20)],
 ['SINOT rate',e=>Reflect.set(e.configurations[0].tax!,'sinotEmployeeBasisPoints',NaN)],
 ['employer cap',e=>Reflect.set(e.configurations[0].tax!.employerContributions[0],'capMinor','bad-amount')],
 ['employer opening',e=>e.configurations[0].tax!.employerContributions[0].wagesBeforeMinor='bad-amount'],
 ['applicable employer rate',e=>Object.assign(e.configurations[0].tax!.employerContributions[0],{applicability:'APPLICABLE',basisPoints:'bad-rate'})],
 ['exempt employer alternative',e=>Reflect.set(e.configurations[0].tax!.employerContributions[0],'basisPoints',30)],
 ['deduction amount',e=>e.configurations[0].deductions[0].amountMinor='bad-amount'],
 ['deduction cap',e=>Reflect.set(e.configurations[0].deductions[0],'capMinor','bad-amount')],
 ['deduction opening',e=>e.configurations[0].deductions[0].deductedBeforeMinor='bad-amount'],
 ['deduction paired rate',e=>Reflect.set(e.configurations[0].deductions[0],'basisPoints',20)],
];
it.each(malformed)('rejects unreadable %s at the resource boundary before rendering',(_,mutate)=>{const e=envelope();mutate(e);expect(()=>readNativeProfiles(e)).toThrow(/facts/);});
const draft=(configuration:NativeDraft['configuration']):NativeDraft=>({employeeId:'E1',configuration,opening:null,scope:null,profileFields:null,openingFields:null,scopeFields:null,wageIds:configuration?.wages.map(w=>w.id)??[],employerIds:configuration?.tax?.employerContributions.map((_,i)=>String(i))??[],deductionIds:[],policyId:'P1',taxId:'TAX1'});
it('accepts a valid PERCENTAGE certificate with a null fixed amount and renders its actual rate',()=>{
 const e=envelope();Object.assign(e.configurations[0].tax!.certificate,{additionalMethod:'PERCENTAGE',additionalMinor:null,additionalBasisPoints:125});
 const c=readNativeProfiles(e).configurations[0];const html=renderToStaticMarkup(<NativeTaxFields draft={draft(c)} change={()=>{}}/>);expect(html).toContain('name="certificatePercent"');expect(html).toContain('value="1.25"');
});
it('presents separate labeled policy controls for each effective wage',()=>{
 const c={...mixed(),revision:1,actorId:'owner',reason:'Fictional valid mixed policies',createdAt:'2026-10-13T00:00:00Z'};
 const html=renderToStaticMarkup(<NativeProfileForm draft={draft(c)} sources={{employees:[],locations:[],breakTypes:[]}} operation={{locked:false,submit:async()=>{}} as unknown as ReturnType<typeof usePayrollOperation>} change={()=>{}}/>);
 expect(html).toContain('name="wage.W1.policyKind"');expect(html).toContain('name="wage.W2.policyKind"');expect(html).toContain('CURRENT');
});
