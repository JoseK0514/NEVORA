import { redirect } from "next/navigation";
import { requireSessionMutationProof } from "@/lib/auth/session";
import { RequestHub } from "./request-hub";
import "./request-hub.css";

export default async function RequestsHubPage() {
  const { employee } = await requireSessionMutationProof();
  if (!["EMPLOYEE", "LEAD"].includes(employee.role)) redirect("/app");
  return <RequestHub />;
}
