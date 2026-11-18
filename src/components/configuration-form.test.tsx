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
import { ConfigurationForm, type ConfigurationResult } from './configuration-form';
import { ShiftReviewRecovery } from './shift-review-recovery';

const NativeFormData = FormData;
beforeEach(() => {
  hooks.slots = []; hooks.index = 0;
  rs.stubGlobal('FormData', class extends NativeFormData {
    constructor(form: { data: FormData }) { super(); for (const [key, value] of form.data.entries()) this.append(key, value); }
  });
});
afterEach(() => rs.unstubAllGlobals());
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
