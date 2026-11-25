// Clocker UI step 2, Option A (Jose, Nov 25, 2026): how staff sign in on a tablet. Every state drawn, the one request a
// change sends, how the returned version is used, and the server's sentences in Spanish. Fictional tablets only.
import { describe, expect, it, rs } from '@rstest/core';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { ClockerSignInView, saveSignInMode, signInFormId, signInModeForm, type SignInStatus } from './clocker-device-manager';
import { CLOCKER_DEVICE_UNCONFIRMED, clockerDeviceServerCopy, clockerDeviceServerText, clockerOwnerCopy } from './clocker-owner-copy';
import { englishIn } from './clocker-owner-copy.testkit';
import type { ClockerDeviceView, ClockerOwnerResult } from '../lib/clocker/views';

const kitchen: ClockerDeviceView = { id: 'kitchen', name: 'Kitchen iPad', locationId: 'main', version: 7, signInMode: 'EMPLOYEE_ID', state: 'ACTIVE', lastSeenAt: null, enrollmentExpiresAt: null };
const STALE = 'This device changed. Reload its current details and try again.';
const draw = (props: { device?: ClockerDeviceView; choice?: ClockerDeviceView['signInMode']; status?: SignInStatus; eligible?: boolean; reason?: string; lang?: 'en' | 'es' }) => {
  const lang = props.lang ?? 'en', device = props.device ?? kitchen;
  return renderToStaticMarkup(createElement(ClockerSignInView, { device, eligible: props.eligible ?? true, reason: props.reason, t: clockerOwnerCopy[lang], lang,
    choice: props.choice ?? device.signInMode, status: props.status ?? { kind: 'idle' }, onPick: () => {}, onSave: () => {} }));
};
const t = clockerOwnerCopy.en;

describe('the request a sign-in change sends', () => {
  it('is exactly operation, deviceId, expectedVersion and signInMode, with the version the screen holds', () => {
    const form = signInModeForm(kitchen, 'NAME_PICKER');
    expect([...form.keys()].sort()).toEqual(['deviceId', 'expectedVersion', 'operation', 'signInMode']);
    expect(Object.fromEntries(form.entries())).toEqual({ operation: 'SET_SIGN_IN_MODE', deviceId: 'kitchen', expectedVersion: '7', signInMode: 'NAME_PICKER' });
  });
  it('a saved answer returns the tablet the server sent, and the next change sends its new version', async () => {
    const sent: FormData[] = [];
    const action = rs.fn(async (form: FormData): Promise<ClockerOwnerResult> => { sent.push(form);
      return { ok: true, device: { ...kitchen, signInMode: form.get('signInMode') as ClockerDeviceView['signInMode'], version: Number(form.get('expectedVersion')) + 1 } }; });
    const first = await saveSignInMode(action, kitchen, 'NAME_PICKER');
    expect(first).toEqual({ status: { kind: 'saved', mode: 'NAME_PICKER' }, device: { ...kitchen, signInMode: 'NAME_PICKER', version: 8 } });
    const second = await saveSignInMode(action, first.device!, 'EMPLOYEE_ID');
    expect(sent.map(form => form.get('expectedVersion'))).toEqual(['7', '8']);
    expect(second.device).toMatchObject({ signInMode: 'EMPLOYEE_ID', version: 9 });
  });
  it('a stale or unconfirmed answer needs a reload; a definite refusal does not; a lost request is not confirmed', async () => {
    expect(await saveSignInMode(async () => ({ ok: false, error: STALE, refresh: true }), kitchen, 'NAME_PICKER'))
      .toEqual({ status: { kind: 'failed', message: STALE, refresh: true } });
    expect(await saveSignInMode(async () => ({ ok: false, error: 'Check the device details and try again.', refresh: false }), kitchen, 'NAME_PICKER'))
      .toEqual({ status: { kind: 'failed', message: 'Check the device details and try again.', refresh: false } });
    expect(await saveSignInMode(async () => { throw Error('network'); }, kitchen, 'NAME_PICKER'))
      .toEqual({ status: { kind: 'failed', message: CLOCKER_DEVICE_UNCONFIRMED, refresh: true } });
  });
});

