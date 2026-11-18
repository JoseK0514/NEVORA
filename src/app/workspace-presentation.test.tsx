rs.mock('server-only',()=>({}));
import { createElement, type ComponentProps } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { expect, it, rs } from '@rstest/core';
import EmployeesPage from './app/employees/page';
import MyTimePage from './app/my-time/page';
import { EmployeeDashboard } from '../components/employee-dashboard';

rs.mock('@/lib/auth/permissions', () => ({MANAGER_ROLES:['OWNER','MANAGER'],requireRoles:async()=>{},isManagerRole:()=>false}));
rs.mock('@/lib/auth/session', () => ({requireSession:async()=>({id:'self',role:'EMPLOYEE'}),requireSessionMutationProof:async()=>({employee:{id:'self',role:'EMPLOYEE'},sessionTokenHash:'a'.repeat(64)})}));
rs.mock('@/lib/data/employees', () => ({listEmployees:async()=>[],listLocations:async()=>[]}));






rs.mock('next/link', () => ({default:({href,children,...props}:ComponentProps<'a'>)=>createElement('a',{href,...props},children)}));
rs.mock('next/navigation', () => ({usePathname:()=>'/app',useRouter:()=>({push:rs.fn(),refresh:rs.fn()}),redirect:()=>{throw Error('REDIRECT');}}));
it('uses generic customer copy in the directory and unconnected timekeeping page', async () => {
  const directory=renderToStaticMarkup(await EmployeesPage());
  expect(directory).not.toContain('across Fuel');
});
it('keeps recorded timekeeping guidance independent of customer identity', async () => {
  const time=renderToStaticMarkup(await MyTimePage());
  expect(time).not.toContain('Fuel kiosk');
  // Release 1 (board G-E-Time): plain words, no product names; the loading state names what is being checked.
  expect(time).toContain('Checking your current time records');
  expect(time).not.toContain('connected yet');
});
it('keeps the employee dashboard kiosk guidance independent of customer identity', () => {
  const html=renderToStaticMarkup(<EmployeeDashboard authority={"a".repeat(64)} timeAuthority={"b".repeat(64)} />);
  expect(html).not.toContain('Fuel kiosk');
  // v5 Home (E01) carries no clock guidance; My time keeps the Clocker note (above).
  expect(html).toContain('Loading Home');
});
