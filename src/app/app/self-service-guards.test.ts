import { beforeEach, expect, it, vi } from "vitest";
import { requireSession } from "@/lib/auth/session";
import { getDb } from "@/lib/db";
import { saveAvailabilityAction, saveWeeklyAvailabilityAction } from "./availability/actions";
import { acknowledgeScheduleAction } from "./schedule/acknowledge-actions";
import { cancelExchangeAction, claimCoverageAction, offerCoverageAction, proposeSwapAction, respondSwapAction, reviewExchangeAction } from "./exchange/actions";
import { cancelCalloutAction, submitCalloutAction, reviewCalloutAction } from "./exchange/callout/actions";
import SwapPage from "./exchange/swap/page";
import CalloutPage from "./exchange/callout/page";
import { requireSelfService, TIME_OFF_REVIEW_ROLES, SELF_SERVICE_ROLES } from "@/lib/auth/permissions";
import { requestTimeOffAction, reviewTimeOffAction } from "./requests/actions";
import { saveScheduleHealthSettingsAction } from "./schedule/settings/actions";
import { createTimeOffRequest, reviewTimeOffRequest } from "@/lib/data/requests";

vi.mock("@/lib/auth/session", () => ({ requireSession: vi.fn() }));
// Resolve production aliases locally; no worktree-specific Vitest configuration.
vi.mock("@/lib/auth/permissions", () => import("../../lib/auth/permissions"));
vi.mock("@/lib/scheduling/periods", () => import("../../lib/scheduling/periods"));
vi.mock("@/lib/data/schedule-health", () => import("../../lib/data/schedule-health"));
vi.mock("@/lib/date-utils", () => import("../../lib/date-utils"));
vi.mock("@/lib/data/availability", () => import("../../lib/data/availability"));
vi.mock("@/lib/data/week-settings", () => import("../../lib/data/week-settings"));
vi.mock("@/lib/data/exchanges", () => import("../../lib/data/exchanges"));
vi.mock("@/lib/data/callouts", () => import("../../lib/data/callouts"));
vi.mock("@/lib/data/acknowledgements", () => import("../../lib/data/acknowledgements"));
vi.mock("@/lib/data/schedules", () => import("../../lib/data/schedules"));
vi.mock("@/lib/scheduling/exchange-validation", () => import("../../lib/scheduling/exchange-validation"));
vi.mock("@/lib/scheduling/validate-shift", () => import("../../lib/scheduling/validate-shift"));
vi.mock("@/components/nav-icon", () => import("../../components/nav-icon"));
vi.mock("@/components/page-header", () => import("../../components/page-header"));
vi.mock("@/components/status-pill", () => import("../../components/status-pill"));
vi.mock("@/components/employee-submit-button", () => import("../../components/employee-submit-button"));
vi.mock("@/components/employee-shift-picker", () => import("../../components/employee-shift-picker"));
vi.mock("@/app/app/exchange/actions", () => import("./exchange/actions"));
vi.mock("@/app/app/exchange/callout/actions", () => import("./exchange/callout/actions"));
vi.mock("next/navigation", () => ({ redirect: (path: string) => { throw new Error(`redirect:${path}`); } }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("@/lib/data/requests", () => ({ createTimeOffRequest: vi.fn(), reviewTimeOffRequest: vi.fn() }));
vi.mock("@/lib/db", () => ({ getDb: vi.fn(() => { throw new Error("Unexpected database access"); }), queryRows: (rows: unknown) => rows }));

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(reviewTimeOffRequest).mockResolvedValue(true);
});
const actions = [requestTimeOffAction, saveAvailabilityAction, saveWeeklyAvailabilityAction, acknowledgeScheduleAction, cancelExchangeAction, claimCoverageAction, offerCoverageAction, proposeSwapAction, respondSwapAction, cancelCalloutAction, submitCalloutAction];
it.each(["OWNER", "MANAGER"] as const)("%s cannot invoke employee actions or personal request routes", async (role) => {
  vi.mocked(requireSession).mockResolvedValue({ id: "viewer", firstName: "Alex", lastName: "Rivera", role, primaryLocationId: "loc-1" });
  for (const action of actions) {
    await expect(action(new FormData())).rejects.toThrow(/^redirect:\/app\/(requests|availability|schedule|exchange)/);
  }
  for (const page of [SwapPage, CalloutPage]) {
    await expect(page({ searchParams: Promise.resolve({ shiftId: "shift-1" }) })).rejects.toThrow("redirect:/app/exchange?tab=requests");
  }
  expect(getDb).not.toHaveBeenCalled();
  expect(createTimeOffRequest).not.toHaveBeenCalled();
});
it.each(["EMPLOYEE", "LEAD"] as const)("%s retains the self-service permission boundary", async (role) => {
  const viewer = { id: "viewer", firstName: "Sam", lastName: "Cruz", role, primaryLocationId: "loc-1" };
  vi.mocked(requireSession).mockResolvedValue(viewer);
  expect(await requireSelfService()).toEqual(viewer);
  for (const review of [reviewTimeOffAction, reviewExchangeAction, reviewCalloutAction, saveScheduleHealthSettingsAction]) {
    await expect(review(new FormData())).rejects.toThrow("redirect:/app");
  }
  expect(getDb).not.toHaveBeenCalled();
  expect(reviewTimeOffRequest).not.toHaveBeenCalled();
});
it("preserves authentication redirects before role checks", async () => {
  vi.mocked(requireSession).mockRejectedValue(new Error("redirect:/login"));
  await expect(saveAvailabilityAction(new FormData())).rejects.toThrow("redirect:/login");
  expect(getDb).not.toHaveBeenCalled();
});


