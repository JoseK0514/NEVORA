import { expect, it, vi } from "vitest";
vi.mock("@/app/login/actions", () => ({ logout: vi.fn() }));
import { startSignoutCleanup } from "@/components/portal-signout";
it("announces same-tab retirement before running signout cleanup", () => {
  const target = new EventTarget();
  const order: string[] = [];
  target.addEventListener("nevora:signout", () => order.push("retire"));
  vi.stubGlobal("window", target);
  try {
    startSignoutCleanup(() => {
      order.push("cleanup");
    });
    expect(order).toEqual(["retire", "cleanup"]);
  } finally {
    vi.unstubAllGlobals();
  }
});
