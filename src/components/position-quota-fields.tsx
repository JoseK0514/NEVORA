import type { Position } from "@/lib/domain";
export function PositionQuotaFields({
  positions,
  requirements = [],
}: {
  positions: Position[];
  requirements?: readonly { positionId: string; quantity: number }[];
}) {
  return (
    <fieldset className="position-quota-fields">
      <legend>
        Position quantities <span>Optional</span>
      </legend>
      <p>
        Enter a whole number from 1 to 100. Leave blank to remove only that
        position quota.
      </p>
      {positions
        .filter(
          (p) => p.active || requirements.some((r) => r.positionId === p.id),
        )
        .map((p) => (
          <label key={p.id}>
            {p.name}
            {!p.active
              ? " (Inactive — setup needs attention; clear this quota or reactivate the position)"
              : ""}
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
    </fieldset>
  );
}
