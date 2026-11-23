import { readdirSync, readFileSync } from 'node:fs';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from '@rstest/core';
import { parseManagerProfile, type ManagerProfileSnapshot } from './contract';
import { ALERT_TOPIC_COUNT, ManagerProfileView, managerAccess, type ManagerProfileIdentity } from './manager-profile-live';

const FIXTURES = 'docs/product/specs/p35-profile/fixtures';
const fixture = (name: string) => JSON.parse(readFileSync(`${FIXTURES}/${name}.json`, 'utf8'));
const owner: ManagerProfileIdentity = { employeeId: 'qa-owner', name: 'Fictional Owner', owner: true, company: 'Northside QA Workforce', timeZone: 'Puerto Rico time', payHref: '/app/my-pay', deviceAlerts: false };
const manager: ManagerProfileIdentity = { ...owner, employeeId: 'audit-m', name: 'Morgan Rivera', owner: false, payHref: null, deviceAlerts: true };
const render = (identity: ManagerProfileIdentity, snapshot: ManagerProfileSnapshot | null, extra: Partial<Parameters<typeof ManagerProfileView>[0]> = {}) =>
  renderToStaticMarkup(<ManagerProfileView identity={identity} state={{ snapshot, paused: false, refreshing: false, ...extra.state }} onRetry={() => {}} onToggle={() => {}} {...extra} />);

describe('management profile contract', () => {
  it('accepts every fixture Codex is asked to match', () => {
    const names = readdirSync(FIXTURES).filter(name => name.endsWith('.json')).map(name => name.slice(0, -5));
    expect(names).toEqual(expect.arrayContaining(['owner', 'manager', 'manager-empty', 'owner-large', 'unavailable']));
    for (const name of names) expect(() => parseManagerProfile(fixture(name))).not.toThrow();
  });

  it('matches the fixed topic count per role, so loading rows equal ready rows', () => {
    expect((parseManagerProfile(fixture('owner')) as { alerts: unknown[] }).alerts).toHaveLength(ALERT_TOPIC_COUNT.owner);
    expect((parseManagerProfile(fixture('manager')) as { alerts: unknown[] }).alerts).toHaveLength(ALERT_TOPIC_COUNT.manager);
  });

  it('rejects anything outside the contract instead of showing partial data', () => {
    const good = fixture('manager');
    for (const bad of [
      { ...good, kind: 'profile' },
      { ...good, observedAt: 'yesterday' },
      { ...good, validForMs: 0 },
      { ...good, locations: { scope: 'some', names: [] } },
      { ...good, alerts: [{ ...good.alerts[0], on: 'yes' }] },
      { ...good, alerts: [good.alerts[0], good.alerts[0]] },
      { ...good, contact: { email: 42, phone: null } },
      null, [],
    ]) expect(() => parseManagerProfile(bad)).toThrow();
  });

  it('reads an empty email or phone as not added', () => {
    const parsed = parseManagerProfile({ ...fixture('manager'), contact: { email: '', phone: null } });
    expect(parsed.state === 'ready' && parsed.contact).toEqual({ email: null, phone: null });
  });
});

