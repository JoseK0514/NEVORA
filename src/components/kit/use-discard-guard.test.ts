// "Discard changes?" (Nov 21, 2026): the guard's rules, without a browser. The hub gets a fake window and document.
import {describe, expect, it} from '@rstest/core';
import {createDiscardHub, DISCARD_RELEASE_MS, fieldsDiffer, fieldStates, guardedHref, ROUTER_PASS_MS, type ClickLike, type ControlLike, type DiscardEnv, type GuardEntry} from './use-discard-guard';

const HERE = {origin: 'https://app.test', pathname: '/app/settings/branding', search: '', href: 'https://app.test/app/settings/branding'};

function anchor(href: string, attributes: Record<string, string> = {}, inside: string[] = []) {
  const all: Record<string, string> = {href, ...attributes};
  const node = {
    getAttribute: (name: string) => all[name] ?? null,
    hasAttribute: (name: string) => name in all,
    closest: (selector: string) => selector === 'a[href]' ? node : inside.includes(selector) ? {} : null,
  };
  return node;
}
function click(target: unknown, more: Partial<ClickLike> = {}) {
  const event = {button: 0, metaKey: false, ctrlKey: false, shiftKey: false, altKey: false, defaultPrevented: false, target, prevented: 0, stopped: 0,
    preventDefault() { event.prevented++; }, stopPropagation() { event.stopped++; }, ...more};
  return event;
}

describe('guardedHref: which link clicks leave the form', () => {
  it('guards a same-origin link to another page, with its query and hash', () => {
    expect(guardedHref(click(anchor('/app/settings')), HERE)).toBe('/app/settings');
    expect(guardedHref(click(anchor('https://app.test/app/schedule?week=2026-11-16#mon')), HERE)).toBe('/app/schedule?week=2026-11-16#mon');
    expect(guardedHref(click(anchor('?tab=history')), HERE)).toBe('/app/settings/branding?tab=history');
  });
  it('ignores modified clicks, other buttons and a click something already handled', () => {
    for (const more of [{metaKey: true}, {ctrlKey: true}, {shiftKey: true}, {altKey: true}, {button: 1}, {defaultPrevented: true}])
      expect(guardedHref(click(anchor('/app/settings'), more), HERE)).toBeNull();
  });
  it('ignores new-tab targets, downloads, other origins and this same page', () => {
    expect(guardedHref(click(anchor('/app/settings', {target: '_blank'})), HERE)).toBeNull();
    expect(guardedHref(click(anchor('/app/settings', {target: '_self'})), HERE)).toBe('/app/settings');
    expect(guardedHref(click(anchor('/api/export.csv', {download: ''})), HERE)).toBeNull();
    expect(guardedHref(click(anchor('https://example.com/help')), HERE)).toBeNull();
    expect(guardedHref(click(anchor('mailto:help@example.com')), HERE)).toBeNull();
    expect(guardedHref(click(anchor('#brand-colour')), HERE)).toBeNull();
    expect(guardedHref(click(anchor('/app/settings/branding#logo')), HERE)).toBeNull();
  });
  it("ignores the form's own controls, links that act as buttons, the way to sign in, and clicks off any link", () => {
    expect(guardedHref(click(anchor('/app/updates', {}, ['[data-discard-skip]'])), HERE)).toBeNull();
    expect(guardedHref(click(anchor('/app/updates', {role: 'button'})), HERE)).toBeNull();
    expect(guardedHref(click(anchor('/login')), HERE)).toBeNull();
    expect(guardedHref(click({closest: () => null}), HERE)).toBeNull();
    expect(guardedHref(click(null), HERE)).toBeNull();
  });
});

