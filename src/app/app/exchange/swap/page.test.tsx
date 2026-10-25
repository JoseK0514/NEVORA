import {createElement,type ComponentProps} from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {beforeEach,expect,it,vi} from 'vitest';
import type {ExchangeShift} from '../../../../lib/data/exchanges';
import SwapPage from './page';
vi.mock('@/lib/workspace-presentation/service', async importOriginal => ({ ...(await importOriginal<typeof import('@/lib/workspace-presentation/service')>()), readActivePresentation: async () => ({ style: undefined, tokens: null, logoAssetId: null, revision: 0, words: 'standard' as const, modules: (await import('@/lib/workspace-presentation/modules')).ALL_MODULES_ON }) })); // no saved settings: every module on
const state=vi.hoisted(()=>({source:null as ExchangeShift|null,target:null as ExchangeShift|null,sourceChange:{} as Partial<ExchangeShift>,targetChange:{} as Partial<ExchangeShift>,sourceFingerprintChange:false,refuse:null as null|string}));
vi.mock('@/lib/auth/permissions',()=>({requireSelfService:async()=>({id:'self',role:'EMPLOYEE'})}));
vi.mock('@/lib/auth/session',()=>({requireSessionMutationProof:async()=>({employee:{id:'self',role:'EMPLOYEE'},sessionTokenHash:'a'.repeat(64)})}));
vi.mock('@/lib/data/workspaces',()=>({getWorkspace:async()=>({timeZone:'America/Puerto_Rico'})}));
vi.mock('@/lib/business-time',()=>import('../../../../lib/business-time'));
vi.mock('@/lib/date-utils',()=>import('../../../../lib/date-utils'));
vi.mock('@/components/nav-icon',()=>({NavIcon:()=>null}));
vi.mock('@/components/shift-slot',()=>import('../../../../components/shift-slot'));
vi.mock('@/components/reviewed-swap-form',()=>import('../../../../components/reviewed-swap-form'));
vi.mock('@/app/app/exchange/actions',()=>({shiftChangeAction:vi.fn(),reconcileShiftChangeAction:vi.fn()}));
vi.mock('next/navigation',()=>({redirect:(p:string)=>{throw Error('redirect:'+p);},useRouter:()=>({refresh:vi.fn()})}));
vi.mock('next/link',()=>({default:({href,children,...props}:ComponentProps<'a'>)=>createElement('a',{href,...props},children)}));
vi.mock('@/lib/data/exchanges',()=>({getPublishedShift:async()=>state.source,listSwapTargets:async()=>state.target?[state.target]:[]}));
vi.mock('@/lib/data/shift-change-snapshot',()=>({readShiftChangeTerms:async(_proof:unknown,_source:string,target?:string)=>({source:material({...state.source!,...state.sourceChange}),sourceTermsFingerprint:target&&state.sourceFingerprintChange?'v1:source-replaced':'v1:source',target:target?material({...state.target!,...state.targetChange}):null,targetTermsFingerprint:target?'v1:target':null})}));
function material(s:ExchangeShift){return {timeZone:s.timeZone,termsRevision:s.termsRevision,shiftId:s.id,scheduleId:s.scheduleId,employeeId:s.employeeId,locationId:s.locationId,weekStart:s.weekStart,date:s.date,startTime:s.startTime,endTime:s.endTime,positionId:s.positionId??null,isDesignatedLead:!!s.isDesignatedLead,assignmentEpisodeId:s.assignmentEpisodeId};}
beforeEach(()=>{state.source={timeZone:'America/Puerto_Rico',termsRevision:1,assignmentEpisodeId:'episode-source',id:'source',scheduleId:'schedule',employeeId:'self',employeeName:'Fictional Employee',locationId:'loc',locationName:'North',weekStart:'2035-10-01',date:'2035-10-03',startTime:'08:00',endTime:'16:00',positionId:'cashier',positionName:'Cashier',isDesignatedLead:true};state.target={...state.source,id:'target',assignmentEpisodeId:'episode-target',employeeId:'other',employeeName:'Fictional Partner',date:'2035-10-04',startTime:'10:00',endTime:'18:00'};state.sourceChange={};state.targetChange={};state.sourceFingerprintChange=false;});
const render=async(mode?:string)=>renderToStaticMarkup(await SwapPage({searchParams:Promise.resolve({sourceShiftId:'source',...(mode?{mode}:{})})}));
it('unchanged displayed assignments are bound to reviewed source and target without a default consent',async()=>{const result=await render();expect(result).toContain('value="v1:source"');expect(result).toContain('Cashier');expect(result).toContain('Fictional Partner');expect(result).toContain('Send swap request');expect(result).not.toContain('name="targetTermsFingerprint"');});
it.each([{timeZone:'America/New_York'},{termsRevision:2},{assignmentEpisodeId:'new-episode'},{startTime:'12:00',endTime:'20:00'},{locationId:'replacement-location'},{positionId:'replacement-position'},{employeeId:'replacement-owner'}])('source material change refuses the undisplayed assignment: %j',async sourceChange=>{state.sourceChange=sourceChange;await expect(render()).rejects.toThrow('error=EXCHANGE_CHANGED');});
it.each([{timeZone:'America/New_York'},{termsRevision:2},{assignmentEpisodeId:'new-episode'},{startTime:'12:00',endTime:'20:00'},{locationId:'replacement-location'},{positionId:'replacement-position'},{employeeId:'replacement-owner'}])('target material change excludes that undisplayed replacement: %j',async targetChange=>{state.targetChange=targetChange;const result=await render();expect(result).not.toContain('<form');expect(result).not.toContain('Fictional Partner');expect(result).toContain('No one can swap this week');});
it.each([{termsRevision:2},{startTime:'12:00',endTime:'20:00'},{employeeId:'replacement-owner'}])('v5 Offer it for cover (mode=cover) refuses a changed source the same way: %j',async sourceChange=>{state.sourceChange=sourceChange;await expect(render('cover')).rejects.toThrow('error=EXCHANGE_CHANGED');});
it('v5 Offer it for cover (mode=cover) shows only the checked coverage offer, never swap candidates',async()=>{const result=await render('cover');expect(result).toContain('value="OFFER_COVERAGE"');expect(result).not.toContain('Fictional Partner');expect(result).not.toContain('value="PROPOSE_SWAP"');});
it('source fingerprint changing while target is reviewed withholds the mixed-snapshot builder',async()=>{state.sourceFingerprintChange=true;expect(await render()).not.toContain('<form');});
it('explains a rule refusal when the rules refuse every target and coverage too (deadline passed)', async()=>{
  state.refuse='The deadline for changes to this shift has passed.';
  const html=await render();
  // T-25: Swap keeps its title and offers cover as a link; the cover sheet then names the refusal.
  const cover=await render('cover');
  state.refuse=null;
  expect(html).toContain('No one can swap this week');
  expect(html).toContain('>Swap shift<');
  expect(html).not.toContain('<form');
  expect(cover).toContain('The deadline for changes to this shift has passed.');
  expect(cover).not.toContain('<form');
});
it('keeps explicit selection and a safe coverage path when there are no targets', async()=>{
  const html=await render();
  expect(html).toContain('type="radio"');
  expect(html).not.toContain('checked=""');
  expect(html).toContain('disabled=""');
  expect(html).toContain('Trade with');
  state.target=null;
  const empty=await render();
  // T-25 / P1-3: with no partner the sheet stays "Swap shift" and never turns into another form by itself; it links to
  // Offer it for cover. F2: that fallback is the real coverage offer for this source, never the inability (callout) form.
  expect(empty).toContain('>Swap shift<');
  expect(empty).not.toContain('>Offer for cover<');
  expect(empty).not.toContain('value="OFFER_COVERAGE"');
  expect(empty).toContain('Offer it for cover instead');
  expect(empty).toContain('href="/app/exchange/swap?sourceShiftId=source&amp;mode=cover"');
  expect(empty).not.toContain('/app/exchange/callout');
  const cover=await render('cover');
  expect(cover).toContain('value="OFFER_COVERAGE"');
  expect(cover).toContain('Offer for cover');
  expect(cover).not.toContain('/app/exchange/callout');
});

vi.mock('@/lib/data/shift-changes',()=>({readShiftChangeAvailability:async()=>state.refuse?{allowed:false,notice:state.refuse}:{allowed:true,notice:null}}));
it('opened without choosing a shift returns to Shift requests with no false error (inspection Oct 24)',async()=>{
 await expect(SwapPage({searchParams:Promise.resolve({})})).rejects.toThrow(/^redirect:\/app\/exchange$/);
});
