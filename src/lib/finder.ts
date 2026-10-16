import type { UserRole } from './domain';
import type { PayrollCapabilities } from './payroll/contracts';
import { navigationForRole } from './navigation';

export type FinderGroup = 'Pages' | 'Actions' | 'People' | 'Locations';
export type FinderItem = { id: string; group: FinderGroup; label: string; detail?: string; href: string; keywords?: string };
export type FinderData = { people: { id: string; name: string; role: string }[]; locations: { id: string; name: string }[] };

const GROUP_ORDER: FinderGroup[] = ['Actions', 'Pages', 'People', 'Locations'];

/** Every place a manager can go, plus a few common starts. People and
 * locations come from the read-only finder route, never from this file. */
export function finderItems(role: UserRole, payroll: PayrollCapabilities | undefined, data: FinderData | null): FinderItem[] {
  const pages = navigationForRole(role, payroll).map(item => ({ id: `page:${item.href}`, group: 'Pages' as const, label: item.label, href: item.href }));
  const actions: FinderItem[] = [
    { id: 'action:shift', group: 'Actions', label: 'Add a shift', href: '/app/schedule/new', keywords: 'new create schedule' },
    { id: 'action:employee', group: 'Actions', label: 'Add an employee', href: '/app/employees/new', keywords: 'new hire person team' },
    { id: 'action:update', group: 'Actions', label: 'Send an update', href: '/app/updates/compose', keywords: 'message announcement compose' },
  ];
  const people = (data?.people ?? []).map(person => ({ id: `person:${person.id}`, group: 'People' as const, label: person.name, detail: person.role, href: `/app/employees/${encodeURIComponent(person.id)}`, keywords: person.id }));
  const locations = (data?.locations ?? []).map(location => ({ id: `location:${location.id}`, group: 'Locations' as const, label: location.name, detail: 'Schedule', href: `/app/schedule?location=${encodeURIComponent(location.id)}` }));
  return [...actions, ...pages, ...people, ...locations];
}

function score(item: FinderItem, query: string) {
  const label = item.label.toLocaleLowerCase();
  if (label.startsWith(query)) return 0;
  if (label.split(/\s+/).some(word => word.startsWith(query))) return 1;
  if (label.includes(query)) return 2;
  if (item.keywords?.toLocaleLowerCase().includes(query)) return 3;
  return null;
}

/** Ranked, grouped results. An empty query shows actions and pages only, so
 * opening the finder never lists the whole team. */
export function rankFinder(items: FinderItem[], rawQuery: string, perGroup = 6): FinderItem[] {
  const query = rawQuery.trim().toLocaleLowerCase();
  const matched = query
    ? items.map((item, index) => ({ item, index, rank: score(item, query) })).filter(entry => entry.rank !== null)
      .sort((a, b) => a.rank! - b.rank! || a.index - b.index).map(entry => entry.item)
    : items.filter(item => item.group === 'Actions' || item.group === 'Pages');
  return GROUP_ORDER.flatMap(group => matched.filter(item => item.group === group).slice(0, perGroup));
}
