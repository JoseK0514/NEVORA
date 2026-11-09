import {renderToStaticMarkup} from 'react-dom/server';
import {describe,it,expect,vi} from 'vitest';
import {projectCompanyPolicyHistory} from '../lib/business-improvements/company-policies/history';
import {policyUIRows,policyUISettings} from '../test/fixtures/company-policy-history-ui';
import {CompanyPolicyEditor,buildPolicySettings,CurrentPolicyRules} from './company-policy-editor';
vi.mock('next/navigation',()=>({useRouter:()=>({refresh:()=>{}})}));
const locations=[{id:'loc-1',name:'Northside',active:true}];
const render=(rows=policyUIRows())=>renderToStaticMarkup(<CompanyPolicyEditor history={projectCompanyPolicyHistory(rows)} locations={locations} timeZone="America/Puerto_Rico"/>);
describe('Owner policy history display',()=>{
 it('uses the numerical current revision and keeps malformed older history readable',()=>{
  const html=render();expect(html).toContain('q-rv--l">Revision 3<');expect(html).toContain('Revision 2');expect(html).toContain('Revision unavailable');expect(html).toContain('Change details unavailable');expect(html).toContain('value="9"');expect(html).not.toContain('NEVER_RENDER_INVALID_PRIVATE_PAYLOAD');expect(html).not.toContain('private-invalid-key-metadata');
 });
 it('holds the invalid current policy until explicit earlier-valid replacement review',()=>{
  const html=render(policyUIRows(false));expect(html).toContain('Current revision 2 unavailable');expect(html).toContain('Review revision 1 as a replacement draft');expect(html).not.toContain('name="lateness.threshold"');expect(html).not.toContain('Save policies');expect(html).not.toContain('NEVER_RENDER_INVALID_PRIVATE_PAYLOAD');
 });
 it('does not invent an empty replacement when no valid same-scope history exists',()=>{
  const html=render(policyUIRows(false).slice(1));expect(html).toContain('complete replacement');expect(html).not.toContain('name="lateness.threshold"');expect(html).not.toContain('Review revision 1');
 });
 it('shows Owner-private values that a complete replacement will preserve',()=>{
  const html=render();expect(html).toContain('Labor settings');expect(html).toContain('Owner-approved compensation reference');expect(html).toContain('12.125 USD');expect(html).toContain('900.50 USD');expect(html).toContain('owner-method');expect(html).toContain('revision 4');
 });
 it('keeps a truly empty company distinct from malformed history',()=>{
  const html=render([]);expect(html).toContain('q-rv--l">No changes yet<');expect(html).toContain('Save policies');expect(html).not.toContain('Current revision');expect(html).toContain('No saved policy changes');
 });
 it('keeps persisted inactive scope history reachable without offering its correction',()=>{
  const html=render(policyUIRows(false,'retired-location'));expect(html).toContain('retired-location');expect(html).toContain('Historical location');
 });
});
describe('complete reviewed policy command settings',()=>{
 const form=()=>{const data=new FormData();for(const key of ['lateness','earlyDeparture','longEntry','missingClockIn','missingClockOut','overtimeRisk'])data.set(key+'.mode','inherit');return data;};
 it('preserves private labor while editing one scalar and explicit disabled attendance',()=>{
  const data=form();data.set('lateness.mode','configured');data.set('lateness.threshold','12');data.set('lateness.comparison','GT');data.set('lateness.effective','2030-09-30T20:00');data.set('earlyDeparture.mode','none');
  const result=buildPolicySettings(data,policyUISettings,'America/Puerto_Rico');expect(result.attendance).toEqual({lateness:{thresholdMinutes:12,comparison:'GT',effectiveFrom:'2030-10-01T00:00:00Z'},earlyDeparture:null});expect(result.labor).toEqual(policyUISettings.labor);expect(policyUISettings.attendance!.lateness!.thresholdMinutes).toBe(7);
 });
 it('preserves absent sections, explicit null and empty private overrides',()=>{
  expect(buildPolicySettings(form(),{version:1,labor:{rates:null,budgets:[]}},'America/Puerto_Rico')).toEqual({version:1,labor:{rates:null,budgets:[]}});
 });
 it('does not silently turn an empty custom threshold into zero',()=>{
  const data=form();data.set('lateness.mode','configured');data.set('lateness.threshold','');expect(()=>buildPolicySettings(data,policyUISettings,'America/Puerto_Rico')).toThrow(/Choose threshold minutes/);
 });
});

describe('current rule comparison',()=>{
 it('shows semantic fields when the saved thresholds are unchanged',()=>{
  const threshold={thresholdMinutes:600,comparison:'GT' as const,effectiveFrom:'2030-10-01T00:00:00Z'};
  const settings={version:1 as const,attendance:{
   longEntry:{...threshold,basis:'EFFECTIVE_ELAPSED' as const,appliesTo:'OPEN' as const},
   missingClockIn:{...threshold,association:'CAPTURED_PUBLISHED_SHIFT' as const,cutoff:'AFTER_SCHEDULE_END' as const},
   missingClockOut:{...threshold,association:'CAPTURED_PUBLISHED_SHIFT' as const,cutoff:'AFTER_SCHEDULE_END' as const},
  },labor:{overtimeRisk:{...threshold,basis:'EFFECTIVE_ELAPSED_INCLUDING_BREAKS' as const,window:'BUSINESS_WEEK' as const,aggregation:'LOCATION' as const,dayBoundaryTime:'04:30',weekStartsOn:3}}};
  const html=renderToStaticMarkup(<CurrentPolicyRules settings={settings} scope="" timeZone="America/Puerto_Rico"/>);
  for(const text of ['Time basis','Effective elapsed after corrections','Currently open','Schedule association','Captured published shift','Observation cutoff','After published end','Effective elapsed including breaks','Business week','At this location','Business day starts','04:30','Week starts on','Wednesday'])expect(html).toContain(text);
  expect(html).not.toContain('EFFECTIVE_ELAPSED');
 });
 it('distinguishes inherited and disabled values without inventing custom details',()=>{
  const html=renderToStaticMarkup(<CurrentPolicyRules settings={{version:1,attendance:{earlyDeparture:null}}} scope="loc-1" timeZone="America/Puerto_Rico"/>);
  expect(html).toContain('Inherit company default');expect(html).toContain('Disabled');expect(html).not.toContain('Threshold minutes');
 });
});
