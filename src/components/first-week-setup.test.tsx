// SCRUM-218: first-week setup on Owner Home: the server's progress only, in English and Spanish, and every state.
import { createElement, type ComponentProps } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, rs } from '@rstest/core';
rs.mock("next/link", () => ({ default: ({ href, children, prefetch: _prefetch, ...props }: ComponentProps<"a"> & { prefetch?: boolean }) => createElement("a", { href, ...props }, children) }));
import { FirstWeekSetupCard, parseFirstWeek } from "./first-week-setup";
import { projectFirstWeek } from "@/lib/activation/first-week";

const facts = (done: string[]) => projectFirstWeek({ hasActiveLocation: true, ...Object.fromEntries(['ROSTER', 'LOCATION_AND_RULES', 'FIRST_SCHEDULE_PUBLISHED', 'TABLET_SETUP', 'FIRST_TIMECARD_REVIEW'].map(id => [id, done.includes(id)])) });

describe('parseFirstWeek', () => {
  it('accepts the server response and rejects anything partial', () => {
    expect(parseFirstWeek(facts(['ROSTER']))?.completedCount).toBe(1);
    expect(parseFirstWeek({ ...facts([]), completedCount: 2 })).toBeNull();
    expect(parseFirstWeek({ ...facts([]), steps: facts([]).steps.slice(1) })).toBeNull();
    expect(parseFirstWeek({ ...facts([]), steps: facts([]).steps.map(step => ({ ...step, href: 'https://example.test' })) })).toBeNull();
    expect(parseFirstWeek({ state: 'unavailable' })).toBeNull();
  });
});

describe('FirstWeekSetupCard', () => {
  it('shows complete and pending steps, each linked to its workflow, with the count', () => {
    const html = renderToStaticMarkup(<FirstWeekSetupCard initial={{ state: 'ready', progress: facts(['ROSTER', 'TABLET_SETUP']) }} />);
    expect(html).toContain('First-week setup');
    expect(html).toContain('2 of 5 complete');
    expect(html).toContain('href="/app/employees"');
    expect(html).toContain('href="/app/schedule/settings#coverage-staffing"');
    expect(html).toContain('href="/app/settings/clocker"');
    expect(html).toContain('Next step');
    expect(html).toContain('aria-valuenow="2"');
    expect(html.match(/Complete</g)?.length).toBe(2);
  });
  it('speaks Spanish with the plural count', () => {
    expect(renderToStaticMarkup(<FirstWeekSetupCard lang="es" initial={{ state: 'ready', progress: facts(['ROSTER']) }} />)).toContain('1 de 5 pasos completado');
    const html = renderToStaticMarkup(<FirstWeekSetupCard lang="es" initial={{ state: 'ready', progress: facts(['ROSTER', 'TABLET_SETUP']) }} />);
    expect(html).toContain('2 de 5 pasos completados');
    expect(html).toContain('Configuración de la primera semana');
    expect(html).toContain('Configura localidades y reglas de personal');
    expect(html).toContain('Próximo paso');
  });
  it('says temporarily unavailable with Try again, never nothing to do', () => {
    const html = renderToStaticMarkup(<FirstWeekSetupCard initial={{ state: 'unavailable' }} />);
    expect(html).toContain('Setup progress is unavailable right now');
    expect(html).toContain('Try again');
  });
  it('has a loading shape, a signed-out state, and leaves Home once setup is complete', () => {
    expect(renderToStaticMarkup(<FirstWeekSetupCard initial={{ state: 'loading' }} />)).toContain('aria-busy="true"');
    expect(renderToStaticMarkup(<FirstWeekSetupCard initial={{ state: 'signed_out' }} />)).toContain('href="/login"');
    expect(renderToStaticMarkup(<FirstWeekSetupCard initial={{ state: 'ready', progress: facts(['ROSTER', 'LOCATION_AND_RULES', 'FIRST_SCHEDULE_PUBLISHED', 'TABLET_SETUP', 'FIRST_TIMECARD_REVIEW']) }} />)).toBe('');
    expect(renderToStaticMarkup(<FirstWeekSetupCard initial={{ state: 'hidden' }} />)).toBe('');
  });
});
