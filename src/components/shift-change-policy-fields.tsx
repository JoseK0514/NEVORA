import { CaretDownIcon } from "@phosphor-icons/react/dist/ssr/CaretDown";
import { SelectField } from "./select-field";
import type { ShiftChangePolicy } from "../lib/shift-changes/types";
import { PolicyForm } from "./wave-b-forms";
import { saveShiftChangePolicyAction } from "../app/app/schedule/settings/actions";

export function ShiftChangePolicyFields({
  policy,
  canEdit,
}: {
  policy: ShiftChangePolicy | null;
  canEdit: boolean;
}) {
  return (
    <details className="wb-disclosure wb-disclosure--ruled wb-policy">
      <summary><span>Shift trade &amp; coverage policy</span><CaretDownIcon size={20} aria-hidden="true" /></summary>
      <p className="wb-note wb-card-lead">
        {canEdit ? "Owners can edit these settings; managers can view them." : "Owners edit these settings; you can view them."} Until a rule is set, trades and cover requests
        wait for a manager. Trades and coverage save separately.
      </p>
      {(["swap", "coverage"] as const).map((scope) => {
        const current = policy?.[scope];
        const content = (
          <>
            <input type="hidden" name="scope" value={scope} />
            <SelectField
              name="mode"
              label="How requests are approved"
              defaultValue={current?.mode ?? ""}
              options={[
                { value: "", label: "Not set yet" },
                { value: "AUTOMATIC_WHEN_VALID", label: "Automatically, when the request is valid" },
                { value: "MANAGER_REVIEW", label: "A manager reviews each one" },
              ]}
            />
            <label className="wb-field">
              <span>Ask at least this many minutes before the shift</span>
              <input
                name="submissionAdvanceMinutes"
                type="number"
                min="0"
                max="525600"
                step="1"
                defaultValue={current?.submissionAdvanceMinutes ?? ""}
              />
              <span className="wb-help">Leave blank if you haven’t decided. 0 means right up to the start.</span>
            </label>
            <label className="wb-field">
              <span>Finish at least this many minutes before the shift</span>
              <input
                name="completionAdvanceMinutes"
                type="number"
                min="0"
                max="525600"
                step="1"
                defaultValue={current?.completionAdvanceMinutes ?? ""}
              />
              <span className="wb-help">
                Use the same number or less than the time to ask. Requests
                already sent keep their earlier deadline.
              </span>
            </label>
          </>
        );
        return (
          <section key={scope} className="wb-policy-scope">
            <h3 className="wb-strong">{scope === "swap" ? "Trades" : "Coverage"}</h3>
            {canEdit ? (
              <PolicyForm
                revision={current?.revision ?? 0}
                action={saveShiftChangePolicyAction}
                saveLabel={`Save ${scope === "swap" ? "trade" : "coverage"} policy`}
              >
                {content}
              </PolicyForm>
            ) : (
              <dl className="wb-facts">
                <div><dt>How requests are approved</dt>
                <dd>
                  {current?.mode === "AUTOMATIC_WHEN_VALID"
                    ? "Automatically, when valid"
                    : current?.mode === "MANAGER_REVIEW"
                      ? "A manager reviews each one"
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
    </details>
  );
}
