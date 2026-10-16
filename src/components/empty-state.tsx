import type { ReactNode } from "react";

/** One empty-state pattern for the portal: a quiet icon tile, a plain-language
 * title, one line of context and at most one next step. Anatomy adapted from the
 * 21st "Empty" block (media, header, title, description, content) with NEVORA
 * tokens and Phosphor icons. Pass `status` when the empty result is announced. */
export function EmptyState({ icon, title, children, action, status = false, className = "" }: {
  icon: ReactNode;
  title: string;
  children?: ReactNode;
  action?: ReactNode;
  status?: boolean;
  className?: string;
}) {
  return <div className={`nevora-empty ${className}`.trim()} role={status ? "status" : undefined}>
    <span className="nevora-empty-media" aria-hidden="true">{icon}</span>
    <strong className="nevora-empty-title">{title}</strong>
    {children ? <p className="nevora-empty-description">{children}</p> : null}
    {action ? <div className="nevora-empty-action">{action}</div> : null}
  </div>;
}
