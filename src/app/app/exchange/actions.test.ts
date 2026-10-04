import { beforeEach, expect, it, vi } from "vitest";
import { proposeSwapAction, reviewExchangeAction } from "./actions";
import { requireSession } from "@/lib/auth/session";
import { approveCoverageExchange, createSwapProposal, denyExchange, getExchange, getPublishedShift } from "@/lib/data/exchanges";
import { getShiftValidationContext } from "@/lib/data/schedules";
vi.mock("@/lib/auth/session", () => ({ requireSession: vi.fn() }));
vi.mock("@/lib/auth/permissions", () => import("../../../lib/auth/permissions"));
vi.mock("@/lib/date-utils", () => import("../../../lib/date-utils"));
vi.mock("@/lib/scheduling/exchange-validation", () => import("../../../lib/scheduling/exchange-validation"));
vi.mock("@/lib/scheduling/validate-shift", () => import("../../../lib/scheduling/validate-shift"));
vi.mock("@/lib/data/acknowledgements", () => ({clearWeekAcknowledgements:vi.fn()}));
vi.mock("next/navigation", () => ({ redirect: (path: string) => { throw new Error(`redirect:${path}`); } }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("@/lib/data/exchanges", () => ({ approveCoverageExchange: vi.fn(), createSwapProposal: vi.fn(), getPublishedShift: vi.fn(), getExchange: vi.fn(), denyExchange: vi.fn() }));
vi.mock("@/lib/data/schedules", () => ({ getShiftValidationContext: vi.fn() }));
const source = { id: "shift-1", employeeId: "employee-1", employeeName: "Sam Cruz", scheduleId: "schedule-1", locationId: "loc-1", locationName: "FUEL – 2", weekStart: "2030-10-07", date: "2030-10-07", startTime: "06:00", endTime: "14:00" };
beforeEach(() => vi.clearAllMocks());
it.each(["OWNER", "MANAGER"] as const)("prevents a new swap requiring an unavailable %s personal response", async role => {
  vi.mocked(requireSession).mockResolvedValue({ id: "employee-1", firstName: "Sam", lastName: "Cruz", role: "EMPLOYEE", primaryLocationId: "loc-1" });
  vi.mocked(getPublishedShift).mockResolvedValueOnce(source).mockResolvedValueOnce({ ...source, id: "shift-2", employeeId: "manager-1" });
  const context = { position: undefined, workspace: {id:"test-workspace",active:true,timeZone:"America/Puerto_Rico"}, location: {id:"loc-1",workspaceId:"test-workspace",active:true},  employee: { positionIds: [],  active: true, role: "EMPLOYEE" as const, eligibleLocationIds: ["loc-1"], targetWeeklyHours: undefined, maximumWeeklyHours: 40 }, existingShifts: [], availability: [], weeklyAvailability: [], availabilityExceptions: [], approvedTimeOff: [], existingWeeklyMinutes: 0 };
  vi.mocked(getShiftValidationContext).mockResolvedValueOnce(context).mockResolvedValueOnce({ ...context, employee: { ...context.employee, role } });
  const data = new FormData(); data.set("sourceShiftId", "shift-1"); data.set("targetShiftId", "shift-2");
  await expect(proposeSwapAction(data)).rejects.toThrow("error=EMPLOYEE_NOT_ELIGIBLE"); expect(createSwapProposal).not.toHaveBeenCalled();
});
it("does not report a concurrent decline as a successful exchange review", async () => {
  vi.mocked(requireSession).mockResolvedValue({ id: "manager-1", firstName: "Alex", lastName: "Rivera", role: "MANAGER", primaryLocationId: "loc-1" });
  vi.mocked(getExchange).mockResolvedValue({ id: "exchange-1", kind: "COVERAGE", status: "MANAGER_PENDING", requestedByEmployeeId: "employee-1", requestedByName: "Sam Cruz", requestedByRole: "EMPLOYEE", sourceShift: source, createdAt: "2030-10-01T12:00:00Z" });
  vi.mocked(denyExchange).mockResolvedValue(false);
  const data = new FormData(); data.set("exchangeId", "exchange-1"); data.set("decision", "DENIED");
  await expect(reviewExchangeAction(data)).rejects.toThrow("error=EXCHANGE_CHANGED");
});

it("coverage approval preserves unaffected acknowledgements and derives the actor from the session", async () => {
  const { clearWeekAcknowledgements } = await import("@/lib/data/acknowledgements");
  vi.mocked(requireSession).mockResolvedValue({ id: "manager-1", firstName: "Alex", lastName: "Rivera", role: "MANAGER", primaryLocationId: "loc-1" });
  vi.mocked(getExchange).mockResolvedValue({ id: "exchange-1", kind: "COVERAGE", status: "MANAGER_PENDING", requestedByEmployeeId: "employee-1", requestedByName: "Sam Cruz", requestedByRole: "EMPLOYEE", targetEmployeeId:"employee-2", sourceShift: source, createdAt: "2030-10-01T12:00:00Z" });
  vi.mocked(getShiftValidationContext).mockResolvedValue({ position: undefined, workspace: {id:"test-workspace",active:true,timeZone:"America/Puerto_Rico"}, location: {id:"loc-1",workspaceId:"test-workspace",active:true},  employee: { positionIds: [],  active:true,role:"LEAD",eligibleLocationIds:["loc-1"],targetWeeklyHours:undefined,maximumWeeklyHours:40 },existingShifts:[],availability:[{dayOfWeek:1,startTime:"06:00",endTime:"14:00"}],weeklyAvailability:[],availabilityExceptions:[],approvedTimeOff:[],existingWeeklyMinutes:0 });
  vi.mocked(approveCoverageExchange).mockResolvedValue(true);
  const data=new FormData();data.set("exchangeId","exchange-1");data.set("decision","APPROVED");data.set("managerId","other");
  await expect(reviewExchangeAction(data)).rejects.toThrow("approved=1");
  expect(approveCoverageExchange).toHaveBeenCalledWith({exchangeId:"exchange-1",managerId:"manager-1"});
  expect(clearWeekAcknowledgements).not.toHaveBeenCalled();
});

vi.mock("@/lib/data/workspaces",()=>({getWorkspace:async()=>({timeZone:"America/Puerto_Rico"})}));

vi.mock("@/lib/business-time",()=>import("../../../lib/business-time"));
