// UI audit routes (tools/ui-audit). Every route each role is audited on, with its state variants.
//
// A route is { path, state?, note? }. `path` may use {placeholders} filled from the fixture ids (fixtures/seed.mts):
// {person} {employee} {lead} {week} {nextWeek} {location}. `state` picks a preparation in the driver:
//   default   the page as it loads (rich fictional data for owner, manager, lead and employee)
//   empty     the page for a role with nothing to show (empty-manager, new-employee)
//   draft     next week's unpublished draft (?week={nextWeek})
//   slow      every same-origin /api GET held 3.5 s; captured at 3 s, before the data arrives
//   failed    every same-origin /api GET answered 503
//   offline   loaded, then the browser goes offline (the page's offline handling is captured)
//   denied    a route outside the role's access (the access-denied page)
//   clocker-pin   the kiosk after a fictional Employee ID is typed (PIN pad)
// To add a route: add it to the role's list below (and to a state list if it has a variant). Keep it fictional: no
// route may send email or SMS, take a payment or press the billing handoff.

const OWNER = [
  '/app', '/app/inbox', '/app/notifications', '/app/more', '/app/help',
  '/app/schedule', '/app/schedule/new', '/app/schedule/publish', '/app/schedule/settings', '/app/schedule/templates', '/app/schedule/coverage',
  '/app/schedule/edit?shiftId=aud-0', '/app/availability', '/app/availability/agreement', '/app/exchange', '/app/exchange/open-shifts', '/app/requests', '/app/requests/hub',
  '/app/timecards', '/app/timecards/corrections', '/app/timecards/corrections/new/{person}',
  '/app/payroll', '/app/payroll/prepare', '/app/payroll/review', '/app/payroll/people', '/app/payroll/history', '/app/payroll/import', '/app/payroll/fix',
  '/app/payroll-export', '/app/payroll-export/paid-time',
  '/app/employees', '/app/employees/new', '/app/employees/import', '/app/employees/{person}', '/app/employees/{person}/pay', '/app/employees/{person}/restrictions', '/app/employees/{person}/time-off', '/app/employees/{person}/clocker-pin',
  '/app/reports', '/app/reports/christmas-bonus',
  '/app/ai-manager', '/app/ai-manager/weekly', '/app/ai-manager/knowledge', '/app/ai-manager/business',
  '/app/updates', '/app/updates/compose',
  '/app/settings', '/app/settings/workspace', '/app/settings/branding', '/app/settings/features', '/app/settings/locations', '/app/settings/locations/new', '/app/settings/locations/{location}',
  '/app/settings/positions', '/app/settings/breaks', '/app/settings/time-off', '/app/settings/company-policies', '/app/settings/payroll',
  '/app/settings/clocker', '/app/settings/clocker/matching', '/app/settings/clocker/photos', '/app/settings/clocker/photos/review', '/app/settings/clocker/pins',
  '/app/profile', '/app/profile/calendar', '/app/account/delete', '/app/clocker-recovery',
];
const OWNER_STATES = [
  {path: '/app/schedule?week={nextWeek}', state: 'draft'},
  {path: '/app/schedule/publish?week={nextWeek}', state: 'draft'},
  {path: '/app', state: 'slow'}, {path: '/app/schedule', state: 'slow'}, {path: '/app/employees', state: 'slow'}, {path: '/app/notifications', state: 'slow'},
  {path: '/app', state: 'failed'}, {path: '/app/inbox', state: 'failed'}, {path: '/app/notifications', state: 'failed'}, {path: '/app/timecards', state: 'failed'},
  {path: '/app', state: 'offline'}, {path: '/app/schedule', state: 'offline'},
  {path: '/app/my-pay', state: 'denied'},
];
const MANAGER = OWNER.filter(p => !/^\/app\/(settings\/(workspace|branding|features|payroll)|account\/delete|ai-manager\/(business|knowledge))/.test(p));
const MANAGER_STATES = [
  {path: '/app/schedule?week={nextWeek}', state: 'draft'},
  {path: '/app', state: 'slow'}, {path: '/app/inbox', state: 'failed'}, {path: '/app', state: 'offline'},
  {path: '/app/settings/workspace', state: 'denied'},
];
const EMPTY_MANAGER = ['/app', '/app/inbox', '/app/notifications', '/app/schedule', '/app/requests', '/app/exchange', '/app/timecards', '/app/employees', '/app/availability'];
const EMPLOYEE = [
  '/app', '/app/schedule', '/app/my-time', '/app/my-pay', '/app/requests', '/app/exchange', '/app/exchange/open-shifts', '/app/availability', '/app/availability/agreement',
  '/app/notifications', '/app/inbox', '/app/more', '/app/help', '/app/updates', '/app/profile', '/app/profile/calendar', '/app/account/delete',
];
const EMPLOYEE_STATES = [
  {path: '/app', state: 'slow'}, {path: '/app/schedule', state: 'slow'}, {path: '/app/my-time', state: 'failed'}, {path: '/app/my-pay', state: 'failed'}, {path: '/app', state: 'offline'},
  {path: '/app/payroll', state: 'denied'}, {path: '/app/employees', state: 'denied'}, {path: '/app/settings', state: 'denied'},
];
const NEW_EMPLOYEE = ['/app', '/app/schedule', '/app/my-time', '/app/my-pay', '/app/requests', '/app/exchange', '/app/availability', '/app/notifications'];
const PUBLIC = [
  '/login', '/forgot-access', '/reset-access', '/reset-access?token=expired-or-invalid', '/activate', '/activate?token=not-a-real-token',
  '/privacy', '/terms', '/support', '/account-deletion', '/welcome', '/access-help', '/access-help/id?from=login', '/pages/plans',
  '/clocker/access/paused?from=%2Fclocker%2Faud-kiosk-main&reason=billing_status_unavailable', '/no-such-page-here',
];
const PUBLIC_STATES = [{path: '/login', state: 'login-error'}, {path: '/login', state: 'login-empty'}];
const CLOCKER = ['/clocker/aud-kiosk-main', '/clocker/aud-kiosk-west', '/clocker/not-a-real-key'];
const CLOCKER_STATES = [{path: '/clocker/aud-kiosk-main', state: 'clocker-pin'}, {path: '/clocker/aud-kiosk-main', state: 'offline'}];

