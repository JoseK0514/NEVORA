import {renderToStaticMarkup} from 'react-dom/server';
import {describe,it,expect,vi} from 'vitest';
import {projectCompanyPolicyHistory} from '../lib/business-improvements/company-policies/history';
import {policyUIRows} from '../test/fixtures/company-policy-history-ui';
import {CompanyPolicyEditor} from './company-policy-editor';
vi.mock('next/navigation',()=>({useRouter:()=>({refresh:()=>{}})}));
const locations=[{id:'loc-1',name:'Northside',active:true}];
const render=(rows=policyUIRows())=>renderToStaticMarkup(<CompanyPolicyEditor history={projectCompanyPolicyHistory(rows)} locations={locations} timeZone="America/Puerto_Rico"/>);
describe('Owner policy history display',()=>{
 it('uses the numerical current revision and keeps malformed older history readable',()=>{
  const html=render();expect(html).toContain('Saved revision 3');expect(html).toContain('Revision 2');expect(html).toContain('Revision unavailable');expect(html).toContain('Change details unavailable');expect(html).toContain('value="9"');expect(html).not.toContain('NEVER_RENDER_INVALID_PRIVATE_PAYLOAD');expect(html).not.toContain('private-invalid-key-metadata');
 });
 it('holds the invalid current policy until explicit earlier-valid replacement review',()=>{
  const html=render(policyUIRows(false));expect(html).toContain('Current revision 2 unavailable');expect(html).toContain('Review revision 1 as a replacement draft');expect(html).not.toContain('name="lateness.threshold"');expect(html).not.toContain('Save policies');expect(html).not.toContain('NEVER_RENDER_INVALID_PRIVATE_PAYLOAD');
 });
 it('does not invent an empty replacement when no valid same-scope history exists',()=>{
  const html=render(policyUIRows(false).slice(1));expect(html).toContain('complete replacement');expect(html).not.toContain('name="lateness.threshold"');expect(html).not.toContain('Review revision 1');
 });
 it('shows Owner-private values that a complete replacement will preserve',()=>{
  const html=render();expect(html).toContain('Private labor settings');expect(html).toContain('Owner-approved compensation reference');expect(html).toContain('12.125 USD');expect(html).toContain('900.50 USD');expect(html).toContain('owner-method');expect(html).toContain('revision 4');
 });
 it('keeps a truly empty company distinct from malformed history',()=>{
  const html=render([]);expect(html).toContain('No saved revision');expect(html).toContain('Save policies');expect(html).not.toContain('Current revision');expect(html).toContain('No saved policy changes');
 });
 it('keeps persisted inactive scope history reachable without offering its correction',()=>{
  const html=render(policyUIRows(false,'retired-location'));expect(html).toContain('retired-location');expect(html).toContain('Historical location');
 });
});
