import {renderToStaticMarkup} from 'react-dom/server';
import {expect,it,rs} from '@rstest/core';
import {PortalLangProvider} from '@/lib/i18n/portal-lang';
import {OperationalRuleFields} from './operational-rule-fields';
import {copy, OPERATIONAL_RULE_FIELDS_COPY} from './operational-rule-fields-copy';
import type {OperationalRuleProfile} from '@/lib/shift-changes/types';
rs.mock('@/app/app/employees/actions',()=>({saveOperationalRulesAction:rs.fn()}));
const profile:OperationalRuleProfile={version:1,revision:1,reviewedBy:null,reviewedAt:null,minimumRest:{status:'UNKNOWN'},maximumShift:{status:'UNKNOWN'},maximumDaily:{status:'UNKNOWN'},breaks:{status:'UNKNOWN'},projectedOvertime:{status:'UNKNOWN'}};
it('renders Jose’s approved disclaimer exactly in the saved language with the matching language tag',()=>{
 for(const lang of ['en','es'] as const){
  expect(OPERATIONAL_RULE_FIELDS_COPY[lang].disclaimer).toBe(copy[lang].scheduledProjectionsAreNotWorkedTime);
  const html=renderToStaticMarkup(<PortalLangProvider lang={lang}><OperationalRuleFields employeeId="fictional" profile={profile} canEdit={false}/></PortalLangProvider>);
  expect(html).toContain(`<p class="wa-field__help" lang="${lang}">${copy[lang].scheduledProjectionsAreNotWorkedTime}</p>`);
 }
});
