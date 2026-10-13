import { beforeEach, describe, expect, it, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import type { NativeProfilesResponse } from '@/lib/payroll/native/contracts';
import type { PayrollSettingsResponse } from '@/lib/payroll/contracts';
import { NativePayrollConfig } from './native-payroll-config';
import { nativeCapabilities } from './native-ui-fixture.test-support';

const boundary=vi.hoisted(()=>({data:null as NativeProfilesResponse|null,loading:false,error:''}));
vi.mock('./use-payroll',()=>({usePayrollResource:(path:string)=>({...boundary,data:path==='/api/payroll/runs'?{version:'PAYROLL_API_V1',capabilities:{canReview:true},runs:[],jobs:[]}:boundary.data,reload:async()=>{}}),usePayrollOperation:()=>({busy:false,pending:null,locked:false,message:'',error:'',revisionConflict:false,resuming:false,receipt:null,submit:async()=>{}})}));
const settings:PayrollSettingsResponse={version:'PAYROLL_API_V1',capabilities:nativeCapabilities,revisions:[],exceptions:[],grants:[],employees:[{id:'E1',name:'Fictional Employee',active:true}],futureDraftImpact:[]};
const sources={employees:[{id:'E1',name:'Fictional Employee',role:'EMPLOYEE',active:true}],locations:[{id:'L1',name:'Fictional location',active:true}],breakTypes:[]};
const render=()=>renderToStaticMarkup(<NativePayrollConfig settings={settings} sources={sources} recoveryScope="fictional-owner"/>);
beforeEach(()=>{boundary.data={version:'PAYROLL_NATIVE_PROFILES_V1',configurations:[],openingYtd:[],managerScopes:[]};boundary.loading=false;boundary.error='';settings.capabilities={...nativeCapabilities};});
describe('Owner native configuration states',()=>{
  it('makes incomplete setup understandable without default facts',()=>{const html=render();expect(html).toContain('Employee payroll facts');expect(html).toContain('Choose an employee');expect(html).toContain('Opening balances');expect(html).toContain('Manager payroll access');expect(html).not.toContain('$0.00');expect(html).not.toContain('<textarea');});
  it('clears private profile names and forms while current access loads',()=>{boundary.loading=true;const html=render();expect(html).toContain('Loading employee payroll facts');expect(html).not.toContain('Fictional Employee');});
  it('provides a retryable unavailable state',()=>{boundary.data=null;boundary.error='Owner access could not be checked';expect(render()).toContain('Try again');expect(render()).not.toContain('Fictional Employee');});
  it('does not expose private profile configuration without current Owner capability',()=>{settings.capabilities.canConfigure=false;expect(render()).not.toContain('Fictional Employee');expect(render()).not.toContain('Choose an employee');});
});

import { NativeProfileForm } from './native-profile-editor';
import { NativeOpeningForm } from './native-opening-scope';
import type { NativeDraft } from './native-payroll-config';
import type { usePayrollOperation } from './use-payroll';
const draft:NativeDraft={employeeId:'E1',configuration:null,opening:null,scope:null,profileFields:null,openingFields:null,scopeFields:null,wageIds:['W1'],employerIds:['0','1','2'],deductionIds:[],policyId:'P1',taxId:'T1'};
const operation={locked:false,submit:async()=>{}} as unknown as ReturnType<typeof usePayrollOperation>;
it('renders real labeled wage and evidence fields without factual defaults or raw JSON',()=>{
 const html=renderToStaticMarkup(<NativeProfileForm draft={draft} sources={sources} operation={operation} change={()=>{}}/>);
 expect(html).toContain('Hourly wage');expect(html).toContain('name="wage.W1.rate" value=""');expect(html).toContain('name="wage.W1.from" value=""');
 expect(html).toContain('Unknown · evidence not established');expect(html).not.toContain('checked=""');expect(html).not.toContain('value="0"');expect(html).not.toContain('<textarea');expect(html).toContain('Save employee payroll facts');
});
it('collects separate documented opening bases and requires explicit attestation',()=>{
 const html=renderToStaticMarkup(<NativeOpeningForm draft={draft} sources={sources} operation={operation} change={()=>{}}/>);
 expect(html).toContain('Opening Social Security wages');expect(html).toContain('Opening Medicare wages');expect(html).toContain('Opening SINOT wages');expect(html).toContain('Opening record SHA-256');expect(html).not.toContain('checked=""');expect(html).not.toContain('value="0"');
});

import { Input, Select } from './native-config-fields';
it('names controls from their visible label and keeps helper text as a separate description',()=>{
 const html=renderToStaticMarkup(<><Input name="rate" label="Hourly wage" help="Exact documented precision"/><Select name="scope" label="Coverage" options={[[ 'ACTUAL','Documented standard scope']]}/></>);
 const input=html.match(/<input[^>]+>/)![0];const select=html.match(/<select[^>]+>/)![0];
 for(const control of[input,select]){const id=control.match(/aria-labelledby="([^"]+)"/)?.[1];expect(id).toBeTruthy();expect(html).toContain(`id="${id}"`);}
 expect(input).toMatch(/aria-describedby="[^"]+"/);
});

import { NativeTaxFields } from './native-tax-fields';
import { DraftFields } from './native-config-fields';
it('initializes newly opened obligation identifiers without filling any factual balance or exemption',()=>{
 const d={...draft,profileFields:[['taxEnabled','on']] as [string,string][]};
 const html=renderToStaticMarkup(<DraftFields entries={d.profileFields}><NativeTaxFields draft={d} change={()=>{}}/></DraftFields>);
 expect(html).toMatch(/name="employer\.0\.code"[^>]*value="FUTA"/);expect(html).toMatch(/name="employer\.1\.code"[^>]*value="PR_UI"/);expect(html).toMatch(/name="employer\.2\.code"[^>]*value="CFSE"/);
 expect(html).not.toContain('value="0.00"');expect(html).not.toContain('checked=""');
});

it('keeps a positively referenced approved opening read-only instead of submitting an unresolvable rejected write',()=>{
 const html=renderToStaticMarkup(<NativeOpeningForm draft={draft} sources={sources} operation={operation} change={()=>{}} frozen/>);
 expect(html).toContain('Opening balances are frozen');expect(html).toMatch(/<button[^>]*disabled[^>]*>Attest opening balances/);
});
