import {createElement, type ComponentProps, type ReactNode} from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {expect, it, rs} from '@rstest/core';
import type {Employee, Location} from '@/lib/domain';

/* Signed-in Spanish (Nov 23, 2026): the Team directory, the edit and status sheets and the Profile work details render
 * in Spanish for a person who reads Spanish. Fictional data. */
rs.mock('./manager-today', () => ({useToday: () => ({snapshot: {state: 'ready', observedAt: '2026-11-22T15:00:00Z', timeZone: 'America/Puerto_Rico', shifts: []}})}));
rs.mock('next/navigation', () => ({useRouter: () => ({push: rs.fn(), replace: rs.fn()}), usePathname: () => '/app/employees', useSearchParams: () => new URLSearchParams()}));
rs.mock('./clean/use-clock-monitor', () => ({useClockMonitor: () => ({monitor: {state: 'ready', employees: []}})}));
rs.mock('next/link', () => ({default: ({children, ...props}: ComponentProps<'a'>) => createElement('a', props, children)}));

import {PortalLangProvider} from '@/lib/i18n/portal-lang';
import {EmployeeDirectory} from './employee-directory';
import {EmployeeCoreProfileForm, EmployeeStatusForm} from './employee-core-profile-form';

const es = (node: ReactNode) => renderToStaticMarkup(<PortalLangProvider lang="es">{node}</PortalLangProvider>);
const text = (markup: string) => markup.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ');
const place: Location = {id: 'loc-1', workspaceId: 'w', clockerKey: 'k', name: 'Lugar Ficticio', shortName: 'Lugar', active: true};
const person = (index: number, active = true): Employee => ({id: `p${index}`, firstName: 'Persona', lastName: String.fromCharCode(65 + index), phone: '', role: index === 0 ? 'MANAGER' : 'EMPLOYEE',
  primaryLocationId: 'loc-1', eligibleLocationIds: ['loc-1'], positionIds: [], active});
const team = [...Array.from({length: 10}, (_, index) => person(index)), person(11, false)];

it('Team directory: Spanish title, count, tools and search with the Spanish company words', () => {
  const html = es(<EmployeeDirectory lang="es" employees={team} visibleEmployees={team} locations={[place]} canImport filters={{query: '', status: 'all', role: '', location: ''}}/>), words = text(html);
  // The phone band and its filters are owner-b/team-b.tsx (another area); this checks the parts this file says.
  expect(html).toContain('placeholder="Buscar personas"');
  for (const phrase of ['Equipo', '10 empleados', 'Añadir empleado', 'Buscar empleados', 'Aplicar búsqueda', 'Horas esta semana', 'Importar una lista de personal', 'Ayudar a alguien a iniciar sesión', 'Personas inactivas', '1 ya no está activa', 'Gerente · Lugar', 'Ver todos'])
    expect(words).toContain(phrase);
  for (const phrase of ['Hours this week', 'Add employee', 'Inactive people', 'Help someone sign in', 'Scheduled hours']) expect(words).not.toContain(phrase);
  // English stays as it was without a language.
  const en = text(renderToStaticMarkup(<EmployeeDirectory employees={team} visibleEmployees={team} locations={[place]} filters={{query: '', status: 'all', role: '', location: ''}}/>));
  expect(en).toContain('Hours this week');expect(en).toContain('10 employees');expect(html).toContain('aria-label="Herramientas del equipo"');
});

it('Team directory: a search with no match says so in Spanish', () => {
  const words = text(es(<EmployeeDirectory lang="es" employees={team} visibleEmployees={[]} locations={[place]} filters={{query: 'Zoe', status: 'all', role: '', location: ''}}/>));
  expect(words).toContain('Ningún resultado de empleados para “Zoe”.');expect(words).toContain('Borrar búsqueda');
});

const employee = {id: 'worker', firstName: 'Sam', lastName: 'Rivera', phone: '787-555-0101', email: 'sam@example.invalid', role: 'EMPLOYEE' as const, primaryLocationId: 'old',
  eligibleLocationIds: ['old'], positionIds: [], active: true, updatedAt: '2026-10-05 12:00:00+00'};
const locations = [{id: 'active', workspaceId: 'w', clockerKey: 'active', name: 'Oficina Activa', shortName: 'Activa', active: true}, {id: 'old', workspaceId: 'w', clockerKey: 'old', name: 'Oficina Vieja', shortName: 'Vieja', active: false}];

it('Edit employee and Deactivate: Spanish labels, roles and confirmation', () => {
  const html = es(<EmployeeCoreProfileForm employee={employee} locations={locations} actorId="OWNER1" actorRole="OWNER" action={rs.fn()}/>);
  for (const phrase of ['Editar empleado', 'Cancelar', 'Nombre', 'Apellido', 'Celular', 'Correo (opcional)', 'Rol', 'Localidad', 'Dueño', 'Gerente', 'Líder', 'Elige una localidad activa antes de reactivar a este empleado.'])
    expect(html).toContain(phrase);
  for (const phrase of ['Edit employee', 'First name', 'Mobile phone', '>Owner<', 'Choose an active location']) expect(html).not.toContain(phrase);
  const status = text(es(<EmployeeStatusForm employee={employee} locations={locations} actorId="OWNER1" actorRole="OWNER" action={rs.fn()}/>));
  expect(status).toContain('Desactivar a Sam');expect(status).toContain('Su sesión se cierra de inmediato.');expect(status).not.toContain('Deactivate');
  const back = text(es(<EmployeeStatusForm employee={{...employee, active: false}} locations={locations} actorId="OWNER1" actorRole="MANAGER" action={rs.fn()}/>));
  expect(back).toContain('Reactivar a Sam');
});
