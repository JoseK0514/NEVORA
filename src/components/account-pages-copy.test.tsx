// Signed-in Spanish (es-rest): the account, Profile route, passkey row and employment date words have a Spanish entry
// for every English one, and the fields and passkey list draw in Spanish when the person reads Spanish.
import { createRef } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { expect, it } from '@rstest/core';
import { PortalLangProvider } from '@/lib/i18n/portal-lang';
import { ACCOUNT_COPY } from './account-copy';
import { PROFILE_COPY } from '@/app/app/profile/profile-copy';
import { PASSKEY_ROW_COPY } from './passkeys/passkeys-copy';
import { PasskeyDesktopView } from './passkeys/passkey-desktop-view';
import { EMPLOYMENT_DATES_COPY } from './employment-date-fields-copy';
import { EmploymentDateFields, TERMINATION_BEFORE_HIRE } from './employment-date-fields';

const keyPaths = (value: unknown, prefix = ''): string[] => !value || typeof value !== 'object' ? [prefix]
  : Object.entries(value as Record<string, unknown>).flatMap(([key, inner]) => keyPaths(inner, prefix ? `${prefix}.${key}` : key)).sort();

it('has a Spanish entry for every English one', () => {
  for (const table of [ACCOUNT_COPY, PROFILE_COPY, PASSKEY_ROW_COPY, EMPLOYMENT_DATES_COPY]) expect(keyPaths(table.es)).toEqual(keyPaths(table.en));
});

it('draws the employment dates in Spanish, and keeps the English rule as it was', () => {
  const es = renderToStaticMarkup(<PortalLangProvider lang="es"><EmploymentDateFields idPrefix="x" /></PortalLangProvider>);
  for (const words of ['Fecha de contratación (opcional)', 'Las horas del bono de Navidad usan esta fecha.', 'Fecha de terminación (opcional)', 'Fecha de nacimiento (opcional)', 'Ingresa una fecha de 1900 o después'])
    expect(es).toContain(words);
  expect(es).not.toContain('Hire date');
  expect(renderToStaticMarkup(<EmploymentDateFields idPrefix="x" />)).toContain('Hire date (optional)');
  expect(TERMINATION_BEFORE_HIRE).toBe('The termination date can’t be before the hire date');
});

it('lists passkeys in Spanish with Spanish dates', () => {
  const html = renderToStaticMarkup(<PasskeyDesktopView lang="es" load="ready" passkeys={[{ id: 'p', name: 'iPhone', createdAt: '2026-11-14T15:00:00Z', lastUsedAt: null }]} busy={null} notice={null} confirm={null}
    supported phone={false} dialog={createRef()} addButton={createRef()} onRefresh={() => {}} onAdd={() => {}} onReview={() => {}} onRemove={() => {}} onKeep={() => {}} />);
  for (const words of ['Face ID y llaves de acceso', 'Agregada el 14 nov 2026', 'Sin usar todavía']) expect(html).toContain(words);
  expect(html).not.toContain('Not used yet');
});