describe('dirty from the fields', () => {
  const text = (name: string, value: string, defaultValue = value): ControlLike => ({name, type: 'text', value, defaultValue});
  const box = (name: string, checked: boolean, defaultChecked = checked): ControlLike => ({name, type: 'checkbox', value: 'on', checked, defaultChecked});
  const select = (name: string, value: string): ControlLike => ({name, type: 'select-one', options: ['a', 'b'].map(option => ({value: option, selected: option === value}))});
  it('leaves out hidden fields, file inputs, buttons, unnamed fields and fields marked to skip', () => {
    const states = fieldStates([text('name', 'Ana'), {name: 'id', type: 'hidden', value: '1'}, {name: 'logo', type: 'file', value: 'x.png'},
      {name: 'go', type: 'submit', value: 'Save'}, {type: 'text', value: 'loose'}, {name: 'q', type: 'search', value: 'x', hasAttribute: name => name === 'data-discard-skip'}]);
    expect([...states.keys()]).toEqual(['name#0']);
  });
  it('is clean on load, dirty after a change, and clean again when the field is put back', () => {
    const name = text('name', 'Northside'), active = box('active', true), place = select('place', 'a');
    const baseline = fieldStates([name, active, place], true);
    expect(fieldsDiffer([name, active, place], baseline)).toBe(false);
    name.value = 'Northside QA';
    expect(fieldsDiffer([name, active, place], baseline)).toBe(true);
    name.value = 'Northside';
    expect(fieldsDiffer([name, active, place], baseline)).toBe(false);
    active.checked = false;
    expect(fieldsDiffer([name, active, place], baseline)).toBe(true);
    active.checked = true;
    place.options = [{value: 'a', selected: false}, {value: 'b', selected: true}];
    expect(fieldsDiffer([name, active, place], baseline)).toBe(true);
  });
  it('counts a value the browser restored after a reload, and compares a later field with its own default', () => {
    expect(fieldsDiffer([text('name', 'typed before the reload', 'Northside')], fieldStates([text('name', 'typed before the reload', 'Northside')], true))).toBe(true);
    const baseline = fieldStates([text('name', 'Ana')], true);
    expect(fieldsDiffer([text('name', 'Ana'), text('note', '', '')], baseline)).toBe(false);
    expect(fieldsDiffer([text('name', 'Ana'), text('note', 'new', '')], baseline)).toBe(true);
    // A field that left the form (another step) is not counted.
    expect(fieldsDiffer([], baseline)).toBe(false);
  });
  it('starts again from what the fields hold after a save', () => {
    const name = text('name', 'Harbor', 'Northside');
    expect(fieldsDiffer([name], fieldStates([name]))).toBe(false);
  });
});

function world() {
  const listeners: {target: string; type: string; listener: (event: never) => void; capture: boolean}[] = [];
  const target = (name: string) => ({
    addEventListener: (type: string, listener: (event: never) => void, capture = false) => { listeners.push({target: name, type, listener, capture}); },
    removeEventListener: (type: string, listener: (event: never) => void, capture = false) => {
      const at = listeners.findIndex(item => item.target === name && item.type === type && item.listener === listener && item.capture === capture);
      if (at >= 0) listeners.splice(at, 1);
    },
  });
  const state = {now: 1000, went: [] as number[], routed: [] as ((href: string) => void)[], focused: 0};
  const location = {...HERE};
  const active = {focus: () => { state.focused++; }, isConnected: true};
  const env: DiscardEnv = {
    win: {...target('window'), location, history: {go: delta => { state.went.push(delta); }}},
    doc: {...target('document'), activeElement: active},
    onRouterTransition: listener => { state.routed.push(listener); return () => { state.routed.splice(state.routed.indexOf(listener), 1); }; },
    now: () => state.now,
  };
  const fire = (name: string, type: string, event: object) => { for (const item of listeners.filter(item => item.target === name && item.type === type)) (item.listener as (event: object) => void)(event); return event; };
  const hub = createDiscardHub(env);
  const form = () => { const seen = {asks: [] as boolean[], went: [] as string[]}; const entry: GuardEntry = hub.add({dirty: false, navigate: href => { seen.went.push(href); }, ask: asking => { seen.asks.push(asking); }}); return {entry, seen}; };
  const unload = () => { const event = {prevented: 0, returnValue: undefined as unknown, preventDefault() { event.prevented++; }}; fire('window', 'beforeunload', event); return event; };
  const pop = () => { const event = {stopped: 0, stopImmediatePropagation() { event.stopped++; }}; fire('window', 'popstate', event); return event; };
  return {hub, env, listeners, state, location, fire, form, unload, pop};
}

