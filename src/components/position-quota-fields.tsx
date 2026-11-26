import { WarningCircleIcon } from "@phosphor-icons/react/dist/ssr/WarningCircle";
import type { Position } from "@/lib/domain";
import type { PortalLang } from "@/lib/i18n/portal-lang";
import { SMALL_PARTS_COPY } from "./small-parts-copy";
export function PositionQuotaFields({
  positions,
  requirements = [],
  legendHidden = false,
  lang = "en",
}: {
  /** Signed-in Spanish: the person's language (English when left out). */
  lang?: PortalLang;
  positions: Position[];
  requirements?: readonly { positionId: string; quantity: number }[];
  /** Phase 2 (C9): the disclosure that holds the fields already says "Position quantities", so the legend is read only. */
  legendHidden?: boolean;
}) {
  const t = SMALL_PARTS_COPY[lang].quota;
  const shown = positions.filter(
    (p) => p.active || requirements.some((r) => r.positionId === p.id),
  );
  return (
    <fieldset className="c-rf-quota">
      <legend className={legendHidden ? "sr-only" : "c-field__label c-rf-legend"}>
        {t.legend} {legendHidden ? null : <span className="c-rf-optional">{t.optional}</span>}
      </legend>
      {legendHidden ? null : <p className="c-rf-help">{t.help}</p>}
      {shown.length ? <div className="c-rf-grid">
      {shown.map((p) => (
          <label key={p.id} className="c-field">
            <span className="c-field__label">{p.name}</span>
            {!p.active
              ? <span className="c-rf-error"><WarningCircleIcon size={16} weight="bold" aria-hidden="true" /><span>{t.inactive}</span></span>
              : null}
            <input type="hidden" name="quotaPositionId" value={p.id} />
            <input
              className="c-in"
              type="number"
              name={`quota-${p.id}`}
              defaultValue={
                requirements.find((r) => r.positionId === p.id)?.quantity ?? ""
              }
              min={1}
              max={100}
              step={1}
              aria-label={t.quantity(p.name)}
            />
          </label>
        ))}
      </div> : null}
    </fieldset>
  );
}
