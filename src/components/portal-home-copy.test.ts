import { expect, it } from '@rstest/core';
import { HOME_PAGE_COPY } from '@/app/app/home-page-copy';
import { RESTRICTED_COPY } from '@/app/app/restricted/page-copy';
import { ROUTE_COPY } from '@/app/app/route-copy';
import { CONFIGURED_ATTENDANCE_COPY } from './configured-attendance-policies-copy';
import { ATTENDANCE_REVIEW_COPY } from './manager-attendance-review-copy';
import { DASHBOARD_COPY } from './manager-dashboard-copy';
import { OWNER_ONLY_COPY } from './owner-only-copy';
import { TEAM_COPY } from './team-copy';
import { WHOS_WORKING_COPY } from './whos-working-copy';

const fields = (entry: object, prefix = ''): Array<[string, unknown]> => Object.entries(entry).flatMap(([key, value]) =>
  value && typeof value === 'object' ? fields(value, `${prefix}${key}.`) : [[`${prefix}${key}`, value]]);
const placeholders = (value: unknown) =>
  typeof value === 'string' ? [...value.matchAll(/\{(\w+)\}/g)].map(match => match[1]) : [];

for (const [name, table] of Object.entries({
  HOME_PAGE_COPY, RESTRICTED_COPY, ROUTE_COPY, CONFIGURED_ATTENDANCE_COPY,
  ATTENDANCE_REVIEW_COPY, DASHBOARD_COPY, OWNER_ONLY_COPY, TEAM_COPY, WHOS_WORKING_COPY,
})) {
  it(`${name} has matching English and Spanish keys and placeholders`, () => {
    const en = new Map(fields(table.en));
    const es = new Map(fields(table.es));
    expect([...es.keys()].sort()).toEqual([...en.keys()].sort());
    for (const [key, value] of es) {
      expect(typeof value).toBe(typeof en.get(key));
      expect(placeholders(value).every(placeholder => placeholders(en.get(key)).includes(placeholder)), key).toBe(true);
    }
  });
}
