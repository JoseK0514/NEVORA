// The Owner's "Clock in at" sheet (Clocker UI step 1, Option A): the copy, the action's field contract, the rules, and
// every state drawn. The project has no DOM environment, so the view renders from plain values and the rules are pure.
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, rs } from '@rstest/core';

rs.mock('@/app/app/employees/[employeeId]/clocker-location-actions', () => ({ saveClockerLocationAccessAction: rs.fn() }));
rs.mock('next/link', () => ({ default: ({ href, children }: { href: string; children: React.ReactNode }) => createElement('a', { href }, children) }));

import { ClockerLocationView, type ClockerLocationViewProps } from './clocker-location-access';
import { CLOCKER_LOCATION_UNCONFIRMED, clockerLocationCopy, clockerLocationServerCopy, clockerLocationServerText } from './clocker-location-access-copy';
import {
  clockerLocationAfter, clockerLocationChanged, clockerLocationFormData, clockerLocationInitialPicks, clockerLocationInvalid,
  clockerLocationSummary, clockerLocationTag, type ClockerLocationBaseline,
} from './clocker-location-access-model';

const places = [{ id: 'loc-1', name: 'Main Office' }, { id: 'loc-2', name: 'West Office' }, { id: 'loc-3', name: 'Old San Juan' }];
const daniel = { work: ['loc-1', 'loc-2'], baseline: { mode: 'ASSIGNED', locationIds: [], updatedAt: '2026-11-24T12:00:00.000001Z' } as ClockerLocationBaseline };
const carmen = { work: ['loc-1', 'loc-2', 'loc-3'], baseline: { mode: 'SELECTED', locationIds: ['loc-2', 'loc-3'], updatedAt: '2026-11-24T12:00:00.000002Z' } as ClockerLocationBaseline };
const STALE = 'This employee changed. Reload their profile before saving.';

describe('copy', () => {
  it('has the same keys in English and Spanish, none empty', () => {
    expect(Object.keys(clockerLocationCopy.es).sort()).toEqual(Object.keys(clockerLocationCopy.en).sort());
    for (const lang of ['en', 'es'] as const) for (const [key, value] of Object.entries(clockerLocationCopy[lang])) expect(value.trim(), `${lang}.${key}`).not.toBe('');
  });
  it('uses tú and the glossary in Spanish, and no explanation or exclamation in either language', () => {
    const es = Object.values(clockerLocationCopy.es).join(' ') + ' ' + Object.values(clockerLocationServerCopy).map(value => value.es).join(' ');
    expect(es).not.toMatch(/\busted\b|\bsu perfil antes de intentarlo\b/i);
    expect(es).toContain('Localidades');expect(es).toContain('Elige');expect(es).toContain('Vuelve a cargar');
    for (const text of [...Object.values(clockerLocationCopy.en), ...Object.values(clockerLocationCopy.es)]) { expect(text).not.toContain('!'); expect(text).not.toMatch(/\bsimply\b/i); }
  });
  it('shows every server sentence in Spanish, and an unknown one as the server wrote it', () => {
    expect(Object.keys(clockerLocationServerCopy)).toContain(CLOCKER_LOCATION_UNCONFIRMED);
    expect(Object.keys(clockerLocationServerCopy)).toContain(STALE);
    expect(clockerLocationServerText(STALE, 'en')).toBe(STALE);
    expect(clockerLocationServerText(STALE, 'es')).toBe('Este empleado cambió. Vuelve a cargar su perfil antes de guardar.');
    expect(clockerLocationServerText('Something new.', 'es')).toBe('Something new.');
  });
});

describe('the action’s fields (saveClockerLocationAccessAction)', () => {
  const fields = (data: FormData) => [...data.entries()].map(([key, value]) => [key, String(value)]);
  it('sends employeeId, mode, expectedUpdatedAt and one locationId per selection for SELECTED', () => {
    expect(fields(clockerLocationFormData('QA-SCAN-B', carmen.baseline, 'SELECTED', ['loc-2', 'loc-3', 'loc-2']))).toEqual([
      ['employeeId', 'QA-SCAN-B'], ['mode', 'SELECTED'], ['expectedUpdatedAt', '2026-11-24T12:00:00.000002Z'], ['locationId', 'loc-2'], ['locationId', 'loc-3']]);
  });
  it('sends no locationId for ASSIGNED or ALL, whatever is ticked', () => {
    for (const mode of ['ASSIGNED', 'ALL'] as const) {
      const data = clockerLocationFormData('QA-SCAN-A', daniel.baseline, mode, ['loc-1', 'loc-2']);
      expect(data.getAll('locationId')).toEqual([]);
      expect([...new Set([...data.keys()])].sort()).toEqual(['employeeId', 'expectedUpdatedAt', 'mode']);
      expect(data.get('expectedUpdatedAt')).toBe(daniel.baseline.updatedAt);
    }
  });
});