describe('the hub', () => {
  it('registers nothing while every form is clean, and removes everything when the form is clean again', () => {
    const w = world(), {entry} = w.form();
    expect(w.listeners).toEqual([]);
    expect(w.hub.installed()).toBe(false);
    expect(w.unload().prevented).toBe(0);
    w.hub.setDirty(entry, true);
    expect(w.listeners.map(item => `${item.target}:${item.type}:${item.capture}`).sort()).toEqual(['document:click:true', 'window:beforeunload:false', 'window:popstate:true']);
    expect(w.state.routed.length).toBe(1);
    // Back to its loaded values.
    w.hub.setDirty(entry, false);
    expect(w.listeners).toEqual([]);
    expect(w.state.routed.length).toBe(0);
    expect(w.hub.guarding()).toBe(false);
  });
  it("answers beforeunload while dirty, so the browser's own prompt shows", () => {
    const w = world(), {entry} = w.form();
    w.hub.setDirty(entry, true);
    const event = w.unload();
    expect(event.prevented).toBe(1);
    expect(event.returnValue).toBe('');
  });
  it('catches a link click, asks, and "Keep editing" leaves the form guarded with focus back where it was', () => {
    const w = world(), {entry, seen} = w.form();
    w.hub.setDirty(entry, true);
    const event = w.fire('document', 'click', click(anchor('/app/settings'))) as ReturnType<typeof click>;
    expect([event.prevented, event.stopped]).toEqual([1, 1]);
    expect(seen.asks).toEqual([true]);
    expect(w.hub.asking()).toBe(true);
    w.hub.keep();
    expect(seen.asks).toEqual([true, false]);
    expect(seen.went).toEqual([]);
    expect(w.state.focused).toBe(1);
    expect(w.hub.guarding()).toBe(true);
    // The next try asks again.
    w.fire('document', 'click', click(anchor('/app/settings')));
    expect(seen.asks).toEqual([true, false, true]);
  });
  it('"Discard changes" goes to the remembered link with the guard released', () => {
    const w = world(), {entry, seen} = w.form();
    w.hub.setDirty(entry, true);
    w.fire('document', 'click', click(anchor('/app/schedule?week=2026-11-16')));
    w.hub.discard();
    expect(seen.went).toEqual(['/app/schedule?week=2026-11-16']);
    expect(seen.asks).toEqual([true, false]);
    expect(w.hub.guarding()).toBe(false);
    expect(w.unload().prevented).toBe(0);
    const again = w.fire('document', 'click', click(anchor('/app/team'))) as ReturnType<typeof click>;
    expect(again.prevented).toBe(0);
    // A navigation that went nowhere (offline): the edits are guarded again after a while.
    w.state.now += DISCARD_RELEASE_MS;
    expect(w.hub.guarding()).toBe(true);
  });
  it('lets ignored clicks through untouched', () => {
    const w = world(), {entry, seen} = w.form();
    w.hub.setDirty(entry, true);
    for (const event of [click(anchor('/app/settings'), {metaKey: true}), click(anchor('#top')), click(anchor('/app/x', {target: '_blank'})), click(anchor('/app/x', {}, ['[data-discard-skip]']))]) {
      w.fire('document', 'click', event);
      expect([event.prevented, event.stopped]).toEqual([0, 0]);
    }
    expect(seen.asks).toEqual([]);
  });
  it('catches browser Back before the router, puts the address back, and continues only on Discard', () => {
    const w = world(), {entry, seen} = w.form();
    w.hub.setDirty(entry, true);
    // The browser has already moved to the previous page.
    w.location.pathname = '/app/settings';
    const back = w.pop();
    expect(back.stopped).toBe(1);
    expect(w.state.went).toEqual([1]);
    expect(seen.asks).toEqual([true]);
    // The guard's own "forward again" is swallowed too, so the router never restores anything.
    w.location.pathname = HERE.pathname;
    expect(w.pop().stopped).toBe(1);
    expect(seen.asks).toEqual([true]);
    w.hub.keep();
    expect(w.state.went).toEqual([1]);
    // Again, and this time Discard: one step back, and that popstate reaches the router.
    w.location.pathname = '/app/settings';
    w.pop();
    w.location.pathname = HERE.pathname;
    w.pop();
    w.hub.discard();
    expect(w.state.went).toEqual([1, 1, -1]);
    w.location.pathname = '/app/settings';
    expect(w.pop().stopped).toBe(0);
  });
  it('uses the exact history distance when the browser gives it, and lets a #hash entry of the same page pass', () => {
    const w = world();
    const navigation = {currentEntry: {index: 5}, addEventListener: w.env.win.addEventListener, removeEventListener: w.env.win.removeEventListener};
    w.env.win.navigation = navigation;
    const {entry, seen} = w.form();
    w.hub.setDirty(entry, true);
    // Two entries back in one move (the history menu).
    w.fire('window', 'currententrychange', {navigationType: 'traverse', from: {index: 5, url: HERE.href}});
    navigation.currentEntry = {index: 3};
    // The router rewrites the entry it landed on before popstate fires (seen in Chromium with Next 16): not a move.
    w.fire('window', 'currententrychange', {navigationType: 'replace', from: {index: -1, url: 'https://app.test/app'}});
    w.location.pathname = '/app';
    expect(w.pop().stopped).toBe(1);
    expect(w.state.went).toEqual([2]);
    w.fire('window', 'currententrychange', {navigationType: 'traverse', from: {index: 3, url: 'https://app.test/app'}});
    navigation.currentEntry = {index: 5};
    w.location.pathname = HERE.pathname;
    w.pop();
    w.hub.discard();
    expect(w.state.went).toEqual([2, -2]);
    expect(seen.asks).toEqual([true, false]);
    // The same page under another #hash: nothing is asked and the router hears it.
    const v = world(), second = v.form();
    v.hub.setDirty(second.entry, true);
    expect(v.pop().stopped).toBe(0);
    expect(second.seen.asks).toEqual([]);
  });
  it('stops a Back before it happens where the browser has the Navigation API, and continues only on Discard', () => {
    const w = world();
    const navigation = {currentEntry: {index: 4}, addEventListener: w.env.win.addEventListener, removeEventListener: w.env.win.removeEventListener};
    w.env.win.navigation = navigation;
    const {entry, seen} = w.form();
    const move = (more: object = {}) => { const event = {navigationType: 'traverse', cancelable: true, prevented: 0, preventDefault() { event.prevented++; },
      destination: {url: 'https://app.test/app/settings', index: 3, sameDocument: true}, ...more}; w.fire('window', 'navigate', event); return event; };
    // Clean: nothing listens.
    expect(move().prevented).toBe(0);
    w.hub.setDirty(entry, true);
    expect(w.listeners.map(item => item.type).sort()).toEqual(['beforeunload', 'click', 'currententrychange', 'navigate', 'popstate']);
    expect(move().prevented).toBe(1);
    expect(seen.asks).toEqual([true]);
    expect(w.state.went).toEqual([]);
    w.hub.keep();
    // Not a history move, not stoppable, another document, or this same page under a #hash: left alone.
    expect(move({navigationType: 'push'}).prevented).toBe(0);
    expect(move({cancelable: false}).prevented).toBe(0);
    expect(move({destination: {url: 'https://app.test/login', index: 0, sameDocument: false}}).prevented).toBe(0);
    expect(move({destination: {url: HERE.href + '#logo', index: 3, sameDocument: true}}).prevented).toBe(0);
    expect(seen.asks).toEqual([true, false]);
    // Discard: the same move again, and this time it passes.
    expect(move().prevented).toBe(1);
    w.hub.discard();
    expect(w.state.went).toEqual([-1]);
    expect(move().prevented).toBe(0);
    w.hub.setDirty(entry, false);
    expect(w.listeners).toEqual([]);
  });
  it('asks before a leave the form owns, and runs it at once when clean', () => {
    const w = world(), {entry, seen} = w.form();
    let ran = 0;
    w.hub.leave(() => { ran++; });
    expect(ran).toBe(1);
    w.hub.setDirty(entry, true);
    w.hub.leave(() => { ran++; });
    expect([ran, seen.asks.length]).toEqual([1, 1]);
    w.hub.keep();
    expect(ran).toBe(1);
    w.hub.leave(() => { ran++; });
    w.hub.discard();
    expect(ran).toBe(2);
  });
  it('releases after a save: clean means no question, no prompt, no handler', () => {
    const w = world(), {entry, seen} = w.form();
    w.hub.setDirty(entry, true);
    w.hub.setDirty(entry, false);
    const event = click(anchor('/app/settings'));
    w.fire('document', 'click', event);
    expect(event.prevented).toBe(0);
    expect(w.unload().prevented).toBe(0);
    expect(seen.asks).toEqual([]);
  });
  it('closes the question when its form is saved or goes away while it is open', () => {
    const w = world(), {entry, seen} = w.form();
    w.hub.setDirty(entry, true);
    w.fire('document', 'click', click(anchor('/app/settings')));
    w.hub.remove(entry);
    expect(seen.asks).toEqual([true, false]);
    expect(w.listeners).toEqual([]);
    w.hub.discard();
    expect(seen.went).toEqual([]);
  });
  it("stands down for the app's own navigation: a router push to another page, and an ended session", () => {
    const w = world(), {entry, seen} = w.form();
    w.hub.setDirty(entry, true);
    // The router starts a navigation by itself (a save's redirect, the sign-in redirect): no browser prompt if it
    // ends as a browser navigation.
    w.state.routed[0]('/login');
    expect(w.unload().prevented).toBe(0);
    w.state.now += ROUTER_PASS_MS;
    expect(w.unload().prevented).toBe(1);
    // The form's own change of query is not a leave.
    w.state.routed[0]('/app/settings/branding?step=2');
    expect(w.unload().prevented).toBe(1);
    // The shell says the session is no longer this person's.
    w.fire('document', 'click', click(anchor('/app/settings')));
    w.hub.release();
    expect(seen.asks).toEqual([true, false]);
    expect(w.unload().prevented).toBe(0);
    expect((w.fire('document', 'click', click(anchor('/app/settings'))) as ReturnType<typeof click>).prevented).toBe(0);
  });
  it('asks once for a page with two dirty forms', () => {
    const w = world(), first = w.form(), second = w.form();
    w.hub.setDirty(first.entry, true);
    w.hub.setDirty(second.entry, true);
    expect(w.listeners.filter(item => item.type === 'click').length).toBe(1);
    w.fire('document', 'click', click(anchor('/app/settings')));
    expect([first.seen.asks, second.seen.asks]).toEqual([[true], []]);
    w.hub.setDirty(first.entry, false);
    expect(first.seen.asks).toEqual([true, false]);
    expect(w.hub.installed()).toBe(true);
  });
});
