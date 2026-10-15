import {expect,it,vi} from 'vitest';
import {renderToStaticMarkup} from 'react-dom/server';
vi.mock('@/lib/data/workspaces',()=>({getPublicWorkspaceName:async()=> 'Fictional workspace'}));
vi.mock('./actions',()=>({activateAccountAction:async()=>{}}));
import ActivatePage from './page';
it('does not offer ID and phone knowledge as activation proof to a public visitor',async()=>{
 const html=renderToStaticMarkup(await ActivatePage({searchParams:Promise.resolve({})}));
 expect(html).not.toContain('name="employeeId"');expect(html).not.toContain('name="phone"');expect(html).not.toContain('action="/activate');
 expect(html).toContain('Activate account');
});
