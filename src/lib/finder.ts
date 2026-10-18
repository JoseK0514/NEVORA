import type { UserRole } from './domain';
import type { PayrollCapabilities } from './payroll/contracts';
import { navigationForRole, type NavContext } from './navigation';
import { pathEnabled } from './workspace-presentation/modules';
import { DEFAULT_WORDS, lower } from './workspace-presentation/words';

export type FinderGroup = 'Pages' | 'Actions' | 'People' | 'Locations';
export type FinderItem = { id: string; group: FinderGroup; label: string; detail?: string; href: string; keywords?: string };
export type FinderData = { people: { id: string; name: string; role: string }[]; locations: { id: string; name: string }[] };

const GROUP_ORDER: FinderGroup[] = ['Actions', 'Pages', 'People', 'Locations'];

/** Every place a manager can go, plus a few common starts. People and
 * locations come from the read-only finder route, never from this file. */
/** C1: earlier page names still find their page. */
const PAGE_KEYWORDS: Record<string, string> = { '/app/payroll-export': 'payroll export exports csv' };

export function finderItems(role: UserRole, payroll: PayrollCapabilities | undefined, data: FinderData | null, context: NavContext = {}): FinderItem[] {
  const pages = navigationForRole(role, payroll, context).map(item => ({ id: `page:${item.href}`, group: 'Pages' as const, label: item.label, href: item.href, keywords: PAGE_KEYWORDS[item.href] }));
  const actions: FinderItem[] = [
    { id: 'action:shift', group: 'Actions', label: 'Add a shift', href: '/app/schedule/new', keywords: 'new create schedule' },
    { id: 'action:employee', group: 'Actions', label: 'Add an employee', href: '/app/employees/new', keywords: 'new hire person team' },
    { id: 'action:update', group: 'Actions', label: 'Send an update', href: '/app/updates/compose', keywords: 'message announcement compose' },
  ];
  const people = (data?.people ?? []).map(person => ({ id: `person:${person.id}`, group: 'People' as const, label: person.name, detail: person.role, href: `/app/employees/${encodeURIComponent(person.id)}`, keywords: person.id }));
  const locations = (data?.locations ?? []).map(location => ({ id: `location:${location.id}`, group: 'Locations' as const, label: location.name, detail: 'Schedule', href: `/app/schedule?location=${encodeURIComponent(location.id)}` }));
  // Actions follow the company's modules and words too.
  const words = context.words ?? DEFAULT_WORDS.en;
  const named = actions.filter(item => pathEnabled(item.href, context.modules)).map(item => item.id === 'action:employee' && words !== DEFAULT_WORDS.en ? { ...item, label: `Add ${lower(words.person)}` } : item);
  return [...named, ...pages, ...people, ...locations];
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
