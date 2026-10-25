import { redirect } from "next/navigation";
import { requireSessionMutationProof } from "@/lib/auth/session";
import { RequestHub } from "./request-hub";
import { currentPresentation } from "@/lib/workspace-presentation/current.server";
import { listEmployeeTimeOffRequests } from "@/lib/data/requests";
import { getWorkspace } from "@/lib/data/workspaces";

export default async function RequestsHubPage() {
  const { employee } = await requireSessionMutationProof();
  if (!["EMPLOYEE", "LEAD"].includes(employee.role)) redirect("/app");
  const { modules } = await currentPresentation();
  // Signature: the hub shows the person's own time-off requests (the same read as Time off's My requests).
  // A failed read shows as unavailable, never as "no requests".
  const [requests, timeZone] = modules.timeOff ? await Promise.all([
    listEmployeeTimeOffRequests(employee.id).catch(() => null),
    getWorkspace().then(workspace => workspace.timeZone).catch(() => "UTC"),
  ]) : [undefined, "UTC"];
  return <RequestHub modules={modules} requests={requests} timeZone={timeZone} />;
}
