import { ScheduleCopyForm } from "@/components/schedule-copy-form";
import Link from "next/link";
import { requireSessionMutationProof } from "@/lib/auth/session";
import {
  readScheduleCopyReceipt,
  readScheduleCopyCommand,
} from "@/lib/data/schedule-copy";
export default async function CopyReceiptPage({
  searchParams,
}: {
  searchParams: Promise<{ operation?: string }>;
}) {
  const { operation } = await searchParams;
  if (!operation || !/^[0-9a-f-]{36}$/i.test(operation))
    return <p>Invalid operation reference.</p>;
  const proof = await requireSessionMutationProof();
  const receipt = await readScheduleCopyReceipt(proof, operation);
  const command =
    receipt?.command ?? (await readScheduleCopyCommand(proof, operation));
  if (!receipt)
    return (
      <section className="panel">
        <h1>Copy outcome not confirmed</h1>
        <p>
          No completed receipt is available. Retry the original form with its
          original operation reference. Do not start a new copy while the
          original outcome is uncertain.
        </p>
        <code>{operation}</code>
        {command && (
          <ScheduleCopyForm
            actorId={proof.employee.id}
            command={command}
            label="Retry saved operation"
          />
        )}
      </section>
    );
  return (
    <section className="panel">
      <h1>Schedule copy receipt</h1>
      {receipt.reason && <p>No shifts were copied: {receipt.reason === "TEMPLATE_UNAVAILABLE" ? "the selected template was unavailable." : "the original source changed."} You can return to the schedule and start a new copy.</p>}
      <p>
        {receipt.rows.filter((r) => r.status === "COMMITTED").length} committed;{" "}
        {receipt.rows.filter((r) => r.status === "SKIPPED").length} skipped.
      </p>
      <p>Operation: {receipt.operationId}</p>
      <ul>
        {receipt.rows.map((row, i) => (
          <li key={i}>
            {row.sourceId}: {row.status}
            {row.reason ? ` — ${row.reason}` : ""}
            {row.warnings.map((w) => (
              <p key={w.code}>{w.message}</p>
            ))}
          </li>
        ))}
      </ul>
      <Link href={`/app/schedule?week=${receipt.command.weekStart}`}>
        Back to schedule
      </Link>
    </section>
  );
}
