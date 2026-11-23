// Release sweep (Nov 23, 2026): a location Manager's Team rows open the person's page (G17, 4745f4f2).
import {createElement, type ComponentProps} from 'react';
import {expect, it, rs} from '@rstest/core';
import {renderToStaticMarkup} from 'react-dom/server';
rs.mock('next/link', () => ({default: ({children, ...props}: ComponentProps<'a'>) => createElement('a', props, children), useLinkStatus: () => ({pending: false})}));
rs.mock('next/navigation', () => ({usePathname: () => '/app/employees', useRouter: () => ({push: () => {}, replace: () => {}, refresh: () => {}}), useSearchParams: () => new URLSearchParams()}));
import {ScopedTeam} from './scoped-team';

it("links each of a location Manager's Team rows to the person's page", () => {
  const html = renderToStaticMarkup(<ScopedTeam query="" showAll={false} data={{
    mode: 'LOCATIONS',
    locations: [{id: 'loc-2', name: 'Fictional West Office', shortName: 'West Office', active: true}],
    employees: [
      {id: 'QA-ANA', firstName: 'Ana', lastName: 'Colon', role: 'EMPLOYEE', locationIds: ['loc-2']},
      {id: 'QA LUIS', firstName: 'Luis', lastName: 'Torres', role: 'LEAD', locationIds: ['loc-2']},
    ],
  }}/>);
  expect(html).toContain('href="/app/employees/QA-ANA"');
  expect(html).toContain('href="/app/employees/QA%20LUIS"');
  // Both layouts (TeamB on phones, the People card from tablets up) carry the link.
  expect(html.match(/href="\/app\/employees\/QA-ANA"/g)?.length).toBeGreaterThanOrEqual(2);
});
