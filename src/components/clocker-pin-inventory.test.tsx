// Clocker PINs (Phase 6): who has a PIN and who does not, people without one first, one action per row.
import {createElement, type ComponentProps} from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {describe, expect, it, rs} from '@rstest/core';
rs.mock('next/link', () => ({default: ({href, children, ...props}: ComponentProps<'a'>) => createElement('a', {href, ...props}, children)}));
import {ClockerPinInventory, ClockerPinsUnavailable} from './clocker-pin-inventory';
import {englishIn} from './clocker-owner-copy.testkit';
import type {OwnerPinStatus} from '../lib/clocker/pin-operations.server';

const person = (employeeId: string, firstName: string, lastName: string, configured: boolean, active = true): OwnerPinStatus => ({employeeId, firstName, lastName, configured, active, version: configured ? 3 : 0});
const people = [person('QA-2', 'James', 'Ortiz', true), person('QA-1', 'Maria', 'Rivera', false), person('QA-3', 'Ana', 'Colon', false), person('QA 4', 'Luis', 'Torres', false, false)];
const details = {'QA-1': 'Barista · Calle Loíza', 'QA-3': 'Front counter · Condado'};
const render = (statuses: OwnerPinStatus[], lang: 'en' | 'es' = 'en') => renderToStaticMarkup(createElement(ClockerPinInventory, {statuses, details, lang}));

describe('Clocker PINs', () => {
  it('opens on the people without a PIN, in name order, with their position and location', () => {
    const html = render(people);
    expect(html).toContain('2 people need a PIN');
    expect(html.indexOf('Ana Colon')).toBeGreaterThan(-1); expect(html.indexOf('Ana Colon')).toBeLessThan(html.indexOf('Maria Rivera'));
    expect(html).toContain('Barista · Calle Loíza'); expect(html).toContain('Front counter · Condado');
    // People with a PIN and inactive people are on their own tabs.
    expect(html).not.toContain('James Ortiz'); expect(html).not.toContain('Luis Torres');
    // Each tab's name is its visible words: the label and its count.
    expect(html).toMatch(/aria-pressed="true"><span>No PIN<\/span><span class="pin-label-space">.<\/span><span class="c-pins__count">2<\/span>/); expect(html).toMatch(/aria-pressed="false"><span>PIN set<\/span><span class="pin-label-space">.<\/span><span class="c-pins__count">1<\/span>/); expect(html).toContain('<span>Inactive</span>');
    // The tab already names the group, so the card repeats neither the count nor a status line under each name.
    expect(html.match(/2 people need a PIN/g)).toHaveLength(1); expect(html).not.toContain('No PIN yet');
  });
  it('each row has one action whose name starts with its words, then the person: Set PIN is the white button and opens their form', () => {
    const html = render(people);
    expect(html).toMatch(/<a href="\/app\/employees\/QA-1\/clocker-pin\?from=pins" class="c-btn c-btn--secondary c-btn--md c-pins__act">Set PIN<span class="c-sr">, Maria Rivera<\/span><\/a>/);
    expect(html.match(/c-btn--secondary c-btn--md c-pins__act/g)).toHaveLength(2); expect(html).not.toMatch(/class="c-btn c-btn--md/);
    // The row itself is not a second link to the same page.
    expect(html.match(/href="\/app\/employees\/QA-1\/clocker-pin/g)).toHaveLength(1);
  });
  it('when everyone has a PIN it opens on "PIN set", where the action is the quiet Reset PIN', () => {
    const html = render([people[0]]);
    expect(html).toMatch(/aria-pressed="true"><span>PIN set<\/span><span class="pin-label-space">.<\/span><span class="c-pins__count">1<\/span>/);
    expect(html).toMatch(/<a href="\/app\/employees\/QA-2\/clocker-pin\?from=pins" class="c-link c-link--l c-pins__act">Reset PIN<span class="c-sr">, James Ortiz<\/span><\/a>/);
    expect(html).not.toContain('<span>Inactive</span>');
  });
  it('never shows a PIN, a version or an employee ID as text', () => {
    const html = render(people);
    expect(html).not.toMatch(/>\s*\d{4}\s*</); expect(html).not.toContain('version'); expect(html.replace(/href="[^"]*"/g, '')).not.toContain('QA-1');
    expect(html).toContain('Nobody can see a PIN after it is set, including you.');
  });
  it('with nobody yet it says so in a designed empty state', () => {
    const html = render([]);
    expect(html).toContain('data-kind="empty"'); expect(html).toContain('Everyone has a PIN.'); expect(html).toContain('New people show up here until you set theirs.');
  });
  it('a failed read is one state card with one retry', () => {
    const html = renderToStaticMarkup(createElement(ClockerPinsUnavailable));
    expect(html).toContain('Couldn’t load Clocker PINs'); expect(html).toContain('No PIN was changed.'); expect(html).toMatch(/role="alert"/);
    expect(html.match(/href="\/app\/settings\/clocker\/pins"/g)).toHaveLength(1);
  });
  it('Spanish leaks no English sentence', () => {
    for (const html of [render(people, 'es'), render([people[0]], 'es'), render([], 'es'), renderToStaticMarkup(createElement(ClockerPinsUnavailable, {lang: 'es'}))]) expect(englishIn(html)).toEqual([]);
    expect(render(people, 'es')).toContain('2 personas necesitan un PIN'); expect(render(people, 'es')).toContain('Crear PIN');
  });
  it('preserves a real space between each Spanish filter and its count before the controls wrap', () => {
    const html = render(people, 'es');
    expect(html).toMatch(/<span>Sin PIN<\/span><span class="pin-label-space">\u00a0<\/span><span class="c-pins__count">2<\/span>/);
    // English flag B4 (Nov 26, 2026): English uses the same spacer, so the stacked filter has no blank middle line.
    expect(render(people, 'en')).toMatch(/<span>No PIN<\/span><span class="pin-label-space">\u00a0<\/span><span class="c-pins__count">/);
  });
});
