import {describe,expect,it} from '@rstest/core';
import {createElement} from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {EmployeePayView,PAY_DIFFERENCE_LINE,PAY_SCOPE_LINE,payPeriod,type PayView} from './pay';
import {MobileLangProvider} from './mobile-lang';
import type {PayrollStatementsResponse} from '@/lib/payroll/contracts';

// Signed-in Spanish (Nov 23, 2026): the Employee's Pay in Puerto Rico Spanish, with fictional statements only.
type Statement=PayrollStatementsResponse['statements'][number];
const ids={old:'00000000-0000-4000-8000-000000000001',original:'00000000-0000-4000-8000-000000000002',correction:'00000000-0000-4000-8000-000000000003'};
const statement=(id:string,payday:string,start:string,end:string,links:Partial<Statement>={}):Statement=>({id,kind:'EMPLOYEE_STATEMENT',employeeId:'FICTIONAL-E1',filename:`statement-${payday}.pdf`,sha256:'f'.repeat(64),downloadUrl:`/api/payroll/documents/${id}`,viewUrl:`/api/payroll/documents/${id}/view`,published:true,period:{startDate:start,endDate:end},payday,corrects:null,correctedBy:null,...links});
const history=[statement(ids.old,'2030-01-10','2029-12-23','2030-01-05'),statement(ids.original,'2030-01-24','2030-01-06','2030-01-19',{correctedBy:ids.correction}),statement(ids.correction,'2030-01-24','2030-01-06','2030-01-19',{corrects:ids.original})];
const base:PayView={statements:history,loading:false,error:'',errorCode:'',nextPay:null,statement:null,document:null,reload:()=>{}};
const render=(view:Partial<PayView>={})=>renderToStaticMarkup(createElement(MobileLangProvider,{value:'es'},createElement(EmployeePayView,{...base,...view})));
const text=(html:string)=>html.replace(/<[^>]+>/g,' ').replace(/\s+/g,' ');

describe('Employee mobile Pay in Spanish',()=>{
 it('keeps the English lines other screens import, and writes Spanish periods',()=>{
  expect(PAY_SCOPE_LINE).toBe('Your employer pays you. NEVORA shows your pay statement.');
  expect(PAY_DIFFERENCE_LINE).toBe('If the amount differs from what you received, ask your manager.');
  expect(payPeriod('2030-01-06','2030-01-19')).toBe('Jan 6–19, 2030');
  expect(payPeriod('2030-01-06','2030-01-19','es')).toMatch(/^6–19 ene 2030$/);
 });
 it('draws statements, corrections and the privacy lines in Spanish',()=>{
  const html=render(),plain=text(html);
  for(const words of ['Pago','Tus comprobantes de pago publicados','Comprobante más reciente','Día de pago 24 de enero de 2030','Corrección','Reemplazado',
   'Este corrige tu comprobante anterior del mismo período.','Usar el comprobante corregido','Comprobantes anteriores','Tarjetas de tiempo',
   'Tu patrono te paga. NEVORA muestra tu comprobante de pago.','Si la cantidad es distinta de lo que recibiste, pregúntale a tu gerente.'])expect(plain).toContain(words);
  expect(html).toContain('aria-label="Ver comprobante corregido, día de pago 24 de enero de 2030 (se abre aparte)"');
  expect(html).toContain('aria-label="Descargar comprobante corregido, día de pago 24 de enero de 2030"');
  for(const words of ['Latest statement','Payday','Earlier statements','Use the corrected statement','Your employer pays you','ask your manager','Download','Timecards'])expect(plain).not.toContain(words);
 });
 it('names the scheduled payday and each state in Spanish',()=>{
  const plain=text(render({nextPay:{payday:'2030-02-07',daysUntil:3,period:{startDate:'2030-01-20',endDate:'2030-02-02'}}}));
  expect(plain).toContain('Próximo día de pago programado');expect(plain).toContain('jueves, 7 de febrero');expect(plain).toContain('En 3 días · del período 20 ene');
  expect(plain).not.toContain('Next scheduled payday');expect(plain).not.toContain('In 3 days');
  expect(text(render({statements:null,error:'x',errorCode:'NETWORK'}))).toContain('No pudimos cargar tus comprobantes');
  expect(text(render({statements:null,error:'x',errorCode:'NETWORK'}))).toContain('Intentar de nuevo');
  expect(text(render({statements:null,error:'x',errorCode:'OFFLINE'}))).toContain('Estás sin conexión');
  expect(text(render({statements:[]}))).toContain('Todavía no hay comprobantes publicados');
  expect(text(render({document:'failed'}))).toContain('No pudimos abrir ese comprobante');
  expect(text(render({statements:null,error:'x',errorCode:'SIGNED_OUT'}))).not.toMatch(/Sign in|statements/);
 });
});
