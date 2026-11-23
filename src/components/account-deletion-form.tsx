"use client";

import { useActionState, useCallback, useEffect, useRef, useState } from "react";
import { requestAccountDeletion, type DeletionFormState } from "@/app/app/account/delete/actions";
import { SUPPORT_EMAIL } from "@/lib/legal/policies";
import { EmployeeDeletionView, type DeletionView } from "./employee-mobile/deletion";
import { shown as onScreen } from "./employee-b/account-host";
import { LastOwnerCard } from "./access-recovery/last-owner-card";
import { supportReferenceOfState } from "./access-recovery/support-reference-seam";
import { SupportReference } from "./access-recovery/support-reference";
import type { AuthLang } from "@/lib/auth-copy";

type Account = { name: string; role: string; employeeId: string; roleKey?: "OWNER" | "MANAGER" | "LEAD" | "EMPLOYEE" };
type Done = Extract<DeletionFormState, { reference: string }>;

const ANNOUNCED = new Set(["received", "duplicate", "failed", "unavailable", "uncertain", "busy", "signed_out", "changed"]);

/** One owner for the whole page, mounted across resize and rotation so a receipt or an unknown outcome is never
 * dropped by a layout change. Employee/Lead phones get the teal presentation; everyone else keeps Quiet.
 * A rejected action call (lost reply, server error) is unknown, not a failure: the page keeps the form and asks
 * the same question again, which returns the saved request if there is one.
 * Quiet (v4, inspection Oct 24): grouped rows on the white page for every role; the wording is unchanged. */
export function AccountDeletionForm({ account, period, retention, existing, owner = false, workplaceName = null, lang = "en" }: {
  account: Account; period: string | null; retention: string | null; existing: Done | null; owner?: boolean; workplaceName?: string | null;
  /** U11: the language of the last-Owner card and the Support reference (the signed-in app is English today). */
  lang?: AuthLang;
}) {
  const [confirmed, setConfirmed] = useState(false);
  const [shown, setShown] = useState(false);
  // Uncontrolled on purpose: React would otherwise mirror a controlled value into the DOM value attribute. The typed
  // text lives only in this mounted ref, so a resize that swaps presentations keeps it.
  const typed = useRef("");
  const passwordRef = useRef<HTMLInputElement | null>(null);
  const forget = () => { typed.current = ""; if (passwordRef.current) passwordRef.current.value = ""; };
  const bindPassword = useCallback((input: HTMLInputElement | null) => { passwordRef.current = input; if (input && typed.current && !input.value) input.value = typed.current; }, []);
  const [retry, setRetry] = useState(false);
  const [state, action, pending] = useActionState<DeletionFormState, FormData>(async (previous, formData) => {
    let next: DeletionFormState;
    try { next = await requestAccountDeletion(previous, formData); } catch { next = { kind: "uncertain" }; }
    if (next.kind === "uncertain") setRetry(true);
    // The password is held only while it can still be needed for this account's request.
    // React resets an action form's uncontrolled fields after every reply; forget the copy too, so a later resize
    // can't bring back a password the page no longer shows. Each retry is a deliberate re-entry.
    forget();
    if (next.kind !== "idle") setShown(false);
    return next;
  }, existing ?? { kind: "idle" });
  // Board E-DeleteAccount: Employees and Leads get the corporate page on every width. Phase 2 (Nov 23, 2026): Owners and
  // Managers get that same screen (Direction B), with the Owner's workspace line, "Keep my account" and the last-Owner card.
  const phone = account.roleKey === "EMPLOYEE" || account.roleKey === "LEAD";
  const lastOwner = state.kind === "unavailable" && state.reason === "LAST_OWNER";
  const outcome = useRef<HTMLDivElement>(null);
  // An Employee's phone screen (Direction B) draws the receipt and the ended outcomes itself; focus the one on screen.
  const outcomeB = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // One response, one announcement: focus the outcome, or the password it rejected.
    const frame = requestAnimationFrame(() => (state.kind === "wrong_password" ? passwordRef.current : ANNOUNCED.has(state.kind) ? onScreen(outcome.current, outcomeB.current) : null)?.focus());
    return () => cancelAnimationFrame(frame);
  }, [state]);

  const view: DeletionView = { state, pending, retry, confirmed, shown, period, retention };
  const manager = phone ? undefined : {
    keptHref: "/account-deletion",
    ownerNote: owner ? <>Your company’s workspace stays open for the rest of your team. To close it, email {SUPPORT_EMAIL}.</> : undefined,
    outcomeExtra: <SupportReference reference={supportReferenceOfState(state)} lang={lang} id="deletion-reference" />,
    lastOwner: lastOwner ? <LastOwnerCard supportEmail={SUPPORT_EMAIL} teamHref={owner ? "/app/employees" : null} lang={lang} outcomeRef={outcome} supportReference={supportReferenceOfState(state)} /> : undefined,
  };
  return <EmployeeDeletionView account={account} view={view} action={action} outcomeRef={outcome} outcomeRefB={outcomeB} passwordRef={bindPassword}
    onPassword={value => { typed.current = value; }} onShown={() => setShown(value => !value)} onConfirmed={setConfirmed} workplace={workplaceName} manager={manager} />;
}
