// Signed-in Spanish (es-rest): Time off and the Requests hub carry every word in both languages.
import {createElement, type ComponentProps} from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {expect, it, rs} from '@rstest/core';
rs.mock('next/link', () => ({default: ({children, prefetch: _prefetch, ...props}: ComponentProps<'a'> & {prefetch?: boolean}) => createElement('a', props, children)}));
import {REQUESTS_COPY} from './requests-copy';
import {RequestHub} from './hub/request-hub';

const keys = (value: object): string[] => Object.entries(value).flatMap(([key, inner]) =>
  inner && typeof inner === 'object' ? keys(inner).map(child => `${key}.${child}`) : [key]).sort();
const text = (html: string) => html.replace(/<[^>]+>/g, ' ').replace(/[\s ]+/g, ' ').trim();

it('has a Spanish entry for every English one', () => {
  expect(keys(REQUESTS_COPY.es)).toEqual(keys(REQUESTS_COPY.en));
  for (const value of Object.values(REQUESTS_COPY.es)) expect(String(value)).not.toContain('!');
});

it('draws the Requests hub in Puerto Rico Spanish, and English by default', () => {
  const modules = {timeOff: true, marketplace: true, payStatements: true} as never;
  const request = {id: 'r1', status: 'PENDING', startDate: '2026-12-07', endDate: '2026-12-08', createdAt: '2026-11-20T10:00:00Z'};
  const es = text(renderToStaticMarkup(<RequestHub modules={modules} requests={[request]} lang="es" />));
  for (const words of ['Días libres', 'Solicitudes de turnos', 'Cambios, cubrir turnos y no puedo trabajar', 'Empieza una desde un turno de tu horario']) expect(es).toContain(words);
  for (const english of ['Shift requests', 'Swaps, cover', 'Start one from']) expect(es).not.toContain(english);
  const failed = text(renderToStaticMarkup(<RequestHub modules={modules} requests={null} lang="es" />));
  expect(failed).toContain('No pudimos verificar tus solicitudes de días libres.');
  expect(failed).toContain('Abrir días libres');
  const en = text(renderToStaticMarkup(<RequestHub modules={modules} requests={[request]} />));
  expect(en).toContain('Swaps, cover and can’t work');
});
