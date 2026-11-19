// SCRUM-215: action grants (Owner), what a Manager can approve, the week setting and the planning week, EN and ES.
import { createElement, type ComponentProps } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, rs } from '@rstest/core';
rs.mock("next/link", () => ({ default: ({ href, children, prefetch: _prefetch, ...props }: ComponentProps<"a"> & { prefetch?: boolean }) => createElement("a", { href, ...props }, children) }));
rs.mock("next/navigation", () => ({ useRouter: () => ({ push: () => {}, refresh: () => {} }) }));
import { ManagerActionGrants } from "./manager-action-grants";
import { ManagerAuthoritySection } from "./manager-authority";
import { PlanningWeekFields } from "./planning-week";
import { PlanningWindowCard } from "./planning-window-card";

const locations = [{ id: 'loiza', name: 'Calle Loíza', active: true }, { id: 'condado', name: 'Condado', active: true }];

describe('ManagerActionGrants', () => {
  it('loads for the locations in scope, and explains when there are none', () => {
    expect(renderToStaticMarkup(<ManagerActionGrants employeeId="m1" firstName="Elena" locations={locations} scopeLocationIds={['loiza']} manager />)).toContain('aria-busy="true"');
    expect(renderToStaticMarkup(<ManagerActionGrants employeeId="m1" firstName="Elena" locations={locations} scopeLocationIds={null} manager />)).toContain('Elena doesn’t manage a location yet');
    expect(renderToStaticMarkup(<ManagerActionGrants lang="es" employeeId="m1" firstName="Elena" locations={locations} scopeLocationIds={null} manager />)).toContain('Lo que puede aprobar');
  });
});

describe('ManagerAuthoritySection', () => {
  const authority = { state: 'ready' as const, scopeIds: ['loiza', 'condado'], pairs: [{ locationId: 'loiza', permission: 'PUBLISH_SCHEDULE' as const }, { locationId: 'loiza', permission: 'APPROVE_LEAVE' as const }, { locationId: 'condado', permission: 'APPROVE_LEAVE' as const }] };
  const names = { loiza: 'Calle Loíza', condado: 'Condado' };
  it('lists each action with its locations, and who to ask', () => {
    const html = renderToStaticMarkup(<ManagerAuthoritySection authority={authority} locationNames={names} owners="Jose Natal" />);
    expect(html).toContain('What you can approve');
    expect(html).toMatch(/Publish schedules.*Calle Loíza/);
    expect(html).toMatch(/Approve time off.*Every location you manage/);
    expect(html).toMatch(/Review time exceptions.*Not granted/);
    expect(html).toContain('ask Jose Natal');
  });
  it('in Spanish, and a failed read never says "Not granted"', () => {
    expect(renderToStaticMarkup(<ManagerAuthoritySection lang="es" authority={authority} locationNames={names} owners={null} />)).toContain('pregúntale a un dueño');
    const failed = renderToStaticMarkup(<ManagerAuthoritySection authority={{ state: 'unavailable' }} locationNames={names} owners={null} />);
    expect(failed).toContain('couldn’t load');
    expect(failed).not.toContain('Not granted');
  });
});

describe('Planning week', () => {
  it('Owner edits the start day; a Manager reads who sets it', () => {
    const html = renderToStaticMarkup(<PlanningWeekFields startsOn={0} revision={2} canEdit owner="An Owner" />);
    expect(html).toContain('Week starts on');
    expect(html).toContain('<option value="0" selected="">Sunday</option>');
    expect(html).toContain('nothing already published changes');
    expect(renderToStaticMarkup(<PlanningWeekFields startsOn={0} revision={2} canEdit={false} owner="An Owner" />)).toContain('An Owner sets this.');
    expect(renderToStaticMarkup(<PlanningWeekFields lang="es" startsOn={0} revision={2} canEdit owner="Un dueño" />)).toContain('La semana comienza el');
  });
  it('a planning week across two schedule weeks keeps each week’s label', () => {
    const days = ['2026-11-15', '2026-11-16', '2026-11-17', '2026-11-18', '2026-11-19', '2026-11-20', '2026-11-21'].map(date => ({ date, scheduleWeekStart: date === '2026-11-15' ? '2026-11-09' : '2026-11-16' }));
    const html = renderToStaticMarkup(<PlanningWindowCard viewingWeek="2026-11-16" owner={false} locationQuery="" window={{ startsOn: 0, startDate: '2026-11-15', endDate: '2026-11-21', days,
      shifts: [{ date: '2026-11-15', locationId: 'loiza' }, { date: '2026-11-16', locationId: 'loiza' }, { date: '2026-11-16', locationId: 'condado' }], locations: locations.map(({ id, name }) => ({ id, name })), publishLocationIds: ['loiza'] }} />);
    expect(html).toContain('Schedule week Nov 9 – Nov 15');
    expect(html).toContain('Schedule week Nov 16 – Nov 22');
    expect(html).toContain('href="/app/schedule?week=2026-11-09"');
    expect(html).toContain('2 shifts');
    expect(html).toContain('You can publish: Calle Loíza');
    expect(html).toContain('spans two schedule weeks');
  });
});
