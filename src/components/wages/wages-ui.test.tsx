// SCRUM-214: the Owner's pay rate page and the labor cost card, in English and Spanish. Fictional people and rates.
import { createElement, type ComponentProps } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, rs } from '@rstest/core';
rs.mock("next/link", () => ({ default: ({ href, children, prefetch: _prefetch, ...props }: ComponentProps<"a"> & { prefetch?: boolean }) => createElement("a", { href, ...props }, children) }));
import { WagesScreen, type WagesScreenProps } from "./wages-screen";
import { LaborCostCard } from "./labor-cost-card";
import type { WageSave } from "@/lib/compensation/compensation-client";

const base: WagesScreenProps = {
  employeeId: 'emp-ana', name: 'Ana Torres', firstName: 'Ana', backHref: '/app/employees/emp-ana', timeZone: 'America/Puerto_Rico', today: '2026-11-19',
  locations: [{ id: 'loiza', name: 'Calle Loíza', active: true }, { id: 'condado', name: 'Condado', active: true }, { id: 'plaza', name: 'Plaza', active: true }],
  defaultLocationIds: ['loiza', 'condado', 'plaza'], actors: { 'own-jose': 'Jose Natal' }, actorId: 'own-carmen', now: new Date('2026-11-19T15:00:00Z'),
};
const page = { employeeId: 'emp-ana', nextBeforeRevision: 3, history: [
  { revision: 4, actorId: 'own-jose', createdAt: '2026-11-18T14:00:00Z', reason: 'Raise after review', wages: [
    { id: 'a', effectiveFrom: '2026-10-05T04:00:00Z', effectiveTo: '2026-12-01T04:00:00Z', locationIds: ['loiza'], hourlyRateMinor: '1825' },
    { id: 'b', effectiveFrom: '2026-12-01T04:00:00Z', effectiveTo: null, locationIds: ['loiza'], hourlyRateMinor: '1900' },
    { id: 'c', effectiveFrom: '2026-10-05T04:00:00Z', effectiveTo: null, locationIds: ['condado'], hourlyRateMinor: '0' }] },
] };
const ready = { state: 'ready' as const, page };

describe('WagesScreen', () => {
  it('shows each location: a rate with its next change, an explicit zero and a missing rate', () => {
    const html = renderToStaticMarkup(<WagesScreen {...base} initial={{ load: ready }} />);
    expect(html).toContain('Pay rate');
    expect(html).toContain('$18.25/h');
    expect(html).toContain('From Dec 1, 2026: $19.00/h');
    expect(html).toContain('$0.00/h');
    expect(html).toContain('Saved as zero');
    expect(html).toContain('No rate');
    expect(html).toContain('Scheduled time here isn’t costed');
    expect(html).toContain('Nov 18, 2026 · Jose Natal');
    expect(html).toContain('Raise after review');
    expect(html).toContain('Calle Loíza: $18.25/h, then $19.00/h from Dec 1, 2026 · Condado: $0.00/h');
    expect(html).toContain('Show earlier changes');
    expect(html).toContain('Change pay rate');
  });
  it('in Spanish', () => {
    const html = renderToStaticMarkup(<WagesScreen {...base} lang="es" initial={{ load: ready }} />);
    expect(html).toContain('Tarifa por hora');
    expect(html).toContain('Desde el 1 dic 2026: $19.00/h');
    expect(html).toContain('Guardada en cero');
    expect(html).toContain('Sin tarifa');
    expect(html).toContain('lang="es"');
  });
  it('edits: mode, locations, start day, rate with "$" and "/h", and reason', () => {
    const html = renderToStaticMarkup(<WagesScreen {...base} initial={{ load: ready, step: 'edit', draft: { mode: 'set', locationIds: ['loiza'], date: '2026-12-01', rate: '19', reason: '' } }} />);
    for (const text of ['Set a rate', 'Remove the rate', 'Starts on', 'Hourly rate', 'inputMode="decimal"', 'Reason', 'Review', 'Puerto Rico time']) expect(html, text).toMatch(new RegExp(text.replace(/[$()]/g, '\\$&'), 'i'));
  });
  it('reviews before and after per location, and says payroll asks to confirm', () => {
    const html = renderToStaticMarkup(<WagesScreen {...base} initial={{ load: ready, step: 'review', draft: { mode: 'set', locationIds: ['loiza', 'plaza'], date: '2026-12-15', rate: '20.50', reason: 'Year-end raise' } }} />);
    expect(html).toContain('Starts Dec 15, 2026');
    expect(html).toContain('was $19.00/h');
    expect(html).toContain('was No rate');
    expect(html).toContain('$20.50/h');
    expect(html).toContain('Payroll will ask you to confirm');
    expect(html).toContain('Save rate');
  });
  it('an unconfirmed save is kept and checked again, never discarded', () => {
    const command: WageSave = { action: 'SAVE_WAGES', employeeId: 'emp-ana', expectedRevision: 4, operationId: '00000000-0000-4000-8000-000000000001', reason: 'x', wages: [] };
    const html = renderToStaticMarkup(<WagesScreen {...base} initial={{ load: ready, step: 'review', custody: { command, status: 'unknown' }, draft: { mode: 'set', locationIds: ['loiza'], date: '2026-12-15', rate: '20', reason: 'x' } }} />);
    expect(html).toContain('Your change isn’t confirmed yet');
    expect(html).toContain('Check again');
  });
  it('conflict, refused and failed loads each say what to do', () => {
    expect(renderToStaticMarkup(<WagesScreen {...base} initial={{ load: ready, issue: 'conflict' }} />)).toContain('Load latest rates');
    expect(renderToStaticMarkup(<WagesScreen {...base} initial={{ load: { state: 'denied' } }} />)).toContain('Only Owners see pay rates');
    expect(renderToStaticMarkup(<WagesScreen {...base} initial={{ load: { state: 'failed' } }} />)).toContain('Try again');
    expect(renderToStaticMarkup(<WagesScreen {...base} initial={{ load: { state: 'loading' } }} />)).toContain('aria-busy="true"');
    expect(renderToStaticMarkup(<WagesScreen {...base} initial={{ load: { state: 'ready', page: { employeeId: 'emp-ana', nextBeforeRevision: null, history: [] } } }} />)).toContain('Ana Torres has no pay rate yet');
  });
});

describe('LaborCostCard', () => {
  it('opens with its loading shape and the basis is named once loaded', () => {
    const html = renderToStaticMarkup(<LaborCostCard preferenceScope="workspace:owner" weekStart="2026-11-16" locations={[{ id: 'loiza', name: 'Calle Loíza' }]} />);
    expect(html).toContain('Base scheduled pay');
    expect(html).toContain('Estimate');
    expect(html).toContain('aria-busy="true"');
    expect(renderToStaticMarkup(<LaborCostCard preferenceScope="workspace:owner" lang="es" weekStart="2026-11-16" locations={[{ id: 'loiza', name: 'Calle Loíza' }]} />)).toContain('Pago base programado');
  });
});
