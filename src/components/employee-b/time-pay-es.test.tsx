import {createElement, createRef, type ComponentProps, type ReactNode} from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {describe, expect, it, rs} from '@rstest/core';
rs.mock('next/link', () => ({default: ({children, scroll: _scroll, prefetch: _prefetch, ...props}: ComponentProps<'a'> & {scroll?: boolean; prefetch?: boolean}) => createElement('a', props, children)}));
import {PortalLangProvider} from '@/lib/i18n/portal-lang';
import {CorpCorrections, CorpPastTimecards, CorpTimeTab} from '../employee-mobile/hours-corp';
import {onlyB} from '../owner-b/test-support';
import {HoursBContext, type HoursBHead} from './time-b';
import {PayB, type PayBProps} from './pay-b';
import type {EmployeeTimeEntry, EmployeeTimeReady} from '@/lib/employee-time';

/* Signed-in Spanish (Nov 23, 2026): Time and Pay in Puerto Rico Spanish when the person reads Spanish. Fictional data. */
const es = (node: ReactNode) => renderToStaticMarkup(<PortalLangProvider lang="es">{node}</PortalLangProvider>);
const text = (html: string) => html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ');
const zone = 'America/Puerto_Rico', noop = () => {};
const inPage = (head: HoursBHead, node: ReactNode) => onlyB(es(<HoursBContext.Provider value={{head, authority: 'fictional-view'}}><div className="c-page">{node}</div></HoursBContext.Provider>));
const done: EmployeeTimeEntry = {id: 'own-1', locationName: 'Condado', clockInAt: '2026-10-26T11:59:00Z', clockOutAt: '2026-10-26T20:01:00Z', state: 'CLOCKED_OUT', elapsedSeconds: 28920, breakSeconds: 1800, breaks: []};
const open: EmployeeTimeEntry = {id: 'own-2', locationName: 'Condado', clockInAt: '2026-10-27T11:58:00Z', clockOutAt: null, state: 'CLOCKED_IN', elapsedSeconds: 5520, breakSeconds: 0, breaks: []};
const ready = (patch: Partial<EmployeeTimeReady> = {}): EmployeeTimeReady => ({state: 'ready', observedAt: '2026-10-27T13:30:00Z', validForMs: 45000, timeZone: zone, date: '2026-10-27', current: null, today: {entries: [], recordedSeconds: 0, breakSeconds: 0}, recent: {entries: [done], total: 1, limit: 20}, ...patch});

describe('Time in Spanish', () => {
  it('reads the Time tab in Spanish, with Spanish times and dates', () => {
    const plain = text(inPage({title: 'Tiempo'}, <CorpTimeTab data={ready()}/>));
    for (const words of ['Ahora', 'Sin marcar entrada', 'Marca entrada en la tableta de Condado', 'Esta semana', 'Descansos', 'En curso', '30 min de descanso', 'Corregir una marcación', 'Las horas incluyen los descansos.', 'Tus solicitudes de corrección', 'En espera y decididas'])
      expect(plain, words).toContain(words);
    expect(plain).toContain('26 oct');expect(plain).toMatch(/a\.\sm\./);
    for (const words of ['Right now', 'Not clocked in', 'Fix a missed punch', 'Hours include breaks.', 'This week', ' AM']) expect(plain, words).not.toContain(words);
    const on = text(inPage({title: 'Tiempo'}, <CorpTimeTab data={ready({current: open, today: {entries: [open], recordedSeconds: 5520, breakSeconds: 0}})}/>));
    expect(on).toContain('En turno');expect(on).toMatch(/Marcaste entrada a las 7:58\sa\.\sm\./);expect(on).toContain('hasta ahora');expect(on).toContain('– ahora');expect(on).not.toContain('– now');
  });
  it('reads Past timecards and corrections in Spanish', () => {
    const card = {employeeId: 'e', employeeName: 'Fictional', timeZone: zone, startDate: '2026-10-19', endDate: '2026-10-25', pendingCorrections: 0, corrections: [], observedAt: '2026-10-27T13:00:00Z', startAt: '2026-10-19T04:00:00Z', endAt: '2026-10-26T04:00:00Z', recordedNanoseconds: '28920000000000', breakNanoseconds: '0', issues: [],
      entries: [{id: 'e1', locationId: 'l', locationName: 'Condado', positionId: null, positionName: null, sourceKind: 'RECORDED' as const, adjustmentId: null, recordedVersion: 1, startAt: '2026-10-20T11:59:00Z', endAt: '2026-10-20T20:01:00Z', rawStartAt: '2026-10-20T11:59:00Z', rawEndAt: '2026-10-20T20:01:00Z', breaks: []}]};
    const data = {state: 'ready', validForMs: 1, cards: [{card, state: 'APPROVED', history: []}]} as unknown as Parameters<typeof CorpPastTimecards>[0]['data'];
    const plain = text(inPage({title: 'Tarjetas de tiempo'}, <CorpPastTimecards authority="a" data={data} period={{startDate: '2026-10-19', endDate: '2026-10-25'}} today="2026-10-27" entryId={null} onRefresh={noop} chosen={false}/>));
    expect(plain).toContain('Semanas');expect(plain).toContain('1 turno · Aprobada');expect(plain).toContain('19–25 oct');expect(plain).toContain('Ver semanas anteriores');expect(plain).toContain('Cargando…');
    expect(plain).not.toContain('Show earlier weeks');expect(plain).not.toContain('Approved');
    const empty = {state: 'ready' as const, observedAt: '2026-10-27T18:00:00Z', timeZone: zone, totalRequests: 0, locations: [], targets: [], requests: []};
    const fixes = text(inPage({title: 'Tus correcciones'}, <CorpCorrections snapshot={empty} decisions={[]} requestId={null} filter="waiting" onRefresh={noop}/>));
    expect(fixes).toContain('Nada en espera de revisión');expect(fixes).toContain('En espera');expect(fixes).toContain('Decididas');expect(fixes).toContain('Para corregir un día que ya marcaste, ábrelo desde Tiempo.');
    expect(fixes).not.toContain('Nothing waiting for review');
  });
});