const routes = (paths, states = []) => [...paths.map(path => ({path, state: 'default'})), ...states];

/** Roles in run order. `login` names the fixture sign-in (fixtures/seed.mts); `group` is the role the CLI option selects. */
export const ROLES = {
  owner: {group: 'owner', routes: routes(OWNER, OWNER_STATES)},
  manager: {group: 'manager', routes: routes(MANAGER, MANAGER_STATES)},
  'scoped-manager': {group: 'scoped-manager', routes: routes(MANAGER, [{path: '/app/requests', state: 'default'}])},
  'empty-manager': {group: 'scoped-manager', routes: EMPTY_MANAGER.map(path => ({path, state: 'empty'}))},
  lead: {group: 'lead', routes: routes(EMPLOYEE, [{path: '/app/inbox', state: 'default'}, {path: '/app/payroll', state: 'denied'}])},
  employee: {group: 'employee', routes: routes(EMPLOYEE, EMPLOYEE_STATES)},
  'new-employee': {group: 'employee', routes: NEW_EMPLOYEE.map(path => ({path, state: 'empty'}))},
  public: {group: 'public', routes: routes(PUBLIC, PUBLIC_STATES)},
  clocker: {group: 'clocker', routes: routes(CLOCKER, CLOCKER_STATES)},
};
export const ROLE_GROUPS = ['owner', 'manager', 'scoped-manager', 'lead', 'employee', 'public', 'clocker'];
export const DEFAULT_WIDTHS = [320, 390, 768, 1024, 1440];
/** Viewport height for each width: phones portrait, 768 tablet portrait, 1024 tablet landscape, desktop. */
export const heightFor = width => (width <= 430 ? 844 : width <= 800 ? 1024 : width <= 1100 ? 768 : 900);

/** Dedupe (a route listed twice for the same role and state runs once). */
export function routesFor(role) {
  const seen = new Set();
  return ROLES[role].routes.filter(r => { const k = r.path + '|' + r.state; if (seen.has(k)) return false; seen.add(k); return true; });
}
