import {beforeEach,describe,expect,it,vi} from 'vitest';
import {createElement} from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import type {PayrollStatementsResponse} from '@/lib/payroll/contracts';
import type {PayView} from './pay';
import {onlyB,withoutB} from '../owner-b/test-support';

const route=vi.hoisted(()=>({search:''}));
vi.mock('next/navigation',()=>({useSearchParams:()=>new URLSearchParams(route.search)}));
const {CorpPayView}=await import('./pay-corp');

type Statement=PayrollStatementsResponse['statements'][number];
const ids={old:'00000000-0000-4000-8000-000000000001',original:'00000000-0000-4000-8000-000000000002',correction:'00000000-0000-4000-8000-000000000003'};
const statement=(id:string,payday:string,start:string,end:string,links:Partial<Statement>={}):Statement=>({id,kind:'EMPLOYEE_STATEMENT',employeeId:'FICTIONAL-E1',filename:`statement-${payday}.pdf`,sha256:'f'.repeat(64),downloadUrl:`/api/payroll/documents/${id}`,viewUrl:`/api/payroll/documents/${id}/view`,published:true,period:{startDate:start,endDate:end},payday,corrects:null,correctedBy:null,...links});
const history=[statement(ids.old,'2030-01-10','2029-12-23','2030-01-05'),statement(ids.original,'2030-01-24','2030-01-06','2030-01-19',{correctedBy:ids.correction}),statement(ids.correction,'2030-01-24','2030-01-06','2030-01-19',{corrects:ids.original})];
const base:PayView={statements:history,loading:false,error:'',errorCode:'',nextPay:null,statement:null,document:null,reload:()=>{}};
const render=(view:Partial<PayView>={},search='')=>{route.search=search;return renderToStaticMarkup(createElement(CorpPayView,{...base,...view}));};
const text=(html:string)=>html.replace(/<[^>]+>/g,' ').replace(/\s+/g,' ');
beforeEach(()=>{route.search='';});

describe('Employee Pay on the kit (G-E-Pay)',()=>{
 it('shows recent pay newest first, labels corrections and never shows figures',()=>{
  const html=render(),plain=text(html);
  expect(plain).toContain('Pay history');expect(plain).toContain('Recent pay');expect(plain).toContain('Thu, Jan 24');expect(plain).toContain('Jan 6 – 19');
  expect(plain).toContain('Correction');expect(plain).toContain('Replaced');
  // Upscale S4: the states are grey text, never a (blue) pill.
  expect(html).not.toContain('c-pill');expect(html).toContain('<span class="c-meta">Correction</span>');
  expect(html.indexOf(`pay-statement-${ids.correction}`)).toBeLessThan(html.indexOf(`pay-statement-${ids.original}`));
  expect(html).toContain(`href="/app/my-pay?paycheck=${ids.correction}"`);
  expect(plain).not.toMatch(/\$|deposit|paid|amount|net pay|Only your own published|Latest statement|Earlier statements/i);
 });
 it('names the next scheduled payday from the pay schedule without calling it a payment',()=>{
  const plain=text(render({nextPay:{payday:'2030-02-07',daysUntil:3,period:{startDate:'2030-01-20',endDate:'2030-02-02'}}}));
  // Upscale S16: the period in the card head, the payday once as the date, then how far away it is; no pill or filler line.
  expect(plain).toContain('This pay period · Jan 20 – Feb 2');expect(plain).toContain('Thu, Feb 7 Payday in 3 days');
  expect(plain).not.toContain('Payday Thu, Feb 7');expect(plain).not.toContain('Pay period Jan 20');
  expect(plain).not.toContain('From your workplace’s pay schedule');expect(plain).not.toMatch(/paid|\$/i);
  expect(text(render())).not.toContain('This pay period');
 });
 it.each([
  [{loading:true,statements:null},'loading','Loading your statements…'],
  [{statements:[]},'empty','No published statements yet'],
  [{statements:null,error:'x',errorCode:'SIGNED_OUT'},'signed-out','Sign in to see your statements'],
  [{statements:null,error:'x',errorCode:'MODULE_OFF'},'module-off','Pay statements are turned off'],
  [{statements:null,error:'x',errorCode:'FORBIDDEN'},'denied','Your access to pay statements changed'],
  [{statements:null,error:'x',errorCode:'PAUSED'},'paused','Statements are paused'],
  [{statements:null,error:'x',errorCode:'OFFLINE'},'paused','You’re offline'],
  [{statements:null,error:'x',errorCode:'NETWORK'},'error','Couldn’t load your statements'],
 ] as const)('%#: %s state is explicit and shows no stale statement',(view,state,message)=>{
  for(const search of ['','view=history',`paycheck=${ids.old}`]){
   const html=render(view as Partial<PayView>,search);
   expect(html).toContain(`data-pay-state="${state}"`);expect(text(html)).toContain(message);expect(html).not.toContain('/api/payroll/documents/');
  }
  expect(render({statements:null,error:'x',errorCode:'SIGNED_OUT'})).toContain('href="/login?returnTo=%2Fapp%2Fmy-pay"');
 });
 it('explains a PDF that could not open, and a notification statement that is no longer available',()=>{
  expect(text(render({document:'unavailable'}))).toContain('That statement isn’t available');
  expect(text(render({document:'failed'}))).toContain('file check');
  expect(text(render({document:'temporary'}))).toContain('Try again in a moment');
  expect(text(render({statement:'00000000-0000-4000-8000-00000000000f'}))).toContain('That statement isn’t available');
  expect(text(render({statement:ids.original}))).not.toContain('isn’t available');
  expect(text(render({statement:'00000000-0000-4000-8000-00000000000f',statements:null,loading:true}))).not.toContain('isn’t available');
  expect(text(render({statements:null,error:'x',errorCode:'PAUSED',document:'unavailable'}))).not.toContain('isn’t available');
 });
});

