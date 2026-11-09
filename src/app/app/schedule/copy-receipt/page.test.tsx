import {beforeEach} from 'vitest';
import {createElement,type ComponentProps} from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {expect,it,vi} from 'vitest';
vi.mock('next/link',()=>({default:({children,...props}:ComponentProps<'a'>)=>createElement('a',props,children)}));
vi.mock('@/lib/auth/permissions',()=>({MANAGER_ROLES:['OWNER','MANAGER'],requireRoles:async()=>({id:'manager',role:'MANAGER'})}));
vi.mock('@/lib/auth/session',()=>({requireSessionMutationProof:async()=>({employee:{id:'manager',role:'MANAGER'},sessionTokenHash:'a'.repeat(64)})}));
vi.mock('@/lib/data/schedule-copy',()=>({readScheduleCopyReceipt:async()=>null,readScheduleCopyCommand:async()=>null}));
vi.mock('@/components/schedule-copy-form',()=>({ScheduleCopyForm:()=>null}));
import Page from './page';
it('offers safe schedule inspection without inviting a new copy when the outcome is unknown',async()=>{
 const html=renderToStaticMarkup(await Page({searchParams:Promise.resolve({operation:'11111111-1111-4111-8111-111111111111'})}));
 expect(html).toContain('href="/app/schedule"');
 expect(html).toContain('Back to schedule');
 expect(html).toContain('Do not start a new copy');
 expect(html).not.toContain('Start a new copy</');
});

// Server composition tests; actual mounted finite-body behavior is checked separately.
const operationalPageFixture=vi.hoisted(()=>({denied:false}));
vi.mock('@/lib/company-access/operational-scope.server',()=>({withOperationalCompany:async(_proof:unknown,load:()=>Promise<unknown>)=>operationalPageFixture.denied?{state:'unavailable',reason:'access_denied'}:{state:'ready',data:await load(),authority:'fixture',observedAt:'2026-10-14T12:00:00Z',validForMs:15000}}));
vi.mock('@/components/company-access/scoped-read-frame',()=>({ScopedReadFrame:({children,unavailable}:{children?:React.ReactNode;unavailable?:React.ReactNode})=>children??unavailable??null}));

beforeEach(()=>{operationalPageFixture.denied=false;});

it('withholds protected body and commands after current company-scope denial',async()=>{operationalPageFixture.denied=true;const {default:GuardedPage}=await import('./page');const html=renderToStaticMarkup(await GuardedPage({searchParams:Promise.resolve({operation:'11111111-1111-4111-8111-111111111111'})}));expect(html).toContain('current company-wide management access');expect(html).not.toContain('Retry saved copy');expect(html).not.toContain('Schedule copy result');});
