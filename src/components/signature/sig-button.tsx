"use client";

import Link from "next/link";
import { CircleNotchIcon } from "@phosphor-icons/react/dist/ssr/CircleNotch";
import type { ComponentPropsWithRef, MouseEvent, ReactNode } from "react";

/* SigButton: the one Signature button. Primary (deep fill), secondary (white with a hairline and a soft lift) and link
 * (quiet text, 44px hit area). Styles live in the "Buttons" section of components.css as global `sig-btn` classes, so
 * the shared press and focus sections there can reach them and EmployeeSubmitButton can reuse the pending markup on
 * buttons that keep their own classes.
 *
 * Pending keeps the variant's fill, shows a 16px spinner and the pending words in the same grid cell as the label (the
 * button never changes size), and sets aria-busy and aria-disabled. It never sets the native disabled attribute, so
 * focus stays on the button; clicks, taps and Enter are swallowed instead. */

export type SigButtonVariant = "primary" | "secondary" | "link";

type SigButtonOwnProps = {
  variant?: SigButtonVariant;
  /** Working state: keeps the fill, shows the spinner and `pendingText`, refuses activation, stays focusable. */
  pending?: boolean;
  /** What the button says while pending, e.g. "Saving…". Defaults to the label. */
  pendingText?: ReactNode;
  disabled?: boolean;
  className?: string;
  children: ReactNode;
};

export type SigButtonAsButtonProps = SigButtonOwnProps & Omit<ComponentPropsWithRef<"button">, keyof SigButtonOwnProps> & { href?: undefined };
export type SigButtonAsLinkProps = SigButtonOwnProps & Omit<ComponentPropsWithRef<typeof Link>, keyof SigButtonOwnProps | "href"> & { href: string };
export type SigButtonProps = SigButtonAsButtonProps | SigButtonAsLinkProps;

/** The 16px pending spinner. Rotation stops under reduced motion (components.css). */
export function SigSpinner() {
  return <CircleNotchIcon className="sig-btn__spin" size={16} weight="bold" aria-hidden="true" focusable="false" />;
}

/** Idle label and pending words share one grid cell, so the button keeps the size of the longer one. The hidden cell is
 * visibility:hidden, which also takes it out of the accessible name. Works on any button, styled or not. */
export function SigPendingLabel({ children, pendingText, pending, className = "" }: { children: ReactNode; pendingText?: ReactNode; pending: boolean; className?: string }) {
  return <span className={`sig-btn__label ${className}`.trim()}>
    <span className="sig-btn__idle" style={pending ? { visibility: "hidden" } : undefined}>{children}</span>
    <span className="sig-btn__busy" style={pending ? undefined : { visibility: "hidden" }} aria-hidden={!pending || undefined}><SigSpinner />{pendingText ?? children}</span>
  </span>;
}

const classesFor = (variant: SigButtonVariant, className?: string) => ["sig-btn", `sig-btn--${variant}`, className].filter(Boolean).join(" ");

export function SigButton(props: SigButtonProps) {
  if (props.href !== undefined) {
    const { variant = "primary", pending = false, pendingText, disabled = false, className, children, onClick, href, ...rest } = props;
    const blocked = pending || disabled;
    return <Link {...rest} href={href} className={classesFor(variant, className)} aria-busy={pending || undefined} aria-disabled={blocked || undefined}
      onClick={(event: MouseEvent<HTMLAnchorElement>) => { if (blocked) { event.preventDefault(); return; } onClick?.(event); }}>
      <SigPendingLabel pending={pending} pendingText={pendingText}>{children}</SigPendingLabel>
    </Link>;
  }
  const { variant = "primary", pending = false, pendingText, disabled = false, className, children, onClick, type = "button", ...rest } = props;
  return <button {...rest} type={type} className={classesFor(variant, className)}
    disabled={(disabled && !pending) || undefined} aria-busy={pending || undefined} aria-disabled={pending || rest["aria-disabled"] || undefined}
    onClick={event => { if (pending) { event.preventDefault(); return; } onClick?.(event); }}>
    <SigPendingLabel pending={pending} pendingText={pendingText}>{children}</SigPendingLabel>
  </button>;
}
