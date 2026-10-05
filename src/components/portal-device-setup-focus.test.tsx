import { afterEach, beforeEach, expect, it, vi } from "vitest";

// Mount the actual component's effect without adding a DOM dependency. Native
// popover event timing and pointer focus are verified separately in both engines.
const hooks = vi.hoisted(() => ({ effects: [] as (() => void | (() => void))[] }));
vi.mock("react", async original => ({
  ...await original<Record<string, unknown>>(),
  useEffect: (effect: () => void | (() => void)) => { hooks.effects.push(effect); },
  useRef: (current: unknown) => ({ current }),
  useState: (initial: unknown) => [initial, () => {}],
}));
import { PortalDeviceSetup } from "./portal-device-setup";

let active: TestElement;
let body: TestElement;
let more: TestElement;
let frames: FrameRequestCallback[];
let dispose: (() => void) | void;

class TestElement extends EventTarget {
  isConnected = true;
  visible = true;
  open = false;
  parent: TestElement | null = null;
  close: TestElement | null = null;
  constructor(readonly target?: string) { super(); }
  getAttribute(name: string) { return name === "popovertarget" ? this.target ?? null : null; }
  getClientRects(): object[] {
    return this.isConnected && this.visible && (!this.parent || this.parent.open) ? [{}] : [];
  }
  contains(node: unknown): boolean { return node === this || (node instanceof TestElement && node.parent === this); }
  matches() { return this.open; }
  querySelector() { return this.close; }
  focus() { active = this; }
  showPopover() { this.toggle(true); }
  hidePopover() { this.toggle(false); }
  private toggle(open: boolean) {
    this.open = open;
    const event = new Event("toggle");
    Object.defineProperty(event, "newState", { value: open ? "open" : "closed" });
    this.dispatchEvent(event);
  }
}

beforeEach(() => {
  hooks.effects = []; frames = [];
  body = new TestElement(); more = new TestElement(); active = body;
  const document = Object.assign(new EventTarget(), {
    body, documentElement: new TestElement(), visibilityState: "visible",
    get activeElement() { return active; },
    querySelector: () => more,
  });
  // Object.assign evaluates accessors; keep activeElement live like the browser.
  Object.defineProperty(document, "activeElement", { get: () => active });
  vi.stubGlobal("document", document);
  vi.stubGlobal("window", Object.assign(new EventTarget(), {
    isSecureContext: false, matchMedia: () => ({ matches: false }),
  }));
  vi.stubGlobal("navigator", { userAgent: "Unit focus fixture", platform: "", maxTouchPoints: 0 });
  vi.stubGlobal("HTMLElement", TestElement);
  vi.stubGlobal("requestAnimationFrame", (callback: FrameRequestCallback) => { frames.push(callback); return frames.length; });
  vi.stubGlobal("fetch", async () => ({ ok: true, json: async () => ({ supported: false, enabled: false, configurationAvailable: false, testAllowed: false }) }));
});
afterEach(() => { dispose?.(); dispose = undefined; vi.unstubAllGlobals(); });
function flushFrames() { const pending = frames.splice(0); for (const frame of pending) frame(0); }
function mount() {
  const view = PortalDeviceSetup({ role: "EMPLOYEE" });
  const surface = new TestElement();
  surface.close = new TestElement(); surface.close.parent = surface;
  view.props.ref.current = surface;
  dispose = hooks.effects[0]();
  const opener = new TestElement("portal-device-settings");
  return { surface, opener };
}
function openFromProfile(surface: TestElement, opener: TestElement) {
  opener.focus(); surface.showPopover(); flushFrames();
  expect(active).toBe(surface.close);
}

it("outside dismissal preserves a newly focused visible control", () => {
  const { surface, opener } = mount(); openFromProfile(surface, opener);
  const outside = new TestElement(); outside.focus();
  surface.hidePopover(); flushFrames();
  expect(active).toBe(outside);
});
it("outside focus remains intact when the parent More popover also closes", () => {
  const { surface, opener } = mount(); openFromProfile(surface, opener);
  const outside = new TestElement(); outside.focus(); opener.visible = false;
  surface.hidePopover(); flushFrames();
  expect(active).toBe(outside);
});
it("checks current focus when the close animation frame actually runs", () => {
  const { surface, opener } = mount(); openFromProfile(surface, opener);
  surface.hidePopover();
  const outside = new TestElement(); outside.focus(); flushFrames();
  expect(active).toBe(outside);
});
it("restores the profile opener when closing strands focus inside Device Settings", () => {
  const { surface, opener } = mount(); openFromProfile(surface, opener);
  surface.hidePopover(); flushFrames();
  expect(active).toBe(opener);
});
it("recovers to More when the nested opener is no longer visible", () => {
  const { surface, opener } = mount(); openFromProfile(surface, opener);
  opener.visible = false; surface.hidePopover(); flushFrames();
  expect(active).toBe(more);
});
it("programmatic setup opening and closing preserves an active outside control", () => {
  const { surface } = mount(); const outside = new TestElement(); outside.focus();
  surface.showPopover(); flushFrames(); expect(active).toBe(outside);
  surface.hidePopover(); flushFrames(); expect(active).toBe(outside);
});
