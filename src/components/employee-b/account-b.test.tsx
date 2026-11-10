import {renderToStaticMarkup} from 'react-dom/server';
import {describe, expect, it, vi} from 'vitest';
vi.mock('@/app/login/actions', () => ({logout: vi.fn()}));
import {EmployeeDocumentB, EmployeeHelpB, EmployeeMoreB} from './account-b';
import {EmployeeNotificationsB, EmployeeUpdateB, EmployeeUpdatesB, type NotificationsBList, type UpdatesBList} from './messages-b';
import {POLICY_DOCUMENTS, PRIVACY, SUPPORT, TERMS} from '../../lib/legal/policies';
import type {ReadyUpdate} from '../employee-mobile/messages-view';

/* Employee phones, Direction B, the Account group: the screens draw what their pages pass (fictional data only). */
const text = (html: string) => html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ');
const ids = (html: string) => [...html.matchAll(/\sid="([^"]+)"/g)].map(match => match[1]);
const noop = () => {};

describe('More', () => {
  const draw = (has = {availability: true, notifications: true, updates: true}, availability: string | null = 'Every day · 12 AM – 12 AM') =>
    renderToStaticMarkup(<EmployeeMoreB name="Fictional Person" place="Main Office · Fictional QA Workforce" availability={availability} has={has} count={<span className="q-count">2</span>} />);
  it('your face and places on glass, Profile and settings, every row More has, Sign out alone', () => {
    const html = draw(), plain = text(html);
    for (const value of ['More', 'Fictional Person', 'Main Office', 'Fictional QA Workforce', 'Profile and settings', 'Your work', 'Availability', 'Every day · 12 AM – 12 AM', 'Notifications', 'Updates',
      'Add shifts to your calendar', 'Apple, Google or Outlook', 'Help and legal', 'Help', 'Privacy and terms', 'Sign out']) expect(plain).toContain(value);
    for (const href of ['/app', '/app/profile', '/app/availability', '/app/notifications', '/app/updates', '/app/profile/calendar', '/app/help', '/privacy']) expect(html).toContain(`href="${href}"`);
    expect(html).toContain('class="eb-noacts"');expect(html).toContain('<button type="submit" class="eb-signout__btn">Sign out</button>');
    expect(html).toContain('class="q-count">2<');expect(html).not.toContain('Must read');
    expect(plain.indexOf('Availability')).toBeLessThan(plain.indexOf('Notifications'));expect(plain.indexOf('Updates')).toBeLessThan(plain.indexOf('Add shifts'));
  });
  it('only places the company has on, and no invented availability', () => {
    const html = draw({availability: false, notifications: true, updates: false});
    expect(html).not.toContain('/app/availability');expect(html).not.toContain('/app/updates');expect(html).toContain('/app/profile/calendar');
    expect(text(draw(undefined, null))).not.toContain('Every day');
  });
});

