import type {ComponentProps, ReactNode} from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {describe, expect, it, rs} from '@rstest/core';
rs.mock('@/app/login/actions', () => ({logout: rs.fn()}));
import {PortalLangProvider} from '@/lib/i18n/portal-lang';
import {EmployeeDocumentB, EmployeeHelpB, EmployeeMoreB} from './account-b';
import {EmployeeAlertsB, EmployeeCalendarB, EmployeeDeleteB, EmployeeProfileB} from './account-b-client';
import {AvailabilityB, AvailabilityStatusB, availabilitySubB} from './availability-b';
import {EmployeeComposeB, EmployeeNotificationsB, EmployeeUpdateB, EmployeeUpdatesB, type UpdatesBList} from './messages-b';
import {POLICY_DOCUMENTS, PRIVACY} from '../../lib/legal/policies';
import type {ReadyUpdate} from '../employee-mobile/messages-view';
import type {DeviceSnapshot} from '../../lib/notifications/device-client';

/* Signed-in Spanish (Nov 23, 2026): each Account screen in Puerto Rico Spanish, on fictional data. Client screens read the
 * person's language from the provider; the server-safe ones (More, Help, a policy page, Availability) take `lang`. */
const text = (html: string) => html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ');
const es = (node: ReactNode) => text(renderToStaticMarkup(<PortalLangProvider lang="es">{node}</PortalLangProvider>));
const noop = () => {};
const absent = (plain: string, words: string[]) => { for (const word of words) expect(plain, word).not.toContain(word); };

