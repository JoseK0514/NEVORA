import {renderToStaticMarkup} from 'react-dom/server';
import {expect, it, rs} from '@rstest/core';
import {ManagerTimeCorrectionsSurface} from './manager-time-corrections';
import {MANAGER_TIME_CORRECTIONS_COPY} from './manager-time-corrections-copy';
import type {ManagerTimeCorrections} from '@/lib/time-corrections/read-model';

/* Signed-in Spanish (Nov 23, 2026): the Time corrections queue in Spanish, fictional data. */
const item = {
  id: '66666666-6666-4666-8666-666666666666', kind: 'MISSING_ENTRY' as const, status: 'PENDING' as const, revision: 1, createdAt: '2030-10-07T16:05:00Z',
  locationId: 'loc-1', locationName: 'Fuel Coffee Drive', originalStartAt: '2030-10-07T12:00:00Z', originalEndAt: '2030-10-07T16:00:00Z',
  proposedStartAt: '2030-10-07T12:05:00Z', proposedEndAt: '2030-10-07T15:55:00Z', breakName: null, reason: 'Olvidé marcar.', baseChanged: true,
  context: {state: 'confirmed' as const, sourceKind: 'ADJUSTMENT' as const, startAt: '2030-10-07T12:15:00Z', endAt: '2030-10-07T15:45:00Z', totalDecisions: 1,
    decisions: [{status: 'APPROVED' as const, decidedAt: '2030-10-07T16:02:00Z', startAt: '2030-10-07T12:15:00Z', endAt: '2030-10-07T15:45:00Z', note: null}]},
  employeeName: 'Avery QA', isSelf: false, requestedByName: 'Rosa M.',
};
const ready = {state: 'ready', validForMs: 45000, observedAt: '2030-10-07T16:10:00Z', timeZone: 'America/Puerto_Rico', requests: [item]} as unknown as Extract<ManagerTimeCorrections, {state: 'ready'}>;
const draw = (patch: Record<string, unknown> = {}) => renderToStaticMarkup(<ManagerTimeCorrectionsSurface snapshot={ready} loading={false} busyId={null} notice={null}
  onDecision={rs.fn()} onRetry={rs.fn()} retry={null} lang="es" band={{zone: 'America/Puerto_Rico'}} {...patch}/>);

it('draws the queue and a request’s review in Spanish', () => {
  const html = draw();
  for (const text of ['Correcciones de tiempo', '1 en espera · Correcciones que pidió tu equipo', 'Hora de Puerto Rico', 'Tiempo faltante', 'Tiempo faltante aprobado',
    'Su razón', 'Pedida por Rosa M. para este empleado.', 'La tarjeta de tiempo cambió después de esta solicitud', '>Rechazar<', '>Aprobar<',
    'aria-label="Aprobar la corrección de Avery QA"', 'a. m.'])
    expect(html, text).toContain(text);
  for (const text of ['Time corrections', 'Missing time', 'Their reason', '>Decline<', '>Approve<', ' AM'])
    expect(html, text).not.toContain(text);
});

it('draws the empty, loading, failed and no-access states in Spanish', () => {
  const empty = draw({snapshot: {...ready, requests: []}});
  expect(empty).toContain('Nada que corregir');expect(empty).toContain('Ir a Tarjetas de tiempo');
  expect(draw({snapshot: null, loading: true, connection: 'loading'})).toContain('Cargando solicitudes de corrección');
  const failed = draw({snapshot: {state: 'unavailable', reason: 'read_failed'}, connection: 'unavailable'});
  expect(failed).toContain('Solicitudes de corrección no disponibles');expect(failed).toContain('No pudimos cargar las correcciones');
  expect(draw({snapshot: null, connection: 'not_allowed'})).toContain('No tienes acceso a las correcciones de tiempo');
});

it('says a decision’s result and a kept-English notice in Spanish', () => {
  const {en} = MANAGER_TIME_CORRECTIONS_COPY;
  expect(draw({notice: en.approvedNotice})).toContain('Corrección aprobada');
  expect(draw({notice: en.rejectedNotice})).toContain('Corrección rechazada');
  const conflict = draw({notice: en.conflict});
  expect(conflict).toContain('Esta solicitud cambió mientras la revisabas');expect(conflict).not.toContain('This request changed');
  expect(draw({notice: en.unknownNotice, retry: {operationId: 'x', requestId: item.id, expectedRevision: 1, decision: 'APPROVE'}})).toContain('Reintentar la misma decisión');
});
