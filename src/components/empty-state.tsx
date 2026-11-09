import type { ReactNode } from "react";
import { Illustration, type IllustrationName } from "./illustrations";

/** One empty-state pattern for the portal: a quiet icon tile, a plain-language
 * title, one line of context and at most one next step. Anatomy adapted from the
 * 21st "Empty" block (media, header, title, description, content) with NEVORA
 * tokens and Phosphor icons. Pass `status` when the empty result is announced.
 * Pass `illustration` for full-panel moments (first run, all caught up) where a
 * spot drawing helps; small inline empties keep the icon tile. */
export function EmptyState({ icon, illustration, title, children, action, status = false, className = "" }: {
  icon?: ReactNode;
  illustration?: IllustrationName;
  title: string;
  children?: ReactNode;
  action?: ReactNode;
  status?: boolean;
  className?: string;
}) {
  return <div className={`nevora-empty ${className}`.trim()} role={status ? "status" : undefined} data-illustrated={illustration ? "true" : undefined}>
    {illustration ? <Illustration name={illustration} className="nevora-empty-illustration" />
      : icon ? <span className="nevora-empty-media" aria-hidden="true">{icon}</span> : null}
    <strong className="nevora-empty-title">{title}</strong>
    {children ? <p className="nevora-empty-description">{children}</p> : null}
    {action ? <div className="nevora-empty-action">{action}</div> : null}
  </div>;
}
