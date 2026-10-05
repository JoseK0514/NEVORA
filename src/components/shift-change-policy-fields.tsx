import { SelectField } from "./select-field";
import type { ShiftChangePolicy } from "../lib/shift-changes/types";
import { PolicySaveForm } from "./policy-save-form";
import { saveShiftChangePolicyAction } from "../app/app/schedule/settings/actions";

export function ShiftChangePolicyFields({
  policy,
  canEdit,
}: {
  policy: ShiftChangePolicy | null;
  canEdit: boolean;
}) {
  return (
    <details className="shift-policy-disclosure">
      <summary>Shift trade &amp; coverage policy</summary>
      <p>
        Only an Owner can review these settings. Unknown values keep automatic
        completion unavailable. Each workflow saves independently.
      </p>
      {(["swap", "coverage"] as const).map((scope) => {
        const current = policy?.[scope];
        const content = (
          <>
            <input type="hidden" name="scope" value={scope} />
            <SelectField
              name="mode"
              label="Approval mode"
              defaultValue={current?.mode ?? ""}
              options={[
                { value: "", label: "Unknown — needs review" },
                { value: "AUTOMATIC_WHEN_VALID", label: "Automatic when valid" },
                { value: "MANAGER_REVIEW", label: "Manager review" },
              ]}
            />
            <label>
              Submission advance (minutes before start)
              <input
                name="submissionAdvanceMinutes"
                type="number"
                min="0"
                max="525600"
                step="1"
                defaultValue={current?.submissionAdvanceMinutes ?? ""}
              />
              <span>Blank means unknown; zero is an explicit setting.</span>
            </label>
            <label>
              Completion advance (minutes before start)
              <input
                name="completionAdvanceMinutes"
                type="number"
                min="0"
                max="525600"
                step="1"
                defaultValue={current?.completionAdvanceMinutes ?? ""}
              />
              <span>
                Must not exceed submission advance. Existing requests retain
                their earlier deadline.
              </span>
            </label>
            <button type="submit" className="button primary">
              Save {scope === "swap" ? "trade" : "coverage"} policy
            </button>
          </>
        );
        return (
          <section key={scope} className="shift-policy-scope">
            <h3>{scope === "swap" ? "Trades" : "Coverage"}</h3>
            {canEdit ? (
              <PolicySaveForm
                revision={current?.revision ?? 0}
                action={saveShiftChangePolicyAction}
              >
                {content}
              </PolicySaveForm>
            ) : (
              <dl>
                <dt>Approval</dt>
                <dd>
                  {current?.mode === "AUTOMATIC_WHEN_VALID"
                    ? "Automatic when valid"
                    : current?.mode === "MANAGER_REVIEW"
                      ? "Manager review"
                      : "Unknown"}
                </dd>
                <dt>Submission advance</dt>
                <dd>
                  {current?.submissionAdvanceMinutes == null
                    ? "Unknown"
                    : `${current.submissionAdvanceMinutes} minutes`}
                </dd>
                <dt>Completion advance</dt>
                <dd>
                  {current?.completionAdvanceMinutes == null
                    ? "Unknown"
                    : `${current.completionAdvanceMinutes} minutes`}
                </dd>
              </dl>
            )}
          </section>
        );
      })}
    </details>
  );
}
