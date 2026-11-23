import {beforeEach} from '@rstest/core';
import {createElement,type ComponentProps} from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {expect,it,rs} from '@rstest/core';
import type {CopyCommand,CopyReceipt} from '@/lib/data/schedule-copy';
const fixtures=rs.hoisted(()=>({receipt:null as CopyReceipt|null,command:null as CopyCommand|null}));
rs.mock('next/link',()=>({default:({children,prefetch:_prefetch,...props}:ComponentProps<'a'>&{prefetch?:boolean})=>createElement('a',props,children)}));
rs.mock('@/lib/auth/permissions',()=>({MANAGER_ROLES:['OWNER','MANAGER'],requireRoles:async()=>({id:'manager',role:'MANAGER'})}));
rs.mock('@/lib/auth/session',()=>({requireSessionMutationProof:async()=>({employee:{id:'manager',role:'MANAGER'},sessionTokenHash:'a'.repeat(64)})}));
rs.mock('@/lib/data/schedule-copy',()=>({readScheduleCopyReceipt:async()=>fixtures.receipt,readScheduleCopyCommand:async()=>fixtures.command}));
rs.mock('@/components/schedule-copy-form',()=>({ScheduleCopyForm:({label}:{label:string})=>createElement('button',{type:'button'},label)}));
import Page from './page';
import {compactRange} from '@/components/owner-b/b-kit';
import {formatTimeRange} from '@/lib/date-utils';
// Times are written by the shared helpers, so these tests follow any change to how a time reads.
const hours=(start:string,end:string)=>compactRange(formatTimeRange(start,end)).replace(/\s+/g,' ');
const NINE=hours('09:00','17:00'),TWO=hours('14:00','22:00');

// Server composition tests; actual mounted finite-body behavior is checked separately.
const operationalPageFixture=rs.hoisted(()=>({denied:false}));
rs.mock('@/lib/company-access/operational-scope.server',()=>({withOperationalCompany:async(_proof:unknown,load:()=>Promise<unknown>)=>operationalPageFixture.denied?{state:'unavailable',reason:'access_denied'}:{state:'ready',data:await load(),authority:'fixture',observedAt:'2026-10-14T12:00:00Z',validForMs:15000}}));
rs.mock('@/components/company-access/scoped-read-frame',()=>({ScopedReadFrame:({children,unavailable}:{children?:React.ReactNode;unavailable?:React.ReactNode})=>children??unavailable??null}));

beforeEach(()=>{operationalPageFixture.denied=false;fixtures.receipt=null;fixtures.command=null;});

const operationId='11111111-1111-4111-8111-111111111111';
const render=async(operation=operationId)=>renderToStaticMarkup(await Page({searchParams:Promise.resolve({operation})}));
const text=(html:string)=>html.replace(/<[^>]+>/g,' ').replace(/\s+/g,' ').trim();
const availability={code:'AVAILABILITY_NOT_SUBMITTED',message:"This week's availability has not been confirmed; normal availability was used."};
const overlap={code:'MULTIPLE_SHIFTS_SAME_DAY',message:'Employee already has a scheduled shift on this day.'};
const row=(sourceId:string,status:'COMMITTED'|'SKIPPED',extra:Partial<CopyReceipt['rows'][number]>={})=>({sourceId,status,reason:status==='SKIPPED'?'SHIFT_OVERLAP':null,shiftId:status==='COMMITTED'?'copied-'+sourceId:null,warnings:[],
 employeeName:'Fictional Worker',date:'2026-10-19',startTime:'09:00',endTime:'17:00',locationName:'Condado',...extra});
const receipt=(rows:CopyReceipt['rows'],extra:Partial<CopyReceipt>={}):CopyReceipt=>({operationId,command:{operationId,kind:'PREVIOUS_WEEK',weekStart:'2026-10-19'},rows,...extra});

it('offers safe schedule inspection without inviting a new copy when the outcome is unknown',async()=>{
 const html=await render();
 expect(html).toContain('href="/app/schedule"');
 expect(html).toContain('Review schedule');
 expect(html).toContain('Don’t start a new copy');
 expect(html).toContain('Copy not confirmed');
 expect(html).not.toContain('Retry this copy');
});

