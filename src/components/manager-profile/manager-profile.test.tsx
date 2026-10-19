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

describe('Owner and Manager Profile', () => {
  it('shows what today’s reads know at once, and holds the contract rows with placeholders while loading', () => {
    const html = render(owner, null);
    for (const text of ['Fictional Owner', 'Owner', 'Northside QA Workforce', 'Puerto Rico time', 'Checking…']) expect(html).toContain(text);
    expect(html.match(/Not shown yet/g)).toHaveLength(3);
    expect(html.match(/pmp-topic-placeholder/g)).toHaveLength(ALERT_TOPIC_COUNT.owner);
    expect(html).toContain('<p class="sr-only" role="alert" id="profile-read-said"></p>');
  });

  it('shows contact, locations and alert switches when ready', () => {
    const html = render(owner, parseManagerProfile(fixture('owner')));
    expect(html).toContain('All 3 locations');
    expect(html).not.toContain('Show names');
    expect(html).not.toContain('Old San Juan Kiosk');
    expect(html).toContain('787-555-0100');
    expect(html.match(/role="switch"/g)).toHaveLength(5);
    expect(html).toContain('aria-checked="false"');
    expect(html).toContain('href="/app/employees/qa-owner"');
    expect(html).toContain('href="/app/my-pay"');
  });

  it('gives a Manager the ask-the-owner note, no edit link, and My pay only when the nav offers it', () => {
    const html = render(manager, parseManagerProfile(fixture('manager')));
    expect(html).toContain('Ask the account owner to update it.');
    expect(html).not.toContain('/app/employees/');
    expect(html).not.toContain('/app/my-pay');
    expect(html).toContain('popoverTarget="portal-device-settings"');
  });

  it('says what is not there yet without blame words', () => {
    const html = render(manager, parseManagerProfile(fixture('manager-empty')));
    expect(html.match(/Not added/g)).toHaveLength(2);
    expect(html).toContain('None assigned yet');
    expect(html).not.toMatch(/missing|missed/i);
  });

  it('says All N locations in one line, and puts Show all before a long assigned list', () => {
    const all = render(owner, parseManagerProfile(fixture('owner-large')));
    expect(all).toContain('All 60 locations');
    expect(all).not.toContain('aria-expanded');
    const large = fixture('owner-large');
    const assigned = render(manager, parseManagerProfile({ ...large, locations: { scope: 'assigned', names: large.locations.names }, alerts: fixture('manager').alerts }));
    expect(assigned).toMatch(/60 locations<\/span><button[^>]*aria-expanded="false"[^>]*>Show all 60<\/button><ul/);
    expect(assigned.match(/<ul class="pmp-locations"[^>]*>(.*?)<\/ul>/)?.[1].match(/<li>/g)).toHaveLength(5);
  });

  it('says a failed read in words in the space it already has, with Try again in the head line', () => {
    const failed = render(manager, { state: 'unavailable', reason: 'read_failed' });
    expect(failed).toContain('We couldn’t load your contact details, locations and alert choices.');
    expect(failed.match(/Couldn’t load</g)).toHaveLength(3);
    expect(failed).toContain('Your alert choices couldn’t load.');
    // The visible words are the accessible name (WCAG 2.5.3); the sentence describes them. Never disabled while busy.
    expect(failed.match(/aria-describedby="profile-read-said">Try again</g)).toHaveLength(2);
    expect(failed).not.toMatch(/<button[^>]*disabled[^>]*>Try again/);
    expect(render(manager, { state: 'unavailable', reason: 'read_failed' }, { retrying: true })).toContain('aria-busy="true" aria-describedby="profile-read-said">Trying again…');
    expect(render(manager, { state: 'unavailable', reason: 'read_failed' }, { retried: 'failed' })).toContain('Still couldn’t load');
    expect(render(manager, parseManagerProfile(fixture('manager')), { retried: 'loaded' })).toContain('Your details loaded.');
    const denied = render(manager, { state: 'unavailable', reason: 'access_denied' });
    expect(denied).toContain('Your session ended.');
    expect(denied).toContain('href="/login"');
    expect(denied).not.toContain('Try again');
  });

  it('pauses with words in the head line and in the alert list’s reserved space', () => {
    const html = render(manager, null, { state: { snapshot: null, paused: true, refreshing: false } });
    expect(html).toMatch(/Updates paused|You’re offline/);
    expect(html).toMatch(/Your alert choices show again when/);
    expect(html).toContain('style="--pmp-rows:4"');
    expect(html).not.toContain('pmp-topic-placeholder');
  });

  it('marks a pending save as Saving… and disabled, and a failed save in the row’s own space', () => {
    const ready = parseManagerProfile(fixture('manager'));
    const pending = render(manager, ready, { saves: { 'time-off': { pending: true, error: null } } });
    expect(pending).toMatch(/aria-checked="true" class="nv-row pmp-switch-row" aria-disabled="true" aria-busy="true"/);
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
