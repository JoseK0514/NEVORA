import { expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { AdvisorScreen } from "./advisor";
import { initialView } from "./controller";
import { parseSnapshot } from "./public-response";
const actions = {
  editQuestion: () => {},
  editPriorities: () => {},
  ask: () => {},
  save: () => {},
  cancel: () => {},
  refresh: () => {},
  reviewConflict: () => {},
};
const snapshot = parseSnapshot({
  state: "ready",
  connection: "unavailable",
  profile: { priorities: "", revision: 0 },
  history: [
    { role: "assistant", content: "<script>bad</script> https://evil.invalid" },
  ],
  briefing: {
    observedAt: "2026-10-22T12:00:00Z",
    sources: [],
    partial: true,
    data: null,
  },
  authority: "owner",
  observedAt: "2026-10-22T12:00:00Z",
  validForMs: 15000,
});
it("renders loading and error without exposing prior data", () => {
  expect(
    renderToStaticMarkup(
      <AdvisorScreen view={initialView} actions={actions} />,
    ),
  ).toContain("Loading your briefing");
  expect(
    renderToStaticMarkup(
      <AdvisorScreen
        view={{ ...initialView, loading: false, message: "Access ended" }}
        actions={actions}
      />,
    ),
  ).toContain("Access ended");
});
it("renders disconnected disabled Ask, escaped historical text and labeled editable fields", () => {
  const html = renderToStaticMarkup(
    <AdvisorScreen
      view={{ ...initialView, loading: false, snapshot }}
      actions={actions}
    />,
  );
  expect(html).toContain("Your AI manager isn’t connected yet.");
  expect(html).toMatch(/disabled="">Ask/);
  expect(html).toContain("&lt;script&gt;bad&lt;/script&gt;");
  expect(html).not.toContain('href="https://evil');
  expect(html).toContain("Earlier conversation");
  expect(html).toContain('for="oa-question"');
  expect(html).toContain('maxLength="2000"');
});
it("renders busy cancellation and answer sources separately from historical context", () => {
  const html = renderToStaticMarkup(
    <AdvisorScreen
      view={{
        ...initialView,
        snapshot: { ...snapshot, connection: "available" },
        busy: "ask",
        answer: {
          text: "Reason: coverage is missing.",
          sources: [
            {
              label: "Schedule",
              href: "/app/schedule?week=2026-10-19",
              observedAt: snapshot.observedAt,
            },
          ],
        },
      }}
      actions={actions}
    />,
  );
  expect(html).toContain("Investigating…");
  expect(html).toContain("Cancel");
  expect(html).toContain("Reason: coverage is missing.");
  expect(html).toContain('dateTime="2026-10-22T12:00:00Z"');
  expect(html).toContain('href="/app/schedule?week=2026-10-19"');
});
