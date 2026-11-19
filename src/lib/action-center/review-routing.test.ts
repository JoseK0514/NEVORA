import {readFileSync} from 'node:fs';
import {join} from 'node:path';
import {describe, expect, it} from '@rstest/core';
import type {ActionItem} from './project';
import {needsYou} from './needs-you';
import {reviewFacts, type ReviewFacts} from './review-facts';
import {concernsActor, homeTaskTotal, needsYouTotal, paydayReview, reviewRoute, timecardPeriod} from './review-routing';
import type {HomeTaskSummary} from '../employee-home/task-summary';
import fixtures from '../../../docs/handoffs/2026-11-16-backend-phase5-contracts/consumer-state-fixtures.json';

/* Phase 4 (U03). Codex's acceptance case: with the same three closed timecards (two reviewable plus one requiring
 * another reviewer), every surface counts two; routing uses the typed actorMayReview and concernsActor and never an
 * English title; partial or legacy sources never become complete totals or all-clear. */

const card = (id: string, start: string, end: string, extra: Partial<ActionItem> = {}): ActionItem => ({
  id: `TIMECARD:${id}:${start}:${end}`, type: 'TIMECARD', category: 'timekeeping', priority: 'REVIEW', title: 'Period timecard needs review', detail: `${id} · ${start}`,
  href: `/app/timecards?start=${start}&end=${end}#timecard-${id}`, review: reviewFacts(false, false, 'TIMECARD', {startDate: start, endDate: end}), ...extra} as ActionItem);
const own = (id: string, start: string, end: string, extra: Partial<ActionItem> = {}) => card(id, start, end, {review: reviewFacts(true, true, 'TIMECARD', {startDate: start, endDate: end}), ...extra});
const fix = (id: string, review?: ReviewFacts, extra: Partial<ActionItem> = {}): ActionItem => ({
  id: `TIME_CORRECTION:${id}`, type: 'TIME_CORRECTION', category: 'timekeeping', priority: 'REVIEW', title: 'Time correction waiting for review', detail: 'Ana Ruiz · Recorded time correction.',
  href: `/app?view=attendance#correction-${id}`, ...(review ? {review} : {}), ...extra} as ActionItem);

describe('who reviews it, from the typed facts', () => {
  it('routes by actorMayReview and independentReviewRequired, and keeps missing or unavailable facts unknown', () => {
    expect(reviewRoute(card('a', '2026-10-19', '2026-10-25'))).toBe('mine');
    expect(reviewRoute(own('me', '2026-10-19', '2026-10-25'))).toBe('other_reviewer');
    // A delegated requester: not about this person, but independent review is still required.
    expect(reviewRoute(fix('d', reviewFacts(false, true, 'TIME_CORRECTION')))).toBe('other_reviewer');
    expect(concernsActor(fix('d', reviewFacts(false, true, 'TIME_CORRECTION')))).toBe(false);
    expect(concernsActor(own('me', '2026-10-19', '2026-10-25'))).toBe(true);
    // An older payload (no review facts) and facts the server could not establish are never counted as approve work.
    expect(reviewRoute(fix('old'))).toBe('unknown');
    expect(reviewRoute(fix('null', reviewFacts(null, false, 'TIME_CORRECTION')))).toBe('unknown');
    expect(reviewRoute({type: 'TIME_OFF'} as ActionItem)).toBeNull();
  });

  it('never moves an item when its title, detail or language changes', () => {
    const mine = card('a', '2026-10-19', '2026-10-25'), other = own('me', '2026-10-19', '2026-10-25');
    for (const title of ['Your timecard needs another reviewer', 'Your correction needs another reviewer', 'Tu tarjeta necesita otra persona', '']) {
      const renamedMine: ActionItem = {...mine, title, detail: title}, renamedOther: ActionItem = {...other, title: 'Period timecard needs review'};
      expect(reviewRoute(renamedMine)).toBe('mine');
      expect(concernsActor(renamedMine)).toBe(false);
      expect(reviewRoute(renamedOther)).toBe('other_reviewer');
      expect(paydayReview([renamedMine, renamedOther], '2026-10-30').toReview).toBe(1);
    }
  });

  it('reads a timecard’s own period from the typed facts, and from the review link only for an older payload', () => {
    expect(timecardPeriod(card('a', '2026-09-28', '2026-10-04', {href: '/app/timecards?start=2026-10-19&end=2026-10-25'}))).toEqual({startDate: '2026-09-28', endDate: '2026-10-04'});
    expect(timecardPeriod({href: '/app/timecards?start=2026-10-19&end=2026-10-25'} as ActionItem)).toEqual({startDate: '2026-10-19', endDate: '2026-10-25'});
    expect(timecardPeriod({href: '/app/timecards'} as ActionItem)).toBeNull();
    expect(timecardPeriod({href: '/app/other?start=2026-10-19&end=2026-10-25'} as ActionItem)).toBeNull();
  });
});

