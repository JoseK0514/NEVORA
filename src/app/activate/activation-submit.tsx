"use client";

import { useRef } from "react";
import { useFormStatus } from "react-dom";
import { ArrowRightIcon } from "@phosphor-icons/react/dist/ssr/ArrowRight";
import { SigSpinner, useKeepFocusWhileBusy } from "@/components/signature/sig-button";

export function ActivationSubmit({pending:controlledPending,idle="Activate account",busy="Activating account…",className}: {pending?:boolean;idle?:string;busy?:string;className?:string} = {}) {
  const status = useFormStatus();
  const pending = controlledPending ?? status.pending;
  const button = useRef<HTMLButtonElement>(null);
  useKeepFocusWhileBusy(button, pending);
  return <>
    <button ref={button} type="submit" className={className ?? "ap-primary act-submit"} aria-disabled={pending || undefined} aria-busy={pending}
      onClick={event => { if (pending) event.preventDefault(); }}>
      {pending && !className ? <SigSpinner /> : null}
      <span>{pending ? busy : idle}</span>
      {pending || className ? null : <ArrowRightIcon size={18} weight="bold" aria-hidden="true" />}
    </button>
    <span className="ap-sr" role="status" aria-live="polite" aria-atomic="true">
      {pending ? busy : ""}
    </span>
  </>;
}
