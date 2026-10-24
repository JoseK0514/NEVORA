import { createElement, type ComponentProps } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { expect, it, vi } from 'vitest';
import { AppShell } from './app-shell';
vi.mock('next/link',()=>({default:({children,...props}:ComponentProps<'a'>)=>createElement('a',props,children)}));
vi.mock('next/navigation',()=>({usePathname:()=>'/app',useRouter: () => ({ push: () => {}, replace: () => {}, refresh: () => {} }), useSearchParams:()=>new URLSearchParams()}));
vi.mock('@/app/login/actions',()=>({logout:vi.fn()}));
// Quiet (v4): on phones Sign out is on Profile (from More); the shell keeps it in the account menu.
it.each(['OWNER','MANAGER'] as const)('%s has native sign-out in the account menu',role=>{
 for(const notificationsEnabled of [false,true]){
  const html=renderToStaticMarkup(<AppShell workspaceName="QA" user={{id:"actor",firstName:'Test',lastName:'Manager',role}} notificationsEnabled={notificationsEnabled}>QA</AppShell>);
  const accountMenu=html.slice(html.indexOf('id="portal-account-menu"'));
  expect(accountMenu).toMatch(/<button[^>]*type="submit"[^>]*>[\s\S]*?Sign out[\s\S]*?<\/button>/);
 }
});
