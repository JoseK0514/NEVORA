import { redirect } from "next/navigation";
import { requireSessionMutationProof } from "@/lib/auth/session";
import { RequestHub } from "./request-hub";
import { currentPresentation } from "@/lib/workspace-presentation/current.server";
import "./request-hub.css";

export default async function RequestsHubPage() {
  const { employee } = await requireSessionMutationProof();
  if (!["EMPLOYEE", "LEAD"].includes(employee.role)) redirect("/app");
  return <RequestHub modules={(await currentPresentation()).modules} />;
}
