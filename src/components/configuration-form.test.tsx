import * as rstestOriginal0 from "react" with { rstest: 'importActual' };
import { afterEach, beforeEach, expect, it, rs } from '@rstest/core';
import type { FormEvent, ReactNode } from 'react';

// Keep one component's hook slots mounted between prop refreshes. DOM behavior
// and dirty controls are separately exercised by the real two-engine app proof.
const hooks = rs.hoisted(() => ({ slots: [] as unknown[], index: 0 }));
rs.mock('react',  () => ({ ...rstestOriginal0, useState: (initial: unknown) => {
  const index = hooks.index++;
  if (!(index in hooks.slots)) hooks.slots[index] = typeof initial === 'function' ? (initial as () => unknown)() : initial;
  return [hooks.slots[index], (next: unknown) => { hooks.slots[index] = next; }];
}, useRef: (initial: unknown) => {
  const index = hooks.index++;
  if (!(index in hooks.slots)) hooks.slots[index] = { current: initial };
  return hooks.slots[index];
} }));
// Signed-in Spanish (es-rest): the form reads the person's language with a hook; called as a plain function here, it is English.
rs.mock('@/lib/i18n/portal-lang', () => ({ usePortalLang: () => 'en' }));
import { ConfigurationForm, type ConfigurationResult } from './configuration-form';
import { ShiftReviewRecovery } from './shift-review-recovery';
import { resetServerActionFlight, serverActionRunning, serverActionsStarted } from '@/lib/server-action-flight';

const NativeFormData = FormData;
beforeEach(() => {
  hooks.slots = []; hooks.index = 0;
  rs.stubGlobal('FormData', class extends NativeFormData {
    constructor(form: { data: FormData }) { super(); for (const [key, value] of form.data.entries()) this.append(key, value); }
  });
});
afterEach(() => { rs.unstubAllGlobals(); });
function mount(action: (data: FormData) => Promise<ConfigurationResult>, reviewedUpdatedAt: string, reviewedShiftVersion?: string) {
  hooks.index = 0;
  return (ConfigurationForm as (props: { action: typeof action; children: ReactNode; reviewedUpdatedAt: string; reviewedShiftVersion?: string }) => ReturnType<typeof ConfigurationForm>)({ action, children: null, reviewedUpdatedAt, reviewedShiftVersion });
}
async function submit(form: ReturnType<typeof ConfigurationForm>, refreshedVersion: string) {
  const data = new NativeFormData(); data.set('expectedUpdatedAt', refreshedVersion); data.set('firstName', 'Retained dirty draft');
  await form.props.onSubmit({ preventDefault() {}, currentTarget: { data } } as unknown as FormEvent<HTMLFormElement>);
}

it('unrelated server props do not advance the mounted draft revision, and stale failure keeps that draft', async () => {
  const sent: { version: string; name: string }[] = [];
  const action = async (data: FormData) => { sent.push({ version: String(data.get('expectedUpdatedAt')), name: String(data.get('firstName')) }); return { error: 'Review latest details.' }; };
  mount(action, 'reviewed.123456');
  await submit(mount(action, 'concurrent.123457'), 'concurrent.123457');
  await submit(mount(action, 'concurrent.123458'), 'concurrent.123458');
  expect(sent).toEqual([{ version: 'reviewed.123456', name: 'Retained dirty draft' }, { version: 'reviewed.123456', name: 'Retained dirty draft' }]);
});
it('only this form successful exact returned revision advances consecutive saves', async () => {
  const sent: string[] = [];
  const action = async (data: FormData) => { sent.push(String(data.get('expectedUpdatedAt'))); return { success: 'Saved.', updatedAt: sent.length === 1 ? 'own.123457' : 'own.123458' }; };
  await submit(mount(action, 'reviewed.123456'), 'reviewed.123456');
  await submit(mount(action, 'another-manager.123459'), 'another-manager.123459');
  expect(sent).toEqual(['reviewed.123456', 'own.123457']);
});

it('shift retries retain the originally reviewed fingerprint through unrelated prop refreshes', async () => {
  const sent: string[] = [];
  const action = async (data: FormData) => { sent.push(String(data.get('expectedReviewVersion'))); return { error: 'Shift changed. Keep your draft.', issueCode: 'SHIFT_REVIEW_CONFLICT' }; };
  mount(action, 'profile-version', 'a'.repeat(64));
  await submit(mount(action, 'profile-version', 'b'.repeat(64)), 'unused');
  await submit(mount(action, 'profile-version', 'c'.repeat(64)), 'unused');
  expect(sent).toEqual(['a'.repeat(64), 'a'.repeat(64)]);
  const form = mount(action, 'profile-version', 'c'.repeat(64));
  expect(form.props.children.some((child: unknown) => child && typeof child === 'object' && 'type' in child && child.type === ShiftReviewRecovery)).toBe(true);
});

