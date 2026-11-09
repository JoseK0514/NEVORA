import test from 'node:test';
import assert from 'node:assert/strict';
import { handleBack, requestDialogDismissal } from '../src/navigation.ts';

test('Back belongs to an open sheet even when browser history exists', async () => {
  const calls = [];
  const result = await handleBack({
    dismissTopOverlay: () => { calls.push('sheet'); return true; },
    canGoBack: true,
    goBack: () => calls.push('history'),
    minimize: () => calls.push('minimize'),
  });
  assert.equal(result, 'overlay');
  assert.deepEqual(calls, ['sheet']);
});

test('Back follows history after sheets are closed', async () => {
  const calls = [];
  assert.equal(await handleBack({
    dismissTopOverlay: () => false,
    canGoBack: true,
    goBack: () => calls.push('history'),
    minimize: () => calls.push('minimize'),
  }), 'history');
  assert.deepEqual(calls, ['history']);
});

test('Back at the root minimizes rather than changing history', async () => {
  const calls = [];
  assert.equal(await handleBack({
    dismissTopOverlay: () => false,
    canGoBack: false,
    goBack: () => calls.push('history'),
    minimize: async () => { calls.push('minimize'); },
  }), 'minimize');
  assert.deepEqual(calls, ['minimize']);
});

test('a sheet that prevents cancel owns its delayed close', () => {
  const events = new EventTarget();
  events.addEventListener('cancel', (event) => event.preventDefault());
  let closed = false;
  requestDialogDismissal({
    dispatchEvent: (event) => events.dispatchEvent(event),
    close: () => { closed = true; },
  });
  assert.equal(closed, false);
});

test('fallback dismisses an ordinary dialog after its cancel event', () => {
  const calls = [];
  requestDialogDismissal({
    dispatchEvent(event) {
      assert.equal(event.type, 'cancel');
      assert.equal(event.cancelable, true);
      calls.push('cancel');
      return true;
    },
    close: () => calls.push('close'),
  });
  assert.deepEqual(calls, ['cancel', 'close']);
});

test('modern dialog dismissal uses requestClose to retain browser semantics', () => {
  const calls = [];
  requestDialogDismissal({
    requestClose: () => calls.push('requestClose'),
    dispatchEvent() { throw new Error('No synthetic cancel needed'); },
    close() { throw new Error('No direct close allowed'); },
  });
  assert.deepEqual(calls, ['requestClose']);
});