type Statement = PayBProps['ordered'][number];
const statement = (n: number, payday: string, start: string, end: string, patch: Partial<Statement> = {}): Statement => ({id: `00000000-0000-4000-8000-00000000000${n}`, kind: 'EMPLOYEE_STATEMENT', employeeId: 'FICTIONAL-E1', filename: `statement-${payday}.pdf`,
  sha256: 'f'.repeat(64), downloadUrl: `/api/payroll/documents/${n}`, viewUrl: `/api/payroll/documents/${n}/view`, published: true, period: {startDate: start, endDate: end}, payday, corrects: null, correctedBy: null, ...patch});
const ordered = [statement(1, '2026-11-13', '2026-11-02', '2026-11-08'), statement(2, '2026-11-06', '2026-10-26', '2026-11-01'), statement(3, '2026-10-30', '2026-10-19', '2026-10-25'), statement(4, '2026-10-23', '2026-10-12', '2026-10-18')];
const base: PayBProps = {view: 'pay', state: 'ready', ordered, byId: new Map(ordered.map(item => [item.id, item])), paycheck: null,
  nextPay: {payday: '2026-11-20', period: {startDate: '2026-11-09', endDate: '2026-11-15'}} as PayBProps['nextPay'], daysUntil: 3, listed: true, thisYear: '2026', notice: null, noticeRef: createRef<HTMLDivElement>(), status: null, onOpenPdf: noop};

describe('Pay in Spanish', () => {
  it('reads Pay in Spanish, with Spanish dates and no English chrome', () => {
    const html = es(<PayB {...base}/>), plain = text(html);
    for (const words of ['Pago', 'Día de pago programado · En 3 días', 'vie, 20 nov', 'Por el trabajo del 9–15 nov', 'Ver tus horas', 'Historial de pago', 'Último comprobante de pago', 'Comprobante listo', 'Ver comprobante', 'Anteriores', 'Ver todos', 'Abre un comprobante para descargar su PDF.'])
      expect(plain, words).toContain(words);
    for (const words of ['Scheduled payday', 'See your hours', 'Last pay statement', 'View statement', 'For work', 'Fri, Nov 20']) expect(plain, words).not.toContain(words);
  });
  it('reads one statement and Pay history in Spanish', () => {
    const item = ordered[0];
    const one = text(es(<PayB {...base} view="paycheck" paycheck={item.id}/>));
    expect(one).toContain('Comprobante de pago');expect(one).toContain('Período de pago 2–8 nov');expect(one).toContain('Día de pago');expect(one).toContain('Comprobante de pago (PDF)');
    expect(one).toContain('Los archivos descargados pueden contener información personal de pago.');expect(one).not.toContain('Payday');
    const history = text(es(<PayB {...base} view="history"/>));
    expect(history).toContain('Historial de pago');expect(history).toContain('noviembre');expect(history).toContain('Tus comprobantes de pago publicados, del más reciente al más antiguo');
    expect(history).not.toContain('November');
  });
});
