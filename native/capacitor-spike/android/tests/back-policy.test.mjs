import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

const script = readFileSync(new URL('../app/src/main/assets/native-back.js', import.meta.url), 'utf8');
function element(kind, methods = {}, parent = null) {
  return {
    ...methods,
    closest(selector) {
      if (kind === 'dialog' && selector === 'dialog[open]') return this;
      if (kind === 'popover' && selector === '[popover]:popover-open') return this;
      return parent?.closest(selector) ?? null;
    },
  };
}
function back({ popovers = [], dialogs = [], activeElement = null, pathname = '/app/schedule' } = {}) {
  return vm.runInNewContext(script, {
    Event, location: { pathname },
    document: { activeElement, querySelectorAll: selector => selector.startsWith('[popover]') ? popovers : dialogs },
  });
}

test('a nested popover closes before its containing sheet', () => {
  const calls = [];
  const dialog = element('dialog', { requestClose() { calls.push('dialog'); } });
  const popover = element('popover', { hidePopover() { calls.push('popover'); } }, dialog);
  const state = back({
    popovers: [popover], dialogs: [dialog], activeElement: dialog,
  });
  assert.deepEqual(calls, ['popover']);
  assert.equal(state.dismissed, true);
});
test('the focused finder closes above a sheet even in reversed DOM order', () => {
  const calls = [];
  const finder = element('dialog', { requestClose() { calls.push('finder'); } });
  const underlyingSheet = element('dialog', { requestClose() { calls.push('sheet'); } });
  const searchField = element('input', {}, finder);
  // Finder is first in DOM, but was opened last and owns keyboard focus.
  const state = back({ dialogs: [finder, underlyingSheet], activeElement: searchField });
  assert.deepEqual(calls, ['finder']);
  assert.equal(state.dismissed, true);
});
test('a background popover cannot steal Back from the focused modal', () => {
  const calls = [];
  const finder = element('dialog', { requestClose() { calls.push('finder'); } });
  const backgroundMenu = element('popover', { hidePopover() { calls.push('background-menu'); } });
  back({ dialogs: [finder], popovers: [backgroundMenu], activeElement: element('input', {}, finder) });
  assert.deepEqual(calls, ['finder']);
});
test('focus inside a shadow root still selects its containing modal', () => {
  const calls = [];
  const focusedDialog = element('dialog', { requestClose() { calls.push('focused-dialog'); } });
  const underlyingSheet = element('dialog', { requestClose() { calls.push('sheet'); } });
  const host = element('component', {}, focusedDialog);
  host.shadowRoot = { activeElement: { closest() { return null; }, getRootNode() { return { host }; } } };
  back({ dialogs: [focusedDialog, underlyingSheet], activeElement: host });
  assert.deepEqual(calls, ['focused-dialog']);
});
test('focused nested popover wins over a later background menu in DOM order', () => {
  const calls = [];
  const dialog = element('dialog', { requestClose() { calls.push('dialog'); } });
  const topMenu = element('popover', { hidePopover() { calls.push('top-menu'); } }, dialog);
  const backgroundMenu = element('popover', { hidePopover() { calls.push('background-menu'); } });
  back({ dialogs: [dialog], popovers: [topMenu, backgroundMenu], activeElement: element('button', {}, topMenu) });
  assert.deepEqual(calls, ['top-menu']);
});
test('cancel-preventing sheet consumes Back without forcing close or history', () => {
  const calls = [];
  const state = back({ dialogs: [{
    dispatchEvent(event) { calls.push(event.type); event.preventDefault(); return !event.defaultPrevented; },
    close() { calls.push('forced-close'); },
  }] });
  assert.deepEqual(calls, ['cancel']);
  assert.equal(state.dismissed, true);
  assert.equal(state.root, false);
});
test('old WebViews close a simple dialog after an unprevented cancel', () => {
  const calls = [];
  const state = back({ dialogs: [{
    dispatchEvent(event) { calls.push(event.type); return true; },
    close() { calls.push('close'); },
  }] });
  assert.deepEqual(calls, ['cancel', 'close']);
  assert.equal(state.dismissed, true);
});
test('modern requestClose is used once and prevents history fall-through', () => {
  let count = 0;
  const state = back({ dialogs: [{ requestClose() { count++; } }] });
  assert.equal(count, 1);
  assert.equal(state.dismissed, true);
});
test('root requests minimize while child pages leave navigation to native history', () => {
  for (const pathname of ['/app', '/app/', '/app/home', '/ui-preview/home']) {
    const state = back({ pathname });
    assert.equal(state.root, true);
    assert.equal(state.dismissed, false);
  }
  assert.equal(back({ pathname: '/app/schedule' }).root, false);
});
