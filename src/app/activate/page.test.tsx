import {expect,it,rs} from '@rstest/core';
import {renderToStaticMarkup} from 'react-dom/server';
rs.mock('@/lib/data/workspaces',()=>({getPublicWorkspaceName:async()=> 'Fictional workspace'}));
import ActivatePage from './page';
it('renders the approved activation shell and workspace guidance (server-render smoke only)',async()=>{
 const html=renderToStaticMarkup(await ActivatePage({searchParams:Promise.resolve({})}));
 expect(html).toMatch(/<h1\b[^>]*>Set up your account<\/h1>/);expect(html).toContain('Fictional workspace');
 expect(html).toContain('Open your email invitation, then choose a password.');
 expect(html).toContain('Opening your invitation');expect(html).toContain('Already activated? Sign in');
});
