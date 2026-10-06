import { renderToStaticMarkup } from 'react-dom/server';
import { expect, it, vi } from 'vitest';
import { PortalSignout, startSignoutCleanup } from './portal-signout';
vi.mock('@/app/login/actions',()=>({logout:vi.fn()}));
it('retains native server action submit form',()=>{
 const html=renderToStaticMarkup(<PortalSignout className="sidebar-signout-form"><button type="submit">Sign out</button></PortalSignout>);
 expect(html).toContain('<form'); expect(html).toContain('type="submit"'); expect(html).toContain('sidebar-signout-form');
});
it('cleanup failure or never resolving cleanup cannot prevent native submission',()=>{
 expect(startSignoutCleanup(()=>Promise.reject(Error('offline')))).toBeUndefined();
 expect(startSignoutCleanup(()=>new Promise(()=>{}))).toBeUndefined();
 expect(startSignoutCleanup(()=>{throw Error('storage');})).toBeUndefined();
});
