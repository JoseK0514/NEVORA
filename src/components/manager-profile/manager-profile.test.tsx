import { readdirSync, readFileSync } from 'node:fs';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { parseManagerProfile, type ManagerProfileSnapshot } from './contract';
import { ALERT_TOPIC_COUNT, ManagerProfileView, type ManagerProfileIdentity } from './manager-profile-live';

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
    for (const text of ['Fictional Owner', 'Owner · Northside QA Workforce', 'Puerto Rico', 'Checking…']) expect(html).toContain(text);
    expect(html).not.toContain('role="switch"');
    // The read may still list the payroll topic (switched off); the page leaves it out without payroll.
    expect(render({ ...owner, payrollAlerts: false }, parseManagerProfile(fixture('owner'))).match(/role="switch"/g)).toHaveLength(4);
    expect(html).toContain('<p class="q-sr" role="alert" id="profile-read-said"></p>');
  });

  it('shows contact and alert switches when ready', () => {
    const html = render(owner, parseManagerProfile(fixture('owner')));
    expect(html).toContain('787-555-0100');
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
  });

  it('says what is not there yet without blame words, and lets an Owner add an email', () => {
    const html = render(manager, parseManagerProfile(fixture('manager-empty')));
    expect(html.match(/<span>None<\/span>/g)).toHaveLength(2);
    expect(html).not.toMatch(/missing|missed/i);
    const ownerEmpty = render(owner, parseManagerProfile({ ...fixture('owner'), contact: { email: null, phone: null } }));
    expect(ownerEmpty).toContain('href="/app/employees/qa-owner?edit=1"');
  });

  it('places the account rows after Notifications and before Sign out', () => {
    const html = render(owner, parseManagerProfile(fixture('owner')), { accountCards: <li id="test-account-cards" /> });
    const notifications = html.indexOf('id="profile-notifications"'), cards = html.indexOf('id="test-account-cards"'), signout = html.indexOf('q-btn q-btn--danger');
    expect(cards).toBeGreaterThan(notifications);
    expect(signout).toBeGreaterThan(cards);
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
