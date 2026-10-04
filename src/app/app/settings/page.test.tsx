import {it,expect,vi} from 'vitest';
import {renderToStaticMarkup} from 'react-dom/server';
vi.mock('@/lib/auth/permissions',()=>({requireRoles:vi.fn()}));
vi.mock('@/components/page-header',()=>import('../../../components/page-header'));
import SettingsPage from './page';
it('Owner settings exposes working workspace, location and position destinations',async()=>{
 const html=renderToStaticMarkup(await SettingsPage());
 for(const path of ['workspace','locations','positions'])expect(html).toContain(`href="/app/settings/${path}"`);
 expect(html).not.toContain('two Fuel');
});
