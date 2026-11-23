import {createElement, type ComponentProps, type ReactNode} from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {expect, it, rs} from '@rstest/core';
rs.mock('next/link', () => ({default: ({children, scroll: _scroll, prefetch: _prefetch, ...props}: ComponentProps<'a'> & {scroll?: boolean; prefetch?: boolean}) => createElement('a', props, children)}));
import {PortalLangProvider} from '@/lib/i18n/portal-lang';
import {IncomingB, RequestsHubB} from './requests-b';
import {TimeOffB, TimeOffStateB} from './timeoff-b';
import {ExchangeDetailB, ExchangeListB, OpenShiftsB} from './exchange-b';

/* Signed-in Spanish (Nov 23, 2026): Requests, Time off, and Pick up and swap in the person's language, on fictional data. */
const es = (node: ReactNode) => renderToStaticMarkup(<PortalLangProvider lang="es">{node}</PortalLangProvider>).replace(/[  ]/g, ' ');
const request = (id: string, status: string, startDate: string, endDate: string) => ({id, status, startDate, endDate, startTime: null, endTime: null,
  note: null, createdAt: '2026-11-02T15:00:00Z', reviewedAt: '2026-11-03T15:00:00Z', reviewer: status === 'PENDING' ? null : 'Ana Rivera'});

it('draws Requests in Spanish', () => {
  const html = es(<RequestsHubB sub="Días libres y cambios de turno que enviaste" newHref="/app/requests?tab=new" forManager decidedHref="/app/requests?filter=decided" answer={1} shiftRequests
    waitingExtra={<IncomingB count={2} onRetry={() => {}}/>} extraCount={2}
    waiting={[{key: 'w', href: '/app/requests?requestId=w', kind: 'timeOff', title: 'Días libres', sub: 'Nov 12–14 · 3 days', chip: {tone: 'amber', text: 'Waiting'}}]}
    decided={[{key: 'd', href: '/app/exchange?tab=requests&requestId=d', kind: 'callout', title: 'No puedo trabajar', sub: 'Mon, Sep 28', chip: {tone: 'grey', text: 'Declined'}}]}/>);
  for (const text of ['Solicitudes', 'Pedir días libres', 'En espera de tu gerente', 'Cambios para ti', '2 cambios necesitan tu respuesta', 'Por responder', 'Revisar',
    'Decididas', 'Ver todas', 'Rechazada', 'Cambios de turno', 'Tomar y cambiar turnos', 'Cambiar o ceder un turno', 'Elige uno de tus turnos']) expect(html, text).toContain(text);
  for (const text of ['Request time off', 'Waiting for your manager', 'Swaps for you', 'See all', 'Declined', 'Pick up and swap', 'Choose one of your shifts']) expect(html, text).not.toContain(text);
});

it('draws Time off in Spanish: the list, one request, and the read states', () => {
  const list = es(<TimeOffB page="list" filter="waiting" state={null} enabled earlier={false} requests={[request('a', 'PENDING', '2026-11-12', '2026-11-14')]} zone="America/Puerto_Rico" waiting={1}/>);
  for (const text of ['Días libres', 'Pedir días libres', 'En espera', 'Decididas', '12–14 nov', 'jue – sáb', 'Todo el día', '3 días']) expect(list, text).toContain(text);
  for (const text of ['Time off', 'Request time off', 'Waiting', 'All day', 'Thu']) expect(list, text).not.toContain(`>${text}`);
  const one = es(<TimeOffB page="detail" filter="decided" state={null} enabled earlier={false} requests={[]} request={request('b', 'APPROVED', '2026-11-13', '2026-11-13')} zone="America/Puerto_Rico"/>);
  for (const text of ['vie, 13 nov', 'Aprobada', 'Aprobada por Ana Rivera', 'Enviada lun, 2 nov', 'Todo el día']) expect(one, text).toContain(text);
  expect(one).not.toContain('Approved');expect(one).not.toContain('Sent');
  expect(es(<TimeOffB page="list" filter="decided" state={null} enabled={false} earlier={false} requests={[]} zone="UTC"/>)).toContain('Tu trabajo no usa días libres en NEVORA.');
  expect(es(<TimeOffStateB paused={false} denied={false} refreshing={false} onRetry={() => {}}/>)).toContain('No pudimos cargar tus días libres.');
  expect(es(<TimeOffStateB paused={false} denied refreshing={false} onRetry={() => {}}/>)).toContain('Iniciar sesión');
});

const openShift = (id: string) => ({id, revision: 1, date: '2026-11-24', startTime: '22:00', endTime: '06:00', location: 'Main Office', position: 'Customer Support',
  check: 'eligible' as const, notice: null, outcome: null});

it('draws Pick up and swap in Spanish: Open shifts, For you, and a request’s page', () => {
  const open = es(<OpenShiftsB state={null} enabled failed={false} refreshing={false} onRefresh={() => {}} results={null}
    rows={[{shift: openShift('a'), hours: '8 h', nextWeek: true, selected: false, action: <button type="button">Tomar</button>, status: null}]} unconfirmed={[]} refused={[]} note={null}/>);
  for (const text of ['Tomar y cambiar turnos', 'Turnos disponibles', 'Para ti', 'Mis solicitudes', 'Puedes tomar', '10:00 p. m. – 6:00 a. m.', 'termina mié', 'Próxima semana', 'Ver todos los turnos publicados', 'Horario'])
    expect(open, text).toContain(text);
  for (const text of ['You can pick up', 'See every posted shift', 'Next week', 'PM', 'For you']) expect(open, text).not.toContain(text);
  const list = es(<ExchangeListB mode="incoming" state={null} enabled recoveries={null} rows={[]}/>);
  for (const text of ['Por responder', 'Ningún cambio necesita tu respuesta', 'Cambiar o ceder un turno']) expect(list, text).toContain(text);
  const summary = {id: 'r', kind: 'swap' as const, viewer: 'recipient' as const, status: 'EMPLOYEE_PENDING', date: '2026-11-24', createdAt: '2026-11-20T15:00:00Z', counterparty: 'Luis M.', revision: 1, releaseApplies: null};
  const slot = {date: '2026-11-24', startTime: '09:00', endTime: '17:00', location: 'Main Office', position: null, lead: true};
  const detail = es(<ExchangeDetailB mode="incoming" title="Cambio de turno" back="/app/exchange?tab=foryou" state={null} enabled recoveries={null} timeZone="UTC" status="Por responder" controls={null}
    detail={{summary, offered: slot, requested: slot, history: [], checks: [], notice: null, reason: null}}/>);
  for (const text of ['Para ti', 'De Luis M.', 'Enviada 20 nov, 3:00 p. m.', 'Tu turno actual', 'Trabajarías', 'Líder de turno', '9:00 a. m. – 5:00 p. m.', 'Tu respuesta', 'No hay historial registrado para esta solicitud.'])
    expect(detail, text).toContain(text);
  for (const text of ['Your current shift', 'Submitted', 'Shift lead', 'From ']) expect(detail, text).not.toContain(text);
});
