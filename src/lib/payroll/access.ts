import { createHash } from "node:crypto";
import type { SessionMutationProof } from "../shift-changes/types";
import type { SqlExecutor } from "../notifications/types";
import { neonNotificationExecutor } from "../data/notification-transactions";
import type { PayrollDocument, PayrollStatementsResponse } from "./contracts";
import { documentProjection } from "./service";
import { guarded, statement as q, workspaceSql as ws } from "./store";
import { uuid, PayrollError } from "./model";
const payrollAccess = `EXISTS(SELECT 1 FROM employees e WHERE e.id=$1 AND (e.role='OWNER' OR EXISTS(SELECT 1 FROM payroll_grants_current g WHERE g.workspace_id=d.workspace_id AND g.employee_id=e.id AND (g.payload->>'review')::boolean)))`;
const published = `EXISTS(SELECT 1 FROM payroll_publications p WHERE p.workspace_id=d.workspace_id AND p.run_id=d.run_id)`;
type DocRow = {
  id: string;
  kind: PayrollDocument["kind"];
  employee_id: string | null;
  filename: string;
  sha256: string;
  published: boolean;
  payload: { period: { startDate: string; endDate: string }; payday: string };
};
export async function statements(
  proof: SessionMutationProof,
  ex: SqlExecutor = neonNotificationExecutor(),
): Promise<PayrollStatementsResponse> {
  const docs = await guarded<DocRow>(
    proof,
    "SELF",
    q(
      `SELECT d.id::text,d.kind,d.employee_id,d.filename,d.sha256,true AS published,d.payload FROM payroll_documents d WHERE workspace_id=${ws} AND d.employee_id=$1 AND d.kind='EMPLOYEE_STATEMENT' AND ${published} ORDER BY d.payload->>'payday' DESC`,
      proof.employee.id,
    ),
    ex,
  );
  return {
    version: "PAYROLL_API_V1",
    statements: docs.map((d) => ({ ...documentProjection(d), ...d.payload })),
  };
}
export async function document(
  proof: SessionMutationProof,
  id: string,
  ex: SqlExecutor = neonNotificationExecutor(),
) {
  if (!uuid(id)) throw new PayrollError("DOCUMENT_UNAVAILABLE", 404);
  const [d] = await guarded<DocRow & { hex: string }>(
    proof,
    "SELF",
    q(
      `SELECT d.id::text,d.kind,d.employee_id,d.filename,d.sha256,${published} AS published,d.payload,encode(d.content,'hex') AS hex FROM payroll_documents d WHERE d.workspace_id=${ws} AND d.id=$2::uuid AND (${payrollAccess} OR (d.employee_id=$1 AND d.kind='EMPLOYEE_STATEMENT' AND ${published}))`,
      proof.employee.id,
      id,
    ),
    ex,
  );
  if (!d) throw new PayrollError("DOCUMENT_UNAVAILABLE", 404);
  const bytes = Buffer.from(d.hex, "hex");
  if (createHash("sha256").update(bytes).digest("hex") !== d.sha256)
    throw new PayrollError("DOCUMENT_UNAVAILABLE", 503);
  return {
    ...documentProjection(d),
    bytes,
    contentType:
      d.kind === "PAYMENT_INSTRUCTIONS"
        ? "application/json"
        : "application/pdf",
  };
}