// Quiet (v4, approved Oct 23): who you are (name, role · company), Phone, Email and Time zone, then Notifications (its
// switches fold under it), Alerts on this phone, and Sign out. Locations and My pay aren't on this page.
describe('Owner and Manager Profile', () => {
  it('shows what today’s reads know at once, and says it is checking the rest', () => {
    const html = render(owner, null);
    for (const text of ['Fictional Owner', 'Puerto Rico', 'Checking…']) expect(html).toContain(text);
    // Phase 8: the role and the company are two whole parts of one line (it broke inside "Northside Café / & Bakery").
    expect(html).toContain('Owner</span><span class="eb-dots__p"><span class="eb-dots__sep" aria-hidden="true">·</span><span class="b-sr">, </span>Northside QA Workforce</span>');
    expect(html).not.toContain('role="switch"');
    // The read may still list the payroll topic (switched off); the page leaves it out without payroll.
    expect(render({ ...owner, payrollAlerts: false }, parseManagerProfile(fixture('owner'))).match(/role="switch"/g)).toHaveLength(4);
    expect(html).toContain('<p class="q-sr" role="alert" id="profile-read-said"></p>');
  });

  it('shows contact and alert switches when ready', () => {
    const html = render(owner, parseManagerProfile(fixture('owner')));
    // Formatted as on a person's page, the area code kept with the number (Owner premium, visual-craft Profile).
    expect(html).toContain('(787)\u00a0555-0100');
    // An address breaks only after the @ or before a dot (TC-02).
    expect(html).toContain('<span class="pmp-part">owner@</span></span><span><wbr/><span class="pmp-part">northside-qa</span>');
    expect(html).toContain('All notifications');
    expect(html.match(/role="switch"/g)).toHaveLength(5);
    expect(html).toContain('aria-checked="false"');
    expect(html).not.toContain('Old San Juan Kiosk');
  });

  it('gives a Manager no edit link and this phone’s alerts when the device allows them', () => {
    const html = render(manager, parseManagerProfile(fixture('manager')));
    expect(html).not.toContain('/app/employees/');
    expect(html).not.toContain('/app/my-pay');
    expect(html).toContain('popoverTarget="portal-device-settings"');
    // Nov 1 upscale: "this phone" on a phone and "this device" elsewhere (CSS picks one); a chevron, not a teal "Turn on".
    expect(html).toContain('Alerts on this <span class="pmp-device-phone">phone</span><span class="pmp-device-other">device</span>');
    expect(html).not.toContain('Turn on');
  });

  // Review Nov 11 (MG-013): a Manager's reach, from the locations the profile read gives; never more than the read says.
  it('tells a Manager what their access reaches and who can change a read-only detail', () => {
    const assigned = render({ ...manager, changedBy: 'Jose Natal', locationsWord: 'stores' }, parseManagerProfile(fixture('manager')));
    expect(assigned).toContain('<b>Access</b><i>Schedule and team at your stores. Payroll and Settings are for Owners.</i>');
    // Phase 2 (Nov 23, 2026): the band says "Manager", so the value is the reach only; who can change a locked value is
    // said to screen readers beside its lock, not as a visible line under every row.
    expect(assigned).toContain('<span class="q-rv q-rv--l">Main Office, West Office</span>');
    // Package X: a location reads by its short name, as on every other page; a name without one stays whole.
    const short = render({ ...manager, changedBy: 'Jose Natal', placeNames: { 'Main Office': 'Main' } }, parseManagerProfile(fixture('manager')));
    expect(short).toContain('<span class="q-rv q-rv--l">Main, West Office</span>');
    expect(assigned.match(/<span class="sr-only">, Jose Natal can change this<\/span>/g)).toHaveLength(2);
    expect(assigned).not.toContain('pmp-fixed__why');
    expect(assigned).not.toContain('Read-only');
    const all = render(manager, parseManagerProfile({ ...fixture('manager'), locations: { scope: 'all', names: ['Main Office'] } }));
    expect(all).toContain('<span class="q-rv q-rv--l">All locations</span>');
    expect(all).toContain('Schedule, time, team and requests. Payroll and Settings are for Owners.');
    expect(all).toContain('An Owner can change this<');
    // Before the read arrives, and when it fails, only the role is said: no locations are claimed.
    for (const html of [render(manager, null), render(manager, { state: 'unavailable', reason: 'read_failed' })]) {
      expect(html).toContain('<b>Access</b><i>Payroll and Settings are for Owners.</i></span><span class="q-rv q-rv--l">Manager</span>');
      expect(html).not.toContain('ll locations');
    }
    expect(managerAccess({ scope: 'assigned', names: [] })).toEqual({ value: 'Manager', covers: 'Payroll and Settings are for Owners.' });
    // An Owner's page has no Access row and no "can change this" line.
    const ownerHtml = render(owner, parseManagerProfile(fixture('owner')));
    expect(ownerHtml).not.toContain('<b>Access</b>');
    expect(ownerHtml).not.toContain('can change this');
  });

  it('says what is not there yet without blame words, and lets an Owner add an email', () => {
    const html = render(manager, parseManagerProfile(fixture('manager-empty')));
    // Package X: a Manager's empty value uses the Owner's words ("Not added"), not "None".
    expect(html.match(/<span>Not added<\/span>/g)).toHaveLength(2);
    expect(html).not.toContain('<span>None</span>');
    expect(html).not.toMatch(/missing|missed/i);
    const ownerEmpty = render(owner, parseManagerProfile({ ...fixture('owner'), contact: { email: null, phone: null } }));
    expect(ownerEmpty).toContain('href="/app/employees/qa-owner?edit=1"');
    // Nov 1 upscale: label + grey value + chevron, never a teal inline action.
    expect(ownerEmpty).toMatch(/<b>Email<\/b><\/span><span class="q-rv q-rv--l">Not added<\/span><svg[^>]*class="q-chev"/);
    expect(ownerEmpty).not.toContain('q-rv--go');
  });

  it('places the account rows after Notifications, with Sign out left to More and the sidebar (Owner premium A9)', () => {
    const html = render(owner, parseManagerProfile(fixture('owner')), { accountCards: <li id="test-account-cards" /> });
    const notifications = html.indexOf('id="profile-notifications"'), cards = html.indexOf('id="test-account-cards"');
    expect(cards).toBeGreaterThan(notifications);
    expect(html).not.toContain('Sign out');
  });

  it('keeps a phone extension with its number', () => {
    const large = parseManagerProfile(fixture('owner-large'));
    expect(render(owner, large)).toContain('<span class="pmp-part">ext. 4021</span>');
  });

  it('says a failed read in words, with Try again for the details and for the alert choices', () => {
    const failed = render(manager, { state: 'unavailable', reason: 'read_failed' });
    expect(failed).toContain('We couldn’t load your contact details, locations and alert choices.');
    expect(failed.match(/Couldn’t load</g)).toHaveLength(2);
    expect(failed).toContain('Your alert choices couldn’t load.');
    // The visible words are the accessible name (WCAG 2.5.3); the sentence describes them. Never disabled while busy.
    expect(failed.match(/<span data-shown="true">Try again<\/span>/g)).toHaveLength(2);
    expect(failed).not.toMatch(/<button[^>]*disabled[^>]*>Try again/);
    expect(render(manager, { state: 'unavailable', reason: 'read_failed' }, { retrying: true })).toContain('<span data-shown="true">Trying again…');
    expect(render(manager, { state: 'unavailable', reason: 'read_failed' }, { retried: 'failed' })).toContain('Still couldn’t load');
    expect(render(manager, parseManagerProfile(fixture('manager')), { retried: 'loaded' })).toContain('role="status">Your details loaded.');
    // The status region is always there (empty when nothing to say), so its words are spoken when they arrive.
    expect(render(manager, parseManagerProfile(fixture('manager')))).toContain('<p class="q-sr" role="status"></p>');
    const denied = render(manager, { state: 'unavailable', reason: 'access_denied' });
    expect(denied).toContain('Your session ended.');
    expect(denied).toContain('href="/login"');
    expect(denied).not.toContain('Try again');
  });

  it('pauses with words where the alert choices go', () => {
    const html = render(manager, null, { state: { snapshot: null, paused: true, refreshing: false } });
    expect(html).toMatch(/Updates paused|You’re offline/);
    expect(html).toMatch(/Your alert choices show again when/);
    expect(html).not.toContain('role="switch"');
  });

  it('holds the last read’s size while paused, and shows it while re-reading', () => {
    const last = parseManagerProfile(fixture('owner')) as Extract<ManagerProfileSnapshot, { state: 'ready' }>;
    const paused = render(owner, null, { state: { snapshot: null, paused: true, refreshing: false }, held: last });
    expect(paused).toMatch(/pmp-hold-value" aria-hidden="true">.*owner/);
    const rereading = render(owner, null, { held: last });
    expect(rereading).not.toContain('pmp-hold-value');
    expect(rereading).toMatch(/role="switch" aria-checked="true" class="q-row pmp-switch-row"[^>]*data-topic="[a-z-]+" aria-disabled="true"/);
    const denied = render(owner, { state: 'unavailable', reason: 'access_denied' }, { held: last });
    expect(denied).not.toContain('northside-qa');
  });

  it('marks a pending save as Saving… and a failed save in the row’s own space', () => {
    const ready = parseManagerProfile(fixture('manager'));
    const pending = render(manager, ready, { saves: { 'time-off': { pending: true, error: null } } });
    expect(pending).toMatch(/data-topic="time-off" aria-disabled="true" aria-busy="true"/);
    expect(pending).toContain('data-shown="true">Saving…');
    const failed = render(manager, ready, { saves: { 'time-off': { pending: false, error: 'failed' } } });
    expect(failed).toMatch(/data-shown="true" class="pmp-save-error">.*Not saved. Try again./);
    expect(render(manager, ready, { announcement: 'Time-off requests: Not saved. Try again.' })).toContain('role="status">Time-off requests: Not saved. Try again.');
    expect(failed).toContain('data-shown="false">When someone asks for time off');
  });

  it('keeps a saved choice on screen until a fresh read agrees', () => {
    const html = render(manager, parseManagerProfile(fixture('manager')), { overrides: { 'clock-review': true } });
    expect(html).not.toContain('aria-checked="false"');
  });

  it('keeps every Profile string at the 15px floor and in sentence case', () => {
    const css = readFileSync('src/app/app/premium-profile.css', 'utf8');
    expect(css).not.toMatch(/font-size:\s*(1[0-4]|[0-9])px/);
    expect(css).not.toMatch(/--nv-t-(tab|badge)/);
  });
});

describe('Profile passkeys row on a phone (Z2)', () => {
  it('puts Add a passkey under its explanation below 768px only', () => {
    const css = readFileSync(new URL('./manager-profile-upscale.css', import.meta.url), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');
    const rule = '.pmp-passkeys__row > .pk-section .pk-add { grid-column: 1; grid-row: auto; justify-self: start; }';
    const at = css.indexOf(rule);
    expect(at).toBeGreaterThan(-1);
    expect(css.indexOf(rule, at + 1)).toBe(-1);
    const media = css.slice(0, at).match(/@media [^{]*\{/g)?.at(-1);
    expect(media).toBe('@media (max-width: 767px) {');
  });
});

describe('Profile approval rows on a 320px phone (Z2)', () => {
  it('puts the value under its label below 360px only', () => {
    const css = readFileSync(new URL('../../app/app/owner-b-settings.css', import.meta.url), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');
    const at = css.indexOf('.q-row.pmp-access:not(#s-none):not(#s-none2):not(#s-none3):not(#s-none4):not(#s-none5):not(#s-none6):not(#z2) > .q-rv { grid-column: 1 !important; grid-row: 2 !important; justify-self: start !important; text-align: left !important; }');
    expect(at).toBeGreaterThan(-1);
    expect(css.slice(0, at).match(/@media [^{]*\{/g)?.at(-1)).toBe('@media (max-width: 359px) {');
    expect(css.slice(0, at).lastIndexOf('@layer nv-b {')).toBeGreaterThan(-1);
  });
});