describe('every state of "How staff sign in"', () => {
  it('idle: the two Inline radio choices in their own form, the current one chosen, nothing to press', () => {
    const html = draw({});
    expect(html).toContain(`<legend class="ck-signin__legend">${t.signInLegend}</legend>`);
    expect(html.match(/<label class="clk-choice"><input type="radio" form="ck-signin-kitchen" name="signInMode"/g)).toHaveLength(2);
    expect(html).toContain(`checked="" value="EMPLOYEE_ID"`); expect(html).not.toContain(`checked="" value="NAME_PICKER"`);
    expect(html).not.toContain('b-callout'); expect(html).not.toContain('ck-signin__go');
    expect(signInFormId('kitchen')).toBe('ck-signin-kitchen');
  });
  it('choosing the name picker shows the staff-only warning and turns the action into "Turn on name picker"', () => {
    const html = draw({ choice: 'NAME_PICKER' });
    expect(html).toContain('b-callout'); expect(html).toContain(t.signInWarnTitle); expect(html).toContain(t.signInWarnBody);
    expect(html).toContain('aria-describedby="ck-signin-kitchen-warn"'); expect(html).toContain('id="ck-signin-kitchen-warn"');
    expect(html).toMatch(/<button type="button" class="b-btn b-btn--teal b-btn--full ck-signin__go">.*Turn on name picker/);
  });
  it('going back to Employee ID is a plain Save, with no warning', () => {
    const html = draw({ device: { ...kitchen, signInMode: 'NAME_PICKER' }, choice: 'EMPLOYEE_ID' });
    expect(html).not.toContain(t.signInWarnTitle);
    expect(html).toMatch(/ck-signin__go">.*>Save</);
  });
  it('saving: the choices lock, and the button keeps its place and its Solid teal look with "Saving…"', () => {
    const html = draw({ choice: 'NAME_PICKER', status: { kind: 'saving' } });
    expect(html).toContain('<fieldset disabled=""');
    expect(html).toContain('class="b-btn b-btn--teal b-btn--full ck-signin__go" aria-busy="true"');
    expect(html).toContain(t.saving); expect(html).toContain('b-busy');
  });
  it('saved: a green kit notice that says what the tablet does now, and nothing left to press', () => {
    const picker = draw({ device: { ...kitchen, signInMode: 'NAME_PICKER', version: 8 }, choice: 'NAME_PICKER', status: { kind: 'saved', mode: 'NAME_PICKER' } });
    expect(picker).toContain('role="status"'); expect(picker).toContain(t.signInSavedPicker('Kitchen iPad'));
    expect(picker).not.toContain('ck-signin__go'); expect(picker).not.toContain(t.signInWarnTitle);
    expect(draw({ status: { kind: 'saved', mode: 'EMPLOYEE_ID' } })).toContain(t.signInSavedId('Kitchen iPad'));
  });
  it('stale and couldn’t confirm: one neutral title, the server’s sentence, a Reload button, and the choices locked', () => {
    for (const message of [STALE, CLOCKER_DEVICE_UNCONFIRMED]) {
      const html = draw({ choice: 'NAME_PICKER', status: { kind: 'failed', message, refresh: true } });
      expect(html).toContain('role="alert"'); expect(html).toContain(t.signInCheckTitle); expect(html).toContain(message);
      expect(html).toContain('<fieldset disabled=""'); expect(html).not.toContain(t.signInWarnTitle);
      expect(html).toMatch(/<button type="button" class="b-btn b-btn--teal b-btn--full ck-signin__go">Reload<\/button>/);
    }
  });
  it('a definite refusal keeps the choice open, with the server’s sentence and the same action to try again', () => {
    const html = draw({ choice: 'NAME_PICKER', status: { kind: 'failed', message: 'Check the device details and try again.', refresh: false } });
    expect(html).not.toContain('<fieldset disabled'); expect(html).toContain('Check the device details and try again.'); expect(html).toContain('Turn on name picker');
  });
  it('a tablet that can’t change shows its sign-in read-only with one plain reason, and no controls', () => {
    const html = draw({ device: { ...kitchen, state: 'PENDING', signInMode: 'EMPLOYEE_ID' }, eligible: false, reason: t.signInNotSetUp });
    expect(html).toContain('data-readonly=""'); expect(html).toContain(t.signInId); expect(html).toContain(t.signInNotSetUp);
    expect(html).not.toContain('type="radio"'); expect(html).not.toContain('<button');
  });
});

describe('Spanish', () => {
  it('uses Jose’s labels and leaks no English sentence, including the server’s', () => {
    const es = clockerOwnerCopy.es;
    expect(es.signInId).toBe('ID de empleado + PIN'); expect(es.signInPicker).toBe('Elegir nombre + PIN');
    for (const html of [draw({ lang: 'es', choice: 'NAME_PICKER' }), draw({ lang: 'es', choice: 'NAME_PICKER', status: { kind: 'failed', message: STALE, refresh: true } }),
      draw({ lang: 'es', status: { kind: 'saved', mode: 'NAME_PICKER' }, device: { ...kitchen, signInMode: 'NAME_PICKER' }, choice: 'NAME_PICKER' })]) {
      expect(englishIn(html)).toEqual([]);
    }
    expect(draw({ lang: 'es', choice: 'NAME_PICKER', status: { kind: 'failed', message: STALE, refresh: true } })).toContain('Esta tableta cambió. Vuelve a cargar sus datos e inténtalo de nuevo.');
  });
  it('maps every sentence the tablet action can send, and shows an unknown one as written', () => {
    for (const [sentence, { es }] of Object.entries(clockerDeviceServerCopy)) {
      expect(es.trim()).not.toBe(''); expect(es).not.toBe(sentence);
      expect(clockerDeviceServerText(sentence, 'es')).toBe(es); expect(clockerDeviceServerText(sentence, 'en')).toBe(sentence);
    }
    expect(Object.keys(clockerDeviceServerCopy)).toContain(CLOCKER_DEVICE_UNCONFIRMED);
    expect(clockerDeviceServerText('Something new.', 'es')).toBe('Something new.');
  });
});
