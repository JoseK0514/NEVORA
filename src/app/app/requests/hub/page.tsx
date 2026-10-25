import { redirect } from "next/navigation";
import { requireSessionMutationProof } from "@/lib/auth/session";
import { RequestHub, type HubShiftRequest, type HubCorrection } from "./request-hub";
import { currentPresentation } from "@/lib/workspace-presentation/current.server";
import { listEmployeeTimeOffRequests } from "@/lib/data/requests";
import { listEmployeeExchangeActivity } from "@/lib/data/exchanges";
import { listEmployeeCallouts } from "@/lib/data/callouts";
import { getEmployeeTimeCorrections } from "@/lib/data/time-corrections";
import { getWorkspace } from "@/lib/data/workspaces";

export const metadata = { title: "Requests" };

export default async function RequestsHubPage() {
  const { employee } = await requireSessionMutationProof();
  if (!["EMPLOYEE", "LEAD"].includes(employee.role)) redirect("/app");
  const { modules } = await currentPresentation();
  // Signature: the hub shows the person's own time-off requests (the same read as Time off's My requests).
  // A failed read shows as unavailable, never as "no requests".
  // F8 (Oct 25, 2026): "Waiting" also lists the person's own pending swaps, cover offers, Unable to work reports
  // (the same reads as Shift requests › Yours) and corrections (the same read as My time). Read only; a failed read of
  // these leaves them out and says so.
  const [requests, timeZone, activity, callouts, corrections] = await Promise.all([
    modules.timeOff ? listEmployeeTimeOffRequests(employee.id).catch(() => null) : Promise.resolve(undefined),
    getWorkspace().then(workspace => workspace.timeZone).catch(() => "UTC"),
    modules.marketplace ? listEmployeeExchangeActivity(employee.id).catch(() => null) : Promise.resolve([]),
    modules.marketplace ? listEmployeeCallouts(employee.id).catch(() => null) : Promise.resolve([]),
    getEmployeeTimeCorrections().catch(() => null),
  ]);
  const shiftRequests: HubShiftRequest[] | null = activity && callouts ? [
    ...activity.filter(row => row.requestedByEmployeeId === employee.id && ["OPEN", "EMPLOYEE_PENDING", "MANAGER_PENDING"].includes(row.status))
      .map(row => ({ id: row.id, kind: row.kind === "COVERAGE" ? "cover" as const : "swap" as const, date: row.sourceShift.date, startTime: row.sourceShift.startTime, endTime: row.sourceShift.endTime, createdAt: row.createdAt })),
    ...callouts.filter(row => row.employeeId === employee.id && row.status === "PENDING")
      .map(row => ({ id: row.id, kind: "callout" as const, date: row.date, startTime: row.startTime, endTime: row.endTime, createdAt: row.createdAt })),
  ] : null;
  const ownCorrections: HubCorrection[] | null = corrections?.state === "ready"
    ? corrections.requests.filter(item => item.status === "PENDING").map(item => ({ id: item.id, kind: item.kind, startAt: item.proposedStartAt, endAt: item.proposedEndAt, locationName: item.locationName }))
    : null;
  return <RequestHub modules={modules} requests={requests} timeZone={timeZone} shiftRequests={shiftRequests} corrections={ownCorrections} />;
}
