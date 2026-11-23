import { WarningCircleIcon } from "@phosphor-icons/react/dist/ssr/WarningCircle";
import type { Position } from "@/lib/domain";
export function PositionQuotaFields({
  positions,
  requirements = [],
  legendHidden = false,
}: {
  positions: Position[];
  requirements?: readonly { positionId: string; quantity: number }[];
  /** Phase 2 (C9): the disclosure that holds the fields already says "Position quantities", so the legend is read only. */
  legendHidden?: boolean;
}) {
  const shown = positions.filter(
    (p) => p.active || requirements.some((r) => r.positionId === p.id),
  );
  return (
    <fieldset className="c-rf-quota">
      <legend className={legendHidden ? "sr-only" : "c-field__label c-rf-legend"}>
        Position quantities {legendHidden ? null : <span className="c-rf-optional">Optional</span>}
      </legend>
      {legendHidden ? null : <p className="c-rf-help">
        Enter a whole number from 1 to 100. Leave blank to remove only that
        position quota.
      </p>}
      {shown.length ? <div className="c-rf-grid">
      {shown.map((p) => (
          <label key={p.id} className="c-field">
            <span className="c-field__label">{p.name}</span>
            {!p.active
              ? <span className="c-rf-error"><WarningCircleIcon size={16} weight="bold" aria-hidden="true" /><span>Inactive. Clear this quota or reactivate the position.</span></span>
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
              aria-label={`${p.name} quantity`}
            />
          </label>
        ))}
      </div> : null}
    </fieldset>
  );
}
