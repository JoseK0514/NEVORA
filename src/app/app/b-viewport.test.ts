// Review B8: the Direction B stylesheets share one definition of "phone" (src/lib/b-viewport.ts) and one cascade layer.
import {readFileSync} from 'node:fs';
import {join} from 'node:path';
import {describe, expect, it} from 'vitest';
import {B_DESKTOP, B_PHONE, B_TABLET, B_WIDE} from '@/lib/b-viewport';

const root = join(__dirname, '..', '..');
const B_SHEETS = [
  'app/app/owner-b-shell.css', 'app/app/owner-b-pages.css', 'app/app/owner-b-desktop.css', 'app/app/employee-b-desktop.css',
  'app/app/b-foundation.css', 'components/owner-b/owner-b.css', 'components/employee-b/employee-b.css',
  'components/employee-b/account.css', 'components/employee-b/requests.css', 'components/employee-b/schedule.css',
  'components/employee-b/time.css', 'components/employee-b/pay.css',
];
const css = (path: string) => readFileSync(join(root, path), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');
const viewportFeatures = (query: string) => query.match(/\((?:min|max)-width:\s*\d+px\)/g) ?? [];

describe('Direction B viewport alias (NV-274)', () => {
  it('defines a phone held sideways as wide, not as a phone', () => {
    expect(B_PHONE).toBe('(max-width: 767px)');
    expect(B_WIDE).toBe('(min-width: 768px)');
    expect(B_TABLET).toBe(`${B_WIDE} and (max-width: 1023px)`);
    expect(B_DESKTOP).toBe('(min-width: 1024px)');
  });
  it.each(B_SHEETS)('%s asks only the alias breakpoints, never height or orientation', path => {
    const queries = [...css(path).matchAll(/@media([^{]+)\{/g)].map(match => match[1].trim());
    for (const query of queries) {
      expect(query, query).not.toMatch(/height|orientation/);
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