it("keeps Lead in self-service and restricts Time Off review to Owner/Manager", () => {
  expect(SELF_SERVICE_ROLES).toEqual(["EMPLOYEE", "LEAD"]);
  expect(TIME_OFF_REVIEW_ROLES).toEqual(["OWNER", "MANAGER"]);
});
it.each(["EMPLOYEE", "LEAD"] as const)("%s can submit valid personal Time Off", async role => {
  vi.mocked(requireSession).mockResolvedValue({ id: "viewer", firstName: "Sam", lastName: "Cruz", role, primaryLocationId: "loc-1" });
  const data = new FormData();
  data.set("startDate", "2030-10-07"); data.set("endDate", "2030-10-08");
  await expect(requestTimeOffAction(data)).rejects.toThrow("redirect:/app/requests?tab=my&submitted=1");
  expect(createTimeOffRequest).toHaveBeenCalledWith(expect.objectContaining({ employeeId: "viewer", startDate: "2030-10-07" }));
});
it.each(["OWNER", "MANAGER"] as const)("%s can review team Time Off", async role => {
  vi.mocked(requireSession).mockResolvedValue({ id: "reviewer", firstName: "Alex", lastName: "Rivera", role, primaryLocationId: "loc-1" });
  const data = new FormData(); data.set("requestId", "request-1"); data.set("decision", "APPROVED");
  await expect(reviewTimeOffAction(data)).rejects.toThrow("redirect:/app/requests?tab=team&reviewed=1");
  expect(reviewTimeOffRequest).toHaveBeenCalledWith({ requestId: "request-1", managerId: "reviewer", status: "APPROVED" });
});
it("does not report an already changed Time Off request as a successful review", async () => {
  vi.mocked(requireSession).mockResolvedValue({ id: "reviewer", firstName: "Alex", lastName: "Rivera", role: "MANAGER", primaryLocationId: "loc-1" });
  vi.mocked(reviewTimeOffRequest).mockResolvedValue(false);
  const data = new FormData(); data.set("requestId", "request-1"); data.set("decision", "APPROVED");
  await expect(reviewTimeOffAction(data)).rejects.toThrow("redirect:/app/requests?tab=team&error=review");
});

vi.mock("@/lib/business-time",()=>import("../../lib/business-time"));
vi.mock("@/lib/data/workspaces",()=>({getWorkspace:async()=>({timeZone:"America/Puerto_Rico"})}));
