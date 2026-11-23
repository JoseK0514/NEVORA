"use client";

import Link from "next/link";
import { CaretDownIcon } from "@phosphor-icons/react/dist/ssr/CaretDown";
import { CheckIcon } from "@phosphor-icons/react/dist/ssr/Check";
import { ActionMenu } from "./action-menu";

export type BonusYearChoice = { endYear: number; label: string };

/** Review 30 (D11): the bonus year is a pill on the band, as Insights keeps its period ("Oct 2025 – Sep 2026 ▾"). It opens
 * the kit's menu (a popover from 768px, a sheet on a phone) with the five years as links to the same page with ?year=, so
 * the page reads the chosen year as before. The current year carries aria-current, which the menu marks with its check. */
/* Rondo follow-up (Nov 23): `text` is what the trigger shows instead of the months: the exact dates on a phone (said once
 * there), or "Bonus year" on a wide band whose subtitle already gives them. Its accessible name keeps the visible words. */
export function BonusYearMenu({ id, current, choices, text }: { id: string; current: number; choices: BonusYearChoice[]; text?: string }) {
  const label = text ?? choices.find(choice => choice.endYear === current)?.label ?? String(current);
  return <ActionMenu id={id} label="Bonus year" title="Bonus year" ariaLabel={label === "Bonus year" ? undefined : `Bonus year: ${label}`} align="end"
    triggerClassName="c-select-btn c-bonus__yearbtn" triggerContent={<>{label}<CaretDownIcon className="c-ic c-ic--s" weight="bold" aria-hidden="true" /></>}>
    {choices.map(choice => <Link key={choice.endYear} className="nevora-action-menu-item c-bonus__yearitem" href={`/app/reports/christmas-bonus?year=${choice.endYear}`}
      aria-current={choice.endYear === current ? "true" : undefined}>
      {choice.label}
      {/* Final verification F (F17): the shown year's check is Phosphor Check bold 16, as Insights' period menu draws it. */}
      {choice.endYear === current ? <CheckIcon className="c-bonus__yearcheck" size={16} weight="bold" aria-hidden="true" /> : null}
    </Link>)}
  </ActionMenu>;
}
