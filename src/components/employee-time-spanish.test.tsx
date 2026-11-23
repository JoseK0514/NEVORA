import {createElement, type ComponentProps} from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {expect, it, rs} from '@rstest/core';
rs.mock('next/link', () => ({default: ({children, prefetch: _prefetch, ...props}: ComponentProps<'a'> & {prefetch?: boolean}) => createElement('a', props, children)}));
import {PortalLangProvider} from '@/lib/i18n/portal-lang';
import {EmployeeTimeView, EmployeeTimeSignatureView} from './employee-time-panel';
import {EmployeeCorrectionCenter} from './employee-time-corrections';
import {employeeTimecardPresentation} from './employee-timecard-presentation';
import {projectEmployeeTime} from '../lib/employee-time';
import type {EmployeeTimePanelState} from '../lib/employee-time-client';

/* Signed-in Spanish: the Time panel, My time and the corrections in Puerto Rico Spanish on fictional data. */
const raw = (extra: Record<string, unknown> = {}) => ({id: 'entry', employee_id: 'self', location_name: 'Oficina Ficticia', clock_in_at: '2030-10-07T12:00:00Z', clock_out_at: null, status: 'CLOCKED_IN', history_valid: true, breaks: [], ...extra});
const ready = (entries: unknown[] = []) => projectEmployeeTime({observedAt: '2030-10-07T16:00:00Z', expiresAt: '2030-10-08T16:00:00Z', timeZone: 'America/Puerto_Rico', recentCount: 0, entries}, 'self');
const es = (node: React.ReactNode) => renderToStaticMarkup(<PortalLangProvider lang="es">{node}</PortalLangProvider>);
const state = (time: EmployeeTimePanelState['time'], paused = false): EmployeeTimePanelState => ({time, paused, refreshing: false});

it('renders the Time panel in Spanish: status, totals, entries and footer', () => {
  const html = es(<EmployeeTimeView state={state(ready([raw()]))} corporate onRefresh={() => {}}/>);
  for (const text of ['Estado actual', 'En turno', 'Marcaste entrada a las', 'Tiempo registrado', 'Tiempo de descanso', 'no son horas de nómina', 'Registros recientes', 'Hora de Puerto Rico', 'Detalles del registro', 'aria-label="Actualizar el tiempo registrado"', 'a. m.', 'Usa el Clocker de tu localidad'])
    expect(html, text).toContain(text);
  for (const text of ['Current status', 'Clocked in', 'Recorded time', 'Break time', 'Recent entries', 'Puerto Rico time', 'Record details', 'Refresh recorded time', ' AM', ' PM'])
    expect(html, text).not.toContain(text);
});

it('renders a finished entry and its correction button in Spanish', () => {
  const html = es(<EmployeeTimeView state={state(ready([raw({clock_out_at: '2030-10-07T15:00:00Z', status: 'CLOCKED_OUT'})]))} onRefresh={() => {}}/>);
  expect(html).toContain('Completado');expect(html).toContain('Entrada');expect(html).toContain('Salida');expect(html).toContain('Pedir una corrección');
  expect(html).toContain('Tiempo del registro');expect(html).not.toContain('Request a correction');expect(html).not.toContain('Entry elapsed time');
});

it('renders the loading, paused and failed states in Spanish', () => {
  expect(es(<EmployeeTimeView state={state(null)} onRefresh={() => {}}/>)).toContain('Cargando el tiempo registrado');
  expect(es(<EmployeeTimeView state={state(ready(), true)} onRefresh={() => {}}/>)).toContain('Actualizaciones en pausa');
  const failed = es(<EmployeeTimeView state={state({state: 'unavailable', reason: 'read_failed'})} onRefresh={() => {}}/>);
  expect(failed).toContain('No pudimos cargar tus registros de tiempo');expect(failed).toContain('Intentar de nuevo');expect(failed).not.toContain('Try again');
});

it('renders My time in Spanish', () => {
  const html = es(<EmployeeTimeSignatureView state={state(ready([raw()]))} context={{todayLabel: 'lunes, 7 oct'}} onRefresh={() => {}}/>);
  for (const text of ['Mi tiempo', 'Pago', 'Trabajado hoy', 'En descanso', 'Esta semana', 'Tarjetas de tiempo', 'Hoy', 'Las marcaciones vienen del Clocker', 'lunes'])
    expect(html, text).toContain(text);
  for (const text of ['My time', 'Worked today', 'This week', 'Timecards', 'Monday']) expect(html, text).not.toContain(text);
});

it('renders the corrections view in Spanish', () => {
  const html = es(<EmployeeCorrectionCenter zone="America/Puerto_Rico"/>);
  for (const text of ['Correcciones', 'Tu gerente revisa cada solicitud', 'Pedir una corrección', 'Añadir tiempo que no se registró', 'Cargando el historial de correcciones'])
    expect(html, text).toContain(text);
  for (const text of ['Corrections', 'Request a correction', 'Loading correction history']) expect(html, text).not.toContain(text);
});

it('keeps the timecard heading English by default and gives it in Spanish on request', () => {
  expect(employeeTimecardPresentation(['period_open']).heading).toBe('Period information');
  expect(employeeTimecardPresentation(['period_open'], 'es').heading).toBe('Información del período');
});
