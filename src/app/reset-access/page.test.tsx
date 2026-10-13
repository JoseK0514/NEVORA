import React, {createElement} from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {expect,it,vi} from 'vitest';
import ResetAccessPage from './page';

const identity=vi.hoisted(()=>({name:'Northside Services' as string|null}));
vi.stubGlobal('React',React);
vi.mock('@/lib/data/workspaces',()=>({getPublicWorkspaceName:async()=>identity.name}));
vi.mock('next/image',()=>({default:()=>null}));
vi.mock('@/components/brand-mark',()=>({BrandMark:()=>createElement('span'),BrandWordmark:()=>createElement('span',{'aria-label':'NEVORA'},'NEVORA')}));

it('extends the approved authentication shell with real workspace identity and ownership',async()=>{
 const html=renderToStaticMarkup(await ResetAccessPage());
 expect(html).toContain('Northside Services');expect(html).toContain('Brighter work ahead');
 expect(html).toContain('Set a New Password');expect(html).toContain('Powered by VELANI LLC');
 expect(html).toContain('NEVORA is a product of VELANI LLC.');expect(html).toContain('employee-login-composition');
 expect(html).not.toContain('Fuel Coffee Drive');
});
it('keeps missing workspace configuration explicit',async()=>{
 identity.name=null;
 const html=renderToStaticMarkup(await ResetAccessPage());
 expect(html).toContain('Workspace unavailable');expect(html).toContain('Set a New Password');
});
