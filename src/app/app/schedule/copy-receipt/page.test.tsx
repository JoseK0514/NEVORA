import {createElement,type ComponentProps} from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {expect,it,vi} from 'vitest';
vi.mock('next/link',()=>({default:({children,...props}:ComponentProps<'a'>)=>createElement('a',props,children)}));
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