describe('rules', () => {
  it('says the row’s answer once', () => {
    expect(clockerLocationSummary('en', daniel.baseline, daniel.work, places)).toBe('Where they work · Main Office, West Office');
    expect(clockerLocationSummary('en', carmen.baseline, carmen.work, places)).toBe('West Office, Old San Juan');
    expect(clockerLocationSummary('en', { mode: 'ALL', locationIds: [] }, daniel.work, places)).toBe('Every location · Includes locations added later');
    expect(clockerLocationSummary('es', daniel.baseline, daniel.work, places)).toBe('Donde trabaja · Main Office, West Office');
  });
  it('tags where they work and their main location', () => {
    expect(clockerLocationTag('en', 'loc-1', carmen.work, 'loc-1')).toBe('Works here · Main');
    expect(clockerLocationTag('en', 'loc-3', daniel.work, 'loc-1')).toBe('');
    expect(clockerLocationTag('es', 'loc-1', carmen.work, 'loc-1')).toBe('Trabaja aquí · Principal');
  });
  it('opens with the saved list, or where they work, and only active locations', () => {
    expect(clockerLocationInitialPicks(carmen.baseline, carmen.work, places)).toEqual(['loc-2', 'loc-3']);
    expect(clockerLocationInitialPicks(daniel.baseline, daniel.work, places)).toEqual(['loc-1', 'loc-2']);
    expect(clockerLocationInitialPicks({ ...carmen.baseline, locationIds: ['loc-2', 'loc-gone'] }, carmen.work, places)).toEqual(['loc-2']);
  });
  it('counts a change only when the answer differs, and refuses an empty list', () => {
    expect(clockerLocationChanged(carmen.baseline, 'SELECTED', ['loc-3', 'loc-2'])).toBe(false);
    expect(clockerLocationChanged(carmen.baseline, 'SELECTED', ['loc-1', 'loc-2', 'loc-3'])).toBe(true);
    expect(clockerLocationChanged(daniel.baseline, 'ASSIGNED', ['loc-3'])).toBe(false);
    expect(clockerLocationChanged(daniel.baseline, 'ALL', [])).toBe(true);
    expect(clockerLocationInvalid('SELECTED', [])).toBe(true);
    expect(clockerLocationInvalid('ALL', [])).toBe(false);
  });
  it('takes the saved answer as the new starting point, and keeps a refusal’s words and whether to reload', () => {
    const saved = clockerLocationAfter({ ok: true, access: { mode: 'ALL', locationIds: [], updatedAt: 'next' } }, daniel.baseline);
    expect(saved).toEqual({ baseline: { mode: 'ALL', locationIds: [], updatedAt: 'next' }, status: { kind: 'saved' } });
    const stale = clockerLocationAfter({ ok: false, error: STALE, refresh: true }, daniel.baseline);
    expect(stale).toEqual({ baseline: daniel.baseline, status: { kind: 'failed', message: STALE, refresh: true } });
    expect(clockerLocationAfter({ ok: false, error: 'Choose a location access mode and valid active locations.', refresh: false }, daniel.baseline).status)
      .toEqual({ kind: 'failed', message: 'Choose a location access mode and valid active locations.', refresh: false });
  });
});

