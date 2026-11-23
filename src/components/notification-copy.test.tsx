// Signed-in Spanish (es-rest): the Owner's and Manager's Notifications in Puerto Rico Spanish, from the same read.
import {createElement, type ComponentProps} from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {expect, it, rs} from '@rstest/core';
import type {EmployeeNotificationItem} from '../lib/employee-view';
import {PortalLangProvider} from '@/lib/i18n/portal-lang';

const read = rs.hoisted(() => ({state: {paused: false, refreshing: false, snapshot: null as unknown}}));
rs.mock('next/link', () => ({default: ({children, prefetch: _prefetch, ...props}: ComponentProps<'a'> & {prefetch?: boolean}) => createElement('a', props, children)}));
rs.mock('./employee-account-panel', () => ({useEmployeeAccountRead: () => ({state: read.state, refresh: () => {}})}));
import {ManagerNotifications} from './notifications-manager-b';
import {NOTIFICATION_COPY, relativeTimeFor} from './notification-copy';

/** Every key, nested ones too, so a Spanish entry can't go missing. */
function keyPaths(value: unknown, prefix = ''): string[] {
  if (!value || typeof value !== 'object') return [prefix];
  return Object.entries(value as Record<string, unknown>).flatMap(([key, inner]) => keyPaths(inner, prefix ? `${prefix}.${key}` : key)).sort();
}

const now = new Date().toISOString();
const item = (id: string, label: string, reviewState: 'read' | 'unread'): EmployeeNotificationItem =>
  ({id, label, at: now, href: '/app/notifications/open?notificationId=' + id, reviewState, actionState: 'available'});
const ready = (items: EmployeeNotificationItem[]) => ({state: 'ready', kind: 'notifications', coverage: 'complete', items, observedAt: now, validForMs: 60000, timeZone: 'America/Puerto_Rico'});
const render = (snapshot: unknown, lang: 'en' | 'es') => {
  read.state = {paused: false, refreshing: false, snapshot};
  return renderToStaticMarkup(<PortalLangProvider lang={lang}><ManagerNotifications authority={'a'.repeat(64)} /></PortalLangProvider>);
};
const text = (html: string) => html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ');

it('has a Spanish entry for every English one', () => {
  expect(keyPaths(NOTIFICATION_COPY.es)).toEqual(keyPaths(NOTIFICATION_COPY.en));
});

it('draws the Notifications in Spanish when the person reads Spanish, and in English otherwise', () => {
  const items = [item('a', 'Schedule published', 'unread'), item('b', 'Operations need review', 'read'), item('c', 'Operations need review', 'read')];
  const es = text(render(ready(items), 'es'));
  for (const words of ['Notificaciones', 'Todas', 'Sin leer', 'Hoy', 'Ahora mismo', 'última', 'notificaciones']) expect(es).toContain(words);
  for (const english of ['Notifications', 'Today', 'Just now', 'latest', 'Unread']) expect(es).not.toContain(english);
  expect(text(render(ready([]), 'es'))).toContain('Las solicitudes de tu equipo están en Pendientes.');
  expect(text(render({state: 'unavailable', reason: 'read_failed'}, 'es'))).toContain('Las notificaciones no cargaron');
  const en = text(render(ready(items), 'en'));
  for (const words of ['Notifications', 'Today', 'Unread']) expect(en).toContain(words);
});

it('writes relative times the voice guide way', () => {
  const at = new Date('2026-11-23T15:00:00Z');
  expect(relativeTimeFor('es', '2026-11-23T14:55:00Z', 'America/Puerto_Rico', at)).toBe('hace 5 min');
  expect(relativeTimeFor('es', '2026-11-23T12:00:00Z', 'America/Puerto_Rico', at)).toBe('hace 3 h');
  expect(relativeTimeFor('es', '2026-11-22T15:00:00Z', 'America/Puerto_Rico', at)).toBe('Ayer');
  expect(relativeTimeFor('es', '2026-11-20T15:00:00Z', 'America/Puerto_Rico', at)).toBe('viernes');
  expect(relativeTimeFor('es', '2026-11-02T15:00:00Z', 'America/Puerto_Rico', at)).toBe('2 nov');
  expect(relativeTimeFor('en', '2026-11-02T15:00:00Z', 'America/Puerto_Rico', at)).toBe('Nov 2');
});
