import { WarningCircleIcon } from "@phosphor-icons/react/dist/ssr/WarningCircle";
import type { Position } from "@/lib/domain";
export function PositionQuotaFields({
  positions,
  requirements = [],
}: {
  positions: Position[];
  requirements?: readonly { positionId: string; quantity: number }[];
}) {
  const shown = positions.filter(
    (p) => p.active || requirements.some((r) => r.positionId === p.id),
  );
  return (
    <fieldset className="wb-quota">
      <legend className="wb-label">
        Position quantities <span className="wb-optional">Optional</span>
      </legend>
      <p className="wb-help">
        Enter a whole number from 1 to 100. Leave blank to remove only that
        position quota.
      </p>
      {shown.length ? <div className="wb-grid">
      {shown.map((p) => (
          <label key={p.id} className="wb-field">
            <span>{p.name}</span>
            {!p.active
              ? <span className="wb-error"><WarningCircleIcon size={16} aria-hidden="true" /><span>Inactive. Clear this quota or reactivate the position.</span></span>
              : null}
            <input type="hidden" name="quotaPositionId" value={p.id} />
            <input
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