describe('Payday’s one count', () => {
  const three = [card('a', '2026-10-19', '2026-10-25'), card('b', '2026-10-19', '2026-10-25'), own('me', '2026-10-19', '2026-10-25')];
  it('counts two of three closed timecards when one requires another reviewer, and keeps that one visible', () => {
    const review = paydayReview(three, '2026-10-30', '2026-11-01');
    expect(review).toMatchObject({toReview: 2, otherReviewer: 1, own: 1, unknown: 0, exact: true, openEnd: '2026-11-01'});
    expect(review.periods).toEqual([{startDate: '2026-10-19', endDate: '2026-10-25', count: 2}]);
  });
  it('does not count a period that is still open, and names the day it ends', () => {
    const review = paydayReview([card('a', '2026-10-26', '2026-11-01'), own('me', '2026-10-26', '2026-11-01')], '2026-10-30');
    expect(review).toMatchObject({toReview: 0, otherReviewer: 0, openEnd: '2026-11-01'});
  });
  it('groups by pay period, earliest first', () => {
    const review = paydayReview([card('b', '2026-10-19', '2026-10-25'), card('a', '2026-10-12', '2026-10-18'), card('c', '2026-10-19', '2026-10-25')], '2026-10-30');
    expect(review.periods.map(period => [period.startDate, period.count])).toEqual([['2026-10-12', 1], ['2026-10-19', 2]]);
    expect(review.toReview).toBe(3);
  });
  it('turns cards without review facts into a lower bound, never a complete total', () => {
    const legacy = card('old', '2026-10-19', '2026-10-25'); delete legacy.review;
    const review = paydayReview([...three, legacy], '2026-10-30');
    expect(review).toMatchObject({toReview: 2, unknown: 1, exact: false});
    // Only unknown cards: nothing is counted, and it is not "none waiting".
    expect(paydayReview([legacy], '2026-10-30')).toMatchObject({toReview: 0, unknown: 1, exact: false});
  });
  it('counts nothing without the workplace’s business date', () => {
    expect(paydayReview(three, undefined)).toMatchObject({toReview: 0, otherReviewer: 0, openEnd: undefined});
  });
});

