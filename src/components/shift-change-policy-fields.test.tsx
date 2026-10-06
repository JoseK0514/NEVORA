import {createElement} from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {expect,it,vi} from 'vitest';
vi.mock('../app/app/schedule/settings/actions',()=>({saveShiftChangePolicyAction:async()=>({status:'conflict'})}));
vi.mock('../app/app/employees/actions',()=>({saveOperationalRulesAction:async()=>({status:'conflict'})}));
import {ShiftChangePolicyFields} from './shift-change-policy-fields';
import {OperationalRuleFields} from './operational-rule-fields';
import {unknownOperationalRuleProfile} from '../lib/shift-changes/policy';
it('Owner sees independent scope revisions and blank unknown deadlines',()=>{
 const h=renderToStaticMarkup(createElement(ShiftChangePolicyFields,{policy:null,canEdit:true}));expect(h).toContain('<details');expect(h.match(/name="expectedRevision" value="0"/g)).toHaveLength(2);expect(h).toContain('name="submissionAdvanceMinutes"');expect(h).not.toMatch(/name="(?:submission|completion)AdvanceMinutes"[^>]*value="[0-9]/);
});
it('Manager reads unknown policy and profiles without Owner write controls',()=>{
 const p=unknownOperationalRuleProfile();const h=renderToStaticMarkup(createElement(OperationalRuleFields,{employeeId:'e',profile:p,canEdit:false}));expect(h).toContain('Unknown');expect(h).not.toContain('<form');expect(h).not.toContain('<input');
 const policy=renderToStaticMarkup(createElement(ShiftChangePolicyFields,{policy:null,canEdit:false}));expect(policy).toContain('Unknown');expect(policy).not.toContain('<form');
});
it('configured zero survives alongside unknown and reviewed not applicable settings',()=>{
 const p=unknownOperationalRuleProfile();p.minimumRest={status:'CONFIGURED',value:{minutes:0,timeBasis:'ELAPSED'},revision:2};p.breaks={status:'CONFIGURED',revision:2,value:{afterMinutes:0,minimumMinutes:0,paid:false,timeBasis:'ELAPSED'}};p.maximumShift={status:'NOT_APPLICABLE',reviewedBy:'owner',reviewedAt:'2026-10-01T00:00:00Z'};
 const h=renderToStaticMarkup(createElement(OperationalRuleFields,{employeeId:'e',profile:p,canEdit:true}));expect(h).toContain('name="minimumRest.minutes"');expect(h).toContain('value="0"');expect(h).toContain('Reviewed not applicable');expect(h).toContain('Unknown');expect(h).toContain('name="breaks.paid"');
});

vi.mock('next/navigation',()=>({useRouter:()=>({refresh:()=>{}})}));