describe('Pay history and Paycheck (E-PayHistory, E-Paycheck)',()=>{
 it('groups every statement by month',()=>{
  const plain=text(render({},'view=history'));
  expect(plain).toContain('Pay history');expect(plain).toContain('January');expect(plain).toContain('Thu, Jan 10');expect(plain).toContain('Dec 23 – Jan 5');
 });
 it('opens one statement with one PDF row, and the year only outside the current year',()=>{
  // The corporate layout (tablets and desktop); the phone screen (Direction B) is checked after it.
  const full=render({},`paycheck=${ids.correction}`),html=withoutB(full),plain=text(html);
  /* B7 wording (NV-119 glossary): the document is a "Pay statement" */expect(plain).toContain('Pay statement');expect(plain).toContain('Pay period Jan 6 – 19');expect(plain).toContain('Thu, Jan 24, 2030');
  expect(plain).toContain('This corrects your earlier statement for the same period.');
  // Upscale S8: one "Pay statement (PDF)" row that opens the document separately.
  expect(html).toContain(`href="/api/payroll/documents/${ids.correction}/view" target="_blank" rel="noopener" aria-label="Pay statement (PDF), corrected statement, payday Thursday, January 24, 2030 (opens separately)"`);
  expect(plain.match(/Pay statement \(PDF\)/g)).toHaveLength(1);expect(plain).not.toMatch(/View PDF|Download PDF/);
  // Direction B: the phone screen has the same one PDF row, opening the same document separately.
  const phone=onlyB(full);expect(text(phone).match(/Pay statement \(PDF\)/g)).toHaveLength(1);
  expect(phone).toContain(`href="/api/payroll/documents/${ids.correction}/view" target="_blank" rel="noopener" aria-label="Pay statement (PDF), corrected statement, payday Thursday, January 24, 2030 (opens separately)"`);
  expect(phone).not.toMatch(/\$\d/);
  expect(html).not.toMatch(/ download[ =>]/);
  expect(plain).toContain('Downloaded files may contain personal pay information.');
  // Without a viewer link the row goes to the route itself (its attachment header downloads it), in the same tab.
  const plainFile=render({statements:[statement(ids.old,'2030-01-10','2029-12-23','2030-01-05',{viewUrl:undefined as unknown as string})]},`paycheck=${ids.old}`);
  expect(plainFile).toContain(`href="/api/payroll/documents/${ids.old}" aria-label="Pay statement (PDF), statement, payday Thursday, January 10, 2030"`);
  // A payday in the current year drops the year.
  const year=String(new Date().getFullYear());
  const current=render({statements:[statement(ids.old,`${year}-03-10`,`${year}-02-23`,`${year}-03-01`)]},`paycheck=${ids.old}`);
  expect(text(current)).not.toContain(`, ${year}`);
 });
 it('points a replaced statement to its correction first',()=>{
  const html=render({},`paycheck=${ids.original}`);
  expect(text(html)).toContain('A corrected statement replaced this one.');expect(text(html)).toContain('Use the corrected statement');
  expect(html).toContain(`href="/app/my-pay?paycheck=${ids.correction}"`);
  expect(text(render({},'paycheck=00000000-0000-4000-8000-00000000000f'))).toContain('That statement isn’t available');
 });
});
