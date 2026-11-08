import {applicationSql} from "../data/app-sql";
import { createHash } from "node:crypto";
import { queryRows } from "../db";
export type BillingOwnerProof = {
  sessionTokenHash: string;
  employee: { id: string };
};
type Query = (text: string, values: unknown[]) => Promise<unknown>;
export async function readBillingOwnerBinding(
  proof: BillingOwnerProof,
  connection: { installationId: string; secret: string },
  query: Query = (text, values) => applicationSql().query(text, values),
) {
  const hash = createHash("sha256").update(connection.secret).digest("hex");
  const rows = queryRows<{
    id: string;
    business_id: string;
    installation_id: string;
    instance_secret_hash: string;
  }>(
    await query(
      `SELECT e.id,i.business_id,i.installation_id,i.instance_secret_hash FROM employee_sessions s JOIN employees e ON e.id=s.employee_id CROSS JOIN public.nevora_commerce_installation i JOIN workspaces w ON w.singleton AND w.active WHERE s.token_hash=$1 AND s.expires_at>clock_timestamp() AND e.active AND e.role='OWNER' AND e.id=$2 AND i.singleton AND i.installation_id=$3 AND i.instance_secret_hash=$4`,
      [
        proof.sessionTokenHash,
        proof.employee.id,
        connection.installationId,
        hash,
      ],
    ),
  );
  const row = rows[0];
  return rows.length === 1 &&
    row.id === proof.employee.id &&
    row.installation_id === connection.installationId &&
    row.instance_secret_hash === hash
    ? row
    : null;
}
