import { expect, it, rs } from '@rstest/core';
rs.mock("@/app/login/actions", () => ({ logout: rs.fn() }));
import { startSignoutCleanup } from "@/components/portal-signout";
it("announces same-tab retirement before running signout cleanup", () => {
  const target = new EventTarget();
  const order: string[] = [];
  target.addEventListener("nevora:signout", () => order.push("retire"));
  rs.stubGlobal("window", target);
  try {
    startSignoutCleanup(() => {
      order.push("cleanup");
    });
    expect(order).toEqual(["retire", "cleanup"]);
  } finally {
    rs.unstubAllGlobals();
  }
});
