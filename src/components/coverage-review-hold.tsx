"use client";

import { unstable_rethrow } from "next/navigation";
import { useEffect, useSyncExternalStore, type ReactNode } from "react";
import { BCallout } from "@/components/owner-b/b-kit";
import { ConfigurationForm, type ConfigurationResult } from "@/components/configuration-form";

/** What the unconfirmed note says and where it checks (`unconfirmedCheck` in coverage-review.tsx). */
export type UnconfirmedCheck = { title: string; label: string; href: string };

/** G71 (Nov 23, 2026): reviews whose save got no reply in this tab, until the person checks coverage. The frame's next
 * refresh re-reads the review; when the save did land, the review is gone and the page becomes "Coverage changed", which
 * used to drop the amber note and its Check coverage link. The note now stays on that page. Memory only: nothing is
 * stored, and a reload starts clean. */
const held = new Map<string, UnconfirmedCheck>();
const listeners = new Set<() => void>();
const notify = () => { for (const listener of listeners) listener(); };
const subscribe = (listener: () => void) => { listeners.add(listener); return () => { listeners.delete(listener); }; };

export function holdUnconfirmedReview(token: string, check: UnconfirmedCheck) { held.set(token, check); notify(); }
export function releaseUnconfirmedReview(token: string) { if (held.delete(token)) notify(); }
export function unconfirmedReview(token: string) { return held.get(token) ?? null; }

/** True for the errors Next.js throws to navigate (redirect, not-found). */
function isNavigation(error: unknown) {
  try { unstable_rethrow(error); return false; } catch { return true; }
}

/** The same action, with the same data and result; a reply that never arrives (not a Next.js redirect) also holds the
 * review before the form shows its unconfirmed note. */
export function rememberLostReply(action: (data: FormData) => Promise<ConfigurationResult>, token: string, check: UnconfirmedCheck) {
  return async (data: FormData) => {
    try { return await action(data); }
    catch (error) { if (!isNavigation(error)) holdUnconfirmedReview(token, check); throw error; }
  };
}

/** Review replacement's form: the same form, action, fields and unconfirmed note. A reply that never arrives is also
 * remembered for this review, so the "Coverage changed" page can keep the note. What the action writes is unchanged. */
export function CoverageReviewForm({ action, token, check, className, children }: {
  action: (data: FormData) => Promise<ConfigurationResult>; token: string; check: UnconfirmedCheck; className?: string; children: ReactNode;
}) {
  // The note's own Check coverage link on this page also ends the hold (the person is checking).
  useEffect(() => {
    const checked = (event: MouseEvent) => { if ((event.target as Element | null)?.closest?.(".b-callout a")?.getAttribute("href") === check.href) releaseUnconfirmedReview(token); };
    document.addEventListener("click", checked, true);
    return () => document.removeEventListener("click", checked, true);
  }, [token, check.href]);
  const send = rememberLostReply(action, token, check);
  return <ConfigurationForm action={send} className={className} holdAfterUnconfirmed unconfirmedCheck={check}>{children}</ConfigurationForm>;
}

/** The "Coverage changed" page's body: the unconfirmed note with Check coverage while this tab is still waiting to check
 * this review, else the page's usual words (`children`). Checking ends the hold. */
export function HeldReviewNote({ token, children }: { token: string; children?: ReactNode }) {
  const check = useSyncExternalStore(subscribe, () => held.get(token) ?? null, () => null);
  if (!check) return children;
  return <div onClickCapture={event => { if ((event.target as Element).closest("a")) releaseUnconfirmedReview(token); }}>
    <BCallout tone="amber" role="alert" title={check.title} action={{ label: check.label, href: check.href }} />
  </div>;
}
