import { SelectField } from "./select-field";
import type { ShiftChangePolicy } from "../lib/shift-changes/types";
import { PolicyForm, PolicyOrderError } from "./wave-b-forms";
import { saveShiftChangePolicyAction } from "../app/app/schedule/settings/actions";

export function ShiftChangePolicyFields({
  policy,
  canEdit,
}: {
  policy: ShiftChangePolicy | null;
  canEdit: boolean;
}) {
  return (
    // Phase 2 (C9, Nov 23, 2026): Trades and Coverage straight under the rule's row (the rule's row already names it), with
    // one line that matters: who sets them for a Manager, what happens before they are set for the Owner.
    <div className="c-rf-policy">
      <p className="c-rf-help">{canEdit ? "Until a rule is set, trades and cover wait for a manager." : "An Owner sets these."}</p>
      {(["swap", "coverage"] as const).map((scope) => {
        const current = policy?.[scope];
        const content = (
          <>
            <input type="hidden" name="scope" value={scope} />
            <SelectField
              name="mode"
              label="How requests are approved"
              className="c-field c-rf-selectfield"
              defaultValue={current?.mode ?? ""}
              options={[
                { value: "", label: "Not set yet" },
                { value: "AUTOMATIC_WHEN_VALID", label: "Automatically" },
                { value: "MANAGER_REVIEW", label: "Manager reviews" },
              ]}
            />
            <label className="c-field">
              <span className="c-field__label">Ask at least this many minutes before the shift</span>
              <input
                className="c-in"
                name="submissionAdvanceMinutes"
                type="number"
                min="0"
                max="525600"
                step="1"
                defaultValue={current?.submissionAdvanceMinutes ?? ""}
              />
              <span className="c-field__help">Leave blank if you haven’t decided. 0 means right up to the start.</span>
            </label>
            <label className="c-field">
              <span className="c-field__label">Finish at least this many minutes before the shift</span>
              <input
                className="c-in"
                name="completionAdvanceMinutes"
                type="number"
                min="0"
                max="525600"
                step="1"
                defaultValue={current?.completionAdvanceMinutes ?? ""}
              />
              {canEdit ? <PolicyOrderError /> : null}
              <span className="c-field__help">
                Use the same number or less than the time to ask. Requests
                already sent keep their earlier deadline.
              </span>
            </label>
          </>
        );
        return (
          <section key={scope} className="c-rf-scope">
            <h2 className="c-rf-scope__t">{scope === "swap" ? "Trades" : "Coverage"}</h2>
            {canEdit ? (
              <PolicyForm
                revision={current?.revision ?? 0}
                action={saveShiftChangePolicyAction}
                saveLabel={`Save ${scope === "swap" ? "trade" : "coverage"} policy`}
              >
                {content}
              </PolicyForm>
            ) : (
              <dl className="c-rf-facts">
                <div><dt>How requests are approved</dt>
                <dd>
                  {current?.mode === "AUTOMATIC_WHEN_VALID"
                    ? "Automatically"
                    : current?.mode === "MANAGER_REVIEW"
                      ? "Manager reviews"
                      : "Unknown"}
                </dd></div>
                <div><dt>Ask at least</dt>
                <dd>
                  {current?.submissionAdvanceMinutes == null
                    ? "Unknown"
                    : `${current.submissionAdvanceMinutes} minutes before`}
                </dd></div>
                <div><dt>Finish at least</dt>
                <dd>
                  {current?.completionAdvanceMinutes == null
                    ? "Unknown"
                    : `${current.completionAdvanceMinutes} minutes before`}
                </dd></div>
              </dl>
            )}
          </section>
        );
      })}
    </div>
  );
}