describe('every state, drawn', () => {
  const view = (over: Partial<ClockerLocationViewProps> = {}) => renderToStaticMarkup(createElement(ClockerLocationView, {
    lang: 'en', mode: 'SELECTED', picked: ['loc-2', 'loc-3'], places, work: carmen.work, primaryId: 'loc-1', status: { kind: 'idle' }, changed: false,
    ids: { group: 'g', hint: 'h' }, ...over,
  }));
  const saveButton = (html: string) => html.match(/<button[^>]*clk-save[^>]*>/)?.[0] ?? '';
  it('idle: three inline radios, the locations under "Only these locations" with where they work, Save off', () => {
    const html = view();
    expect(html.match(/type="radio"/g)).toHaveLength(3);
    expect(html.match(/type="checkbox"/g)).toHaveLength(3);
    expect(html.indexOf('Only these locations')).toBeLessThan(html.indexOf('value="loc-1"'));
    expect(html.indexOf('value="loc-3"')).toBeLessThan(html.indexOf('Every location'));
    expect(html).toContain('Works here · Main');
    expect(saveButton(html)).toContain('disabled');
    expect(html).not.toContain('role="alert"');expect(html).not.toContain('role="status"');
    // The list belongs to "Only these locations" only.
    expect(view({ mode: 'ASSIGNED' })).not.toContain('type="checkbox"');
    expect(view({ mode: 'ASSIGNED' })).toContain('Main Office, West Office, Old San Juan');
  });
  it('changed: Save is on', () => { expect(saveButton(view({ changed: true }))).not.toContain('disabled'); });
  it('nothing ticked: one plain line says why, and Save stays off', () => {
    const html = view({ picked: [], changed: true });
    expect(html).toContain('<p id="h" class="clk-hint">Choose at least one location to save.</p>');
    expect(saveButton(html)).toContain('disabled');expect(saveButton(html)).toContain('aria-describedby="h"');
  });
  it('saving: Save keeps its place with the busy label, the choices are off', () => {
    const html = view({ status: { kind: 'saving' }, changed: true });
    expect(saveButton(html)).toContain('aria-busy="true"');expect(saveButton(html)).toContain('disabled');
    expect(html).toContain('Saving…');expect(html).toMatch(/<fieldset[^>]*clk-modes[^>]*disabled/);
  });
  it('saved: a green notice, announced, in the focusable result', () => {
    const html = view({ status: { kind: 'saved' } });
    expect(html).toMatch(/<div tabindex="-1" class="clk-result"><div class="b-callout" data-tone="green" role="status">/);
    expect(html).toContain('Saved');
  });
  it('couldn’t confirm and stale: the server’s words in an amber notice, Reload profile, the sheet locked', () => {
    for (const message of [CLOCKER_LOCATION_UNCONFIRMED, STALE]) {
      const html = view({ status: { kind: 'failed', message, refresh: true }, changed: true });
      expect(html).toContain(`data-tone="amber" role="alert"`);expect(html).toContain(message);
      expect(html).toContain('Reload profile');
      expect(saveButton(html)).toContain('disabled');expect(html).toMatch(/<fieldset[^>]*clk-modes[^>]*disabled/);
    }
  });
  it('a refusal that needs no reload leaves the sheet open', () => {
    const html = view({ status: { kind: 'failed', message: 'Choose a location access mode and valid active locations.', refresh: false }, changed: true });
    expect(html).not.toContain('Reload profile');expect(saveButton(html)).not.toContain('disabled');
  });
  it('Spanish', () => {
    const html = view({ lang: 'es', status: { kind: 'failed', message: STALE, refresh: true } });
    for (const words of ['Donde trabaja', 'Solo estas localidades', 'Todas las localidades', 'Trabaja aquí · Principal', 'Este empleado cambió.', 'Volver a cargar el perfil', 'Guardar']) expect(html).toContain(words);
    expect(html).not.toContain('Works here');
  });
});

describe('the sheet’s look (Jose’s picks: Inline radio and Inline check)', () => {
  it('draws plain 48px rows with no box or ruled line, text in rem tokens', async () => {
    const { readFileSync } = await import('node:fs');
    const css = readFileSync(new URL('./clocker-location-access.css', import.meta.url), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');
    const rule = (selector: string) => css.match(new RegExp(`\\.app-shell\\[data-nv-b\\] ${selector.replace(/[.*+?^${}()|[\]\\>]/g, '\\$&')} \\{([^}]*)\\}`))?.[1] ?? '';
    expect(rule('.clk-choice')).toContain('min-height: 48px');
    expect(css).not.toMatch(/box-shadow|border:\s*(?!0)[^;]*solid|border-(top|bottom):/);
    expect(rule('.clk-choice > input')).toContain('accent-color: var(--b-teal)');
    expect(css).not.toMatch(/font-size:\s*\d+px/);
  });
});
