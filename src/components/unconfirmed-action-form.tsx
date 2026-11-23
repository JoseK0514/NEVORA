"use client";

import { unstable_rethrow } from "next/navigation";
import { useState, type ReactNode } from "react";
import { BCallout } from "@/components/owner-b/b-kit";

/** What to say, and where to check, when the reply to this form's action is lost. */
export type Unconfirmed = { title: string; check: { label: string; href: string } };

/**
 * QA A3-02 (Nov 21, 2026): a form whose server action may have completed even when its reply is lost (publishing). A
 * plain `<form action>` sent that failure to the route's error screen, which said "Nothing was changed" while the
 * schedule had published and people were notified. This form keeps the person here and says the outcome is
 * unconfirmed, with a place to check, as the other recovery flows do. A redirect or not-found from the action is
 * Next.js navigation and passes through.
 */
export function UnconfirmedActionForm({ action, className, children, unconfirmed }: {
  action: (data: FormData) => Promise<unknown>;
  className?: string;
  children: ReactNode;
  unconfirmed: Unconfirmed;
}) {
  const [lost, setLost] = useState(false);
  async function run(data: FormData) {
    setLost(false);
    try {
      await action(data);
    } catch (error) {
      unstable_rethrow(error);
      setLost(true);
    }
  }
  return <form action={run} className={className}>
    {children}
    {/* Unknown outcome: amber means "wait or check" (DESIGN.MD status colours). */}
    {lost ? <div className="form-result"><BCallout tone="amber" role="alert" title={unconfirmed.title} action={unconfirmed.check} /></div> : null}
  </form>;
}
