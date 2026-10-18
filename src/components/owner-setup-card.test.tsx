import {expect, it, vi} from 'vitest';
import {createElement, type ComponentProps} from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
vi.mock('next/link', () => ({default: ({children, ...props}: ComponentProps<'a'>) => createElement('a', props, children)}));
import {ActionCenterSurface} from './manager-action-center';
import {OwnerSetupCard, hoursReason} from './owner-setup-card';
import {PresentationProvider} from './presentation-context';
import {setupSteps, withoutSetupItems} from '../lib/action-center/setup';
import {WORD_PRESETS} from '../lib/workspace-presentation/words';
import type {ActionCenter, ActionItem} from '../lib/action-center/project';

const base = {category: 'scheduling', priority: 'MISSING_INPUT', detail: 'Fictional detail', href: '/app/schedule/settings'} as const;
const coverage: ActionItem = {...base, id: 'SETUP:COVERAGE_RULES', type: 'COVERAGE_RULES_MISSING', title: 'Coverage periods not fully configured'};
const target = (n: number): ActionItem => ({...base, id: `HOURS:E-${n}`, type: 'TARGET_MISSING', title: 'Weekly hour target missing', employeeId: `E-${n}`});
const deadline: ActionItem = {...base, id: 'SETUP:DEADLINE', type: 'DEADLINE_MISSING', title: 'Availability deadline not set', href: '/app/schedule?week=2026-10-12'};
const request: ActionItem = {id: 'TIME_OFF:r1', type: 'TIME_OFF', category: 'requests', priority: 'REVIEW', title: 'Time off for Avery', detail: 'Two days requested', href: '/app/requests?tab=pending&requestId=r1'};
function snapshot(items: ActionItem[]): Extract<ActionCenter, {state: 'ready'}> {
  const counts = {total: items.length, scheduling: 0, requests: 0, timekeeping: 0};
  for (const item of items) counts[item.category]++;
  return {state: 'ready', observedAt: '2026-10-13T20:49:10Z', validForMs: 45000, weekStart: '2026-10-12', counts, limitedAttendance: false, items};
}

it('derives the two setup steps from the existing checks only', () => {
  expect(setupSteps([coverage, target(1), target(2), deadline, request])).toEqual({coverageOpen: true, missingTargets: 2});
  expect(setupSteps([deadline, request])).toEqual({coverageOpen: false, missingTargets: 0});
});

it('every Tasks count is computed from the filtered list; deadline and availability stay', () => {
  const {snapshot: filtered, removed} = withoutSetupItems(snapshot([coverage, target(1), target(2), deadline, request]));
  expect(removed).toBe(3);
  expect(filtered).toMatchObject({counts: {total: 2, scheduling: 1, requests: 1, timekeeping: 0}});
  const html = renderToStaticMarkup(<ActionCenterSurface snapshot={filtered} connection="ready" setupListed={removed}/>);
  expect(html).toContain('aria-label="Total tasks">2');
  expect(html).toContain('Review 2 tasks');
  expect(html).toContain('Availability deadline not set');
  expect(html).toContain('Setup needed');
  expect(html).not.toContain('Coverage periods not fully configured');
  expect(html).not.toContain('Weekly hour target missing');
  expect(html).toContain('Scheduling: 1 task');
  expect(html).toContain('Open inbox');
});

it('only setup items: "You’re all caught up" with "Setup steps are listed above.", never the empty-source line', () => {
  const {snapshot: filtered, removed} = withoutSetupItems(snapshot([coverage, target(1)]));
  const html = renderToStaticMarkup(<ActionCenterSurface snapshot={filtered} connection="ready" setupListed={removed}/>);
  expect(html).toContain('You’re all caught up');
  expect(html).toContain('Setup steps are listed above.');
  expect(html).not.toContain('No tasks found in the checked sources');
  // The Inbox still holds the setup items.
  expect(html).toContain('Open inbox');
  const empty = renderToStaticMarkup(<ActionCenterSurface snapshot={snapshot([])} connection="ready"/>);
  expect(empty).toContain('No tasks found in the checked sources.');
  expect(empty).not.toContain('Setup steps are listed above.');
});

it('nothing is filtered or counted differently without the card', () => {
  const ready = snapshot([coverage, target(1), request]);
  expect(withoutSetupItems(ready)).toEqual({snapshot: withoutSetupItems(ready).snapshot, removed: 2});
  expect(withoutSetupItems(snapshot([request]))).toEqual({snapshot: snapshot([request]), removed: 0});
  expect(withoutSetupItems(null)).toEqual({snapshot: null, removed: 0});
});

it('the card: two open steps, exact copy, links to the sections, progress carried by text', () => {
  const html = renderToStaticMarkup(<OwnerSetupCard steps={{coverageOpen: true, missingTargets: 7}} locationCount={2}/>);
  expect(html).toContain('Finish setting up');
  expect(html).toMatch(/<span>0<\/span> of 2 done/);
  expect(html).toContain('href="/app/schedule/settings#coverage-staffing"');
  expect(html).toContain('href="/app/schedule/settings#target-hours"');
  expect(html).toContain('Each location needs a minimum staff count, a lead rule and a coverage period.');
  expect(html).toContain('7 employees have no weekly hour target.');
  expect(html).toContain('Set coverage <span class="owner-setup-nowrap">periods');
  expect(html).toContain('Set weekly hour <span class="owner-setup-nowrap">targets');
  expect(html).toContain('aria-hidden="true"><span style="width:0%"></span>');
  expect(html).not.toMatch(/missing|don.t have one/i);
  expect(html.indexOf('coverage-staffing')).toBeLessThan(html.indexOf('target-hours'));
});

it('a done step shows a check and "Done" with no link; the count and bar follow', () => {
  const html = renderToStaticMarkup(<OwnerSetupCard steps={{coverageOpen: false, missingTargets: 1}} locationCount={2}/>);
  expect(html).toMatch(/<span>1<\/span> of 2 done/);
  expect(html).toContain('<strong>Coverage periods</strong><span class="owner-setup-done">Done</span>');
  expect(html).not.toContain('coverage-staffing');
  expect(html).toContain('1 employee has no weekly hour target.');
  expect(html).toContain('width:50%');
});

it('no gaps: no card; zero locations: "Add a location" to the locations page', () => {
  expect(renderToStaticMarkup(<OwnerSetupCard steps={{coverageOpen: false, missingTargets: 0}} locationCount={2}/>)).toBe('');
  expect(renderToStaticMarkup(<OwnerSetupCard steps={null} locationCount={2}/>)).toBe('');
  const html = renderToStaticMarkup(<OwnerSetupCard steps={{coverageOpen: true, missingTargets: 0}} locationCount={0}/>);
  expect(html).toContain('href="/app/settings/locations"');
  expect(html).toContain('Add a <span class="owner-setup-nowrap">location');
  expect(html).toContain('Then set its staffing and coverage periods.');
  expect(html).not.toContain('#coverage-staffing');
});

it('uses the company vocabulary (B2) as two whole strings', () => {
  const retail = WORD_PRESETS.find(preset => preset.id === 'retail')!.en;
  expect(hoursReason(3, retail)).toBe('3 associates have no weekly hour target.');
  expect(hoursReason(1, retail)).toBe('1 associate has no weekly hour target.');
  const html = renderToStaticMarkup(<PresentationProvider words={retail}><OwnerSetupCard steps={{coverageOpen: false, missingTargets: 2}} locationCount={1}/></PresentationProvider>);
  expect(html).toContain('2 associates have no weekly hour target.');
});