// QA A3-01 (Nov 21, 2026): a lost reply can follow a completed save, so the form must not say the save failed.
async function submitShift(form: ReturnType<typeof ConfigurationForm>, fields: Record<string, string>) {
  const data = new NativeFormData(); for (const [key, value] of Object.entries(fields)) data.set(key, value);
  await form.props.onSubmit({ preventDefault() {}, currentTarget: { data } } as unknown as FormEvent<HTMLFormElement>);
}
type Callout = { props: { tone: string; title: string; action?: { label: string; href: string } } };
function callout(form: ReturnType<typeof ConfigurationForm>): Callout {
  const result = form.props.children.find((child: unknown) => child && typeof child === 'object' && 'props' in child && (child as { props: { className?: string } }).props.className === 'form-result');
  return result.props.children as Callout;
}
const shift = { weekStart: '2026-11-16', locationId: 'loc-main', date: '2026-11-18', employeeId: 'emp-ana', startTime: '09:00', endTime: '17:00' };
const lostReply = async () => { throw new TypeError('Failed to fetch'); };

it('a lost reply on a shift says the outcome is unconfirmed and links to that shift\'s day', async () => {
  await submitShift(mount(lostReply, 'v1'), shift);
  const note = callout(mount(lostReply, 'v1'));
  expect(note.props.tone).toBe('amber');
  expect(note.props.title).toMatch(/^This change could not be confirmed\. It may already be on the schedule/);
  expect(note.props.title).not.toMatch(/could not be saved/);
  expect(note.props.action).toEqual({ label: 'Check the schedule', href: '/app/schedule?week=2026-11-16&location=loc-main&day=2026-11-18#schedule-employee-EMP-ANA' });
});

it('a lost reply on a form that is not about a shift asks for a reload, with no schedule link', async () => {
  await submit(mount(lostReply, 'v1'), 'v1');
  const note = callout(mount(lostReply, 'v1'));
  expect(note.props.tone).toBe('amber');
  expect(note.props.title).toMatch(/^This change could not be confirmed\. It may already be saved; reload to check/);
  expect(note.props.action).toBeUndefined();
});

it('an overlap right after an unconfirmed save says it may be the person\'s own shift; a confirmed refusal stays red', async () => {
  let calls = 0;
  const action = async () => { if (++calls === 1) throw new TypeError('Failed to fetch'); return { error: 'Employee already has an overlapping shift.', issueCode: 'SHIFT_OVERLAP' }; };
  await submitShift(mount(action, 'v1'), shift);
  await submitShift(mount(action, 'v1'), shift);
  expect(callout(mount(action, 'v1')).props.title).toMatch(/^This time overlaps a shift already on the schedule\. It may be the one you just saved/);
  hooks.slots = [];
  const refusal = async () => ({ error: 'Employee already has an overlapping shift.', issueCode: 'SHIFT_OVERLAP' });
  await submitShift(mount(refusal, 'v1'), shift);
  const note = callout(mount(refusal, 'v1'));
  expect(note.props.tone).toBe('red');
  expect(note.props.title).toBe('Employee already has an overlapping shift.');
});

it('a redirect thrown by the action is navigation: no note, and nothing rethrown from the submit handler', async () => {
  // The router handles the redirect. Rethrowing it from onSubmit left an unhandled rejection after every successful save
  // (caught by the two-session concurrency test's window error check, Nov 22, 2026).
  const redirect = async () => { const error = new Error('NEXT_REDIRECT') as Error & { digest: string }; error.digest = 'NEXT_REDIRECT;replace;/app/schedule;307;'; throw error; };
  await expect(submitShift(mount(redirect, 'v1'), shift)).resolves.toBeUndefined();
  const form = mount(redirect, 'v1');
  expect(form.props.children.some((child: unknown) => child && typeof child === 'object' && 'props' in child && (child as { props: { className?: string } }).props.className === 'form-result')).toBe(false);
});

// G58 (Nov 23, 2026): the scoped read frame must not discard a Server Action's redirect while its reply is slow, so the
// form marks its action in flight from submit until it settles, a redirect included.
it('marks its Server Action in flight until it settles, a redirect included', async () => {
  resetServerActionFlight();
  const seen: boolean[] = [];
  const redirected = async () => { seen.push(serverActionRunning()); const error = new Error('NEXT_REDIRECT') as Error & { digest: string }; error.digest = 'NEXT_REDIRECT;push;/app/schedule/coverage?saved=1;303;'; throw error; };
  await submitShift(mount(redirected, 'v1'), shift);
  expect(seen).toEqual([true]);
  expect(serverActionRunning()).toBe(false);
  hooks.slots = [];
  await submitShift(mount(lostReply, 'v1'), shift);
  expect(serverActionRunning()).toBe(false);
  expect(serverActionsStarted()).toBe(2);
});

it('a form that names its own check (Review replacement) shows that note and link after a lost reply, and holds', async () => {
  hooks.slots = [];
  const check = { title: 'This change could not be confirmed. It may already be published; check coverage before you publish again.', label: 'Check coverage', href: '/app/schedule/coverage?x=1&refresh=1' };
  let calls = 0;
  const action = async (): Promise<ConfigurationResult> => { calls++; throw new TypeError('Failed to fetch'); };
  const held = () => { hooks.index = 0; return (ConfigurationForm as (props: Record<string, unknown>) => ReturnType<typeof ConfigurationForm>)({ action, children: null, holdAfterUnconfirmed: true, unconfirmedCheck: check }); };
  await submitShift(held(), shift);
  const note = callout(held());
  expect(note.props.tone).toBe('amber');
  expect(note.props.title).toBe(check.title);
  expect(note.props.action).toEqual({ label: 'Check coverage', href: check.href });
  await submitShift(held(), shift);
  expect(calls).toBe(1);
});
