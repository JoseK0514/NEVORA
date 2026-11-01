import type { ReactNode } from 'react';

/** Owner premium round 2 (R5): a list card with its section label above it (13/500 grey), not in a 44px band inside
 * the card. An optional link sits on the label's line, right. Page-scoped until the kit's section label lands (kit
 * request: `.c-sec-label`). */
export function PayGroup({ id, label, aside, children, className }: { id: string; label: ReactNode; aside?: ReactNode; children: ReactNode; className?: string }) {
  return <section id={id} className={className ? `c-pay__group ${className}` : 'c-pay__group'} aria-labelledby={`${id}-label`}>
    <div className="c-sec-label c-pay__sec"><h2 id={`${id}-label`}>{label}</h2>{aside ? <div className="c-pay__sec-aside">{aside}</div> : null}</div>
    <div className="c-card">{children}</div>
  </section>;
}

/** Figures that line up: amounts, dates and periods (R2). Kit request: `.c-num` in the kit. */
export function Num({ children }: { children: ReactNode }) {
  return <span className="c-num">{children}</span>;
}
