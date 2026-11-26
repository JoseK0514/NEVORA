import {renderToStaticMarkup} from 'react-dom/server';
import {expect, it, rs} from '@rstest/core';
import {PortalLangProvider} from '@/lib/i18n/portal-lang';
import {TEAM_COPY} from './team-copy';
import {notClockedInText} from './team-live';
import {availabilityCopy, esBusinessDateTime} from './availability-copy';
import {ASSISTED_RECOVERY_COPY} from './assisted-recovery-phase3-copy';
import {EMPLOYMENT_DATES_COPY} from './employment-date-fields-phase3-copy';
import {AssistedRecovery} from './assisted-recovery';
import {clockerOwnerCopy} from './clocker-owner-copy';
import {AvailabilityB} from './employee-b/availability-b';
import {AvailabilityDayRows} from './availability-corp';

const keys = (value: object): string[] => Object.entries(value).flatMap(([key, inner]) =>
  inner && typeof inner === 'object' && !Array.isArray(inner) ? keys(inner).map(child => `${key}.${child}`) : [key]).sort();

it('keeps feature copy keys complete in both languages', () => {
  for (const table of [TEAM_COPY, ASSISTED_RECOVERY_COPY, EMPLOYMENT_DATES_COPY, {en: availabilityCopy('en'), es: availabilityCopy('es')}])
    expect(keys(table.es)).toEqual(keys(table.en));
});
it('preserves English attendance and uses the approved Spanish row label', () => {
  expect(TEAM_COPY.es.notClockedInFilter).toBe('Sin marcar');
  expect(notClockedInText(42)).toBe('Not clocked in · 42 min');
  expect(notClockedInText(75, 'es')).toBe('Sin marcar entrada · 1 h 15 min');
});
it('renders approved photo ID wording without changing the submitted verification statement', () => {
  const html = renderToStaticMarkup(<PortalLangProvider lang="es"><AssistedRecovery hydrated busy={false} message="" issued={null} onSubmit={rs.fn()} onStartAgain={rs.fn()}/></PortalLangProvider>);
  expect(html).toContain('Ayudar a alguien a iniciar sesión');
  expect(html).toContain('>ID con foto</option>');
  expect(html).toContain('value="Verified in person with a photo ID."');
  expect(html).toContain('name="attestation"');
  expect(html).not.toContain('>In person, photo ID</option>');
});
it('keeps the approved tú PIN guidance and English labels', () => {
  expect(clockerOwnerCopy.es.pinIntroSet).toContain('Elige 4 dígitos.');
  expect(clockerOwnerCopy.es.pinConfirm).toBe('Escríbelo otra vez');
  expect(clockerOwnerCopy.es.pinDoneSet('Persona')).toBe('PIN creado para Persona. Díselo en persona.');
  expect(clockerOwnerCopy.en.pinConfirm).toBe('Type it again');
});
it('renders Spanish availability names and includes the visible day in its accessible name', () => {
  const html = renderToStaticMarkup(<PortalLangProvider lang="es"><AvailabilityDayRows days={[{key:1,name:'lunes',hours:null,label:'lunes, no disponible',onOpen:rs.fn()}]}/></PortalLangProvider>);
  expect(html).toContain('lunes');
  expect(html).toContain('aria-label="lunes, no disponible"');
  expect(html).toContain('No disponible');
});

it("renders the actual Spanish Availability band and agreement link", () => {
 const html = renderToStaticMarkup(<AvailabilityB lang="es" sub="Tu semana habitual" change="/app/availability?week=2026-12-07"/>);
 for (const label of ["Disponibilidad", "Horario", "Cambiar una semana", "Horarios acordados"]) expect(html).toContain(label);
 expect(html).not.toContain(">Agreed times<");
});

it("keeps only the Spanish time abbreviation together and approved lowercase days", () => {
 expect(availabilityCopy("es").time("07:00")).toBe("7:00 a.\u00a0m.");
 expect(availabilityCopy("es").days[0]).toEqual([1,"lunes"]);
 const instant=esBusinessDateTime("2026-12-07T11:00:00Z","America/Puerto_Rico");
 expect(instant).toContain("7:00 a.\u00a0m.");
 expect(instant).not.toContain("7:00\u00a0a.");
 expect(availabilityCopy("en").time("07:00")).toBe("7:00 AM");
});
