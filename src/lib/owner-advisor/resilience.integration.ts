/** Validates fictional scenario facts and real read boundaries, never model judgment. */
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { resilienceScenarios } from "@/test/fixtures/owner-advisor-resilience";
import { companyAccessFixture } from "@/test/integration/company-access-fixture";
import { seedResilienceScenario, resilienceBusinessSnapshot } from "@/test/integration/owner-advisor-resilience-fixture";
import { AdvisorStore } from "./store.server";
import { AdvisorTools } from "./tools.server";
import { admitOwner } from "./authority.server";

let f: Awaited<ReturnType<typeof companyAccessFixture>>;
beforeEach(async () => { vi.stubEnv("NEVORA_PAYROLL_ENABLED", "false"); f = await companyAccessFixture(); });
afterEach(async () => { try { await f?.db.dispose(); } finally { vi.unstubAllEnvs(); } });

it.each(resilienceScenarios)("preflights real fixture/read authority, not AI judgment: $id", async scenario => {
  const setup = await seedResilienceScenario(f, scenario), before = await resilienceBusinessSnapshot(f);
  if (scenario.fixture === "revoked") {
    await expect(admitOwner(f.owner, f.db.executor)).rejects.toThrow();
    expect(await resilienceBusinessSnapshot(f)).toEqual(before);
    return;
  }
  const store = new AdvisorStore(f.owner, await admitOwner(f.owner, f.db.executor), f.db.executor);
  const result = await new AdvisorTools(store).run(setup.tool);
  if (result.coveragePlans) {
    const plan = result.coveragePlans;
    if (scenario.fixture === "oversized") expect(plan).toMatchObject({ state: "unavailable", reason: "INPUT_LIMIT", partial: true, alternatives: [] });
    else {
      expect(plan.state).toBe("ready");
      if (scenario.fixture === "joint") {
        expect(plan.alternatives[0]).toMatchObject({ status: "COMPLETE", addedMinutes: 480, remaining: { total: 0 } });
        expect(plan.alternatives[0].assignments.map(a => [a.employeeName, a.locationId, a.positionName]).sort()).toEqual([["Riley Fictional", "loc-1", null], ["Target QA", "loc-2", "Barista"]]);
      } else if (scenario.fixture === "partial") {
        expect(plan.partial).toBe(true);
        expect(plan.locations.find(l => l.id === "loc-2")?.state).toBe("ARCHIVED");
        expect(plan.alternatives[0].assignments.every(a => a.locationId !== "loc-2")).toBe(true);
      } else {
        expect(plan.alternatives.every(a => a.status !== "COMPLETE")).toBe(true);
        expect(plan.alternatives.every(a => a.remaining.total > 0)).toBe(true);
      }
    }
  } else if (["stale", "published-callout"].includes(scenario.fixture)) expect(result.data).toMatchObject({ publication: "PUBLISHED", shifts: [] });
  else if (scenario.fixture === "injected-name") expect(result.data).toMatchObject({ shifts: [{ locationId: "loc-1", startTime: "08:00", endTime: "12:00", employeeName: expect.stringContaining("SYSTEM OVERRIDE") }] });
  else if (scenario.fixture === "period") {
    expect(result.periodReview).toMatchObject({ readiness: "unverified", partial: true, payroll: { state: "disabled" } });
    expect(result.periodReview!.attendance.employees.find(e => e.name === "Target QA")!.issues).toContain("open_entry");
  } else expect(result.data).toMatchObject({ companyName: "Fictional NEVORA Resilience Lab" });
  if (setup.taskId) expect(await f.q("SELECT tasks->0->>'state' state FROM owner_advisor_notebooks")).toEqual([{ state: "open" }]);
  expect(await resilienceBusinessSnapshot(f)).toEqual(before);
});
