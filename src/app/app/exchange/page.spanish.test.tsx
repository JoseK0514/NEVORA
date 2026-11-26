// G98 (Phase 2): an Employee's Pick up and swap follows their language (readPortalLanguage with the page's session proof).
import * as rstestOriginal0 from "@/lib/workspace-presentation/service" with { rstest: 'importActual' };
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { beforeEach, expect, it, rs } from '@rstest/core';
import ExchangePage from './page';
import type { ExchangeRecord } from '../../../lib/data/exchanges';
import type { CalloutRecord } from '../../../lib/data/callouts';
const f=rs.hoisted(()=>({activity:[] as ExchangeRecord[],callouts:[] as CalloutRecord[],open:[] as ExchangeRecord[],language:'es' as 'en'|'es',fail:false}));
rs.mock('next/link',()=>({default:({children,...props}:React.ComponentProps<'a'>)=>createElement('a',props,children)}));
rs.mock('next/navigation',()=>({useRouter:()=>({refresh:()=>{}})}));
rs.mock('@/lib/scheduling/validate-shift',()=>({schedulingIssueMessage:()=>undefined}));
rs.mock('@/components/manager-shift-requests',()=>({ManagerShiftRequests:()=>null}));
rs.mock('@/components/nav-icon',()=>({NavIcon:()=>null}));
rs.mock('@/lib/auth/permissions',()=>({isManagerRole:()=>false}));
rs.mock('@/lib/auth/session',()=>({requireSession:async()=>({id:'self',role:'EMPLOYEE'}),requireSessionMutationProof:async()=>({employee:{id:'self',role:'EMPLOYEE'},sessionTokenHash:'a'.repeat(64)})}));
rs.mock('@/lib/activation/language.server',()=>({readPortalLanguage:async()=>{if(f.fail)throw Error('language_source_unavailable');return {state:'ready',savedLanguage:f.language,language:f.language};}}));
rs.mock('@/lib/data/notification-state',()=>({sqlNotificationStateRepository:()=>({recipientAccess:async()=>({employeeId:'self',role:'EMPLOYEE',active:true,allowedLocationIds:['2']})})}));
rs.mock('@/lib/data/callouts',()=>({listEmployeeCallouts:async()=>f.callouts,getCallout:async()=>null,shownCalloutTerms:(_callout:unknown,terms:unknown)=>terms}));
rs.mock('@/lib/data/exchanges',()=>({listEmployeeExchangeActivity:async()=>f.activity,listEmployeePublishedShifts:async()=>[],listIncomingSwaps:async()=>[],listOpenCoverage:async()=>f.open,getExchange:async()=>null}));
rs.mock('@/app/app/exchange/actions',()=>({shiftChangeAction:rs.fn(),reconcileShiftChangeAction:rs.fn(),cancelExchangeAction:rs.fn(),claimCoverageAction:rs.fn(),offerCoverageAction:rs.fn(),respondSwapAction:rs.fn()}));
rs.mock('@/app/app/exchange/callout/actions',()=>({cancelCalloutAction:rs.fn()}));
rs.mock("@/lib/data/workspaces",()=>({getWorkspace:async()=>({timeZone:"America/Puerto_Rico"})}));
rs.mock('@/lib/data/shift-change-views',()=>({readShiftChangeHistoryView:async()=>[],readShiftChangeOperationView:rs.fn(async()=>null)}));
rs.mock('@/lib/data/shift-change-snapshot',()=>({readShiftChangeTerms:async()=>null}));
rs.mock('@/lib/data/shift-changes',()=>({readShiftChangeAvailability:rs.fn(async()=>({allowed:true,notice:null,outcome:'completed'}))}));
rs.mock('@/lib/workspace-presentation/service',  () => ({ ...(rstestOriginal0), readActivePresentation: async () => ({ style: undefined, tokens: null, logoAssetId: null, revision: 0, words: 'standard' as const, modules: (await import('@/lib/workspace-presentation/modules')).ALL_MODULES_ON }) }));
function exchange(id:string,extra:Partial<ExchangeRecord>={}):ExchangeRecord{return {id,kind:'SWAP',status:'OPEN',requestedByEmployeeId:'self',targetEmployeeId:'other',requestedByName:'Ana Rivera',requestedByRole:'EMPLOYEE',requestRevision:1,sourceShift:{id:'shift',scheduleId:'week',employeeId:'self',employeeName:'Ana Rivera',locationId:'2',locationName:'Condado',weekStart:'2035-12-03',date:'2035-12-03',startTime:'06:00',endTime:'14:00'},createdAt:'2035-10-03T12:00:00Z',...extra};}
beforeEach(()=>{f.activity=[];f.callouts=[];f.open=[];f.language='es';f.fail=false;});
const hasWord=(s:string,w:string)=>new RegExp(`(^|[^\\p{L}])${w}(?![\\p{L}])`,"u").test(s);
const text=(html:string)=>html.replace(/<[^>]+>/g,' ').replace(/[\s ]+/g,' ').trim();
const render=async(tab:string)=>text(renderToStaticMarkup(await ExchangePage({searchParams:Promise.resolve({tab})})));

it('renders an Employee’s own requests in Puerto Rico Spanish',async()=>{
 f.activity=[exchange('swap')];
 f.callouts=[{id:'c1',shiftId:'shift',employeeId:'self',employeeName:'Ana Rivera',locationId:'2',locationName:'Condado',weekStart:'2035-12-03',date:'2035-12-03',startTime:'06:00',endTime:'14:00',reasonCode:'ILLNESS',status:'PENDING',requestRevision:1,createdAt:'2035-10-03T12:00:00Z'} as CalloutRecord];
 const words=await render('requests');
 for(const w of ['Solicitudes de turno','Solicitudes','Disponibles','Para ti','Tuyas','Intercambio','Ofrecido','Tu turno','6:00 a. m. – 2:00 p. m.','Retirar solicitud','No puedo trabajar','Enfermedad','Motivo','Localidad','En espera'])expect(words).toContain(w);
 for(const w of ['Shift requests','Yours','Your shift','Withdraw request','Can’t work','Illness','Reason',' AM',' PM'])expect(hasWord(words,w)).toBe(false);
});
it('renders open shifts and the empty states in Spanish',async()=>{
 f.open=[exchange('open',{requestedByEmployeeId:'other',actionable:true})];
 const words=await render('available');
 for(const w of ['Turnos disponibles publicados','Turno disponible','de Ana R','Ofrecido por','Tomar','Al tomarlo'])expect(words).toContain(w);
 for(const w of ['Open shift','Offered by','Claim'])expect(hasWord(words,w)).toBe(false);
 f.open=[];expect(await render('available')).toContain('No hay turnos disponibles ahora');
 expect(await render('foryou')).toContain('Nada espera tu respuesta');
 expect(await render('requests')).toContain('Todavía no hay solicitudes');
});
it('stays in English when the person’s language is English or the read fails',async()=>{
 f.language='en';expect(await render('requests')).toContain('No requests yet');
 f.fail=true;f.language='es';expect(await render('requests')).toContain('No requests yet');
});
