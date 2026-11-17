import {createElement, createRef, type ComponentProps} from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {expect, it, vi} from 'vitest';
vi.mock('next/link', () => ({default: ({children, scroll: _scroll, prefetch: _prefetch, ...props}: ComponentProps<'a'> & {scroll?: boolean; prefetch?: boolean}) => createElement('a', props, children)}));
import {PAY_SCOPE_LINE} from '../employee-mobile/pay';
import {PayB, type PayBProps} from './pay-b';

/* Phase 4 (Nov 17, 2026), Employee Pay on fictional data. Statements carry no amounts. */
type Statement = PayBProps['ordered'][number];
const statement = (n: number, payday: string, start: string, end: string): Statement => ({id: `00000000-0000-4000-8000-00000000000${n}`, kind: 'EMPLOYEE_STATEMENT', employeeId: 'FICTIONAL-E1', filename: `statement-${payday}.pdf`,
  sha256: 'f'.repeat(64), downloadUrl: `/api/payroll/documents/${n}`, viewUrl: `/api/payroll/documents/${n}/view`, published: true, period: {startDate: start, endDate: end}, payday, corrects: null, correctedBy: null});
const ordered = [statement(1, '2026-11-13', '2026-11-02', '2026-11-08'), statement(2, '2026-11-06', '2026-10-26', '2026-11-01'), statement(3, '2026-10-30', '2026-10-19', '2026-10-25'),
  statement(4, '2026-10-23', '2026-10-12', '2026-10-18'), statement(5, '2026-10-16', '2026-10-05', '2026-10-11'), statement(6, '2026-10-09', '2026-09-28', '2026-10-04'), statement(7, '2026-10-02', '2026-09-21', '2026-09-27')];
const base: PayBProps = {view: 'pay', state: 'ready', ordered, byId: new Map(ordered.map(item => [item.id, item])), paycheck: null,
  nextPay: {payday: '2026-11-20', period: {startDate: '2026-11-09', endDate: '2026-11-15'}} as PayBProps['nextPay'], daysUntil: 3, listed: true, thisYear: '2026', notice: null, noticeRef: createRef<HTMLDivElement>(), status: null, onOpenPdf: () => {}};
const draw = (patch: Partial<PayBProps> = {}) => renderToStaticMarkup(<PayB {...base} {...patch}/>);

it('EM-010: the pay period is plain band text under the date and the hero has one glass pill', () => {
  const html = draw(), hero = html.slice(html.indexOf('ep-next'), html.indexOf('</header>'));
  expect(hero).toContain('<p class="ep-next__k">Scheduled payday · In 3 days</p><p class="ep-next__v">Fri, Nov 20</p><p class="ep-next__p">For work Nov 9 – 15</p>');
  expect(hero).not.toContain('b-chip');expect(hero.match(/b-btn--glass/g)).toHaveLength(1);
  expect(hero).toContain('aria-label="See your hours"');
  // The locked sentence about who pays stays as it was.
  expect(html).toContain(PAY_SCOPE_LINE);
});

it('EM-025: Earlier holds two statements on a phone and up to five from tablets up, in one order', () => {
  const html = draw(), card = html.slice(html.indexOf('id="b-pay-recent"'), html.indexOf('</section>', html.indexOf('id="b-pay-recent"')));
  const lists = [...card.matchAll(/<ul class="(b-list(?: eb-desk)?)"[^>]*>(.*?)<\/ul>/g)];
  expect(lists.map(list => [list[1], (list[2].match(/class="b-li"/g) ?? []).length])).toEqual([['b-list', 2], ['b-list eb-desk', 3]]);
  expect(card.indexOf('Nov 6')).toBeLessThan(card.indexOf('Oct 30'));expect(card).toContain('Oct 9');expect(card).not.toContain('Sep 21');
  // "See all" stays in the markup for phones (the stylesheet hides it where Pay history is in the band).
  expect(card).toContain('aria-label="See all statements"');
  // Three statements: nothing extra to show.
  expect(draw({ordered: ordered.slice(0, 3)})).not.toContain('More earlier statements');
});
