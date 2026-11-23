"use client";
import { useEffect, useRef, useState } from "react";
import { WarningIcon } from "@phosphor-icons/react/dist/ssr/Warning";
import { HourglassMediumIcon } from "@phosphor-icons/react/dist/ssr/HourglassMedium";
import type { BillingNotice } from "@/lib/commerce/billing-notice";
import { parseBillingSnapshot, type BillingSnapshot } from "@/lib/commerce/billing-snapshot";
import type { CommerceStatus } from "@/lib/commerce/status";
import { createPrivateSnapshotController } from "@/lib/private-snapshot-client";
import { accessNotice } from "@/components/commerce-recovery/copy";
import { BButtonLink, BCard, BIcon } from "./b-kit";
import { ownerBCopy, type OwnerBLang } from "./owner-b-copy";
import { useViewLang } from "./use-owner-lang";

/* Backend contract (Nov 15, 2026): the company Owner status read carries a stable `notice` for the trial's last seven
 * days and last day, a failed renewal (with its grace deadline) and restricted access, always pointing at /app/billing.
 * Home shows it as one card while the read is current (the read's own short lifetime still applies). It is guidance,
 * never a receipt: nothing here says a payment went through, and a return from checkout proves nothing. */

const day = (iso: string, timeZone: string | undefined, locale = "en-US") => {
  try { return new Intl.DateTimeFormat(locale, { weekday: "short", month: "short", day: "numeric", ...(timeZone ? { timeZone } : { timeZone: "UTC" }) }).format(new Date(iso)); }
  catch { return null; }
};

export type NoticeWords = { tone: "amber" | "red"; title: string; line: string };
export function billingNoticeWords(notice: BillingNotice, status: CommerceStatus, timeZone?: string, lang: OwnerBLang = "en"): NoticeWords {
  const words = ownerBCopy(lang), c = words.billing;
  const due = notice.dueAt ? day(notice.dueAt, timeZone, words.locale)?.replace(/\./g, "") ?? null : null;
  const left = notice.daysRemaining;
  switch (notice.kind) {
    case "TRIAL_ENDING":
      return { tone: "amber", title: due ? c.trialEnds(due) : c.trialSoon,
        line: `${left === null ? "" : left <= 0 ? c.lastDay : left === 1 ? c.oneLeft : c.left(left)}${c.choosePlan}` };
    case "PAYMENT_FAILED":
      return { tone: status.state === "restricted" ? "red" : "amber", title: c.chargeFailed,
        line: `${c.update}${due && status.state !== "restricted" ? c.until(due) : ""}` };
    case "ACCESS_RESTRICTED":
      return { tone: "red", title: c.paused, line: accessNotice(lang, status)?.text ?? c.openBilling };
  }
}

export function BillingNoticeView({ snapshot, timeZone, lang: langProp }: { snapshot: BillingSnapshot | null; timeZone?: string; lang?: OwnerBLang }) {
  const lang = useViewLang(langProp), c = ownerBCopy(lang).billing;
  if (snapshot?.state !== "ready" || !snapshot.notice) return null;
  // The status read names the workplace zone (backend, Nov 15, 2026); the page's own zone stands in for an older read.
  const words = billingNoticeWords(snapshot.notice, snapshot.status, snapshot.status.timeZone ?? timeZone, lang);
  return <BCard label={c.card} id="b-home-billing">
    <div className="b-notice">
      <BIcon tone={words.tone}>{snapshot.notice.kind === "TRIAL_ENDING" ? <HourglassMediumIcon weight="bold" /> : <WarningIcon weight="bold" />}</BIcon>
      <span className="b-notice__tx"><span className="b-notice__t">{words.title}</span><span className="b-notice__s">{words.line}</span></span>
      <BButtonLink href={snapshot.notice.href} kind="ghost" label={c.cardFor(words.title)}>{c.card}</BButtonLink>
    </div>
  </BCard>;
}

/** The Owner's live read. Billing off (404), a failed read or another role shows nothing: the notice is optional on Home. */
export function OwnerBillingNotice({ timeZone, lang }: { timeZone?: string; lang?: OwnerBLang }) {
  const [snapshot, setSnapshot] = useState<BillingSnapshot | null>(null);
  // Billing off (404) or no Owner access: remembered, so coming back to the tab doesn't ask again.
  const closed = useRef(false);
  useEffect(() => {
    const controller = createPrivateSnapshotController<BillingSnapshot>(view => setSnapshot(view.paused ? null : view.snapshot), async signal => {
      const response = await fetch("/api/commerce/status", { cache: "no-store", credentials: "same-origin", redirect: "error", signal });
      // Billing off (404) or no Owner access: nothing to show, and no point asking again.
      if (response.status === 401 || response.status === 403 || response.status === 404) { closed.current = true; return { state: "unavailable", reason: "access_denied" }; }
      if (!response.ok) throw Error("Billing status unavailable");
      return response.json();
    }, value => value && typeof value === "object" && "state" in value && value.state === "unavailable" ? { state: "unavailable", reason: "access_denied" } : parseBillingSnapshot(value),
    reason => ({ state: "unavailable", reason }), () => "read_failed");
    const sync = () => { if (closed.current) return; if (document.visibilityState === "visible" && navigator.onLine) controller.start(); else controller.pause(); };
    sync();
    document.addEventListener("visibilitychange", sync); window.addEventListener("online", sync); window.addEventListener("offline", sync);
    return () => { controller.stop(); document.removeEventListener("visibilitychange", sync); window.removeEventListener("online", sync); window.removeEventListener("offline", sync); };
  }, []);
  return <BillingNoticeView snapshot={snapshot} timeZone={timeZone} lang={lang} />;
}
