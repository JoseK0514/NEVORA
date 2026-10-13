"use client";

import { useState, type ReactNode } from "react";
import { CaretDownIcon } from "@phosphor-icons/react/ssr";

/** One content tree: expanded on desktop, a deliberate disclosure on phones. */
export function MobileHomeDisclosure({ id, label, expandedLabel = label, available = true, children, summary, className = "" }: {
  id: string; label: string; expandedLabel?: string; available?: boolean; children: ReactNode; summary?: ReactNode; className?: string;
}) {
  const [expanded, setExpanded] = useState(false);
  return <div className={`mobile-home-disclosure ${className}`} data-expanded={expanded} data-available={available} data-revealed={expanded || !available}>
    {summary ? <div className="mobile-home-disclosure-summary">{summary}</div> : null}
    <button className="mobile-home-disclosure-trigger" type="button" aria-expanded={expanded}
      aria-controls={id} disabled={!available} onClick={() => setExpanded(value => !value)}>
      <span>{expanded ? expandedLabel : label}</span><CaretDownIcon size={20} weight="regular" aria-hidden="true"/>
    </button>
    <div id={id} className="mobile-home-disclosure-content">{children}</div>
  </div>;
}
