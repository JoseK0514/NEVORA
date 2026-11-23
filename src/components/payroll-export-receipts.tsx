"use client";

import { useEffect, useState } from "react";
import { BCard, BList, BRow, BSegs } from "@/components/owner-b/b-kit";
import { stableExportJson } from "@/lib/payroll-export/json";
import { denialOf, nevoraFailure } from "@/lib/http/nevora-failure";
import type { PayrollExportReceiptSummary } from "@/lib/payroll-export/service";

type Receipt = PayrollExportReceiptSummary;
type ListState = { state: "loading" } | { state: "ready"; receipts: Receipt[] } | { state: "unavailable"; notAllowed: boolean };

const day = (iso: string) => new Date(`${iso}T12:00:00Z`).toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" });
const range = (start: string, end: string) => `${day(start)} – ${day(end)}`;
const when = (iso: string) => new Date(iso).toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });

const headersFor = (actorId: string) => ({ "content-type": "application/json", "x-nevora-payroll-export": "1", "x-nevora-actor": actorId });

/** A reply this card won't read: cancel its body so the request ends (an unread body keeps it open). */
function release(response: Response) { void response.body?.cancel().catch(() => {}); }

function save(text: string, type: string, name: string) {
  const url = URL.createObjectURL(new Blob([text], { type })), a = document.createElement("a");
  a.href = url; a.download = name; document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(url), 0);
}

/**
 * QA A3-03 (Nov 21, 2026): a generated export could be lost for good. The page clears the file when its protected view
 * expires, which stays (the CSV carries names and hours), and a second export of the same timecards is refused. This card
 * lists the person's own recent exports (week, people, when; no names or hours) and downloads a stored file again on
 * request, read fresh under current access. The list clears while the page is hidden and is read again on return.
 */
export function PayrollExportReceipts({ actorId, refreshKey }: { actorId: string; refreshKey: number }) {
  const [list, setList] = useState<ListState>({ state: "loading" });
  const [busy, setBusy] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    // G59 (Nov 23, 2026): when the card leaves (the page pauses on blur, or the period changes) its read is cancelled, and
    // a reply it won't read is released. An unread reply body kept the request open for good: a paused Time exports page
    // never went network-idle, and each one held a connection.
    const abort = new AbortController();
    const load = async () => {
      if (document.visibilityState === "hidden") { setList({ state: "loading" }); return; }
      try {
        const response = await fetch("/api/payroll-export/receipts", { method: "GET", cache: "no-store", credentials: "same-origin", headers: headersFor(actorId), signal: abort.signal });
        if (!active) { release(response); return; }
        if (!response.ok) { release(response); setList({ state: "unavailable", notAllowed: denialOf(nevoraFailure(response), response.status) === "not_allowed" }); return; }
        const body = await response.json() as { state?: string; receipts?: Receipt[] };
        setList(body.state === "ready" && Array.isArray(body.receipts) ? { state: "ready", receipts: body.receipts } : { state: "unavailable", notAllowed: false });
      } catch { if (active) setList({ state: "unavailable", notAllowed: false }); }
    };
    void load();
    document.addEventListener("visibilitychange", load);
    return () => { active = false; abort.abort(); document.removeEventListener("visibilitychange", load); };
  }, [actorId, refreshKey]);

  async function again(receipt: Receipt, file: "csv" | "record") {
    setBusy(`${receipt.operationId}:${file}`); setMessage(null);
    try {
      const response = await fetch("/api/payroll-export/receipts", { method: "POST", cache: "no-store", credentials: "same-origin", headers: headersFor(actorId), body: JSON.stringify({ operationId: receipt.operationId }) });
      if (!response.ok) {
        release(response);
        const denial = denialOf(nevoraFailure(response), response.status);
        setMessage(denial === "not_allowed" ? "You don’t have access to exports. Ask the Owner if you need it." : denial === "signed_out" ? "Your session ended. Sign in again to download it." : "The file didn’t download. Try again.");
        return;
      }
      const body = await response.json() as { state?: string; export?: { csv: string; csvSha256: string; model: { period: { startDate: string } } } };
      const file_ = body.export;
      if (body.state !== "ready" || !file_ || file_.csvSha256 !== receipt.csvSha256) { setMessage("The file didn’t download. Try again."); return; }
      if (file === "csv") save(file_.csv, "text/csv;charset=utf-8", `nevora-mapped-${file_.model.period.startDate}-${receipt.operationId}.csv`);
      else save(stableExportJson(file_.model), "application/json", `nevora-canonical-${file_.model.period.startDate}-${receipt.operationId}.json`);
    } catch { setMessage("The file didn’t download. Try again."); }
    finally { setBusy(null); }
  }

  if (list.state === "loading") return null;
  if (list.state === "unavailable") return list.notAllowed ? null
    : <BCard title="Recent exports"><p className="b-state" role="status">Recent exports didn’t load. Reload the page to try again.</p></BCard>;
  if (!list.receipts.length) return null;
  return <BCard title="Recent exports">
    <BList label="Recent exports">{list.receipts.map(receipt => <BRow key={receipt.operationId}
      title={range(receipt.period.startDate, receipt.period.endDate)}
      sub={<BSegs parts={[`${receipt.people} ${receipt.people === 1 ? "person" : "people"}`, `Exported ${when(receipt.createdAt)}`]} />}
      extra={<span className="c-exp__dls">
        <button type="button" className="b-btn b-btn--quiet" disabled={busy !== null} aria-busy={busy === `${receipt.operationId}:csv` || undefined}
          aria-label={`Download CSV for ${range(receipt.period.startDate, receipt.period.endDate)}`} onClick={() => void again(receipt, "csv")}>Download CSV</button>
        <button type="button" className="b-btn b-btn--quiet" disabled={busy !== null} aria-busy={busy === `${receipt.operationId}:record` || undefined}
          aria-label={`Time record for ${range(receipt.period.startDate, receipt.period.endDate)}`} onClick={() => void again(receipt, "record")}>Time record</button>
      </span>} />)}
    </BList>
    {message ? <p className="b-state" role="alert">{message}</p> : null}
  </BCard>;
}
