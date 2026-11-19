// Phase 7: the one exit every sheet, dialog and toast shares (kit/overlay-exit.ts).
import {renderToStaticMarkup} from 'react-dom/server';
import {afterEach, beforeEach, describe, expect, it, rs} from '@rstest/core';
import {cancelOverlayExit, closeDialogWithExit, OVERLAY_EXIT_MS, overlayExitMs, useExitHold, useExitValue} from './overlay-exit';

/** The parts of a dialog the helper touches. */
function fakeDialog(open = true) {
  const attributes = new Map<string, string>();
  const dialog = {
    open,
    closes: 0,
    close() { dialog.open = false; dialog.closes++; },
    setAttribute: (name: string, value: string) => { attributes.set(name, value); },
    removeAttribute: (name: string) => { attributes.delete(name); },
    hasAttribute: (name: string) => attributes.has(name),
  };
  return dialog;
}
const asDialog = (dialog: ReturnType<typeof fakeDialog>) => dialog as unknown as HTMLDialogElement;
function device({reduce = false, overlay = true}: {reduce?: boolean; overlay?: boolean}) {
  rs.stubGlobal('window', {matchMedia: (query: string) => ({matches: reduce && query.includes('reduce')})});
  rs.stubGlobal('CSS', {supports: (property: string) => overlay && property === 'overlay'});
}

beforeEach(() => { rs.useFakeTimers(); });
afterEach(() => { rs.useRealTimers(); rs.unstubAllGlobals(); });

describe('closeDialogWithExit', () => {
  it('has no exit without a window, and none under reduced motion', () => {
    expect(overlayExitMs()).toBe(0);
    device({reduce: true});
    expect(overlayExitMs()).toBe(0);
    const dialog = fakeDialog();
    expect(closeDialogWithExit(asDialog(dialog))).toBe(true);
    expect(dialog.open).toBe(false);
    expect(dialog.hasAttribute('data-closing')).toBe(false);
  });
  it('closes at once where a closed dialog can still be painted, so focus is back before the exit ends', () => {
    device({});
    expect(overlayExitMs()).toBe(OVERLAY_EXIT_MS);
    const dialog = fakeDialog();
    expect(closeDialogWithExit(asDialog(dialog))).toBe(true);
    expect(dialog.open).toBe(false);
    expect(dialog.hasAttribute('data-closing')).toBe(true);
    rs.advanceTimersByTime(OVERLAY_EXIT_MS - 1);
    expect(dialog.hasAttribute('data-closing')).toBe(true);
    rs.advanceTimersByTime(1);
    expect(dialog.hasAttribute('data-closing')).toBe(false);
    expect(dialog.closes).toBe(1);
  });
  it('stays open for one exit on an engine that drops a closed dialog at once', () => {
    device({overlay: false});
    const dialog = fakeDialog();
    expect(closeDialogWithExit(asDialog(dialog))).toBe(false);
    expect(dialog.open).toBe(true);
    expect(dialog.hasAttribute('data-closing')).toBe(true);
    rs.advanceTimersByTime(OVERLAY_EXIT_MS);
    expect(dialog.open).toBe(false);
    expect(dialog.hasAttribute('data-closing')).toBe(false);
  });
  it('holds a panel that is not modal open for its exit on every engine', () => {
    device({});
    const dialog = fakeDialog();
    expect(closeDialogWithExit(asDialog(dialog), true)).toBe(false);
    expect(dialog.open).toBe(true);
    rs.advanceTimersByTime(OVERLAY_EXIT_MS);
    expect(dialog.open).toBe(false);
  });
  it('forgets an exit when the sheet opens again', () => {
    device({overlay: false});
    const dialog = fakeDialog();
    closeDialogWithExit(asDialog(dialog));
    cancelOverlayExit(asDialog(dialog));
    expect(dialog.hasAttribute('data-closing')).toBe(false);
    rs.advanceTimersByTime(OVERLAY_EXIT_MS * 2);
    expect(dialog.open).toBe(true);
    expect(dialog.closes).toBe(0);
  });
});

describe('the exit hold', () => {
  function Value({present, value}: {present: boolean; value: string}) {
    const held = useExitValue(present, value);
    return <p data-leaving={held.leaving || undefined}>{held.value ?? 'nothing'}</p>;
  }
  function Hold({open}: {open: boolean}) { return <p>{useExitHold(open) ? 'mounted' : 'gone'}</p>; }
  it('gives the value while it is present and nothing when it never was', () => {
    expect(renderToStaticMarkup(<Value present value="Offline" />)).toBe('<p>Offline</p>');
    expect(renderToStaticMarkup(<Value present={false} value="Offline" />)).toBe('<p>nothing</p>');
    expect(renderToStaticMarkup(<Hold open />)).toBe('<p>mounted</p>');
    expect(renderToStaticMarkup(<Hold open={false} />)).toBe('<p>gone</p>');
  });
});
