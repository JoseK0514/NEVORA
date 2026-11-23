// Regression sweep Z (Nov 23, 2026): the unit inside Shift matching's and Punch photos' number fields ("minutes", "days")
// grows with 200% text like the value beside it; the kit draws .c-in__suffix at a fixed 15–16px.
import {readFileSync} from 'node:fs';
import {join} from 'node:path';
import {expect, it} from '@rstest/core';

it.each([['clocker-schedule-grace.css', 'c-grace'], ['clocker-photo/photo-settings.css', 'c-photos']])('%s sizes its field unit in rem, centred', (file, page) => {
  const css = readFileSync(join(__dirname, file), 'utf8');
  const rules = [...css.matchAll(new RegExp(`\\.${page} \\.c-setb-unit \\.c-in__suffix \\{([^}]*)\\}`, 'g'))].map(m => m[1]);
  expect(rules.join(' ')).toMatch(/font-size: 0\.9375rem/);
  expect(rules.join(' ')).toMatch(/font-size: 1rem/);
  expect(rules.join(' ')).toContain('translateY(-50%)');
  expect(rules.join(' ')).not.toMatch(/font-size: \d+px/);
});
