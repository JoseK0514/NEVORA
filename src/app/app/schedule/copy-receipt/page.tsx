import {withOperationalCompany} from '@/lib/company-access/operational-scope.server';
import {OperationalUnavailable} from '@/components/company-access/operational-unavailable';
import {ScopedReadFrame} from '@/components/company-access/scoped-read-frame';
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
  const source=await withOperationalCompany(proof,async()=>{
  const receipt = await readScheduleCopyReceipt(proof, operation);
  const command =
    receipt?.command ?? (await readScheduleCopyCommand(proof, operation));
  return {receipt,command};
  });
  if(source.state==='unavailable')return <OperationalUnavailable title="Copy result unavailable" reason={source.reason}/>;
  const {receipt,command}=source.data;
  if (!receipt)
    return (<ScopedReadFrame observation={source}>
      <section className="panel">
        <h1>Copy outcome not confirmed</h1>
        <p>
          We could not confirm whether the shifts were copied. Inspect the schedule before continuing. Do not start a new copy while the original outcome is uncertain. If saved details are available below, retrying them uses the same request.
        </p>
        <Link className="button secondary" href={command ? `/app/schedule?week=${command.weekStart}` : "/app/schedule"}>Back to schedule</Link>
        <details><summary>Saved request reference</summary><code>{operation}</code></details>
        {command && (
          <ScheduleCopyForm
            actorId={proof.employee.id}
            command={command}
            label="Retry saved copy"
          />
        )}
      </section>
    </ScopedReadFrame>);
  return (<ScopedReadFrame observation={source}>
    <section className="panel">
      <h1>Schedule copy result</h1>
      {receipt.reason && <p>No shifts were copied: {receipt.reason === "TEMPLATE_UNAVAILABLE" ? "the selected template was unavailable." : "the original source changed."} You can return to the schedule and start a new copy.</p>}
      <p>
        {receipt.rows.filter((r) => r.status === "COMMITTED").length} shifts copied;{" "}
        {receipt.rows.filter((r) => r.status === "SKIPPED").length} skipped.
      </p>
      <details><summary>Copy details and request reference</summary><p>Request: {receipt.operationId}</p>
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
      </ul></details>
      <Link className="button secondary" href={`/app/schedule?week=${receipt.command.weekStart}`}>
        Back to schedule
      </Link>
    </section>
  </ScopedReadFrame>);
}
