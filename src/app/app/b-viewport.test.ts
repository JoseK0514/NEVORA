// Review B8: the Direction B stylesheets share one definition of "phone" (src/lib/b-viewport.ts) and one cascade layer.
import {readFileSync} from 'node:fs';
import {join} from 'node:path';
import {describe, expect, it} from 'vitest';
import {B_DESKTOP, B_PHONE, B_SHORT, B_TABLET, B_WIDE, B_WIDE_SHORT} from '@/lib/b-viewport';

const root = join(__dirname, '..', '..');
const B_SHEETS = [
  'app/app/owner-b-shell.css', 'app/app/owner-b-pages.css', 'app/app/owner-b-desktop.css', 'app/app/employee-b-desktop.css',
  'app/app/b-foundation.css', 'components/owner-b/owner-b.css', 'components/employee-b/employee-b.css',
  'components/employee-b/account.css', 'components/employee-b/requests.css', 'components/employee-b/schedule.css',
  'components/employee-b/time.css', 'components/employee-b/pay.css',
  'app/app/owner-b-home.css', 'app/app/owner-b-schedule.css', 'app/app/owner-b-time-pay.css', 'app/app/owner-b-requests.css', 'app/app/owner-b-settings.css', 'app/app/b-restrictions.css', 'app/app/b-payroll-import.css', 'app/app/b-reminders.css', 'app/app/b-review-details.css', 'app/app/employee-b-work.css', 'app/app/employee-b-account.css', 'app/app/b-motion.css', 'app/app/b-moments.css', 'app/app/b-shimmer.css',
  'components/clocker-owner-b.css',
];
const css = (path: string) => readFileSync(join(root, path), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');
const viewportFeatures = (query: string) => query.match(/\((?:min|max)-width:\s*\d+px\)/g) ?? [];
/** Evaluates an "and" list of min/max width and height features for one window size. */
const matchMediaQuery = (query: string, width: number, height: number) => [...query.matchAll(/\((min|max)-(width|height):\s*(\d+)px\)/g)]
  .every(([, bound, axis, value]) => { const size = axis === 'width' ? width : height; return bound === 'min' ? size >= Number(value) : size <= Number(value); });

describe('Direction B viewport alias (NV-274)', () => {
  it('defines a phone held sideways as wide, not as a phone', () => {
    expect(B_PHONE).toBe('(max-width: 767px)');
    expect(B_WIDE).toBe('(min-width: 768px)');
    expect(B_TABLET).toBe(`${B_WIDE} and (max-width: 1023px)`);
    expect(B_DESKTOP).toBe('(min-width: 1024px)');
  });
  it('defines a short window as a refinement of wide screens only (Phase 8)', () => {
    expect(B_SHORT).toBe('(max-height: 500px)');
    expect(B_WIDE_SHORT).toBe(`${B_WIDE} and ${B_SHORT}`);
    expect(matchMediaQuery(B_WIDE_SHORT, 844, 390)).toBe(true);
    expect(matchMediaQuery(B_WIDE_SHORT, 932, 430)).toBe(true);
    expect(matchMediaQuery(B_WIDE_SHORT, 1440, 900)).toBe(false);
    expect(matchMediaQuery(B_WIDE_SHORT, 768, 1024)).toBe(false);
    expect(matchMediaQuery(B_WIDE_SHORT, 390, 844)).toBe(false);
  });
  it.each(B_SHEETS)('%s asks only the alias breakpoints, never orientation, and height only as the short-window alias', path => {
    const queries = [...css(path).matchAll(/@media([^{]+)\{/g)].map(match => match[1].trim());
    for (const query of queries) {
      expect(query, query).not.toMatch(/orientation|min-height/);
      // The one height feature is B_SHORT, and only on top of B_WIDE: a phone never turns compact.
      for (const height of query.match(/\([^()]*height[^()]*\)/g) ?? []) {
        expect(height.replace(/\s+/g, ' '), query).toBe(B_SHORT);
        expect(query, query).toContain(B_WIDE);
      }
      for (const feature of viewportFeatures(query)) expect(['(max-width: 767px)', '(min-width: 768px)', '(max-width: 1023px)', '(min-width: 1024px)', '(max-width: 359px)', '(max-width: 819px)', '(max-width: 1279px)', '(min-width: 1280px)'], query).toContain(feature.replace(/\s+/g, ' '));
    }
  });
});

describe('Direction B cascade layer (NV-066)', () => {
  it.each(B_SHEETS.filter(path => !path.endsWith('pay.css')))('%s puts its !important declarations in @layer nv-b', path => {
    const text = css(path);
    expect(text).toMatch(/@layer nv-b \{/);
    // The only other layer name is none: one layer keeps the B rules' order among themselves as it was.
    expect([...text.matchAll(/@layer\s+([\w-]+)/g)].every(match => match[1] === 'nv-b')).toBe(true);
  });
});
