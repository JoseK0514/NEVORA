import {beforeEach,describe,expect,it,rs} from '@rstest/core';
import {createElement} from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import type {PayrollStatementsResponse} from '@/lib/payroll/contracts';
import type {PayView} from './pay';
import {MobileLangProvider} from './mobile-lang';
import {withoutB} from '../owner-b/test-support';

// Signed-in Spanish (Nov 23, 2026): Pay on the corporate kit in Puerto Rico Spanish, with fictional statements only. The
// phone's Direction B layer (employee-b/pay-b.tsx) keeps its own words, so the checks read the corporate layer.
const route=rs.hoisted(()=>({search:''}));
rs.mock('next/navigation',()=>({useSearchParams:()=>new URLSearchParams(route.search)}));
const {CorpPayView}=await import('./pay-corp');

type Statement=PayrollStatementsResponse['statements'][number];
const ids={old:'00000000-0000-4000-8000-000000000001',original:'00000000-0000-4000-8000-000000000002',correction:'00000000-0000-4000-8000-000000000003'};
const statement=(id:string,payday:string,start:string,end:string,links:Partial<Statement>={}):Statement=>({id,kind:'EMPLOYEE_STATEMENT',employeeId:'FICTIONAL-E1',filename:`statement-${payday}.pdf`,sha256:'f'.repeat(64),downloadUrl:`/api/payroll/documents/${id}`,viewUrl:`/api/payroll/documents/${id}/view`,published:true,period:{startDate:start,endDate:end},payday,corrects:null,correctedBy:null,...links});
const history=[statement(ids.old,'2030-01-10','2029-12-23','2030-01-05'),statement(ids.original,'2030-01-24','2030-01-06','2030-01-19',{correctedBy:ids.correction}),statement(ids.correction,'2030-01-24','2030-01-06','2030-01-19',{corrects:ids.original})];
const base:PayView={statements:history,loading:false,error:'',errorCode:'',nextPay:null,statement:null,document:null,reload:()=>{}};
const render=(view:Partial<PayView>={},search='')=>{route.search=search;return withoutB(renderToStaticMarkup(createElement(MobileLangProvider,{value:'es'},createElement(CorpPayView,{...base,...view}))));};
const text=(html:string)=>html.replace(/<[^>]+>/g,' ').replace(/\s+/g,' ');
beforeEach(()=>{route.search='';});

describe('Employee Pay on the kit in Spanish',()=>{
 it('lists recent statements in Spanish',()=>{
  const html=render(),plain=text(html);
  for(const words of ['Pago','Historial de pagos','Comprobantes de pago recientes','jue, 24 ene','6–19 ene','Corrección','Reemplazado','Tu patrono te paga. NEVORA muestra tu comprobante de pago.'])expect(plain).toContain(words);
  expect(html).toContain('jueves, 24 de enero de 2030, comprobante corregido del 6–19 ene');
  for(const words of ['Pay history','Recent pay statements','Correction','Replaced','Your employer pays you'])expect(plain).not.toContain(words);
 });
 it('draws the scheduled payday, history and one statement in Spanish',()=>{
  const next=text(render({nextPay:{payday:'2030-02-07',daysUntil:3,period:{startDate:'2030-01-20',endDate:'2030-02-02'}}}));
  expect(next).toContain('Este período de pago · 20 ene');expect(next).toContain('El día de pago programado es en 3 días');expect(next).toContain('Ver tus horas');
  expect(next).not.toContain('Scheduled payday');
  const history=text(render({},'view=history'));
  expect(history).toContain('Tus comprobantes de pago publicados, del más reciente al más antiguo.');expect(history).toMatch(/enero de 2030/);expect(history).not.toContain('newest first');
  const one=render({},`paycheck=${ids.original}`),plain=text(one);
  for(const words of ['Comprobante de pago','Período de pago 6–19 ene','Día de pago','Un comprobante corregido reemplazó a este.','Usar el comprobante corregido',
   'Si la cantidad es distinta de lo que recibiste, pregúntale a tu gerente.','Comprobante de pago (PDF)','Los archivos descargados pueden contener información personal de pago.'])expect(plain).toContain(words);
  expect(one).toContain('aria-label="Comprobante de pago (PDF), comprobante reemplazado, día de pago jueves, 24 de enero de 2030 (se abre aparte)"');
  expect(plain).not.toMatch(/Pay statement|Use the corrected|ask your manager|Downloaded files/);
 });
 it('says each state in Spanish',()=>{
  expect(text(render({loading:true,statements:null}))).toContain('Cargando tus comprobantes…');
  expect(text(render({statements:null,error:'x',errorCode:'MODULE_OFF'}))).toContain('Los comprobantes de pago están desactivados');
  expect(text(render({statements:null,error:'x',errorCode:'NETWORK'}))).toContain('Intentar de nuevo');
  expect(text(render({statements:null,error:'x',errorCode:'SIGNED_OUT'}))).toContain('Iniciar sesión');
  expect(text(render({document:'temporary'}))).toContain('NEVORA no pudo abrirlo ahora. Inténtalo de nuevo en un momento.');
  expect(text(render({statements:null,error:'x',errorCode:'NETWORK'}))).not.toMatch(/Try again|Couldn’t load/);
 });
});
