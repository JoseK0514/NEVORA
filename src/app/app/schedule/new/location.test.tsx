import {beforeEach} from 'vitest';
import { createElement, type ComponentProps } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { expect, it, vi } from 'vitest';
import NewShiftPage from './page';
vi.mock('next/link',()=>({default:({children,...props}:ComponentProps<'a'>)=>createElement('a',props,children)}));
vi.mock('@/lib/auth/permissions',()=>({MANAGER_ROLES:['MANAGER','OWNER'],requireRoles:async()=>({id:'M',role:'MANAGER'})}));
vi.mock('@/lib/data/workspaces',()=>({getWorkspace:async()=>({timeZone:'America/Puerto_Rico'})}));
vi.mock('@/lib/data/employees',()=>({listEmployees:async()=>[],listLocations:async()=>[{id:'loc-1',shortName:'Main Office'},{id:'loc-2',shortName:'West Office'}]}));
vi.mock('@/lib/data/positions',()=>({listPositions:async()=>[]}));
vi.mock('@/app/app/schedule/actions',()=>({createShiftAction:vi.fn()}));
it('second-location entry visibly selects its destination and cancel keeps the location',async()=>{
 const html=renderToStaticMarkup(await NewShiftPage({searchParams:Promise.resolve({week:'2026-10-05',locationId:'loc-2'})}));
 expect(html).toMatch(/<select[^>]*name="locationId"[^>]*required/);
 expect(html).toContain('<option value="loc-2" selected="">West Office</option>');
 expect(html).toContain('href="/app/schedule?week=2026-10-05&amp;location=loc-2"');
});
it.each([undefined,'foreign-location'])('all-locations or invalid entry requires an explicit active location: %s',async locationId=>{
 const html=renderToStaticMarkup(await NewShiftPage({searchParams:Promise.resolve({week:'2026-10-05',locationId})}));
 expect(html).toContain('<option value="" disabled="" selected="">Choose a location</option>');
 expect(html).not.toContain('type="hidden" name="locationId"');
});
it('opened for a day and person, Back returns to that day and person (W2)',async()=>{
 const html=renderToStaticMarkup(await NewShiftPage({searchParams:Promise.resolve({week:'2026-10-05',locationId:'loc-2',date:'2026-10-07',employeeId:'AUDIT-E'})}));
 expect(html).toContain('href="/app/schedule?week=2026-10-05&amp;location=loc-2&amp;day=2026-10-07#schedule-employee-AUDIT-E"');
});

// Server composition tests; actual mounted finite-body behavior is checked separately.
const operationalPageFixture=vi.hoisted(()=>({denied:false}));
vi.mock('@/lib/company-access/operational-scope.server',()=>({readOperationalAuthority:async()=>({state:'ready',scope:{mode:'COMPANY',locationIds:[]}}),withOperationalCompany:async(_proof:unknown,load:()=>Promise<unknown>)=>operationalPageFixture.denied?{state:'unavailable',reason:'access_denied'}:{state:'ready',data:await load(),authority:'fixture',observedAt:'2026-10-14T12:00:00Z',validForMs:15000}}));
vi.mock('@/components/company-access/scoped-read-frame',()=>({ScopedReadFrame:({children,unavailable}:{children?:React.ReactNode;unavailable?:React.ReactNode})=>children??unavailable??null}));

beforeEach(()=>{operationalPageFixture.denied=false;});

vi.mock('@/lib/auth/session',()=>({requireSessionMutationProof:async()=>({employee:{id:'actor',role:'MANAGER'},sessionTokenHash:'a'.repeat(64)})}));

it('withholds protected body and commands after current company-scope denial',async()=>{operationalPageFixture.denied=true;const {default:GuardedPage}=await import('./page');const html=renderToStaticMarkup(await GuardedPage({searchParams:Promise.resolve({week:'2026-10-12'})}));expect(html).toContain('current company-wide management access');expect(html).not.toContain('Create shift');expect(html).not.toContain('name="employeeId"');});

vi.mock('@/lib/company-access/operational-read.server',()=>({readOperationalShiftEditor:async()=>{throw Error('Unexpected scoped read in Company fixture');}}));
