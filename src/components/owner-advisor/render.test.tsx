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
it("offers both explicit workflows without a provider and renders server-owned exact proposals", () => {
  const html = renderToStaticMarkup(<AdvisorScreen view={{ ...initialView, loading: false, snapshot, answer: {
    text: "Prepared options", sources: [], proposals: [{ employeeName: "Fictional Ana", locationId: "L1", locationName: "North", date: "2026-10-22", startTime: "08:00", endTime: "12:00", positionName: "Barista", isDesignatedLead: false, scheduledHours: 12, targetHours: 20, publication: "DRAFT", review: "abc123" }],
  } }} actions={actions} />);
  expect(html).toContain("Prepare coverage options");
  expect(html).toContain("Review attendance and payroll");
  expect(html).toContain("Fictional Ana");
  expect(html).toContain('/app/schedule/new?review=abc123');
  expect(html).toContain("Draft assignment");
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

it("dates comparison staleness by its observation instead of the currently visible receipt",async()=>{
  const {ownerCoveragePlan}=await import("@/test/fixtures/owner-coverage-plan");
  const {ownerCoverageAction}=await import("@/test/fixtures/owner-coverage-action");
  const receipt=ownerCoverageAction("coverage_saved");receipt.receipt!.savedAt="2026-10-30T12:01:00Z";
  const coverageActions={acknowledge:()=>{},save:async()=>{},recover:async()=>{},check:async()=>{},dismiss:()=>{}};
  const coverage={view:{stage:"saved" as const,result:receipt,acknowledged:false,message:"",lastSavedAt:receipt.receipt!.savedAt},actions:coverageActions};
  const plans=ownerCoveragePlan();plans.observedAt="2026-10-30T12:02:00Z";
  const answer={text:"Compare current plans",sources:[],coveragePlans:plans};
  const fresh=renderToStaticMarkup(<AdvisorScreen view={{...initialView,snapshot,answer}} actions={actions} coverage={coverage}/>);
  expect(fresh).not.toContain("This comparison predates your save");
  plans.observedAt="2026-10-30T12:00:00Z";
  const earlier=renderToStaticMarkup(<AdvisorScreen view={{...initialView,snapshot,answer}} actions={actions} coverage={{...coverage,view:{...coverage.view,stage:"review",result:ownerCoverageAction()}}}/>);
  expect(earlier).toContain("This comparison predates your save");
  expect(earlier).toContain("From an earlier comparison");
});
it("renders bounded labeled decision objective and scope controls with review limitations", () => {
  const html = renderToStaticMarkup(<AdvisorScreen view={{ ...initialView, loading: false, snapshot, mode: "decision", decisionObjective: "Keep coverage", decisionFocus: { kind: "coverage", date: "2026-11-01" } }} actions={actions} />);
  expect(html).toContain('id="oa-decision-objective"');
  expect(html).toContain('maxLength="1000"');
  expect(html).toContain('id="oa-decision-date"');
  expect(html).toContain("Reviewed decision");
  expect(html).toContain("does not prove every written claim");
});
