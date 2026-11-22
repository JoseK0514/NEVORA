import {beforeEach} from '@rstest/core';
import {createElement,type ComponentProps} from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {expect,it,rs} from '@rstest/core';
import type {CopyReceipt} from '@/lib/data/schedule-copy';
const fixtures=rs.hoisted(()=>({receipt:null as CopyReceipt|null}));
rs.mock('next/link',()=>({default:({children,...props}:ComponentProps<'a'>)=>createElement('a',props,children)}));
rs.mock('@/lib/auth/permissions',()=>({MANAGER_ROLES:['OWNER','MANAGER'],requireRoles:async()=>({id:'manager',role:'MANAGER'})}));
rs.mock('@/lib/auth/session',()=>({requireSessionMutationProof:async()=>({employee:{id:'manager',role:'MANAGER'},sessionTokenHash:'a'.repeat(64)})}));
rs.mock('@/lib/data/schedule-copy',()=>({readScheduleCopyReceipt:async()=>fixtures.receipt,readScheduleCopyCommand:async()=>null}));
rs.mock('@/components/schedule-copy-form',()=>({ScheduleCopyForm:()=>null}));
import Page from './page';
it('offers safe schedule inspection without inviting a new copy when the outcome is unknown',async()=>{
 const html=renderToStaticMarkup(await Page({searchParams:Promise.resolve({operation:'11111111-1111-4111-8111-111111111111'})}));
 expect(html).toContain('href="/app/schedule"');
 expect(html).toContain('Back to schedule');
 expect(html).toContain('Do not start a new copy');
 expect(html).not.toContain('Start a new copy</');
});

// Server composition tests; actual mounted finite-body behavior is checked separately.
const operationalPageFixture=rs.hoisted(()=>({denied:false}));
rs.mock('@/lib/company-access/operational-scope.server',()=>({withOperationalCompany:async(_proof:unknown,load:()=>Promise<unknown>)=>operationalPageFixture.denied?{state:'unavailable',reason:'access_denied'}:{state:'ready',data:await load(),authority:'fixture',observedAt:'2026-10-14T12:00:00Z',validForMs:15000}}));
rs.mock('@/components/company-access/scoped-read-frame',()=>({ScopedReadFrame:({children,unavailable}:{children?:React.ReactNode;unavailable?:React.ReactNode})=>children??unavailable??null}));

beforeEach(()=>{operationalPageFixture.denied=false;fixtures.receipt=null;});

it('withholds protected body and commands after current company-scope denial',async()=>{operationalPageFixture.denied=true;const {default:GuardedPage}=await import('./page');const html=renderToStaticMarkup(await GuardedPage({searchParams:Promise.resolve({operation:'11111111-1111-4111-8111-111111111111'})}));expect(html).toContain('This page needs company-wide management access.');expect(html).not.toContain('Retry saved copy');expect(html).not.toContain('Schedule copy result');});

it('shows each unchanged warning once above the result and lists only its affected shifts',async()=>{
 const operationId='11111111-1111-4111-8111-111111111111';
 const message="This week's availability has not been confirmed; normal availability was used.";
 const otherMessage='Employee already has a scheduled shift on this day.';
 const availability={code:'AVAILABILITY_NOT_SUBMITTED',message};
 const overlap={code:'MULTIPLE_SHIFTS_SAME_DAY',message:otherMessage};
 fixtures.receipt={
  operationId,command:{operationId,kind:'PREVIOUS_WEEK',weekStart:'2026-10-19'},
  rows:[
   {sourceId:'named',status:'COMMITTED',reason:null,shiftId:'copied-named',warnings:[availability,availability,overlap],
    employeeName:'Fictional Worker',date:'2026-10-19',startTime:'09:00',endTime:'17:00',locationName:'Condado'},
   {sourceId:'older-source',status:'SKIPPED',reason:'SOURCE_CHANGED',shiftId:null,warnings:[availability]},
   {sourceId:'unaffected',status:'COMMITTED',reason:null,shiftId:'copied-ok',warnings:[]},
  ],
 };
 const html=renderToStaticMarkup(await Page({searchParams:Promise.resolve({operation:operationId})}));
 const warningStart=html.indexOf('id="copy-warnings"');
 const resultStart=html.indexOf('id="copy-result"');
 expect(warningStart).toBeGreaterThan(-1);
 expect(resultStart).toBeGreaterThan(warningStart);
 const section=html.slice(warningStart,resultStart);
 const primary=section.slice(0,section.indexOf(otherMessage));
 expect(section.match(/availability has not been confirmed/g)).toHaveLength(1);
 expect(section.match(/already has a scheduled shift/g)).toHaveLength(1);
 expect(primary.match(/Fictional Worker/g)).toHaveLength(1);
 expect(primary).toContain('<code class="wa-code">older-source</code>');
 expect(section.slice(section.indexOf(otherMessage))).not.toContain('older-source');
 expect(section).not.toContain('unaffected');
});