it('offers the same operation as a retry when only the command was stored',async()=>{
 fixtures.command={operationId,kind:'PREVIOUS_WEEK',weekStart:'2026-10-19'};
 const html=await render();
 expect(html).toContain('href="/app/schedule?week=2026-10-19"');
 expect(html).toContain('Retry this copy');
 expect(html).toContain('Retrying never adds a shift twice.');
 expect(text(html)).toContain('Some shifts may already be copied into Oct 19–25');
});

it('says a link without a copy reference points nowhere',async()=>{
 const html=await render('not-an-operation');
 expect(html).toContain('Copy not found');
 expect(html).toContain('This link is incomplete.');
 expect(html).toContain('href="/app/schedule"');
});

it('withholds protected body and commands after current company-scope denial',async()=>{operationalPageFixture.denied=true;const html=await render();expect(html).toContain('Company-wide access needed');expect(html).toContain('An Owner can give it to you.');expect(html).not.toContain('Retry this copy');expect(html).not.toContain('Review schedule');});

it('confirms a clean copy once, with the success mark, the week and the place',async()=>{
 fixtures.receipt=receipt([row('a','COMMITTED'),row('b','COMMITTED',{date:'2026-10-20'})]);
 const html=await render();
 const words=text(html);
 expect(html).toContain('Week copied');
 expect(html).toContain('b-donemark');
 expect(words).toContain('2 shifts');
 expect(words).toContain('Oct 19–25 · Condado');
 // The band says the week was copied; the summary doesn't say it again.
 expect(text(html.slice(html.indexOf('id="copy-result"')))).not.toMatch(/copied/i);
 expect(html).toContain('href="/app/schedule?week=2026-10-19"');
 expect(words).toContain('Review schedule');
 expect(html).not.toContain('copy-warnings');
 expect(html).not.toContain('copy-skipped');
});

it('lists each warning kind once with only the copied shifts it affects, each linking to its shift',async()=>{
 fixtures.receipt=receipt([
  row('named','COMMITTED',{warnings:[availability,availability,overlap]}),
  row('other','COMMITTED',{warnings:[availability],employeeName:'Second Person',date:'2026-10-21'}),
  row('skipped','SKIPPED',{warnings:[availability],employeeName:'Skipped Person'}),
  row('unaffected','COMMITTED',{employeeName:'Calm Person'}),
 ]);
 const html=await render();
 expect(html).not.toContain('b-donemark');
 const start=html.indexOf('id="copy-warnings"');
 const end=html.indexOf('id="copy-skipped"');
 expect(start).toBeGreaterThan(-1);
 expect(end).toBeGreaterThan(start);
 const warnings=html.slice(start,end);
 expect(warnings.match(/Availability not confirmed/g)).toHaveLength(1);
 expect(warnings.match(/Already has a shift that day/g)).toHaveLength(1);
 expect(warnings).not.toContain('availability has not been confirmed');
 expect(warnings.match(/Fictional W\./g)).toHaveLength(2);
 expect(warnings).toContain('Second P.');
 expect(warnings).toContain('href="/app/schedule/edit?shiftId=copied-named"');
 expect(warnings).not.toContain('Skipped Person');
 expect(warnings).not.toContain('Skipped P.');
 expect(warnings).not.toContain('Calm P.');
 const skipped=html.slice(end);
 expect(skipped).toContain('Overlaps another shift');
 expect(skipped).toContain('Skipped P.');
 expect(text(skipped)).toContain(`Mon · ${NINE}`);
 expect(skipped).not.toContain('href="/app/schedule/edit');
 // Each count once: 3 shifts in the summary, 2 with warnings and 1 not copied at their lists' headings.
 const summary=text(html.slice(html.indexOf('id="copy-result"'),start));
 expect(summary).toContain('3 shifts');
 expect(text(warnings)).toMatch(/^.*With warnings 2 /);
 expect(text(skipped)).toMatch(/^.*Not copied 1 /);
});

it('names one reason once when nothing was copied because the source changed',async()=>{
 fixtures.receipt=receipt([row('a','SKIPPED',{reason:'SOURCE_CHANGED'}),row('b','SKIPPED',{reason:'SOURCE_CHANGED'})],{reason:'SOURCE_CHANGED'});
 const html=await render();
 expect(html).toContain('Nothing copied');
 expect(html.match(/The previous week changed while copying/g)).toHaveLength(1);
 expect(html).not.toContain('b-donemark');
});