describe('Notifications', () => {
  const zone = 'America/Puerto_Rico', now = new Date('2026-11-05T19:42:00Z');
  const items = [
    {id: 'n1', label: 'Schedule update', at: '2026-11-05T18:10:00Z', href: '/app/schedule', reviewState: 'unread' as const, actionState: 'required' as const},
    {id: 'n2', label: 'Team update', at: '2026-11-04T15:02:00Z', href: '/app/updates/u1', reviewState: 'unread' as const, actionState: 'required' as const},
    {id: 'n3', label: 'Pay statement update', at: '2026-10-30T13:00:00Z', href: '/app/my-pay', reviewState: 'read' as const, actionState: 'none' as const},
  ];
  const list = (patch: Partial<NotificationsBList> = {}): NotificationsBList => ({items, partial: false, tab: 'all', onTab: noop, timeZone: zone, onOpen: noop, opening: null, more: false, now, ...patch});
  // Review B1 (NV-142): every notification that needs an action has an amber icon, whatever its kind.
  it('All and Unread on glass, grouped by day, a grey icon per kind (amber for one that needs you), time and a teal dot', () => {
    const html = renderToStaticMarkup(<EmployeeNotificationsB list={list()} settingsHref="/app/profile/device-alerts" />), plain = text(html);
    for (const value of ['Notifications', 'All', 'Unread 2', 'Today', 'Yesterday', 'Earlier', 'Schedule update', 'Action needed', 'Team update', 'Pay statement update', 'Settings']) expect(plain).toContain(value);
    expect(html).toContain('href="/app/profile/device-alerts"');expect(html).toContain('class="eb-noacts"');
    expect(html.match(/class="eb-unread"/g)).toHaveLength(2);expect(html.match(/b-ico b-ico--amber/g)).toHaveLength(2);
    expect(html).toContain('id="b-message-n1"');expect(html).toContain('href="/app/schedule"');expect(plain).toContain('Oct 30');
    expect(plain.indexOf('Today')).toBeLessThan(plain.indexOf('Yesterday'));expect(plain.indexOf('Yesterday')).toBeLessThan(plain.indexOf('Earlier'));
    const unique = ids(html);expect(new Set(unique).size).toBe(unique.length);
  });
  it('the Unread view, the empty states and the opening spinner', () => {
    expect(text(renderToStaticMarkup(<EmployeeNotificationsB list={list({tab: 'unread'})} />))).not.toContain('Pay statement update');
    expect(text(renderToStaticMarkup(<EmployeeNotificationsB list={list({items: []})} />))).toContain('No current notifications');
    expect(text(renderToStaticMarkup(<EmployeeNotificationsB list={list({items: [items[2]], tab: 'unread'})} />))).toContain('You’re all caught up');
    expect(renderToStaticMarkup(<EmployeeNotificationsB list={list({opening: 'n1'})} opening />)).toContain('aria-busy="true"');
    expect(renderToStaticMarkup(<EmployeeNotificationsB list={null} status={{copy: 'Your notifications couldn’t be checked.', retry: {label: 'Try again', onClick: noop}}} />)).toContain('Try again');
  });
});

const update = (patch: Partial<ReadyUpdate> = {}): ReadyUpdate => ({state: 'ready', id: 'u1', revisionId: 'r1', contentHash: 'a'.repeat(64), title: 'Holiday hours', body: 'Fictional store hours for the week.', type: 'OPERATIONAL_UPDATE',
  publishedAt: '2026-11-04T15:00:00Z', editedAt: null, acknowledgement: 'REQUIRED', ownAcknowledgedAt: null, ownReadAt: null, authority: 'fictional', observedAt: '2026-11-05T19:42:00Z', validForMs: 45000,
  timeZone: 'America/Puerto_Rico', expiresAt: null, authorContext: 'Management', canWithdraw: false, ...patch});

describe('Updates', () => {
  const list = (patch: Partial<UpdatesBList> = {}): UpdatesBList => ({items: [update(), update({id: 'u2', title: 'Break room rules', acknowledgement: 'NONE', ownReadAt: '2026-10-29T12:00:00Z', publishedAt: '2026-10-28T12:00:00Z'})],
    partial: false, search: '', filter: 'all', timeZone: 'America/Puerto_Rico', onSearch: noop, onFilter: noop, onOpen: noop, more: false, busy: false, onConfirm: noop, onCompose: noop, ...patch});
  it('search and Show on glass, To confirm with Open and Confirm, Earlier rows, Write an update at the foot', () => {
    const html = renderToStaticMarkup(<EmployeeUpdatesB list={list()} />), plain = text(html);
    for (const value of ['Updates', 'To confirm', 'Holiday hours', 'Must read', 'Management · Wed, Nov 4', 'Fictional store hours for the week.', 'Open', 'Confirm', 'Earlier', 'Break room rules', 'Write an update']) expect(plain).toContain(value);
    expect(html).toContain('placeholder="Search update titles"');expect(html).toMatch(/<select id="b-updates-filter"/);expect(html).toContain('href="/app/updates/compose"');expect(html).toContain('href="/app/more"');
    expect(html).toContain('href="/app/updates/u1"');expect(html).toContain('href="/app/updates/u2"');
    expect(plain.indexOf('To confirm')).toBeLessThan(plain.indexOf('Earlier'));// Employee desktop (Nov 8, 2026) also draws Write an update as the band's action (desktop only, eb-desk); the phone's row
    // is the last one, at the foot of the list.
    expect(plain.indexOf('Break room rules')).toBeLessThan(plain.lastIndexOf('Write an update'));
  });
  it('a search with no match, an empty page and a confirm in flight', () => {
    expect(text(renderToStaticMarkup(<EmployeeUpdatesB list={list({search: 'nothing like this'})} />))).toContain('No matches on this page');
    const empty = text(renderToStaticMarkup(<EmployeeUpdatesB list={list({items: []})} />));expect(empty).toContain('No current updates');expect(empty).toContain('Write an update');
    expect(renderToStaticMarkup(<EmployeeUpdatesB list={list({busy: true})} />)).toMatch(/aria-label="Confirm Holiday hours" disabled=""/);
    expect(text(renderToStaticMarkup(<EmployeeUpdatesB list={null} notice={{copy: 'Updates are turned off for your workspace. Your other employee tools remain available.'}} />))).toContain('Updates are turned off');
  });
  it('an update: its text, Acknowledge for a required one, and Withdraw reviewed first', () => {
    const html = renderToStaticMarkup(<EmployeeUpdateB back={{href: '/app/updates', label: 'Updates'}} item={update({canWithdraw: true})} busy={false} onAction={noop} withdraw={false} onWithdraw={noop} />), plain = text(html);
    for (const value of ['Team update', 'Holiday hours', 'Must read', 'Your acknowledgement is required.', 'Acknowledge update', 'Withdraw update']) expect(plain).toContain(value);
    expect(plain).not.toContain('Mark as read');
    expect(text(renderToStaticMarkup(<EmployeeUpdateB back={{href: '/app/updates', label: 'Updates'}} item={update({canWithdraw: true})} busy={false} onAction={noop} withdraw onWithdraw={noop} />))).toContain('Confirm withdrawal');
  });
});

