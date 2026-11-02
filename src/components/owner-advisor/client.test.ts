import { expect, it } from "vitest";
import {
  navigationForRole,
  managementNavigationGroups,
  mobileMoreForRole,
} from "@/lib/navigation";
import { parseSnapshot, parseAnswer } from "./public-response";
const stamp = {
  authority: "owner-proof",
  observedAt: "2026-10-22T12:00:00.000Z",
  validForMs: 15000,
};
export const snapshot = {
  state: "ready",
  connection: "unavailable",
  profile: { priorities: "", revision: 0 },
  history: [],
  briefing: {
    observedAt: stamp.observedAt,
    sources: [],
    partial: true,
    data: null,
  },
  ...stamp,
};
it("discovers AI manager only for an explicitly enabled Owner in desktop and mobile navigation", () => {
  expect(
    navigationForRole("OWNER").some((x) => x.href === "/app/ai-manager"),
  ).toBe(false);
  for (const role of ["OWNER", "MANAGER", "EMPLOYEE", "LEAD"] as const) {
    const items = navigationForRole(role, undefined, {
      ownerAdvisorEnabled: true,
    });
    expect(items.some((x) => x.href === "/app/ai-manager")).toBe(
      role === "OWNER",
    );
  }
  const items = navigationForRole("OWNER", undefined, {
    ownerAdvisorEnabled: true,
  });
  expect(
    managementNavigationGroups(items)
      .flatMap((x) => x.items)
      .some((x) => x.href === "/app/ai-manager"),
  ).toBe(true);
  expect(
    mobileMoreForRole("OWNER", undefined, { ownerAdvisorEnabled: true }).some(
      (x) => x.href === "/app/ai-manager",
    ),
  ).toBe(true);
});
it("rejects malformed public snapshots, lifetimes and untrusted source destinations", () => {
  expect(parseSnapshot(snapshot)).toEqual(snapshot);
  for (const patch of [
    { validForMs: 15001 },
    { validForMs: 0 },
    { observedAt: "bad" },
    { profile: { priorities: 4, revision: 0 } },
    { history: [{ role: "system", content: "bad" }] },
    { briefing: { ...snapshot.briefing, data: { counts: {} } } },
  ])
    expect(() => parseSnapshot({ ...snapshot, ...patch })).toThrow();
  for (const href of [
    "https://evil.invalid",
    "//evil.invalid",
    "javascript:alert(1)",
    "/app/../api/logout",
    "/app?redirect=evil",
    "/app/schedule?week=bad",
  ])
    expect(() =>
      parseAnswer({
        state: "answered",
        ...stamp,
        answer: {
          text: "plain",
          sources: [{ label: "Source", href, observedAt: stamp.observedAt }],
        },
      }),
    ).toThrow();
  expect(
    parseAnswer({
      state: "answered",
      ...stamp,
      answer: {
        text: "<script>evil</script>",
        sources: [
          { label: "Home", href: "/app", observedAt: stamp.observedAt },
        ],
      },
    }).answer.text,
  ).toBe("<script>evil</script>");
});
it("rejects malformed public decision context", () => {
  const value = { state: "answered", answer: { text: "Reviewed", sources: [], decision: { objective: "Goal", focus: { kind: "coverage", date: "2026-02-30" } } }, authority: "owner", observedAt: "2026-11-01T12:00:00Z", validForMs: 15000 };
  expect(() => parseAnswer(value)).toThrow();
});
