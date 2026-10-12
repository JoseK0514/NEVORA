import {it,expect,vi} from 'vitest';
import {renderToStaticMarkup} from 'react-dom/server';
vi.mock('@/lib/auth/permissions',()=>({requireRoles:vi.fn()}));
vi.mock('@/components/page-header',()=>import('../../../components/page-header'));
import SettingsPage from './page';
import {requireRoles} from '@/lib/auth/permissions';
it('Owner settings exposes working workspace, location and position destinations',async()=>{
 const html=renderToStaticMarkup(await SettingsPage());
 for(const path of ['workspace','locations','positions'])expect(html).toContain(`href="/app/settings/${path}"`);
 expect(html).not.toContain('two Fuel');
});

it('makes registered Clocker device setup discoverable from Settings',async()=>{
 expect(renderToStaticMarkup(await SettingsPage())).toContain('href="/app/settings/clocker"');
});

it('makes operational break configuration discoverable',async()=>{expect(renderToStaticMarkup(await SettingsPage())).toContain('href="/app/settings/breaks"');});

it('retains all eight destinations as directly named links with descriptions',async()=>{
 const html=renderToStaticMarkup(await SettingsPage());
 for(const path of [
  '/app/settings/workspace','/app/settings/locations','/app/settings/clocker',
  '/app/schedule/settings','/app/settings/breaks','/app/settings/positions',
  '/app/account-recovery','/app/clocker-recovery',
 ])expect(html.match(new RegExp(`href="${path}"`,'g'))).toHaveLength(1);
 expect(html.match(/<a[^>]*aria-labelledby="setting-[^"]+-title"[^>]*aria-describedby="setting-[^"]+-description"/g)).toHaveLength(8);
 expect(html).toContain('Job qualifications, separate from access roles.');
 expect(html).toContain('Break classifications and optional reference durations.');
});

it('requires Owner authorization before returning any settings content',async()=>{
 const guard=vi.mocked(requireRoles);
 guard.mockClear();
 const denied=new Error('fictional authorization refusal');
 guard.mockRejectedValueOnce(denied);
 await expect(SettingsPage()).rejects.toBe(denied);
 expect(guard).toHaveBeenCalledExactlyOnceWith(['OWNER']);
});
