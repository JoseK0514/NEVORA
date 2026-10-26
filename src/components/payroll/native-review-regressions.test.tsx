import { expect, it } from 'vitest';
import { input } from '@/lib/payroll/native/fixtures.test-support';
import { readNativeProfiles } from './native-profile-api';

// The typed-evidence profile editor was replaced by plain setup (Oct 25 2026); the resource-boundary guards stay.
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
