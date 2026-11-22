import * as rstestOriginal0 from "react" with { rstest: 'importActual' };
import { beforeEach, expect, it, rs } from '@rstest/core';

// One component's state slots, kept between renders, so a test can run the form's action and render again.
const hooks = rs.hoisted(() => ({ slots: [] as unknown[], index: 0 }));
rs.mock('react', () => ({ ...rstestOriginal0, useState: (initial: unknown) => {
  const index = hooks.index++;
  if (!(index in hooks.slots)) hooks.slots[index] = initial;
  return [hooks.slots[index], (next: unknown) => { hooks.slots[index] = next; }];
} }));
import { UnconfirmedActionForm, type Unconfirmed } from './unconfirmed-action-form';

const unconfirmed: Unconfirmed = { title: 'Publishing Calle Loíza could not be confirmed. It may already be published; check the schedule before you publish again.',
  check: { label: 'Check the schedule', href: '/app/schedule?week=2026-12-07&location=loc-calle' } };
type Form = { props: { action: (data: FormData) => Promise<void>; children: unknown[] } };
const render = (action: (data: FormData) => Promise<unknown>) => { hooks.index = 0; return UnconfirmedActionForm({ action, unconfirmed, children: 'Publish' }) as unknown as Form; };
const note = (form: Form) => (form.props.children[1] as { props: { children: { props: Record<string, unknown> } } } | null)?.props.children.props;
beforeEach(() => { hooks.slots = []; });

// QA A3-02 (Nov 21, 2026): publishing completed, the reply was lost, and the page said "Nothing was changed".
it('a lost reply keeps the person on the form with an amber unconfirmed note and a place to check', async () => {
  const lost = async () => { throw new TypeError('Failed to fetch'); };
  expect(note(render(lost))).toBeUndefined();
  await render(lost).props.action(new FormData());
  expect(note(render(lost))).toEqual({ tone: 'amber', role: 'alert', title: unconfirmed.title, action: unconfirmed.check });
});

it('the note clears when the next try starts', async () => {
  let calls = 0;
  const action = async () => { if (++calls === 1) throw new TypeError('Failed to fetch'); };
  await render(action).props.action(new FormData());
  await render(action).props.action(new FormData());
  expect(note(render(action))).toBeUndefined();
});

it('a redirect from the action is navigation, not an unconfirmed outcome', async () => {
  const redirect = async () => { const error = new Error('NEXT_REDIRECT') as Error & { digest: string }; error.digest = 'NEXT_REDIRECT;replace;/app/schedule;307;'; throw error; };
  await expect(render(redirect).props.action(new FormData())).rejects.toThrow('NEXT_REDIRECT');
  expect(note(render(redirect))).toBeUndefined();
});