describe('Account screens in Spanish', () => {
  it('More', () => {
    const plain = es(<EmployeeMoreB lang="es" name="Persona Ficticia" place="Oficina principal" availability={null} has={{availability: true, notifications: true, updates: true}} count={null} />);
    for (const word of ['Más', 'Perfil y ajustes', 'Tu trabajo', 'Disponibilidad', 'Notificaciones', 'Avisos', 'Añadir turnos a tu calendario', 'Ayuda y aspectos legales', 'Cerrar sesión']) expect(plain).toContain(word);
    absent(plain, ['Your work', 'Profile and settings', 'Sign out', 'Help and legal']);
    // English stays the default.
    expect(text(renderToStaticMarkup(<EmployeeMoreB name="Persona Ficticia" place="" availability={null} has={{availability: false, notifications: false, updates: false}} count={null} />))).toContain('Sign out');
  });
  it('Help and a policy page', () => {
    const help = es(<EmployeeHelpB lang="es" email="soporte@ejemplo.test" response={null} signIn={[{p: ['x']}]} work={[{p: ['x']}]} report={[{p: ['x']}]} legal />);
    for (const word of ['Ayuda', 'Contacto', 'Escribir a soporte', 'No envíes datos privados por correo', 'Preguntas frecuentes', 'No puedo iniciar sesión', 'Turnos, días libres o pago', 'Política de privacidad']) expect(help).toContain(word);
    absent(help, ['Common questions', 'Email support', 'Never email']);
    const doc = es(<EmployeeDocumentB lang="es" doc={PRIVACY} sub="x" back="/app/profile" documents={POLICY_DOCUMENTS} />);
    expect(doc).toContain('En esta política');expect(doc).not.toContain('In this policy');
  });
  it('Profile', () => {
    const state = {paused: false, refreshing: false, snapshot: {state: 'ready', kind: 'profile', profile: {name: 'Persona Ficticia', locations: ['Oficina principal'], timeZone: 'America/Puerto_Rico'}}} as unknown as ComponentProps<typeof EmployeeProfileB>['state'];
    const plain = es(<EmployeeProfileB state={state} onRetry={noop} lang="es" passkeys policies ending={false} employeeId="E-100" />);
    for (const word of ['Perfil y ajustes', 'Datos personales', 'Nombre', 'ID de empleado', 'Inicias sesión con este ID.', 'Localidades', 'Zona horaria', 'Tu gerente mantiene estos datos al día.', 'Idioma', 'Alertas en este dispositivo', 'Seguridad', 'Eliminar mi cuenta']) expect(plain).toContain(word);
    absent(plain, ['Personal info', 'Time zone', 'Security', 'Delete my account']);
  });
  it('Add to calendar', () => {
    const props = {status: {state: 'active', authority: 'fictional', generation: 'g1', canIssue: true}, url: 'https://example.test/feed.ics', paused: false, busy: false, notice: null, pendingKind: null,
      onCommand: noop, onCopy: noop, onRetry: noop, confirmation: null, open: 'google', onOpen: noop, onAsk: noop, onCancel: noop, onConfirm: noop} as unknown as ComponentProps<typeof EmployeeCalendarB>;
    const plain = es(<EmployeeCalendarB {...props} />);
    for (const word of ['Añadir al calendario', 'Suscripción', 'Activo', 'No compartas el enlace', 'Tu enlace de calendario privado', 'Copiar enlace de calendario', 'O añádelo directo a', 'Copia tu enlace privado de NEVORA.', 'Guía de Google', 'Obtener un enlace nuevo', 'Desactivar enlace']) expect(plain).toContain(word);
    absent(plain, ['Subscription', 'Copy calendar link', 'Get a new link', 'Google setup guide']);
  });
  it('Alerts on this device', () => {
    const snapshot = {state: 'ready', server: {supported: true, enabled: false, configurationAvailable: true, testAllowed: false}, standalone: true,
      capabilities: {secure: true, push: true, notifications: true, serviceWorker: true, requiresStandalone: false, installPrompt: false}} as DeviceSnapshot;
    const plain = es(<EmployeeAlertsB snapshot={snapshot} paused={false} enabled canInstall={false} confirm={false} onEnable={noop} onRefresh={noop} onPostpone={noop} onInstall={noop} onReview={noop} onKeep={noop} onTurnOff={noop} onTest={noop} />);
    for (const word of ['Alertas en este dispositivo', 'Este dispositivo', 'Las alertas están desactivadas', 'Activar alertas', 'Ahora no']) expect(plain).toContain(word);
    absent(plain, ['Turn on alerts', 'Not now', 'This device']);
  });
  it('Delete account, before and after', () => {
    const base = {period: '30 días', missingPeriod: '—', support: () => 'soporte@ejemplo.test'};
    const form = es(<EmployeeDeleteB {...base} state={{kind: 'idle'} as ComponentProps<typeof EmployeeDeleteB>['state']} />);
    for (const word of ['Eliminar cuenta', 'Tu acceso a NEVORA, no tu trabajo', 'Qué eliminamos', 'Tu acceso termina enseguida', 'Se elimina en un plazo de 30 días', 'Qué guarda tu patrono', 'Qué se puede guardar']) expect(form).toContain(word);
    const receipt = es(<EmployeeDeleteB {...base} state={{kind: 'received', reference: 'DEL-1', confirmedAt: '2030-01-01 10:00:00+00'} as ComponentProps<typeof EmployeeDeleteB>['state']} />);
    for (const word of ['Eliminación solicitada', 'Tu solicitud', 'Recibida', 'Recibimos tu solicitud de eliminación', 'Referencia', 'Copiar referencia', 'Qué pasa ahora', 'Listo']) expect(receipt).toContain(word);
    absent(receipt, ['What happens next', 'Copy reference', 'Received ']);
  });
  it('Availability', () => {
    expect(availabilitySubB(null, undefined, 'es')).toBe('Tu semana habitual, para preparar tu horario');expect(availabilitySubB('w', '7–13 dic', 'es')).toBe('Para la semana del 7–13 dic');
    const plain = es(<AvailabilityB lang="es" sub="x" change="/app/availability/week"><AvailabilityStatusB lang="es" message="x" /></AvailabilityB>);
    for (const word of ['Disponibilidad', 'Cambiar una semana', 'Horas acordadas', 'Horario']) expect(plain).toContain(word);
    absent(plain, ['Change one week', 'Agreed times']);
  });
  it('Notifications, Updates, an update and Write an update', () => {
    const notifications = es(<EmployeeNotificationsB list={{items: [{id: 'n1', label: 'Schedule update', eventType: 'TIME_OFF_APPROVED', at: '2026-11-05T18:10:00Z', href: '/app/requests', reviewState: 'unread', actionState: 'none'}],
      partial: false, tab: 'all', onTab: noop, timeZone: 'America/Puerto_Rico', onOpen: noop, opening: null, more: false, now: new Date('2026-11-05T19:42:00Z')}} settingsHref="/app/profile/device-alerts" />);
    for (const word of ['Notificaciones', 'Todas', 'Sin leer', 'Hoy', 'Días libres aprobados', 'Ajustes', 'p. m.']) expect(notifications).toContain(word);
    absent(notifications, ['Today', 'Time off approved', ' PM']);
    const update = {state: 'ready', id: 'u1', revisionId: 'r1', contentHash: 'a'.repeat(64), title: 'Horario de feriado', body: 'Texto ficticio.', type: 'OPERATIONAL_UPDATE', publishedAt: '2026-11-04T15:00:00Z', editedAt: null,
      acknowledgement: 'REQUIRED', ownAcknowledgedAt: null, ownReadAt: null, authority: 'fictional', observedAt: '2026-11-05T19:42:00Z', validForMs: 45000, timeZone: 'America/Puerto_Rico', expiresAt: null, authorContext: 'Gerencia', canWithdraw: true} as ReadyUpdate;
    const list: UpdatesBList = {items: [update], partial: false, search: '', filter: 'all', timeZone: 'America/Puerto_Rico', onSearch: noop, onFilter: noop, onOpen: noop, more: false, busy: false, onConfirm: noop, onCompose: noop};
    const updates = es(<EmployeeUpdatesB list={list} />);
    for (const word of ['Avisos', 'Escribir un aviso', 'Por confirmar', 'Requiere acción', 'Abrir', 'Confirmar', 'Buscar en esta página']) expect(updates).toContain(word);
    absent(updates, ['To confirm', 'Write an update', 'Action needed']);
    const detail = es(<EmployeeUpdateB back={{href: '/app/updates', label: 'Avisos'}} item={update} busy={false} onAction={noop} withdraw={false} onWithdraw={noop} />);
    for (const word of ['Aviso del equipo', 'Tu estado de lectura', 'Confirma que lo leíste. Abrirlo no cuenta.', 'Confirmar que lo leí', 'Retirar aviso']) expect(detail).toContain(word);
    absent(detail, ['Your reading status', 'Withdraw update', 'Team update']);
    expect(es(<EmployeeComposeB />)).toContain('Un mensaje para el equipo de hoy');
  });
});
