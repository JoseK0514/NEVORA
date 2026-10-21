import React, {createElement} from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {expect,it,vi} from 'vitest';
import ResetAccessPage from './page';

const identity=vi.hoisted(()=>({name:'Northside Services' as string|null}));
vi.stubGlobal('React',React);
vi.mock('@/lib/data/workspaces',()=>({getPublicWorkspaceName:async()=>identity.name}));
vi.mock('next/image',()=>({default:()=>null}));
vi.mock('@/components/brand-mark',()=>({BrandMark:()=>createElement('span'),BrandWordmark:()=>createElement('span',{'aria-label':'NEVORA'},'NEVORA')}));

it('uses the E4 sign-in shell with the NEVORA brand, Back to sign in and the VELANI footer',async()=>{
 const html=renderToStaticMarkup(await ResetAccessPage());
 expect(html).toContain('alt="NEVORA"');expect(html).toContain('Your week,<br/>in one place.');
 expect(html).toContain('Set a new password');expect(html).toContain('href="/login"');
 expect(html).toContain('© 2026 VELANI LLC. All rights reserved.');
 expect(html).not.toContain('Fuel Coffee Drive');
});
it('renders without a configured workspace',async()=>{
 identity.name=null;
 const html=renderToStaticMarkup(await ResetAccessPage());
 expect(html).toContain('Set a new password');
});
