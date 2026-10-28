import {describe,expect,it,vi} from 'vitest';
import {createElement} from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
vi.mock('next/navigation',()=>({useRouter:()=>({replace:()=>{}})}));
import {EmployeePayView,arrangeStatements,payPeriod,type PayView} from './pay';
import type {PayrollStatementsResponse} from '@/lib/payroll/contracts';

type Statement=PayrollStatementsResponse['statements'][number];
const ids={old:'00000000-0000-4000-8000-000000000001',original:'00000000-0000-4000-8000-000000000002',correction:'00000000-0000-4000-8000-000000000003'};
const statement=(id:string,payday:string,start:string,end:string,links:Partial<Statement>={}):Statement=>({id,kind:'EMPLOYEE_STATEMENT',employeeId:'FICTIONAL-E1',filename:`statement-${payday}.pdf`,sha256:'f'.repeat(64),downloadUrl:`/api/payroll/documents/${id}`,viewUrl:`/api/payroll/documents/${id}/view`,published:true,period:{startDate:start,endDate:end},payday,corrects:null,correctedBy:null,...links});
const history=[statement(ids.old,'2030-01-10','2029-12-23','2030-01-05'),statement(ids.original,'2030-01-24','2030-01-06','2030-01-19',{correctedBy:ids.correction}),statement(ids.correction,'2030-01-24','2030-01-06','2030-01-19',{corrects:ids.original})];
const base:PayView={statements:history,loading:false,error:'',errorCode:'',nextPay:null,statement:null,document:null,reload:()=>{}};
const render=(view:Partial<PayView>={})=>renderToStaticMarkup(createElement(EmployeePayView,{...base,...view}));
const text=(html:string)=>html.replace(/<[^>]+>/g,' ').replace(/\s+/g,' ');

describe('Employee mobile Pay',()=>{
 it('puts a correction first and never shows the statement it replaced as the latest',()=>{
  const {latest,earlier}=arrangeStatements([...history].reverse());
  expect(latest?.id).toBe(ids.correction);
  expect(earlier.map(item=>item.id)).toEqual([ids.original,ids.old]);
  expect(arrangeStatements([]).latest).toBeNull();
  expect(payPeriod('2030-01-06','2030-01-19')).toBe('Jan 6 – 19, 2030');
  expect(payPeriod('2029-12-23','2030-01-05')).toBe('Dec 23 – Jan 5, 2030');
 });

 it('shows the latest statement with deliberate View and Download, and the replaced one labelled',()=>{
  const html=render(),plain=text(html);
  expect(plain).toContain('Latest statement');expect(plain).toContain('Payday January 24, 2030');expect(plain).toContain('Correction');
  expect(plain).toContain('This corrects your earlier statement for the same period.');
  expect(html).toContain(`href="/api/payroll/documents/${ids.correction}/view" target="_blank" rel="noopener"`);
  expect(html).toContain(`aria-label="View statement, payday January 24, 2030 (opens in a new tab)"`);
  expect(html).toContain(`href="/api/payroll/documents/${ids.correction}" aria-label="Download statement, payday January 24, 2030"`);
  expect(plain).toContain('Earlier statements');expect(plain).toContain('Replaced');
  expect(plain).toContain('A corrected statement replaced this one.');expect(plain).toContain('Go to the corrected statement');
  expect(plain).toContain('Only your own published statements are available here.');
  // No figures, deposits or payment status: statements carry none.
  expect(plain).not.toMatch(/\$|deposit|paid|amount|net pay/i);
 });

 it('names the next scheduled payday from the pay schedule without calling it a payment',()=>{
  const plain=text(render({nextPay:{payday:'2030-02-07',daysUntil:3,period:{startDate:'2030-01-20',endDate:'2030-02-02'}}}));
  expect(plain).toContain('Next scheduled payday');expect(plain).toContain('Thursday, February 7');expect(plain).toContain('In 3 days · for Jan 20 – Feb 2, 2030');
  expect(plain).toContain('From your workplace’s pay schedule. A statement appears here after payroll is published.');
  expect(text(render())).not.toContain('Next scheduled payday');
 });

 it.each([
  [{loading:true,statements:null},'loading','Loading your statements…'],
  [{statements:[]},'empty','No published statements yet'],
  [{statements:null,error:'x',errorCode:'SIGNED_OUT'},'signed-out','Sign in to see your statements'],
  [{statements:null,error:'x',errorCode:'MODULE_OFF'},'module-off','Pay statements are turned off'],
  [{statements:null,error:'x',errorCode:'PAUSED'},'paused','Statements are paused'],
  [{statements:null,error:'x',errorCode:'OFFLINE'},'paused','You’re offline'],
  [{statements:null,error:'x',errorCode:'NETWORK'},'error','Couldn’t load your statements'],
 ] as const)('%#: %s state is explicit and shows no stale statement',(view,state,message)=>{
  const html=render(view as Partial<PayView>);
  expect(html).toContain(`data-pay-state="${state}"`);expect(text(html)).toContain(message);
  expect(html).not.toContain('/api/payroll/documents/');
 });

 it('returns an ended session to My pay after sign-in and offers retry only where it can work',()=>{
  expect(render({statements:null,error:'x',errorCode:'SIGNED_OUT'})).toContain('href="/login?returnTo=%2Fapp%2Fmy-pay"');
  expect(text(render({statements:null,error:'x',errorCode:'NETWORK'}))).toContain('Try again');
  expect(text(render({statements:null,error:'x',errorCode:'MODULE_OFF'}))).not.toContain('Try again');
 });

 it('explains a PDF that could not open, and a notification statement that is no longer available',()=>{
  expect(text(render({document:'unavailable'}))).toContain('That statement isn’t available');
  expect(text(render({document:'failed'}))).toContain('We couldn’t open that statement');
  expect(text(render({statement:'00000000-0000-4000-8000-00000000000f'}))).toContain('That statement isn’t available');
  expect(text(render({statement:ids.original}))).not.toContain('isn’t available');
  expect(render({statement:ids.original})).toMatch(/<details open="">\s*<summary id="pay-statement-00000000-0000-4000-8000-000000000002"/);
  // While the list is still loading, nothing is claimed missing yet.
  expect(text(render({statement:'00000000-0000-4000-8000-00000000000f',statements:null,loading:true}))).not.toContain('isn’t available');
 });
});
