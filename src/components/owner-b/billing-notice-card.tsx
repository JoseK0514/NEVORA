"use client";
import { useEffect, useState } from "react";
import { WarningIcon } from "@phosphor-icons/react/dist/ssr/Warning";
import { HourglassMediumIcon } from "@phosphor-icons/react/dist/ssr/HourglassMedium";
import type { BillingNotice } from "@/lib/commerce/billing-notice";
import { parseBillingSnapshot, type BillingSnapshot } from "@/lib/commerce/billing-snapshot";
import type { CommerceStatus } from "@/lib/commerce/status";
import { createPrivateSnapshotController } from "@/lib/private-snapshot-client";
import { accessNotice } from "@/components/commerce-recovery/copy";
import { BButtonLink, BCard, BIcon } from "./b-kit";

/* Backend contract (Nov 15, 2026): the company Owner status read carries a stable `notice` for the trial's last seven
 * days and last day, a failed renewal (with its grace deadline) and restricted access, always pointing at /app/billing.
 * Home shows it as one card while the read is current (the read's own short lifetime still applies). It is guidance,
 * never a receipt: nothing here says a payment went through, and a return from checkout proves nothing. */

const day = (iso: string, timeZone: string | undefined) => {
  try { return new Intl.DateTimeFormat("en-US", { weekday: "short", month: "short", day: "numeric", ...(timeZone ? { timeZone } : { timeZone: "UTC" }) }).format(new Date(iso)); }
  catch { return null; }
};

export type NoticeWords = { tone: "amber" | "red"; title: string; line: string };
export function billingNoticeWords(notice: BillingNotice, status: CommerceStatus, timeZone?: string): NoticeWords {
  const due = notice.dueAt ? day(notice.dueAt, timeZone) : null;
  const left = notice.daysRemaining;
  switch (notice.kind) {
    case "TRIAL_ENDING":
      return { tone: "amber", title: due ? `Your free trial ends ${due}` : "Your free trial ends soon",
        line: `${left === null ? "" : left <= 1 ? "1 day left. " : `${left} days left. `}Choose a plan to keep using NEVORA.` };
    case "PAYMENT_FAILED":
      return { tone: status.state === "restricted" ? "red" : "amber", title: "We couldn’t charge your card",
        line: `Update your payment method.${due && status.state !== "restricted" ? ` Access continues until ${due}.` : ""}` };
    case "ACCESS_RESTRICTED":
      return { tone: "red", title: "Access is paused", line: accessNotice("en", status)?.text ?? "Open Plan and billing to see what’s needed." };
  }
}

export function BillingNoticeView({ snapshot, timeZone }: { snapshot: BillingSnapshot | null; timeZone?: string }) {
  if (snapshot?.state !== "ready" || !snapshot.notice) return null;
  // The status read names the workplace zone (backend, Nov 15, 2026); the page's own zone stands in for an older read.
  const words = billingNoticeWords(snapshot.notice, snapshot.status, snapshot.status.timeZone ?? timeZone);
  return <BCard label="Plan and billing" id="b-home-billing">
    <div className="b-notice">
      <BIcon tone={words.tone}>{snapshot.notice.kind === "TRIAL_ENDING" ? <HourglassMediumIcon weight="bold" /> : <WarningIcon weight="bold" />}</BIcon>
      <span className="b-notice__tx"><span className="b-notice__t">{words.title}</span><span className="b-notice__s">{words.line}</span></span>
      <BButtonLink href={snapshot.notice.href} kind="ghost" label={`Plan and billing: ${words.title}`}>Plan and billing</BButtonLink>
    </div>
  </BCard>;
}

/** The Owner's live read. Billing off (404), a failed read or another role shows nothing: the notice is optional on Home. */
export function OwnerBillingNotice({ timeZone }: { timeZone?: string }) {
  const [snapshot, setSnapshot] = useState<BillingSnapshot | null>(null);
  useEffect(() => {
    const controller = createPrivateSnapshotController<BillingSnapshot>(view => setSnapshot(view.paused ? null : view.snapshot), async signal => {
      const response = await fetch("/api/commerce/status", { cache: "no-store", credentials: "same-origin", redirect: "error", signal });
      // Billing off (404) or no Owner access: nothing to show, and no point asking again.
      if (response.status === 401 || response.status === 403 || response.status === 404) return { state: "unavailable", reason: "access_denied" };
      if (!response.ok) throw Error("Billing status unavailable");
      return response.json();
    }, value => value && typeof value === "object" && "state" in value && value.state === "unavailable" ? { state: "unavailable", reason: "access_denied" } : parseBillingSnapshot(value),
    reason => ({ state: "unavailable", reason }), () => "read_failed");
    const sync = () => { if (document.visibilityState === "visible" && navigator.onLine) controller.start(); else controller.pause(); };
    sync();
    document.addEventListener("visibilitychange", sync); window.addEventListener("online", sync); window.addEventListener("offline", sync);
    return () => { controller.stop(); document.removeEventListener("visibilitychange", sync); window.removeEventListener("online", sync); window.removeEventListener("offline", sync); };
  }, []);
  return <BillingNoticeView snapshot={snapshot} timeZone={timeZone} />;
}
