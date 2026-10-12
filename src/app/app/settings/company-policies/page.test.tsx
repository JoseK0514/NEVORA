import {renderToStaticMarkup} from 'react-dom/server';
import {beforeEach,it,expect,vi} from 'vitest';
import {projectCompanyPolicyHistory} from '../../../../lib/business-improvements/company-policies/history';
import {parseCompanyPolicySettings} from '../../../../lib/business-improvements/company-policies/model';
import {policyUIRows} from '../../../../test/fixtures/company-policy-history-ui';
import Page from './page';
const source=vi.hoisted(()=>({fail:false,rows:[] as unknown[]}));
vi.mock('@/lib/auth/permissions',()=>({requireRoles:async()=>{}}));
vi.mock('@/lib/auth/session',()=>({requireSessionMutationProof:async()=>({})}));
vi.mock('@/lib/data/workspaces',()=>({getWorkspace:async()=>({timeZone:'America/Puerto_Rico'})}));
vi.mock('@/lib/data/locations',()=>({listLocations:async()=>[{id:'loc-1',name:'Northside',active:true}]}));
vi.mock('next/navigation',()=>({useRouter:()=>({refresh:()=>{}})}));
vi.mock('@/lib/business-improvements/company-policies/service',()=>({
 readCompanyPolicies:async()=>{if(source.fail)throw Error('PRIVATE_SQL_DIAGNOSTIC');return(source.rows as ReturnType<typeof policyUIRows>).map(row=>({...row,settings:parseCompanyPolicySettings(row.settings)}));},
 readCompanyPolicyHistory:async()=>{if(source.fail)throw Error('PRIVATE_SQL_DIAGNOSTIC');return projectCompanyPolicyHistory(source.rows as ReturnType<typeof policyUIRows>);},
}));
beforeEach(()=>{source.fail=false;source.rows=policyUIRows();});
it('renders the native Owner page with valid current and malformed historical policy',async()=>{
 const html=renderToStaticMarkup(await Page());expect(html).toContain('Company policies');expect(html).toContain('Saved revision 3');expect(html).toContain('Revision unavailable');expect(html).not.toContain('NEVER_RENDER_INVALID_PRIVATE_PAYLOAD');
});
it('renders selected-invalid recovery without activating an older policy',async()=>{
 source.rows=policyUIRows(false);const html=renderToStaticMarkup(await Page());expect(html).toContain('Current revision 2 unavailable');expect(html).not.toContain('name="lateness.threshold"');
});
it('renders private retryable unavailable state rather than an actionable empty editor',async()=>{
 source.fail=true;const html=renderToStaticMarkup(await Page());expect(html).toContain('Policies unavailable');expect(html).toContain('Retry read');expect(html).not.toContain('PRIVATE_SQL_DIAGNOSTIC');expect(html).not.toContain('Save policies');
});
