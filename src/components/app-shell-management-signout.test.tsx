import { createElement, type ComponentProps } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { expect, it, vi } from 'vitest';
import { AppShell } from './app-shell';
vi.mock('next/link',()=>({default:({children,...props}:ComponentProps<'a'>)=>createElement('a',props,children)}));
vi.mock('next/navigation',()=>({usePathname:()=>'/app'}));
vi.mock('@/app/login/actions',()=>({logout:vi.fn()}));
it.each(['OWNER','MANAGER'] as const)('%s has native sign-out inside the mobile management menu',role=>{
 for(const notificationsEnabled of [false,true]){
  const html=renderToStaticMarkup(<AppShell workspaceName="QA" user={{firstName:'Test',lastName:'Manager',role}} notificationsEnabled={notificationsEnabled}>QA</AppShell>);
  const mobileMenu=html.slice(html.indexOf('id="manager-more-navigation"'));
  expect(mobileMenu).toMatch(/<button[^>]*type="submit"[^>]*>Sign out<\/button>/);
 }
});
