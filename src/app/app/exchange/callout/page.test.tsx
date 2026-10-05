import {createElement} from 'react';import {renderToStaticMarkup} from 'react-dom/server';import {expect,it,vi} from 'vitest';
vi.mock('next/link',()=>({default:({children,...p}:React.ComponentProps<'a'>)=>createElement('a',p,children)}));vi.mock('next/navigation',()=>({redirect:(p:string)=>{throw Error(p);},useRouter:()=>({refresh:()=>{}})}));
vi.mock('@/lib/auth/permissions',()=>({requireSelfService:async()=>({id:'self',role:'LEAD'})}));vi.mock('@/lib/data/workspaces',()=>({getWorkspace:async()=>({timeZone:'America/Puerto_Rico'})}));
vi.mock('@/lib/data/exchanges',()=>({getPublishedShift:async()=>({id:'shift',employeeId:'self',date:'2026-10-03',startTime:'23:00',endTime:'07:00',locationName:'West Drive',positionName:'Service coordinator',isDesignatedLead:true})}));
vi.mock('@/lib/date-utils',()=>import('../../../../lib/date-utils'));vi.mock('@/lib/business-time',()=>import('../../../../lib/business-time'));
vi.mock('@/app/app/exchange/actions',()=>({shiftChangeAction:async()=>({status:'unavailable'}),reconcileShiftChangeAction:async()=>null}));
import CalloutPage from './page';
it('genuine ongoing overnight absence remains reportable from the previous business date',async()=>{vi.useFakeTimers();vi.setSystemTime(new Date('2026-10-04T09:00:00Z'));try{const h=renderToStaticMarkup(await CalloutPage({searchParams:Promise.resolve({shiftId:'shift'})}));expect(h).toContain('Unable to Work');expect(h).toContain('Service coordinator');expect(h).toContain('Designated Lead');expect(h).toContain('name="reasonCode"');}finally{vi.useRealTimers();}});
vi.mock('@/components/employee-submit-button',()=>({EmployeeSubmitButton:({children,...p}:React.ComponentProps<'button'>)=>createElement('button',p,children)}));
vi.mock('@/app/app/exchange/callout/actions',()=>({submitCalloutAction:async()=>{}}));

vi.mock('@/components/shift-change-form',()=>import('../../../../components/shift-change-form'));
vi.mock('@/components/shift-slot',()=>import('../../../../components/shift-slot'));
