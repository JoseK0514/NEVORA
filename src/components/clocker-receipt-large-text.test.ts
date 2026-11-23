// G50 (Nov 23, 2026): the Clocker receipt at 390px with 200% text broke "Clocked in at" inside its time ("1:40 A / M"),
// cut the large "1:40 AM" at the card's right edge and cut the band's date ("Monday, Novem…"). The browser capture is the
// evidence for the layout (tools/ui-scan, NEVORA_SCAN_CLOCKER_FLOW=receipt); these guards keep the rules that fixed it.
import {readFileSync} from 'node:fs';
import {expect, it} from '@rstest/core';
import {receiptFacts} from './clocker-receipt';

const css = readFileSync(new URL('./clocker.module.css', import.meta.url), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');
const rule = (selector: string) => css.match(new RegExp(`(?:^|\\n)\\s*${selector.replace(/[.*+?^${}()|[\]\\>]/g, '\\$&')} \\{[^}]*\\}`))?.[0] ?? '';

it('writes every receipt time in the one format, kept whole by a narrow no-break space', () => {
  const performedAt = '2026-11-23T14:12:00Z';
  const before = { entry: { id: 'entry-1', clockInAt: '2026-11-23T11:00:00Z' } } as never;
  const facts = receiptFacts({ action: 'CLOCK_OUT', performedAt, timeEntryId: 'entry-1', breakEntryId: null, breakType: null } as never, before, 'America/Puerto_Rico');
  const clockedIn = facts.find(fact => fact.label === 'Clocked in at');
  expect(clockedIn?.value).toBe('7:00 AM');
  expect(clockedIn?.dateTime).toBe('2026-11-23T11:00:00Z');
  // Another day keeps the date beside the time, and the time still holds together.
  const yesterday = receiptFacts({ action: 'CLOCK_OUT', performedAt, timeEntryId: 'entry-1', breakEntryId: null, breakType: null } as never,
    { entry: { id: 'entry-1', clockInAt: '2026-11-22T23:05:00Z' } } as never, 'America/Puerto_Rico');
  expect(yesterday[0].value).toBe('Nov 22 · 7:05 PM');
});

it('stacks the facts at a large text size and never breaks a time inside itself', () => {
  expect(rule('.facts')).toContain('grid-template-columns: repeat(auto-fit, minmax(min(100%, 7.5em), 1fr))');
  expect(rule('.facts')).toContain('overflow: clip');
  expect(rule('.facts > div')).toContain('box-shadow: -1px 0 0 var(--ck-line), 0 -1px 0 var(--ck-line)');
  expect(css).not.toMatch(/\.facts > div \+ div \{/);
  expect(rule('.facts dd')).toContain('overflow-wrap: break-word');
  expect(rule('.facts dd')).not.toContain('overflow-wrap: anywhere');
  expect(rule('.facts dd time')).toContain('overflow-wrap: normal');
});

it('keeps the recorded time inside the card at any text size', () => {
  expect(rule('.hero')).toContain('container-type: inline-size');
  // A size container that shrank to its content would measure 0 wide and draw the time at 0px.
  expect(rule('.hero')).toContain('align-self: stretch; width: 100%');
  expect(rule('.hero > time')).toContain('font-size: min(var(--ck-hero, 3.5rem), 23cqi)');
  // The short landscape layout changes the cap, not the figure's own size.
  expect(css).toContain('.hero { --ck-hero: 2.75rem; }');
  expect(css).not.toMatch(/\.hero \{ font-size: 2\.75rem; \}/);
});

it('puts the band date under the clock on a phone when the text is large, never cut', () => {
  const phone = css.slice(css.indexOf('@media (max-width: 599px)'));
  expect(phone).toMatch(/\.date \{ order: 2;[^}]*min-width: min-content;/);
  expect(phone).toContain('@container (max-width: 16em) { .date { flex-basis: 100%; text-align: left; } }');
});
