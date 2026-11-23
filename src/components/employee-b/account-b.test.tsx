import {renderToStaticMarkup} from 'react-dom/server';
import {describe, expect, it, rs} from '@rstest/core';
rs.mock('@/app/login/actions', () => ({logout: rs.fn()}));
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
    expect(html).toContain('class="eb-noacts"');// Phase 4 (EM-028): Sign out is a pill with its glyph, not a card.
    expect(html).toMatch(/<div class="eb-signout"><form[^>]*><button type="submit" class="eb-signout__btn"><svg[^>]*aria-hidden="true"[^>]*>.*?<\/svg>Sign out<\/button>/);expect(html).not.toContain('b-card eb-signout');
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
    // Inspection Nov 14 (BR-6, EM-005): each title says what happened, not the category's name.
    for (const value of ['Notifications', 'All', 'Unread 2', 'Today', 'Yesterday', 'Earlier', 'Confirm your schedule', 'Action needed', 'Acknowledge the team update', 'Pay statement shared', 'Settings']) expect(plain).toContain(value);
    for (const gone of ['Schedule update', 'Pay statement update']) expect(plain).not.toContain(gone);expect(plain).not.toMatch(/Team update(?! to acknowledge)/);
    // Sweep Z (B3): rows are named by their own text; the unread dot's meaning is b-sr text inside the row.
    expect(html).not.toMatch(/<a [^>]*class="b-row b-row--link eb-notif[^"]*"[^>]*aria-label=/);expect(html).toContain('<span class="b-sr">unread, </span>');
    expect(html).toContain('href="/app/profile/device-alerts"');expect(html).toContain('class="eb-noacts"');
    expect(html.match(/class="eb-unread"/g)).toHaveLength(2);expect(html.match(/b-ico b-ico--amber/g)).toHaveLength(2);
    // Phase 4 (EM-009): "Action needed" is the amber chip, the dot comes before the time, and an earlier day shows its date then its hour.
    expect(html.match(/b-chip b-chip--amber">Action needed</g)).toHaveLength(2);expect(html).toMatch(/<i class="eb-unread" aria-hidden="true"><\/i><span class="b-sr">unread, <\/span><span class="eb-when__t">2:10 PM<\/span>/);
    expect(html).toContain('<span class="eb-when__t">Oct 30, 9:00 AM</span>');expect(html.match(/eb-notif--unread/g)).toHaveLength(2);
    // On phones the time ends the sub-line instead (the wide and phone copies are shown by width; the label says it once).
    expect(html.match(/eb-notif__o--p/g)).toHaveLength(3);expect(html.match(/eb-notif__s--p/g)).toHaveLength(1);expect(html).not.toContain('eb-notif__o--w');
    expect(html).toContain('id="b-message-n1"');expect(html).toContain('href="/app/schedule"');expect(plain).toContain('Oct 30');
    expect(plain.indexOf('Today')).toBeLessThan(plain.indexOf('Yesterday'));expect(plain.indexOf('Yesterday')).toBeLessThan(plain.indexOf('Earlier'));
    const unique = ids(html);expect(new Set(unique).size).toBe(unique.length);
  });
  // Phase 8 (review C, row 18): the same reminder sent twice is one row that opens in place, each notice read on its own.
  it('folds the same notice sent more than once into one row that opens in place', () => {
    const again = [items[0], {...items[0], id: 'n1b', at: '2026-11-05T17:10:00Z', reviewState: 'read' as const}, items[2]];
    const html = renderToStaticMarkup(<EmployeeNotificationsB list={list({items: again})} />), plain = text(html);
    expect(html.match(/<button type="button" class="b-row b-row--link eb-notif eb-fold eb-notif--unread" id="b-fold-today-n1" aria-expanded="false"/g)).toHaveLength(1);
    expect(plain).toContain('Confirm your schedule');expect(plain).toContain('2 notifications');
    // Closed, neither notice is a separate row yet; the Earlier one is unchanged.
    expect(html).not.toContain('id="b-message-n1"');expect(html).not.toContain('id="b-message-n1b"');expect(html).toContain('id="b-message-n3"');
    expect(html).not.toMatch(/<button [^>]*class="b-row b-row--link eb-notif eb-fold[^"]*"[^>]*aria-label=/);expect(html).toContain('<span class="b-sr">1 unread, </span>');
  });
  // Phase 4 (EM-005): the title is the outcome and the sub-line is what it is about, from the event type and subject the list sends.
  it('a decision leads with its state and says its dates; a schedule says its week and shifts; a swap says who asked', async () => {
    const facts = [
      {id: 'a', label: 'Time off approved', eventType: 'TIME_OFF_APPROVED', outcome: 'APPROVED', subject: {kind: 'requestDate' as const, startDate: '2026-11-30', endDate: '2026-12-02'}, at: '2026-11-05T18:10:00Z', href: '/app/requests', reviewState: 'unread' as const, actionState: 'none' as const},
      {id: 'b', label: 'Time off declined', eventType: 'TIME_OFF_DENIED', outcome: 'DENIED', subject: {kind: 'requestDate' as const, startDate: '2026-12-05', endDate: '2026-12-05'}, at: '2026-11-05T17:10:00Z', href: '/app/requests', reviewState: 'read' as const, actionState: 'none' as const},
      {id: 'c', label: 'Schedule published', eventType: 'SCHEDULE_PUBLISHED', count: 2, subject: {kind: 'scheduleWeek' as const, startDate: '2026-11-09', endDate: '2026-11-15'}, at: '2026-11-05T16:10:00Z', href: '/app/schedule', reviewState: 'read' as const, actionState: 'complete' as const},
      {id: 'd', label: 'Shift swap', eventType: 'SWAP_RESPONSE_REQUIRED', names: ['Ana Colon'], subject: {kind: 'requestDate' as const, startDate: '2026-11-28', endDate: '2026-11-28'}, at: '2026-11-05T15:10:00Z', href: '/app/exchange', reviewState: 'unread' as const, actionState: 'available' as const},
    ];
    const html = renderToStaticMarkup(<EmployeeNotificationsB list={list({items: facts})} />), plain = text(html);
    for (const value of ['Time off approved', 'Nov 30–Dec 2', 'Time off declined', 'Sat, Dec 5', 'Schedule published', 'Week of Nov 9', '2 shifts', 'Swap request waiting for you', 'Sat, Nov 28', 'From Ana Colon']) expect(plain).toContain(value);
    expect(html).not.toContain('aria-label="Time off approved');expect(html).not.toContain('aria-label="Schedule published');
    expect(html.match(/b-ico b-ico--green/g)).toHaveLength(1);expect(html.match(/eb-notif--declined/g)).toHaveLength(1);expect(plain).not.toContain('Action needed');
    // Final polish, round 2 (H2, N1): a swap that waits for this person's answer is amber with the Requests page's chip,
    // and a row's parts keep one order: title, grey line, then the chip.
    expect(html.match(/b-chip b-chip--amber">Needs your answer</g)).toHaveLength(1);expect(html.match(/b-ico b-ico--amber/g)).toHaveLength(1);
    expect(html).not.toContain('aria-label="Swap request waiting for you');
    const swapRow = html.slice(html.indexOf('id="b-message-d"'));
    expect(swapRow.indexOf('Swap request waiting for you')).toBeLessThan(swapRow.indexOf('From Ana Colon'));expect(swapRow.indexOf('From Ana Colon')).toBeLessThan(swapRow.indexOf('Needs your answer<'));
    // Final review C (row 16): a declined time off keeps its kind's glyph (CalendarMinus) in the grey circle; no x.
    const {CalendarMinusIcon} = await import('@phosphor-icons/react/dist/ssr/CalendarMinus');
    const {XIcon} = await import('@phosphor-icons/react/dist/ssr/X');
    const declined = html.slice(html.indexOf('id="b-message-b"'), html.indexOf('</a>', html.indexOf('id="b-message-b"')));
    expect(declined).toContain('<span class="b-ico b-ico--grey" aria-hidden="true">' + renderToStaticMarkup(<CalendarMinusIcon weight="duotone" />));
    expect(html).not.toContain(renderToStaticMarkup(<XIcon weight="bold" />));
  });
  it('final review C (row 4): confirming your schedule is CalendarCheck and Availability is UserCheck, as on Home and More', async () => {
    const {CalendarCheckIcon} = await import('@phosphor-icons/react/dist/ssr/CalendarCheck');
    const {UserCheckIcon} = await import('@phosphor-icons/react/dist/ssr/UserCheck');
    const html = renderToStaticMarkup(<EmployeeNotificationsB list={list({items: [items[0], {...items[2], id: 'av', label: 'Availability', eventType: 'AVAILABILITY_REMINDER'}]})} />);
    expect(html).toContain('<span class="b-ico b-ico--amber" aria-hidden="true">' + renderToStaticMarkup(<CalendarCheckIcon weight="duotone" />));
    const availability = html.slice(html.indexOf('id="b-message-av"'), html.indexOf('</a>', html.indexOf('id="b-message-av"')));
    expect(availability).toContain(renderToStaticMarkup(<UserCheckIcon weight="duotone" />));
    const more = renderToStaticMarkup(<EmployeeMoreB name="James Ortiz" place="Main Office" availability="Usual week" count={null} has={{availability: true, notifications: true, updates: true}} />);
    expect(more.slice(more.indexOf('href="/app/availability"'))).toContain(renderToStaticMarkup(<UserCheckIcon weight="duotone" />));
  });
  it('the Unread view, the empty states and the opening spinner', () => {
    expect(text(renderToStaticMarkup(<EmployeeNotificationsB list={list({tab: 'unread'})} />))).not.toContain('Pay statement shared');
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
  it('search and Show on glass, To acknowledge with Open and Acknowledge, Other updates rows, Write an update at the foot', () => {
    const html = renderToStaticMarkup(<EmployeeUpdatesB list={list()} />), plain = text(html);
    for (const value of ['Updates', 'To acknowledge', 'Holiday hours', 'Action needed', /* B6 (NV-157): a Dotted line */'Management', 'Wed, Nov 4', 'Fictional store hours for the week.', 'Open', /* B7 wording (NV-284): one verb */'Acknowledge', 'Other updates', 'Break room rules', 'Write an update']) expect(plain).toContain(value);
    expect(html).toContain('placeholder="Search update titles"');expect(html).toMatch(/<select id="b-updates-filter"/);expect(html).toContain('href="/app/updates/compose"');expect(html).toContain('href="/app/more"');
    expect(html).toContain('href="/app/updates/u1"');expect(html).toContain('href="/app/updates/u2"');
    expect(plain.indexOf('To acknowledge')).toBeLessThan(plain.indexOf('Other updates'));
    // Review B6 (NV-166): Write an update is the band's action at every width (white on desktop, glass on the phone), not a
    // row under the read items.
    expect(plain.indexOf('Write an update')).toBeLessThan(plain.indexOf('To acknowledge'));expect(html).not.toContain('class="b-add"');
    // Final review C (row 5): the update that waits for you leads with the amber circle; the read-only rows don't.
    expect(html).toContain('<div class="b-row eb-upd__head"><span class="b-ico b-ico--amber" aria-hidden="true">');
    // Phase 4 (EM-021): one glass pill at every width; (EM-033) a preview has no line breaks; an unread row's word is for its label only.
    expect(html.match(/href="\/app\/updates\/compose"/g)).toHaveLength(1);expect(html).toContain('class="b-btn b-btn--glass eb-write"');expect(html).not.toContain('b-btn--white');
    const breaks = renderToStaticMarkup(<EmployeeUpdatesB list={list({items: [update({body: 'First line.\nSecond line.\n\nThird.'}), update({id: 'u3', title: 'Unread one', acknowledgement: 'NONE'})]})} />);
    expect(breaks).toContain('<p class="eb-upd__body">First line. Second line. Third.</p>');expect(breaks).toContain('aria-label="Unread one, Unread, ');expect(text(breaks)).not.toMatch(/Nov 4 Unread|· Unread/);expect(breaks).toContain('eb-updrow--unread');
  });
  it('a search with no match, an empty page and a confirm in flight', () => {
    expect(text(renderToStaticMarkup(<EmployeeUpdatesB list={list({search: 'nothing like this'})} />))).toContain('No matches on this page');
    const empty = text(renderToStaticMarkup(<EmployeeUpdatesB list={list({items: []})} />));expect(empty).toContain('No current updates');expect(empty).toContain('Write an update');
    expect(renderToStaticMarkup(<EmployeeUpdatesB list={list({busy: true})} />)).toMatch(/aria-label="Acknowledge Holiday hours" disabled=""/);
    expect(text(renderToStaticMarkup(<EmployeeUpdatesB list={null} notice={{copy: 'Updates are turned off for your workspace. Your other employee tools remain available.'}} />))).toContain('Updates are turned off');
  });
  it('an update: its text, Acknowledge for a required one, and Withdraw reviewed first', () => {
    const html = renderToStaticMarkup(<EmployeeUpdateB back={{href: '/app/updates', label: 'Updates'}} item={update({canWithdraw: true})} busy={false} onAction={noop} withdraw={false} onWithdraw={noop} />), plain = text(html);
    for (const value of ['Team update', 'Holiday hours', 'Action needed', 'Your acknowledgement is required.', 'Acknowledge update', 'Withdraw update']) expect(plain).toContain(value);
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
    // Phase 9 (spec 2.3, 2.4): the safety note is the kit's teal callout with a title, its sentence unchanged; no circle in a tint.
    expect(html).toContain('<div class="b-callout" data-tone="teal"><span class="b-callout__ic" aria-hidden="true">');
    expect(html).toContain('<p class="b-callout__t">Keep private details out of email</p><div class="b-callout__b">Never email passwords, codes, bank details or pay documents.</div>');
    expect(html).not.toContain('eb-help-warn');
  });
  it('a policy page: every section once in one list, the first open, no restated intro, the other pages as links', () => {
    const html = renderToStaticMarkup(<EmployeeDocumentB doc={PRIVACY} sub="Effective October 20, 2026 · VELANI LLC" back="/app/profile#profile-privacy" documents={POLICY_DOCUMENTS} />), plain = text(html);
    expect(plain).toContain('Privacy Policy');expect(plain).toContain('Effective October 20, 2026 · VELANI LLC');expect(plain).toContain('In this policy');
    // Batch 1 (item 15): the summary is restated by Who we are, so it isn't drawn; no contents list repeats the titles.
    expect(plain).not.toContain(PRIVACY.summary);expect(html).not.toContain('eb-toc');
    for (const section of PRIVACY.sections) expect(plain.split(section.heading).length - 1).toBeGreaterThanOrEqual(1);
    expect(html.match(/<details class="eb-doc__sec" open="">/g)).toHaveLength(1);expect(html.match(/<details class="eb-doc__sec"/g)).toHaveLength(PRIVACY.sections.length);
    expect(plain.indexOf('In this policy')).toBeLessThan(plain.indexOf(PRIVACY.sections[0]!.heading));
    expect(html).toContain('href="/app/profile#profile-privacy"');expect(html).not.toContain('aria-current="page"');expect(html).not.toContain('href="/app/profile/privacy"');expect(html).toContain('href="/app/profile/terms"');expect(html).not.toMatch(/eb-doc__links[^]*·[^]*<\/nav>/);
    const terms = renderToStaticMarkup(<EmployeeDocumentB doc={TERMS} sub="x" back="/app/profile#profile-terms" documents={POLICY_DOCUMENTS} />);
    expect(text(terms)).toContain(TERMS.summary);
    expect(text(renderToStaticMarkup(<EmployeeDocumentB doc={TERMS} sub="x" back="/app/profile#profile-terms" documents={POLICY_DOCUMENTS} />))).toContain('In these terms');
    expect(renderToStaticMarkup(<EmployeeDocumentB doc={SUPPORT} sub="x" back="/app/profile#profile-support" documents={POLICY_DOCUMENTS} />)).not.toContain('In this policy');
  });
});
