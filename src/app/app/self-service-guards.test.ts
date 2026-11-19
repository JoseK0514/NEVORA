import * as rstestOriginal0 from "@/lib/workspace-presentation/service" with { rstest: 'importActual' };
rs.mock('server-only',()=>({}));
import { managementProof } from "../../test/fixtures/management";
import { beforeEach, expect, it, rs } from '@rstest/core';
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
rs.mock('@/lib/workspace-presentation/service',  () => ({ ...(rstestOriginal0), readActivePresentation: async () => ({ style: undefined, tokens: null, logoAssetId: null, revision: 0, words: 'standard' as const, modules: (await import('@/lib/workspace-presentation/modules')).ALL_MODULES_ON }) })); // no saved settings: every module on

rs.mock("@/lib/auth/session", () => ({ requireSession: rs.fn(), requireSessionMutationProof:async()=>{const viewer=await requireSession();return managementProof(viewer.id,viewer.role);} }));
rs.mock("next/navigation", () => ({ redirect: (path: string) => { throw new Error(`redirect:${path}`); } }));
rs.mock("next/cache", () => ({ revalidatePath: rs.fn() }));
rs.mock("@/lib/data/requests", () => ({ createTimeOffRequest: rs.fn(), reviewTimeOffRequest: rs.fn() }));
rs.mock("@/lib/db", () => ({ getDb: rs.fn(() => { throw new Error("Unexpected database access"); }), queryRows: (rows: unknown) => rows }));

beforeEach(() => {
  rs.clearAllMocks();
  rs.mocked(reviewTimeOffRequest).mockResolvedValue(true);
});
const actions = [requestTimeOffAction, saveAvailabilityAction, saveWeeklyAvailabilityAction, acknowledgeScheduleAction, cancelExchangeAction, claimCoverageAction, offerCoverageAction, proposeSwapAction, respondSwapAction, cancelCalloutAction, submitCalloutAction];
it.each(["OWNER", "MANAGER"] as const)("%s cannot invoke employee actions or personal request routes", async (role) => {
  rs.mocked(requireSession).mockResolvedValue({ id: "viewer", firstName: "Alex", lastName: "Rivera", role, primaryLocationId: "loc-1" });
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
  rs.mocked(requireSession).mockResolvedValue(viewer);
  expect(await requireSelfService()).toEqual(viewer);
  // Review Nov 14 (AR-18): the shared role gate sends a wrong-role visitor to the in-app notice; Scheduling rules' own
  // action guard still returns Home.
  for (const review of [reviewTimeOffAction, reviewExchangeAction, reviewCalloutAction]) {
    await expect(review(new FormData())).rejects.toThrow(/^redirect:\/app\/restricted$/);
  }
  await expect(saveScheduleHealthSettingsAction(new FormData())).rejects.toThrow(/^redirect:\/app$/);
  expect(getDb).not.toHaveBeenCalled();
  expect(reviewTimeOffRequest).not.toHaveBeenCalled();
});
it("preserves authentication redirects before role checks", async () => {
  rs.mocked(requireSession).mockRejectedValue(new Error("redirect:/login"));
  await expect(saveAvailabilityAction(new FormData())).rejects.toThrow("redirect:/login");
  expect(getDb).not.toHaveBeenCalled();
});


it("keeps Lead in self-service and restricts Time Off review to Owner/Manager", () => {
  expect(SELF_SERVICE_ROLES).toEqual(["EMPLOYEE", "LEAD"]);
  expect(TIME_OFF_REVIEW_ROLES).toEqual(["OWNER", "MANAGER"]);
});
it.each(["EMPLOYEE", "LEAD"] as const)("%s can submit valid personal Time Off", async role => {
  rs.mocked(requireSession).mockResolvedValue({ id: "viewer", firstName: "Sam", lastName: "Cruz", role, primaryLocationId: "loc-1" });
  const data = new FormData();
  data.set("requestId", "af375c1d-1210-4fe0-aa0a-4dbe9cb86901");
  data.set("startDate", "2030-10-07"); data.set("endDate", "2030-10-08");
  await expect(requestTimeOffAction(data)).rejects.toThrow("redirect:/app/requests?tab=my&submitted=1");
  expect(createTimeOffRequest).toHaveBeenCalledWith(expect.objectContaining({ employeeId: "viewer", startDate: "2030-10-07" }));
});
it.each(["OWNER", "MANAGER"] as const)("%s can review team Time Off", async role => {
  rs.mocked(requireSession).mockResolvedValue({ id: "reviewer", firstName: "Alex", lastName: "Rivera", role, primaryLocationId: "loc-1" });
  const data = new FormData(); data.set("requestId", "request-1"); data.set("decision", "APPROVED");
  await expect(reviewTimeOffAction(data)).rejects.toThrow("redirect:/app/requests?tab=pending&reviewed=1");
  expect(reviewTimeOffRequest).toHaveBeenCalledWith({ requestId: "request-1", managerId: "reviewer", status: "APPROVED", proof:managementProof("reviewer",role) });
});
it("does not report an already changed Time Off request as a successful review", async () => {
  rs.mocked(requireSession).mockResolvedValue({ id: "reviewer", firstName: "Alex", lastName: "Rivera", role: "MANAGER", primaryLocationId: "loc-1" });
  rs.mocked(reviewTimeOffRequest).mockResolvedValue(false);
  const data = new FormData(); data.set("requestId", "request-1"); data.set("decision", "APPROVED");
  await expect(reviewTimeOffAction(data)).rejects.toThrow("redirect:/app/requests?tab=pending&error=review");
});

rs.mock("@/lib/data/workspaces",()=>({getWorkspace:async()=>({timeZone:"America/Puerto_Rico"})}));

rs.mock('@/lib/data/shift-changes',()=>({executeShiftChange:rs.fn(),findShiftChangeOperation:rs.fn()}));

rs.mock('@/lib/data/shift-change-snapshot',()=>({readShiftChangeTerms:rs.fn()}));
rs.mock('@/lib/data/shift-change-policy',()=>({saveShiftChangePolicy:rs.fn()}));
rs.mock('@/lib/data/notification-transactions',()=>({neonNotificationExecutor:()=>({})}));
