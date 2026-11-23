// Signed-in Spanish (es-rest R2, Nov 23, 2026): the shared sentences that es-rest pages draw from the libraries have a
// Spanish side. English is unchanged (the existing tests of each module still hold), and the tables carry the same keys.
import {expect, it} from '@rstest/core';
import {NOTIFICATION_TEXT_COPY} from './notification-text-copy';
import {notificationPresentation, notificationTitle, groupNotifications} from './notification-inbox-view';
import {notificationCountNote, notificationOutcomeNote} from './notification-facts';
import {timeZoneLabel} from './time-zone-label';
import {formatBusinessDateTime, formatBusinessTimestamp} from './business-time';
import {PHOTO_STATE_LABELS, photoReviewStateLabel} from './clocker/photo-client/review';
import {ATTENDANCE_WORDS, ATTENDANCE_WORDS_ES, attendanceWords} from './action-center/present';

const paths = (value: unknown, prefix = ''): string[] => value && typeof value === 'object' && !Array.isArray(value)
  ? Object.entries(value).flatMap(([key, inner]) => paths(inner, `${prefix}${key}.`)) : [prefix];
const NB = ' ';

it('holds the same keys in English and Spanish', () => {
  const {en, es} = NOTIFICATION_TEXT_COPY;
  // English keeps each label as the server sends it, so only Spanish lists titles.
  expect(paths({...es, titles: {}}).sort()).toEqual(paths(en).sort());
  expect(Object.keys(PHOTO_STATE_LABELS.es).sort()).toEqual(Object.keys(PHOTO_STATE_LABELS.en).sort());
  expect(Object.keys(ATTENDANCE_WORDS_ES).sort()).toEqual(Object.keys(ATTENDANCE_WORDS).sort());
});

it('writes notification rows in Spanish and leaves English as it was', () => {
  const item = {label: 'Time off approved', eventType: 'TIME_OFF_APPROVED', outcome: 'CANCELLED', names: ['Ana Rivera'], count: null,
    subject: {kind: 'timeOff', startDate: '2026-12-07', endDate: '2026-12-09'}} as never;
  expect(notificationTitle(item)).toEqual({title: 'Time off approved', detail: 'Dec 7–9 · Ana Rivera · Now cancelled'});
  expect(notificationTitle(item, 'es')).toEqual({title: 'Días libres aprobados', detail: '7–9 dic · Ana Rivera · Ahora cancelada'});
  const week = {label: 'Schedule published', eventType: 'SCHEDULE_PUBLISHED', count: 3, subject: {kind: 'scheduleWeek', startDate: '2026-11-30', endDate: '2026-12-06'}} as never;
  expect(notificationTitle(week, 'es').detail).toBe(`Semana del 30 nov–6 dic · 3${NB}turnos`);
  expect(notificationTitle({label: 'Operations need review', eventType: 'MANAGER_REVIEW', count: 5} as never, 'es'))
    .toEqual({title: 'Tienes pendientes esperando', detail: `5${NB}en espera`});
  expect(notificationTitle({label: 'Operations need review', eventType: 'MANAGER_REVIEW', count: 5} as never).title).toBe('Things to do are waiting for you');
  expect(notificationCountNote({eventType: 'SCHEDULE_CHANGED', count: 0}, 'es')).toBe('No tienes turnos');
  expect(notificationOutcomeNote({eventType: 'SWAP_APPROVED', outcome: 'PENDING'}, 'es')).toBe('Ahora en espera');
  expect(notificationPresentation('Time-off update', undefined, 'es')).toEqual({icon: 'timeOff', destination: 'Revisa tu solicitud de días libres', action: 'Ver solicitud'});
  expect(notificationPresentation('Time-off update')).toEqual({icon: 'timeOff', destination: 'Review your time-off request', action: 'View request'});
  expect(notificationPresentation('Something else', undefined, 'es').action).toBe('Abrir');
  const groups = groupNotifications([{id: 'a', at: '2026-12-07T15:00:00Z'}] as never, 'America/Puerto_Rico', 'es');
  expect(groups[0].label).toBe('lunes, 7 de diciembre de 2026');
});

it('names time zones, business times and photo states in Spanish', () => {
  expect(timeZoneLabel('America/Puerto_Rico')).toBe('Puerto Rico time');
  expect(timeZoneLabel('America/Puerto_Rico', 'es')).toBe('Hora de Puerto Rico');
  expect(formatBusinessDateTime('2026-12-07T22:05:00Z', 'America/Puerto_Rico')).toBe('Dec 7, 6:05 PM');
  expect(formatBusinessDateTime('2026-12-07T22:05:00Z', 'America/Puerto_Rico', 'es')).toBe('7 dic, 6:05 p. m.');
  expect(formatBusinessTimestamp('2026-01-03T13:00:00Z', 'America/Puerto_Rico', 'es')).toBe('3 ene, 9:00 a. m.');
  expect(photoReviewStateLabel('stored')).toBe('Photo available');
  expect(photoReviewStateLabel('expired', 'es')).toBe('Foto vencida');
  expect(attendanceWords('es').notClockedIn).toBe('Sin marcar entrada');
  expect(attendanceWords()).toBe(ATTENDANCE_WORDS);
});
