import * as rstestOriginal0 from "@/lib/workspace-presentation/service" with { rstest: 'importActual' };
import * as rstestOriginal1 from "@/components/employee-submit-button" with { rstest: 'importActual' };
import {createElement} from 'react';import {renderToStaticMarkup} from 'react-dom/server';import {expect,it,rs} from '@rstest/core';
rs.mock('next/link',()=>({default:({children,...p}:React.ComponentProps<'a'>)=>createElement('a',p,children)}));rs.mock('next/navigation',()=>({redirect:(p:string)=>{throw Error(p);},useRouter:()=>({refresh:()=>{}})}));
rs.mock('@/lib/auth/permissions',()=>({requireSelfService:async()=>({id:'self',role:'LEAD'})}));rs.mock('@/lib/data/workspaces',()=>({getWorkspace:async()=>({timeZone:'America/Puerto_Rico'})}));
const shown=rs.hoisted(()=>({held:null as null|Record<string,unknown>}));
rs.mock('@/lib/data/exchanges',()=>({getCalloutShift:async()=>shown.held??({held:false,timeZone:'America/Puerto_Rico',assignmentEpisodeId:'episode',termsRevision:1,id:'shift',employeeId:'self',date:'2026-10-03',startTime:'23:00',endTime:'07:00',locationName:'West Drive',positionName:'Service coordinator',isDesignatedLead:true})}));

rs.mock('@/app/app/exchange/actions',()=>({shiftChangeAction:async()=>({status:'unavailable'}),reconcileShiftChangeAction:async()=>null}));
import CalloutPage from './page';
rs.mock('@/lib/workspace-presentation/service',  () => ({ ...(rstestOriginal0), readActivePresentation: async () => ({ style: undefined, tokens: null, logoAssetId: null, revision: 0, words: 'standard' as const, modules: (await import('@/lib/workspace-presentation/modules')).ALL_MODULES_ON }) })); // no saved settings: every module on
const clock=rs.hoisted(()=>({observedAt:'2026-10-04T09:00:00Z'}));
it('genuine ongoing overnight absence remains reportable from the previous business date',async()=>{rs.useFakeTimers();rs.setSystemTime(new Date('2026-10-04T09:00:00Z'));try{const h=renderToStaticMarkup(await CalloutPage({searchParams:Promise.resolve({shiftId:'shift'})}));/* B7 wording (NV-119) */expect(h).toContain('Can’t work this shift');expect(h).toContain('Service coordinator');expect(h).toContain('Shift lead');expect(h).toContain('name="reasonCode"');}finally{rs.useRealTimers();}});
rs.mock('@/components/employee-submit-button',()=>({...rstestOriginal1,EmployeeSubmitButton:({children,...p}:React.ComponentProps<'button'>)=>createElement('button',p,children)}));
rs.mock('@/app/app/exchange/callout/actions',()=>({submitCalloutAction:async()=>{}}));





rs.mock('@/lib/auth/session',()=>({requireSessionMutationProof:async()=>({employee:{id:'self',role:'LEAD'},sessionTokenHash:'a'.repeat(64)})}));

rs.mock('@/lib/data/shift-change-snapshot',()=>({readShiftChangeTerms:async()=>({observedAt:clock.observedAt,source:{timeZone:'America/Puerto_Rico',assignmentEpisodeId:'episode',termsRevision:1,shiftId:'shift',employeeId:'self',date:'2026-10-03',startTime:'23:00',endTime:'07:00',positionId:null,isDesignatedLead:true},sourceTermsFingerprint:'v1:reviewed'})}));

it('ended-shift exclusion uses the coherent server observation even when rendering clock differs',async()=>{
 rs.useFakeTimers();rs.setSystemTime(new Date('2026-10-04T09:00:00Z'));clock.observedAt='2026-10-04T12:00:00Z';
 try {await expect(CalloutPage({searchParams:Promise.resolve({shiftId:'shift'})})).rejects.toThrow('error=INVALID_SHIFT');}
 finally {clock.observedAt='2026-10-04T09:00:00Z';rs.useRealTimers();}
});
it('opened without choosing a shift asks for the shift on Schedule (review B6, NV-290)',async()=>{
 await expect(CalloutPage({searchParams:Promise.resolve({})})).rejects.toThrow(/^\/app\/schedule\?intent=callout$/);
});
// Jose, 2026-10-31: a shift with held edits still opens. The employee sees the
// published version; the report binds to the live assignment (later end here).
it('a held shift opens with its published times and binds the report to the live assignment',async()=>{
 rs.useFakeTimers();rs.setSystemTime(new Date('2026-10-04T09:00:00Z'));
 shown.held={held:true,timeZone:'America/Puerto_Rico',assignmentEpisodeId:'episode',termsRevision:1,id:'shift',employeeId:'self',date:'2026-10-03',startTime:'22:00',endTime:'06:30',locationName:'West Drive',positionName:'Service coordinator',isDesignatedLead:true};
 try{
  const h=renderToStaticMarkup(await CalloutPage({searchParams:Promise.resolve({shiftId:'shift'})}));
  /* B7 wording (NV-119) */expect(h).toContain('Can’t work this shift');expect(h).toContain('name="reasonCode"');
  expect(h).toContain('value="v1:reviewed"');expect(h).toContain('value="SUBMIT_CALLOUT"');
  expect(h).toMatch(/10:00\s?PM|22:00/);expect(h).not.toMatch(/11:00\s?PM|23:00/);
  expect(h).not.toMatch(/held/i);
 }finally{shown.held=null;rs.useRealTimers();}
});
