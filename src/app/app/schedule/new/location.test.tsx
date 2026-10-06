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
 expect(html).toContain('<option value="" disabled="" selected="">Select location</option>');
 expect(html).not.toContain('type="hidden" name="locationId"');
});
