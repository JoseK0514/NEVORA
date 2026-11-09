import React, {createElement} from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {expect,it,vi} from 'vitest';
import ResetAccessPage from './page';

const identity=vi.hoisted(()=>({name:'Northside Services' as string|null}));
vi.stubGlobal('React',React);
vi.mock('@/lib/data/workspaces',()=>({getPublicWorkspaceName:async()=>identity.name}));
vi.mock('next/image',()=>({default:()=>null}));
vi.mock('@/components/brand-mark',()=>({BrandMark:()=>createElement('span'),BrandWordmark:()=>createElement('span',{'aria-label':'NEVORA'},'NEVORA')}));

it('uses the Quiet sign-in page with Back to sign in and the VELANI line',async()=>{
 const html=renderToStaticMarkup(await ResetAccessPage());
 // Quiet (v4): Back to Sign in, "New password", and the one legal line.
 expect(html).toContain('href="/login"');
 expect(html).toContain('New password');expect(html).toContain('href="/login"');
 expect(html).toContain('© 2026 VELANI LLC');
 expect(html).not.toContain('Fuel Coffee Drive');
});
it('renders without a configured workspace',async()=>{
 identity.name=null;
 const html=renderToStaticMarkup(await ResetAccessPage());
 expect(html).toContain('New password');
});