describe('Help and the policy pages', () => {
  it('Help: Contact with the reply time in the card, the questions that open in place, and the policy pages', () => {
    const html = renderToStaticMarkup(<EmployeeHelpB email="support@thevelani.com" response="Fictional reply time." signIn={[{p: ['Fictional sign-in help.']}]} work={[{p: ['Ask your manager.']}]} report={[{p: ['Fictional report help.']}]} legal />), plain = text(html);
    for (const value of ['Help', 'Contact support or find an answer', 'Email support', 'support@thevelani.com', 'Fictional reply time.', 'Never email passwords, codes, bank details or pay documents.', 'I can’t sign in', 'Shift, time off or pay', 'Ask your manager', 'Report a problem', 'Privacy Policy', 'Terms of Use', 'Account deletion']) expect(plain).toContain(value);
    expect(html).toContain('href="mailto:support@thevelani.com"');expect(html.match(/<details class="eb-q">/g)).toHaveLength(3);expect(plain).not.toContain('Your manager can reset it');
    for (const href of ['/app/profile/privacy', '/app/profile/terms', '/app/profile/account-deletion']) expect(html).toContain(`href="${href}"`);
    expect(renderToStaticMarkup(<EmployeeHelpB email="support@thevelani.com" response={null} signIn={null} work={null} report={[]} legal={false} />)).not.toContain('Privacy and terms');
  });
  it('a policy page: the first section open, the rest in one list that opens in place, the links without separators', () => {
    const html = renderToStaticMarkup(<EmployeeDocumentB doc={PRIVACY} sub="Effective October 20, 2026 · VELANI LLC" back="/app/profile#profile-privacy" documents={POLICY_DOCUMENTS} />), plain = text(html);
    expect(plain).toContain('Privacy Policy');expect(plain).toContain('Effective October 20, 2026 · VELANI LLC');expect(plain).toContain(PRIVACY.summary);expect(plain).toContain('In this policy');
    expect(html.match(/<details class="eb-doc__first" open="">/g)).toHaveLength(1);expect(html.match(/<details class="eb-doc__sec">/g)).toHaveLength(PRIVACY.sections.length - 1);
    expect(html).toContain('href="/app/profile#profile-privacy"');expect(html).toContain('<span aria-current="page">');expect(html).toContain('href="/app/profile/terms"');expect(html).not.toMatch(/eb-doc__links[^]*·[^]*<\/nav>/);
    expect(text(renderToStaticMarkup(<EmployeeDocumentB doc={TERMS} sub="x" back="/app/profile#profile-terms" documents={POLICY_DOCUMENTS} />))).toContain('In these terms');
    expect(renderToStaticMarkup(<EmployeeDocumentB doc={SUPPORT} sub="x" back="/app/profile#profile-support" documents={POLICY_DOCUMENTS} />)).not.toContain('In this policy');
  });
});
