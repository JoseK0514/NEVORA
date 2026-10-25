import type { UserRole } from './domain';
import type { PayrollCapabilities } from './payroll/contracts';
import { navigationForRole, teamToolsForRole, type NavContext } from './navigation';
import { pathEnabled } from './workspace-presentation/modules';
import { DEFAULT_WORDS, lower } from './workspace-presentation/words';

export type FinderGroup = 'Pages' | 'Actions' | 'People' | 'Locations';
/** `searchOnly` items show for a typed query, never in the opening list. */
export type FinderItem = { id: string; group: FinderGroup; label: string; detail?: string; href: string; keywords?: string; searchOnly?: boolean };
export type FinderData = { people: { id: string; name: string; role: string }[]; locations: { id: string; name: string }[] };

const GROUP_ORDER: FinderGroup[] = ['Actions', 'Pages', 'People', 'Locations'];

/** Every place a manager can go, plus a few common starts. People and
 * locations come from the read-only finder route, never from this file. */
/** C1: earlier page names still find their page. */
const PAGE_KEYWORDS: Record<string, string> = {
  '/app/payroll-export': 'payroll export exports csv',
  // Final pass (Oct 25): the team tools' earlier names.
  '/app?view=attendance': 'attendance clock-ins clocked in corrections late',
  '/app?view=team': 'team overview hours targets scheduled',
  '/app?view=activity': 'schedule activity publications changes',
  // UX7: the words people type for each page.
  '/app/inbox': 'requests decisions approve decline',
  '/app/schedule': 'roster week shifts plan',
  '/app/employees': 'people staff employees directory',
  '/app/timecards': 'hours punches time sheets timesheets approve',
  '/app/reports': 'reports insights hours analytics',
  '/app/updates': 'announcements messages news',
  '/app/schedule/settings': 'coverage hour targets rules staffing',
  '/app/schedule/templates': 'patterns templates repeat',
};

/** UX7: Settings pages, found by name for Owners (who are the only ones who can open Settings). */
const SETTINGS_PAGES: { href: string; label: string; keywords: string }[] = [
  { href: '/app/settings/workspace', label: 'Company profile', keywords: 'business name timezone time zone company' },
  { href: '/app/settings/locations', label: 'Locations', keywords: 'places sites stores offices clocker links' },
  { href: '/app/settings/branding', label: 'Branding', keywords: 'logo colour color brand' },
  { href: '/app/settings/features', label: 'Features & words', keywords: 'modules features words terms language' },
  { href: '/app/settings/company-policies', label: 'Company policies', keywords: 'policies attendance thresholds rules' },
  { href: '/app/settings/breaks', label: 'Break types', keywords: 'breaks lunch meal rest' },
  { href: '/app/settings/positions', label: 'Positions', keywords: 'positions jobs roles qualifications' },
  { href: '/app/settings/clocker', label: 'Clocker devices', keywords: 'clocker tablets devices kiosk' },
];

