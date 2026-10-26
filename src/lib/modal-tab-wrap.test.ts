import { describe, expect, it } from 'vitest';
import { installModalTabWrap, MODAL_TAB_SCRIPT } from './modal-tab-wrap';

/** A minimal document: one open modal dialog holding the given controls, plus a page control outside it. */
function fixture({ modal = true, controls = ['cancel', 'a', 'b'] } = {}) {
  let active: unknown = null;
  let listener: ((event: KeyboardEvent) => void) | null = null;
  const node = (name: string, inside: boolean) => ({ name, getClientRects: () => [1], closest: () => null, focus() { active = this; }, inside });
  const items = controls.map(name => node(name, true));
  const page = node('page', false);
  const dialog = {
    matches: (selector: string) => selector === ':modal' && modal,
    querySelectorAll: () => items,
    contains: (target: unknown) => target === dialog || items.includes(target as never),
  };
  const doc = {
    get activeElement() { return active; },
    querySelectorAll: (selector: string) => selector === 'dialog[open]' ? [dialog] : [],
    addEventListener: (_type: string, handler: (event: KeyboardEvent) => void) => { listener = handler; },
  };
  installModalTabWrap(doc as unknown as Document);
  const press = (shiftKey = false) => {
    let prevented = false;
    listener!({ key: 'Tab', shiftKey, altKey: false, ctrlKey: false, metaKey: false, defaultPrevented: false, preventDefault: () => { prevented = true; } } as unknown as KeyboardEvent);
    return prevented;
  };
  return { items, page, dialog, press, focus: (target: { focus(): void }) => target.focus(), get active() { return active as { name: string } | null; } };
}

describe('modal Tab wrap', () => {
  it('returns from the last control to the first, and back with Shift+Tab', () => {
    const f = fixture();
    f.focus(f.items[2]);
    expect(f.press()).toBe(true);
    expect(f.active?.name).toBe('cancel');
    expect(f.press(true)).toBe(true);
    expect(f.active?.name).toBe('b');
  });

  it('leaves ordinary Tab between controls to the browser', () => {
    const f = fixture();
    f.focus(f.items[0]);
    expect(f.press()).toBe(false);
    expect(f.active?.name).toBe('cancel');
  });

  it('brings focus back into the dialog when it has left', () => {
    const f = fixture();
    f.focus(f.page);
    expect(f.press()).toBe(true);
    expect(f.active?.name).toBe('cancel');
  });

  it('does nothing without a modal dialog open', () => {
    const f = fixture({ modal: false });
    f.focus(f.items[2]);
    expect(f.press()).toBe(false);
  });

  it('ships as a self-contained script', () => {
    expect(MODAL_TAB_SCRIPT.startsWith('(')).toBe(true);
    expect(MODAL_TAB_SCRIPT.endsWith(')(document);')).toBe(true);
    expect(() => new Function(MODAL_TAB_SCRIPT.replace(/\(document\);$/, '')) ).not.toThrow();
  });
});
