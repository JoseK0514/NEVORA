import {createElement} from 'react';import {renderToStaticMarkup} from 'react-dom/server';import {expect,it,vi} from 'vitest';
vi.mock('next/link',()=>({default:({children,...p}:React.ComponentProps<'a'>)=>createElement('a',p,children)}));vi.mock('next/navigation',()=>({redirect:(p:string)=>{throw Error(p);},useRouter:()=>({refresh:()=>{}})}));
vi.mock('@/lib/auth/permissions',()=>({requireSelfService:async()=>({id:'self',role:'LEAD'})}));vi.mock('@/lib/data/workspaces',()=>({getWorkspace:async()=>({timeZone:'America/Puerto_Rico'})}));
const shown=vi.hoisted(()=>({held:null as null|Record<string,unknown>}));
vi.mock('@/lib/data/exchanges',()=>({getCalloutShift:async()=>shown.held??({held:false,timeZone:'America/Puerto_Rico',assignmentEpisodeId:'episode',termsRevision:1,id:'shift',employeeId:'self',date:'2026-10-03',startTime:'23:00',endTime:'07:00',locationName:'West Drive',positionName:'Service coordinator',isDesignatedLead:true})}));
vi.mock('@/lib/date-utils',()=>import('../../../../lib/date-utils'));vi.mock('@/lib/business-time',()=>import('../../../../lib/business-time'));
vi.mock('@/app/app/exchange/actions',()=>({shiftChangeAction:async()=>({status:'unavailable'}),reconcileShiftChangeAction:async()=>null}));
import CalloutPage from './page';
vi.mock('@/lib/workspace-presentation/service', async importOriginal => ({ ...(await importOriginal<typeof import('@/lib/workspace-presentation/service')>()), readActivePresentation: async () => ({ style: undefined, tokens: null, logoAssetId: null, revision: 0, words: 'standard' as const, modules: (await import('@/lib/workspace-presentation/modules')).ALL_MODULES_ON }) })); // no saved settings: every module on
const clock=vi.hoisted(()=>({observedAt:'2026-10-04T09:00:00Z'}));
it('genuine ongoing overnight absence remains reportable from the previous business date',async()=>{vi.useFakeTimers();vi.setSystemTime(new Date('2026-10-04T09:00:00Z'));try{const h=renderToStaticMarkup(await CalloutPage({searchParams:Promise.resolve({shiftId:'shift'})}));/* B7 wording (NV-119) */expect(h).toContain('Can’t work this shift');expect(h).toContain('Service coordinator');expect(h).toContain('Shift lead');expect(h).toContain('name="reasonCode"');}finally{vi.useRealTimers();}});
vi.mock('@/components/employee-submit-button',async(importOriginal)=>({...await importOriginal<typeof import('@/components/employee-submit-button')>(),EmployeeSubmitButton:({children,...p}:React.ComponentProps<'button'>)=>createElement('button',p,children)}));
vi.mock('@/app/app/exchange/callout/actions',()=>({submitCalloutAction:async()=>{}}));

vi.mock('@/components/shift-change-form',()=>import('../../../../components/shift-change-form'));
vi.mock('@/components/shift-slot',()=>import('../../../../components/shift-slot'));

vi.mock('@/components/reviewed-callout-form',()=>import('../../../../components/reviewed-callout-form'));
vi.mock('@/lib/auth/session',()=>({requireSessionMutationProof:async()=>({employee:{id:'self',role:'LEAD'},sessionTokenHash:'a'.repeat(64)})}));
vi.mock('@/lib/shift-changes/displayed-terms',()=>import('../../../../lib/shift-changes/displayed-terms'));
vi.mock('@/lib/data/shift-change-snapshot',()=>({readShiftChangeTerms:async()=>({observedAt:clock.observedAt,source:{timeZone:'America/Puerto_Rico',assignmentEpisodeId:'episode',termsRevision:1,shiftId:'shift',employeeId:'self',date:'2026-10-03',startTime:'23:00',endTime:'07:00',positionId:null,isDesignatedLead:true},sourceTermsFingerprint:'v1:reviewed'})}));

it('ended-shift exclusion uses the coherent server observation even when rendering clock differs',async()=>{
 vi.useFakeTimers();vi.setSystemTime(new Date('2026-10-04T09:00:00Z'));clock.observedAt='2026-10-04T12:00:00Z';
 try {await expect(CalloutPage({searchParams:Promise.resolve({shiftId:'shift'})})).rejects.toThrow('error=INVALID_SHIFT');}
 finally {clock.observedAt='2026-10-04T09:00:00Z';vi.useRealTimers();}
});
it('opened without choosing a shift returns to My requests with no false error (inspection Oct 24)',async()=>{
 await expect(CalloutPage({searchParams:Promise.resolve({})})).rejects.toThrow(/^\/app\/exchange\?tab=my$/);
});
// Jose, 2026-10-31: a shift with held edits still opens. The employee sees the
// published version; the report binds to the live assignment (later end here).
it('a held shift opens with its published times and binds the report to the live assignment',async()=>{
 vi.useFakeTimers();vi.setSystemTime(new Date('2026-10-04T09:00:00Z'));
 shown.held={held:true,timeZone:'America/Puerto_Rico',assignmentEpisodeId:'episode',termsRevision:1,id:'shift',employeeId:'self',date:'2026-10-03',startTime:'22:00',endTime:'06:30',locationName:'West Drive',positionName:'Service coordinator',isDesignatedLead:true};
 try{
  const h=renderToStaticMarkup(await CalloutPage({searchParams:Promise.resolve({shiftId:'shift'})}));
  /* B7 wording (NV-119) */expect(h).toContain('Can’t work this shift');expect(h).toContain('name="reasonCode"');
  expect(h).toContain('value="v1:reviewed"');expect(h).toContain('value="SUBMIT_CALLOUT"');
  expect(h).toMatch(/10:00\s?PM|22:00/);expect(h).not.toMatch(/11:00\s?PM|23:00/);
  expect(h).not.toMatch(/held/i);
 }finally{shown.held=null;vi.useRealTimers();}
});