export function finderItems(role: UserRole, payroll: PayrollCapabilities | undefined, data: FinderData | null, context: NavContext = {}): FinderItem[] {
  const pages = navigationForRole(role, payroll, context).map(item => ({ id: `page:${item.href}`, group: 'Pages' as const, label: item.label, href: item.href, keywords: PAGE_KEYWORDS[item.href] }));
  const actions: FinderItem[] = [
    { id: 'action:shift', group: 'Actions', label: 'Add a shift', href: '/app/schedule/new', keywords: 'add new create shift schedule' },
    { id: 'action:employee', group: 'Actions', label: 'Add an employee', href: '/app/employees/new', keywords: 'add new hire person team employee staff' },
    { id: 'action:update', group: 'Actions', label: 'Send an update', href: '/app/updates/compose', keywords: 'send message announcement compose post' },
    // UX7: verbs that live inside a page open that page where the action is.
    { id: 'action:publish', group: 'Actions', label: 'Publish the schedule', detail: 'Schedule', href: '/app/schedule?plan=1#schedule-planning', keywords: 'publish build schedule week send', searchOnly: true },
    { id: 'action:copy', group: 'Actions', label: 'Copy previous week', detail: 'Schedule › More', href: '/app/schedule', keywords: 'copy duplicate repeat last previous week schedule', searchOnly: true },
    { id: 'action:time-off', group: 'Actions', label: 'Review time-off requests', detail: 'Time off', href: '/app/requests', keywords: 'approve decline time off vacation leave requests pto', searchOnly: true },
    { id: 'action:timecards', group: 'Actions', label: 'Approve timecards', detail: 'Timecards', href: '/app/timecards', keywords: 'approve finalize timecards hours time sheets', searchOnly: true },
    { id: 'action:pin', group: 'Actions', label: 'Set a Clocker PIN', detail: 'Open the person on Team', href: '/app/employees', keywords: 'pin clocker code reset person', searchOnly: true },
  ];
  const known = new Set(pages.map(page => page.href));
  const tools = teamToolsForRole(role, context).filter(item => !known.has(item.href))
    .map(item => ({ id: `page:${item.href}`, group: 'Pages' as const, label: item.label, detail: 'Team tools', href: item.href, keywords: PAGE_KEYWORDS[item.href], searchOnly: true }));
  const settings = known.has('/app/settings') ? SETTINGS_PAGES.filter(page => !known.has(page.href) && pathEnabled(page.href, context.modules))
    .map(page => ({ id: `page:${page.href}`, group: 'Pages' as const, label: page.label, detail: 'Settings', href: page.href, keywords: page.keywords, searchOnly: true })) : [];
  const people = (data?.people ?? []).map(person => ({ id: `person:${person.id}`, group: 'People' as const, label: person.name, detail: person.role, href: `/app/employees/${encodeURIComponent(person.id)}`, keywords: person.id }));
  const locations = (data?.locations ?? []).map(location => ({ id: `location:${location.id}`, group: 'Locations' as const, label: location.name, detail: 'Schedule', href: `/app/schedule?location=${encodeURIComponent(location.id)}` }));
  // Actions follow the company's modules and words too.
  const words = context.words ?? DEFAULT_WORDS.en;
  // A search-only action shows only when the role can open the page it lives on.
  const reachable = (href: string) => { const path = href.split(/[?#]/)[0]; return known.has(path) || path === '/app/requests' && known.has('/app/inbox'); };
  const named = actions.filter(item => pathEnabled(item.href, context.modules) && (!item.searchOnly || reachable(item.href))).map(item => item.id === 'action:employee' && words !== DEFAULT_WORDS.en ? { ...item, label: `Add ${lower(words.person)}` } : item);
  return [...named, ...pages, ...tools, ...settings, ...people, ...locations];
}

function score(item: FinderItem, query: string) {
  const label = item.label.toLocaleLowerCase();
  if (label.startsWith(query)) return 0;
  if (label.split(/\s+/).some(word => word.startsWith(query))) return 1;
  if (label.includes(query)) return 2;
  if (item.keywords?.toLocaleLowerCase().includes(query)) return 3;
  // UX7: "add shift", "approve time off": every typed word starts a word of the label or its keywords.
  const words = `${label} ${item.keywords ?? ''}`.toLocaleLowerCase().split(/[^\p{L}\p{N}]+/u).filter(Boolean);
  const typed = query.split(/[^\p{L}\p{N}]+/u).filter(Boolean);
  if (typed.length > 1 && typed.every(part => words.some(word => word.startsWith(part)))) return 4;
  return null;
}

/** Ranked, grouped results. An empty query shows actions and pages only, so
 * opening the finder never lists the whole team. */
export function rankFinder(items: FinderItem[], rawQuery: string, perGroup = 6): FinderItem[] {
  const query = rawQuery.trim().toLocaleLowerCase();
  const matched = query
    ? items.map((item, index) => ({ item, index, rank: score(item, query) })).filter(entry => entry.rank !== null)
      .sort((a, b) => a.rank! - b.rank! || a.index - b.index).map(entry => entry.item)
    : items.filter(item => !item.searchOnly && (item.group === 'Actions' || item.group === 'Pages'));
  return GROUP_ORDER.flatMap(group => matched.filter(item => item.group === group).slice(0, perGroup));
}