describe('totals that say how complete they are', () => {
  it('is exact only when clock-ins were read and every correction has review facts', () => {
    const value = needsYou([fix('a', reviewFacts(false, false, 'TIME_CORRECTION'))], '2026-10-30');
    expect(needsYouTotal(value, {clockInsUnavailable: false})).toEqual({count: 1, exact: true, clockInsUnchecked: false, uncheckedReviews: 0});
    expect(needsYouTotal(value, {clockInsUnavailable: true})).toMatchObject({count: 1, exact: false, clockInsUnchecked: true});
    const legacy = needsYou([fix('a', reviewFacts(false, false, 'TIME_CORRECTION')), fix('old')], '2026-10-30');
    expect(needsYouTotal(legacy, {clockInsUnavailable: false})).toMatchObject({count: 1, exact: false, uncheckedReviews: 1});
    // Zero observed with a source unread is not all-clear.
    expect(needsYouTotal(needsYou([], '2026-10-30'), {clockInsUnavailable: true})).toMatchObject({count: 0, exact: false});
  });

  const scenario = (id: string) => fixtures.scenarios.find(item => item.id === id)!.projectionFragment as unknown as Pick<HomeTaskSummary, 'state' | 'counts' | 'observedCounts'>;
  const tasks = (id: string): HomeTaskSummary => ({preview: {limit: 3, requiredOutsidePreview: 0}, ranking: 'actionable_deadline_then_required_then_actionable_then_latest_information_v1', ...scenario(id)});
  it('contract fixture, empty and complete: all-clear only with the server’s allSet', () => {
    expect(homeTaskTotal(tasks('empty-complete'), 0, {partial: false, allSet: true})).toEqual({count: 0, exact: true, allSet: true});
    // Counts alone are insufficient: zero rows without the server's all-clear is not "You're all set".
    expect(homeTaskTotal(tasks('empty-complete'), 0, {partial: false, allSet: false})).toEqual({count: 0, exact: true, allSet: false});
  });
  it('contract fixture, mixed and complete: the listed work is exact, and overlapping categories are not added', () => {
    const mixed = tasks('mixed-complete');
    // required (1) and actionable (3) overlap: work is total minus informational (4), never 1 + 3 + 1.
    expect(mixed.counts!.total - mixed.counts!.informational).toBe(4);
    expect(homeTaskTotal(mixed, 4, {partial: false, allSet: false})).toEqual({count: 4, exact: true, allSet: false});
  });
  it('contract fixture, partial: a lower bound, never zero and never all-set', () => {
    const partial = tasks('partial');
    expect(partial.counts).toBeNull();
    expect(homeTaskTotal(partial, 4, {partial: true, allSet: false})).toEqual({count: 4, exact: false, allSet: false});
    expect(homeTaskTotal(partial, 0, {partial: false, allSet: true})).toMatchObject({exact: false, allSet: false});
  });
  it('a missing tasks field (an older payload) is unknown, never zero', () => {
    expect(homeTaskTotal(undefined, 2, {partial: false, allSet: false})).toEqual({count: 2, exact: false, allSet: false});
    expect(homeTaskTotal(undefined, 0, {partial: true, allSet: true})).toMatchObject({allSet: false});
  });
});

describe('no screen routes a review by its title', () => {
  const root = join(process.cwd(), 'src');
  const files = ['lib/action-center/needs-you.ts', 'lib/action-center/present.ts', 'lib/action-center/review-routing.ts', 'components/owner-b/home-b.tsx', 'components/owner-b/inbox-b.tsx',
    'components/manager-inbox-corp.tsx', 'components/owner-home-corp.tsx', 'components/premium-home.tsx', 'components/manager-dashboard.tsx', 'components/timecards.tsx',
    'components/employee-home-corp.tsx', 'components/employee-b/home-b.tsx'];
  it.each(files)('%s has no "your timecard / correction / another reviewer" title test', file => {
    const source = readFileSync(join(root, file), 'utf8').replace(/\/\*[\s\S]*?\*\/|\/\/.*$/gm, '');
    // The server's English titles, as a pattern or a comparison, are the regression this guards against.
    expect(source).not.toMatch(/\/\^?Your (correction|timecard)/i);
    expect(source).not.toMatch(/needs another reviewer/i);
    expect(source).not.toMatch(/\.title\s*(===|!==|\.startsWith|\.includes|\.match|\.search)\s*\(?\s*['"`/](Your|.*reviewer)/i);
    expect(source).not.toMatch(/\.test\(\s*(item|card|row|entry)\??\.title\s*\)/);
  });
});
