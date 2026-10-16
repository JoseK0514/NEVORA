"use client";

import { useRef, useState, type ReactNode } from "react";

/** A list row a phone user can swipe to decide: right to approve, left to
 * decline. The swipe only commits past half the row, the backdrop says what
 * releasing will do, and it presses the row's own visible button, so the
 * result is exactly the button's (pending label, server confirmation). Mouse,
 * keyboard and assistive tech use the buttons; nothing here replaces them. */
const SLOP = 10, COMMIT = 0.5;

export function SwipeRow({ children, className = "", approveLabel = "Approve", declineLabel = "Decline" }: {
  children: ReactNode; className?: string; approveLabel?: string; declineLabel?: string;
}) {
  const row = useRef<HTMLLIElement>(null), content = useRef<HTMLDivElement>(null);
  const drag = useRef<{ id: number; x: number; y: number; dx: number; locked: boolean } | null>(null);
  const [state, setState] = useState<{ side: "approve" | "decline" | null; armed: boolean }>({ side: null, armed: false });

  const reset = () => {
    if (content.current) { content.current.style.transform = ""; content.current.removeAttribute("data-dragging"); }
    drag.current = null; setState({ side: null, armed: false });
  };
  const busy = () => row.current?.querySelector('[aria-busy="true"]') !== null;

  return <li ref={row} className={`swipe-row ${className}`.trim()} data-swipe={state.side ?? undefined} data-armed={state.armed || undefined}>
    <div className="swipe-row-backdrop" aria-hidden="true">
      <span className="swipe-row-approve">{state.armed && state.side === "approve" ? `Release to ${approveLabel.toLowerCase()}` : approveLabel}</span>
      <span className="swipe-row-decline">{state.armed && state.side === "decline" ? `Release to ${declineLabel.toLowerCase()}` : declineLabel}</span>
    </div>
    <div ref={content} className="swipe-row-content"
      onPointerDown={event => {
        if (event.pointerType === "mouse" || !event.isPrimary || drag.current || busy()) return;
        if (!window.matchMedia("(max-width: 760px)").matches) return;
        if ((event.target as Element).closest("button, a, input, select, textarea, summary")) return;
        drag.current = { id: event.pointerId, x: event.clientX, y: event.clientY, dx: 0, locked: false };
      }}
      onPointerMove={event => {
        const d = drag.current, el = content.current;
        if (!d || !el || event.pointerId !== d.id) return;
        const dx = event.clientX - d.x, dy = event.clientY - d.y;
        if (!d.locked) {
          if (Math.abs(dx) < SLOP && Math.abs(dy) < SLOP) return;
          if (Math.abs(dy) >= Math.abs(dx)) { reset(); return; } // vertical: let the page scroll
          d.locked = true; el.setAttribute("data-dragging", "true");
          try { el.setPointerCapture(event.pointerId); } catch { /* released */ }
        }
        const width = el.offsetWidth, limit = width * 0.8;
        d.dx = Math.sign(dx) * Math.min(Math.abs(dx), limit);
        el.style.transform = `translateX(${d.dx}px)`;
        setState({ side: d.dx > 0 ? "approve" : "decline", armed: Math.abs(d.dx) >= width * COMMIT });
      }}
      onPointerUp={event => {
        const d = drag.current, el = content.current;
        if (!d || !el || event.pointerId !== d.id) return;
        const armed = d.locked && Math.abs(d.dx) >= el.offsetWidth * COMMIT;
        const decision = d.dx > 0 ? "APPROVED" : "DENIED";
        reset();
        if (!armed) return;
        const button = row.current?.querySelector<HTMLButtonElement>(`button[name="decision"][value="${decision}"]:not(:disabled)`);
        button?.form?.requestSubmit(button);
      }}
      onPointerCancel={reset}>
      {children}
    </div>
  </li>;
}
