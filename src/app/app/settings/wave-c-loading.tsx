import type { ReactNode } from "react";
import { Plus } from "@phosphor-icons/react/dist/ssr/Plus";
import { SettingsFrame } from "./wave-c-kit";

/* Wave C loading placeholders: the page's real band (same words, so the same height), then cards in
 * their final places. Only numbers and names that come from the server are drawn as bars. */
const bar = (width: string) => <span className="wc-skeleton__line" style={{ width }} />;

export function SettingsLoading({ title, summary, label, back = { href: "/app/settings", label: "Settings" }, settingsCrumb = true, eyebrow = false, add, cards = [3, 2], aside = true }: {
  title: ReactNode; summary: string; label: string; back?: { href: string; label: string } | null; settingsCrumb?: boolean;
  /** The band has a counted eyebrow line (drawn as a bar). */
  eyebrow?: boolean;
  /** The band's Add control, drawn as it will appear. */
  add?: string;
  /** Rows per card. */
  cards?: number[];
  aside?: boolean;
}) {
  return (
    <SettingsFrame title={title} summary={summary} back={back} settingsCrumb={settingsCrumb} eyebrow={eyebrow ? bar("9rem") : undefined}
      bandAside={add ? <span className="nv-band-control" aria-hidden="true"><Plus size={18} weight="bold" />{add}</span> : undefined}
      aside={aside ? <section className="nv-card wc-skeleton" aria-hidden="true"><div className="nv-card__body wc-skeleton__body">{bar("55%")}{bar("90%")}{bar("80%")}</div></section> : undefined}
      className="wc-loading">
      <p className="nv-sr" role="status">Loading {label}…</p>
      {cards.map((rows, index) => (
        <section key={index} className="nv-card wc-skeleton" aria-hidden="true">
          <div className="nv-card__body wc-skeleton__body">
            {bar("40%")}
            {Array.from({ length: rows }, (_, row) => <span key={row} className="wc-skeleton__block" />)}
          </div>
        </section>
      ))}
    </SettingsFrame>
  );
}
