import {createElement} from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {beforeEach,expect,it,vi} from 'vitest';

const m=vi.hoisted(()=>({role:'MANAGER',denied:false,workspace:vi.fn(async()=>({timeZone:'America/Puerto_Rico'}))}));
vi.mock('@/lib/auth/permissions',()=>({requireRoles:async()=>({id:'reviewer',role:m.role})}));
vi.mock('@/lib/auth/session',()=>({requireSessionMutationProof:async()=>({employee:{id:'reviewer',role:m.role},sessionTokenHash:'fixture'})}));
vi.mock('@/lib/company-access/operational-scope.server',()=>({withOperationalCompany:async()=>m.denied?{state:'unavailable',reason:'access_denied'}:{state:'ready',data:null}}));
vi.mock('@/lib/data/workspaces',()=>({getWorkspace:m.workspace}));
vi.mock('@/components/company-access/scoped-read-frame',()=>({ScopedReadFrame:({children,unavailable}:{children?:React.ReactNode;unavailable?:React.ReactNode})=>children??unavailable??null}));
vi.mock('@/components/account-recovery',()=>({AccountRecovery:({employeeId,from,timeZone}:{employeeId?:string;from?:string;timeZone?:string})=>createElement('div',{'data-recovery':'account','data-employee':employeeId,'data-from':from,'data-zone':timeZone})}));
vi.mock('@/components/clocker-recovery-review',()=>({ClockerRecoveryReview:({from,timeZone}:{from?:string;timeZone?:string})=>createElement('div',{'data-recovery':'clocker','data-from':from,'data-zone':timeZone})}));

import AccountRecoveryPage from '../account-recovery/page';
import ClockerRecoveryPage from '../clocker-recovery/page';

beforeEach(()=>{m.role='MANAGER';m.denied=false;m.workspace.mockClear();});

it('withholds both recovery bodies and workspace reads after company access denial',async()=>{
 m.denied=true;
 for(const page of [AccountRecoveryPage,ClockerRecoveryPage]){
  const html=renderToStaticMarkup(await page({searchParams:Promise.resolve({from:'settings',employee:'worker'})}));
  expect(html).toContain('current company-wide management access');
  expect(html).not.toContain('data-recovery');
 }
 expect(m.workspace).not.toHaveBeenCalled();
});

it('retains employee prefill and timezone without a Manager Settings return',async()=>{
 const html=renderToStaticMarkup(await AccountRecoveryPage({searchParams:Promise.resolve({employee:' worker ',from:'settings'})}));
 expect(html).toContain('data-employee="worker"');
 expect(html).toContain('data-zone="America/Puerto_Rico"');
 expect(html).not.toContain('data-from');
 expect(renderToStaticMarkup(await ClockerRecoveryPage({searchParams:Promise.resolve({from:'settings'})}))).not.toContain('data-from');
});

it('retains the Owner Settings return on both authorized recovery pages',async()=>{
 m.role='OWNER';
 for(const page of [AccountRecoveryPage,ClockerRecoveryPage]){
  expect(renderToStaticMarkup(await page({searchParams:Promise.resolve({from:'settings'})}))).toContain('data-from="settings"');
 }
});
