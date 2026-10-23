import { expect, it, vi } from "vitest";
import { bindAdvisorLifecycle } from "./lifecycle";
it("never restores while unfocused and permanently retires on same-tab signout", () => {
  const win = new EventTarget();
  let focused = true;
  const doc = Object.assign(new EventTarget(), {
    visibilityState: "visible" as const,
    hasFocus: () => focused,
  });
  const controller = { start: vi.fn(), pause: vi.fn(), stop: vi.fn() };
  const cleanup = bindAdvisorLifecycle(controller, win, doc, () => true);
  expect(controller.start).toHaveBeenCalledTimes(1);
  focused = false;
  win.dispatchEvent(new Event("blur"));
  win.dispatchEvent(new Event("storage"));
  win.dispatchEvent(new Event("online"));
  expect(controller.start).toHaveBeenCalledTimes(1);
  focused = true;
  win.dispatchEvent(new Event("focus"));
  expect(controller.start).toHaveBeenCalledTimes(2);
  win.dispatchEvent(new Event("nevora:signout"));
  expect(controller.pause).toHaveBeenCalled();
  expect(controller.stop).toHaveBeenCalledTimes(1);
  win.dispatchEvent(new Event("focus"));
  win.dispatchEvent(new Event("pageshow"));
  expect(controller.start).toHaveBeenCalledTimes(2);
  cleanup();
});