it('says the previous week was empty when there was nothing to copy',async()=>{
 fixtures.receipt=receipt([]);
 const html=await render();
 expect(html).toContain('Nothing copied');
 expect(html).toContain('The previous week has no shifts');
});

it('shows a person once per reason with their days when shifts were not copied',async()=>{
 fixtures.receipt=receipt([row('a','COMMITTED',{locationName:'Calle Loíza'}),row('m','SKIPPED',{employeeName:'Luis Torres'}),row('t','SKIPPED',{employeeName:'Luis Torres',date:'2026-10-20'}),row('w','SKIPPED',{employeeName:'Luis Torres',date:'2026-10-21',startTime:'14:00',endTime:'22:00'})]);
 const html=await render();
 const skipped=text(html.slice(html.indexOf('id="copy-skipped"')));
 expect(skipped.match(/Luis T\./g)).toHaveLength(1);
 // Two locations in the copy: Luis's one location is said once, at the end of his line.
 expect(skipped).toContain(`Mon, Tue · ${NINE}; Wed · ${TWO} · Condado`);
 expect(skipped.match(/Condado/g)).toHaveLength(1);
});

it('shows a person once per warning kind; one shift opens it, several open the copied week',async()=>{
 fixtures.receipt=receipt([
  row('e1','COMMITTED',{employeeName:'Elena Ruiz',warnings:[availability]}),
  row('e2','COMMITTED',{employeeName:'Elena Ruiz',date:'2026-10-20',warnings:[availability]}),
  row('e3','COMMITTED',{employeeName:'Elena Ruiz',date:'2026-10-21',startTime:'14:00',endTime:'22:00',warnings:[availability]}),
  row('s1','COMMITTED',{employeeName:'Solo Person',warnings:[availability]}),
  // Two people who share a short name stay two rows.
  row('a1','COMMITTED',{employeeName:'Ana Rivera',warnings:[availability]}),
  row('a2','COMMITTED',{employeeName:'Ana Rosa',warnings:[availability]}),
  // Two shifts on one day: the weekday is said once.
  row('t1','COMMITTED',{employeeName:'Two Shifts',startTime:'06:00',endTime:'10:00',warnings:[availability]}),
  row('t2','COMMITTED',{employeeName:'Two Shifts',startTime:'16:00',endTime:'20:00',warnings:[availability]}),
 ]);
 const html=await render();
 const section=html.slice(html.indexOf('id="copy-warnings"'));
 const words=text(section);
 expect(words.match(/Elena R\./g)).toHaveLength(1);
 expect(words).toContain(`Elena R. Mon, Tue · ${NINE}; Wed · ${TWO}`);
 expect(words.match(/Ana R\./g)).toHaveLength(2);
 expect(words).toContain(`Two S. Mon · ${hours('06:00','10:00')}, ${hours('16:00','20:00')}`);
 // Elena's three shifts open the copied week; Solo's one shift opens Edit shift.
 const elena=section.slice(section.indexOf('Elena R.')-400,section.indexOf('Elena R.'));
 expect(elena.slice(elena.lastIndexOf('<a')) ).toContain('href="/app/schedule?week=2026-10-19"');
 expect(section).toContain('href="/app/schedule/edit?shiftId=copied-s1"');
 expect(section).not.toContain('copied-e1');
});

it('keeps older receipts that carry only a source reference readable',async()=>{
 fixtures.receipt=receipt([{sourceId:'older-source',status:'SKIPPED',reason:'SOURCE_CHANGED',shiftId:null,warnings:[]},row('a','COMMITTED')]);
 const html=await render();
 expect(html).toContain('older-source');
 expect(html).toContain('Not copied');
});

it('says the count once when every copied shift has a warning: "All with warnings", no second equal number',async()=>{
 fixtures.receipt=receipt([row('a','COMMITTED',{warnings:[availability]}),row('b','COMMITTED',{warnings:[availability],employeeName:'Second Person'})]);
 const html=await render();
 const start=html.indexOf('id="copy-warnings"');
 expect(text(html.slice(html.indexOf('id="copy-result"'),start))).toContain('2 shifts');
 const warnings=text(html.slice(start));
 expect(warnings).toMatch(/^.*All with warnings /);
 expect(warnings).not.toMatch(/With warnings 2/);
 expect(html).not.toContain('c-copy__count');
});
