import { InfoIcon } from "@phosphor-icons/react/dist/ssr/Info";

/* Phase 4 (U09): the one-line explanation beside a coverage figure. A native disclosure, so it works with a keyboard
 * (Tab to it, Enter or Space opens and closes it), a screen reader announces it as collapsed or expanded, and it needs
 * no script. Its control is the Direction B kit's quiet pill (b-btn b-btn--quiet), not a new button family; the
 * sentence opens under the figure. `compact` keeps only the icon where a header has no room for the words (the name is
 * still announced). */
export function Explain({ text, label, compact = false }: { text: string; label: string; compact?: boolean }) {
  return <details className={`b-explain${compact ? " b-explain--compact" : ""}`}>
    <summary className="b-btn b-btn--quiet b-explain__b" aria-label={compact ? label : undefined}>
      <InfoIcon size={16} weight="bold" aria-hidden="true" />{compact ? null : <span>{label}</span>}
    </summary>
    <span className="b-explain__tx" role="note">{text}</span>
  </details>;
}
