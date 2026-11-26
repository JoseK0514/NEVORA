import {describe, expect, it} from '@rstest/core';
import {renderToStaticMarkup} from 'react-dom/server';
import {reminderCopy, type ReminderLang} from './copy';
import {buildCommand, type ReminderState, type ReminderTarget} from './machine';
import {reminderLine} from './view';
import type {ReminderStore} from './use-reminders';

import {ManyBody, OneBody, ReminderBulkButton, ReminderControl, ReminderControlView, ReminderProvider, type ReminderUi} from './reminders';

const AUTH = 'a'.repeat(64), NOTE = '33333333-3333-4333-8333-333333333333', TZ = 'America/Puerto_Rico', now = new Date('2026-11-17T15:00:00.000Z');
const people: ReminderTarget[] = ['Ana Colon', 'Daniel Cruz', 'Maria Rivera', 'Valeria Díaz'].map((name, index) => ({employeeId: `fictional-${index}`, name, source: {kind: 'AVAILABILITY', weekStart: '2026-11-23', expectedDeadline: '2026-11-20T21:00:00.000Z'}}));
const command = buildCommand(people[0], AUTH, '11111111-1111-4111-8111-111111111111');
const receipt = {operationId: command.operationId, notificationId: NOTE} as const;
const states: Record<string, ReminderState> = {
  loading: {phase: 'checking', command},
  ready: {phase: 'ready', command, dueAt: '2026-11-17T19:02:00.000Z', expiresAt: '2026-11-20T21:00:00.000Z', timeZone: TZ},
  cooldown: {phase: 'cooldown', command, nextEligibleAt: '2026-11-18T01:00:00.000Z'},
  cooldownNone: {phase: 'cooldown', command, nextEligibleAt: null},
  sending: {phase: 'sending', command},
  queued: {phase: 'queued', command, ...receipt, disposition: 'queued', at: '2026-11-17T19:02:00.000Z'},
  queuedRecovered: {phase: 'queued', command, ...receipt, disposition: 'queued', at: null},
  alreadyQueued: {phase: 'queued', command, ...receipt, disposition: 'already_queued', at: null},
  held: {phase: 'held', command, reason: 'activation_held', kept: false},
  heldModule: {phase: 'held', command, reason: 'module_off', kept: false},
  blocked: {phase: 'blocked', command, reason: 'access_denied'},
  signedOut: {phase: 'blocked', command, reason: 'signed_out'},
  stale: {phase: 'blocked', command, reason: 'invalid_command'},
  conflict: {phase: 'conflict', command, reason: 'changed'},
  tooLate: {phase: 'conflict', command, reason: 'expires_first'},
  unknown: {phase: 'unknown', command, looking: false, note: 'first'},
  unknownLooking: {phase: 'unknown', command, looking: true, note: 'first', asked: true},
  unknownStill: {phase: 'unknown', command, looking: false, note: 'still'},
  unknownAccess: {phase: 'unknown', command, looking: false, note: 'access'},
  notSent: {phase: 'not_sent', command},
  error: {phase: 'error', command, reference: NOTE},
};
const text = (html: string) => html.replace(/<[^>]+>/g, ' ').replace(/&#x27;|&#39;/g, '’').replace(/&amp;/g, '&').replace(/\s+/g, ' ').trim();
const row = (state: ReminderState, lang: ReminderLang, extra: {actor?: 'OWNER' | 'MANAGER'; offline?: boolean} = {}) =>
  renderToStaticMarkup(<ReminderControlView name="Ana Colon" phase={state.phase} lang={lang} offline={extra.offline} line={reminderLine(state, {lang, timeZone: TZ, actor: extra.actor ?? 'OWNER', now})} onAction={() => {}} />);

/** Every plain English sentence of the feature: none may appear in a Spanish render. */
const englishOnly = Object.entries(reminderCopy.en).flatMap(([key, value]) => {
  const en = typeof value === 'function' ? (value as (...args: unknown[]) => string)('Ana Colon', 'X') : value;
  const esValue = reminderCopy.es[key as keyof typeof reminderCopy.es];
  const es = typeof esValue === 'function' ? (esValue as (...args: unknown[]) => string)('Ana Colon', 'X') : esValue;
  return en !== es ? [en] : [];
});
const noEnglish = (html: string) => { const shown = text(html); for (const sentence of englishOnly) expect(shown, sentence).not.toMatch(new RegExp(`(?<![\\p{L}])${sentence.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(?![\\p{L}])`, 'u')); expect(shown).not.toMatch(/undefined|\[object|NaN/); };

describe('reminder row control, English', () => {
  it('ready is a tinted Remind pill that opens a dialog, never a filled button', () => {
    const html = row(states.ready, 'en');
    expect(html).toContain('b-btn--ghost');
    expect(html).not.toContain('b-btn--teal');
    expect(html).toContain('aria-haspopup="dialog"');
    expect(html).toContain('aria-label="Remind Ana Colon"');
    expect(text(html)).toBe('Remind');
  });
  it('loading is a quiet placeholder with words for screen readers, not a spinner or a button', () => {
    const html = row(states.loading, 'en');
    expect(html).toContain('b-rem__ph');
    expect(html).not.toContain('<button');
    expect(text(html)).toBe('Checking if a reminder can go');
  });
  it('says each state in plain words', () => {
    const said = Object.fromEntries(Object.entries(states).map(([name, state]) => [name, text(row(state, 'en'))]));
    expect(said).toMatchObject({
      cooldown: 'One reminder a day · can remind again today after 9:00 PM',
      cooldownNone: 'One reminder a day · no time left before this closes',
      sending: 'Queuing reminder…',
      queued: 'Reminder queued · 3:02 PM',
      queuedRecovered: 'Reminder queued',
      alreadyQueued: 'Reminder already queued',
      held: 'On hold: reminders are paused for this workplace',
      heldModule: 'On hold: Updates is off for this workplace',
      blocked: 'Can’t remind: your current access doesn’t cover this. Nothing was sent. Contact support',
      signedOut: 'Can’t remind: your session ended. Nothing was sent. Sign in again',
      stale: 'Can’t remind: this page is out of date. Nothing was sent. Refresh',
      conflict: 'This changed while you were looking. Refresh',
      tooLate: 'Too late to remind: this closes before a reminder could go out. Refresh',
      unknown: 'We couldn’t confirm this reminder. Check again',
      unknownLooking: 'We couldn’t confirm this reminder. Checking…',
      unknownStill: 'Still not confirmed. Nothing new was sent. Check again',
      unknownAccess: 'We couldn’t confirm this reminder. Sign in again, then check. Check again',
      notSent: 'Not confirmed yet. No queue receipt was found. It may still be queued. Send again',
      error: `Couldn’t check if a reminder can go. Support reference ${NOTE} Try again`,
    });
  });
  it('a queue receipt is never shown as sent or delivered, and unknown is never shown as failed or done', () => {
    for (const name of ['queued', 'queuedRecovered', 'alreadyQueued'] as const) expect(text(row(states[name], 'en'))).not.toMatch(/sent|delivered/i);
    for (const name of ['unknown', 'unknownStill', 'unknownAccess', 'unknownLooking'] as const) {
      const html = row(states[name], 'en');
      expect(text(html)).not.toMatch(/failed|didn’t go|queued|delivered/i);
      expect(html).toContain('data-tone="amber"');
    }
  });
  it('tones: held, conflict, unknown and a failed check are amber; blocked is red; the rest are grey', () => {
    const tone = (name: string) => reminderLine(states[name], {timeZone: TZ, actor: 'OWNER', now}).tone;
    expect(['held', 'heldModule', 'conflict', 'tooLate', 'unknown', 'error'].map(tone)).toEqual(Array(6).fill('amber'));
    expect(['blocked', 'signedOut', 'stale'].map(tone)).toEqual(Array(3).fill('red'));
    expect(['cooldown', 'queued', 'alreadyQueued', 'sending'].map(tone)).toEqual(Array(4).fill('grey'));
    expect(tone('notSent')).toBe('amber');
    // Colour is never the only signal: amber and red lines carry an icon too.
    for (const name of ['held', 'blocked', 'conflict', 'unknown']) expect(row(states[name], 'en')).toContain('<svg');
  });
  it('a Manager without access is told nothing was sent and to ask the Owner (manual Owner help); it gives no button to try again', () => {
    const html = row(states.blocked, 'en', {actor: 'MANAGER'});
    expect(text(html)).toBe('Can’t remind: your access doesn’t cover this. Nothing was sent. Ask your workplace Owner to review your access. Contact support');
    expect(html).toContain('href="/support"');
    expect(html).not.toContain('<button');
  });
  it('offline: the pill is disabled and says why', () => {
    const html = row(states.ready, 'en', {offline: true});
    expect(html).toMatch(/<button[^>]*disabled=""/);
    expect(html).toMatch(/aria-describedby="[^"]+"/);
    expect(text(html)).toBe('You’re offline. Connect to remind. Remind');
    expect(row(states.unknown, 'en', {offline: true})).toMatch(/<button[^>]*disabled=""/);
  });
  it('a busy check keeps its button but cannot be pressed twice', () => {
    expect(row(states.unknownLooking, 'en')).toMatch(/<button[^>]*aria-busy="true"[^>]*disabled=""|<button[^>]*disabled=""[^>]*aria-busy="true"/);
  });
});

describe('reminder row control, Spanish', () => {
  it('renders every state in Spanish with no English sentence and no missing key', () => {
    for (const [name, state] of Object.entries(states)) for (const actor of ['OWNER', 'MANAGER'] as const) {
      const html = row(state, 'es', {actor});
      expect(text(html).length, name).toBeGreaterThan(0);
      noEnglish(html);
    }
    noEnglish(row(states.ready, 'es', {offline: true}));
    expect(text(row(states.queued, 'es'))).toBe('Recordatorio en cola · 3:02 p. m.');
    expect(text(row(states.unknown, 'es'))).toBe('No pudimos confirmar este recordatorio. Verificar de nuevo');
    expect(text(row(states.notSent, 'es'))).toBe('Aún sin confirmar. No se encontró un recibo de cola. Todavía puede quedar en cola. Enviar de nuevo');
    expect(text(row(states.cooldown, 'es'))).toBe('Un recordatorio al día · se puede recordar de nuevo hoy después de las 9:00 p. m.');
    expect(row(states.ready, 'es')).toContain('aria-label="Recordar a Ana Colon"');
  });
});

function fakeUi(lang: ReminderLang, byId: Record<string, ReminderState>, offline = false): ReminderUi {
  const store: ReminderStore = {state: id => byId[id], targets: people, offline, eligible: people.filter(person => byId[person.employeeId]?.phase === 'ready'),
    want: () => {}, recheck: () => {}, send: async () => {}, sendMany: async () => {}, lookup: async () => {}};
  return {store, lang, timeZone: TZ, actor: 'OWNER', line: state => reminderLine(state, {lang, timeZone: TZ, actor: 'OWNER', now}), openOne: () => {}, openMany: () => {}, act: () => {}, rowId: id => `row-${id}`, bulkId: 'bulk'};
}
const mixed = {'fictional-0': states.ready, 'fictional-1': states.cooldown, 'fictional-2': states.ready, 'fictional-3': states.held};

describe('the check before sending', () => {
  it('one person: who, about what, how it goes out, when, the limit, one filled Send reminder and Cancel', () => {
    for (const lang of ['en', 'es'] as const) {
      const t = reminderCopy[lang];
      const html = renderToStaticMarkup(<OneBody titleId="t" target={people[0]} state={states.ready} ui={fakeUi(lang, mixed)} about={t.aboutAvailability('Nov 23')} onSend={() => {}} />);
      const shown = text(html);
      for (const part of [t.oneTitle('Ana Colon'), t.factWho, 'Ana Colon', t.aboutAvailability('Nov 23'), t.how, t.factWhen, t.factDue, t.limit, t.send, t.cancel]) expect(shown).toContain(text(part));
      expect(html).toContain(t.limit);
      expect(html.match(/b-btn--teal/g)).toHaveLength(1);
      expect(html).toMatch(/<h2[^>]*tabindex="-1"/);
      expect(shown).not.toMatch(/deliver(ed|y)|entregad[oa] /i);
      if (lang === 'es') noEnglish(html);
    }
  });
  it('one person: Send is off when the person is no longer ready, or the device is offline, and the sheet says why', () => {
    const changed = renderToStaticMarkup(<OneBody titleId="t" target={people[0]} state={states.conflict} ui={fakeUi('en', mixed)} about="x" onSend={() => {}} />);
    expect(changed).toMatch(/<button[^>]*b-btn--teal[^>]*disabled=""/);
    expect(text(changed)).toContain('This changed while you were looking.');
    const offline = renderToStaticMarkup(<OneBody titleId="t" target={people[0]} state={states.ready} ui={fakeUi('en', mixed, true)} about="x" onSend={() => {}} />);
    expect(offline).toMatch(/<button[^>]*b-btn--teal[^>]*disabled=""/);
    expect(text(offline)).toContain('You’re offline. Connect to remind.');
  });
  it('several people: lists everyone with their state and counts only the people who can be reminded', () => {
    for (const lang of ['en', 'es'] as const) {
      const t = reminderCopy[lang];
      const html = renderToStaticMarkup(<ManyBody titleId="t" open={{mode: 'many', people, stage: 'review', sent: []}} ui={fakeUi(lang, mixed)} about={t.aboutAvailability('Nov 23')} onSend={() => {}} />);
      const shown = text(html);
      for (const part of [t.manyTitle(2), t.manyCount(2, 4), t.sendMany(2), t.cancel, 'Ana Colon', 'Daniel Cruz', 'Maria Rivera', 'Valeria Díaz', t.ready, t.heldActivation]) expect(shown).toContain(part);
      expect(html.match(/<li /g)).toHaveLength(4);
      expect(html.match(/b-btn--teal/g)).toHaveLength(1);
      if (lang === 'es') noEnglish(html);
    }
  });
  it('several people: with nobody ready there is nothing to send', () => {
    const html = renderToStaticMarkup(<ManyBody titleId="t" open={{mode: 'many', people, stage: 'review', sent: []}} ui={fakeUi('en', {'fictional-0': states.cooldown, 'fictional-1': states.held})} about="x" onSend={() => {}} />);
    expect(text(html)).toContain('No one to remind right now');
    expect(html).toMatch(/<button[^>]*b-btn--teal[^>]*disabled=""/);
  });
  it('results: one line per person sent to, each with its own state, a summary that is not "delivered", and Done', () => {
    const after = {'fictional-0': states.queued, 'fictional-1': states.cooldown, 'fictional-2': states.unknown, 'fictional-3': states.held};
    for (const lang of ['en', 'es'] as const) {
      const t = reminderCopy[lang];
      const html = renderToStaticMarkup(<ManyBody titleId="t" open={{mode: 'many', people, stage: 'results', sent: ['fictional-0', 'fictional-2']}} ui={fakeUi(lang, after)} about="x" onSend={() => {}} />);
      const shown = text(html);
      expect(html.match(/<li /g)).toHaveLength(2);
      for (const part of [t.resultsTitle, t.resultsSummary(1, 2), t.queuedAt(lang === 'es' ? '3:02 p. m.' : '3:02 PM'), t.unknown, t.checkAgain, t.done]) expect(shown).toContain(part);
      expect(shown).not.toContain('Daniel Cruz');
      expect(html).toContain('role="status"');
      if (lang === 'es') noEnglish(html);
    }
    const working = renderToStaticMarkup(<ManyBody titleId="t" open={{mode: 'many', people, stage: 'results', sent: ['fictional-0', 'fictional-2']}} ui={fakeUi('en', {'fictional-0': states.queued, 'fictional-2': states.sending})} about="x" onSend={() => {}} />);
    expect(text(working)).toContain('Working through the list…');
  });
});

describe('where reminders are offered', () => {
  it('renders no control without an authority, without targets, or outside a provider', () => {
    const control = <><ReminderBulkButton /><ReminderControl employeeId="fictional-0" name="Ana Colon" /></>;
    expect(renderToStaticMarkup(control)).toBe('');
    const page = (authority: string | undefined, targets: ReminderTarget[]) => renderToStaticMarkup(<ReminderProvider targets={targets} authority={authority} timeZone={TZ} actor="OWNER" about={{kind: 'availability', week: 'Nov 23'}}>{control}</ReminderProvider>);
    expect(page(undefined, people)).not.toMatch(/b-rem\b|<button/);
    expect(page(AUTH, [])).not.toMatch(/b-rem\b|<button/);
  });
});
